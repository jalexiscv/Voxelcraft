/**
 * Evaluador de un subconjunto de MOLANG (el lenguaje de expresiones de
 * Bedrock) suficiente para los efectos de partículas de `particles/*.json`.
 * Puro y sin DOM (probable en Node): compila una expresión a una función
 * `(ctx) => number` UNA vez, para no re-parsear por partícula ni fotograma.
 *
 * Gramática cubierta (la que aparece en nuestros ficheros de partículas):
 *   - números con sufijo opcional f/F (0.2f), decimales y signo.
 *   - operadores binarios + - * / con precedencia, y unario -.
 *   - comparaciones < > <= >= == != y ternario  cond ? a : b.
 *   - llamadas Math.random(a,b) / Math.Random(a,b)  (alias, insensible a
 *     mayúsculas) → aleatorio uniforme [a,b); Math.abs/floor/ceil/round/
 *     sqrt/sin/cos/pow/min/max/mod/clamp/lerp.
 *   - accesos a variables:  variable.<nombre>  y  variable.<n>.<campo>
 *     (campo ∈ x/y/z, r/g/b/a, u/v). Alias `v.` = `variable.`. También
 *     `particle_age`, `particle_lifetime`, `particle_random_1..4` sin
 *     prefijo (se resuelven contra el ctx igual que las variable.*).
 *
 * El `ctx` que recibe la función compilada expone:
 *   ctx.get(path)   → número para "variable.foo" o "variable.dir.x" (el
 *                     sistema de partículas resuelve randoms, edad, etc.).
 *   ctx.rand(a, b)  → aleatorio [a,b) (inyectable para tests deterministas).
 *
 * Lo que NO cubre (no lo usan nuestros ficheros): bucles/asignaciones
 * (`temp.x = ...; return ...`), arrays Molang, `query.*`. Si aparece un
 * token no reconocido, compile() lanza y el llamador cae a un valor fijo.
 */

/** Compila `src` a `(ctx) => number`. Lanza si la sintaxis no está cubierta. */
export function compileMolang(src) {
    if (typeof src === 'number') { const v = src; return () => v; }
    if (typeof src !== 'string') throw new Error('molang: fuente no soportada');
    const tokens = tokenize(src);
    const parser = new Parser(tokens, src);
    const node = parser.parseExpression();
    parser.expectEnd();
    return (ctx) => node(ctx);
}

/** Envuelve compileMolang con un valor por defecto si la fuente no compila. */
export function compileSafe(src, fallback = 0) {
    try {
        return compileMolang(src);
    } catch {
        return () => fallback;
    }
}

/* ---- Léxico ---- */

const RE_NUM = /^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?[fF]?/;
const RE_IDENT = /^[A-Za-z_][A-Za-z0-9_.]*/;
const OPS = ['<=', '>=', '==', '!=', '<', '>', '+', '-', '*', '/', '(', ')', ',', '?', ':'];

function tokenize(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
        const rest = src.slice(i);
        // número (el sufijo f de Molang se ignora)
        const num = RE_NUM.exec(rest);
        if (num && /[0-9]/.test(num[0][0] === '.' ? num[0][1] : num[0][0])) {
            out.push({ t: 'num', v: parseFloat(num[0]) });
            i += num[0].length;
            continue;
        }
        // operador (los de 2 chars primero)
        const op = OPS.find((o) => rest.startsWith(o));
        if (op) { out.push({ t: 'op', v: op }); i += op.length; continue; }
        // identificador (variable.foo, Math.random, particle_age…)
        const id = RE_IDENT.exec(rest);
        if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
        throw new Error(`molang: token inesperado "${c}" en «${src}»`);
    }
    out.push({ t: 'end' });
    return out;
}

/* ---- Parser recursivo-descendente → árbol de funciones (ctx)=>number ---- */

const MATH_FUNCS = {
    abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sqrt: Math.sqrt, sin: (d) => Math.sin(d * Math.PI / 180), cos: (d) => Math.cos(d * Math.PI / 180),
    exp: Math.exp, ln: Math.log, trunc: Math.trunc, sign: Math.sign,
    pow: (a, b) => a ** b, min: Math.min, max: Math.max, mod: (a, b) => a % b,
    atan2: (a, b) => Math.atan2(a, b) * 180 / Math.PI,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp: (a, b, t) => a + (b - a) * t,
};

class Parser {
    constructor(tokens, src) { this.toks = tokens; this.pos = 0; this.src = src; }
    peek() { return this.toks[this.pos]; }
    next() { return this.toks[this.pos++]; }
    eat(v) {
        const tk = this.peek();
        if ((tk.t === 'op' && tk.v === v)) { this.pos++; return true; }
        return false;
    }
    expect(v) { if (!this.eat(v)) throw new Error(`molang: falta "${v}" en «${this.src}»`); }
    expectEnd() { if (this.peek().t !== 'end') throw new Error(`molang: sobra «${this.src}»`); }

    // expr → ternario
    parseExpression() { return this.parseTernary(); }

    parseTernary() {
        const cond = this.parseComparison();
        if (this.eat('?')) {
            const a = this.parseExpression();
            this.expect(':');
            const b = this.parseExpression();
            return (ctx) => (cond(ctx) ? a(ctx) : b(ctx));
        }
        return cond;
    }

    parseComparison() {
        let left = this.parseAdditive();
        for (;;) {
            const tk = this.peek();
            if (tk.t !== 'op' || !['<', '>', '<=', '>=', '==', '!='].includes(tk.v)) break;
            this.next();
            const right = this.parseAdditive();
            const op = tk.v, l = left, r = right;
            left = {
                '<': (c) => (l(c) < r(c) ? 1 : 0), '>': (c) => (l(c) > r(c) ? 1 : 0),
                '<=': (c) => (l(c) <= r(c) ? 1 : 0), '>=': (c) => (l(c) >= r(c) ? 1 : 0),
                '==': (c) => (l(c) === r(c) ? 1 : 0), '!=': (c) => (l(c) !== r(c) ? 1 : 0),
            }[op];
        }
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        for (;;) {
            const tk = this.peek();
            if (tk.t !== 'op' || (tk.v !== '+' && tk.v !== '-')) break;
            this.next();
            const right = this.parseMultiplicative();
            const l = left, r = right;
            left = tk.v === '+' ? (c) => l(c) + r(c) : (c) => l(c) - r(c);
        }
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        for (;;) {
            const tk = this.peek();
            if (tk.t !== 'op' || (tk.v !== '*' && tk.v !== '/')) break;
            this.next();
            const right = this.parseUnary();
            const l = left, r = right;
            left = tk.v === '*' ? (c) => l(c) * r(c) : (c) => { const d = r(c); return d === 0 ? 0 : l(c) / d; };
        }
        return left;
    }

    parseUnary() {
        if (this.eat('-')) { const v = this.parseUnary(); return (c) => -v(c); }
        if (this.eat('+')) return this.parseUnary();
        return this.parsePrimary();
    }

    parsePrimary() {
        if (this.eat('(')) { const e = this.parseExpression(); this.expect(')'); return e; }
        const tk = this.next();
        if (tk.t === 'num') { const v = tk.v; return () => v; }
        if (tk.t === 'id') {
            const name = tk.v;
            // llamada a función  Nombre(args...)
            if (this.peek().t === 'op' && this.peek().v === '(') {
                this.next(); // (
                const args = [];
                if (!(this.peek().t === 'op' && this.peek().v === ')')) {
                    args.push(this.parseExpression());
                    while (this.eat(',')) args.push(this.parseExpression());
                }
                this.expect(')');
                return this.makeCall(name, args);
            }
            // variable / constante
            return this.makeVar(name);
        }
        throw new Error(`molang: primario inesperado en «${this.src}»`);
    }

    makeCall(name, args) {
        const low = name.toLowerCase();
        if (low === 'math.random' || low === 'math.random_integer') {
            const a = args[0] || (() => 0), b = args[1] || (() => 1);
            const integer = low.endsWith('integer');
            return (c) => { const r = c.rand(a(c), b(c)); return integer ? Math.floor(r) : r; };
        }
        const fn = MATH_FUNCS[low.replace(/^math\./, '')];
        if (!fn) throw new Error(`molang: función no soportada "${name}"`);
        return (c) => fn(...args.map((a) => a(c)));
    }

    makeVar(name) {
        const low = name.toLowerCase();
        // constantes numéricas de Molang
        if (low === 'math.pi') return () => Math.PI;
        // normaliza el prefijo: `v.` → `variable.`, y los nombres sueltos de
        // partícula (particle_age…) se consultan tal cual contra el ctx
        let path = name;
        if (low.startsWith('v.')) path = 'variable.' + name.slice(2);
        else if (low.startsWith('variable.')) path = 'variable.' + name.slice(9);
        const p = path;
        return (c) => c.get(p);
    }
}

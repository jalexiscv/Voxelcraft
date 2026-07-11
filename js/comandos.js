/**
 * Consola de comandos del chat: interpreta las líneas que empiezan por «/»
 * (por ejemplo «/tp 0 80 0» o «/dar adoquín 32») y las ejecuta contra un
 * contexto que main.js inyecta. Módulo puro (sin DOM, probable en Node):
 * aquí viven el parseo, la búsqueda por nombre, la validación y los
 * mensajes; el contexto decide cómo tocar el juego de verdad.
 *
 * Contrato del contexto (ctx) — todas funciones:
 *  - enLinea()            → true en el mundo global (multijugador)
 *  - modo()               → 'supervivencia' | 'creativo'
 *  - pos()                → [x, y, z] del jugador, con la Y «mostrada»
 *                           (interna − Y_BASE, la misma que enseña F3)
 *  - tp(x, y, z)          → coloca al jugador (misma convención de Y)
 *  - hora(t)              → fija la hora del día (0..1, como game.timeOfDay)
 *  - clima(estado)        → fuerza 'despejado' | 'lluvia' | 'tormenta'
 *  - dar(id, n)           → añade n unidades del bloque/item al inventario
 *  - cambiarModo(m)       → cambia a 'supervivencia' | 'creativo'
 *  - cambiarDificultad(d) → cambia a 'normal' | 'pacifica'
 *  - curar()              → repone salud y hambre
 *  - matar()              → mata al jugador
 *  - aparecer(tipo, n)    → intenta crear n mobs del tipo; devuelve cuántos nacieron
 *  - construir(idPlano)   → levanta el plano frente al jugador; devuelve
 *                           {caja, alto} o null si el terreno no está generado
 *  - semilla()            → semilla del mundo
 *
 * Los comandos marcados `soloLocal` tocan estado que en el mundo global
 * dicta el servidor (hora, clima, mobs, modo): ahí se rechazan con aviso.
 */
import { B, DEFS } from './blocks.js';
import { ITEM_DEFS } from './items.js';
import { MOBS } from './mobs/registry.js';
import { CONSTRUCCIONES } from './construcciones.js';

/** Texto plegado para comparar: sin mayúsculas ni acentos (como el HUD). */
const plegar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---- Catálogos por nombre ---- */

/** Lo que /dar puede entregar: bloques colocables (sin aire) e items. */
const DABLES = (() => {
    const porNombre = new Map(); // nombre plegado → {id, nombre}
    DEFS.forEach((d, id) => {
        if (d && d.placeable && id !== B.AIR) porNombre.set(plegar(d.name), { id, nombre: d.name });
    });
    for (const [id, d] of Object.entries(ITEM_DEFS)) {
        porNombre.set(plegar(d.name), { id: Number(id), nombre: d.name });
    }
    return porNombre;
})();

/** Mobs por nombre en español Y por clave del registro (pig, zombie…). */
const APARECIBLES = (() => {
    const porNombre = new Map();
    for (const [clave, def] of Object.entries(MOBS)) {
        porNombre.set(plegar(def.name), { id: clave, nombre: def.name });
        porNombre.set(plegar(clave), { id: clave, nombre: def.name });
    }
    return porNombre;
})();

/** Construcciones por nombre visible Y por id del registro de planos. */
const CONSTRUIBLES = (() => {
    const porNombre = new Map();
    for (const c of CONSTRUCCIONES) {
        porNombre.set(plegar(c.nombre), c);
        porNombre.set(plegar(c.id), c);
    }
    return porNombre;
})();

/**
 * Busca una entrada por nombre: exacto primero, luego prefijo único, luego
 * subcadena única. Devuelve {hallado} o {candidatos} (vacío = desconocido).
 */
function buscar(mapa, consulta) {
    const q = plegar(consulta.trim());
    if (mapa.has(q)) return { hallado: mapa.get(q) };
    const prefijo = [], dentro = [];
    for (const [nombre, entrada] of mapa) {
        if (nombre.startsWith(q)) prefijo.push(entrada);
        else if (nombre.includes(q)) dentro.push(entrada);
    }
    // los mobs entran dos veces (nombre y clave): se dedup por id
    const vistos = new Set();
    const unicos = (prefijo.length ? prefijo : dentro)
        .filter((e) => !vistos.has(e.id) && vistos.add(e.id));
    if (unicos.length === 1) return { hallado: unicos[0] };
    return { candidatos: unicos.slice(0, 5).map((e) => e.nombre) };
}

/**
 * Coordenada de /tp: número, «~» (la actual) o «~±n» (desplazamiento).
 * Devuelve null si el token no es interpretable.
 */
function coordenada(token, actual) {
    if (token.startsWith('~')) {
        if (token === '~') return actual;
        const d = Number(token.slice(1));
        return Number.isFinite(d) ? actual + d : null;
    }
    const v = Number(token);
    return Number.isFinite(v) ? v : null;
}

/**
 * Horas con nombre → game.timeOfDay (0 = mediodía, la convención de F3).
 * «amanecer» es el mismo instante al que lleva dormir en la cama.
 */
const HORAS = {
    amanecer: 0.77, dia: 0.9, mediodia: 0,
    atardecer: 0.25, noche: 0.4, medianoche: 0.5,
};

/* ---- Registro de comandos ---- */

const COMANDOS = new Map();
const comando = (nombre, uso, descripcion, opts, ejecutar) =>
    COMANDOS.set(nombre, { nombre, uso, descripcion, soloLocal: !!opts.soloLocal, ejecutar });

comando('ayuda', '/ayuda [comando]', 'Lista los comandos o explica uno.', {}, (args) => {
    if (args.length) {
        const c = COMANDOS.get(plegar(args[0].replace(/^\//, '')));
        return c ? [`${c.uso} — ${c.descripcion}`] : [`No existe /${args[0]} — /ayuda lista los disponibles.`];
    }
    return [
        'Comandos (usa /ayuda <comando> para el detalle):',
        [...COMANDOS.keys()].map((n) => '/' + n).join('  '),
    ];
});

comando('tp', '/tp <x> <y> <z>', 'Teletransporta (admite ~ y ~±n relativos; Y como la de F3).', {}, (args, ctx) => {
    if (args.length !== 3) return ['Uso: /tp <x> <y> <z> — por ejemplo /tp 100 80 -40 o /tp ~ ~10 ~'];
    const p = ctx.pos();
    const x = coordenada(args[0], p[0]);
    const y = coordenada(args[1], p[1]);
    const z = coordenada(args[2], p[2]);
    if (x === null || y === null || z === null) return ['Coordenadas no válidas: usa números o ~ (relativo).'];
    ctx.tp(x, y, z);
    return [`Teletransportado a ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}.`];
});

comando('hora', '/hora <amanecer|dia|mediodia|atardecer|noche|medianoche|0..24>',
    'Fija la hora del día (numérica: la misma que muestra F3).', { soloLocal: true }, (args, ctx) => {
    if (!args.length) return ['Uso: /hora <amanecer|dia|mediodia|atardecer|noche|medianoche|0..24>'];
    const clave = plegar(args[0]);
    let t = HORAS[clave];
    if (t === undefined) {
        const h = Number(args[0]);
        if (!Number.isFinite(h) || h < 0 || h > 24) return [`No entiendo la hora «${args[0]}».`];
        t = (h % 24) / 24;
    }
    ctx.hora(t);
    return [`La hora es ahora ${(t * 24).toFixed(1)} h.`];
});

comando('clima', '/clima <despejado|lluvia|tormenta>', 'Fuerza el estado del clima.', { soloLocal: true }, (args, ctx) => {
    const estado = args.length ? plegar(args[0]) : '';
    if (!['despejado', 'lluvia', 'tormenta'].includes(estado)) {
        return ['Uso: /clima <despejado|lluvia|tormenta>'];
    }
    ctx.clima(estado);
    return [`El clima cambia a ${estado}.`];
});

comando('dar', '/dar <nombre> [cantidad]', 'Añade un bloque o item al inventario (supervivencia).', {}, (args, ctx) => {
    if (ctx.modo() === 'creativo') return ['En modo creativo ya tienes todos los materiales (tecla B).'];
    let cantidad = 1;
    if (args.length > 1 && /^\d+$/.test(args[args.length - 1])) {
        cantidad = Math.min(999, Math.max(1, Number(args.pop())));
    }
    const nombre = args.join(' ').trim();
    if (!nombre) return ['Uso: /dar <nombre> [cantidad] — por ejemplo /dar adoquín 32'];
    const r = buscar(DABLES, nombre);
    if (!r.hallado) {
        return r.candidatos.length
            ? [`¿Cuál de estos? ${r.candidatos.join(', ')}`]
            : [`No conozco «${nombre}».`];
    }
    ctx.dar(r.hallado.id, cantidad);
    return [`Recibes ${cantidad} × ${r.hallado.nombre}.`];
});

comando('modo', '/modo <supervivencia|creativo>', 'Cambia el modo de juego.', { soloLocal: true }, (args, ctx) => {
    const q = args.length ? plegar(args[0]) : '';
    const m = ['supervivencia', 'creativo'].find((x) => q && x.startsWith(q));
    if (!m) return ['Uso: /modo <supervivencia|creativo>'];
    if (m === ctx.modo()) return [`Ya estás en modo ${m}.`];
    ctx.cambiarModo(m);
    return [`Modo de juego: ${m}.`];
});

comando('dificultad', '/dificultad <normal|pacifica>', 'Cambia la dificultad.', { soloLocal: true }, (args, ctx) => {
    const q = args.length ? plegar(args[0]) : '';
    const d = ['normal', 'pacifica'].find((x) => q && x.startsWith(q));
    if (!d) return ['Uso: /dificultad <normal|pacifica>'];
    ctx.cambiarDificultad(d);
    return [`Dificultad: ${d === 'pacifica' ? 'pacífica' : d}.`];
});

comando('curar', '/curar', 'Repone salud y hambre.', {}, (args, ctx) => {
    if (ctx.modo() === 'creativo') return ['En creativo no hay salud que reponer.'];
    ctx.curar();
    return ['Salud y hambre restauradas.'];
});

comando('matar', '/matar', 'Acaba con tu propia vida.', {}, (args, ctx) => {
    if (ctx.modo() === 'creativo') return ['En modo creativo no puedes morir.'];
    ctx.matar();
    return ['Has muerto.'];
});

comando('aparecer', '/aparecer <mob> [cantidad]', 'Hace aparecer criaturas frente a ti.', { soloLocal: true }, (args, ctx) => {
    let cantidad = 1;
    if (args.length > 1 && /^\d+$/.test(args[args.length - 1])) {
        cantidad = Math.min(10, Math.max(1, Number(args.pop())));
    }
    const nombre = args.join(' ').trim();
    if (!nombre) return ['Uso: /aparecer <mob> [cantidad] — por ejemplo /aparecer cerdo 3'];
    const r = buscar(APARECIBLES, nombre);
    if (!r.hallado) {
        return r.candidatos.length
            ? [`¿Cuál de estos? ${r.candidatos.join(', ')}`]
            : [`No conozco la criatura «${nombre}».`];
    }
    const creados = ctx.aparecer(r.hallado.id, cantidad);
    return creados > 0
        ? [`${creados} × ${r.hallado.nombre} en camino.`]
        : ['No hay sitio para más criaturas.'];
});

comando('construir', '/construir [nombre]', 'Levanta una construcción prediseñada frente a ti.', {}, (args, ctx) => {
    if (!args.length) {
        return [
            'Construcciones: ' + CONSTRUCCIONES.map((c) => c.nombre).join(', '),
            'Usa /construir <nombre> mirando hacia donde quieres la puerta.',
        ];
    }
    const nombre = args.join(' ').trim();
    const r = buscar(CONSTRUIBLES, nombre);
    if (!r.hallado) {
        return r.candidatos.length
            ? [`¿Cuál de estas? ${r.candidatos.join(', ')}`]
            : [`No conozco la construcción «${nombre}» — /construir las lista.`];
    }
    const res = ctx.construir(r.hallado.id);
    if (!res) return ['El terreno de delante aún no está generado: acércate o espera un momento.'];
    const [x0, z0, x1, z1] = res.caja;
    return [`${r.hallado.nombre} construida (${x1 - x0 + 1}×${res.alto}×${z1 - z0 + 1}) frente a ti.`];
});

comando('semilla', '/semilla', 'Muestra la semilla del mundo.', {}, (args, ctx) =>
    [`Semilla del mundo: ${ctx.semilla()}`]);

/**
 * Ejecuta una línea de la consola («/comando args…») y devuelve los
 * mensajes a pintar en el log del chat. Nunca lanza: todo error de uso
 * vuelve como mensaje.
 */
export function ejecutarComando(linea, ctx) {
    const partes = linea.trim().replace(/^\//, '').split(/\s+/).filter(Boolean);
    if (!partes.length) return ['Escribe un comando: /ayuda los lista.'];
    const [nombre, ...args] = partes;
    const c = COMANDOS.get(plegar(nombre));
    if (!c) return [`Comando desconocido: /${nombre} — /ayuda lista los disponibles.`];
    if (c.soloLocal && ctx.enLinea()) {
        return [`/${c.nombre} no está disponible en el mundo global (lo gobierna el servidor).`];
    }
    return c.ejecutar(args, ctx);
}

/**
 * Sistema de partículas: intérprete en runtime de los efectos Bedrock de
 * `particles/*.json` (subconjunto usado por explosión, humo, llama, crítico
 * y destrucción de bloque). Módulo puro (sin DOM ni WebGL, probable en
 * Node): parsea un `particle_effect` a un descriptor con expresiones Molang
 * compiladas y simula las partículas; el DIBUJO billboard vive en
 * renderer.js. main.js dispara los efectos (explosión, muerte de mob,
 * romper bloque) inyectando las `variable.*` de contexto.
 *
 * Formato aceptado (los componentes que traen nuestros ficheros):
 *   emitter_rate_instant {num_particles} · emitter_rate_manual (se emite a
 *   mano con emit()) · emitter_shape_point/custom/sphere {offset, direction,
 *   radius} · particle_initial_speed (escalar o [x,y,z]) ·
 *   particle_lifetime_expression {max_lifetime} · particle_appearance_
 *   billboard {size, uv{flipbook|estático}} · particle_appearance_tinting
 *   {gradient, interpolant} · particle_motion_dynamic {linear_acceleration,
 *   linear_drag_coefficient}. `atlas.terrain` como textura → usa el atlas de
 *   bloques; el resto, el atlas de partículas.
 *
 * Todo lo aleatorio pasa por un PRNG inyectable, así los tests son
 * deterministas. Cada partícula fija `particle_random_1..4` al nacer.
 */

import { compileSafe } from './molang.js';

/** Constante = compila si es objeto {expression}, número tal cual, o cae. */
function expr(v, fallback = 0) {
    if (v && typeof v === 'object' && 'expression' in v) return compileSafe(v.expression, fallback);
    if (typeof v === 'number') return () => v;
    if (typeof v === 'string') return compileSafe(v, fallback);
    return () => fallback;
}

/** Compila un vector [a,b,c] (cada componente puede ser expresión). */
function vecExpr(arr, fallback = 0) {
    if (!Array.isArray(arr)) return [() => fallback, () => fallback, () => fallback];
    return arr.map((v) => expr(v, fallback));
}

/**
 * Parsea un objeto de efecto (`{particle_effect:{...}}` o su interior) a un
 * DESCRIPTOR con las expresiones ya compiladas. Devuelve null si no es un
 * efecto reconocible.
 */
export function parseEffect(json) {
    const fx = json && (json.particle_effect || json);
    const comp = fx && fx.components;
    if (!comp) return null;
    const desc = fx.description || {};
    const render = desc.basic_render_parameters || {};

    const billboard = comp['minecraft:particle_appearance_billboard'] || {};
    const uv = billboard.uv || {};
    const flip = uv.flipbook;
    const tint = comp['minecraft:particle_appearance_tinting'];
    const motion = comp['minecraft:particle_motion_dynamic'] || {};
    const sphere = comp['minecraft:emitter_shape_sphere'];
    const shape = comp['minecraft:emitter_shape_custom']
        || comp['minecraft:emitter_shape_point']
        || sphere || {};
    const rateInstant = comp['minecraft:emitter_rate_instant'];
    const speed = comp['minecraft:particle_initial_speed'];

    const terrain = render.texture === 'atlas.terrain';
    return {
        id: desc.identifier || 'particle',
        // el atlas de terreno se marca para que el render use la textura de
        // bloques; sus UV ya vienen NORMALIZADAS (0..1), así que texW/H = 1
        terrain,
        texW: terrain ? 1 : (uv.texture_width || 128),
        texH: terrain ? 1 : (uv.texture_height || 128),

        // emisión instantánea (una ráfaga): nº de partículas
        instant: rateInstant ? expr(rateInstant.num_particles, 1) : null,

        // forma: offset (posición relativa) y dirección de nacimiento
        offset: vecExpr(shape.offset, 0),
        // "outwards" (esfera) = dirección radial desde el centro; si es un
        // vector Molang se compila; si no hay, dirección nula
        direction: (typeof shape.direction === 'string')
            ? shape.direction : vecExpr(shape.direction, 0),
        radius: expr(shape.radius, 0),
        // esfera: al nacer, offset radial de magnitud `radius` en dirección
        // aleatoria; con direction "outwards" la velocidad va por ese radio
        sphere: !!sphere,

        // velocidad inicial: escalar (por la dirección) o vector explícito
        speedScalar: (speed !== undefined && !Array.isArray(speed)) ? expr(speed, 0) : null,
        speedVec: Array.isArray(speed) ? vecExpr(speed, 0) : null,

        lifetime: expr(
            (comp['minecraft:particle_lifetime_expression'] || {}).max_lifetime, 1),

        size: vecExpr(billboard.size, 0.1),

        // apariencia UV: flipbook animado o rect estático
        flipbook: flip ? {
            baseU: flip.base_UV[0], baseV: flip.base_UV[1],
            sizeU: flip.size_UV[0], sizeV: flip.size_UV[1],
            stepU: flip.step_UV[0], stepV: flip.step_UV[1],
            fps: flip.frames_per_second || 0,
            maxFrame: flip.max_frame || 1,
            stretch: !!flip.stretch_to_lifetime,
        } : null,
        uvStatic: !flip ? {
            u: vecExpr(Array.isArray(uv.uv) ? uv.uv : [0, 0], 0),
            size: vecExpr(Array.isArray(uv.uv_size) ? uv.uv_size : [8, 8], 8),
        } : null,

        tint: parseTint(tint),

        accel: vecExpr(motion.linear_acceleration, 0),
        drag: motion.linear_drag_coefficient || 0,
    };
}

/** Gradiente de color → función (t)=>[r,g,b,a] con t=interpolante 0..1. */
function parseTint(tint) {
    const grad = tint && tint.color && tint.color.gradient;
    if (!grad) return null;
    const stops = Object.keys(grad).map((k) => ({
        at: parseFloat(k),
        rgba: vecExpr(grad[k], 1), // 4 expresiones r,g,b,a
    })).sort((a, b) => a.at - b.at);
    const interp = tint.color.interpolant;
    const interpFn = (interp === undefined || interp === 0)
        ? null : expr(interp, 0); // sin interpolante: color fijo del primer stop
    return { stops, interpFn };
}

/* ==========================================================================
 * Simulación
 * ========================================================================== */

export class ParticleSystem {
    /** @param {()=>number} rng — fuente aleatoria [0,1) (inyectable). */
    constructor(rng = Math.random, cap = 600) {
        this.rng = rng;
        this.cap = cap;
        this.list = []; // partículas vivas
    }

    /** Aleatorio uniforme [a,b) con el PRNG del sistema. */
    rand(a = 0, b = 1) { return a + (b - a) * this.rng(); }

    /**
     * Dispara un efecto instantáneo en `origin` (mundo). `vars` son las
     * `variable.*` de contexto (color del bloque, aabb del mob, dirección…),
     * un objeto plano de números o {x,y,z}/{r,g,b,a}/{u,v}. Emite tantas
     * partículas como diga su `num_particles`.
     */
    emit(desc, origin, vars = {}, countOverride) {
        if (!desc) return;
        const ctxEmisor = this.makeCtx(vars, {});
        const n = countOverride !== undefined ? countOverride
            : (desc.instant ? Math.round(desc.instant(ctxEmisor)) : 1);
        for (let k = 0; k < n && this.list.length < this.cap; k++) {
            this.list.push(this.spawn(desc, origin, vars));
        }
    }

    /** Crea una partícula: fija sus randoms, posición, velocidad y vida. */
    spawn(desc, origin, vars) {
        const rnd = [this.rng(), this.rng(), this.rng(), this.rng()];
        // ctx sin edad todavía (age=0) para evaluar los términos de nacimiento
        const p = {
            desc, vars, rnd,
            pos: [origin[0], origin[1], origin[2]],
            vel: [0, 0, 0],
            age: 0, life: 1,
            size: 0.1,
        };
        const ctx = this.makeCtx(vars, p);
        // vida
        p.life = Math.max(0.02, desc.lifetime(ctx));

        let dx, dy, dz; // dirección unitaria de nacimiento
        if (desc.sphere) {
            // esfera: dirección aleatoria uniforme; el offset la coloca a
            // `radius` del centro y "outwards" lanza la velocidad por ella
            const u = this.rng() * 2 - 1, th = this.rng() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            dx = s * Math.cos(th); dy = u; dz = s * Math.sin(th);
            const r = desc.radius(ctx);
            p.pos[0] += dx * r; p.pos[1] += dy * r; p.pos[2] += dz * r;
        } else {
            // punto/custom: offset explícito y dirección Molang
            p.pos[0] += desc.offset[0](ctx);
            p.pos[1] += desc.offset[1](ctx);
            p.pos[2] += desc.offset[2](ctx);
            if (Array.isArray(desc.direction)) {
                dx = desc.direction[0](ctx); dy = desc.direction[1](ctx); dz = desc.direction[2](ctx);
            } else { dx = 0; dy = 0; dz = 0; }
            const dlen = Math.hypot(dx, dy, dz) || 1;
            dx /= dlen; dy /= dlen; dz /= dlen;
        }
        // velocidad: escalar por la dirección, o vector explícito
        if (desc.speedVec) {
            p.vel[0] = desc.speedVec[0](ctx);
            p.vel[1] = desc.speedVec[1](ctx);
            p.vel[2] = desc.speedVec[2](ctx);
        } else if (desc.speedScalar) {
            const s = desc.speedScalar(ctx);
            p.vel[0] = dx * s; p.vel[1] = dy * s; p.vel[2] = dz * s;
        }
        return p;
    }

    /** Avanza la simulación de todas las partículas. */
    update(dt) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i];
            p.age += dt;
            if (p.age >= p.life) { this.list.splice(i, 1); continue; }
            const ctx = this.makeCtx(p.vars, p);
            // aceleración y arrastre lineal
            const ax = p.desc.accel[0](ctx), ay = p.desc.accel[1](ctx), az = p.desc.accel[2](ctx);
            const k = p.desc.drag;
            p.vel[0] += (ax - k * p.vel[0]) * dt;
            p.vel[1] += (ay - k * p.vel[1]) * dt;
            p.vel[2] += (az - k * p.vel[2]) * dt;
            p.pos[0] += p.vel[0] * dt;
            p.pos[1] += p.vel[1] * dt;
            p.pos[2] += p.vel[2] * dt;
        }
    }

    /**
     * Instantáneas para el render: {pos, size, uv:[u0,v0,u1,v1] en px del
     * atlas, color:[r,g,b,a] 0..1, terrain}. El renderer las billboardea.
     */
    snapshot() {
        const out = [];
        for (const p of this.list) {
            const ctx = this.makeCtx(p.vars, p);
            const size = p.desc.size[0](ctx);
            out.push({
                pos: p.pos,
                size: Math.max(0, size),
                uv: this.frameUV(p, ctx),
                color: this.color(p, ctx),
                terrain: p.desc.terrain,
                texW: p.desc.texW, texH: p.desc.texH,
            });
        }
        return out;
    }

    /** Rect UV (px) del fotograma actual: flipbook animado o estático. */
    frameUV(p, ctx) {
        const d = p.desc;
        if (d.flipbook) {
            const fb = d.flipbook;
            const frac = p.age / p.life;
            let frame;
            if (fb.stretch) frame = Math.min(fb.maxFrame - 1, Math.floor(frac * fb.maxFrame));
            else frame = Math.floor(p.age * fb.fps) % fb.maxFrame;
            const u = fb.baseU + fb.stepU * frame;
            const v = fb.baseV + fb.stepV * frame;
            return [u, v, u + fb.sizeU, v + fb.sizeV];
        }
        const s = d.uvStatic;
        const u = s.u[0](ctx), v = s.u[1](ctx);
        const w = s.size[0](ctx), h = s.size[1](ctx);
        return [u, v, u + w, v + h];
    }

    /** Color [r,g,b,a] del gradiente en el interpolante actual. */
    color(p, ctx) {
        const t = p.desc.tint;
        if (!t) return [1, 1, 1, 1];
        const evalStop = (stop) => [stop.rgba[0](ctx), stop.rgba[1](ctx), stop.rgba[2](ctx),
            stop.rgba[3] ? stop.rgba[3](ctx) : 1];
        if (!t.interpFn || t.stops.length === 1) return evalStop(t.stops[0]);
        const x = t.interpFn(ctx);
        // busca el tramo [a,b] que contiene x e interpola linealmente
        let a = t.stops[0], b = t.stops[t.stops.length - 1];
        for (let i = 0; i < t.stops.length - 1; i++) {
            if (x >= t.stops[i].at && x <= t.stops[i + 1].at) { a = t.stops[i]; b = t.stops[i + 1]; break; }
        }
        const span = b.at - a.at || 1;
        const f = Math.max(0, Math.min(1, (x - a.at) / span));
        const ca = evalStop(a), cb = evalStop(b);
        return ca.map((v, i) => v + (cb[i] - v) * f);
    }

    /**
     * Contexto Molang para una partícula: resuelve `variable.*`,
     * `particle_age/lifetime`, `particle_random_1..4` y campos .x/.r/.u.
     */
    makeCtx(vars, p) {
        const rng = this.rng;
        return {
            rand: (a, b) => (a === undefined ? rng() : a + ((b === undefined ? 1 : b) - a) * rng()),
            get(path) {
                const low = path.toLowerCase();
                // términos de partícula
                if (low === 'variable.particle_age' || low === 'particle_age') return p.age || 0;
                if (low === 'variable.particle_lifetime' || low === 'particle_lifetime') return p.life || 1;
                const rm = /particle_random_([1-4])$/.exec(low);
                if (rm) return (p.rnd && p.rnd[+rm[1] - 1]) || 0;
                // variable.<nombre> y variable.<nombre>.<campo>
                const name = path.replace(/^variable\./i, '');
                const dot = name.indexOf('.');
                if (dot === -1) {
                    const v = vars[name];
                    return typeof v === 'number' ? v : 0;
                }
                const obj = vars[name.slice(0, dot)];
                const field = name.slice(dot + 1);
                if (obj && typeof obj === 'object' && field in obj) return obj[field];
                return 0;
            },
        };
    }
}

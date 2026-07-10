/**
 * Clima al estilo Minecraft: máquina de estados despejado → lluvia/tormenta
 * con duraciones aleatorias, rampa suave de intensidad, precipitación por
 * partículas (lluvia, o nieve en biomas fríos y nada en desiertos), rayos
 * con destello de cielo y oscurecimiento gris del día.
 *
 * Módulo puro (sin DOM, probable en Node): el PRNG es inyectable y los
 * efectos de precipitación usan el intérprete Bedrock de particles.js.
 * main.js integra las piezas por frame: update() avanza la máquina,
 * emitir() puebla un ParticleSystem dedicado, tintarCielo()/factorLuz()
 * visten el render y onRayo dispara trueno + columna visible.
 */
import { parseEffect } from './particles.js';

/* ---- Efectos de precipitación (JSON Bedrock inline) ---- */

/**
 * Descriptor de gota/copo: bola blanca DENSA del atlas de partículas (rect
 * [0,0] 8×8 — la tira de disipación pierde densidad hacia x=56) teñida con
 * un gradiente de un solo stop (color fijo). La vida exacta llega por
 * `variable.vida`: cada gota muere justo al alcanzar el suelo de su columna.
 */
const gotaFx = (color, size, velY, deriva) => parseEffect({
    particle_effect: {
        description: {
            identifier: 'voxelcraft:precipitacion',
            basic_render_parameters: { texture: 'textures/particle/particles' },
        },
        components: {
            'minecraft:emitter_rate_manual': { max_particles: 1000 },
            'minecraft:emitter_shape_point': {},
            'minecraft:particle_initial_speed': deriva
                ? [{ expression: `math.random(-${deriva}, ${deriva})` }, velY,
                   { expression: `math.random(-${deriva}, ${deriva})` }]
                : [0, velY, 0],
            'minecraft:particle_lifetime_expression': {
                max_lifetime: { expression: 'variable.vida' },
            },
            'minecraft:particle_appearance_billboard': {
                size: [size, size],
                uv: { texture_width: 128, texture_height: 128, uv: [0, 0], uv_size: [8, 8] },
            },
            'minecraft:particle_appearance_tinting': {
                color: { gradient: { '0': color } },
            },
        },
    },
});

export const VEL_LLUVIA = 19;  // caída de la gota (bloques/s)
export const VEL_NIEVE = 1.7;  // caída del copo, con deriva lateral

const FX_LLUVIA = gotaFx([0.44, 0.55, 0.95, 0.62], 0.11, -VEL_LLUVIA, 0);
const FX_NIEVE  = gotaFx([0.95, 0.96, 1.00, 0.90], 0.10, -VEL_NIEVE, 0.4);
const FX_RAYO   = gotaFx([1.00, 1.00, 1.00, 1.00], 0.55, 0, 0); // chispa de la columna

/* ---- Máquina de estados ---- */

/** Duración [mín, máx] en segundos de cada estado. */
const DUR = {
    despejado: [240, 600],
    lluvia: [120, 300],
    tormenta: [90, 210],
};
/** Intensidad 0..1 a la que tiende cada estado (rampa de ~5 s). */
const OBJETIVO = { despejado: 0, lluvia: 0.6, tormenta: 1 };

export class ClimaSystem {
    /** @param {()=>number} rng — fuente aleatoria [0,1) (inyectable en tests). */
    constructor(rng = Math.random) {
        this.rng = rng;
        this.estado = 'despejado';
        this.restante = this.duracion('despejado');
        this.intensidad = 0;   // rampa visual/sonora 0..1
        this.flash = 0;        // destello de rayo 0..1 (decae en ~0.4 s)
        this.tRayo = 0;        // cuenta atrás al siguiente rayo (solo tormenta)
        this.onRayo = null;    // lo fija main.js: trueno + columna visible
    }

    duracion(estado) {
        const [a, b] = DUR[estado];
        return a + (b - a) * this.rng();
    }

    /** Estado que sigue al actual: tras despejado llueve (30 % tormenta). */
    siguiente() {
        if (this.estado === 'despejado') return this.rng() < 0.3 ? 'tormenta' : 'lluvia';
        return 'despejado';
    }

    /** Cambia de estado ya (transiciones naturales, depuración y pruebas). */
    forzar(estado) {
        if (!DUR[estado]) return;
        this.estado = estado;
        this.restante = this.duracion(estado);
    }

    /** Avanza reloj de estado, rampa de intensidad, destello y rayos. */
    update(dt) {
        this.restante -= dt;
        if (this.restante <= 0) this.forzar(this.siguiente());
        const obj = OBJETIVO[this.estado];
        const paso = dt / 5; // fundido de ~5 s entre despejado y precipitación
        this.intensidad = this.intensidad < obj
            ? Math.min(obj, this.intensidad + paso)
            : Math.max(obj, this.intensidad - paso);
        this.flash = Math.max(0, this.flash - dt * 2.5);
        if (this.estado === 'tormenta' && this.intensidad > 0.5) {
            this.tRayo -= dt;
            if (this.tRayo <= 0) {
                this.tRayo = 4 + this.rng() * 9;
                this.flash = 1;
                if (this.onRayo) this.onRayo();
            }
        }
    }

    /**
     * Precipitación que corresponde al clima {temp, humid} de un bioma:
     * 'nieve' en fríos (ventana del bioma nevado), null en desiertos
     * (cálido y seco: no llueve, como en MC), 'lluvia' en el resto.
     */
    precipitacionEn(clima) {
        if (clima.temp <= -0.30) return 'nieve';
        if (clima.temp >= 0.15 && clima.humid <= -0.05) return null;
        return 'lluvia';
    }

    /**
     * Emite la precipitación del frame alrededor del jugador: cada gota nace
     * ~9..14 bloques sobre la vista en una columna aleatoria cercana y vive
     * exactamente hasta la superficie de esa columna — bajo un techo no
     * entra nada porque la columna muere sobre él.
     */
    emitir(dt, parts, world, biomas, px, py, pz) {
        if (this.intensidad <= 0.02) return;
        const n = Math.min(24, Math.round(400 * this.intensidad * dt));
        for (let i = 0; i < n; i++) {
            const x = px + (this.rng() * 2 - 1) * 10;
            const z = pz + (this.rng() * 2 - 1) * 10;
            const tipo = this.precipitacionEn(biomas.climate(x, z));
            if (!tipo) continue;
            const y0 = py + 9 + this.rng() * 5;
            const suelo = world.surfaceY(Math.floor(x), Math.floor(z)) + 1.05;
            if (suelo >= y0) continue; // columna tapada (techo o terreno alto)
            const vel = tipo === 'nieve' ? VEL_NIEVE : VEL_LLUVIA;
            const vida = Math.min(9, (y0 - suelo) / vel);
            parts.emit(tipo === 'nieve' ? FX_NIEVE : FX_LLUVIA, [x, y0, z], { vida }, 1);
        }
    }

    /**
     * Columna luminosa de un rayo sobre una columna cercana al jugador.
     * Devuelve [x, y, z] del impacto (para el retardo del trueno).
     */
    rayoVisible(parts, world, px, pz) {
        const x = px + (this.rng() * 2 - 1) * 24;
        const z = pz + (this.rng() * 2 - 1) * 24;
        const suelo = world.surfaceY(Math.floor(x), Math.floor(z)) + 1;
        for (let y = suelo; y < suelo + 20; y += 0.5) {
            parts.emit(FX_RAYO,
                [x + (this.rng() - 0.5) * 0.4, y, z + (this.rng() - 0.5) * 0.4],
                { vida: 0.35 }, 1);
        }
        return [x, suelo, z];
    }

    /** Cielo bajo el clima: mezcla a gris tormentoso + destello del rayo. */
    tintarCielo(sky, day) {
        const gris = [0.36 * day + 0.04, 0.38 * day + 0.045, 0.43 * day + 0.055];
        const k = this.intensidad * 0.65;
        const out = sky.map((c, i) => c + (gris[i] - c) * k);
        if (this.flash <= 0) return out;
        const f = this.flash * 0.85; // el relámpago blanquea el cielo entero
        return out.map((c) => c + (1 - c) * f);
    }

    /** Multiplicador de la luz global: el aguacero oscurece el día. */
    factorLuz() { return 1 - 0.3 * this.intensidad; }

    /* ---- Persistencia (viaja en el meta del guardado) ---- */

    toJSON() {
        return { estado: this.estado, restante: this.restante, intensidad: this.intensidad };
    }

    /** Restaura del guardado; sin datos (o corruptos) arranca despejado. */
    static fromJSON(o, rng = Math.random) {
        const c = new ClimaSystem(rng);
        if (o && DUR[o.estado]) {
            c.estado = o.estado;
            c.restante = +o.restante > 0 ? +o.restante : c.duracion(o.estado);
            c.intensidad = Math.max(0, Math.min(1, +o.intensidad || 0));
        }
        return c;
    }
}

/**
 * Cielo procedural: posición del sol y la luna, color del cielo con
 * resplandor crepuscular y texturas de ambos astros pintadas por píxel
 * con el PRNG determinista (mismo aspecto en cada carga, sin assets).
 *
 * Las funciones de dirección/color son puras (testeables en Node); los
 * constructores de textura usan canvas y solo se llaman en el navegador.
 */
import { PRNG } from './noise.js';
import { clamp } from './math.js';

const SKY_DAY = [0.55, 0.78, 0.95];    // cielo diurno (misma paleta que main)
const SKY_NIGHT = [0.02, 0.03, 0.09];  // cielo nocturno
const DUSK = [0.96, 0.52, 0.28];       // naranja cálido del amanecer/atardecer
const SUN_TILT = 0.18;                 // desvío en Z de la trayectoria solar

/** Número de fases de luna en la tira de textura. */
export const MOON_PHASES = 4;

/**
 * Dirección unitaria del sol para la hora t (0 = mediodía, 0.5 = medianoche).
 * Trayectoria este→oeste en el plano XY con un leve desvío en Z; la elevación
 * es cos(t·2π), coherente con dayFactor() de main.js. La luna ocupa siempre
 * la dirección opuesta.
 */
export function sunDirection(t) {
    const a = t * Math.PI * 2;
    const x = Math.sin(a), y = Math.cos(a), z = SUN_TILT;
    const len = Math.hypot(x, y, z);
    return [x / len, y / len, z / len];
}

/**
 * Peso 0..1 del resplandor crepuscular: máximo con el sol en el horizonte
 * (|cos| = 0) y nulo cuando su elevación supera 0.35. Sirve para teñir el
 * cielo y para escalar/tintar el propio sol.
 */
export function sunGlow(t) {
    const e = Math.abs(Math.cos(t * Math.PI * 2));
    if (e >= 0.35) return 0;
    return (1 - e / 0.35) * 0.55;
}

/**
 * Color [r,g,b] 0..1 del cielo (y de la niebla): el lerp día/noche clásico
 * —misma curva que dayFactor() de main.js— mezclado hacia naranja cálido
 * cerca del amanecer y del atardecer según sunGlow(t).
 */
export function skyColor(t) {
    const raw = Math.cos(t * Math.PI * 2);
    const day = clamp((raw + 0.7) / 1.4, 0.22, 1);
    const s = (day - 0.22) / 0.78;
    const g = sunGlow(t);
    return SKY_DAY.map((c, i) => {
        const base = SKY_NIGHT[i] + (c - SKY_NIGHT[i]) * s;
        return base + (DUSK[i] - base) * g;
    });
}

/** UVs [u0,v0,u1,v1] de la fase `phase` dentro de la tira de la luna. */
export function moonUV(phase) {
    const p = ((Math.floor(phase) % MOON_PHASES) + MOON_PHASES) % MOON_PHASES;
    const w = 1 / MOON_PHASES;
    return [p * w, 0, (p + 1) * w, 1];
}

/**
 * Sol cuadrado estilo Minecraft en un canvas de 64×64: núcleo blanco-amarillo
 * radiante, borde cálido y halo con alfa degradado hasta 0 en el exterior.
 * Determinista (PRNG con semilla fija).
 */
export function buildSunTexture() {
    const S = 64;
    const rng = new PRNG(9001);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(S, S);
    const c = (S - 1) / 2;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            // distancia Chebyshev normalizada: da la silueta cuadrada
            const d = Math.max(Math.abs(x - c), Math.abs(y - c)) / (S / 2);
            const j = Math.floor((rng.float() * 2 - 1) * 10); // grano determinista
            let r, g, b, a;
            if (d < 0.28) { r = 255; g = 252; b = 228; a = 255; }        // núcleo
            else if (d < 0.40) { r = 255; g = 232; b = 150; a = 255; }   // corona
            else if (d < 0.50) { r = 255; g = 196; b = 96; a = 255; }    // borde cálido
            else {                                                        // halo suave
                r = 255; g = 210; b = 130;
                const t = clamp((d - 0.50) / 0.46, 0, 1);
                a = Math.round(150 * (1 - t) * (1 - t));
                if (d > 0.96) a = 0; // el borde exterior queda transparente
            }
            const i = (y * S + x) * 4;
            img.data[i] = r + j;      // Uint8ClampedArray recorta a 0..255
            img.data[i + 1] = g + j;
            img.data[i + 2] = b + j;
            img.data[i + 3] = a;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

/**
 * Tira de 4 fases de luna (llena, gibosa, media, creciente) en un canvas de
 * 256×64: disco pálido gris-azulado con cráteres deterministas (idénticos en
 * todas las fases) y la sombra de fase avanzando desde un lado con
 * terminador elíptico. Determinista (PRNG con semilla fija).
 */
export function buildMoonTexture() {
    const S = 64, R = 26;
    const canvas = document.createElement('canvas');
    canvas.width = S * MOON_PHASES;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(S * MOON_PHASES, S);
    const c = (S - 1) / 2;
    for (let phase = 0; phase < MOON_PHASES; phase++) {
        // misma semilla en cada fase: los cráteres y el grano no cambian
        const rng = new PRNG(7331);
        const craters = [];
        for (let i = 0; i < 9; i++) {
            const ang = rng.float() * Math.PI * 2;
            const rad = rng.float() * (R - 6);
            craters.push([c + Math.cos(ang) * rad, c + Math.sin(ang) * rad, 1.5 + rng.float() * 2.5]);
        }
        const fs = phase / MOON_PHASES; // fracción del disco en sombra
        for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
                const j = Math.floor((rng.float() * 2 - 1) * 7); // consumir siempre
                const nx = (x - c) / R, ny = (y - c) / R;
                if (nx * nx + ny * ny > 1) continue; // fuera del disco: alfa 0
                const i = (y * S * MOON_PHASES + phase * S + x) * 4;
                // terminador elíptico: sombreado si nx supera el límite
                const lim = (1 - 2 * fs) * Math.sqrt(Math.max(0, 1 - ny * ny));
                if (fs > 0 && nx > lim) {
                    img.data[i] = 18; img.data[i + 1] = 22; img.data[i + 2] = 38;
                    img.data[i + 3] = 80; // sombra apenas visible sobre el cielo
                    continue;
                }
                let r = 201, g = 206, b = 220; // gris azulado pálido
                for (const [kx, ky, kr] of craters) {
                    const dd = Math.hypot(x - kx, y - ky);
                    if (dd < kr * 0.6) { r = 138; g = 144; b = 164; break; }
                    if (dd < kr) { r = 162; g = 168; b = 186; break; }
                }
                img.data[i] = r + j;
                img.data[i + 1] = g + j;
                img.data[i + 2] = b + j;
                img.data[i + 3] = 255;
            }
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

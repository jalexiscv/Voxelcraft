/**
 * Breeze: mob hostil de las cuevas (1.21). Un torbellino de viento con cabeza
 * que avanza a saltos incesantes (hop) y dispara ráfagas de aire
 * (behavior.projectile, ver hostileAI en mobs.js). No tiene piernas: la
 * columna de viento decreciente hacia el suelo hace de cuerpo y el propio
 * salto le da la locomoción.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8       → 32×16
 *   (0,16)  torbellino 6×6×6   → 24×12
 *   (24,16) base 4×8×4         → 16×12
 */

import { ITEMS } from '../items.js';

const AZUL = [90, 110, 140];        // azul grisáceo del cuerpo
const AZUL_OSCURO = [68, 86, 114];  // sombreado del remolino
const ESPIRAL = [170, 190, 210];    // vetas claras del viento
const BLANCO = [240, 245, 250];     // ojos serenos

export default {
    id: 'breeze',
    name: 'Breeze',
    hostile: true,
    aabb: { w: 0.6, h: 1.7 },
    hp: 20,
    speed: 2.6,
    hop: true,
    spawn: { cap: 2, group: 1, cave: true },
    // Botín: pólvora 0-2 — el residuo volátil que carga sus ráfagas de aire
    drops: [{ id: ITEMS.POLVORA, min: 0, max: 2 }],
    behavior: { aggro: 16, projectile: true, damage: 3, cooldown: 2.0 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, AZUL, 7);         // cabeza
        skin.fill(0, 16, 24, 12, AZUL, 7);        // torbellino
        skin.fill(24, 16, 16, 12, AZUL_OSCURO, 7); // base (más densa y oscura)

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.fill(9, 11, 2, 1, BLANCO);            // ojo izquierdo (rendija serena)
        skin.fill(13, 11, 2, 1, BLANCO);           // ojo derecho
        // ceño suave sobre los ojos
        skin.fill(9, 10, 2, 1, AZUL_OSCURO);
        skin.fill(13, 10, 2, 1, AZUL_OSCURO);
        // rachas de viento en el borde inferior de la cabeza (las 4 caras laterales)
        for (let x = 0; x < 32; x += 3) skin.px(x, 15, ESPIRAL);

        // ESPIRALES del torbellino: las 4 caras laterales del cubo 6×6×6 forman
        // una tira continua de 24×6 en (0,22); dos líneas diagonales que la
        // recorren completa envuelven el cuerpo como remolinos ascendentes.
        for (let x = 0; x < 24; x++) {
            const paso = Math.floor(x / 4);            // desciende 6 texels en 24
            skin.px(x, 22 + (paso % 6), ESPIRAL);
            skin.px(x, 22 + ((paso + 3) % 6), ESPIRAL);
        }

        // espirales de la base: tira lateral de 16×8 en (24,20), giro más cerrado
        for (let x = 0; x < 16; x++) {
            const paso = Math.floor(x / 2);            // desciende 8 texels en 16
            skin.px(24 + x, 20 + (paso % 8), ESPIRAL);
            skin.px(24 + x, 20 + ((paso + 4) % 8), ESPIRAL);
        }

        // remolino visto desde arriba: motas claras en las tapas de la columna
        skin.speckle(6, 16, 6, 6, 8, ESPIRAL);     // tapa del torbellino
        skin.speckle(28, 16, 4, 4, 5, ESPIRAL);    // tapa de la base
    },

    parts: [
        // columna de viento decreciente hacia el suelo (sin piernas: hop)
        { name: 'base', size: [4, 8, 4], pivot: [0, 0, 0], origin: [-2, 0, -2], uv: [24, 16] },
        { name: 'torbellino', size: [6, 6, 6], pivot: [0, 8, 0], origin: [-3, 0, -3], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 14, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
    ],

    /** Voz: soplo de viento por ruido filtrado grave y amplio. */
    voice: {
        say: [{ noise: true, f: 600, q: 0.5, d: 0.5, v: 0.12, at: 0 }],
        hurt: [{ noise: true, f: 850, q: 0.7, d: 0.22, v: 0.18, at: 0 }],
        death: [
            { noise: true, f: 620, q: 0.5, d: 0.35, v: 0.16, at: 0 },
            { noise: true, f: 380, q: 0.4, d: 0.6, v: 0.1, at: 0.25 },
        ],
    },
};

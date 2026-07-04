/**
 * Golem de nieve: mob pasivo de tres pisos apilados, al estilo del muñeco de
 * nieve clásico. Sigue el contrato de definición de mobs (ver model.js para
 * el formato de las partes y el desplegado UV; cerdo.js como ejemplo canónico).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   base 8×8×8      → 32×16
 *   (0,16)  torso 7×7×7     → 28×14
 *   (0,32)  cabeza 6×6×6    → 24×12 (calabaza con cara tallada)
 *   (0,46)  brazo 6×1×1     → 14×2 (ambas ramas comparten desplegado)
 *
 * Altura del modelo: 21 px (base 0..8, torso 8..15, cabeza 15..21) frente a
 * un AABB de 1.9 bloques (30.4 px), dentro de la tolerancia del validador.
 */

import { B } from '../blocks.js';

const NIEVE = [240, 244, 248];         // blanco azulado de la nieve
const NIEVE_SOMBRA = [214, 222, 234];  // motas de sombra fría
const NIEVE_BRILLO = [255, 255, 255];  // destellos de hielo
const CALABAZA = [200, 120, 40];       // naranja de la cabeza
const CALABAZA_VETA = [176, 102, 32];  // gajos verticales de la corteza
const TALLADO = [70, 40, 12];          // hueco oscuro de la cara tallada
const RAMA = [92, 64, 36];             // madera de los brazos
const RAMA_NUDO = [64, 44, 24];        // nudos de la rama

export default {
    id: 'golem_nieve',
    name: 'Golem de nieve',
    hostile: false,
    aabb: { w: 0.7, h: 1.9 },
    hp: 8,
    speed: 1.4,
    spawn: { cap: 2, group: 1, block: 'ANY' },
    // botín: bloques de nieve, lo único que queda al deshacerse sus pisos
    drops: [{ id: B.SNOW, min: 1, max: 2 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // pisos de nieve con motas de sombra y algún destello
        skin.fill(0, 0, 32, 16, NIEVE, 4);           // base
        skin.fill(0, 16, 28, 14, NIEVE, 4);          // torso
        skin.speckle(0, 0, 32, 16, 26, NIEVE_SOMBRA);
        skin.speckle(0, 16, 28, 14, 20, NIEVE_SOMBRA);
        skin.speckle(0, 0, 32, 16, 8, NIEVE_BRILLO);
        skin.speckle(0, 16, 28, 14, 6, NIEVE_BRILLO);

        // cabeza-calabaza con gajos verticales más oscuros
        skin.fill(0, 32, 24, 12, CALABAZA, 8);
        for (let x = 1; x < 24; x += 3) {
            skin.fill(x, 32, 1, 12, CALABAZA_VETA, 4);
        }

        // cara tallada: cara frontal de la cabeza, rect (6,38)..(12,44)
        skin.px(7, 39, TALLADO);                     // ojo izquierdo
        skin.px(7, 40, TALLADO);
        skin.px(10, 39, TALLADO);                    // ojo derecho
        skin.px(10, 40, TALLADO);
        skin.px(6, 41, TALLADO);                     // comisuras de la mueca
        skin.px(11, 41, TALLADO);
        skin.px(7, 42, TALLADO);                     // boca dentada
        skin.px(8, 42, TALLADO);
        skin.px(9, 42, TALLADO);
        skin.px(10, 42, TALLADO);

        // brazos-rama con nudos
        skin.fill(0, 46, 14, 2, RAMA, 6);
        skin.speckle(0, 46, 14, 2, 6, RAMA_NUDO);
    },

    parts: [
        { name: 'base', size: [8, 8, 8], pivot: [0, 0, 0], origin: [-4, 0, -4], uv: [0, 0] },
        { name: 'torso', size: [7, 7, 7], pivot: [0, 8, 0], origin: [-3.5, 0, -3.5], uv: [0, 16] },
        { name: 'cabeza', size: [6, 6, 6], pivot: [0, 15, 0], origin: [-3, 0, -3], uv: [0, 32], anim: 'head' },
        // ramas horizontales a los lados, con la punta levemente alzada
        // (rot Z aleja la punta exterior del suelo en ambos costados)
        { name: 'brazo_i', size: [6, 1, 1], pivot: [-3.5, 12, 0], origin: [-6, -0.5, -0.5], uv: [0, 46], rot: [0, 0, -0.3] },
        { name: 'brazo_d', size: [6, 1, 1], pivot: [3.5, 12, 0], origin: [0, -0.5, -0.5], uv: [0, 46], rot: [0, 0, 0.3] },
    ],

    /** Voz: crujidos suaves de nieve comprimida (ver SoundEngine.mobSay). */
    voice: {
        say: [{ noise: true, f: 700, q: 0.6, d: 0.15, v: 0.12 }],
        hurt: [{ noise: true, f: 850, q: 0.7, d: 0.12, v: 0.18 }],
        death: [
            { noise: true, f: 700, q: 0.6, d: 0.18, v: 0.18 },       // crujido inicial
            { noise: true, f: 450, q: 0.5, d: 0.25, v: 0.14, at: 0.14 }, // derrumbe blando
        ],
    },
};

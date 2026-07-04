/**
 * Nautilus zombi: mob hostil acuático, variante no-muerta del nautilus.
 * Conserva su silueta (concha con bandas y cuatro tentáculos) pero con la
 * paleta apagada y podrida: bandas de verde musgo y hueso sucio, agujeros
 * oscuros carcomiendo la concha, tentáculos pálidos y un ojo turbio junto a
 * una cuenca vacía. Sigue el contrato de definición de mobs (ver model.js
 * para el formato de las partes y el desplegado UV; mobs.js para el
 * comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   concha 10×12×10   → 40×22
 *   (0,24)  tentáculo 2×6×2   → 8×8 (los cuatro tentáculos comparten desplegado)
 *
 * Modelo: una concha maciza que flota (y 3..15) con la boca en la cara
 * frontal (−Z); de su borde inferior delantero salen cuatro tentáculos
 * inclinados hacia el frente (rot X positiva: el frente es −Z) que reman
 * alternando leg0/leg1 en contrafase. Altura del modelo: 15 px frente a un
 * AABB de 0.95 bloques (15.2 px).
 */
import { ITEMS } from '../items.js';

const VERDE_MUSGO = [110, 130, 90];    // bandas podridas de la concha
const HUESO_SUCIO = [160, 150, 120];   // bandas claras, ya sin brillo
const AGUJERO = [38, 42, 32];          // perforaciones de la concha carcomida
const BOCA = [50, 58, 44];             // abertura frontal de la concha
const TENTACULO = [185, 180, 160];     // carne pálida y exangüe
const CARNE_PODRIDA = [120, 125, 100]; // manchas de descomposición
const OJO_TURBIO = [170, 175, 150];    // esclerótica velada, sin vida
const PUPILA_TURBIA = [96, 104, 84];
const CUENCA = [30, 34, 26];           // cuenca vacía del otro ojo

export default {
    id: 'nautilus_zombi',
    name: 'Nautilus zombi',
    hostile: true,
    aquatic: true,
    aabb: { w: 0.9, h: 0.95 },
    hp: 12,
    speed: 1.6,
    spawn: { cap: 2, group: 1, water: true },
    // botín: escama de la concha carcomida y carne podrida propia del no-muerto
    drops: [{ id: ITEMS.ESCAMA, min: 0, max: 1 }, { id: ITEMS.CARNE_PODRIDA, min: 0, max: 1 }],

    behavior: { aggro: 10, attackRange: 1.4, damage: 2, cooldown: 1.3 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // concha: bandas alternadas de hueso sucio y verde musgo, sin lustre
        skin.stripes(0, 0, 40, 22, 3, HUESO_SUCIO, VERDE_MUSGO, 6);

        // carcoma: moteado grueso de agujeros por todo el desplegado
        skin.speckle(0, 0, 40, 22, 42, AGUJERO);
        // boquetes grandes (2×2) en lomo, costados y espalda
        skin.fill(15, 3, 2, 2, AGUJERO);   // arriba
        skin.fill(4, 13, 2, 2, AGUJERO);   // costado +X
        skin.fill(26, 16, 2, 2, AGUJERO);  // costado −X
        skin.fill(33, 12, 2, 2, AGUJERO);  // espalda

        // cara frontal de la concha: rect (10,10)..(20,22)
        skin.fill(12, 14, 2, 2, OJO_TURBIO);       // ojo turbio, velado
        skin.px(13, 15, PUPILA_TURBIA);
        skin.fill(16, 14, 2, 2, CUENCA);           // cuenca vacía del otro ojo
        skin.fill(11, 19, 8, 3, BOCA);             // abertura de la que salen los tentáculos
        skin.speckle(11, 19, 8, 3, 5, AGUJERO);    // fondo carcomido de la boca

        // tentáculo compartido: carne pálida con manchas de podredumbre
        skin.fill(0, 24, 8, 8, TENTACULO, 7);
        skin.speckle(0, 26, 8, 6, 9, CARNE_PODRIDA);
        skin.fill(0, 31, 8, 1, HUESO_SUCIO);       // punta descarnada
    },

    parts: [
        { name: 'concha', size: [10, 12, 10], pivot: [0, 9, 0], origin: [-5, -6, -5], uv: [0, 0] },
        // cuatro tentáculos saliendo de la boca frontal, inclinados hacia −Z
        // (rot X positiva = frente) y remando en contrafase con el vecino
        { name: 'tent_izq', size: [2, 6, 2], pivot: [-3, 5, -4], origin: [-1, -6, -1], uv: [0, 24], rot: [0.6, 0, 0], anim: 'leg0' },
        { name: 'tent_centro_izq', size: [2, 6, 2], pivot: [-1, 5, -4], origin: [-1, -6, -1], uv: [0, 24], rot: [0.6, 0, 0], anim: 'leg1' },
        { name: 'tent_centro_der', size: [2, 6, 2], pivot: [1, 5, -4], origin: [-1, -6, -1], uv: [0, 24], rot: [0.6, 0, 0], anim: 'leg0' },
        { name: 'tent_der', size: [2, 6, 2], pivot: [3, 5, -4], origin: [-1, -6, -1], uv: [0, 24], rot: [0.6, 0, 0], anim: 'leg1' },
    ],

    /** Voz: gorgoteo ronco — burbujeo de ruido filtrado sobre un tono grave. */
    voice: {
        say: [
            { f: 150, b: 0.75, d: 0.25, w: 'sawtooth', v: 0.2 },
            { noise: true, f: 300, q: 0.9, d: 0.18, v: 0.12, at: 0.04 },
        ],
        hurt: [
            { f: 190, b: 0.8, d: 0.15, w: 'sawtooth', v: 0.26 },
            { noise: true, f: 420, q: 1.1, d: 0.1, v: 0.14 },
        ],
        death: [
            { f: 140, b: 0.35, d: 0.55, w: 'sawtooth', v: 0.26 },
            { noise: true, f: 300, q: 0.8, d: 0.35, v: 0.12, at: 0.15 },
        ],
    },
};

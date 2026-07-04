/**
 * Creaking: mob hostil de madera (1.21.4) — un árbol andante que SOLO avanza
 * cuando nadie lo mira (behavior.freezeWhenSeen). Sigue el contrato de
 * definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (0,16)  torso 8×12×6   → 28×18
 *   (32,16) pierna 2×16×2  → 8×18 (ambas piernas comparten desplegado)
 *   (44,16) brazo 2×14×2   → 8×16 (ambos brazos comparten desplegado)
 *
 * Altura del modelo: 36 px (cabeza en 28..36) frente a un AABB de 2.5
 * bloques (40 px), dentro de la tolerancia del validador.
 */

import { B } from '../blocks.js';

const MADERA = [70, 52, 40];       // madera oscura del roble susurrante
const VETA = [95, 75, 55];         // vetas verticales más claras
const CORTEZA = [52, 38, 28];      // corteza agrietada (motas y sombras)
const GRIETA = [36, 26, 18];       // hendiduras profundas (boca)
const OJO = [255, 140, 40];        // naranja brillante e inquietante
const OJO_BRILLO = [255, 200, 110]; // destello central del ojo

export default {
    id: 'creaking',
    name: 'Creaking',
    hostile: true,
    aabb: { w: 0.9, h: 2.5 },
    hp: 20,
    speed: 2.6,
    spawn: { cap: 1, group: 1, night: true },
    // Botín: tronco pálido 0-1 — el árbol andante se quiebra en su propia madera
    drops: [{ id: B.PALE_LOG, min: 0, max: 1 }],

    /** Acecha inmóvil mientras lo miras; solo avanza cuando apartas la vista. */
    behavior: { aggro: 20, attackRange: 1.9, damage: 5, cooldown: 1.4, freezeWhenSeen: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, MADERA, 7);    // cabeza
        skin.fill(0, 16, 28, 18, MADERA, 7);   // torso
        skin.fill(32, 16, 8, 18, MADERA, 6);   // pierna
        skin.fill(44, 16, 8, 16, MADERA, 6);   // brazo

        // vetas verticales de la madera, con un nudo que rompe cada una
        const vetas = (x, y, w, h) => {
            for (let i = 1; i < w; i += 3) {
                const nudo = skin.rng.int(h);
                for (let j = 0; j < h; j++) {
                    if (j !== nudo) skin.px(x + i, y + j, VETA);
                }
            }
        };
        vetas(0, 0, 32, 16);     // cabeza
        vetas(0, 16, 28, 18);    // torso
        vetas(32, 16, 8, 18);    // pierna
        vetas(44, 16, 8, 16);    // brazo

        // corteza agrietada: motas oscuras repartidas por todo el cuerpo
        skin.speckle(0, 0, 32, 16, 22, CORTEZA);
        skin.speckle(0, 16, 28, 18, 26, CORTEZA);
        skin.speckle(32, 16, 8, 18, 8, CORTEZA);
        skin.speckle(44, 16, 8, 16, 8, CORTEZA);

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        // ojos naranjas asimétricos: hendiduras verticales, el derecho más alto
        skin.px(10, 11, OJO);                  // ojo izquierdo
        skin.px(10, 12, OJO_BRILLO);
        skin.px(10, 13, OJO);
        skin.px(13, 9, OJO);                   // ojo derecho, dos texels más arriba
        skin.px(13, 10, OJO_BRILLO);
        skin.px(13, 11, OJO);
        // boca: grieta irregular de la corteza
        skin.px(9, 15, GRIETA);
        skin.px(10, 14, GRIETA);
        skin.px(11, 15, GRIETA);
        skin.px(12, 14, GRIETA);
        skin.px(13, 15, GRIETA);
        skin.px(14, 14, GRIETA);
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 16, 0], origin: [-4, 0, -3], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 28, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // brazos-rama alzados al frente (acecho); en este motor (+Y arriba,
        // frente −Z) extender el brazo hacia delante exige rx POSITIVO
        { name: 'brazo_i', size: [2, 14, 2], pivot: [-5, 26, 0], origin: [-1, -13, -1], uv: [44, 16], rot: [2.0, 0, 0], anim: 'arm1' },
        { name: 'brazo_d', size: [2, 14, 2], pivot: [5, 26, 0], origin: [-1, -13, -1], uv: [44, 16], rot: [2.0, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [2, 16, 2], pivot: [-2, 16, 0], origin: [-1, -16, -1], uv: [32, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [2, 16, 2], pivot: [2, 16, 0], origin: [-1, -16, -1], uv: [32, 16], anim: 'leg1' },
    ],

    /** Voz: crujidos de madera — ráfaga de ruido resonante sobre un chirrido grave. */
    voice: {
        say: [
            { noise: true, f: 250, q: 3, d: 0.3, v: 0.2 },
            { f: 90, b: 0.7, d: 0.35, w: 'sawtooth', v: 0.18, at: 0.03 },
        ],
        hurt: [
            { noise: true, f: 420, q: 3, d: 0.15, v: 0.26 },
            { f: 130, b: 0.85, d: 0.12, w: 'sawtooth', v: 0.22 },
        ],
        death: [
            { noise: true, f: 250, q: 2.5, d: 0.5, v: 0.24 },          // el tronco se quiebra
            { f: 80, b: 0.35, d: 0.7, w: 'sawtooth', v: 0.22, at: 0.05 },
            { noise: true, f: 150, q: 1.5, d: 0.4, v: 0.14, at: 0.4 }, // astillas al caer
        ],
    },
};

/**
 * Vex: espectro diminuto hostil. Vuela (flying, sin gravedad) batiendo las
 * alas en flapL/flapR y embiste con una espadita en el brazo derecho, que va
 * extendido al frente en pose estática (en este motor el frente es −Z y
 * exige rot X POSITIVA, ver model.js; pig.js es el ejemplo canónico del
 * contrato y skeleton.js el del arma delante del brazo).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 5×5×5  → 20×10
 *   (24,0)  torso 4×5×3   → 14×8
 *   (40,0)  cola 3×4×1    → 8×5
 *   (0,12)  ala 1×3×4     → 10×7 (las dos alas comparten desplegado)
 *   (12,12) brazo 1×4×1   → 4×5  (los dos brazos comparten desplegado)
 *   (18,12) espada 1×4×1  → 4×5
 */

import { ITEMS } from '../items.js';

const BASE = [160, 170, 190];          // gris azulado espectral
const SOMBRA = [128, 138, 160];
const CLARO = [196, 204, 220];
const HUMO = [92, 102, 128];           // tono al que se desvanece la cola
const OJO = [52, 58, 84];              // ojos hundidos, azul muy oscuro
const ACERO = [150, 155, 165];         // hoja de la espadita
const ACERO_CLARO = [198, 202, 210];
const EMPUNADURA = [96, 100, 110];

export default {
    id: 'vex',
    name: 'Vex',
    hostile: true,
    aabb: { w: 0.4, h: 0.8 },
    hp: 6,
    speed: 3.4,
    flying: true,
    spawn: { cap: 2, group: 2, night: true },
    // Botín: membrana 0-1 — al disiparse el espectro quedan jirones de sus alas
    drops: [{ id: ITEMS.MEMBRANA, min: 0, max: 1 }],

    /** Acoso aéreo cuerpo a cuerpo: rápido, frágil y persistente. */
    behavior: { aggro: 16, attackRange: 1.3, damage: 3, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 20, 10, BASE, 8);          // cabeza
        skin.fill(24, 0, 14, 8, BASE, 8);          // torso
        skin.fill(0, 12, 10, 7, CLARO, 6);         // ala
        skin.fill(12, 12, 4, 5, BASE, 8);          // brazo
        skin.fill(18, 12, 4, 5, ACERO, 5);         // espada

        // cola: se desvanece hacia la punta (rects en y 0..5, punta abajo)
        for (let j = 0; j < 5; j++) {
            const t = j / 4;
            skin.fill(40, j, 8, 1, [
                Math.round(BASE[0] + (HUMO[0] - BASE[0]) * t),
                Math.round(BASE[1] + (HUMO[1] - BASE[1]) * t),
                Math.round(BASE[2] + (HUMO[2] - BASE[2]) * t),
            ], 4);
        }

        // cara frontal de la cabeza: rect (5,5)..(10,10)
        skin.px(6, 6, SOMBRA);                     // cejas fruncidas
        skin.px(8, 6, SOMBRA);
        skin.px(6, 7, OJO);                        // ojo izquierdo
        skin.px(8, 7, OJO);                        // ojo derecho
        skin.px(7, 8, SOMBRA);                     // boca mínima

        // el torso se apaga hacia abajo, empalmando con la cola
        skin.fill(24, 6, 14, 2, SOMBRA, 5);
        // veladuras espectrales por cabeza y torso
        skin.speckle(0, 0, 20, 10, 10, CLARO);
        skin.speckle(24, 0, 14, 6, 8, CLARO);

        // alas: borde inferior más tenue (filas 17..18)
        skin.fill(0, 17, 10, 2, SOMBRA, 5);
        // brazo: manita sombreada en el extremo (fila 16)
        skin.fill(12, 16, 4, 1, SOMBRA, 4);
        // espada: empuñadura junto a la mano (fila 13) y filo claro en la
        // punta (fila 16); con rot X +1.5 la punta queda mirando al frente
        skin.fill(18, 13, 4, 1, EMPUNADURA, 4);
        skin.fill(18, 16, 4, 1, ACERO_CLARO, 4);
    },

    parts: [
        { name: 'torso', size: [4, 5, 3], pivot: [0, 4, 0], origin: [-2, 0, -1.5], uv: [24, 0] },
        { name: 'cabeza', size: [5, 5, 5], pivot: [0, 9, 0], origin: [-2.5, 0, -2.5], uv: [0, 0], anim: 'head' },
        // cola espectral colgando del torso, con leve rastro hacia atrás (+Z)
        { name: 'cola', size: [3, 4, 1], pivot: [0, 4, 0], origin: [-1.5, -4, -0.5], uv: [40, 0], rot: [-0.35, 0, 0] },
        { name: 'ala_i', size: [1, 3, 4], pivot: [-2, 8, 1], origin: [-1, -3, -1], uv: [0, 12], anim: 'flapL' },
        { name: 'ala_d', size: [1, 3, 4], pivot: [2, 8, 1], origin: [0, -3, -1], uv: [0, 12], anim: 'flapR' },
        { name: 'brazo_i', size: [1, 4, 1], pivot: [-2.5, 8.5, 0], origin: [-0.5, -4, -0.5], uv: [12, 12], anim: 'arm1' },
        // brazo derecho extendido al frente con la espadita (pose estática);
        // en este motor (Y arriba, frente −Z) rot X POSITIVA lleva la mano al frente
        { name: 'brazo_d', size: [1, 4, 1], pivot: [2.5, 8.5, 0], origin: [-0.5, -4, -0.5], uv: [12, 12], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'espada', size: [1, 4, 1], pivot: [2.5, 8.5, 0], origin: [-0.5, -8, -0.5], uv: [18, 12], rot: [1.5, 0, 0], anim: 'arm0' },
    ],

    /** Voz: risita aguda de notas cuadradas que suben (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 900, b: 1.2, d: 0.08, w: 'square', v: 0.16 },
            { f: 1100, b: 1.2, d: 0.08, w: 'square', v: 0.14, at: 0.1 },
        ],
        hurt: [{ f: 1300, b: 0.8, d: 0.1, w: 'square', v: 0.26 }],
        death: [
            { f: 1100, b: 0.45, d: 0.2, w: 'square', v: 0.24 },
            { f: 750, b: 0.3, d: 0.3, w: 'square', v: 0.2, at: 0.16 },
        ],
    },

    // Voces reales del pack; charge (embestida) no tiene evento en el contrato
    sonidos: {
        say: ['mob/vex/idle'],
        hurt: ['mob/vex/hurt'],
        death: ['mob/vex/death'],
    },
};

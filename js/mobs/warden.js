/**
 * Warden: coloso ciego de las profundidades. Hostil cuerpo a cuerpo, lento de
 * cadencia pero devastador; solo aparece en cuevas y no arde al sol. Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   torso 14×16×8   → 44×24
 *   (44,0)  cabeza 8×8×8    → 32×16
 *   (76,0)  antena 1×4×1    → 4×5  (ambas branquias-antena comparten desplegado)
 *   (0,24)  brazo 6×18×6    → 24×24 (ambos brazos comparten desplegado)
 *   (24,24) pierna 6×14×6   → 24×20 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 42 px (antenas en 38..42) frente a un AABB de 2.5
 * bloques (40 px), dentro de la tolerancia del validador. Los pies de las
 * piernas tocan el suelo (pivot.y + origin.y = 0).
 */

import { ITEMS } from '../items.js';

const AZUL = [35, 60, 65];               // piel azul oscura de las profundidades
const AZUL_OSCURO = [24, 42, 48];        // grietas, sombras y branquias
const TURQUESA = [80, 220, 200];         // pecho luminoso (almas atrapadas)
const TURQUESA_VIVO = [150, 255, 235];   // núcleo más brillante del pecho
const TURQUESA_TENUE = [50, 140, 130];   // zarcillos que se apagan hacia fuera

export default {
    id: 'warden',
    name: 'Warden',
    hostile: true,
    aabb: { w: 1.2, h: 2.5 },
    hp: 40,
    speed: 2.0,
    noBurn: true,
    spawn: { cap: 1, group: 1, cave: true },
    // Botín: perla 0-1 — reliquia de las almas atrapadas en su pecho
    drops: [{ id: ITEMS.PERLA, min: 0, max: 1 }],

    /** Persecución implacable: mazazos lentos de daño enorme. */
    behavior: { aggro: 20, attackRange: 2.2, damage: 10, cooldown: 1.8 },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 44, 24, AZUL, 6);              // torso
        skin.fill(44, 0, 32, 16, AZUL, 6);             // cabeza
        skin.fill(76, 0, 4, 5, AZUL_OSCURO, 4);        // antena
        skin.fill(0, 24, 24, 24, AZUL, 6);             // brazo
        skin.fill(24, 24, 24, 20, AZUL, 6);            // pierna

        // pecho luminoso: cara frontal del torso, rect (8,8)..(22,24)
        skin.fill(12, 13, 6, 4, TURQUESA);             // masa central que late
        skin.px(14, 14, TURQUESA_VIVO);                // núcleo más brillante
        skin.px(15, 14, TURQUESA_VIVO);
        skin.px(14, 15, TURQUESA_VIVO);
        skin.px(15, 15, TURQUESA_VIVO);
        // zarcillos que trepan hacia los hombros…
        skin.px(11, 12, TURQUESA);
        skin.px(10, 11, TURQUESA);
        skin.px(10, 10, TURQUESA);
        skin.px(9, 9, TURQUESA_TENUE);
        skin.px(18, 12, TURQUESA);
        skin.px(19, 11, TURQUESA);
        skin.px(19, 10, TURQUESA);
        skin.px(20, 9, TURQUESA_TENUE);
        // …y bajan hacia el vientre, apagándose
        skin.px(11, 17, TURQUESA);
        skin.px(10, 18, TURQUESA);
        skin.px(10, 19, TURQUESA_TENUE);
        skin.px(9, 20, TURQUESA_TENUE);
        skin.px(18, 17, TURQUESA);
        skin.px(19, 18, TURQUESA);
        skin.px(19, 19, TURQUESA_TENUE);
        skin.px(20, 20, TURQUESA_TENUE);
        // el brillo asoma por los costados del torso: rects (0,8) y (22,8)
        skin.px(6, 12, TURQUESA_TENUE);
        skin.px(7, 13, TURQUESA_TENUE);
        skin.px(23, 12, TURQUESA_TENUE);
        skin.px(22, 13, TURQUESA_TENUE);

        // cara frontal de la cabeza: rect (52,8)..(60,16). SIN OJOS: solo un
        // ceño pétreo y branquias verticales hundidas
        skin.fill(53, 9, 6, 1, AZUL_OSCURO);           // ceño continuo
        skin.fill(54, 10, 1, 5, AZUL_OSCURO);          // branquia izquierda
        skin.fill(57, 10, 1, 5, AZUL_OSCURO);          // branquia derecha
        skin.px(55, 14, AZUL_OSCURO);                  // grieta de la mandíbula
        skin.px(56, 14, AZUL_OSCURO);

        // branquias-antena: puntas encendidas (cara superior y fila alta)
        skin.px(77, 0, TURQUESA);                      // tapa (arriba)
        skin.px(77, 1, TURQUESA);                      // frente, texel más alto
        skin.px(76, 1, TURQUESA_TENUE);                // +X
        skin.px(78, 1, TURQUESA_TENUE);                // −X
        skin.px(79, 1, TURQUESA_TENUE);                // espalda

        // vena tenue que baja por el antebrazo: cara frontal (6,30)..(12,48)
        skin.px(8, 33, TURQUESA_TENUE);
        skin.px(9, 34, TURQUESA_TENUE);
        skin.px(9, 35, TURQUESA_TENUE);
        skin.px(8, 36, TURQUESA_TENUE);

        // piel agrietada y rugosa por todo el cuerpo
        skin.speckle(0, 0, 44, 24, 26, AZUL_OSCURO);   // torso
        skin.speckle(44, 0, 32, 16, 14, AZUL_OSCURO);  // cabeza
        skin.speckle(0, 24, 24, 24, 14, AZUL_OSCURO);  // brazo
        skin.speckle(24, 24, 24, 20, 12, AZUL_OSCURO); // pierna
    },

    parts: [
        { name: 'torso', size: [14, 16, 8], pivot: [0, 14, 0], origin: [-7, 0, -4], uv: [0, 0] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 30, 0], origin: [-4, 0, -4], uv: [44, 0], anim: 'head' },
        // branquias-antena sobre la cabeza, solidarias con ella
        { name: 'antena_i', size: [1, 4, 1], pivot: [0, 30, 0], origin: [-3, 8, -1], uv: [76, 0], anim: 'head' },
        { name: 'antena_d', size: [1, 4, 1], pivot: [0, 30, 0], origin: [2, 8, -1], uv: [76, 0], anim: 'head' },
        // brazos enormes colgantes, casi hasta la rodilla
        { name: 'brazo_i', size: [6, 18, 6], pivot: [-10, 28, 0], origin: [-3, -17, -3], uv: [0, 24], anim: 'arm1' },
        { name: 'brazo_d', size: [6, 18, 6], pivot: [10, 28, 0], origin: [-3, -17, -3], uv: [0, 24], anim: 'arm0' },
        { name: 'pierna_i', size: [6, 14, 6], pivot: [-3, 14, 0], origin: [-3, -14, -3], uv: [24, 24], anim: 'leg0' },
        { name: 'pierna_d', size: [6, 14, 6], pivot: [3, 14, 0], origin: [-3, -14, -3], uv: [24, 24], anim: 'leg1' },
    ],

    /** Voz: latido grave a dos tiempos; rugido de ruido y sierra al herirlo. */
    voice: {
        say: [
            { f: 55, b: 0.85, d: 0.15, w: 'sine', v: 0.3 },
            { f: 55, b: 0.85, d: 0.15, w: 'sine', v: 0.3, at: 0.3 },
        ],
        hurt: [
            { noise: true, f: 180, q: 0.7, d: 0.45, v: 0.32 },
            { f: 70, b: 0.5, d: 0.55, w: 'sawtooth', v: 0.3, at: 0.03 },
        ],
        death: [
            { noise: true, f: 120, q: 0.6, d: 0.9, v: 0.32 },
            { f: 60, b: 0.3, d: 1.1, w: 'sawtooth', v: 0.3, at: 0.05 },
        ],
    },

    /** Voces del pack local: say = gruñido ambiente (idle_1..12). */
    sonidos: {
        say: ['mob/warden/idle'],
        hurt: ['mob/warden/hurt'],
        death: ['mob/warden/death'],
    },
};

/**
 * Antidron básico: mob KAMIKAZE propio de la casa. Reposa quieto en el
 * suelo (mob terrestre, con gravedad) hasta que detecta un dron cerca;
 * entonces DESPEGA (vuelo por-instancia), asciende hasta el doble de la
 * altura del dron y arremete contra él a alta velocidad con trayectoria
 * tambaleante, explotando al tocarlo — ambos se destruyen a la vez. La IA
 * `behavior.antidron` vive en mobs.js. No aparece de forma natural: nace
 * del huevo de aparición del modo creativo.
 *
 * Diseño de la imagen (dron interceptor vertical): chasis alto y estrecho
 * tipo linterna, con un GIMBAL de cámara esférico colgando abajo, tira de
 * LEDs de batería en el frente, cuatro brazos que salen hacia ARRIBA-fuera
 * en X y en cada punta un buje con dos palas cruzadas que GIRAN (anim
 * 'rotor'); dos rotores claros y dos oscuros, como en la foto. Sigue el
 * contrato de definición de mobs (ver model.js; pig.js es el canónico).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 5×14×5   → 38×24     (38,0) tapa 5×1×5 → 12×6
 *   (0,26)  gimbal 4×3×4    → 20×10     (24,26) lente 2×1×2 → 8×4
 *   (36,26) brazo 1×1×6     → 14×7  (los cuatro comparten desplegado)
 *   (36,36) buje 3×1×3      → 14×5  (los cuatro comparten desplegado)
 *   palas transversales (12×1×2 → 28×3):  clara (0,40) · oscura (30,40)
 *   palas longitudinales (2×1×12 → 28×13): clara (0,44) · oscura (30,44)
 *
 * Altura del modelo: ~19 px (tapa en 18..19) frente a un AABB de 1.2
 * bloques (19 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const GRIS = [138, 141, 147];          // chasis de aluminio
const GRIS_OSCURO = [92, 95, 101];     // sombreado y brazos
const NEGRO = [40, 41, 47];            // gimbal, bujes y palas oscuras
const BLANCO = [224, 226, 230];        // palas claras (dos de los rotores)
const LENTE = [58, 82, 120];           // vidrio de la cámara, azulado
const VERDE = [90, 210, 120];          // LEDs de batería
const NARANJA = [235, 130, 40];        // marca de estado

export default {
    id: 'antidron',
    name: 'Antidron',
    hostile: false,
    aabb: { w: 0.7, h: 1.2 },
    hp: 12,
    speed: 1,                 // reptando: en reposo no se mueve (speed=0 en IA)
    flySpeed: 11,             // embestida a alta velocidad (más veloz que el dron)
    climbAccel: 40,           // acelera rápido en vertical al despegar
    dashAccel: 70,            // aceleración horizontal en la embestida
    // antidron: reposa hasta ver un dron, despega y lo embiste kamikaze
    behavior: {
        antidron: true, detectRadius: 22, hitRange: 1.2,
        wobble: 0.7,          // amplitud del tambaleo del rumbo (rad)
        radius: 1,            // explosión pequeña (impacto aéreo, no cráter)
    },
    spawn: { summonOnly: true, cap: 1, group: 1 },
    drops: [{ id: ITEMS.LINGOTE_HIERRO, min: 0, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 38, 24, GRIS, 5);          // cuerpo
        skin.fill(38, 0, 20, 6, GRIS_OSCURO, 3);   // tapa (20×6 de desplegado)
        skin.fill(0, 26, 24, 7, NEGRO, 3);         // gimbal (16×7) + margen
        skin.fill(24, 26, 8, 3, LENTE, 2);         // lente (8×3 de desplegado)
        skin.fill(36, 26, 14, 7, GRIS_OSCURO, 4);  // brazo
        skin.fill(36, 36, 14, 5, NEGRO, 3);        // buje
        // palas: dos rotores claros (delante) y dos oscuros (detrás), cada
        // forma de caja con su desplegado propio (transversal / longitudinal)
        skin.fill(0, 40, 28, 3, BLANCO, 4);        // clara transversal
        skin.fill(30, 40, 28, 3, NEGRO, 4);        // oscura transversal
        skin.fill(0, 44, 28, 13, BLANCO, 4);       // clara longitudinal
        skin.fill(30, 44, 28, 13, NEGRO, 4);       // oscura longitudinal
        skin.speckle(0, 0, 38, 24, 60, GRIS_OSCURO); // veta del chasis

        // cara frontal del cuerpo (5,5)..(10,19): tira de LEDs de batería y
        // marca naranja de estado, como los puntos de la foto
        skin.px(7, 9, VERDE);
        skin.px(7, 11, VERDE);
        skin.px(7, 13, VERDE);
        skin.px(7, 15, GRIS_OSCURO);
        skin.fill(6, 6, 3, 1, NARANJA);            // banda superior de estado

        // lente frontal del gimbal (cara frontal (4,31)..(9,36)): iris azul
        skin.fill(5, 32, 3, 3, LENTE);
        skin.px(6, 33, [150, 190, 230]);           // reflejo del cristal
    },

    parts: [
        // cuerpo vertical alargado + tapa superior
        { name: 'cuerpo', size: [5, 14, 5], pivot: [0, 4, 0], origin: [-2.5, 0, -2.5], uv: [0, 0] },
        { name: 'tapa', size: [5, 1, 5], pivot: [0, 18, 0], origin: [-2.5, 0, -2.5], uv: [38, 0] },
        // gimbal de cámara colgando bajo el cuerpo, con la lente al frente
        { name: 'gimbal', size: [4, 3, 4], pivot: [0, 4, 0], origin: [-2, -3, -2], uv: [0, 26] },
        { name: 'lente', size: [2, 1, 2], pivot: [0, 1, 0], origin: [-1, -1, -3], uv: [24, 26] },
        // cuatro brazos que salen hacia ARRIBA-fuera en X (rot Y ±45° y una
        // inclinación hacia arriba con rot X negativo)
        { name: 'brazo_fi', size: [1, 1, 6], pivot: [-2, 15, -2], origin: [-0.5, -0.5, -6], uv: [36, 26], rot: [-0.5, 0.785, 0] },
        { name: 'brazo_fd', size: [1, 1, 6], pivot: [2, 15, -2], origin: [-0.5, -0.5, -6], uv: [36, 26], rot: [-0.5, -0.785, 0] },
        { name: 'brazo_ti', size: [1, 1, 6], pivot: [-2, 15, 2], origin: [-0.5, -0.5, 0], uv: [36, 26], rot: [-0.5, -0.785, 0] },
        { name: 'brazo_td', size: [1, 1, 6], pivot: [2, 15, 2], origin: [-0.5, -0.5, 0], uv: [36, 26], rot: [-0.5, 0.785, 0] },
        // bujes en las puntas de los brazos (arriba y afuera)
        { name: 'buje_fi', size: [3, 1, 3], pivot: [-6, 17.5, -6], origin: [-1.5, -0.5, -1.5], uv: [36, 36] },
        { name: 'buje_fd', size: [3, 1, 3], pivot: [6, 17.5, -6], origin: [-1.5, -0.5, -1.5], uv: [36, 36] },
        { name: 'buje_ti', size: [3, 1, 3], pivot: [-6, 17.5, 6], origin: [-1.5, -0.5, -1.5], uv: [36, 36] },
        { name: 'buje_td', size: [3, 1, 3], pivot: [6, 17.5, 6], origin: [-1.5, -0.5, -1.5], uv: [36, 36] },
        // hélices: dos palas cruzadas por rotor girando sobre el buje. Los
        // rotores DELANTEROS usan palas CLARAS (uv fila 40/44 columna 0) y
        // los TRASEROS OSCURAS (columna 30), como en la foto. Cada forma
        // (transversal _x / longitudinal _z) tiene su desplegado propio.
        { name: 'pala_fi_x', size: [12, 1, 2], pivot: [-6, 18, -6], origin: [-6, -0.5, -1], uv: [0, 40], anim: 'rotor' },
        { name: 'pala_fi_z', size: [2, 1, 12], pivot: [-6, 18, -6], origin: [-1, -0.5, -6], uv: [0, 44], anim: 'rotor' },
        { name: 'pala_fd_x', size: [12, 1, 2], pivot: [6, 18, -6], origin: [-6, -0.5, -1], uv: [0, 40], anim: 'rotor' },
        { name: 'pala_fd_z', size: [2, 1, 12], pivot: [6, 18, -6], origin: [-1, -0.5, -6], uv: [0, 44], anim: 'rotor' },
        { name: 'pala_ti_x', size: [12, 1, 2], pivot: [-6, 18, 6], origin: [-6, -0.5, -1], uv: [30, 40], anim: 'rotor' },
        { name: 'pala_ti_z', size: [2, 1, 12], pivot: [-6, 18, 6], origin: [-1, -0.5, -6], uv: [30, 44], anim: 'rotor' },
        { name: 'pala_td_x', size: [12, 1, 2], pivot: [6, 18, 6], origin: [-6, -0.5, -1], uv: [30, 40], anim: 'rotor' },
        { name: 'pala_td_z', size: [2, 1, 12], pivot: [6, 18, 6], origin: [-1, -0.5, -6], uv: [30, 44], anim: 'rotor' },
    ],

    /** Voz: alarma electrónica ascendente (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 660, b: 1.0, d: 0.12, w: 'square', v: 0.14 }],
        hurt: [{ f: 520, b: 0.7, d: 0.14, w: 'square', v: 0.2 }],
        death: [{ f: 300, b: 0.2, d: 0.5, w: 'sawtooth', v: 0.24 }],
    },

    /** Prefijos del pack local (no existen en el pack vanilla: cae a voice). */
    sonidos: {
        say: ['mob/antidron/idle'],
        hurt: ['mob/antidron/hurt'],
        death: ['mob/antidron/death'],
    },
};

/**
 * Tortuga: mob pasivo que anda lento por la playa. Sigue el contrato de
 * definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   caparazón 12×4×14 → 52×18
 *   (0,18)  cuerpo 10×3×12    → 44×15
 *   (44,18) cabeza 4×3×4      → 16×7
 *   (0,33)  aleta 5×1×5       → 20×6 (compartida por las dos delanteras)
 *   (0,40)  aleta 5×1×5       → 20×6 (compartida por las dos traseras)
 *
 * Modelo: cuerpo plano a ras de suelo (y 1..4) con el caparazón montado
 * encima (y 3..7) sobresaliendo 1 px por cada lado; la cabeza asoma por
 * delante (−Z) bajo el alero del caparazón. Las cuatro aletas son placas de
 * 1 px de grosor cuya suela toca el suelo (pivot.y + origin.y = 0): las
 * delanteras se extienden hacia fuera y hacia el frente y las traseras hacia
 * atrás, remando en diagonal (leg0/leg1 cruzadas como el cerdo). Altura del
 * modelo: 7 px frente a un AABB de 0.5 bloques (8 px), dentro de tolerancia.
 */

import { ITEMS } from '../items.js';

const OLIVA = [124, 128, 70];          // piel del cuerpo, cabeza y aletas
const OLIVA_OSCURO = [88, 94, 48];     // escamas y fosas nasales
const VERDE = [70, 130, 60];           // caparazón
const VERDE_OSCURO = [44, 86, 40];     // rejilla de las placas
const VERDE_CLARO = [96, 152, 80];     // brillos de las placas
const CREMA = [206, 196, 142];         // plastrón (vientre)
const OJO = [34, 34, 40];

export default {
    id: 'turtle',
    name: 'Tortuga',
    hostile: false,
    aabb: { w: 1.1, h: 0.5 },
    hp: 15,
    speed: 0.7,
    fleeSpeed: 1.4,
    spawn: { cap: 2, group: 2, block: 'SAND' },
    // botín: alguna escama desprendida de las placas de su caparazón
    drops: [{ id: ITEMS.ESCAMA, min: 0, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 52, 18, VERDE, 7);        // caparazón
        skin.fill(0, 18, 44, 15, OLIVA, 7);       // cuerpo
        skin.fill(44, 18, 16, 7, OLIVA, 7);       // cabeza
        skin.fill(0, 33, 20, 6, OLIVA, 6);        // aletas delanteras
        skin.fill(0, 40, 20, 6, OLIVA, 6);        // aletas traseras

        // plastrón: cara inferior del cuerpo en (22,18)..(32,30)
        skin.fill(22, 18, 10, 12, CREMA, 6);

        // placas del lomo: rejilla oscura 3×3 sobre la cara superior del
        // caparazón, rect (14,0)..(26,14), con brillos dentro de cada placa
        skin.speckle(14, 0, 12, 14, 10, VERDE_CLARO);
        skin.outline(14, 0, 12, 14, VERDE_OSCURO);
        for (let y = 0; y < 14; y++) { skin.px(18, y, VERDE_OSCURO); skin.px(22, y, VERDE_OSCURO); }
        for (let x = 14; x < 26; x++) { skin.px(x, 4, VERDE_OSCURO); skin.px(x, 9, VERDE_OSCURO); }

        // borde del caparazón: placas verticales en la banda lateral
        // (0,14)..(52,18) y canto inferior oscuro
        for (let x = 3; x < 52; x += 4) { skin.px(x, 15, VERDE_OSCURO); skin.px(x, 16, VERDE_OSCURO); }
        for (let x = 0; x < 52; x++) skin.px(x, 17, VERDE_OSCURO);

        // cara frontal de la cabeza: rect (48,22)..(52,25) — ojos y fosas
        skin.px(48, 23, OJO);                      // ojo izquierdo
        skin.px(51, 23, OJO);                      // ojo derecho
        skin.px(49, 24, OLIVA_OSCURO);             // fosas nasales
        skin.px(50, 24, OLIVA_OSCURO);

        // escamas dispersas en las aletas
        skin.speckle(0, 33, 20, 6, 8, OLIVA_OSCURO);
        skin.speckle(0, 40, 20, 6, 8, OLIVA_OSCURO);
    },

    parts: [
        { name: 'cuerpo', size: [10, 3, 12], pivot: [0, 1, 0], origin: [-5, 0, -6], uv: [0, 18] },
        { name: 'caparazon', size: [12, 4, 14], pivot: [0, 3, 0], origin: [-6, 0, -7], uv: [0, 0] },
        { name: 'cabeza', size: [4, 3, 4], pivot: [0, 2, -6], origin: [-2, -1, -4], uv: [44, 18], anim: 'head' },
        // aletas: placas planas con la suela en el suelo, remo en diagonal
        { name: 'aleta_di', size: [5, 1, 5], pivot: [-5, 1, -4], origin: [-2, -1, -5], uv: [0, 33], anim: 'leg0' },
        { name: 'aleta_dd', size: [5, 1, 5], pivot: [5, 1, -4], origin: [-3, -1, -5], uv: [0, 33], anim: 'leg1' },
        { name: 'aleta_ti', size: [5, 1, 5], pivot: [-5, 1, 4], origin: [-2, -1, 0], uv: [0, 40], anim: 'leg1' },
        { name: 'aleta_td', size: [5, 1, 5], pivot: [5, 1, 4], origin: [-3, -1, 0], uv: [0, 40], anim: 'leg0' },
    ],

    /** Voz: chasquidos suaves de triángulo (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 300, b: 0.7, d: 0.1, w: 'triangle', v: 0.16 }],
        hurt: [{ f: 380, b: 0.85, d: 0.12, w: 'triangle', v: 0.22 }],
        death: [
            { f: 280, b: 0.5, d: 0.3, w: 'triangle', v: 0.22 },
            { f: 180, b: 0.5, d: 0.25, w: 'triangle', v: 0.16, at: 0.2 },
        ],
    },

    // sonidos del pack local: idle = vocalización ambiente; swim/walk son
    // locomoción, no eventos de voz, así que se omiten
    sonidos: {
        say: ['mob/turtle/idle'],
        hurt: ['mob/turtle/hurt'],
        death: ['mob/turtle/death'],
    },
};

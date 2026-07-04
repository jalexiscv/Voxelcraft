/**
 * Gallina: mob pasivo pequeño. Planea al caer (glide: aleteo que limita la
 * velocidad de caída, ver mobs.js) con las alas en flapL/flapR (ver model.js
 * para el formato de las partes y el desplegado UV; cerdo.js es el ejemplo
 * canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 6×6×8    → 28×14
 *   (0,16)  cabeza 4×6×3    → 14×9
 *   (16,16) pico 4×2×2      → 12×4
 *   (16,22) barbilla 2×2×2  → 8×4
 *   (30,16) ala 1×4×6       → 14×10 (las dos alas comparten desplegado)
 *   (46,16) pata 1×5×1      → 4×6  (las dos patas comparten desplegado)
 */

import { ITEMS } from '../items.js';

const PLUMA = [235, 232, 225];
const GRIS = [150, 150, 148];
const GRIS_CLARO = [205, 202, 195];
const NARANJA = [230, 140, 40];
const NARANJA_OSCURO = [185, 105, 25];
const ROJO = [200, 40, 40];
const AMARILLO = [222, 168, 60];

export default {
    id: 'gallina',
    name: 'Gallina',
    hostile: false,
    aabb: { w: 0.5, h: 0.8 },
    hp: 4,
    speed: 1.3,
    fleeSpeed: 2.4,
    glide: true,
    spawn: { cap: 4, group: 3 },
    // Botín: plumas de su plumaje y un poco de carne (ave pequeña)
    drops: [
        { id: ITEMS.PLUMA, min: 0, max: 2 },
        { id: ITEMS.CARNE_CRUDA, min: 0, max: 1 },
    ],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 14, PLUMA, 7);         // cuerpo
        skin.fill(0, 16, 14, 9, PLUMA, 6);         // cabeza
        skin.fill(16, 16, 12, 4, NARANJA, 5);      // pico
        skin.fill(16, 22, 8, 4, ROJO, 6);          // barbilla
        skin.fill(30, 16, 14, 10, PLUMA, 6);       // ala
        skin.fill(46, 16, 4, 6, AMARILLO, 5);      // pata

        // cola: cara trasera del cuerpo (22,8)..(28,14), puntas grises en el
        // borde superior (la cola apunta arriba-atrás; filas 8..10 → Y 9..11)
        skin.fill(22, 8, 6, 2, GRIS, 5);
        skin.speckle(22, 10, 6, 2, 4, GRIS);
        // plumaje del lomo algo revuelto: cara superior (8,0)..(14,8)
        skin.speckle(8, 0, 6, 8, 8, GRIS_CLARO);
        // ojos: cara frontal de la cabeza (3,19)..(7,25); en la fila 20
        // (Y 11..12), por encima del pico (Y 9..11, que tapa la fila 21)
        skin.px(3, 20, [35, 35, 40]);              // ojo izquierdo
        skin.px(6, 20, [35, 35, 40]);              // ojo derecho
        // pico: mandíbula inferior más oscura en las cuatro caras laterales
        skin.fill(16, 19, 12, 1, NARANJA_OSCURO, 4);
        // alas: borde inferior de plumas grisáceas (filas 24..26)
        skin.fill(30, 24, 14, 2, GRIS_CLARO, 5);
    },

    parts: [
        { name: 'cuerpo', size: [6, 6, 8], pivot: [0, 8, 0], origin: [-3, -3, -4], uv: [0, 0] },
        { name: 'cabeza', size: [4, 6, 3], pivot: [0, 9, -3], origin: [-2, -2, -3], uv: [0, 16], anim: 'head' },
        { name: 'pico', size: [4, 2, 2], pivot: [0, 9, -3], origin: [-2, 0, -5], uv: [16, 16], anim: 'head' },
        { name: 'barbilla', size: [2, 2, 2], pivot: [0, 9, -3], origin: [-1, -2, -4], uv: [16, 22], anim: 'head' },
        { name: 'ala_i', size: [1, 4, 6], pivot: [-3, 11, 0], origin: [-1, -4, -3], uv: [30, 16], anim: 'flapL' },
        { name: 'ala_d', size: [1, 4, 6], pivot: [3, 11, 0], origin: [0, -4, -3], uv: [30, 16], anim: 'flapR' },
        { name: 'pata_i', size: [1, 5, 1], pivot: [-1, 5, 1], origin: [-0.5, -5, -0.5], uv: [46, 16], anim: 'leg0' },
        { name: 'pata_d', size: [1, 5, 1], pivot: [1, 5, 1], origin: [-0.5, -5, -0.5], uv: [46, 16], anim: 'leg1' },
    ],

    /** Voz: cacareo de notas cuadradas cortas que suben (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 700, b: 1.15, d: 0.08, w: 'square', v: 0.16 },
            { f: 800, b: 1.15, d: 0.08, w: 'square', v: 0.16, at: 0.11 },
            { f: 900, b: 1.2, d: 0.08, w: 'square', v: 0.14, at: 0.22 },
        ],
        hurt: [{ f: 1050, b: 0.7, d: 0.12, w: 'square', v: 0.3 }],
        death: [{ f: 780, b: 0.25, d: 0.55, w: 'square', v: 0.28 }],
    },
};

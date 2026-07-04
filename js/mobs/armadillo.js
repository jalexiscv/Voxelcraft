/**
 * Armadillo: mob pasivo de los desiertos. Al recibir daño se repliega en su
 * caparazón (hideOnHurt, ver mobs.js). El caparazón es una caja aparte que
 * envuelve el cuerpo por arriba y los costados, con bandas transversales
 * oscuras pintadas (ver model.js para el formato de las partes y el
 * desplegado UV; cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 7×6×10     → 34×16
 *   (0,16)  caparazón 8×5×11  → 38×16
 *   (0,32)  cabeza 3×3×4      → 14×7
 *   (16,32) oreja 1×2×1       → 4×3  (las dos orejas comparten desplegado)
 *   (24,32) pata 2×3×2        → 8×5  (las cuatro patas comparten desplegado)
 */

import { ITEMS } from '../items.js';

const ROSA_PARDO = [188, 132, 120];
const ROSA_CLARO = [206, 154, 142];
const MARRON = [140, 96, 76];
const MARRON_OSCURO = [110, 72, 56];
const GARRA = [96, 74, 62];
const OJO = [40, 34, 40];

export default {
    id: 'armadillo',
    name: 'Armadillo',
    hostile: false,
    aabb: { w: 0.7, h: 0.65 },
    hp: 8,
    speed: 0.9,
    hideOnHurt: true,
    // sin block explícito: arena en el desierto y hierba en la sabana
    spawn: { cap: 3, group: 2 },
    // Botín: escama, placa desprendida de su caparazón acorazado
    drops: [{ id: ITEMS.ESCAMA, min: 0, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 34, 16, ROSA_PARDO, 7);    // cuerpo
        skin.fill(0, 16, 38, 16, MARRON, 6);       // caparazón
        skin.fill(0, 32, 14, 7, ROSA_PARDO, 6);    // cabeza
        skin.fill(16, 32, 4, 3, MARRON, 5);        // oreja
        skin.fill(24, 32, 8, 5, ROSA_PARDO, 6);    // pata

        // vientre más claro: cara inferior del cuerpo (17,0)..(24,10)
        skin.fill(17, 0, 7, 10, ROSA_CLARO, 6);

        // caparazón: bandas transversales oscuras en la cara superior
        // (11,16)..(19,27); cada fila del rect es una rebanada en Z
        skin.stripes(11, 16, 8, 11, 2, MARRON, MARRON_OSCURO, 4);
        // ...y las mismas bandas como columnas en los costados +X
        // (0,27)..(11,32) y −X (19,27)..(30,32)
        for (const i of [2, 3, 6, 7, 10]) {
            skin.fill(0 + i, 27, 1, 5, MARRON_OSCURO, 3);
            skin.fill(19 + i, 27, 1, 5, MARRON_OSCURO, 3);
        }
        // reborde inferior del caparazón: última fila de las caras laterales
        skin.fill(0, 31, 38, 1, MARRON_OSCURO, 3);
        // desgaste del caparazón: motas sobre la cara superior
        skin.speckle(11, 16, 8, 11, 10, MARRON_OSCURO);

        // cara frontal de la cabeza: rect (4,36)..(7,39)
        skin.px(4, 37, OJO);                       // ojo izquierdo
        skin.px(6, 37, OJO);                       // ojo derecho
        skin.px(5, 38, [126, 78, 68]);             // punta del hocico
        // interior rosado de las orejas: cara frontal (17,33)..(18,35)
        skin.fill(17, 33, 1, 2, ROSA_CLARO, 4);
        // garras: fila inferior de las caras laterales de la pata
        skin.fill(24, 36, 8, 1, GARRA, 4);
    },

    parts: [
        { name: 'cuerpo', size: [7, 6, 10], pivot: [0, 6, 0], origin: [-3.5, -3, -5], uv: [0, 0] },
        { name: 'caparazon', size: [8, 5, 11], pivot: [0, 6, 0], origin: [-4, -1, -5.5], uv: [0, 16] },
        { name: 'cabeza', size: [3, 3, 4], pivot: [0, 5.5, -5], origin: [-1.5, -1.5, -4], uv: [0, 32], anim: 'head' },
        { name: 'oreja_i', size: [1, 2, 1], pivot: [0, 5.5, -5], origin: [-1.5, 1.5, -3], uv: [16, 32], anim: 'head' },
        { name: 'oreja_d', size: [1, 2, 1], pivot: [0, 5.5, -5], origin: [0.5, 1.5, -3], uv: [16, 32], anim: 'head' },
        { name: 'pata_di', size: [2, 3, 2], pivot: [-2, 3, -3.5], origin: [-1, -3, -1], uv: [24, 32], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 3, 2], pivot: [2, 3, -3.5], origin: [-1, -3, -1], uv: [24, 32], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 3, 2], pivot: [-2, 3, 3.5], origin: [-1, -3, -1], uv: [24, 32], anim: 'leg1' },
        { name: 'pata_td', size: [2, 3, 2], pivot: [2, 3, 3.5], origin: [-1, -3, -1], uv: [24, 32], anim: 'leg0' },
    ],

    /** Voz: gruñiditos triangulares agudos y cortos (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 620, b: 1.1, d: 0.07, w: 'triangle', v: 0.18 },
            { f: 700, b: 0.95, d: 0.06, w: 'triangle', v: 0.15, at: 0.1 },
        ],
        hurt: [{ f: 840, b: 0.7, d: 0.1, w: 'triangle', v: 0.26 }],
        death: [{ f: 560, b: 0.35, d: 0.4, w: 'triangle', v: 0.24 }],
    },
};

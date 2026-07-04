/**
 * Vaca: mob pasivo de pradera. Cuerpo marrón con grandes manchas blancas,
 * hocico claro pintado sobre la cara y dos cuernos que giran con la cabeza
 * (ver model.js para el formato de las partes y el desplegado UV; mobs.js
 * para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×6    → 28×14     (28,0) cuerno 1×3×1 → 4×4 (ambos comparten)
 *   (0,16)  cuerpo 12×10×18 → 60×28
 *   (0,44)  pata 4×12×4     → 16×16 (las cuatro patas comparten desplegado)
 */

import { ITEMS } from '../items.js';

const MARRON = [92, 62, 46];
const MARRON_OSCURO = [70, 46, 34];
const BLANCO = [235, 233, 228];
const VIENTRE = [222, 214, 202];
const HOCICO = [205, 195, 185];
const CUERNO = [200, 195, 180];
const PEZUNA = [58, 48, 40];

export default {
    id: 'vaca',
    name: 'Vaca',
    hostile: false,
    aabb: { w: 0.9, h: 1.4 },
    hp: 12,
    speed: 0.9,
    fleeSpeed: 2.2,
    spawn: { cap: 4, group: 2 },
    // Botín: carne cruda y cuero (res grande: alimento y material de piel)
    drops: [
        { id: ITEMS.CARNE_CRUDA, min: 1, max: 2 },
        { id: ITEMS.CUERO, min: 0, max: 1 },
    ],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 14, MARRON, 8);        // cabeza
        skin.fill(28, 0, 4, 4, CUERNO, 5);         // cuerno (desplegado compartido)
        skin.fill(0, 16, 60, 28, MARRON, 8);       // cuerpo
        skin.fill(0, 44, 16, 16, MARRON, 8);       // pata
        skin.fill(0, 57, 16, 3, PEZUNA, 4);        // pezuñas (caras laterales)
        skin.fill(8, 44, 4, 4, PEZUNA, 4);         // pezuña (cara inferior)

        // manchas blancas grandes del pelaje
        skin.fill(20, 21, 8, 9, BLANCO, 4);        // lomo (cara superior)
        skin.fill(2, 36, 7, 6, BLANCO, 4);         // flanco derecho (+X)
        skin.fill(38, 37, 8, 6, BLANCO, 4);        // flanco izquierdo (−X)
        skin.fill(51, 36, 7, 6, BLANCO, 4);        // anca (cara trasera)
        skin.fill(30, 16, 12, 18, VIENTRE, 6);     // vientre claro (cara inferior)
        skin.speckle(0, 34, 60, 10, 40, MARRON_OSCURO); // moteado sutil de los flancos

        // cara frontal de la cabeza: rect (6,6)..(14,14)
        skin.fill(9, 6, 2, 3, BLANCO, 3);          // lucero de la frente
        skin.px(6, 8, [245, 245, 245]);            // ojo izquierdo
        skin.px(7, 8, [45, 40, 60]);
        skin.px(12, 8, [45, 40, 60]);              // ojo derecho
        skin.px(13, 8, [245, 245, 245]);
        // hocico claro: mitad inferior de la cara
        skin.fill(7, 10, 6, 4, HOCICO, 5);
        skin.px(8, 12, [150, 120, 110]);           // fosas nasales
        skin.px(12, 12, [150, 120, 110]);
    },

    parts: [
        { name: 'cuerpo', size: [12, 10, 18], pivot: [0, 17, 0], origin: [-6, -5, -9], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 6], pivot: [0, 19, -9], origin: [-4, -4, -6], uv: [0, 0], anim: 'head' },
        { name: 'cuerno_i', size: [1, 3, 1], pivot: [0, 19, -9], origin: [-5, 2, -4], uv: [28, 0], anim: 'head' },
        { name: 'cuerno_d', size: [1, 3, 1], pivot: [0, 19, -9], origin: [4, 2, -4], uv: [28, 0], anim: 'head' },
        { name: 'pata_di', size: [4, 12, 4], pivot: [-4, 12, -6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 12, 4], pivot: [4, 12, -6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 12, 4], pivot: [-4, 12, 6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_td', size: [4, 12, 4], pivot: [4, 12, 6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
    ],

    /** Voz: mugidos graves sintetizados (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 150, b: 0.65, d: 0.7, w: 'sawtooth', v: 0.25 }],
        hurt: [{ f: 230, b: 0.8, d: 0.18, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 120, b: 0.5, d: 1.0, w: 'sawtooth', v: 0.28 }],
    },
};

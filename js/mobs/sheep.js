/**
 * Oveja: mob pasivo lanudo. El cuerpo lleva una segunda parte "lana" con la
 * misma caja pero `inflate: 2` y desplegado UV propio, de modo que la capa de
 * lana envuelve la piel sin duplicar geometría especial (ver model.js para el
 * formato de las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 6×6×8    → 28×14     (48,0)  pata 4×12×4 → 16×16
 *   (0,14)  cuerpo 8×6×16   → 48×22            (las cuatro patas comparten
 *   (0,36)  lana 8×6×16     → 48×22            desplegado)
 */

import { ITEMS } from '../items.js';
import { B } from '../blocks.js';

const LANA = [230, 228, 218];
const LANA_SOMBRA = [210, 206, 192];
const PIEL = [190, 188, 184];
const CARA = [222, 190, 170];
const HOCICO = [196, 158, 140];
const PATA = [238, 236, 230];
const PEZUNA = [202, 200, 194];

export default {
    id: 'sheep',
    name: 'Oveja',
    hostile: false,
    aabb: { w: 0.9, h: 1.3 },
    hp: 8,
    speed: 1.0,
    fleeSpeed: 2.4,
    spawn: { cap: 4, group: 3 },
    // Botín: su lana blanca (bloque WOOL0) y algo de carne cruda
    drops: [
        { id: B.WOOL0, min: 1, max: 1 },
        { id: ITEMS.CARNE_CRUDA, min: 0, max: 1 },
    ],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 14, CARA, 7);          // cabeza (cara rosada)
        skin.fill(8, 0, 6, 8, LANA, 5);            // copete: cara superior
        skin.fill(0, 8, 28, 2, LANA, 5);           // copete: aro superior de los laterales
        skin.fill(0, 14, 48, 22, PIEL, 6);         // cuerpo (piel gris clara)
        skin.fill(0, 36, 48, 22, LANA, 8);         // lana con ruido
        skin.speckle(0, 36, 48, 22, 60, LANA_SOMBRA); // mechones sombreados
        skin.fill(48, 0, 16, 16, PATA, 5);         // pata
        skin.fill(52, 0, 4, 4, LANA, 6);           // corona lanosa de la pata
        skin.fill(48, 4, 16, 3, LANA, 8);          // parte superior lanosa
        skin.fill(48, 14, 16, 2, PEZUNA, 4);       // pezuñas

        // cara frontal de la cabeza: rect (8,8)..(14,14), copete hasta y=10
        skin.px(8, 11, [245, 245, 245]);           // ojo izquierdo
        skin.px(9, 11, [42, 42, 80]);
        skin.px(12, 11, [42, 42, 80]);             // ojo derecho
        skin.px(13, 11, [245, 245, 245]);
        // hocico en el borde inferior de la cara
        skin.px(10, 13, HOCICO);
        skin.px(11, 13, HOCICO);
    },

    parts: [
        { name: 'cuerpo', size: [8, 6, 16], pivot: [0, 14, 0], origin: [-4, -3, -8], uv: [0, 14] },
        { name: 'lana', size: [8, 6, 16], pivot: [0, 14, 0], origin: [-4, -3, -8], uv: [0, 36], inflate: 2 },
        { name: 'cabeza', size: [6, 6, 8], pivot: [0, 17, -8], origin: [-3, -3, -8], uv: [0, 0], anim: 'head' },
        { name: 'pata_di', size: [4, 12, 4], pivot: [-3, 12, -5], origin: [-2, -12, -2], uv: [48, 0], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 12, 4], pivot: [3, 12, -5], origin: [-2, -12, -2], uv: [48, 0], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 12, 4], pivot: [-3, 12, 5], origin: [-2, -12, -2], uv: [48, 0], anim: 'leg1' },
        { name: 'pata_td', size: [4, 12, 4], pivot: [3, 12, 5], origin: [-2, -12, -2], uv: [48, 0], anim: 'leg0' },
    ],

    /** Voz: balidos sintetizados (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 500, b: 0.9, d: 0.4, w: 'square', v: 0.22 }],
        hurt: [{ f: 640, b: 0.9, d: 0.16, w: 'square', v: 0.28 }],
        death: [{ f: 520, b: 0.45, d: 0.55, w: 'square', v: 0.26 }],
    },

    /** Voces del pack (mob/sheep: say1-3, shear, step1-5; ver soundpack.js). */
    sonidos: {
        say: ['mob/sheep/say'],
        // Sin hurt/death propios en el pack: como en vanilla, el balido `say`
        // es también su sonido canónico de daño y muerte.
        hurt: ['mob/sheep/say'],
        death: ['mob/sheep/say'],
    },
};

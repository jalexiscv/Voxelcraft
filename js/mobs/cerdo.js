/**
 * Cerdo: mob pasivo de referencia. Este archivo es el ejemplo canónico del
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8    → 32×16      (32,0)  hocico 4×3×1 → 10×4
 *   (0,16)  cuerpo 10×8×16  → 52×24
 *   (0,40)  pata 4×6×4      → 16×10 (las cuatro patas comparten desplegado)
 */

const ROSA = [238, 148, 152];
const ROSA_OSCURO = [204, 110, 118];
const PEZUNA = [160, 82, 92];

export default {
    id: 'cerdo',
    name: 'Cerdo',
    hostile: false,
    aabb: { w: 0.9, h: 0.9 },
    hp: 10,
    speed: 1.1,
    fleeSpeed: 2.6,
    spawn: { cap: 4, group: 2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, ROSA, 9);         // cabeza
        skin.fill(32, 0, 10, 4, ROSA_OSCURO, 6);  // hocico
        skin.fill(0, 16, 52, 24, ROSA, 9);        // cuerpo
        skin.fill(0, 40, 16, 10, ROSA, 9);        // pata
        skin.fill(0, 48, 16, 2, PEZUNA, 5);       // pezuñas

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.px(9, 11, [245, 245, 245]);           // ojo izquierdo
        skin.px(10, 11, [42, 42, 80]);
        skin.px(13, 11, [42, 42, 80]);             // ojo derecho
        skin.px(14, 11, [245, 245, 245]);
        // fosas del hocico: cara frontal en (33,1)..(37,4)
        skin.px(34, 2, [120, 50, 60]);
        skin.px(36, 2, [120, 50, 60]);
        // lomo algo embarrado
        skin.speckle(16, 16, 10, 8, 12, [180, 120, 110]);
    },

    parts: [
        { name: 'cuerpo', size: [10, 8, 16], pivot: [0, 6, 0], origin: [-5, 0, -8], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 12, -8], origin: [-4, -4, -8], uv: [0, 0], anim: 'head' },
        { name: 'hocico', size: [4, 3, 1], pivot: [0, 12, -8], origin: [-2, -2, -9], uv: [32, 0], anim: 'head' },
        { name: 'pata_di', size: [4, 6, 4], pivot: [-3, 6, -5], origin: [-2, -6, -2], uv: [0, 40], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 6, 4], pivot: [3, 6, -5], origin: [-2, -6, -2], uv: [0, 40], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 6, 4], pivot: [-3, 6, 5], origin: [-2, -6, -2], uv: [0, 40], anim: 'leg1' },
        { name: 'pata_td', size: [4, 6, 4], pivot: [3, 6, 5], origin: [-2, -6, -2], uv: [0, 40], anim: 'leg0' },
    ],

    /** Voz: gruñidos sintetizados (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 250, b: 0.7, d: 0.2, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 420, b: 0.85, d: 0.14, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 320, b: 0.4, d: 0.5, w: 'sawtooth', v: 0.28 }],
    },
};

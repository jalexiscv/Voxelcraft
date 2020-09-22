/**
 * Sniffer: mob pasivo, criatura ancestral enorme y lenta. Cuerpo rojo musgo
 * con placas de musgo verde en el lomo y un cabezón cuyo hocico plano casi
 * arrastra por el suelo (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   cuerpo 16×12×22 → 76×34
 *   (76,0)  cabeza 12×10×12 → 48×22
 *   (76,24) hocico 12×3×3   → 30×6
 *   (0,36)  pata 5×10×5     → 20×15 (las cuatro patas comparten desplegado)
 *   (24,36) placa 4×2×6     → 20×8 (ambas placas comparten desplegado)
 */

const ROJO_MUSGO = [140, 60, 60];
const ROJO_OSCURO = [114, 46, 48];
const MUSGO = [96, 130, 70];
const MUSGO_CLARO = [122, 156, 86];
const HOCICO = [104, 54, 52];
const GARRA = [88, 40, 42];

export default {
    id: 'sniffer',
    name: 'Sniffer',
    hostile: false,
    aabb: { w: 1.6, h: 1.6 },
    hp: 20,
    speed: 0.7,
    spawn: { cap: 1, group: 1 },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 76, 34, ROJO_MUSGO, 8);    // cuerpo
        skin.fill(76, 0, 48, 22, ROJO_MUSGO, 8);   // cabeza
        skin.fill(76, 24, 30, 6, HOCICO, 6);       // hocico
        skin.fill(0, 36, 20, 15, ROJO_MUSGO, 8);   // pata
        skin.fill(24, 36, 20, 8, MUSGO, 9);        // placa de musgo

        // lomo (cara superior del cuerpo, rect (22,0)..(38,22)): musgo verde
        skin.fill(24, 2, 12, 8, MUSGO, 10);
        skin.fill(25, 12, 11, 8, MUSGO, 10);
        skin.speckle(22, 0, 16, 22, 26, MUSGO_CLARO);
        // el musgo asoma por el borde alto de la espalda (rect (60,22)..(76,34))
        skin.fill(62, 22, 12, 3, MUSGO, 8);
        // vientre algo más oscuro (cara inferior, rect (38,0)..(54,22))
        skin.fill(38, 0, 16, 22, ROJO_OSCURO, 7);

        // coronilla musgosa (cara superior de la cabeza, rect (88,0)..(100,12))
        skin.fill(90, 2, 8, 8, MUSGO, 10);
        skin.speckle(88, 0, 12, 12, 10, MUSGO_CLARO);
        // cara frontal de la cabeza: rect (88,12)..(100,22) — ojitos pequeños
        skin.px(90, 14, [235, 230, 220]);          // ojo izquierdo
        skin.px(91, 14, [40, 34, 48]);
        skin.px(96, 14, [40, 34, 48]);             // ojo derecho
        skin.px(97, 14, [235, 230, 220]);
        // fosas del hocico: cara frontal en (79,27)..(91,30)
        skin.px(82, 28, [62, 30, 32]);
        skin.px(87, 28, [62, 30, 32]);

        // garras (dos filas inferiores de las caras laterales de la pata)
        skin.fill(0, 49, 20, 2, GARRA, 4);
    },

    parts: [
        { name: 'cuerpo', size: [16, 12, 22], pivot: [0, 14, 0], origin: [-8, -6, -11], uv: [0, 0] },
        { name: 'cabeza', size: [12, 10, 12], pivot: [0, 18, -10], origin: [-6, -14, -13], uv: [76, 0], anim: 'head' },
        { name: 'hocico', size: [12, 3, 3], pivot: [0, 18, -10], origin: [-6, -17, -16], uv: [76, 24], anim: 'head' },
        { name: 'placa_i', size: [4, 2, 6], pivot: [-3, 20, -5], origin: [-2, 0, -3], uv: [24, 36] },
        { name: 'placa_d', size: [4, 2, 6], pivot: [3, 20, 5], origin: [-2, 0, -3], uv: [24, 36] },
        { name: 'pata_di', size: [5, 10, 5], pivot: [-5, 10, -7], origin: [-2.5, -10, -2.5], uv: [0, 36], anim: 'leg0' },
        { name: 'pata_dd', size: [5, 10, 5], pivot: [5, 10, -7], origin: [-2.5, -10, -2.5], uv: [0, 36], anim: 'leg1' },
        { name: 'pata_ti', size: [5, 10, 5], pivot: [-5, 10, 7], origin: [-2.5, -10, -2.5], uv: [0, 36], anim: 'leg1' },
        { name: 'pata_td', size: [5, 10, 5], pivot: [5, 10, 7], origin: [-2.5, -10, -2.5], uv: [0, 36], anim: 'leg0' },
    ],

    /** Voz: resoplidos graves — ruido nasal más un tono profundo de fondo. */
    voice: {
        say: [
            { noise: true, f: 300, q: 0.7, d: 0.4, v: 0.3 },
            { f: 120, b: 0.85, d: 0.35, w: 'sine', v: 0.26, at: 0.02 },
        ],
        hurt: [
            { noise: true, f: 420, q: 0.8, d: 0.22, v: 0.32 },
            { f: 150, b: 0.75, d: 0.18, w: 'sine', v: 0.28 },
        ],
        death: [
            { noise: true, f: 260, q: 0.6, d: 0.7, v: 0.3 },
            { f: 110, b: 0.35, d: 0.8, w: 'sine', v: 0.3 },
        ],
    },
};

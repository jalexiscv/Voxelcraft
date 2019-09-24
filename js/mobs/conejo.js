/**
 * Conejo: mob pasivo pequeño y asustadizo. Avanza a saltos (hop) y huye en
 * cuanto el jugador se acerca (timid). Ver model.js para el formato de las
 * partes y el desplegado UV; cerdo.js es el ejemplo canónico del contrato.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 4×4×6  → 20×10
 *   (0,12)  cabeza 4×4×4  → 16×8
 *   (24,0)  oreja 2×5×1   → 6×6  (las dos orejas comparten desplegado)
 *   (24,8)  colita 2×2×2  → 8×4
 *   (24,14) pata 2×2×2    → 8×4  (las cuatro patas comparten desplegado)
 */

const PARDO = [150, 120, 90];
const PARDO_OSCURO = [122, 96, 70];
const CREMA = [222, 208, 182];
const BLANCO = [242, 238, 230];
const ROSA = [212, 158, 158];
const OJO = [40, 32, 30];

export default {
    id: 'conejo',
    name: 'Conejo',
    hostile: false,
    aabb: { w: 0.45, h: 0.5 },
    hp: 3,
    speed: 2.2,
    fleeSpeed: 3.2,
    hop: true,
    timid: true,
    spawn: { cap: 3, group: 2, block: 'GRASS' },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 20, 10, PARDO, 8);         // cuerpo
        skin.fill(10, 0, 4, 6, CREMA, 6);          // vientre: cara inferior del cuerpo
        skin.fill(0, 12, 16, 8, PARDO, 8);         // cabeza
        skin.fill(24, 0, 6, 6, PARDO, 6);          // oreja
        skin.fill(24, 8, 8, 4, BLANCO, 4);         // colita blanca
        skin.fill(24, 14, 8, 4, PARDO, 6);         // pata

        // interior rosado de la oreja: cara frontal (25,1)..(27,6)
        skin.fill(25, 2, 2, 3, ROSA, 4);
        // cara frontal de la cabeza: rect (4,16)..(8,20)
        skin.px(4, 17, OJO);                       // ojo izquierdo
        skin.px(7, 17, OJO);                       // ojo derecho
        skin.px(5, 18, ROSA);                      // nariz rosada
        skin.px(6, 18, ROSA);
        // pies algo más oscuros: fila inferior de las caras laterales de la pata
        skin.fill(24, 17, 8, 1, PARDO_OSCURO, 4);
        // lomo moteado: cara superior del cuerpo (6,0)..(10,6)
        skin.speckle(6, 0, 4, 6, 6, PARDO_OSCURO);
    },

    parts: [
        { name: 'cuerpo', size: [4, 4, 6], pivot: [0, 3, 0], origin: [-2, -2, -3], uv: [0, 0] },
        { name: 'cabeza', size: [4, 4, 4], pivot: [0, 5, -3], origin: [-2, -2, -2], uv: [0, 12], anim: 'head' },
        // orejas verticales sobre la cabeza, hundidas 1 px para que no floten
        { name: 'oreja_i', size: [2, 5, 1], pivot: [0, 5, -3], origin: [-2, 1, -1], uv: [24, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 5, 1], pivot: [0, 5, -3], origin: [0, 1, -1], uv: [24, 0], anim: 'head' },
        { name: 'colita', size: [2, 2, 2], pivot: [0, 3, 3], origin: [-1, -1, -1], uv: [24, 8] },
        { name: 'pata_di', size: [2, 2, 2], pivot: [-1, 2, -2], origin: [-1, -2, -1], uv: [24, 14], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 2, 2], pivot: [1, 2, -2], origin: [-1, -2, -1], uv: [24, 14], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 2, 2], pivot: [-1, 2, 2], origin: [-1, -2, -1], uv: [24, 14], anim: 'leg1' },
        { name: 'pata_td', size: [2, 2, 2], pivot: [1, 2, 2], origin: [-1, -2, -1], uv: [24, 14], anim: 'leg0' },
    ],

    /** Voz: chillido casi mudo, notas cuadradas agudas (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 1000, b: 1.1, d: 0.08, w: 'square', v: 0.06 }],
        hurt: [{ f: 1250, b: 0.8, d: 0.1, w: 'square', v: 0.14 }],
        death: [{ f: 950, b: 0.4, d: 0.35, w: 'square', v: 0.12 }],
    },
};

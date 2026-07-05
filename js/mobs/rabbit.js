/**
 * Conejo: mob pasivo pequeño y asustadizo. Avanza a saltos (hop) y huye en
 * cuanto el jugador se acerca (timid). Silueta agazapada clásica: cuerpo
 * bajo y largo, ancas traseras plegadas con pies largos a ras de suelo,
 * orejas altas y colita. Ver model.js para el formato de las partes.
 *
 * Tonalidades (variants: 6, una piel por variante; paint recibe `v`):
 *   0 pardo · 1 blanco (ojos rojizos) · 2 negro · 3 blanco y negro moteado
 *   · 4 dorado · 5 sal y pimienta. En la nieve aparece blanco y en el
 *   desierto dorado (variantBiome); en el resto, al azar.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 4×4×7   → 22×11
 *   (0,16)  cabeza 4×4×4   → 16×8
 *   (24,0)  oreja 2×5×1    → 6×6   (ambas orejas comparten desplegado)
 *   (24,8)  colita 2×2×2   → 8×4
 *   (24,16) pata del. 1×3×1 → 4×4  (ambas delanteras comparten desplegado)
 *   (34,0)  anca 1×4×4     → 10×8  (ambas ancas comparten desplegado)
 *   (34,12) pie 2×1×4      → 12×5  (ambos pies comparten desplegado)
 */

import { ITEMS } from '../items.js';

const ROSA = [226, 190, 196];      // nariz e interior de las orejas
const PALETAS = [
    { pelo: [150, 120, 90], sombra: [122, 96, 70], vientre: [222, 208, 182], ojo: [40, 32, 30] },
    { pelo: [240, 240, 237], sombra: [214, 214, 209], vientre: [247, 247, 244], ojo: [186, 58, 58] },
    { pelo: [52, 48, 46], sombra: [36, 33, 32], vientre: [90, 84, 80], ojo: [26, 22, 22] },
    { pelo: [235, 233, 230], sombra: [56, 52, 50], vientre: [242, 240, 238], ojo: [40, 32, 30], manchas: true },
    { pelo: [214, 180, 122], sombra: [180, 146, 94], vientre: [238, 224, 194], ojo: [40, 32, 30] },
    { pelo: [164, 150, 132], sombra: [116, 104, 92], vientre: [212, 202, 188], ojo: [40, 32, 30], motas: true },
];

export default {
    id: 'rabbit',
    name: 'Conejo',
    hostile: false,
    aabb: { w: 0.45, h: 0.55 },
    hp: 3,
    speed: 2.2,
    fleeSpeed: 3.2,
    hop: true,
    timid: true,
    // sin block explícito: aparece sobre el suelo natural de cada bioma
    // (hierba, arena del desierto/playa, hierba nevada de la tundra)
    spawn: { cap: 3, group: 2 },
    // botín: un bocado de carne y algo de cuero, a la medida de su tamaño
    drops: [{ id: ITEMS.CARNE_CRUDA, min: 0, max: 1 }, { id: ITEMS.CUERO, min: 0, max: 1 }],

    /** Seis tonalidades; en nieve sale blanco (1) y en desierto dorado (4). */
    variants: 6,
    variantBiome: { nevado: 1, desierto: 4, playa: 4 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel de la variante `v`; solo importan los texels de los UV. */
    paint(skin, v = 0) {
        const c = PALETAS[v % PALETAS.length];
        skin.fill(0, 0, 22, 11, c.pelo, 8);        // cuerpo
        skin.fill(11, 0, 4, 7, c.vientre, 6);      // vientre: cara inferior
        skin.fill(0, 16, 16, 8, c.pelo, 8);        // cabeza
        skin.fill(24, 0, 6, 6, c.pelo, 6);         // oreja
        skin.fill(24, 8, 8, 4, c.vientre, 4);      // colita clara
        skin.fill(24, 16, 4, 4, c.pelo, 6);        // pata delantera
        skin.fill(34, 0, 10, 8, c.pelo, 8);        // anca
        skin.fill(34, 12, 12, 5, c.sombra, 5);     // pie (algo más oscuro)

        // interior rosado de la oreja: cara frontal (25,1)..(27,6)
        skin.fill(25, 2, 2, 3, ROSA, 4);
        // cara frontal de la cabeza: rect (4,20)..(8,24)
        skin.px(4, 21, c.ojo);                     // ojo izquierdo
        skin.px(7, 21, c.ojo);                     // ojo derecho
        skin.px(5, 22, ROSA);                      // nariz rosada
        skin.px(6, 22, ROSA);

        if (c.manchas) {                           // blanco y negro: manchas grandes
            skin.fill(2, 2, 5, 4, c.sombra, 4);    // mancha del lomo
            skin.fill(15, 5, 4, 4, c.sombra, 4);   // mancha del costado
            skin.fill(9, 17, 4, 3, c.sombra, 4);   // mancha de la cabeza
            skin.fill(36, 2, 4, 4, c.sombra, 4);   // mancha del anca
        } else if (c.motas) {                      // sal y pimienta: moteado fino
            skin.speckle(0, 0, 22, 11, 26, c.sombra);
            skin.speckle(0, 16, 16, 8, 12, c.sombra);
            skin.speckle(34, 0, 10, 8, 10, c.sombra);
        } else {
            skin.speckle(6, 0, 6, 6, 6, c.sombra); // lomo sutilmente moteado
        }
    },

    parts: [
        // cuerpo bajo y largo, con la cabeza al frente y a media altura
        { name: 'cuerpo', size: [4, 4, 7], pivot: [0, 2, 0], origin: [-2, 0, -3.5], uv: [0, 0] },
        { name: 'cabeza', size: [4, 4, 4], pivot: [0, 4, -3.5], origin: [-2, -1, -2], uv: [0, 16], anim: 'head' },
        // orejas altas y SEPARADAS: cada una hacia su lado, con hueco central
        { name: 'oreja_i', size: [2, 5, 1], pivot: [0, 4, -3.5], origin: [-2.4, 2, -0.5], uv: [24, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 5, 1], pivot: [0, 4, -3.5], origin: [0.4, 2, -0.5], uv: [24, 0], anim: 'head' },
        { name: 'colita', size: [2, 2, 2], pivot: [0, 3.5, 3.5], origin: [-1, -1, -0.5], uv: [24, 8] },
        // patas delanteras finas y verticales
        { name: 'pata_di', size: [1, 3, 1], pivot: [-1.5, 3, -2.5], origin: [-0.5, -3, -0.5], uv: [24, 16], anim: 'leg0' },
        { name: 'pata_dd', size: [1, 3, 1], pivot: [1.5, 3, -2.5], origin: [-0.5, -3, -0.5], uv: [24, 16], anim: 'leg1' },
        // ancas traseras plegadas (placas verticales a los costados)
        { name: 'anca_i', size: [1, 4, 4], pivot: [-2.5, 2, 1.5], origin: [-0.5, -2, -2], uv: [34, 0], anim: 'leg1' },
        { name: 'anca_d', size: [1, 4, 4], pivot: [2.5, 2, 1.5], origin: [-0.5, -2, -2], uv: [34, 0], anim: 'leg0' },
        // pies traseros largos, a ras de suelo y apuntando al frente
        { name: 'pie_i', size: [2, 1, 4], pivot: [-2, 0.5, 2], origin: [-1, -0.5, -3], uv: [34, 12], anim: 'leg1' },
        { name: 'pie_d', size: [2, 1, 4], pivot: [2, 0.5, 2], origin: [-1, -0.5, -3], uv: [34, 12], anim: 'leg0' },
    ],

    /** Voz: chillido casi mudo, notas cuadradas agudas (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 1000, b: 1.1, d: 0.08, w: 'square', v: 0.06 }],
        hurt: [{ f: 1250, b: 0.8, d: 0.1, w: 'square', v: 0.14 }],
        death: [{ f: 950, b: 0.4, d: 0.35, w: 'square', v: 0.12 }],
    },

    /** Sonidos reales del pack local (mob/rabbit): idle1-4, hurt1-4 y el grito. */
    sonidos: {
        say: ['mob/rabbit/idle'],
        hurt: ['mob/rabbit/hurt'],
        death: ['mob/rabbit/bunnymurder'], // el clásico chillido de muerte del conejo
    },
};

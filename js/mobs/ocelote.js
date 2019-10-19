/**
 * Ocelote: felino pasivo y asustadizo (timid) que huye cuando el jugador se
 * acerca. Silueta estilizada de gato: cuerpo bajo y alargado, cabeza con
 * orejas, cola levantada y patas finas algo largas. Pelaje amarillo dorado
 * con manchas negras y vientre claro. Sigue el contrato de definición de
 * mobs (ver model.js para el formato de las partes y el desplegado UV;
 * cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 4×4×10 → 28×14
 *   (32,0)  cola 1×1×7    → 16×8
 *   (0,16)  cabeza 4×4×4  → 16×8
 *   (20,16) oreja 1×1×2   → 6×3 (las dos orejas comparten desplegado)
 *   (0,28)  pata 2×6×2    → 8×8 (las cuatro patas comparten desplegado)
 *
 * Modelo: patas de 6 px que llegan al suelo (pivot.y + origin.y = 0), cuerpo
 * de y 6 a 10, cabeza al frente (−Z) con las orejas en lo alto del cráneo y
 * cola trasera con rot X ligeramente negativa (levantada hacia atrás, lejos
 * del umbral de aviso). Altura del modelo 12 px frente a un AABB de 0.6
 * bloques (9.6 px), dentro de la tolerancia del validador.
 */

const DORADO = [230, 190, 110];        // pelaje base amarillo dorado
const CREMA = [243, 229, 196];         // vientre, pecho, hocico y zarpas
const NEGRO = [36, 31, 27];            // manchas y puntas
const ROSA = [212, 128, 128];          // nariz
const VERDE = [96, 168, 88];           // ojos
const BOCA = [122, 86, 60];            // trazo de la boca

export default {
    id: 'ocelote',
    name: 'Ocelote',
    hostile: false,
    aabb: { w: 0.5, h: 0.6 },
    hp: 8,
    speed: 2.4,
    fleeSpeed: 3.4,
    timid: true,
    spawn: { cap: 2, group: 1 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // manchas grandes: rosetas negras de 2×2 texels dentro del rectángulo
        const manchas = (x, y, w, h, n) => {
            for (let i = 0; i < n; i++) {
                skin.fill(x + skin.rng.int(Math.max(1, w - 1)), y + skin.rng.int(Math.max(1, h - 1)), 2, 2, NEGRO);
            }
        };

        skin.fill(0, 0, 28, 14, DORADO, 8);        // cuerpo
        skin.fill(32, 0, 16, 8, DORADO, 7);        // cola
        skin.fill(0, 16, 16, 8, DORADO, 7);        // cabeza
        skin.fill(20, 16, 6, 3, DORADO, 6);        // oreja
        skin.fill(0, 28, 8, 8, DORADO, 7);         // pata

        // moteado del pelaje (antes de los rasgos, que se pintan encima)
        manchas(0, 0, 28, 14, 14);                 // lomo y costados
        manchas(0, 16, 16, 8, 6);                  // cabeza
        manchas(32, 0, 16, 8, 8);                  // cola anillada
        manchas(0, 28, 8, 6, 3);                   // patas

        // vientre claro: cara inferior del cuerpo (14,0)..(18,10)
        skin.fill(14, 0, 4, 10, CREMA, 5);
        // pecho claro: mitad baja de la cara frontal del cuerpo (10,10)..(14,14)
        skin.fill(10, 12, 4, 2, CREMA, 4);

        // orejas con el dorso negro: fila exterior de los rects arriba/abajo
        skin.fill(20, 16, 6, 1, NEGRO);

        // cara frontal de la cabeza: rect (4,20)..(8,24)
        skin.fill(4, 22, 4, 2, CREMA, 3);          // hocico claro
        skin.px(4, 21, VERDE);                     // ojo izquierdo
        skin.px(7, 21, VERDE);                     // ojo derecho
        skin.px(5, 22, ROSA);                      // nariz
        skin.px(6, 22, ROSA);
        skin.px(5, 23, BOCA);                      // boca
        skin.px(6, 23, BOCA);

        // punta de la cola negra (extremo +Z de cada rect del desplegado)
        skin.fill(32, 7, 2, 1, NEGRO);             // cara +X
        skin.fill(40, 7, 2, 1, NEGRO);             // cara −X
        skin.fill(39, 5, 2, 2, NEGRO);             // columnas arriba/abajo
        skin.px(47, 7, NEGRO);                     // tapa trasera

        // zarpas claras: dos filas inferiores de las caras laterales de la pata
        skin.fill(0, 34, 8, 2, CREMA, 4);
    },

    parts: [
        { name: 'cuerpo', size: [4, 4, 10], pivot: [0, 8, 0], origin: [-2, -2, -5], uv: [0, 0] },
        { name: 'cabeza', size: [4, 4, 4], pivot: [0, 9, -5], origin: [-2, -2, -4], uv: [0, 16], anim: 'head' },
        { name: 'oreja_i', size: [1, 1, 2], pivot: [0, 9, -5], origin: [-2, 2, -2], uv: [20, 16], anim: 'head' },
        { name: 'oreja_d', size: [1, 1, 2], pivot: [0, 9, -5], origin: [1, 2, -2], uv: [20, 16], anim: 'head' },
        // cola hacia atrás (+Z) y levantada: rot X negativa suave la alza
        { name: 'cola', size: [1, 1, 7], pivot: [0, 9, 5], origin: [-0.5, -0.5, 0], uv: [32, 0], rot: [-0.35, 0, 0] },
        { name: 'pata_di', size: [2, 6, 2], pivot: [-1, 6, -4], origin: [-1, -6, -1], uv: [0, 28], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 6, 2], pivot: [1, 6, -4], origin: [-1, -6, -1], uv: [0, 28], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 6, 2], pivot: [-1, 6, 4], origin: [-1, -6, -1], uv: [0, 28], anim: 'leg1' },
        { name: 'pata_td', size: [2, 6, 2], pivot: [1, 6, 4], origin: [-1, -6, -1], uv: [0, 28], anim: 'leg0' },
    ],

    /** Voz: maullido corto y agudo, sube y cae ("mi-au"); ver SoundEngine.mobSay. */
    voice: {
        say: [
            { f: 880, b: 1.5, d: 0.09, w: 'triangle', v: 0.2 },            // "mi" ascendente
            { f: 1250, b: 0.55, d: 0.22, w: 'triangle', v: 0.18, at: 0.09 }, // "au" descendente
        ],
        hurt: [{ f: 1400, b: 0.75, d: 0.1, w: 'triangle', v: 0.3 }],
        death: [{ f: 1100, b: 0.3, d: 0.45, w: 'triangle', v: 0.26 }],
    },
};

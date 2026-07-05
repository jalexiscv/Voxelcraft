/**
 * Zorro: mob pasivo y asustadizo (timid: huye en cuanto el jugador se
 * acerca). Pelaje naranja con vientre blanco, hocico blanco de nariz negra,
 * orejas de punta negra y cola esponjosa de punta blanca (ver model.js para
 * el formato de las partes y el desplegado UV; pig.js es el ejemplo
 * canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 6×5×5   → 22×10    (24,0) hocico 3×2×3 → 12×5
 *   (40,0)  oreja 2×2×1    → 6×3   (ambas orejas comparten desplegado)
 *   (0,16)  cuerpo 5×5×10  → 30×15
 *   (32,16) cola 2×2×8     → 20×10
 *   (0,32)  pata 2×5×2     → 8×7   (las cuatro patas comparten desplegado)
 */

const NARANJA = [222, 130, 60];
const NARANJA_OSCURO = [180, 95, 40];
const BLANCO = [240, 236, 228];
const NEGRO = [38, 34, 36];

export default {
    id: 'fox',
    name: 'Zorro',
    hostile: false,
    aabb: { w: 0.6, h: 0.6 },
    hp: 8,
    speed: 2.6,
    fleeSpeed: 3.6,
    timid: true,
    spawn: { cap: 2, group: 1 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 22, 10, NARANJA, 8);        // cabeza
        skin.fill(24, 0, 12, 5, BLANCO, 4);         // hocico blanco
        skin.fill(40, 0, 6, 3, NARANJA, 6);         // oreja (desplegado compartido)
        skin.fill(40, 0, 6, 2, NEGRO, 3);           // punta negra de la oreja
        skin.fill(0, 16, 30, 15, NARANJA, 8);       // cuerpo
        skin.fill(32, 16, 20, 10, NARANJA, 10);     // cola (espolvoreada: esponjosa)
        skin.speckle(32, 16, 20, 10, 24, NARANJA_OSCURO);
        skin.fill(0, 32, 8, 7, NEGRO, 4);           // pata negra

        // cara frontal de la cabeza: rect (5,5)..(11,10)
        skin.px(6, 6, NEGRO);                       // ojo izquierdo
        skin.px(9, 6, NEGRO);                       // ojo derecho
        skin.fill(5, 8, 6, 2, BLANCO, 3);           // mejillas blancas (enlazan con el hocico)
        // nariz negra: cara frontal del hocico (27,3)..(30,5) y vista superior
        skin.px(28, 3, NEGRO);
        skin.px(28, 0, NEGRO);

        // vientre blanco (cara inferior del cuerpo) y pecho claro
        skin.fill(15, 16, 5, 10, BLANCO, 4);
        skin.fill(11, 28, 3, 3, BLANCO, 3);         // pecho (cara frontal, filas bajas)
        skin.speckle(10, 16, 5, 10, 10, NARANJA_OSCURO); // lomo algo revuelto

        // punta blanca de la cola: la cola se extiende hacia +Z, así que el
        // extremo es la cara trasera y el borde z1 de las caras largas
        skin.fill(40, 22, 2, 2, BLANCO, 3);         // cara superior (filas del extremo)
        skin.fill(42, 16, 2, 2, BLANCO, 3);         // cara inferior (filas del extremo)
        skin.fill(32, 24, 2, 2, BLANCO, 3);         // cara +X (columnas del extremo)
        skin.fill(42, 24, 2, 2, BLANCO, 3);         // cara −X (columnas del extremo)
        skin.fill(50, 24, 2, 2, BLANCO, 3);         // cara trasera (la punta)
    },

    parts: [
        { name: 'cuerpo', size: [5, 5, 10], pivot: [0, 4, 0], origin: [-2.5, 0, -5], uv: [0, 16] },
        { name: 'cabeza', size: [6, 5, 5], pivot: [0, 8, -5], origin: [-3, -2, -5], uv: [0, 0], anim: 'head' },
        { name: 'hocico', size: [3, 2, 3], pivot: [0, 8, -5], origin: [-1.5, -2, -8], uv: [24, 0], anim: 'head' },
        { name: 'oreja_i', size: [2, 2, 1], pivot: [0, 8, -5], origin: [-3, 3, -3], uv: [40, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 2, 1], pivot: [0, 8, -5], origin: [1, 3, -3], uv: [40, 0], anim: 'head' },
        // cola hacia atrás (+Z), ligeramente alzada (rot X negativa pequeña)
        { name: 'cola', size: [2, 2, 8], pivot: [0, 7, 5], origin: [-1, -1, 0], uv: [32, 16], rot: [-0.3, 0, 0] },
        { name: 'pata_di', size: [2, 5, 2], pivot: [-1.5, 5, -3.5], origin: [-1, -5, -1], uv: [0, 32], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 5, 2], pivot: [1.5, 5, -3.5], origin: [-1, -5, -1], uv: [0, 32], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 5, 2], pivot: [-1.5, 5, 3.5], origin: [-1, -5, -1], uv: [0, 32], anim: 'leg1' },
        { name: 'pata_td', size: [2, 5, 2], pivot: [1.5, 5, 3.5], origin: [-1, -5, -1], uv: [0, 32], anim: 'leg0' },
    ],

    /** Voz: chillido agudo "ack-ack" en onda cuadrada (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 900, b: 0.6, d: 0.12, w: 'square', v: 0.2 },
            { f: 900, b: 0.6, d: 0.12, w: 'square', v: 0.2, at: 0.16 },
        ],
        hurt: [{ f: 1100, b: 0.65, d: 0.1, w: 'square', v: 0.3 }],
        death: [{ f: 850, b: 0.3, d: 0.45, w: 'square', v: 0.28 }],
    },

    /** Voces del pack local: idle = vocalización ambiente del zorro. */
    sonidos: {
        say: ['mob/fox/idle'],
        hurt: ['mob/fox/hurt'],
        death: ['mob/fox/death'],
    },
};

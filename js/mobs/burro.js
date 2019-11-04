/**
 * Burro: mob pasivo de pradera. Cuadrúpedo gris pardo como un caballo algo
 * menor: patas largas, cuello que sube al frente rematado en una cabeza
 * alargada de hocico claro, crin erizada oscura sobre el cuello y las dos
 * orejas largas características; cuello, cabeza, crin y orejas comparten
 * pivote y giran juntos con anim `head` (ver model.js para el formato de las
 * partes y el desplegado UV; cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   cuerpo 11×11×20 → 62×31
 *   (62,0)  cuello 4×9×6    → 20×15
 *   (82,0)  pata 4×14×4     → 16×18 (las cuatro patas comparten desplegado)
 *   (98,0)  cabeza 5×5×9    → 28×14
 *   (62,16) crin 1×4×6      → 14×10
 *   (76,16) oreja 1×4×1     → 4×5 (ambas orejas comparten)
 */

const GRIS_PARDO = [150, 140, 130];     // pelaje base
const GRIS_OSCURO = [112, 103, 94];     // moteado y boca
const CRIN = [72, 65, 56];              // crin erizada, raya dorsal y puntas de las orejas
const HOCICO = [214, 205, 192];         // hocico e interior de las orejas
const VIENTRE = [192, 184, 172];        // cara inferior clara
const PEZUNA = [78, 70, 62];            // cascos
const OSCURO = [42, 40, 44];            // ojos y fosas nasales

export default {
    id: 'burro',
    name: 'Burro',
    hostile: false,
    aabb: { w: 1.2, h: 1.4 },
    hp: 16,
    speed: 2.4,
    fleeSpeed: 3.2,
    spawn: { cap: 2, group: 2 },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // bases (cada rectángulo cubre el desplegado completo de su parte)
        skin.fill(0, 0, 62, 31, GRIS_PARDO, 8);     // cuerpo
        skin.fill(62, 0, 20, 15, GRIS_PARDO, 7);    // cuello
        skin.fill(82, 0, 16, 18, GRIS_PARDO, 7);    // pata
        skin.fill(98, 0, 28, 14, GRIS_PARDO, 7);    // cabeza
        skin.fill(62, 16, 14, 10, CRIN, 6);         // crin
        skin.fill(76, 16, 4, 5, GRIS_PARDO, 6);     // oreja

        // raya dorsal y cruz de los hombros, marcas clásicas del burro
        // (cara superior del cuerpo (20,0)..(31,20); v crece hacia atrás)
        skin.fill(25, 0, 1, 20, CRIN, 3);
        skin.fill(20, 4, 11, 1, CRIN, 3);
        // vientre claro: cara inferior del cuerpo (31,0)..(42,20)
        skin.fill(31, 0, 11, 20, VIENTRE, 6);
        // moteado sutil de flancos, pecho y anca (banda lateral del cuerpo)
        skin.speckle(0, 20, 62, 11, 36, GRIS_OSCURO);

        // la crin baja erizada por la nuca: cara trasera del cuello (78,6)..(82,15)
        skin.fill(78, 6, 4, 9, CRIN, 5);
        skin.speckle(62, 16, 14, 10, 12, [52, 48, 42]); // pelos revueltos de la crin
        // flequillo sobre la frente: fondo de la cara superior de la cabeza
        skin.fill(108, 7, 3, 2, CRIN, 3);

        // hocico claro: cara frontal de la cabeza (107,9)..(112,14)
        skin.fill(107, 9, 5, 5, HOCICO, 4);
        skin.px(108, 11, OSCURO);                   // fosa nasal izquierda
        skin.px(110, 11, OSCURO);                   // fosa nasal derecha
        skin.fill(108, 13, 3, 1, GRIS_OSCURO, 0);   // boca
        // el hocico claro asoma por los laterales (el frente queda a la derecha)
        skin.fill(105, 11, 2, 3, HOCICO, 4);        // cara +X
        skin.fill(119, 11, 2, 3, HOCICO, 4);        // cara −X

        // ojos en los laterales de la cabeza, cerca de la nuca
        skin.px(100, 10, [235, 232, 226]);          // ojo derecho (cara +X)
        skin.px(101, 10, OSCURO);
        skin.px(114, 10, [235, 232, 226]);          // ojo izquierdo (cara −X)
        skin.px(115, 10, OSCURO);

        // orejas: puntas oscuras e interior claro (cara frontal)
        skin.fill(76, 17, 4, 1, CRIN, 3);           // punta (fila alta de los laterales)
        skin.px(77, 16, CRIN);                      // punta (cara superior)
        skin.fill(77, 18, 1, 2, HOCICO, 3);         // interior de la oreja

        // patas: cascos oscuros (borde inferior lateral y cara de apoyo)
        skin.fill(82, 16, 16, 2, PEZUNA, 4);
        skin.fill(90, 0, 4, 4, PEZUNA, 4);
        // línea de las rodillas a media pata
        skin.fill(82, 10, 16, 1, GRIS_OSCURO, 5);
    },

    parts: [
        { name: 'cuerpo', size: [11, 11, 20], pivot: [0, 17, 0], origin: [-5.5, -5, -10], uv: [0, 0] },
        { name: 'cuello', size: [4, 9, 6], pivot: [0, 21, -8], origin: [-2, -4, -3], uv: [62, 0], anim: 'head' },
        { name: 'cabeza', size: [5, 5, 9], pivot: [0, 21, -8], origin: [-2.5, 3, -12], uv: [98, 0], anim: 'head' },
        { name: 'crin', size: [1, 4, 6], pivot: [0, 21, -8], origin: [-0.5, 4, -3], uv: [62, 16], anim: 'head' },
        { name: 'oreja_i', size: [1, 4, 1], pivot: [0, 21, -8], origin: [-2.5, 7, -4], uv: [76, 16], anim: 'head' },
        { name: 'oreja_d', size: [1, 4, 1], pivot: [0, 21, -8], origin: [1.5, 7, -4], uv: [76, 16], anim: 'head' },
        { name: 'pata_di', size: [4, 14, 4], pivot: [-3.5, 14, -8], origin: [-2, -14, -2], uv: [82, 0], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 14, 4], pivot: [3.5, 14, -8], origin: [-2, -14, -2], uv: [82, 0], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 14, 4], pivot: [-3.5, 14, 8], origin: [-2, -14, -2], uv: [82, 0], anim: 'leg1' },
        { name: 'pata_td', size: [4, 14, 4], pivot: [3.5, 14, 8], origin: [-2, -14, -2], uv: [82, 0], anim: 'leg0' },
    ],

    /** Voz: rebuzno de dos notas cuadradas alternas, "i-aa" repetido (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 420, b: 1.1, d: 0.18, w: 'square', v: 0.24, at: 0 },
            { f: 300, b: 0.85, d: 0.18, w: 'square', v: 0.26, at: 0.18 },
            { f: 420, b: 1.1, d: 0.18, w: 'square', v: 0.22, at: 0.36 },
            { f: 300, b: 0.85, d: 0.18, w: 'square', v: 0.24, at: 0.54 },
        ],
        hurt: [{ f: 480, b: 0.75, d: 0.2, w: 'square', v: 0.3 }],
        death: [
            { f: 420, b: 0.9, d: 0.25, w: 'square', v: 0.3 },
            { f: 260, b: 0.5, d: 0.5, w: 'square', v: 0.28, at: 0.25 },
        ],
    },
};

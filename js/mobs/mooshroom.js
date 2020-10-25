/**
 * Mooshroom: vaca-seta pasiva de pradera. Comparte las proporciones de la
 * vaca (ver vaca.js) pero con pelaje rojo de grandes manchas blancas y tres
 * setas creciendo sobre el lomo (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×6    → 28×14     (28,0) cuerno 1×3×1 → 4×4 (ambos comparten)
 *   (34,0)  seta 2×3×2      → 8×5 (delantera y trasera comparten)
 *   (44,0)  seta 2×3×2      → 8×5 (central, con motas propias)
 *   (0,16)  cuerpo 12×10×18 → 60×28
 *   (0,44)  pata 4×12×4     → 16×16 (las cuatro patas comparten desplegado)
 */

const ROJO = [178, 52, 44];
const ROJO_OSCURO = [140, 38, 32];
const BLANCO = [235, 233, 228];
const VIENTRE = [222, 208, 198];
const HOCICO = [205, 195, 185];
const CUERNO = [200, 195, 180];
const PEZUNA = [58, 48, 40];
const SOMBRERO = [196, 40, 38];
const TALLO = [230, 222, 206];
const MOTA = [245, 242, 236];

export default {
    id: 'mooshroom',
    name: 'Mooshroom',
    hostile: false,
    aabb: { w: 0.9, h: 1.4 },
    hp: 12,
    speed: 0.9,
    fleeSpeed: 2.2,
    spawn: { cap: 2, group: 2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 14, ROJO, 8);          // cabeza
        skin.fill(28, 0, 4, 4, CUERNO, 5);         // cuerno (desplegado compartido)
        skin.fill(0, 16, 60, 28, ROJO, 8);         // cuerpo
        skin.fill(0, 44, 16, 16, ROJO, 8);         // pata
        skin.fill(0, 57, 16, 3, PEZUNA, 4);        // pezuñas (caras laterales)
        skin.fill(8, 44, 4, 4, PEZUNA, 4);         // pezuña (cara inferior)

        // manchas blancas grandes del pelaje rojo
        skin.fill(20, 21, 8, 9, BLANCO, 4);        // lomo (cara superior)
        skin.fill(2, 36, 7, 6, BLANCO, 4);         // flanco derecho (+X)
        skin.fill(38, 37, 8, 6, BLANCO, 4);        // flanco izquierdo (−X)
        skin.fill(51, 36, 7, 6, BLANCO, 4);        // anca (cara trasera)
        skin.fill(30, 16, 12, 18, VIENTRE, 6);     // vientre claro (cara inferior)
        skin.speckle(0, 34, 60, 10, 30, ROJO_OSCURO); // moteado sutil de los flancos

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

        // setas del lomo: sombrero rojo (cara superior y filas altas de los
        // lados), tallo claro (fila inferior) y láminas claras por debajo
        for (const u of [34, 44]) {
            skin.fill(u, 0, 8, 5, SOMBRERO, 6);    // base del sombrero
            skin.fill(u, 4, 8, 1, TALLO, 4);       // tallo (fila inferior de los lados)
            skin.fill(u + 4, 0, 2, 2, TALLO, 4);   // láminas (cara inferior)
        }
        // motas blancas del sombrero (desplegado de delantera y trasera)
        skin.px(36, 0, MOTA); skin.px(37, 1, MOTA);   // cara superior
        skin.px(34, 2, MOTA); skin.px(37, 3, MOTA);   // laterales
        skin.px(39, 2, MOTA); skin.px(40, 3, MOTA);
        // motas blancas del sombrero (desplegado central, patrón propio)
        skin.px(46, 1, MOTA); skin.px(47, 0, MOTA);   // cara superior
        skin.px(45, 3, MOTA); skin.px(46, 2, MOTA);   // laterales
        skin.px(50, 2, MOTA); skin.px(51, 3, MOTA);
    },

    parts: [
        { name: 'cuerpo', size: [12, 10, 18], pivot: [0, 17, 0], origin: [-6, -5, -9], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 6], pivot: [0, 19, -9], origin: [-4, -4, -6], uv: [0, 0], anim: 'head' },
        { name: 'cuerno_i', size: [1, 3, 1], pivot: [0, 19, -9], origin: [-5, 2, -4], uv: [28, 0], anim: 'head' },
        { name: 'cuerno_d', size: [1, 3, 1], pivot: [0, 19, -9], origin: [4, 2, -4], uv: [28, 0], anim: 'head' },
        // setas sobre el lomo: la cara superior del cuerpo queda a 22 px
        { name: 'seta_delantera', size: [2, 3, 2], pivot: [0, 22, -5], origin: [-1, 0, -1], uv: [34, 0] },
        { name: 'seta_central', size: [2, 3, 2], pivot: [-2, 22, 0], origin: [-1, 0, -1], uv: [44, 0] },
        { name: 'seta_trasera', size: [2, 3, 2], pivot: [2, 22, 5], origin: [-1, 0, -1], uv: [34, 0] },
        { name: 'pata_di', size: [4, 12, 4], pivot: [-4, 12, -6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 12, 4], pivot: [4, 12, -6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 12, 4], pivot: [-4, 12, 6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_td', size: [4, 12, 4], pivot: [4, 12, 6], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
    ],

    /** Voz: mugidos graves sintetizados (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 140, b: 0.6, d: 0.75, w: 'sawtooth', v: 0.25 }],
        hurt: [{ f: 215, b: 0.8, d: 0.18, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 112, b: 0.5, d: 1.0, w: 'sawtooth', v: 0.28 }],
    },
};

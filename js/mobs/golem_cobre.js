/**
 * Golem de cobre: pequeño autómata pasivo de metal oxidable (2025). Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 6×5×6   → 24×11
 *   (24,0)  cuerpo 6×6×4   → 20×10
 *   (44,0)  antena 1×3×1   → 4×4
 *   (48,0)  nariz 1×2×1    → 4×3
 *   (0,16)  brazo 2×7×2    → 8×9 (ambos brazos comparten desplegado)
 *   (10,16) pierna 2×4×2   → 8×6 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 18 px (antena en 15..18) frente a un AABB de 0.9
 * bloques (14.4 px), dentro de la tolerancia del validador.
 */

const COBRE = [184, 104, 66];           // cobre pulido
const COBRE_OSCURO = [138, 74, 46];     // juntas, remaches y sombras
const COBRE_BRILLO = [214, 142, 96];    // reflejos metálicos
const CARDENILLO = [92, 160, 120];      // vetas verdes de oxidación
const OJO = [226, 240, 234];            // ojos claros, casi blancos

export default {
    id: 'golem_cobre',
    name: 'Golem de cobre',
    hostile: false,
    aabb: { w: 0.6, h: 0.9 },
    hp: 12,
    speed: 1.6,
    spawn: { cap: 2, group: 1, block: 'ANY' },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 24, 11, COBRE, 8);          // cabeza
        skin.fill(24, 0, 20, 10, COBRE, 8);         // cuerpo
        skin.fill(44, 0, 4, 4, COBRE, 6);           // antena-pararrayos
        skin.fill(48, 0, 4, 3, COBRE_OSCURO, 4);    // nariz remache

        skin.fill(0, 16, 8, 9, COBRE, 8);           // brazo
        skin.fill(10, 16, 8, 6, COBRE, 8);          // pierna

        // vetas de cardenillo: el cobre se oxida por manchas irregulares
        skin.speckle(0, 0, 24, 11, 18, CARDENILLO);
        skin.speckle(24, 0, 20, 10, 16, CARDENILLO);
        skin.speckle(0, 16, 8, 9, 7, CARDENILLO);
        skin.speckle(10, 16, 8, 6, 5, CARDENILLO);

        // punta de la antena ya verdosa (lo primero que se oxida)
        skin.fill(44, 0, 4, 2, CARDENILLO, 6);

        // placa frontal del cuerpo remachada: rect (28,4)..(34,10)
        skin.outline(28, 4, 6, 6, COBRE_OSCURO);
        // remaches brillantes en hombros del torso
        skin.px(29, 5, COBRE_BRILLO);
        skin.px(32, 5, COBRE_BRILLO);

        // cara frontal de la cabeza: rect (6,6)..(12,11)
        skin.px(7, 7, OJO);                          // ojo izquierdo (ranura vertical)
        skin.px(7, 8, OJO);
        skin.px(10, 7, OJO);                         // ojo derecho
        skin.px(10, 8, OJO);
        // brillo del remache de la nariz: cara frontal en (49,1)..(50,3)
        skin.px(49, 1, COBRE_BRILLO);
    },

    parts: [
        { name: 'cuerpo', size: [6, 6, 4], pivot: [0, 4, 0], origin: [-3, 0, -2], uv: [24, 0] },
        { name: 'cabeza', size: [6, 5, 6], pivot: [0, 10, 0], origin: [-3, 0, -3], uv: [0, 0], anim: 'head' },
        { name: 'antena', size: [1, 3, 1], pivot: [0, 10, 0], origin: [-0.5, 5, -0.5], uv: [44, 0], anim: 'head' },
        { name: 'nariz', size: [1, 2, 1], pivot: [0, 10, 0], origin: [-0.5, 1, -4], uv: [48, 0], anim: 'head' },
        { name: 'brazo_i', size: [2, 7, 2], pivot: [-4, 10, 0], origin: [-1, -7, -1], uv: [0, 16], anim: 'arm1' },
        { name: 'brazo_d', size: [2, 7, 2], pivot: [4, 10, 0], origin: [-1, -7, -1], uv: [0, 16], anim: 'arm0' },
        { name: 'pierna_i', size: [2, 4, 2], pivot: [-1, 4, 0], origin: [-1, -4, -1], uv: [10, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [2, 4, 2], pivot: [1, 4, 0], origin: [-1, -4, -1], uv: [10, 16], anim: 'leg1' },
    ],

    /** Voz: clics metálicos secos, tono cuadrado más chasquido de ruido. */
    voice: {
        say: [
            { f: 800, b: 0.9, d: 0.05, w: 'square', v: 0.2 },
            { noise: true, f: 1500, q: 2, d: 0.04, v: 0.14, at: 0.06 },
        ],
        hurt: [
            { f: 950, b: 0.8, d: 0.06, w: 'square', v: 0.26 },
            { noise: true, f: 1800, q: 2, d: 0.04, v: 0.18, at: 0.05 },
        ],
        death: [
            { f: 800, b: 0.5, d: 0.12, w: 'square', v: 0.26 },
            { noise: true, f: 1500, q: 1.5, d: 0.08, v: 0.16, at: 0.1 },
            { f: 500, b: 0.6, d: 0.15, w: 'square', v: 0.2, at: 0.22 },
        ],
    },
};

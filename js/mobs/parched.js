/**
 * Parched: mob hostil arquero del desierto (25w44a). Esqueleto resecado por
 * el sol que mantiene la distancia y dispara flechas (behavior.projectile,
 * ver hostileAI en mobs.js), pero más lento que su primo de las cuevas
 * (cooldown 3 s). Al estar curtido por el desierto no arde al sol (noBurn).
 * El brazo derecho va extendido al frente (pose estática) sosteniendo el arco.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (0,16)  torso 8×12×4   → 24×16
 *   (24,16) brazo 2×12×2   → 8×14 (ambos brazos comparten desplegado)
 *   (32,16) pierna 2×12×2  → 8×14 (ambas piernas comparten desplegado)
 *   (40,16) arco 1×10×2 → 6×12 · (48,16) cuerda 1×8×1 → 6×10
 */

const ARENA = [200, 180, 130];        // hueso reseco color arena
const SOMBRA = [160, 140, 96];        // sombreado de articulaciones y costillas
const GRIETA = [112, 92, 58];         // líneas finas de agrietado
const CUENCA = [46, 38, 26];          // cuencas hundidas
const MADERA_SECA = [134, 100, 62];   // arco curtido por el sol
const CUERDA = [214, 204, 176];

export default {
    id: 'parched',
    name: 'Parched',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 16,
    speed: 1.7,
    noBurn: true,
    spawn: { cap: 2, group: 1, block: 'SAND' },
    behavior: { aggro: 16, projectile: true, damage: 2, cooldown: 3.0 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, ARENA, 7);          // cabeza (calavera)
        skin.fill(0, 16, 24, 16, ARENA, 7);         // torso
        skin.fill(24, 16, 8, 14, ARENA, 7);         // brazo
        skin.fill(32, 16, 8, 14, ARENA, 7);         // pierna
        skin.fill(40, 16, 6, 12, MADERA_SECA, 8);   // arco (palas curvadas)
        skin.fill(48, 16, 6, 10, CUERDA, 5);   // cuerda (pieza propia)

        // cara frontal de la calavera: rect (8,8)..(16,16)
        skin.fill(9, 9, 2, 1, SOMBRA);              // ceja hundida izquierda
        skin.fill(13, 9, 2, 1, SOMBRA);             // ceja hundida derecha
        skin.fill(9, 10, 2, 2, CUENCA);             // cuenca izquierda
        skin.fill(13, 10, 2, 2, CUENCA);            // cuenca derecha
        skin.fill(9, 12, 2, 1, SOMBRA);             // pómulos resumidos bajo las cuencas
        skin.fill(13, 12, 2, 1, SOMBRA);
        skin.px(11, 12, GRIETA);                    // fosa nasal
        skin.px(12, 12, GRIETA);
        skin.px(9, 14, SOMBRA);                     // separaciones de los dientes
        skin.px(11, 14, SOMBRA);
        skin.px(13, 14, SOMBRA);

        // grietas de resecado: líneas oscuras finas por cráneo y torso
        skin.px(12, 8, GRIETA);                     // frente, entre las cuencas
        skin.px(12, 9, GRIETA);
        skin.px(15, 11, GRIETA);                    // mejilla derecha
        skin.px(15, 12, GRIETA);
        skin.px(11, 3, GRIETA);                     // coronilla (cara superior)
        skin.px(12, 3, GRIETA);
        skin.px(12, 4, GRIETA);
        skin.px(13, 4, GRIETA);
        skin.px(3, 9, GRIETA);                      // sien izquierda (cara +X)
        skin.px(4, 10, GRIETA);
        skin.px(4, 11, GRIETA);
        skin.px(27, 9, GRIETA);                     // nuca (cara +Z)
        skin.px(27, 10, GRIETA);
        skin.px(28, 11, GRIETA);

        // costillas: franjas arena/sombra en pecho (4,20) y espalda (16,20)
        skin.stripes(4, 20, 8, 7, 1, ARENA, SOMBRA, 4);
        skin.stripes(16, 20, 8, 7, 1, ARENA, SOMBRA, 4);

        // grietas del espinazo y de la pelvis (bajo las costillas)
        skin.px(8, 28, GRIETA);
        skin.px(8, 29, GRIETA);
        skin.px(9, 30, GRIETA);
        skin.px(19, 28, GRIETA);
        skin.px(20, 29, GRIETA);
        skin.px(19, 30, GRIETA);

        // articulaciones sombreadas y grietas finas en brazos y piernas
        skin.fill(24, 24, 8, 1, SOMBRA, 4);
        skin.fill(32, 24, 8, 1, SOMBRA, 4);
        skin.px(26, 20, GRIETA);
        skin.px(27, 21, GRIETA);
        skin.px(35, 26, GRIETA);
        skin.px(34, 27, GRIETA);

        // cuerda del arco: cara trasera (+Z), mirando al arquero
        skin.fill(45, 18, 1, 8, CUERDA, 4);

        // pátina de polvo del desierto
        skin.speckle(0, 0, 32, 16, 14, SOMBRA);
        skin.speckle(0, 16, 24, 16, 10, SOMBRA);
    },

    parts: [
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'brazo_i', size: [2, 12, 2], pivot: [-5, 22, 0], origin: [-1, -10, -1], uv: [24, 16], rot: [1.4, 0, 0], anim: 'arm1' },
        // brazo derecho extendido al frente sosteniendo el arco (pose estática);
        // en este motor (Y arriba, frente −Z) rot X POSITIVA lleva la mano al frente
        { name: 'brazo_d', size: [2, 12, 2], pivot: [5, 22, 0], origin: [-1, -10, -1], uv: [24, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'arco', size: [1, 10, 2], pivot: [5, 22, 0], origin: [-0.5, -13, -3], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'cuerda', size: [1, 8, 1], pivot: [5, 22, 0], origin: [-0.5, -12, -1], uv: [48, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [2, 12, 2], pivot: [-2, 12, 0], origin: [-1, -12, -1], uv: [32, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [2, 12, 2], pivot: [2, 12, 0], origin: [-1, -12, -1], uv: [32, 16], anim: 'leg1' },
    ],

    /** Voz: traqueteo seco y polvoriento — ráfagas de ruido de banda ancha. */
    voice: {
        say: [
            { noise: true, f: 1700, q: 1.2, d: 0.05, v: 0.16, at: 0 },
            { noise: true, f: 1500, q: 1.2, d: 0.05, v: 0.15, at: 0.07 },
            { noise: true, f: 1850, q: 1.2, d: 0.05, v: 0.16, at: 0.14 },
            { noise: true, f: 1600, q: 1.0, d: 0.09, v: 0.12, at: 0.22 },
        ],
        hurt: [
            { noise: true, f: 2100, q: 1.5, d: 0.05, v: 0.22, at: 0 },
            { noise: true, f: 1800, q: 1.2, d: 0.06, v: 0.18, at: 0.06 },
        ],
        death: [
            { noise: true, f: 1900, q: 1.2, d: 0.07, v: 0.22, at: 0 },
            { noise: true, f: 1500, q: 1.1, d: 0.08, v: 0.2, at: 0.09 },
            { noise: true, f: 1100, q: 1.0, d: 0.1, v: 0.18, at: 0.2 },
            { noise: true, f: 700, q: 0.9, d: 0.16, v: 0.14, at: 0.34 },
        ],
    },
};

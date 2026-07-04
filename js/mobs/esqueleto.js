/**
 * Esqueleto: mob hostil arquero. Humanoide huesudo que mantiene la distancia
 * y dispara flechas (behavior.projectile, ver hostileAI en mobs.js). El brazo
 * derecho va extendido al frente (pose estática) sosteniendo el arco.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (0,16)  torso 8×12×4   → 24×16
 *   (24,16) brazo 2×12×2   → 8×14 (ambos brazos comparten desplegado)
 *   (32,16) pierna 2×12×2  → 8×14 (ambas piernas comparten desplegado)
 *   (40,16) arco 1×10×2 → 6×12 · (48,16) cuerda 1×8×1 → 6×10
 */

import { ITEMS } from '../items.js';

const HUESO = [208, 208, 202];
const SOMBRA = [162, 162, 154];
const COSTILLA = [128, 126, 118];
const CUENCA = [42, 40, 38];
const MADERA = [110, 80, 50];
const CUERDA = [206, 200, 186];

export default {
    id: 'esqueleto',
    name: 'Esqueleto',
    hostile: true,
    aabb: { w: 0.6, h: 1.95 },
    hp: 20,
    speed: 1.8,
    spawn: { cap: 3, group: 1 },
    // botín: huesos del propio esqueleto al desmoronarse
    drops: [{ id: ITEMS.HUESO, min: 0, max: 2 }],
    behavior: { aggro: 16, projectile: true, cooldown: 2.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, HUESO, 7);     // cabeza (calavera)
        skin.fill(0, 16, 24, 16, HUESO, 7);    // torso
        skin.fill(24, 16, 8, 14, HUESO, 7);    // brazo
        skin.fill(32, 16, 8, 14, HUESO, 7);    // pierna
        skin.fill(40, 16, 6, 12, MADERA, 8);   // arco (palas curvadas)
        skin.fill(48, 16, 6, 10, CUERDA, 5);   // cuerda (pieza propia)

        // cara frontal de la calavera: rect (8,8)..(16,16)
        skin.fill(8, 9, 8, 1, SOMBRA, 3);      // ceño hundido sobre las cuencas
        skin.fill(9, 10, 2, 2, CUENCA);        // cuenca izquierda
        skin.fill(13, 10, 2, 2, CUENCA);       // cuenca derecha
        skin.px(11, 12, [96, 92, 84]);         // nariz
        skin.px(12, 12, [96, 92, 84]);
        skin.fill(8, 13, 8, 1, SOMBRA, 3);     // línea de la mandíbula
        skin.px(9, 14, SOMBRA);                // separaciones de los dientes
        skin.px(11, 14, SOMBRA);
        skin.px(13, 14, SOMBRA);

        // costillas: barras de hueso sobre fondo hundido en pecho y espalda
        skin.stripes(4, 20, 8, 7, 1, HUESO, COSTILLA, 4);
        skin.stripes(16, 20, 8, 7, 1, HUESO, COSTILLA, 4);
        skin.fill(4, 29, 8, 2, COSTILLA, 4);   // pelvis oscura bajo las costillas

        // articulaciones sombreadas a media altura de brazos y piernas
        skin.fill(24, 24, 8, 1, SOMBRA, 4);
        skin.fill(32, 24, 8, 1, SOMBRA, 4);

        // cuerda del arco: cara trasera (+Z), mirando al arquero
        skin.fill(45, 18, 1, 8, CUERDA, 4);

        // desgaste general del cráneo
        skin.speckle(0, 0, 32, 16, 10, SOMBRA);
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

    /** Voz: traqueteo de huesos por ráfagas de ruido filtrado. */
    voice: {
        say: [
            { noise: true, f: 2200, q: 2, d: 0.06, v: 0.18, at: 0 },
            { noise: true, f: 2350, q: 2, d: 0.06, v: 0.18, at: 0.09 },
            { noise: true, f: 2100, q: 2, d: 0.06, v: 0.18, at: 0.18 },
        ],
        hurt: [
            { noise: true, f: 2600, q: 2, d: 0.05, v: 0.24, at: 0 },
            { noise: true, f: 2400, q: 2, d: 0.05, v: 0.2, at: 0.07 },
        ],
        death: [
            { noise: true, f: 2400, q: 2, d: 0.07, v: 0.24, at: 0 },
            { noise: true, f: 2000, q: 2, d: 0.07, v: 0.22, at: 0.1 },
            { noise: true, f: 1600, q: 2, d: 0.08, v: 0.2, at: 0.22 },
            { noise: true, f: 1200, q: 2, d: 0.1, v: 0.16, at: 0.36 },
        ],
    },
};

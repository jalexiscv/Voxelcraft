/**
 * Stray: mob hostil, arquero de los hielos. Variante gélida del esqueleto:
 * mismo humanoide huesudo que mantiene la distancia y dispara flechas
 * (behavior.projectile, ver hostileAI en mobs.js), pero con los huesos en
 * gris azulado y ropa harapienta gris: capucha pintada sobre la cabeza y
 * jirones colgando del torso. El brazo derecho va extendido al frente
 * (pose estática) sosteniendo el arco.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (0,16)  torso 8×12×4   → 24×16
 *   (24,16) brazo 2×12×2   → 8×14 (ambos brazos comparten desplegado)
 *   (32,16) pierna 2×12×2  → 8×14 (ambas piernas comparten desplegado)
 *   (40,16) arco 1×10×2 → 6×12 · (48,16) cuerda 1×8×1 → 6×10
 */

import { ITEMS } from '../items.js';

const HUESO = [190, 200, 210];        // gris azulado de los huesos helados
const SOMBRA = [148, 158, 170];       // sombra fría para juntas y costillas
const ROPA = [110, 120, 130];         // tela harapienta gris
const ROPA_OSCURA = [84, 93, 103];    // pliegues y desgaste de la tela
const CUENCA = [30, 34, 40];
const MADERA = [110, 80, 50];
const CUERDA = [202, 208, 216];

export default {
    id: 'stray',
    name: 'Stray',
    hostile: true,
    aabb: { w: 0.6, h: 1.95 },
    hp: 20,
    speed: 1.8,
    spawn: { cap: 2, group: 1 },
    // botín: huesos helados al desmoronarse, como todo esqueleto
    drops: [{ id: ITEMS.HUESO, min: 0, max: 2 }],
    behavior: { aggro: 16, projectile: true, damage: 3, cooldown: 2.4 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, HUESO, 7);     // cabeza (calavera)
        skin.fill(0, 16, 24, 16, HUESO, 7);    // torso
        skin.fill(24, 16, 8, 14, HUESO, 7);    // brazo
        skin.fill(32, 16, 8, 14, HUESO, 7);    // pierna
        skin.fill(40, 16, 6, 12, MADERA, 8);   // arco (palas curvadas)
        skin.fill(48, 16, 6, 10, CUERDA, 5);   // cuerda (pieza propia)

        // capucha: cubre la tapa de la cabeza, las dos primeras filas de las
        // cuatro caras laterales y cae más larga por la espalda (24,8)..(32,14)
        skin.fill(8, 0, 8, 8, ROPA, 6);        // arriba (+Y)
        skin.fill(0, 8, 32, 2, ROPA, 6);       // franja superior de +X, −Z, −X y +Z
        skin.fill(24, 8, 8, 6, ROPA, 6);       // caída trasera de la capucha
        // borde deshilachado de la capucha (picos de 1 texel bajo la franja)
        skin.px(2, 10, ROPA); skin.px(5, 10, ROPA);       // costado +X
        skin.px(8, 10, ROPA); skin.px(11, 10, ROPA); skin.px(15, 10, ROPA); // frente
        skin.px(18, 10, ROPA); skin.px(21, 10, ROPA);     // costado −X
        skin.speckle(8, 0, 8, 8, 8, ROPA_OSCURA);          // tela gastada arriba
        skin.speckle(24, 8, 8, 6, 6, ROPA_OSCURA);         // y en la caída trasera

        // cara frontal de la calavera bajo la capucha: rect (8,8)..(16,16)
        skin.fill(9, 11, 2, 2, CUENCA);        // cuenca izquierda
        skin.fill(13, 11, 2, 2, CUENCA);       // cuenca derecha
        skin.px(11, 13, SOMBRA);               // nariz
        skin.px(12, 13, SOMBRA);
        skin.px(9, 14, SOMBRA);                // separaciones de los dientes
        skin.px(11, 14, SOMBRA);
        skin.px(13, 14, SOMBRA);

        // costillas: franjas hueso/sombra en pecho (4,21) y espalda (16,21),
        // pintadas antes de la ropa para asomar entre los jirones
        skin.stripes(4, 21, 8, 7, 1, HUESO, SOMBRA, 4);
        skin.stripes(16, 21, 8, 7, 1, HUESO, SOMBRA, 4);

        // ropa harapienta del torso: banda de tela en las cuatro caras...
        skin.fill(4, 20, 8, 4, ROPA, 6);       // pecho (−Z)
        skin.fill(16, 20, 8, 4, ROPA, 6);      // espalda (+Z)
        skin.fill(0, 20, 4, 4, ROPA, 6);       // costado +X
        skin.fill(12, 20, 4, 4, ROPA, 6);      // costado −X
        // ...y jirones colgantes de largo irregular (skin.rng: determinista)
        for (let i = 0; i < 8; i++) {
            const frente = skin.rng.int(4);
            if (frente > 0) skin.fill(4 + i, 24, 1, frente, ROPA);
            const espalda = skin.rng.int(4);
            if (espalda > 0) skin.fill(16 + i, 24, 1, espalda, ROPA);
        }
        skin.speckle(4, 20, 8, 4, 5, ROPA_OSCURA);         // desgaste de la tela
        skin.speckle(16, 20, 8, 4, 5, ROPA_OSCURA);

        // hombreras de tela rasgada en los brazos (ambos comparten desplegado)
        skin.fill(24, 18, 8, 2, ROPA, 6);
        skin.px(25, 20, ROPA); skin.px(28, 20, ROPA); skin.px(31, 20, ROPA);

        // articulaciones sombreadas a media altura de brazos y piernas
        skin.fill(24, 24, 8, 1, SOMBRA, 4);
        skin.fill(32, 24, 8, 1, SOMBRA, 4);

        // cuerda del arco: cara trasera (+Z), mirando al arquero
        skin.fill(45, 18, 1, 8, CUERDA, 4);

        // escarcha y desgaste general del cráneo
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

    /** Voz: traqueteo hueco, más grave que el esqueleto (ruido filtrado). */
    voice: {
        say: [
            { noise: true, f: 1800, q: 2, d: 0.07, v: 0.18, at: 0 },
            { noise: true, f: 1900, q: 2, d: 0.07, v: 0.18, at: 0.1 },
            { noise: true, f: 1750, q: 2, d: 0.07, v: 0.18, at: 0.2 },
        ],
        hurt: [
            { noise: true, f: 2100, q: 2, d: 0.06, v: 0.24, at: 0 },
            { noise: true, f: 1950, q: 2, d: 0.06, v: 0.2, at: 0.08 },
        ],
        death: [
            { noise: true, f: 1900, q: 2, d: 0.08, v: 0.24, at: 0 },
            { noise: true, f: 1600, q: 2, d: 0.08, v: 0.22, at: 0.11 },
            { noise: true, f: 1300, q: 2, d: 0.09, v: 0.2, at: 0.23 },
            { noise: true, f: 1000, q: 2, d: 0.11, v: 0.16, at: 0.37 },
        ],
    },
};

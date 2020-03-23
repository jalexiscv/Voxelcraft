/**
 * Bogged: mob hostil, arquero del pantano. Variante musgosa del esqueleto:
 * hueso verdoso cubierto de parches de musgo y con setas rojas y pardas
 * brotando sobre la cabeza y los hombros (pintadas en la piel). Mantiene la
 * distancia y dispara flechas (behavior.projectile, ver hostileAI en mobs.js);
 * el brazo derecho va extendido al frente sosteniendo el arco. En este motor
 * el frente es −Z, por lo que la pose exige rot X POSITIVA.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (0,16)  torso 8×12×4   → 24×16
 *   (24,16) brazo 2×12×2   → 8×14 (ambos brazos comparten desplegado)
 *   (32,16) pierna 2×12×2  → 8×14 (ambas piernas comparten desplegado)
 *   (40,16) arco 1×10×2 → 6×12 · (48,16) cuerda 1×8×1 → 6×10
 */

const HUESO_MUSGOSO = [130, 150, 90];
const MUSGO = [90, 120, 60];
const SOMBRA = [102, 118, 70];
const CUENCA = [38, 46, 32];
const SETA_ROJA = [178, 52, 44];
const SETA_PARDA = [138, 98, 66];
const MOTA_CLARA = [232, 228, 214];
const MADERA = [104, 78, 48];
const CUERDA = [198, 194, 176];

export default {
    id: 'bogged',
    name: 'Bogged',
    hostile: true,
    aabb: { w: 0.6, h: 1.95 },
    hp: 16,
    speed: 1.7,
    spawn: { cap: 2, group: 1 },
    behavior: { aggro: 16, projectile: true, damage: 2, cooldown: 2.8 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, HUESO_MUSGOSO, 7);   // cabeza (calavera)
        skin.fill(0, 16, 24, 16, HUESO_MUSGOSO, 7);  // torso
        skin.fill(24, 16, 8, 14, HUESO_MUSGOSO, 7);  // brazo
        skin.fill(32, 16, 8, 14, HUESO_MUSGOSO, 7);  // pierna
        skin.fill(40, 16, 6, 12, MADERA, 8);         // arco (palas curvadas)
        skin.fill(48, 16, 6, 10, CUERDA, 5);         // cuerda (pieza propia)

        // parches de musgo repartidos por el hueso (antes de los rasgos)
        skin.fill(0, 12, 4, 3, MUSGO, 6);            // sien (cara +X de la cabeza)
        skin.fill(25, 9, 5, 4, MUSGO, 6);            // nuca (cara +Z de la cabeza)
        skin.fill(14, 14, 2, 2, MUSGO, 6);           // mejilla del frente
        skin.fill(5, 28, 3, 3, MUSGO, 6);            // vientre (frente del torso)
        skin.fill(18, 21, 4, 3, MUSGO, 6);           // espalda del torso
        skin.fill(29, 20, 3, 3, MUSGO, 6);           // antebrazo
        skin.fill(33, 25, 3, 2, MUSGO, 6);           // espinilla
        skin.speckle(0, 0, 32, 16, 18, MUSGO);       // motas por toda la calavera
        skin.speckle(0, 16, 24, 16, 14, MUSGO);      // y por el torso

        // cara frontal de la calavera: rect (8,8)..(16,16)
        skin.fill(9, 10, 2, 2, CUENCA);              // cuenca izquierda
        skin.fill(13, 10, 2, 2, CUENCA);             // cuenca derecha
        skin.px(11, 12, SOMBRA);                     // nariz
        skin.px(12, 12, SOMBRA);
        skin.px(9, 14, SOMBRA);                      // separaciones de los dientes
        skin.px(11, 14, SOMBRA);
        skin.px(13, 14, SOMBRA);

        // setas sobre la cabeza: cara superior en (8,0)..(16,8)
        skin.fill(9, 2, 3, 2, SETA_ROJA, 5);         // sombrero rojo
        skin.px(10, 2, MOTA_CLARA);                  // mota blanca del sombrero
        skin.fill(13, 5, 2, 2, SETA_PARDA, 5);       // sombrero pardo

        // setas sobre los hombros: cara superior del torso en (4,16)..(12,20)
        skin.fill(4, 17, 2, 2, SETA_PARDA, 5);       // hombro izquierdo
        skin.fill(10, 17, 2, 2, SETA_ROJA, 5);       // hombro derecho
        skin.px(10, 17, MOTA_CLARA);
        // y coronando ambos brazos: cara superior compartida en (26,16)..(28,18)
        skin.fill(26, 16, 2, 2, SETA_PARDA, 5);
        skin.px(27, 16, MOTA_CLARA);

        // costillas: franjas hueso/sombra en pecho (4,20) y espalda (16,20)
        skin.stripes(4, 20, 8, 7, 1, HUESO_MUSGOSO, SOMBRA, 4);
        skin.stripes(16, 20, 8, 7, 1, HUESO_MUSGOSO, SOMBRA, 4);

        // articulaciones sombreadas a media altura de brazos y piernas
        skin.fill(24, 24, 8, 1, SOMBRA, 4);
        skin.fill(32, 24, 8, 1, SOMBRA, 4);

        // cuerda del arco: cara trasera (+Z), mirando al arquero
        skin.fill(45, 18, 1, 8, CUERDA, 4);
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

    /** Voz: traqueteo de huesos amortiguado y grave, como bajo el lodo. */
    voice: {
        say: [
            { noise: true, f: 950, q: 1.2, d: 0.09, v: 0.16, at: 0 },
            { noise: true, f: 860, q: 1.2, d: 0.09, v: 0.15, at: 0.12 },
            { noise: true, f: 780, q: 1.2, d: 0.1, v: 0.14, at: 0.24 },
        ],
        hurt: [
            { noise: true, f: 1150, q: 1.4, d: 0.07, v: 0.22, at: 0 },
            { noise: true, f: 940, q: 1.3, d: 0.08, v: 0.18, at: 0.09 },
        ],
        death: [
            { noise: true, f: 1000, q: 1.3, d: 0.09, v: 0.22, at: 0 },
            { noise: true, f: 820, q: 1.2, d: 0.1, v: 0.2, at: 0.12 },
            { noise: true, f: 640, q: 1.1, d: 0.11, v: 0.17, at: 0.26 },
            { noise: true, f: 460, q: 1, d: 0.14, v: 0.14, at: 0.42 },
        ],
    },
};

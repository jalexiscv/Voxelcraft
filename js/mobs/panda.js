/**
 * Panda: mob neutral perezoso. Deambula despacio y solo se defiende con
 * manotazos si se le hiere. Sigue el contrato de definición de mobs (ver
 * model.js para el formato de las partes y el desplegado UV; mobs.js para
 * el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 10×8×9  → 38×17
 *   (40,0)  oreja 2×2×1    → 6×3  (ambas orejas comparten desplegado)
 *   (0,18)  cuerpo 12×10×16 → 56×26
 *   (0,44)  pata 5×7×5     → 20×12 (brazos y piernas comparten desplegado)
 *
 * Altura del modelo: 19 px (lomo en 6..16, orejas en 17..19) frente a un
 * AABB de 1.2 bloques (19.2 px), dentro de la tolerancia del validador.
 */

const BLANCO = [235, 235, 230];        // pelaje claro del brief
const BLANCO_SOMBRA = [212, 212, 205]; // mechones y sombras del pelaje
const NEGRO = [40, 40, 40];            // extremidades, orejas y manchas
const NEGRO_CLARO = [62, 62, 64];      // brillos del pelaje oscuro
const ALMOHADILLA = [88, 80, 74];      // plantas de las zarpas

export default {
    id: 'panda',
    name: 'Panda',
    hostile: false,
    aabb: { w: 1.2, h: 1.2 },
    hp: 20,
    speed: 0.9,
    spawn: { cap: 2, group: 1 },

    /** Neutral: vive a su ritmo, pero un manotazo suyo duele. */
    behavior: { neutral: true, aggro: 8, attackRange: 1.8, damage: 4, cooldown: 1.5 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 38, 17, BLANCO, 6);   // cabeza
        skin.fill(40, 0, 6, 3, NEGRO, 4);     // oreja
        skin.fill(0, 18, 56, 26, BLANCO, 6);  // cuerpo
        skin.fill(0, 44, 20, 12, NEGRO, 5);   // pata

        // cara frontal de la cabeza: rect (9,9)..(19,17)
        skin.fill(11, 11, 2, 2, NEGRO, 3);    // mancha del ojo izquierdo
        skin.fill(15, 11, 2, 2, NEGRO, 3);    // mancha del ojo derecho
        skin.px(11, 12, BLANCO);              // brillo del ojo izquierdo
        skin.px(16, 12, BLANCO);              // brillo del ojo derecho
        skin.px(13, 13, NEGRO);               // trufa
        skin.px(14, 13, NEGRO);
        skin.px(13, 15, NEGRO_CLARO);         // boca entreabierta
        skin.px(14, 15, NEGRO_CLARO);

        // banda negra de los hombros: pecho (16,34)..(28,44), franjas
        // delanteras de los costados (el frente cae a la derecha del rect),
        // arranque del lomo y del vientre
        skin.fill(16, 34, 12, 10, NEGRO, 4);  // pecho (cara frontal del cuerpo)
        skin.fill(12, 34, 4, 10, NEGRO, 4);   // costado +X, junto al pecho
        skin.fill(40, 34, 4, 10, NEGRO, 4);   // costado −X, junto al pecho
        skin.fill(16, 18, 12, 3, NEGRO, 4);   // lomo, filas delanteras
        skin.fill(28, 31, 12, 3, NEGRO, 4);   // vientre, filas delanteras

        // almohadillas: cara inferior de la pata (10,44)..(15,49)
        skin.fill(11, 45, 3, 3, ALMOHADILLA, 4);

        // pelaje revuelto: mechones en lomo, cabeza y extremidades
        skin.speckle(28, 21, 12, 13, 14, BLANCO_SOMBRA);
        skin.speckle(0, 0, 38, 17, 16, BLANCO_SOMBRA);
        skin.speckle(0, 49, 20, 7, 10, NEGRO_CLARO);
    },

    parts: [
        { name: 'cuerpo', size: [12, 10, 16], pivot: [0, 6, 0], origin: [-6, 0, -8], uv: [0, 18] },
        { name: 'cabeza', size: [10, 8, 9], pivot: [0, 13, -8], origin: [-5, -4, -7], uv: [0, 0], anim: 'head' },
        { name: 'oreja_i', size: [2, 2, 1], pivot: [0, 13, -8], origin: [-5, 4, -5], uv: [40, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 2, 1], pivot: [0, 13, -8], origin: [3, 4, -5], uv: [40, 0], anim: 'head' },
        { name: 'brazo_i', size: [5, 7, 5], pivot: [-3.5, 7, -5], origin: [-2.5, -7, -2.5], uv: [0, 44], anim: 'leg0' },
        { name: 'brazo_d', size: [5, 7, 5], pivot: [3.5, 7, -5], origin: [-2.5, -7, -2.5], uv: [0, 44], anim: 'leg1' },
        { name: 'pierna_i', size: [5, 7, 5], pivot: [-3.5, 7, 5], origin: [-2.5, -7, -2.5], uv: [0, 44], anim: 'leg1' },
        { name: 'pierna_d', size: [5, 7, 5], pivot: [3.5, 7, 5], origin: [-2.5, -7, -2.5], uv: [0, 44], anim: 'leg0' },
    ],

    /** Voz: resoplidos suaves — ruido nasal con un tono redondo de fondo. */
    voice: {
        say: [
            { noise: true, f: 400, q: 0.7, d: 0.3, v: 0.18 },
            { f: 250, b: 0.8, d: 0.25, w: 'sine', v: 0.16, at: 0.03 },
        ],
        hurt: [
            { noise: true, f: 550, q: 0.9, d: 0.16, v: 0.26 },
            { f: 320, b: 0.85, d: 0.14, w: 'sine', v: 0.2 },
        ],
        death: [
            { noise: true, f: 380, q: 0.6, d: 0.5, v: 0.24 },
            { f: 200, b: 0.35, d: 0.6, w: 'sine', v: 0.2, at: 0.08 },
        ],
    },

    /** Voces del pack local: resoplidos de ambiente, quejido y muerte. */
    sonidos: {
        say: ['mob/panda/idle'],
        hurt: ['mob/panda/hurt'],
        death: ['mob/panda/death'],
    },
};

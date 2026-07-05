/**
 * Aldeano: mob pasivo humanoide de túnica marrón, cabeza alargada y nariz
 * prominente. Sigue el contrato de definición de mobs (ver model.js para el
 * formato de las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8   → 32×18
 *   (32,0)  nariz 2×4×2     → 8×6
 *   (0,18)  torso 8×12×6    → 28×18
 *   (0,36)  brazos 10×4×4   → 28×8 (una sola caja de brazos plegados)
 *   (0,44)  pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 34 px (cabeza en 24..34) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const TUNICA = [120, 90, 60];          // marrón de la túnica
const TUNICA_OSCURA = [96, 70, 46];    // dobladillo y desgaste de la tela
const PIEL = [188, 146, 110];          // piel tostada de la cara y las manos
const PIEL_OSCURA = [150, 112, 82];    // sombra de la nariz
const PANTALON = [58, 48, 38];         // piernas oscuras bajo la túnica
const PELO = [82, 60, 40];             // pelo castaño de la coronilla
const CEJA = [64, 46, 28];             // ceja única, casi negra
const OJO_BLANCO = [242, 242, 242];
const OJO_VERDE = [58, 110, 62];       // iris verde característico

export default {
    id: 'villager',
    name: 'Aldeano',
    hostile: false,
    aabb: { w: 0.6, h: 1.9 },
    hp: 20,
    speed: 1.2,
    fleeSpeed: 2.4,
    spawn: { cap: 2, group: 2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 18, PIEL, 8);          // cabeza
        skin.fill(8, 0, 16, 8, PELO, 7);           // coronilla y nuca (arriba/abajo)
        skin.fill(32, 0, 8, 6, PIEL, 6);           // nariz
        skin.fill(0, 18, 28, 18, TUNICA, 8);       // torso (túnica)
        skin.fill(0, 36, 28, 8, TUNICA, 8);        // brazos plegados
        skin.fill(0, 44, 16, 16, PANTALON, 6);     // pierna

        // cara frontal de la cabeza: rect (8,8)..(16,18)
        for (let x = 9; x <= 14; x++) skin.px(x, 11, CEJA); // ceja única
        skin.px(9, 12, OJO_BLANCO);                // ojo izquierdo
        skin.px(10, 12, OJO_VERDE);
        skin.px(13, 12, OJO_VERDE);                // ojo derecho
        skin.px(14, 12, OJO_BLANCO);

        // nariz: fosas en la cara frontal (34,2)..(36,6)
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // túnica: dobladillo oscuro y tela desgastada
        skin.fill(0, 34, 28, 2, TUNICA_OSCURA, 4);
        skin.speckle(0, 18, 28, 16, 14, TUNICA_OSCURA);
        // manos a la vista en los extremos de los brazos plegados
        skin.fill(0, 40, 4, 4, PIEL, 6);           // mano derecha (+X)
        skin.fill(14, 40, 4, 4, PIEL, 6);          // mano izquierda (−X)
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 12, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // nariz prominente que sobresale del frente (−Z) y gira con la cabeza
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 2, -6], uv: [32, 0], anim: 'head' },
        // brazos plegados: una sola caja horizontal delante del pecho, sin balanceo
        { name: 'brazos', size: [10, 4, 4], pivot: [0, 18, 0], origin: [-5, 0, -7], uv: [0, 36], anim: 'none' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
    ],

    /** Voz: "hmm" nasal sintetizado (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 300, b: 0.8, d: 0.3, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 380, b: 0.9, d: 0.14, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 250, b: 0.4, d: 0.6, w: 'sawtooth', v: 0.28 }],
    },

    /** Voces del árbol sounds/: haggle respalda a idle; yes/no son de comercio y se omiten. */
    sonidos: {
        say: ['mob/villager/idle', 'mob/villager/haggle'],
        hurt: ['mob/villager/hit'],
        death: ['mob/villager/death'],
    },
};

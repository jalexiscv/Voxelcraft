/**
 * Comerciante errante: mob pasivo humanoide con la silueta del aldeano
 * (cabeza alta con nariz prominente y brazos plegados sobre el pecho),
 * vestido con túnica azul de adornos dorados y capa pintada a la espalda.
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8   → 32×18      (32,0)  nariz 2×4×2 → 8×6
 *   (0,18)  torso 8×12×6    → 28×18
 *   (28,18) brazo 4×8×4     → 16×12 (ambos brazos comparten desplegado)
 *   (0,36)  manos 8×4×4     → 24×8  (antebrazos cruzados sobre el pecho)
 *   (24,36) pierna 4×11×4   → 16×15 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 33 px (cabeza en 23..33) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const AZUL = [60, 80, 150];            // túnica azul (color del brief)
const AZUL_CAPA = [48, 66, 126];       // capa, un azul algo más profundo
const AZUL_OSCURO = [38, 52, 100];     // calzas bajo la túnica
const ORO = [200, 170, 80];            // adornos dorados (color del brief)
const PIEL = [205, 160, 118];          // tez curtida de tanto caminar
const PIEL_OSCURA = [166, 124, 88];    // sombras de la cara y fosas nasales
const MARRON = [88, 62, 46];           // botas de viaje
const OJO_BLANCO = [242, 242, 242];
const OJO_VERDE = [70, 118, 74];       // iris verde, marca de la casa
const CEJA = [110, 82, 54];

export default {
    id: 'wandering_trader',
    name: 'Comerciante errante',
    hostile: false,
    aabb: { w: 0.6, h: 1.9 },
    hp: 20,
    speed: 1.4,
    fleeSpeed: 2.8,
    spawn: { cap: 1, group: 1 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // cabeza encapuchada: la capucha azul cubre todo el desplegado...
        skin.fill(0, 0, 32, 18, AZUL, 6);
        // ...menos la cara, en el rect frontal (8,8)..(16,18)
        skin.fill(8, 8, 8, 10, PIEL, 7);
        skin.fill(8, 8, 8, 1, ORO);               // ribete dorado de la capucha

        // cara: cejas, ojos verdes y sombra de barbilla
        skin.fill(9, 10, 2, 1, CEJA);
        skin.fill(13, 10, 2, 1, CEJA);
        skin.px(9, 11, OJO_BLANCO);                // ojo izquierdo
        skin.px(10, 11, OJO_VERDE);
        skin.px(13, 11, OJO_VERDE);                // ojo derecho
        skin.px(14, 11, OJO_BLANCO);
        skin.fill(10, 17, 4, 1, PIEL_OSCURA);      // barbilla

        // nariz prominente; fosas en su cara frontal (34,2)..(36,6)
        skin.fill(32, 0, 8, 6, PIEL, 7);
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // torso: túnica azul con cierre y cuello dorados al frente
        skin.fill(0, 18, 28, 18, AZUL, 7);
        skin.fill(6, 24, 8, 1, ORO);               // cuello (fila alta del frente)
        skin.fill(9, 25, 2, 11, ORO);              // cierre central de la túnica
        skin.fill(0, 35, 20, 1, ORO);              // dobladillo (frente y costados)

        // capa pintada sobre la espalda: rect trasero (20,24)..(28,36)
        skin.fill(20, 24, 8, 12, AZUL_CAPA, 5);
        skin.outline(20, 24, 8, 12, ORO);
        skin.fill(23, 29, 2, 2, ORO);              // broche central de la capa

        // brazos: manga azul, puño dorado y mano de piel en el extremo
        skin.fill(28, 18, 16, 12, AZUL, 7);
        skin.fill(28, 27, 16, 1, ORO);             // puño
        skin.fill(28, 28, 16, 2, PIEL, 6);         // mano
        skin.fill(36, 18, 4, 4, PIEL, 6);          // palma (rect inferior)

        // antebrazos cruzados: manga azul con las manos entrelazadas al centro
        skin.fill(0, 36, 24, 8, AZUL, 7);
        skin.fill(6, 40, 4, 4, PIEL, 6);           // manos al frente
        skin.fill(6, 37, 4, 2, PIEL, 6);           // manos vistas desde arriba

        // piernas: calzas oscuras y botas de viaje
        skin.fill(24, 36, 16, 15, AZUL_OSCURO, 7);
        skin.fill(24, 48, 16, 3, MARRON, 5);       // botas
        skin.fill(32, 36, 4, 4, MARRON, 5);        // suela (rect inferior)
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 11, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 23, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 23, 0], origin: [-1, 3, -6], uv: [32, 0], anim: 'head' },
        // brazos plegados: cuelgan del hombro girados al frente (−Z exige
        // rot X POSITIVA en este motor) hasta encontrarse con las manos
        { name: 'brazo_i', size: [4, 8, 4], pivot: [-5, 21, 0], origin: [-2, -8, -2], uv: [28, 18], rot: [0.75, 0, 0] },
        { name: 'brazo_d', size: [4, 8, 4], pivot: [5, 21, 0], origin: [-2, -8, -2], uv: [28, 18], rot: [0.75, 0, 0] },
        { name: 'manos', size: [8, 4, 4], pivot: [0, 15, -4], origin: [-4, -2, -2], uv: [0, 36] },
        { name: 'pierna_i', size: [4, 11, 4], pivot: [-2, 11, 0], origin: [-2, -11, -2], uv: [24, 36], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 11, 4], pivot: [2, 11, 0], origin: [-2, -11, -2], uv: [24, 36], anim: 'leg1' },
    ],

    /** Voz: "hmm" nasal más agudo que el del aldeano (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 400, b: 0.85, d: 0.25, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 480, b: 0.9, d: 0.15, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 380, b: 0.4, d: 0.55, w: 'sawtooth', v: 0.28 }],
    },

    /** Voces reales del pack local (ver soundpack.js): idle/hurt/death directos. */
    sonidos: {
        say: ['mob/wandering_trader/idle'],
        hurt: ['mob/wandering_trader/hurt'],
        death: ['mob/wandering_trader/death'],
    },
};

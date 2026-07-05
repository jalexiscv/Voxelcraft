/**
 * Enderman: mob neutral larguirucho que se teletransporta al ser herido.
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8    → 32×16
 *   (32,0)  torso 8×12×4    → 24×16
 *   (0,16)  pierna 2×16×2   → 8×18 (ambas piernas comparten desplegado)
 *   (8,16)  brazo 2×14×2    → 8×16 (ambos brazos comparten desplegado)
 *
 * Altura del modelo: 36 px (pierna 16 + torso 12 + cabeza 8) frente a un
 * AABB de 2.5 bloques (40 px), dentro de la tolerancia del validador.
 */
import { ITEMS } from '../items.js';

const NEGRO = [25, 22, 30];            // cuerpo entero, casi negro
const NEGRO_PROFUNDO = [14, 12, 18];   // sombras del vacío
const OJO = [200, 80, 220];            // morado brillante
const OJO_BRILLO = [240, 160, 255];    // destello de las pupilas
const AURA = [70, 40, 90];             // motas violáceas del End

export default {
    id: 'enderman',
    name: 'Enderman',
    hostile: false,
    aabb: { w: 0.6, h: 2.5 },
    hp: 40,
    speed: 3.2,
    spawn: { cap: 2, group: 1, night: true },
    // botín: la mitad de las veces deja caer la perla que transporta
    drops: [{ id: ITEMS.PERLA, min: 0, max: 1, chance: 0.5 }],

    /** Pasivo hasta que lo hieren; entonces persigue y se teletransporta. */
    behavior: { neutral: true, aggro: 14, attackRange: 1.8, damage: 6, cooldown: 1.1, teleport: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, NEGRO, 4);       // cabeza
        skin.fill(32, 0, 24, 16, NEGRO, 4);      // torso
        skin.fill(0, 16, 8, 18, NEGRO, 3);       // pierna
        skin.fill(8, 16, 8, 16, NEGRO, 3);       // brazo

        // cara frontal de la cabeza: rect (8,8)..(16,16); ojos morados de
        // lado a lado en una fila de 2 px de alto
        skin.fill(8, 11, 8, 2, OJO);
        skin.px(9, 11, OJO_BRILLO);              // pupila izquierda
        skin.px(10, 12, OJO_BRILLO);
        skin.px(13, 11, OJO_BRILLO);             // pupila derecha
        skin.px(14, 12, OJO_BRILLO);

        // mandíbula en sombra bajo los ojos (insinúa la boca desencajada)
        skin.fill(9, 14, 6, 1, NEGRO_PROFUNDO);
        // motas violáceas: partículas del End adheridas al torso y la cabeza
        skin.speckle(36, 4, 8, 12, 6, AURA);
        skin.speckle(48, 4, 8, 12, 4, AURA);
        skin.speckle(0, 0, 32, 8, 6, AURA);
    },

    parts: [
        { name: 'torso', size: [8, 12, 4], pivot: [0, 16, 0], origin: [-4, 0, -2], uv: [32, 0] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 28, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // brazos larguísimos colgando pegados al torso, con balanceo suave
        { name: 'brazo_i', size: [2, 14, 2], pivot: [-5, 26, 0], origin: [-1, -12, -1], uv: [8, 16], anim: 'arm1' },
        { name: 'brazo_d', size: [2, 14, 2], pivot: [5, 26, 0], origin: [-1, -12, -1], uv: [8, 16], anim: 'arm0' },
        { name: 'pierna_i', size: [2, 16, 2], pivot: [-2, 16, 0], origin: [-1, -16, -1], uv: [0, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [2, 16, 2], pivot: [2, 16, 0], origin: [-1, -16, -1], uv: [0, 16], anim: 'leg1' },
    ],

    /** Voz: estática inquietante con un zumbido grave (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { noise: true, f: 400, q: 2, d: 0.3, v: 0.14 },
            { f: 100, b: 1.3, d: 0.35, w: 'sine', v: 0.2, at: 0.05 },
        ],
        hurt: [
            { noise: true, f: 900, q: 2, d: 0.12, v: 0.24 },
            { f: 160, b: 1.4, d: 0.18, w: 'sine', v: 0.24 },
        ],
        death: [
            { noise: true, f: 400, q: 1.5, d: 0.5, v: 0.2 },
            { f: 140, b: 0.35, d: 0.7, w: 'sine', v: 0.24, at: 0.1 },
            { noise: true, f: 200, q: 1, d: 0.4, v: 0.12, at: 0.35 },
        ],
    },

    /** Voces reales del pack local (mob/endermen): idle=ambiente, hit=daño. */
    sonidos: {
        say: ['mob/endermen/idle'],
        hurt: ['mob/endermen/hit'],
        death: ['mob/endermen/death'],
    },
};

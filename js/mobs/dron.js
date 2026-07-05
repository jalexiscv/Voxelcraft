/**
 * Dron guardián: mob volador ALIADO propio de la casa. Patrulla el
 * perímetro del jugador en órbita (ronda de vigía semicircular no fija,
 * con radio y altura oscilantes). Detecta amenazas con DOS radios: los
 * agresores terrestres a `guardRadius` (los persigue y ataca) y los
 * voladores hasta el triple de lejos (`airRadiusMul`), a los que va a
 * inspeccionar antes — los ronda observándolos y, si son pacíficos,
 * vuelve sin agredir; si agresivos, ataca. Ignora a los mobs de su mismo
 * tipo (los drones no se auto-vigilan). La IA `behavior.guardian`, la
 * patrulla y la inspección viven en mobs.js. No aparece de forma natural
 * (no figura en las listas de ningún bioma): nace del huevo de aparición
 * del modo creativo.
 *
 * Cuadricóptero al estilo del brief: chasis gris con capó y sensor oscuros,
 * acentos naranja y morado, cuatro brazos en X y en cada punta un buje con
 * dos palas cruzadas que GIRAN de verdad (anim 'rotor', giro continuo en Y
 * que aplica el render). Sigue el contrato de definición de mobs (ver
 * model.js; pig.js es el ejemplo canónico).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 8×3×10  → 36×13     (36,0) capó 4×1×6 → 20×7
 *   (56,0)  sensor 2×1×1   → 6×2
 *   (0,14)  brazo 1×1×5    → 12×6  (los cuatro comparten desplegado)
 *   (12,14) buje 2×2×2     → 8×4   (los cuatro comparten desplegado)
 *   (0,22)  pala transversal 8×1×1 → 18×2  (las cuatro comparten)
 *   (0,26)  pala longitudinal 1×1×8 → 18×9 (las cuatro comparten)
 *
 * Altura del modelo: 7 px (capó en 6..7) frente a un AABB de 0.5 bloques
 * (8 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const GRIS = [148, 150, 155];          // chasis de aluminio
const GRIS_OSCURO = [104, 107, 113];   // sombreado del metal
const NEGRO = [45, 46, 52];            // capó, bujes y palas
const NARANJA = [235, 130, 40];        // franja de identificación
const MORADO = [150, 60, 235];         // luz de estado

export default {
    id: 'dron',
    name: 'Dron guardián',
    hostile: false,
    aabb: { w: 1.1, h: 0.5 },
    hp: 20,
    speed: 4.5,
    flying: true,
    hover: true, // sostiene su altitud objetivo incluso planeando quieto
    // guardián: patrulla el perímetro del jugador en órbita y ataca a los
    // agresores que lo ronden. Dos radios de detección: los enemigos
    // terrestres se ven a guardRadius; los VOLADORES, hasta el triple
    // (airRadiusMul). A los voladores los inspecciona antes (inspectTime s
    // rondándolos): si son pacíficos vuelve sin agredir; si agresivos, ataca.
    behavior: {
        guardian: true, guardRadius: 16, airRadiusMul: 3,
        attackRange: 1.5, damage: 4, cooldown: 0.9,
        patrolRadius: 5, patrolSpeed: 0.7,
        inspectTime: 4, inspectCooldown: 8,
    },
    // solo por invocación (huevo del creativo): no figura en ningún bioma
    spawn: { summonOnly: true, cap: 1, group: 1 },
    // chatarra útil al ser destruido
    drops: [{ id: ITEMS.LINGOTE_HIERRO, min: 0, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 36, 13, GRIS, 5);          // cuerpo
        skin.fill(36, 0, 20, 7, NEGRO, 4);         // capó
        skin.fill(56, 0, 6, 2, NEGRO, 3);          // sensor
        skin.fill(0, 14, 12, 6, GRIS, 5);          // brazo
        skin.fill(12, 14, 8, 4, NEGRO, 4);         // buje
        skin.fill(0, 22, 18, 2, NEGRO, 4);         // pala transversal
        skin.fill(0, 26, 18, 9, NEGRO, 4);         // pala longitudinal
        skin.speckle(0, 0, 36, 13, 40, GRIS_OSCURO); // veta metálica del chasis

        // cara superior del cuerpo (10,0)..(18,10), v crece hacia atrás:
        // franja naranja en el borde delantero-izquierdo (visible junto al
        // capó, que tapa las columnas centrales) y respiraderos traseros
        skin.fill(10, 1, 2, 2, NARANJA);
        skin.fill(16, 7, 2, 1, GRIS_OSCURO);
        skin.fill(10, 7, 1, 2, GRIS_OSCURO);

        // luces de estado: morada en el flanco derecho (+X, rect (0,10)) y
        // naranja en el izquierdo (−X, rect (18,10))
        skin.fill(4, 11, 2, 1, MORADO);
        skin.fill(22, 11, 2, 1, NARANJA);

        // cara frontal (10,10)..(18,13): LEDs de a bordo
        skin.px(11, 11, NARANJA);
        skin.px(16, 11, MORADO);

        // lente morada del sensor en su cara frontal (57,1)..(59,2)
        skin.px(57, 1, MORADO);
    },

    parts: [
        { name: 'cuerpo', size: [8, 3, 10], pivot: [0, 5, 0], origin: [-4, -2, -5], uv: [0, 0] },
        { name: 'capo', size: [4, 1, 6], pivot: [0, 6, 0], origin: [-2, 0, -3], uv: [36, 0] },
        { name: 'sensor', size: [2, 1, 1], pivot: [0, 4.5, -5], origin: [-1, -0.5, -1], uv: [56, 0] },
        // brazos en X hacia las cuatro esquinas (±45° alrededor de Y)
        { name: 'brazo_fi', size: [1, 1, 5], pivot: [-3, 4.5, -3], origin: [-0.5, -0.5, -5], uv: [0, 14], rot: [0, 0.785, 0] },
        { name: 'brazo_fd', size: [1, 1, 5], pivot: [3, 4.5, -3], origin: [-0.5, -0.5, -5], uv: [0, 14], rot: [0, -0.785, 0] },
        { name: 'brazo_ti', size: [1, 1, 5], pivot: [-3, 4.5, 3], origin: [-0.5, -0.5, 0], uv: [0, 14], rot: [0, -0.785, 0] },
        { name: 'brazo_td', size: [1, 1, 5], pivot: [3, 4.5, 3], origin: [-0.5, -0.5, 0], uv: [0, 14], rot: [0, 0.785, 0] },
        // bujes de motor en las puntas (algo más juntos que la punta del brazo)
        { name: 'buje_fi', size: [2, 2, 2], pivot: [-5.5, 5, -5.5], origin: [-1, -1, -1], uv: [12, 14] },
        { name: 'buje_fd', size: [2, 2, 2], pivot: [5.5, 5, -5.5], origin: [-1, -1, -1], uv: [12, 14] },
        { name: 'buje_ti', size: [2, 2, 2], pivot: [-5.5, 5, 5.5], origin: [-1, -1, -1], uv: [12, 14] },
        { name: 'buje_td', size: [2, 2, 2], pivot: [5.5, 5, 5.5], origin: [-1, -1, -1], uv: [12, 14] },
        // hélices: dos palas finas cruzadas por rotor girando sobre el buje,
        // justo encima de él (6 px sobre el suelo, apenas por encima del capó)
        { name: 'pala_fi_x', size: [8, 1, 1], pivot: [-5.5, 6, -5.5], origin: [-4, -0.5, -0.5], uv: [0, 22], anim: 'rotor' },
        { name: 'pala_fi_z', size: [1, 1, 8], pivot: [-5.5, 6, -5.5], origin: [-0.5, -0.5, -4], uv: [0, 26], anim: 'rotor' },
        { name: 'pala_fd_x', size: [8, 1, 1], pivot: [5.5, 6, -5.5], origin: [-4, -0.5, -0.5], uv: [0, 22], anim: 'rotor' },
        { name: 'pala_fd_z', size: [1, 1, 8], pivot: [5.5, 6, -5.5], origin: [-0.5, -0.5, -4], uv: [0, 26], anim: 'rotor' },
        { name: 'pala_ti_x', size: [8, 1, 1], pivot: [-5.5, 6, 5.5], origin: [-4, -0.5, -0.5], uv: [0, 22], anim: 'rotor' },
        { name: 'pala_ti_z', size: [1, 1, 8], pivot: [-5.5, 6, 5.5], origin: [-0.5, -0.5, -4], uv: [0, 26], anim: 'rotor' },
        { name: 'pala_td_x', size: [8, 1, 1], pivot: [5.5, 6, 5.5], origin: [-4, -0.5, -0.5], uv: [0, 22], anim: 'rotor' },
        { name: 'pala_td_z', size: [1, 1, 8], pivot: [5.5, 6, 5.5], origin: [-0.5, -0.5, -4], uv: [0, 26], anim: 'rotor' },
    ],

    /** Voz: bips electrónicos de dron (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 880, b: 1.0, d: 0.08, w: 'square', v: 0.12 },
            { f: 1175, b: 1.0, d: 0.08, w: 'square', v: 0.12, at: 0.12 },
        ],
        hurt: [{ f: 620, b: 0.7, d: 0.15, w: 'square', v: 0.2 }],
        death: [{ f: 740, b: 0.25, d: 0.6, w: 'sawtooth', v: 0.2 }],
    },

    /** Prefijos del pack local (no existen en el pack vanilla: cae a voice). */
    sonidos: {
        say: ['mob/dron/idle'],
        hurt: ['mob/dron/hurt'],
        death: ['mob/dron/death'],
    },
};

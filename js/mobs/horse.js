/**
 * Caballo: mob pasivo grande y veloz. Cuadrúpedo de cuerpo largo con cuello
 * inclinado al frente-arriba, cabeza alargada, crin oscura y cola caída.
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; pig.js es el ejemplo canónico).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   cuerpo 12×12×22 → 68×34
 *   (68,0)  cabeza 6×6×10   → 32×16
 *   (68,16) cuello 6×10×8   → 28×18
 *   (0,34)  pata 4×16×4     → 16×20 (las cuatro patas comparten desplegado)
 *   (16,34) cola 2×8×2      → 8×10
 *
 * Altura del modelo: 30 px (cabeza/cuello en 24..30) frente a un AABB de
 * 1.6 bloques (25.6 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const CASTANO = [130, 84, 50];          // capa castaña
const CASTANO_OSCURO = [104, 66, 38];   // sombras del pelaje
const CASTANO_CLARO = [150, 102, 64];   // vientre más claro
const CRIN = [60, 40, 25];              // crin y cola
const CALCETIN = [225, 216, 200];       // calcetines claros de las patas
const PEZUNA = [72, 58, 46];            // cascos
const OJO = [28, 22, 18];
const OLLAR = [78, 48, 40];             // fosas nasales

export default {
    id: 'horse',
    name: 'Caballo',
    hostile: false,
    aabb: { w: 1.3, h: 1.6 },
    hp: 20,
    speed: 3.2,
    fleeSpeed: 4.2,
    spawn: { cap: 3, group: 2 },
    // botín: cuero de su capa y algo de carne, como animal grande de pradera
    drops: [{ id: ITEMS.CUERO, min: 0, max: 1 }, { id: ITEMS.CARNE_CRUDA, min: 0, max: 1 }],

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 68, 34, CASTANO, 8);       // cuerpo
        skin.fill(68, 0, 32, 16, CASTANO, 7);      // cabeza
        skin.fill(68, 16, 28, 18, CASTANO, 7);     // cuello
        skin.fill(0, 34, 16, 20, CASTANO, 7);      // pata
        skin.fill(16, 34, 8, 10, CRIN, 6);         // cola

        // pelaje: motas oscuras por el cuerpo y vientre más claro (rect
        // inferior del cuerpo en (34,0)..(46,22))
        skin.speckle(0, 0, 68, 34, 50, CASTANO_OSCURO);
        skin.fill(34, 0, 12, 22, CASTANO_CLARO, 6);

        // crin oscura a lo largo del cuello: cara trasera (+Z) del cuello en
        // (90,24)..(96,34) y mitad trasera de su cara superior (filas 20..23)
        skin.fill(90, 24, 6, 10, CRIN, 6);
        skin.fill(76, 20, 6, 4, CRIN, 6);
        // la crin continúa por la nuca: cara trasera de la cabeza y flequillo
        // en las filas traseras de su cara superior (78,7)..(84,10)
        skin.fill(94, 10, 6, 6, CRIN, 6);
        skin.fill(78, 7, 6, 3, CRIN, 5);

        // ojos: caras laterales de la cabeza, cerca del cráneo (el borde
        // izquierdo de los rects (68,10) y (84,10) es la parte trasera)
        skin.px(70, 11, OJO);
        skin.px(71, 11, OJO);
        skin.px(86, 11, OJO);
        skin.px(87, 11, OJO);

        // morro: cara frontal de la cabeza (78,10)..(84,16), banda inferior
        // más oscura con los ollares
        skin.fill(78, 13, 6, 3, CASTANO_OSCURO, 4);
        skin.px(79, 14, OLLAR);
        skin.px(82, 14, OLLAR);

        // calcetines claros y cascos: filas inferiores de las cuatro caras
        // laterales de la pata (y 50..53) y cara inferior (8,34)..(12,38)
        skin.fill(0, 50, 16, 4, CALCETIN, 4);
        skin.fill(0, 53, 16, 1, PEZUNA, 3);
        skin.fill(8, 34, 4, 4, PEZUNA, 3);
    },

    parts: [
        { name: 'cuerpo', size: [12, 12, 22], pivot: [0, 13, 0], origin: [-6, 0, -11], uv: [0, 0] },
        // cuello inclinado al frente-arriba; en este motor (+Y arriba, frente
        // −Z) una parte que apunta ARRIBA se inclina al frente con rx
        // NEGATIVO (el rx positivo se reserva a partes que cuelgan, como los
        // brazos del zombi)
        { name: 'cuello', size: [6, 10, 8], pivot: [0, 23, -9], origin: [-3, -3, -6], uv: [68, 16], rot: [-0.5, 0, 0], anim: 'head' },
        { name: 'cabeza', size: [6, 6, 10], pivot: [0, 23, -9], origin: [-3, 1, -13], uv: [68, 0], anim: 'head' },
        { name: 'pata_di', size: [4, 16, 4], pivot: [-4, 16, -7], origin: [-2, -16, -2], uv: [0, 34], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 16, 4], pivot: [4, 16, -7], origin: [-2, -16, -2], uv: [0, 34], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 16, 4], pivot: [-4, 16, 7], origin: [-2, -16, -2], uv: [0, 34], anim: 'leg1' },
        { name: 'pata_td', size: [4, 16, 4], pivot: [4, 16, 7], origin: [-2, -16, -2], uv: [0, 34], anim: 'leg0' },
        // cola caída atrás, con una leve inclinación hacia fuera
        { name: 'cola', size: [2, 8, 2], pivot: [0, 24, 10], origin: [-1, -8, -1], uv: [16, 34], rot: [-0.3, 0, 0] },
    ],

    /** Voz: relincho descendente con segunda nota corta (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 500, b: 0.55, d: 0.5, w: 'sawtooth', v: 0.24 },
            { f: 540, b: 0.7, d: 0.14, w: 'sawtooth', v: 0.18, at: 0.52 },
        ],
        hurt: [{ f: 640, b: 0.8, d: 0.16, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 460, b: 0.35, d: 0.75, w: 'sawtooth', v: 0.28 }],
    },

    /** Voces del pack local: idle = relincho ambiente; hurt usa hit (así llama el pack al daño). */
    sonidos: {
        say: ['mob/horse/idle'],
        hurt: ['mob/horse/hit'],
        death: ['mob/horse/death'],
    },
};

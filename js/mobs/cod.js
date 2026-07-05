/**
 * Bacalao: pez pasivo de aguas abiertas (aquatic: nada en el agua y aletea
 * varado, ver mobs.js). Sigue el contrato de definición de mobs (ver model.js
 * para el formato de las partes y el desplegado UV; pig.js es el ejemplo
 * canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 2×3×7       → 18×10
 *   (0,12)  cola 1×2×3         → 8×5
 *   (12,12) aleta dorsal 1×1×3 → 8×4
 *
 * Modelo: cuerpo alargado con el morro al frente (−Z), cola que pivota en la
 * popa del cuerpo y culebrea en Y (anim legY0) y aleta dorsal a media espalda.
 * Al ser aquatic no lleva patas: el cuerpo apoya en el suelo (y 0..3) y la
 * altura total del modelo es 4 px frente a un AABB de 0.35 bloques (5.6 px),
 * dentro de la tolerancia del validador. Ambas caras laterales del desplegado
 * llevan el frente en su borde derecho: el ojo se pinta simétrico junto al
 * morro en cada costado.
 */
import { ITEMS } from '../items.js';

const PARDO = [150, 130, 100];         // pardo del bacalao
const LOMO = [104, 88, 66];            // lomo oscuro
const VIENTRE = [214, 205, 182];       // vientre claro
const MOTA = [92, 78, 58];             // moteado de los flancos
const ALETA = [118, 100, 74];          // aletas algo más oscuras
const OJO = [24, 24, 32];              // pupila
const BRILLO = [235, 235, 230];        // brillo del ojo

export default {
    id: 'cod',
    name: 'Bacalao',
    hostile: false,
    aabb: { w: 0.5, h: 0.35 },
    hp: 3,
    speed: 1.8,
    fleeSpeed: 3.4,
    aquatic: true,
    spawn: { cap: 4, group: 3, water: true },
    // Botín: pez crudo 1 — el propio pescado es la pieza de pesca.
    drops: [{ id: ITEMS.PEZ_CRUDO, min: 1, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 18, 10, PARDO, 7);         // cuerpo
        skin.fill(0, 12, 8, 5, PARDO, 6);          // cola
        skin.fill(12, 12, 8, 4, ALETA, 5);         // aleta dorsal

        // lomo oscuro: cara superior (7,0)..(9,7) y fila alta de la banda
        // lateral (y 7 recorre +X, frente, −X y espalda)
        skin.fill(7, 0, 2, 7, LOMO, 5);
        skin.fill(0, 7, 18, 1, LOMO, 5);
        // vientre claro: cara inferior (9,0)..(11,7) y fila baja de la banda
        skin.fill(9, 0, 2, 7, VIENTRE, 5);
        skin.fill(0, 9, 18, 1, VIENTRE, 5);
        // moteado del bacalao por los flancos (antes de los ojos, que mandan)
        skin.speckle(0, 7, 7, 2, 5, MOTA);         // costado +X
        skin.speckle(9, 7, 7, 2, 5, MOTA);         // costado −X
        // cola: lomo y vientre continúan por el pedúnculo
        skin.fill(3, 12, 1, 3, LOMO, 4);           // cara superior de la cola
        skin.fill(4, 12, 1, 3, VIENTRE, 4);        // cara inferior de la cola

        // ojo a cada lado, pegado al morro (el frente queda en el borde
        // derecho de ambos rects laterales): pupila y brillo por detrás
        skin.px(5, 8, OJO);                        // costado +X: cols 0..6
        skin.px(4, 8, BRILLO);
        skin.px(14, 8, OJO);                       // costado −X: cols 9..15
        skin.px(13, 8, BRILLO);
    },

    parts: [
        { name: 'cuerpo', size: [2, 3, 7], pivot: [0, 1, 0], origin: [-1, -1, -4], uv: [0, 0] },
        // la cola pivota en la popa del cuerpo (z 3) y culebrea en Y
        { name: 'cola', size: [1, 2, 3], pivot: [0, 1.5, 3], origin: [-0.5, -1, 0], uv: [0, 12], anim: 'legY0' },
        { name: 'aleta_dorsal', size: [1, 1, 3], pivot: [0, 3, -0.5], origin: [-0.5, 0, -1.5], uv: [12, 12] },
    ],

    /** Voz: burbujas de ruido filtrado grave (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { noise: true, f: 800, q: 0.5, d: 0.1, v: 0.08 },
            { noise: true, f: 950, q: 0.5, d: 0.08, v: 0.06, at: 0.14 },
        ],
        hurt: [{ noise: true, f: 1200, q: 0.7, d: 0.08, v: 0.12 }],
        death: [
            { noise: true, f: 900, q: 0.6, d: 0.12, v: 0.1 },
            { noise: true, f: 650, q: 0.6, d: 0.14, v: 0.09, at: 0.12 },
            { noise: true, f: 450, q: 0.5, d: 0.2, v: 0.07, at: 0.26 },
        ],
    },

    /** Voces del pack local (mob/fish: flop1-4, hurt1-4, swim1-7). */
    sonidos: {
        say: ['mob/fish/swim'],            // ambiente acuático: chapoteo al nadar
        hurt: ['mob/fish/hurt'],
        // la carpeta no trae death: el aleteo en seco hace de estertor final
        death: ['mob/fish/flop'],
    },
};

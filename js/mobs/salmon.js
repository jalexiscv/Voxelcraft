/**
 * Salmón: pez pasivo de ríos y aguas frías (aquatic: nada en el agua y aletea
 * varado, ver mobs.js). Sigue el contrato de definición de mobs (ver model.js
 * para el formato de las partes y el desplegado UV; pig.js es el ejemplo
 * canónico del contrato y cod.js el pez de referencia).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 2×4×9         → 22×13
 *   (0,16)  cola 1×3×3           → 8×6
 *   (12,16) aleta dorsal 1×2×3   → 8×5
 *   (24,16) aleta pectoral 1×2×1 → 4×3 (ambas comparten desplegado)
 *
 * Modelo: cuerpo alargado con el morro al frente (−Z), cola que pivota en la
 * popa del cuerpo y culebrea en Y (anim legY0), aleta dorsal a media espalda
 * y dos aletas pectorales abiertas en abanico (rot Z simétrica). Al ser
 * aquatic no lleva patas: el cuerpo apoya en el suelo (y 0..4) y con la aleta
 * dorsal alcanza 6 px frente a un AABB de 0.4 bloques (6.4 px), dentro de la
 * tolerancia del validador. Ambas caras laterales del desplegado llevan el
 * frente en su borde derecho: el ojo se pinta simétrico junto al morro.
 */
import { ITEMS } from '../items.js';

const ROSADO = [190, 90, 70];          // rojo rosado del cuerpo
const LOMO = [110, 120, 90];           // lomo verde grisáceo
const VIENTRE = [222, 200, 178];       // vientre claro
const ALETA = [160, 70, 55];           // aletas y cola algo más oscuras
const MOTA = [78, 86, 64];             // moteado oscuro del lomo
const OJO = [24, 24, 32];              // pupila
const BRILLO = [235, 235, 230];        // brillo del ojo

export default {
    id: 'salmon',
    name: 'Salmón',
    hostile: false,
    aabb: { w: 0.5, h: 0.4 },
    hp: 3,
    speed: 2.0,
    fleeSpeed: 3.6,
    aquatic: true,
    spawn: { cap: 4, group: 3, water: true },
    // Botín: pez crudo 1 — el propio pescado es la pieza de pesca.
    drops: [{ id: ITEMS.PEZ_CRUDO, min: 1, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 22, 13, ROSADO, 7);        // cuerpo
        skin.fill(0, 16, 8, 6, ALETA, 6);          // cola
        skin.fill(12, 16, 8, 5, LOMO, 5);          // aleta dorsal
        skin.fill(24, 16, 4, 3, ALETA, 4);         // aleta pectoral

        // lomo verde grisáceo: cara superior (9,0)..(11,9) y fila alta de la
        // banda lateral (y 9 recorre +X, frente, −X y espalda)
        skin.fill(9, 0, 2, 9, LOMO, 5);
        skin.fill(0, 9, 22, 1, LOMO, 5);
        // vientre claro: cara inferior (11,0)..(13,9) y fila baja de la banda
        skin.fill(11, 0, 2, 9, VIENTRE, 5);
        skin.fill(0, 12, 22, 1, VIENTRE, 5);
        // moteado oscuro del lomo y de los flancos (antes de los ojos)
        skin.speckle(9, 0, 2, 9, 6, MOTA);         // cara superior
        skin.speckle(0, 10, 9, 2, 5, MOTA);        // costado +X
        skin.speckle(11, 10, 9, 2, 5, MOTA);       // costado −X
        // cola: el lomo continúa por el pedúnculo
        skin.fill(3, 16, 1, 3, LOMO, 4);           // cara superior de la cola
        skin.fill(0, 19, 8, 1, LOMO, 4);           // fila alta de su banda

        // ojo a cada lado, pegado al morro (el frente queda en el borde
        // derecho de ambos rects laterales): pupila y brillo por detrás
        skin.px(7, 10, OJO);                       // costado +X: cols 0..8
        skin.px(6, 10, BRILLO);
        skin.px(18, 10, OJO);                      // costado −X: cols 11..19
        skin.px(17, 10, BRILLO);
        // boca: fila baja de la cara frontal (9,9)..(11,13)
        skin.px(9, 12, [120, 50, 45]);
        skin.px(10, 12, [120, 50, 45]);
    },

    parts: [
        { name: 'cuerpo', size: [2, 4, 9], pivot: [0, 2, 0], origin: [-1, -2, -4.5], uv: [0, 0] },
        // la cola pivota en la popa del cuerpo (z 4.5) y culebrea en Y
        { name: 'cola', size: [1, 3, 3], pivot: [0, 2, 4.5], origin: [-0.5, -1.5, 0], uv: [0, 16], anim: 'legY0' },
        { name: 'aleta_dorsal', size: [1, 2, 3], pivot: [0, 4, 0], origin: [-0.5, 0, -1.5], uv: [12, 16] },
        // aletas pectorales en abanico simétrico (rot Z), junto al morro
        { name: 'aleta_d', size: [1, 2, 1], pivot: [1, 2, -2.5], origin: [0, -2, -0.5], uv: [24, 16], rot: [0, 0, 0.6] },
        { name: 'aleta_i', size: [1, 2, 1], pivot: [-1, 2, -2.5], origin: [-1, -2, -0.5], uv: [24, 16], rot: [0, 0, -0.6] },
    ],

    /** Voz: burbujas suaves de ruido filtrado (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { noise: true, f: 750, q: 0.6, d: 0.09, v: 0.07 },
            { noise: true, f: 900, q: 0.6, d: 0.07, v: 0.05, at: 0.13 },
        ],
        hurt: [{ noise: true, f: 1150, q: 0.7, d: 0.08, v: 0.11 }],
        death: [
            { noise: true, f: 850, q: 0.6, d: 0.12, v: 0.09 },
            { noise: true, f: 600, q: 0.55, d: 0.14, v: 0.08, at: 0.12 },
            { noise: true, f: 420, q: 0.5, d: 0.2, v: 0.06, at: 0.26 },
        ],
    },

    /** Voces del pack local (mob/fish: flop1-4, hurt1-4, swim1-7), igual que cod. */
    sonidos: {
        // sin say: los peces no vocalizan (flop/swim son movimiento, no ambiente)
        hurt: ['mob/fish/hurt'],
        // muerte canónica de los peces: reutiliza los hurt (no hay death propio)
        death: ['mob/fish/hurt'],
    },
};

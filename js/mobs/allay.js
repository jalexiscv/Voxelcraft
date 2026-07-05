/**
 * Allay: espíritu celeste pasivo que vuela (flying) y brilla en la oscuridad
 * (glow). Sin piernas: cabeza grande sobre un cuerpecito que se afina hacia
 * abajo (el afinado se pinta como sombreado en las filas inferiores) y dos
 * alas traseras en aleteo continuo flapL/flapR (ver model.js para el formato
 * de las partes y el desplegado UV; pig.js es el ejemplo canónico del
 * contrato; chicken.js, la referencia de alas).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 5×5×5 → 20×10
 *   (0,16)  cuerpo 4×5×3 → 14×8
 *   (16,16) ala 1×5×3    → 8×8 (las dos alas comparten desplegado)
 */

const CELESTE = [110, 180, 240];
const CELESTE_CLARO = [170, 215, 250];
const CELESTE_OSCURO = [70, 130, 200];
const AZUL_PELO = [66, 120, 205];
const BRILLO = [225, 248, 255];
const CIAN = [150, 225, 250];

export default {
    id: 'allay',
    name: 'Allay',
    hostile: false,
    aabb: { w: 0.35, h: 0.6 },
    hp: 10,
    speed: 2.6,
    flying: true,
    glow: true,
    spawn: { cap: 2, group: 1 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 20, 10, CELESTE, 7);           // cabeza
        skin.fill(0, 16, 14, 8, CELESTE, 7);           // cuerpo
        skin.fill(16, 16, 8, 8, CELESTE_CLARO, 5);     // ala

        // pelo azul: cara superior (5,0)..(10,5) y dos filas altas de la
        // banda lateral (0,5)..(20,7), a modo de flequillo a ras de cejas
        skin.fill(5, 0, 5, 5, AZUL_PELO, 6);
        skin.fill(0, 5, 20, 2, AZUL_PELO, 6);
        // ojos brillantes: cara frontal de la cabeza (5,5)..(10,10), fila 7,
        // con destello inferior cian en la fila 8
        skin.px(6, 7, BRILLO);                          // ojo izquierdo
        skin.px(8, 7, BRILLO);                          // ojo derecho
        skin.px(6, 8, CIAN);
        skin.px(8, 8, CIAN);

        // pecho claro: dos filas altas de la cara frontal del cuerpo (3,19)
        skin.fill(3, 19, 4, 2, CELESTE_CLARO, 5);
        // afinado: las dos filas bajas de las cuatro caras laterales y la
        // cara inferior (7,16) se oscurecen, como punta que se estrecha
        skin.fill(0, 22, 14, 2, CELESTE_OSCURO, 5);
        skin.fill(7, 16, 4, 3, CELESTE_OSCURO, 5);
        // chispas del brillo espectral sobre el torso
        skin.speckle(0, 16, 14, 6, 6, BRILLO);

        // alas: borde de salida blanquecino en las tres filas bajas
        skin.fill(16, 21, 8, 3, BRILLO, 4);
    },

    parts: [
        { name: 'cuerpo', size: [4, 5, 3], pivot: [0, 0, 0], origin: [-2, 0, -1.5], uv: [0, 16] },
        { name: 'cabeza', size: [5, 5, 5], pivot: [0, 5, 0], origin: [-2.5, 0, -2.5], uv: [0, 0], anim: 'head' },
        { name: 'ala_i', size: [1, 5, 3], pivot: [-2, 5, 0.5], origin: [-1, -5, 0], uv: [16, 16], anim: 'flapL' },
        { name: 'ala_d', size: [1, 5, 3], pivot: [2, 5, 0.5], origin: [0, -5, 0], uv: [16, 16], anim: 'flapR' },
    ],

    /** Voz: campanillas sinusoidales escalonadas (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 900, b: 1.3, d: 0.15, w: 'sine', v: 0.18 },
            { f: 900, b: 1.3, d: 0.15, w: 'sine', v: 0.16, at: 0.18 },
        ],
        hurt: [{ f: 1150, b: 0.75, d: 0.12, w: 'sine', v: 0.3 }],
        death: [{ f: 880, b: 0.35, d: 0.5, w: 'sine', v: 0.26 }],
    },

    /** Voces del árbol de sonidos (prefijos bajo sounds/, ver soundpack.js). */
    sonidos: {
        // idle casa las 8 variantes idle_with_item/idle_without_item a la vez
        // (dos prefijos separados harían que el segundo nunca sonara).
        say: ['mob/allay/idle'],
        hurt: ['mob/allay/hurt'],
        death: ['mob/allay/death'],
    },
};

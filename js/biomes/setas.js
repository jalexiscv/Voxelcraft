/**
 * Setas: el bioma rarísimo de los campos de micelio. No se selecciona por
 * clima sino por la banda de RAREZA (weird > 0.45, evaluada ANTES que las
 * ventanas climáticas; ver map.js y la tabla de documents/03-biomas.md):
 * por eso declara rare sin clima.
 *
 * Lo distingue su superficie de MYCELIUM sobre tierra, la ausencia total de
 * árboles (las setas gigantes quedan fuera de esta fase) y una flora dominada
 * por setas rojas y marrones con algo de hierba alta. Es el único bioma SIN
 * hostiles nocturnos en tierra (mobs.night vacío), fiel al santuario que es
 * en Minecraft: de día solo pasta la mooshroom, y en sus aguas viven el
 * calamar y el calamar brillante.
 */

export default {
    id: 'setas',
    name: 'Setas',

    // --- Selección: banda de rareza (w > 0.45), sin clima ---
    terrain: 'tierra',
    clima: null,
    rare: { weird: [0.45, 1.01] },

    // --- Terreno ---
    surface: { top: 'MYCELIUM', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: sin árboles (setas gigantes no); setas + hierba alta ---
    trees: null,
    cactus: null,
    flora: [
        { block: 'MUSHROOM_RED', weight: 3 },
        { block: 'MUSHROOM_BROWN', weight: 3 },
        { block: 'TALL_GRASS', weight: 2 },
    ],

    // --- Habitantes (fila «setas» de la tabla del plan) ---
    mobs: {
        day: ['mooshroom'],
        night: [], // sin hostiles: la seña de identidad del bioma
        water: ['calamar', 'calamar_brillante'],
    },
};

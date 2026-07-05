/**
 * Bosque: la masa arbolada templada del Overworld. Hierba sobre tierra como
 * la llanura, pero cubierta de robles DENSOS (chance 0.8, máx. 3 por chunk
 * de origen) con flores sueltas entre los troncos; sin hierba alta: la
 * espesura no deja pradera (ver model.js para el contrato y
 * documents/03-biomas.md para la tabla con las ventanas exactas).
 *
 * Se selecciona en la banda templada-húmeda: t ∈ [−0.10, 0.15] y
 * h ∈ [0.02, 1]. De día lo habitan los pequeños del sotobosque (gallina,
 * conejo, zorro, abeja) y el allay, que aquí vive libre (adaptación del
 * plan: no hay mansiones). De noche, además de los hostiles comunes, salen
 * vindicador, evocador y vex — la «guarnición de la mansión» convertida en
 * nocturnos exclusivos del bosque — y el zombi_aldeano. En sus ríos y
 * charcas: salmón y calamar.
 */

export default {
    id: 'bosque',
    name: 'Bosque',

    // --- Selección: tierra templada y húmeda (fila 13 de la tabla) ---
    terrain: 'tierra',
    clima: {
        temp: [-0.10, 0.15],
        humid: [0.02, 1.01],
    },
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: roble denso + flores (sin hierba alta) ---
    trees: { kind: 'roble', log: 'LOG', leaves: 'LEAVES', chance: 0.8, max: 3 },
    cactus: null,
    flora: [
        { block: 'FLOWER_YELLOW', weight: 2 },
        { block: 'FLOWER_RED', weight: 1 },
    ],

    // --- Habitantes (fila «bosque» de la tabla del plan) ---
    mobs: {
        day: ['chicken', 'rabbit', 'fox', 'bee', 'allay'],
        night: [
            'zombie', 'skeleton', 'creeper', 'spider', 'vindicator', 'evoker',
            'vex', 'zombie_villager', 'ghast',
        ],
        water: ['salmon', 'squid'],
    },
};

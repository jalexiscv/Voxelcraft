/**
 * Llanura: el bioma comodín del Overworld. Este archivo es el ejemplo
 * canónico del contrato de definición de biomas (ver model.js para el
 * formato completo; map.js decide qué columna cae en qué bioma y
 * documents/03-biomas.md recoge la tabla con las ventanas exactas).
 *
 * Es el ÚNICO def de terrain 'tierra' SIN clima Y SIN rare: cuando ninguna
 * banda de rareza ni ventana climática casa, la columna es llanura. Replica
 * el aspecto del generador v0.4.x: hierba sobre tierra, robles ralos
 * (chance 0.55, máx. 2 por chunk de origen) y flora suelta.
 */

export default {
    id: 'llanura',
    name: 'Llanura',

    // --- Selección: comodín de 'tierra' (sin banda de rareza ni clima) ---
    terrain: 'tierra',
    clima: null,
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: roble ralo + flores + hierba alta ---
    trees: { kind: 'roble', log: 'LOG', leaves: 'LEAVES', chance: 0.55, max: 2 },
    cactus: null,
    flora: [
        { block: 'TALL_GRASS', weight: 4 },
        { block: 'FLOWER_YELLOW', weight: 2 },
        { block: 'FLOWER_RED', weight: 1 },
    ],

    // --- Habitantes (fila «llanura» de la tabla del plan) ---
    mobs: {
        day: [
            'pig', 'sheep', 'cow', 'chicken', 'horse', 'donkey', 'rabbit',
            'villager', 'wandering_trader', 'bee', 'cat', 'iron_golem',
            'copper_golem', 'happy_ghast', 'sniffer',
        ],
        night: [
            'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'zombie_villager',
            'pillager', 'ravager', 'enderman', 'ghast',
        ],
        water: ['cod', 'salmon', 'squid', 'axolotl'],
    },
};

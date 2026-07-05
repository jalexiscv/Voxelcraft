/**
 * Desierto: el bioma cálido y árido del Overworld (ver model.js para el
 * formato del contrato y documents/03-biomas.md para la tabla con las
 * ventanas exactas; map.js decide qué columna cae en qué bioma).
 *
 * Ocupa la banda más calurosa y seca del clima (t∈[0.15,1], h∈[−1,−0.05]):
 * dunas de arena sobre arena, SIN árboles — solo cactus en columnas y
 * arbustos secos dispersos. De día lo recorren camellos, armadillos y
 * caravanas (comerciante, aldeano); de noche sale su fauna hostil propia
 * resecada por el sol (husk, parched, camello_husk) junto a los clásicos,
 * y no tiene mobs de agua: aquí no hay dónde nadar.
 */

export default {
    id: 'desierto',
    name: 'Desierto',

    // --- Selección: tierra cálida y seca (t∈[0.15,1], h∈[−1,−0.05]) ---
    terrain: 'tierra',
    clima: {
        temp: [0.15, 1.01],
        humid: [-1.01, -0.05],
    },
    rare: null,

    // --- Terreno: arena hasta donde alcanza la vista, sin hielo ---
    surface: { top: 'SAND', under: 'SAND' },
    congelado: false,

    // --- Vegetación: cactus y arbusto seco; sin árboles ---
    trees: null,
    cactus: { chance: 0.5 },
    flora: [
        { block: 'DEAD_BUSH', weight: 1 },
    ],

    // --- Habitantes (fila «desierto» de la tabla del plan) ---
    mobs: {
        day: ['camel', 'armadillo', 'rabbit', 'wandering_trader', 'villager'],
        night: [
            'husk', 'parched', 'skeleton', 'spider', 'camel_husk',
            'enderman', 'ghast', 'zombie_villager',
        ],
        water: [],
    },
};

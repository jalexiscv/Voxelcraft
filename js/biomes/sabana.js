/**
 * Sabana: pradera cálida y seca del Overworld, a medio camino entre el
 * desierto y la jungla en el eje de humedad (ver la tabla del plan en
 * documents/03-biomas.md; contrato en model.js y llanura.js como canónico).
 *
 * Lo distingue su vegetación: acacias ralas (ACACIA_LOG/ACACIA_LEAVES,
 * chance 0.25, máx. 1 por chunk de origen) sobre un mar de hierba alta,
 * sin flores ni cactus. De día la recorren los herbívoros de campo abierto
 * (caballos, burros, vacas, llamas...) con aldeanos y armadillos; de noche,
 * además de los hostiles comunes, patrullan saqueadores y ravagers
 * (adaptación del plan: nocturnos de llanura/sabana/taiga al no haber
 * patrullas). Sus charcas templadas solo albergan bacalao.
 */

export default {
    id: 'sabana',
    name: 'Sabana',

    // --- Selección: cálido (t∈[0.15,1]) de humedad media (h∈[-0.05,0.10]) ---
    terrain: 'tierra',
    clima: { temp: [0.15, 1.01], humid: [-0.05, 0.10] },
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: acacia rala + hierba alta (sin flores ni cactus) ---
    trees: { kind: 'acacia', log: 'ACACIA_LOG', leaves: 'ACACIA_LEAVES', chance: 0.25, max: 1 },
    cactus: null,
    flora: [
        { block: 'TALL_GRASS', weight: 6 },
    ],

    // --- Habitantes (fila «sabana» de la tabla del plan) ---
    mobs: {
        day: [
            'horse', 'donkey', 'cow', 'chicken', 'armadillo', 'llama',
            'villager',
        ],
        night: [
            'zombie', 'skeleton', 'creeper', 'spider', 'pillager', 'ravager',
            'enderman', 'ghast',
        ],
        water: ['cod'],
    },
};

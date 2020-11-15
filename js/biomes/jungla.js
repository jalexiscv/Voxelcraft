/**
 * Jungla: el bioma cálido y húmedo del Overworld (fila 8 de la tabla de
 * documents/03-biomas.md; model.js documenta el contrato completo y map.js
 * decide qué columna cae en qué bioma). Se selecciona en la ventana climática
 * t ∈ [0.15, 1] y h ∈ [0.10, 1]: el extremo más caluroso Y más húmedo del
 * mapa, frente al desierto (mismo calor, seco) y la sabana (calor intermedio).
 *
 * Lo distingue su vegetación: jungla alta DENSA (JUNGLE_LOG/JUNGLE_LEAVES,
 * chance 0.8 y máx. 3 árboles por chunk de origen, el tope del contrato) con
 * setas al pie de los troncos, donde la sombra del dosel deja crecer hongos
 * en vez de flores. Sin cactus ni hielo: aquí nunca hiela.
 *
 * Sus mobs replican la fauna selvática de Minecraft: loros, ocelotes y pandas
 * son exclusivos de la jungla; ranas y abejas prosperan en el calor húmedo,
 * el sniffer husmea entre la maleza y la gallina acompaña como pasivo común.
 * De noche salen los hostiles genéricos más la bruja (los pantanos y selvas
 * son su terreno) y el fantasma. En sus aguas cálidas viven el pez tropical,
 * el ajolote y el calamar.
 */

export default {
    id: 'jungla',
    name: 'Jungla',

    // --- Selección: tierra cálida y muy húmeda (t∈[0.15,1], h∈[0.10,1]) ---
    terrain: 'tierra',
    clima: {
        temp: [0.15, 1.01],
        humid: [0.10, 1.01],
    },
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: jungla alta densa + setas ---
    trees: { kind: 'jungla', log: 'JUNGLE_LOG', leaves: 'JUNGLE_LEAVES', chance: 0.8, max: 3 },
    cactus: null,
    flora: [
        { block: 'MUSHROOM_BROWN', weight: 2 },
        { block: 'MUSHROOM_RED', weight: 1 },
    ],

    // --- Habitantes (fila «jungla» de la tabla del plan) ---
    mobs: {
        day: ['loro', 'ocelote', 'panda', 'gallina', 'rana', 'sniffer', 'abeja'],
        night: ['zombi', 'esqueleto', 'creeper', 'arana', 'bruja', 'fantasma'],
        water: ['pez_tropical', 'ajolote', 'calamar'],
    },
};

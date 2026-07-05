/**
 * Cerezos: arboleda templada y fría del Overworld, la contraparte seca de la
 * taiga (misma ventana de temperatura, humedad baja; ver la tabla de
 * documents/03-biomas.md y el contrato en model.js). Lo distingue su copa
 * ROSA: cerezos (CHERRY_LOG/CHERRY_LEAVES) de densidad media sobre hierba
 * salpicada de flores, un bioma vistoso y apacible.
 *
 * Sus habitantes acompañan esa estampa bucólica: la abeja poliniza las
 * flores y el resto son pastadores mansos (oveja, cerdo, conejo, caballo);
 * de noche solo la ronda hostil básica, y en sus aguas frías viven el
 * salmón y el ajolote.
 */

export default {
    id: 'cerezos',
    name: 'Cerezos',

    // --- Selección: tierra templada-fría y seca (fila «cerezos» del plan) ---
    terrain: 'tierra',
    clima: {
        temp: [-0.30, -0.10],
        humid: [-1.01, 0.0],
    },
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: cerezos de copa rosa (densidad media) + flores ---
    trees: { kind: 'cerezo', log: 'CHERRY_LOG', leaves: 'CHERRY_LEAVES', chance: 0.6, max: 2 },
    cactus: null,
    flora: [
        { block: 'FLOWER_RED', weight: 3 },
        { block: 'FLOWER_YELLOW', weight: 2 },
        { block: 'TALL_GRASS', weight: 2 },
    ],

    // --- Habitantes (fila «cerezos» de la tabla del plan) ---
    mobs: {
        day: ['bee', 'sheep', 'pig', 'rabbit', 'horse'],
        night: ['zombie', 'skeleton', 'creeper', 'spider', 'ghast'],
        water: ['salmon', 'axolotl'],
    },
};

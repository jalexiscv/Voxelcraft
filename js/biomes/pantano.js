/**
 * Pantano: humedal templado y encharcado del Overworld. Ocupa la ventana
 * cálida-templada y muy húmeda de la tabla de documents/03-biomas.md
 * (t∈[0,0.15], h∈[0.20,1]): hierba sobre tierra como la llanura, pero su
 * sello son los robles bajos que asoman entre setas y la AUSENCIA de flores
 * amarillas (la hierba alta hace de relleno del suelo encharcado).
 *
 * Habitantes: de día fauna anfibia y ribereña — rana, conejo, gallina y el
 * gato (adaptación del plan: vive aquí y en llanura a falta de cabañas de
 * bruja); de noche el elenco pantanoso clásico — slime (que además de las
 * cuevas sale aquí a la superficie), bruja, bogged y ahogado — junto a los
 * hostiles comunes. En el agua turbia: calamar, pez_globo y el ahogado,
 * que acecha también sumergido.
 */

export default {
    id: 'pantano',
    name: 'Pantano',

    // --- Selección: tierra templada y muy húmeda (fila «pantano» del plan) ---
    terrain: 'tierra',
    clima: { temp: [0.0, 0.15], humid: [0.20, 1.01] },
    rare: null,

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: roble bajo entre setas; sin flores amarillas ---
    trees: { kind: 'roble', log: 'LOG', leaves: 'LEAVES', chance: 0.5, max: 2 },
    cactus: null,
    flora: [
        { block: 'TALL_GRASS', weight: 3 },
        { block: 'MUSHROOM_BROWN', weight: 2 },
        { block: 'MUSHROOM_RED', weight: 1 },
    ],

    // --- Habitantes (fila «pantano» de la tabla del plan) ---
    mobs: {
        day: ['frog', 'rabbit', 'chicken', 'cat'],
        night: ['slime', 'witch', 'bogged', 'zombie', 'drowned', 'enderman', 'ghast'],
        water: ['squid', 'pufferfish', 'drowned'],
    },
};

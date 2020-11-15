/**
 * Nevado: la tundra helada del Overworld. Ocupa la banda más fría del mapa
 * climático (t ∈ [−1, −0.30], cualquier humedad; ver la tabla del plan en
 * documents/03-biomas.md y el contrato en model.js): hierba nevada sobre
 * tierra, superficies de agua congeladas en hielo y coníferas muy ralas —
 * un paisaje casi desnudo donde apenas asoma vegetación.
 *
 * Lo distingue el frío extremo: es el único bioma de 'tierra' cuya
 * superficie base ya es SNOWY_GRASS (sin depender de topFrio) y que
 * congela el agua. Sus mobs son los adaptados al hielo: oso polar, zorro
 * y conejo de las nieves con gólems de nieve y aldeanos árticos de día;
 * de noche el stray (esqueleto glacial, solo en biomas fríos) acompaña a
 * los hostiles comunes, y en sus aguas heladas solo remonta el salmón.
 */

export default {
    id: 'nevado',
    name: 'Nevado',

    // --- Selección: banda más fría, cualquier humedad (tabla del plan) ---
    terrain: 'tierra',
    clima: {
        temp: [-1.01, -0.30],
        humid: [-1.01, 1.01],
    },
    rare: null,

    // --- Terreno: hierba nevada y agua que se hiela en superficie ---
    surface: { top: 'SNOWY_GRASS', under: 'DIRT' },
    congelado: true,

    // --- Vegetación: conífera muy rala; sin flora (paisaje desnudo) ---
    trees: { kind: 'conifera', log: 'SPRUCE_LOG', leaves: 'SPRUCE_LEAVES', chance: 0.12, max: 1 },
    cactus: null,
    flora: [],

    // --- Habitantes (fila «nevado» de la tabla del plan) ---
    mobs: {
        day: ['oso_polar', 'zorro', 'conejo', 'golem_nieve', 'aldeano'],
        night: ['stray', 'zombi', 'creeper', 'arana', 'fantasma'],
        water: ['salmon'],
    },
};

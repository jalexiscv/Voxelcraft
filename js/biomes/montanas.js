/**
 * Montañas: el bioma de las cumbres del Overworld. Es un bioma de CLASE DE
 * TERRENO (terrain 'montana', sin clima): toda columna con h >= MOUNTAIN_H
 * (48) cae aquí sin importar temperatura ni humedad (ver map.js y la tabla
 * de documents/03-biomas.md).
 *
 * Lo distingue la altitud: hierba en las laderas y, cuando la temperatura
 * local baja de -0.3, cumbres nevadas (topFrio SNOWY_GRASS). La vegetación
 * es conífera rala (abetos dispersos, chance 0.25 y máx. 1 por chunk de
 * origen) y sin flora: por encima de la línea de árboles apenas crece nada.
 *
 * Sus mobs son los escaladores y los del frío de altura: de día cabras,
 * llamas y ovejas (fauna de risco y pastos altos) más el fantasma feliz que
 * flota entre picos; de noche el stray (esqueleto helado, exclusivo de
 * biomas fríos) acompaña a los hostiles comunes. Sin lista de agua: a esta
 * altura no hay masas de agua pobladas.
 */

export default {
    id: 'montanas',
    name: 'Montañas',

    // --- Selección: clase de terreno 'montana' (h >= MOUNTAIN_H, sin clima) ---
    terrain: 'montana',
    clima: null,
    rare: null,

    // --- Terreno: hierba; cumbres nevadas si la temperatura local < -0.3 ---
    surface: { top: 'GRASS', under: 'DIRT', topFrio: 'SNOWY_GRASS' },
    congelado: false,

    // --- Vegetación: conífera rala; sin flora sobre la línea de árboles ---
    trees: { kind: 'conifera', log: 'SPRUCE_LOG', leaves: 'SPRUCE_LEAVES', chance: 0.25, max: 1 },
    cactus: null,
    flora: [],

    // --- Habitantes (fila «montanas» de la tabla del plan) ---
    mobs: {
        day: ['goat', 'llama', 'sheep', 'happy_ghast'],
        night: ['stray', 'skeleton', 'zombie', 'creeper', 'spider', 'ghast'],
        water: [],
    },
};

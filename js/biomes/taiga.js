/**
 * Taiga: el bosque boreal frío del Overworld. Ventana climática de frío
 * moderado y humedad media-alta (temp ∈ [−0.30, −0.10], humid ∈ [0, 1]),
 * a medio camino entre el nevado y el bosque templado (ver la tabla de
 * documents/03-biomas.md; model.js documenta el formato completo).
 *
 * Lo distingue el suelo de PODZOL alternado con hierba (⇄ GRASS por ruido
 * soil), coníferas DENSAS de pícea (SPRUCE_LOG/SPRUCE_LEAVES, chance 0.8,
 * máx. 3 por chunk de origen) y setas al pie de los troncos en vez de
 * flores. Sin hielo: el agua solo se congela en el bioma nevado.
 *
 * Sus mobs son la fauna boreal clásica: lobos y zorros como depredadores
 * diurnos, con conejos y gallinas de presa y aldeanos de las aldeas de
 * taiga; de noche, los hostiles comunes más el saqueador (adaptación del
 * plan: nocturno de llanura/sabana/taiga al no haber patrullas). En sus
 * ríos fríos solo remonta el salmón.
 */

export default {
    id: 'taiga',
    name: 'Taiga',

    // --- Selección: tierra fría-húmeda (fila «taiga» de la tabla) ---
    terrain: 'tierra',
    clima: {
        temp: [-0.30, -0.10],
        humid: [0.0, 1.01],
    },
    rare: null,

    // --- Terreno: podzol alternado con hierba sobre tierra ---
    surface: { top: 'PODZOL', under: 'DIRT', topAlt: 'GRASS', altChance: 0.4 },
    congelado: false,

    // --- Vegetación: conífera densa + setas (sin flores) ---
    trees: { kind: 'conifera', log: 'SPRUCE_LOG', leaves: 'SPRUCE_LEAVES', chance: 0.8, max: 3 },
    cactus: null,
    flora: [
        { block: 'MUSHROOM_BROWN', weight: 2 },
        { block: 'MUSHROOM_RED', weight: 1 },
    ],

    // --- Habitantes (fila «taiga» de la tabla del plan) ---
    mobs: {
        day: ['wolf', 'fox', 'rabbit', 'chicken', 'villager'],
        night: ['zombie', 'skeleton', 'creeper', 'spider', 'pillager', 'ghast'],
        water: ['salmon'],
    },
};

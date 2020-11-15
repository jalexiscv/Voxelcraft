/**
 * Jardín Pálido: bosque raro y desaturado del Overworld (inspirado en el
 * Pale Garden de 1.21.4). Sigue el contrato de definición de biomas (ver
 * model.js para el formato completo; map.js decide qué columna cae en qué
 * bioma y documents/03-biomas.md recoge la tabla con las ventanas exactas).
 *
 * Es uno de los dos biomas de RAREZA (junto a setas): se selecciona por la
 * banda de weird w < −0.45, evaluada ANTES de cualquier ventana climática,
 * así que no declara clima. Lo distingue el roble pálido denso
 * (PALE_LOG/PALE_LEAVES, chance 0.8, máx. 3 por chunk de origen) sobre
 * hierba corriente, y un suelo desnudo: SIN flores ni otra flora, para
 * reforzar el aspecto gris y silencioso del bosque.
 *
 * Habitantes: ninguno de día ni en el agua — el bosque está vacío y quieto,
 * lo que hace la visita aún más inquietante. De noche solo aparece el
 * creaking (exclusivo de este bioma): el árbol andante que únicamente
 * avanza cuando nadie lo mira.
 */

export default {
    id: 'palido',
    name: 'Jardín Pálido',

    // --- Selección: banda de rareza w < −0.45 (sin clima; ver map.js) ---
    terrain: 'tierra',
    clima: null,
    rare: { weird: [-1.01, -0.45] },

    // --- Terreno ---
    surface: { top: 'GRASS', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: roble pálido denso; suelo desnudo (sin flores) ---
    trees: { kind: 'roble', log: 'PALE_LOG', leaves: 'PALE_LEAVES', chance: 0.8, max: 3 },
    cactus: null,
    flora: [],

    // --- Habitantes (fila «palido» de la tabla del plan) ---
    mobs: {
        day: [],
        night: ['creaking'],
        water: [],
    },
};

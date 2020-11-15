/**
 * Contrato de definición de BIOMA (ver documents/03-biomas.md para el plan
 * completo y la tabla de los 14 biomas con sus ventanas climáticas y mobs).
 *
 * Cada bioma es un archivo de SOLO DATOS en js/biomes/<id>.js (importable en
 * Node, sin DOM), con esta forma (llanura.js es el ejemplo canónico):
 *
 *   export default {
 *     id: 'taiga',            // = nombre de archivo
 *     name: 'Taiga',          // nombre legible en español
 *
 *     // --- Selección (ver BiomeMap en map.js) ---
 *     terrain: 'tierra',      // 'tierra' | 'oceano' | 'playa' | 'montana'
 *                             //   oceano: columnas sumergidas (h+1 <= SEA_LEVEL)
 *                             //   playa:  h <= SEA_LEVEL+1
 *                             //   montana: h >= MOUNTAIN_H
 *     clima: {                // solo terrain 'tierra' (los demás lo omiten):
 *       temp:  [-0.45, -0.15],//   ventana de temperatura en [-1, 1]
 *       humid: [-0.1, 1.01],  //   ventana de humedad en [-1, 1]
 *     },
 *     rare: null,             // o { weird: [0.45, 1.01] }: banda de rareza
 *                             //   (setas y palido; se evalúa ANTES del clima)
 *
 *     // --- Terreno ---
 *     surface: {              // bloques por NOMBRE de B (blocks.js):
 *       top: 'PODZOL',        //   bloque superficial
 *       under: 'DIRT',        //   bajo la superficie (capa de suelo)
 *       topAlt: 'GRASS',      //   opcional: superficie alternativa...
 *       altChance: 0.4,       //   ...con esta probabilidad (ruido soil)
 *       topFrio: 'SNOWY_GRASS', // opcional: si clima.temp local < -0.3
 *     },
 *     congelado: false,       // true: la celda superior del agua se hiela (ICE)
 *
 *     // --- Vegetación (todo opcional / null) ---
 *     trees: {
 *       kind: 'conifera',     // 'roble'|'conifera'|'acacia'|'jungla'|'cerezo'
 *       log: 'SPRUCE_LOG',    // nombres de B
 *       leaves: 'SPRUCE_LEAVES',
 *       chance: 0.7,          // prob. de que un chunk vecino aporte árboles
 *       max: 3,               // máximo de árboles por chunk de origen (1..3)
 *     },
 *     cactus: null,           // o { chance: 0.5 }: columnas 1-3 sobre SAND
 *     flora: [                // plantas sueltas sobre la superficie:
 *       { block: 'TALL_GRASS', weight: 4 },
 *       { block: 'MUSHROOM_RED', weight: 1 },
 *     ],
 *
 *     // --- Habitantes (ids del registro de mobs) ---
 *     mobs: {
 *       day:   ['lobo', 'zorro', 'conejo'],  // hábitat land de día (no hostiles)
 *       night: ['zombi', 'esqueleto'],       // land de noche (hostiles o spawn.night)
 *       water: ['salmon'],                   // hábitat water (mobs con spawn.water)
 *     },
 *   };
 *
 * Reglas (las hace cumplir test/validate-biome.mjs):
 *  - id/name obligatorios; id = nombre de archivo, en minúsculas sin acentos.
 *  - terrain ∈ TERRAINS; si terrain='tierra' y rare=null, clima es obligatorio.
 *  - Ventanas dentro de [-1.01, 1.01] y con min < max.
 *  - Todo nombre de bloque debe existir en B; todo id de mob, en el registro.
 *  - mobs.day sin hostiles; mobs.night solo hostiles o pasivos con spawn.night;
 *    mobs.water solo mobs con spawn.water.
 *  - trees.kind ∈ TREE_KINDS; chance ∈ (0,1]; max ∈ 1..3.
 *  - Los mobs de cueva (spawn.cave) no se listan en day ni water (son
 *    globales bajo tierra); sí pueden ir en night cuando el bioma los saca
 *    a la superficie (p. ej. el slime en el pantano).
 *
 * La aparición por bioma vive en mobs.js (eligibleAt) y la generación de
 * terreno/vegetación en worldgen.js; ambos comparten BiomeMap (map.js).
 */

/** Clases de terreno válidas. */
export const TERRAINS = ['tierra', 'oceano', 'playa', 'montana'];

/** Formas de árbol que implementa worldgen.js. */
export const TREE_KINDS = ['roble', 'conifera', 'acacia', 'jungla', 'cerezo'];

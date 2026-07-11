/**
 * Contrato de definición de BIOMA (documents/03-biomas.md).
 *
 * Las definiciones NO se escriben a mano: la fuente única de verdad son los
 * .biome.json de assets/biomes/ (formato Bedrock) y `node tools/gen-biomas.mjs`
 * los traduce a js/biomes/biomes.data.js con esta forma, que es la que
 * consumen el motor de selección (map.js), worldgen, mobs, clima y aldeas:
 *
 *   {
 *     id: 'taiga',            // identifier del pack sin 'minecraft:' (inglés)
 *     name: 'Taiga',          // Title Case del id (inglés)
 *
 *     // --- Colocación (ver BiomeMap en map.js) ---
 *     terrain: 'tierra',      // 'tierra' | 'oceano' | 'playa' | 'montana'
 *                             //   (por etiquetas del pack) o null si no se
 *                             //   coloca (nether, end, ríos, legacy)
 *     zonas: [['cold', 1]],   // generate_for_climates: [zona, peso] o null
 *                             //   (null = solo alcanzable por transformación
 *                             //   o por clase: playas, montañas, setas…)
 *     hills: [['taiga_hills', 1]],   // hills_transformation o null
 *     mutate: [['taiga_mutated', 1]],// mutate_transformation o null
 *
 *     // --- Clima (minecraft:climate del pack) ---
 *     clima: { temperatura: 0.25, humedad: 0.8 }, // escala Bedrock (T: −0.5..2)
 *     congelado: false,       // T ≤ 0 o builder frozen_ocean: el agua se hiela
 *     precipitacion: 'lluvia',// 'lluvia' | 'nieve' (T < 0.15) | null (seco)
 *
 *     // --- Terreno (minecraft:surface_builder del pack) ---
 *     surface: {              // bloques por NOMBRE de B (blocks.js):
 *       top: 'GRASS',         //   top_material (nevado si T ≤ 0)
 *       under: 'DIRT',        //   mid_material
 *       topAlt: 'PODZOL',     //   opcional: surface_material_adjustments...
 *       altChance: 0.16,      //   ...con su fracción de ruido aproximada
 *       topFrio: 'SNOWY_GRASS', // opcional (montañas): si clima local < -0.3
 *     },
 *
 *     // --- Vegetación y habitantes (curación por familia de etiquetas en
 *     //     tools/gen-biomas.mjs: el pack no archiva features/spawn_rules) ---
 *     trees: { kind: 'conifera', log: 'SPRUCE_LOG', leaves: 'SPRUCE_LEAVES',
 *              chance: 0.8, max: 3 },  // o null
 *     cactus: null,           // o { chance: 0.5 } (desiertos/mesas)
 *     flora: [{ block: 'TALL_GRASS', weight: 4 }],
 *     mobs: { day: [...], night: [...], water: [...] },  // ids del registro
 *
 *     tags: ['animal', 'taiga', ...], // minecraft:tags del pack, tal cual
 *   }
 *
 * Reglas (las hace cumplir test/validate-biome.mjs sobre TODO el catálogo):
 *  - id/name obligatorios; terrain ∈ TERRAINS o null.
 *  - Todo nombre de bloque debe existir en B; todo id de mob, en el registro.
 *  - mobs.day sin hostiles; mobs.night solo hostiles o pasivos con spawn.night;
 *    mobs.water solo mobs con spawn.water; los de cueva solo en night.
 *  - trees.kind ∈ TREE_KINDS; chance ∈ (0,1]; max ∈ 1..3.
 *  - Toda transformación hills/mutate apunta a un id existente del catálogo.
 *
 * La aparición por bioma vive en mobs.js (eligibleAt) y la generación de
 * terreno/vegetación en worldgen.js; ambos comparten BiomeMap (map.js).
 */

/** Clases de terreno válidas (null aparte: catalogado sin colocación). */
export const TERRAINS = ['tierra', 'oceano', 'playa', 'montana'];

/** Formas de árbol que implementa worldgen.js. */
export const TREE_KINDS = ['roble', 'conifera', 'acacia', 'jungla', 'cerezo'];

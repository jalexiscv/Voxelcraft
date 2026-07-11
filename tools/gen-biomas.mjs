/**
 * Generador de biomas: produce js/biomes/biomes.data.js a partir de los 71
 * .biome.json de assets/biomes/ (formato Bedrock 1.21) — la FUENTE ÚNICA de
 * verdad de qué biomas existen, su clima, su superficie y su colocación.
 * Mismo patrón que tools/gen-materiales.mjs → js/materiales.data.js.
 *
 * Del pack se toman TAL CUAL:
 *   - identifier (id en inglés; el nombre legible es su Title Case),
 *   - minecraft:climate (temperature/downfall → congelado y precipitación),
 *   - minecraft:surface_builder (materiales de superficie, mapeados a B) y
 *     surface_material_adjustments (→ topAlt/altChance aproximado),
 *   - minecraft:overworld_generation_rules (zonas climáticas con peso y las
 *     transformaciones hills/mutate que colocan las variantes),
 *   - minecraft:tags (clase de terreno y familia de contenido).
 *
 * Lo que el pack NO define (sus features y spawn_rules no están archivados)
 * se cura aquí POR FAMILIA DE ETIQUETAS y se hornea en el data file:
 * vegetación (árboles/cactus/flora) y habitantes (mobs day/night/water),
 * trasladando la curación de los 14 biomas artesanales que este generador
 * reemplaza. Adaptaciones declaradas en documents/03-biomas.md.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'c:/xampp/htdocs/Minecraft';
const ORIGEN = ROOT + '/assets/biomes/';
const DESTINO = ROOT + '/js/biomes/biomes.data.js';

/* ===================== Mapa de materiales Bedrock → B ===================== */
// red_sand y netherrack no existen como bloque propio: caen a los vecinos
// más razonables (adaptación declarada; el infierno no se coloca jamás).
const MATERIAL = {
    'minecraft:grass_block': 'GRASS',
    'minecraft:dirt': 'DIRT',
    'minecraft:sand': 'SAND',
    'minecraft:red_sand': 'SAND',
    'minecraft:gravel': 'GRAVEL',
    'minecraft:stone': 'STONE',
    'minecraft:mycelium': 'MYCELIUM',
    'minecraft:podzol': 'PODZOL',
    'minecraft:snow': 'SNOW',
    'minecraft:hardened_clay': 'MAT_HARDENED_CLAY',
    'minecraft:white_terracotta': 'MAT_TERRACOTTA_WHITE',
    'minecraft:netherrack': 'STONE',
    'minecraft:soul_sand': 'MAT_SOUL_SAND',
    'minecraft:end_stone': 'STONE',
    'minecraft:ice': 'ICE',
    'minecraft:water': 'WATER',
};
const material = (m) => {
    const nombre = typeof m === 'object' && m ? m.name : m; // {name, states} → name
    if (!nombre) return null;
    if (!(nombre in MATERIAL)) throw new Error(`material sin mapear: ${nombre}`);
    return MATERIAL[nombre];
};

/* ===================== Curación por familia de etiquetas =====================
 * Vegetación y mobs de cada familia (heredados de los 14 biomas artesanales).
 * La familia de un bioma se decide por sus tags del pack, en este orden.
 */
const ARBOL = {
    roble: { kind: 'roble', log: 'LOG', leaves: 'LEAVES' },
    // tronco de abedul del paquete real; follaje verde estándar porque la
    // textura de hojas del pack es en escala de grises (el MC real la tiñe
    // por bioma y este atlas aún no tiñe) — adaptación declarada
    abedul: { kind: 'roble', log: 'MAT_BIRCH_LOG', leaves: 'LEAVES' },
    conifera: { kind: 'conifera', log: 'SPRUCE_LOG', leaves: 'SPRUCE_LEAVES' },
    acacia: { kind: 'acacia', log: 'ACACIA_LOG', leaves: 'ACACIA_LEAVES' },
    jungla: { kind: 'jungla', log: 'JUNGLE_LOG', leaves: 'JUNGLE_LEAVES' },
};
const FLORES = [
    { block: 'FLOWER_YELLOW', weight: 2 }, { block: 'FLOWER_RED', weight: 1 },
];
const SETAS_FLORA = [
    { block: 'MUSHROOM_BROWN', weight: 2 }, { block: 'MUSHROOM_RED', weight: 1 },
];

const FAMILIAS = {
    setas: {
        flora: [{ block: 'MUSHROOM_RED', weight: 3 }, { block: 'MUSHROOM_BROWN', weight: 3 }, { block: 'TALL_GRASS', weight: 2 }],
        mobs: { day: ['mooshroom'], night: [], water: ['squid', 'glow_squid'] },
    },
    mesa: {
        cactus: { chance: 0.35 },
        flora: [{ block: 'DEAD_BUSH', weight: 1 }],
        mobs: {
            day: ['camel', 'armadillo', 'rabbit', 'wandering_trader'],
            night: ['husk', 'parched', 'skeleton', 'spider', 'enderman', 'ghast'],
            water: [],
        },
    },
    desierto: {
        cactus: { chance: 0.5 },
        flora: [{ block: 'DEAD_BUSH', weight: 1 }],
        mobs: {
            day: ['camel', 'armadillo', 'rabbit', 'wandering_trader', 'villager'],
            night: ['husk', 'parched', 'skeleton', 'spider', 'camel_husk', 'enderman', 'ghast', 'zombie_villager'],
            water: [],
        },
    },
    jungla: {
        trees: { ...ARBOL.jungla, chance: 0.8, max: 3 },
        flora: SETAS_FLORA,
        mobs: {
            day: ['parrot', 'ocelot', 'panda', 'chicken', 'frog', 'sniffer', 'bee'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'ghast'],
            water: ['tropical_fish', 'axolotl', 'squid'],
        },
    },
    taiga: {
        trees: { ...ARBOL.conifera, chance: 0.8, max: 3 },
        flora: SETAS_FLORA,
        mobs: {
            day: ['wolf', 'fox', 'rabbit', 'chicken', 'villager'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'pillager', 'ghast'],
            water: ['salmon'],
        },
    },
    abedul: {
        trees: { ...ARBOL.abedul, chance: 0.8, max: 3 },
        flora: FLORES,
        mobs: {
            day: ['chicken', 'rabbit', 'fox', 'bee', 'allay'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'vindicator', 'evoker', 'vex', 'zombie_villager', 'ghast'],
            water: ['salmon', 'squid'],
        },
    },
    bosque: {
        trees: { ...ARBOL.roble, chance: 0.8, max: 3 },
        flora: FLORES,
        mobs: {
            day: ['chicken', 'rabbit', 'fox', 'bee', 'allay'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'vindicator', 'evoker', 'vex', 'zombie_villager', 'ghast'],
            water: ['salmon', 'squid'],
        },
    },
    pantano: {
        trees: { ...ARBOL.roble, chance: 0.5, max: 2 },
        flora: [{ block: 'TALL_GRASS', weight: 3 }, { block: 'MUSHROOM_BROWN', weight: 2 }, { block: 'MUSHROOM_RED', weight: 1 }],
        mobs: {
            day: ['frog', 'rabbit', 'chicken', 'cat'],
            night: ['slime', 'witch', 'bogged', 'zombie', 'drowned', 'enderman', 'ghast'],
            water: ['squid', 'pufferfish', 'drowned'],
        },
    },
    sabana: {
        trees: { ...ARBOL.acacia, chance: 0.25, max: 1 },
        flora: [{ block: 'TALL_GRASS', weight: 6 }],
        mobs: {
            day: ['horse', 'donkey', 'cow', 'chicken', 'armadillo', 'llama', 'villager'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'pillager', 'ravager', 'enderman', 'ghast'],
            water: ['cod'],
        },
    },
    llanura: {
        trees: { ...ARBOL.roble, chance: 0.55, max: 2 },
        flora: [{ block: 'TALL_GRASS', weight: 4 }, { block: 'FLOWER_YELLOW', weight: 2 }, { block: 'FLOWER_RED', weight: 1 }],
        mobs: {
            day: ['pig', 'sheep', 'cow', 'chicken', 'horse', 'donkey', 'rabbit', 'villager', 'wandering_trader', 'bee', 'cat', 'iron_golem', 'copper_golem', 'happy_ghast', 'sniffer'],
            night: ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'zombie_villager', 'pillager', 'ravager', 'enderman', 'ghast'],
            water: ['cod', 'salmon', 'squid', 'axolotl'],
        },
    },
    montanas: {
        trees: { ...ARBOL.conifera, chance: 0.25, max: 1 },
        mobs: {
            day: ['goat', 'llama', 'sheep', 'happy_ghast'],
            night: ['stray', 'skeleton', 'zombie', 'creeper', 'spider', 'ghast'],
            water: [],
        },
    },
    nevado: {
        trees: { ...ARBOL.conifera, chance: 0.12, max: 1 },
        mobs: {
            day: ['polar_bear', 'fox', 'rabbit', 'snow_golem', 'villager'],
            night: ['stray', 'zombie', 'creeper', 'spider', 'ghast'],
            water: ['salmon'],
        },
    },
    playa: {
        mobs: {
            day: ['turtle', 'rabbit'],
            night: ['zombie', 'skeleton', 'drowned', 'ghast'],
            water: ['cod', 'tropical_fish', 'dolphin', 'pufferfish'],
        },
    },
    oceano: {
        mobs: {
            day: [], night: [],
            water: ['cod', 'salmon', 'tropical_fish', 'pufferfish', 'squid', 'glow_squid', 'dolphin', 'nautilus', 'drowned', 'zombie_nautilus', 'guardian'],
        },
    },
    oceano_frio: {
        mobs: {
            day: [], night: [],
            water: ['cod', 'salmon', 'squid', 'glow_squid', 'drowned', 'zombie_nautilus', 'guardian'],
        },
    },
    rio: {
        mobs: { day: [], night: [], water: ['salmon', 'squid', 'drowned'] },
    },
    yermo: { mobs: { day: [], night: [], water: [] } }, // nether/end/legacy: catálogo sin contenido
};

/** Familia de contenido por etiquetas del pack (primer casamiento gana). */
function familiaDe(id, tags) {
    const t = (x) => tags.includes(x);
    if (t('nether') || t('the_end') || t('legacy')) return 'yermo';
    if (t('mooshroom_island')) return 'setas';
    if (t('mesa')) return 'mesa';
    if (t('desert')) return 'desierto';
    if (t('jungle') || t('bamboo')) return 'jungla';
    if (t('taiga')) return 'taiga';
    if (t('birch')) return 'abedul';
    if (t('forest')) return 'bosque';
    if (t('swamp')) return 'pantano';
    if (t('savanna')) return 'sabana';
    if (t('plains')) return 'llanura';
    if (t('extreme_hills') || t('mountain')) return 'montanas';
    if (t('river')) return 'rio';
    if (t('beach') || t('shore')) return 'playa';
    if (t('ocean')) return (t('frozen') || t('cold')) ? 'oceano_frio' : 'oceano';
    if (t('ice') || t('frozen')) return 'nevado';
    return 'llanura';
}

/** Ajustes puntuales por id exacto (densidades y variantes de la curación). */
const AJUSTES = {
    mega_taiga: { trees: { ...ARBOL.conifera, chance: 0.9, max: 3 } },
    mega_taiga_hills: { trees: { ...ARBOL.conifera, chance: 0.9, max: 3 } },
    redwood_taiga_mutated: { trees: { ...ARBOL.conifera, chance: 0.9, max: 3 } },
    redwood_taiga_hills_mutated: { trees: { ...ARBOL.conifera, chance: 0.9, max: 3 } },
    // el jardín pálido no existe en el pack: el creaking se muda a su
    // pariente temático, el bosque oscuro (techado y sombrío)
    roofed_forest: {
        trees: { ...ARBOL.roble, chance: 0.95, max: 3 },
        mobs: { night: [...FAMILIAS.bosque.mobs.night, 'creaking'] },
    },
    roofed_forest_mutated: {
        trees: { ...ARBOL.roble, chance: 0.95, max: 3 },
        mobs: { night: [...FAMILIAS.bosque.mobs.night, 'creaking'] },
    },
    flower_forest: { flora: [{ block: 'FLOWER_RED', weight: 3 }, { block: 'FLOWER_YELLOW', weight: 3 }, { block: 'TALL_GRASS', weight: 1 }] },
    sunflower_plains: { flora: [{ block: 'FLOWER_YELLOW', weight: 4 }, { block: 'FLOWER_RED', weight: 1 }, { block: 'TALL_GRASS', weight: 2 }] },
    extreme_hills_plus_trees: { trees: { ...ARBOL.conifera, chance: 0.6, max: 2 } },
    extreme_hills_plus_trees_mutated: { trees: { ...ARBOL.conifera, chance: 0.6, max: 2 } },
    ice_plains_spikes: { trees: null },
    jungle_edge: { trees: { ...ARBOL.jungla, chance: 0.4, max: 1 } },
    jungle_edge_mutated: { trees: { ...ARBOL.jungla, chance: 0.4, max: 1 } },
};

/* ===================== Traducción de cada .biome.json ===================== */

const aTitulo = (id) => id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** Clase de terreno por etiquetas (dónde puede colocarlo el motor). */
function terrenoDe(tags) {
    const t = (x) => tags.includes(x);
    if (t('nether') || t('the_end')) return null;
    if (t('ocean')) return 'oceano';
    if (t('beach') || t('shore')) return 'playa';
    if (t('extreme_hills') || t('mountain')) return 'montana';
    if (t('river')) return null; // sin trazado de ríos: catalogado, no colocado
    return 'tierra';
}

const biomas = [];
for (const archivo of readdirSync(ORIGEN).sort()) {
    if (!archivo.endsWith('.biome.json')) continue;
    const json = JSON.parse(readFileSync(ORIGEN + archivo, 'utf8'));
    const raiz = json['minecraft:biome'];
    const comp = raiz.components;
    const id = raiz.description.identifier.replace('minecraft:', '');
    if (id !== archivo.replace('.biome.json', '')) {
        throw new Error(`identifier ${id} ≠ nombre de archivo ${archivo}`);
    }
    const tags = (comp['minecraft:tags'] || {}).tags || [];
    const clima = comp['minecraft:climate'] || {};
    const T = clima.temperature ?? 0.5;
    const lluvia = clima.downfall ?? 0.5;
    const builder = (comp['minecraft:surface_builder'] || {}).builder || {};
    const reglas = comp['minecraft:overworld_generation_rules'] || {};

    // superficie: materiales del builder; en biomas helados la hierba nace
    // nevada (T ≤ 0 en la escala Bedrock: 0.0 = congelado)
    let top = material(builder.top_material) || 'GRASS';
    const under = material(builder.mid_material) || 'DIRT';
    if (top === 'GRASS' && T <= 0.0) top = 'SNOWY_GRASS';
    const surface = { top, under };
    // ajustes por ruido del pack (piedra en cerros, podzol en la megataiga…):
    // el ajuste de noise_range MÁS ANCHO con top_material propio pasa a
    // topAlt, con altChance aproximado a la fracción de [-1,1] que cubre
    const ajustes = (comp['minecraft:surface_material_adjustments'] || {}).adjustments || [];
    let mejorAncho = 0;
    for (const a of ajustes) {
        const alt = material((a.materials || {}).top_material);
        // un ajuste cuyo material mapeado coincide con top o under no aporta
        // variante visible (la traducción lo degradó): se descarta
        if (!alt || alt === top || alt === under || a.height_range) continue;
        const [r0, r1] = a.noise_range || [-1, 1];
        if (r1 - r0 <= mejorAncho) continue;
        mejorAncho = r1 - r0;
        surface.topAlt = alt;
        surface.altChance = Math.min(0.6, Math.max(0.1, (r1 - r0) / 2));
    }
    // el frío local de las cumbres las cubre de nieve (familia de montaña)
    if (terrenoDe(tags) === 'montana' && top === 'GRASS') surface.topFrio = 'SNOWY_GRASS';

    // transformaciones del pack: "id" | "idA, peso, idB, peso" (con o sin
    // el prefijo minecraft:); se normalizan a pares [id, peso]
    const transformacion = (valor) => {
        if (!valor) return null;
        const partes = String(valor).split(',').map((s) => s.trim().replace('minecraft:', ''));
        const pares = [];
        for (let i = 0; i < partes.length;) {
            const idT = partes[i++];
            const peso = /^[0-9]+$/.test(partes[i]) ? parseInt(partes[i++], 10) : 1;
            pares.push([idT, peso]);
        }
        return pares;
    };

    // vegetación y habitantes: curación por familia de etiquetas (los
    // spawn_rules y features del pack no están archivados; las familias
    // sin noche hostil —setas, ríos, yermos— ya la traen vacía)
    const familia = FAMILIAS[familiaDe(id, tags)];
    const extra = AJUSTES[id] || {};
    const mobs = {
        day: [...(extra.mobs?.day ?? familia.mobs.day)],
        night: [...(extra.mobs?.night ?? familia.mobs.night)],
        water: [...(extra.mobs?.water ?? familia.mobs.water)],
    };

    biomas.push({
        id,
        name: aTitulo(id),
        terrain: terrenoDe(tags),
        // zonas climáticas con peso (generate_for_climates) — la colocación base
        zonas: reglas.generate_for_climates?.length
            ? reglas.generate_for_climates.map(([zona, peso]) => [zona, peso]) : null,
        hills: transformacion(reglas.hills_transformation),
        mutate: transformacion(reglas.mutate_transformation),
        clima: { temperatura: T, humedad: lluvia },
        congelado: builder.type === 'minecraft:frozen_ocean' || T <= 0.0,
        precipitacion: lluvia <= 0 ? null : (T < 0.15 ? 'nieve' : 'lluvia'),
        surface,
        trees: 'trees' in extra ? extra.trees : (familia.trees ? { ...familia.trees } : null),
        cactus: familia.cactus ? { ...familia.cactus } : null,
        flora: [...(extra.flora ?? familia.flora ?? [])],
        mobs,
        tags,
    });
}

/* ===================== Volcado ===================== */

const cuerpo = biomas.map((b) => '    ' + JSON.stringify(b)).join(',\n');
writeFileSync(DESTINO, `/**
 * Biomas del juego GENERADOS desde el paquete real (assets/biomes/*.biome.json).
 * NO editar a mano: regenerar con \`node tools/gen-biomas.mjs\`.
 *
 * Cada entrada conserva la forma que consume el motor (js/biomes/map.js,
 * worldgen, mobs, clima, aldeas): id/name en inglés, clase de terreno,
 * zonas climáticas con peso y transformaciones hills/mutate del pack,
 * superficie mapeada a bloques de B, y la vegetación y mobs curados por
 * familia de etiquetas en tools/gen-biomas.mjs.
 *
 * ${biomas.length} biomas · generado sin fecha (determinista)
 */
export const BIOMAS = [
${cuerpo},
];
`);
console.log(`${biomas.length} biomas → ${DESTINO}`);

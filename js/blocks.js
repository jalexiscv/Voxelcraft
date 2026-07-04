/**
 * Registro de tipos de bloque: la única fuente de verdad sobre qué es cada id
 * (colisión, opacidad, texturas del atlas, sonido, si aparece en el selector).
 *
 * El mundo almacena un byte por celda con estos ids; añadir un bloque nuevo
 * es añadir una entrada aquí y su tésela en atlas.js.
 */
import { TILE } from './atlas.js';

export const B = {
    AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, COBBLE: 4, PLANKS: 5, SAPLING: 6,
    BEDROCK: 7, WATER: 8, LAVA: 9, SAND: 10, GRAVEL: 11,
    GOLD_ORE: 12, IRON_ORE: 13, COAL_ORE: 14, LOG: 15, LEAVES: 16,
    SPONGE: 17, GLASS: 18, GOLD_BLOCK: 19, BRICKS: 20, MOSSY_COBBLE: 21,
    OBSIDIAN: 22, BOOKSHELF: 23,
    FLOWER_YELLOW: 24, FLOWER_RED: 25, MUSHROOM_BROWN: 26, MUSHROOM_RED: 27,
    WOOL0: 28, // 28..43 = 16 colores de lana
    // Bloques del plan de biomas (documents/03-biomas.md, ids fijos 44..61)
    SNOW: 44, SNOWY_GRASS: 45, ICE: 46,
    SPRUCE_LOG: 47, SPRUCE_LEAVES: 48, JUNGLE_LOG: 49, JUNGLE_LEAVES: 50,
    ACACIA_LOG: 51, ACACIA_LEAVES: 52, CHERRY_LOG: 53, CHERRY_LEAVES: 54,
    PALE_LOG: 55, PALE_LEAVES: 56,
    CACTUS: 57, MYCELIUM: 58, PODZOL: 59, DEAD_BUSH: 60, TALL_GRASS: 61,
};

/**
 * Dureza por familia de material (nº de golpes a mano para romper) y
 * herramienta que lo acelera. El sonido del bloque ya codifica su familia,
 * así que sirve de valor por defecto; cada def puede sobrescribirlo.
 */
const DUREZA_POR_SONIDO = { stone: 5, wood: 3, grass: 2, sand: 2, gravel: 2, cloth: 1, none: 1 };
const HERRAMIENTA_POR_SONIDO = { stone: 'pico', wood: 'hacha', grass: 'pala', sand: 'pala', gravel: 'pala', cloth: 'pala' };

/**
 * Crea una definición de bloque con valores por defecto sensatos.
 * top/side/bottom son índices de tésela del atlas (side se usa como defecto).
 */
function def(name, side, opts = {}) {
    const sound = opts.sound || 'stone';
    return {
        name,
        top: opts.top !== undefined ? opts.top : side,
        side,
        bottom: opts.bottom !== undefined ? opts.bottom : (opts.top !== undefined ? opts.top : side),
        solid: opts.solid !== undefined ? opts.solid : true,      // colisiona con el jugador
        opaque: opts.opaque !== undefined ? opts.opaque : true,   // oculta caras vecinas y bloquea luz solar
        liquid: opts.liquid || false,
        cross: opts.cross || false,       // se dibuja como dos quads en X (plantas)
        hideSame: opts.hideSame || false, // no dibujar caras entre bloques del mismo id
        bright: opts.bright || false,     // emite luz propia (lava)
        sound,
        breakable: opts.breakable !== undefined ? opts.breakable : true,
        placeable: opts.placeable !== undefined ? opts.placeable : true,
        hardness: opts.hardness !== undefined ? opts.hardness : (DUREZA_POR_SONIDO[sound] || 2),
        tool: opts.tool !== undefined ? opts.tool : (HERRAMIENTA_POR_SONIDO[sound] || null),
    };
}

const plant = (name, tile, sound = 'grass') =>
    def(name, tile, { solid: false, opaque: false, cross: true, sound, hardness: 1, tool: null });

/** Definiciones indexadas por id de bloque. */
export const DEFS = [];
DEFS[B.AIR]          = def('Aire', 0, { solid: false, opaque: false, breakable: false, placeable: false });
DEFS[B.STONE]        = def('Roca', TILE.STONE);
DEFS[B.GRASS]        = def('Hierba', TILE.GRASS_SIDE, { top: TILE.GRASS_TOP, bottom: TILE.DIRT, sound: 'grass' });
DEFS[B.DIRT]         = def('Tierra', TILE.DIRT, { sound: 'grass' });
DEFS[B.COBBLE]       = def('Adoquín', TILE.COBBLE);
DEFS[B.PLANKS]       = def('Tablones', TILE.PLANKS, { sound: 'wood' });
DEFS[B.SAPLING]      = plant('Retoño', TILE.SAPLING);
DEFS[B.BEDROCK]      = def('Lecho de roca', TILE.BEDROCK, { breakable: false, placeable: false });
DEFS[B.WATER]        = def('Agua', TILE.WATER, { solid: false, opaque: false, liquid: true, hideSame: true, breakable: false, placeable: false, sound: 'none' });
DEFS[B.LAVA]         = def('Lava', TILE.LAVA, { solid: false, opaque: true, liquid: true, hideSame: true, bright: true, breakable: false, placeable: false, sound: 'none' });
DEFS[B.SAND]         = def('Arena', TILE.SAND, { sound: 'sand' });
DEFS[B.GRAVEL]       = def('Grava', TILE.GRAVEL, { sound: 'gravel' });
DEFS[B.GOLD_ORE]     = def('Mena de oro', TILE.GOLD_ORE, { hardness: 6 });
DEFS[B.IRON_ORE]     = def('Mena de hierro', TILE.IRON_ORE, { hardness: 6 });
DEFS[B.COAL_ORE]     = def('Mena de carbón', TILE.COAL_ORE, { hardness: 6 });
DEFS[B.LOG]          = def('Tronco', TILE.LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.LEAVES]       = def('Hojas', TILE.LEAVES, { opaque: false, sound: 'grass', hardness: 1, tool: null });
DEFS[B.SPONGE]       = def('Esponja', TILE.SPONGE, { sound: 'grass' });
DEFS[B.GLASS]        = def('Cristal', TILE.GLASS, { opaque: false, hideSame: true, hardness: 1 });
DEFS[B.GOLD_BLOCK]   = def('Bloque de oro', TILE.GOLD_BLOCK);
DEFS[B.BRICKS]       = def('Ladrillos', TILE.BRICKS);
DEFS[B.MOSSY_COBBLE] = def('Adoquín musgoso', TILE.MOSSY);
DEFS[B.OBSIDIAN]     = def('Obsidiana', TILE.OBSIDIAN, { hardness: 12 });
DEFS[B.BOOKSHELF]    = def('Librería', TILE.BOOKSHELF, { top: TILE.PLANKS, bottom: TILE.PLANKS, sound: 'wood' });
DEFS[B.FLOWER_YELLOW]   = plant('Flor amarilla', TILE.FLOWER_YELLOW);
DEFS[B.FLOWER_RED]      = plant('Rosa', TILE.FLOWER_RED);
DEFS[B.MUSHROOM_BROWN]  = plant('Seta marrón', TILE.MUSHROOM_BROWN);
DEFS[B.MUSHROOM_RED]    = plant('Seta roja', TILE.MUSHROOM_RED);

export const WOOL_NAMES = [
    'roja', 'naranja', 'amarilla', 'chartreuse', 'verde', 'verde primavera',
    'cian', 'celeste', 'ultramar', 'violeta', 'púrpura', 'magenta',
    'rosa', 'gris oscuro', 'gris', 'blanca',
];
for (let i = 0; i < 16; i++) {
    DEFS[B.WOOL0 + i] = def(`Lana ${WOOL_NAMES[i]}`, TILE.WOOL0 + i, { sound: 'cloth' });
}

/* ---- Bloques del plan de biomas (documents/03-biomas.md) ---- */
DEFS[B.SNOW]           = def('Nieve', TILE.SNOW, { sound: 'cloth' });
DEFS[B.SNOWY_GRASS]    = def('Hierba nevada', TILE.GRASS_SNOW_SIDE, { top: TILE.SNOW, bottom: TILE.DIRT, sound: 'grass' });
DEFS[B.ICE]            = def('Hielo', TILE.ICE, { opaque: false, hideSame: true, hardness: 2 });
DEFS[B.SPRUCE_LOG]     = def('Tronco de abeto', TILE.SPRUCE_LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.SPRUCE_LEAVES]  = def('Hojas de abeto', TILE.SPRUCE_LEAVES, { opaque: false, sound: 'grass' });
DEFS[B.JUNGLE_LOG]     = def('Tronco de jungla', TILE.JUNGLE_LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.JUNGLE_LEAVES]  = def('Hojas de jungla', TILE.JUNGLE_LEAVES, { opaque: false, sound: 'grass' });
DEFS[B.ACACIA_LOG]     = def('Tronco de acacia', TILE.ACACIA_LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.ACACIA_LEAVES]  = def('Hojas de acacia', TILE.ACACIA_LEAVES, { opaque: false, sound: 'grass' });
DEFS[B.CHERRY_LOG]     = def('Tronco de cerezo', TILE.CHERRY_LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.CHERRY_LEAVES]  = def('Hojas de cerezo', TILE.CHERRY_LEAVES, { opaque: false, sound: 'grass' });
DEFS[B.PALE_LOG]       = def('Tronco pálido', TILE.PALE_LOG_SIDE, { top: TILE.LOG_TOP, sound: 'wood' });
DEFS[B.PALE_LEAVES]    = def('Hojas pálidas', TILE.PALE_LEAVES, { opaque: false, sound: 'grass' });
DEFS[B.CACTUS]         = def('Cactus', TILE.CACTUS_SIDE, { top: TILE.CACTUS_TOP, sound: 'cloth' });
DEFS[B.MYCELIUM]       = def('Micelio', TILE.MYCELIUM_SIDE, { top: TILE.MYCELIUM_TOP, bottom: TILE.DIRT, sound: 'grass' });
DEFS[B.PODZOL]         = def('Podzol', TILE.PODZOL_SIDE, { top: TILE.PODZOL_TOP, bottom: TILE.DIRT, sound: 'grass' });
DEFS[B.DEAD_BUSH]      = plant('Arbusto seco', TILE.DEAD_BUSH);
DEFS[B.TALL_GRASS]     = plant('Hierba alta', TILE.TALL_GRASS);

/** Ids que aparecen en el selector de bloques, en orden de presentación. */
export const PLACEABLE = DEFS
    .map((d, id) => ({ d, id }))
    .filter(({ d }) => d && d.placeable && d.name !== 'Aire')
    .map(({ id }) => id);

export const isOpaque = (id) => DEFS[id].opaque;
export const isSolid = (id) => DEFS[id].solid;

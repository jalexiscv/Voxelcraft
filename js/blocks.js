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
    CRAFTING_TABLE: 62, // mesa de crafteo: al usarla abre la cuadrícula 3×3
    // bloques funcionales (documents/04-items.md)
    FURNACE: 63,        // horno: al usarlo abre la interfaz de fundición
    DOOR_CLOSED: 64, DOOR_OPEN: 65, // puerta: clic derecho alterna
    FENCE: 66, WINDOW: 67,
    TORCH: 68,          // brilla con luz propia (decorativa)
    BED: 69,            // clic derecho de noche → amanece
    CHEST: 70,          // cofre: su contenido viaja en world.blockData
    // sistema de cultivos (documents/04-items.md, ids fijos 71..83)
    FARMLAND: 71,       // tierra labrada: la crea la azada; la etapa del cultivo es el id
    TRIGO_0: 72, TRIGO_1: 73, TRIGO_2: 74, TRIGO_3: 75,
    ZANAHORIA_0: 76, ZANAHORIA_1: 77, ZANAHORIA_2: 78, ZANAHORIA_3: 79,
    PATATA_0: 80, PATATA_1: 81, PATATA_2: 82, PATATA_3: 83,
    // puerta de dos bloques: hojas superiores (las coloca la mecánica del par)
    DOOR_TOP_CLOSED: 84, DOOR_TOP_OPEN: 85,
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
        panel: opts.panel || false,       // caja fina centrada: true = grosor en z, 'x' = grosor en x (hoja de puerta girada); la colisión no cambia
        fence: opts.fence || false,       // valla 3D: poste + travesaños hacia vecinos conectables
        edge: opts.edge !== undefined ? opts.edge : null, // tésela del canto de los paneles (si falta, franjas de side)
        hideSame: opts.hideSame || false, // no dibujar caras entre bloques del mismo id
        bright: opts.bright || false,     // emite luz propia (lava 15, antorcha 14)
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
DEFS[B.CRAFTING_TABLE] = def('Mesa de crafteo', TILE.CRAFTING_SIDE, { top: TILE.CRAFTING_TOP, bottom: TILE.PLANKS, sound: 'wood' });

/* ---- Bloques funcionales (documents/04-items.md) ---- */
DEFS[B.FURNACE]     = def('Horno', TILE.FURNACE_SIDE, { top: TILE.FURNACE_TOP, hardness: 5 });
// Puerta de dos bloques: la hoja cerrada es un panel en z y la abierta la
// MISMA hoja girada (panel en x, misma tésela). Las hojas superiores las
// coloca la mecánica del par (placeable false). DOOR_OPEN_T es la tésela del
// canto (listón de madera) compartida por las cuatro hojas.
DEFS[B.DOOR_CLOSED] = def('Puerta', TILE.DOOR_T, { opaque: false, panel: true, edge: TILE.DOOR_OPEN_T, sound: 'wood' });
DEFS[B.DOOR_OPEN]   = def('Puerta abierta', TILE.DOOR_T, { solid: false, opaque: false, panel: 'x', edge: TILE.DOOR_OPEN_T, placeable: false, sound: 'wood' });
DEFS[B.FENCE]       = def('Valla', TILE.FENCE_T, { fence: true, opaque: false, sound: 'wood' });
DEFS[B.WINDOW]      = def('Ventana', TILE.WINDOW_T, { opaque: false, hideSame: true, panel: true, hardness: 1 });
DEFS[B.TORCH]       = def('Antorcha', TILE.TORCH_T, { cross: true, solid: false, opaque: false, bright: true, sound: 'wood', hardness: 1, tool: null });
DEFS[B.BED]         = def('Cama', TILE.PLANKS, { top: TILE.BED_TOP, sound: 'cloth', hardness: 2 });
DEFS[B.CHEST]       = def('Cofre', TILE.CHEST_SIDE, { top: TILE.CHEST_TOP, bottom: TILE.PLANKS, sound: 'wood', hardness: 3 });

/* ---- Sistema de cultivos (documents/04-items.md) ---- */
// La etapa de crecimiento es el propio id de bloque (72..83), así el byte por
// celda del mundo la persiste gratis. Nada de esto aparece en el selector:
// la tierra labrada la crea la azada y los cultivos se siembran con clic derecho.
const cultivo = (name, tile) =>
    def(name, tile, { solid: false, opaque: false, cross: true, sound: 'grass', hardness: 1, tool: null, placeable: false });

DEFS[B.FARMLAND] = def('Tierra labrada', TILE.DIRT, { top: TILE.FARMLAND_TOP, bottom: TILE.DIRT, sound: 'grass', hardness: 1, tool: 'pala', placeable: false });
const NOMBRES_ETAPA = ['(brote)', '(creciendo)', '(casi maduro)', '(maduro)'];
for (const [clave, nombre] of [['TRIGO', 'Trigo'], ['ZANAHORIA', 'Zanahoria'], ['PATATA', 'Patata']]) {
    for (let e = 0; e < 4; e++) {
        DEFS[B[`${clave}_${e}`]] = cultivo(`${nombre} ${NOMBRES_ETAPA[e]}`, TILE[`${clave}_ET${e}`]);
    }
}

/* ---- Puerta de dos bloques: hojas superiores ---- */
// Mismos flags de material que las hojas inferiores (sound wood → dureza 3,
// hacha); la vidriera translúcida vive en la tésela DOOR_TOP_T.
DEFS[B.DOOR_TOP_CLOSED] = def('Puerta (hoja superior)', TILE.DOOR_TOP_T, { opaque: false, panel: true, edge: TILE.DOOR_OPEN_T, placeable: false, sound: 'wood' });
DEFS[B.DOOR_TOP_OPEN]   = def('Puerta abierta (hoja superior)', TILE.DOOR_TOP_T, { solid: false, opaque: false, panel: 'x', edge: TILE.DOOR_OPEN_T, placeable: false, sound: 'wood' });

/** Ids que aparecen en el selector de bloques, en orden de presentación. */
export const PLACEABLE = DEFS
    .map((d, id) => ({ d, id }))
    .filter(({ d }) => d && d.placeable && d.name !== 'Aire')
    .map(({ id }) => id);

export const isOpaque = (id) => DEFS[id].opaque;
export const isSolid = (id) => DEFS[id].solid;

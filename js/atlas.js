/**
 * Atlas de texturas 100 % procedural: cada tésela de 16×16 se pinta con
 * Canvas 2D usando el PRNG determinista (mismo aspecto en cada carga).
 * No se usa ningún asset externo, por lo que no hay material con copyright.
 *
 * El atlas es una rejilla de ATLAS_GRID×ATLAS_GRID téselas de TILE_PX píxeles.
 */
import { PRNG, Perlin2D, Fractal2D } from './noise.js';

export const TILE_PX = 16;
export const ATLAS_GRID = 16;

/** Índices de tésela dentro del atlas (fila-major). */
export const TILE = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, COBBLE: 4, BEDROCK: 5, SAND: 6, GRAVEL: 7,
    PLANKS: 8, LOG_SIDE: 9, LOG_TOP: 10, LEAVES: 11, GLASS: 12, SPONGE: 13, GOLD_BLOCK: 14, BRICKS: 15,
    GOLD_ORE: 16, IRON_ORE: 17, COAL_ORE: 18, WATER: 19, LAVA: 20,
    FLOWER_YELLOW: 21, FLOWER_RED: 22, MUSHROOM_BROWN: 23, MUSHROOM_RED: 24, SAPLING: 25,
    MOSSY: 26, OBSIDIAN: 27, BOOKSHELF: 28,
    WOOL0: 29, // 29..44
    // Téselas del plan de biomas (documents/03-biomas.md, índices fijos)
    SNOW: 45, GRASS_SNOW_SIDE: 46, ICE: 47,
    SPRUCE_LOG_SIDE: 48, SPRUCE_LEAVES: 49, JUNGLE_LOG_SIDE: 50, JUNGLE_LEAVES: 51,
    ACACIA_LOG_SIDE: 52, ACACIA_LEAVES: 53, CHERRY_LOG_SIDE: 54, CHERRY_LEAVES: 55,
    PALE_LOG_SIDE: 56, PALE_LEAVES: 57,
    CACTUS_SIDE: 58, CACTUS_TOP: 59,
    MYCELIUM_TOP: 60, MYCELIUM_SIDE: 61, PODZOL_TOP: 62, PODZOL_SIDE: 63,
    DEAD_BUSH: 64, TALL_GRASS: 65,
    // herramientas del crafteo (sprites planos; items en js/items.js)
    PALO: 66, PICO_MADERA: 67, HACHA_MADERA: 68, PALA_MADERA: 69,
    PICO_PIEDRA: 70, HACHA_PIEDRA: 71, PALA_PIEDRA: 72,
    CRAFTING_TOP: 73, CRAFTING_SIDE: 74,
    // items de drops y fundición (documents/04-items.md)
    CUERO: 75, PLUMA: 76, CARNE_CRUDA: 77, CARNE_ASADA: 78, HUESO: 79,
    HILO: 80, POLVORA: 81, CARNE_PODRIDA: 82, PERLA: 83, BOLA_SLIME: 84,
    TINTA: 85, PEZ_CRUDO: 86, PEZ_ASADO: 87, ESCAMA: 88, MEMBRANA: 89,
    CARBON: 90, LINGOTE_HIERRO: 91, LINGOTE_ORO: 92,
    PICO_HIERRO: 93, HACHA_HIERRO: 94, PALA_HIERRO: 95,
    ESPADA_MADERA: 96, ESPADA_PIEDRA: 97, ESPADA_HIERRO: 98,
    // bloques funcionales
    FURNACE_SIDE: 99, FURNACE_TOP: 101,
    DOOR_T: 102, DOOR_OPEN_T: 103, FENCE_T: 104, WINDOW_T: 105,
    TORCH_T: 106, BED_TOP: 107,
};

/** Paleta clásica de 16 lanas (arcoíris + grises). */
export const WOOL_COLORS = [
    [222, 50, 50], [222, 136, 50], [222, 222, 50], [136, 222, 50],
    [50, 222, 50], [50, 222, 136], [50, 222, 222], [104, 163, 222],
    [120, 120, 222], [136, 50, 222], [174, 74, 222], [222, 50, 222],
    [222, 50, 136], [117, 117, 117], [163, 163, 163], [222, 222, 222],
];

/** Lienzo de una tésela con acceso por píxel y utilidades comunes. */
class Tile {
    constructor(seed) {
        this.rng = new PRNG(seed);
        this.data = new Uint8ClampedArray(TILE_PX * TILE_PX * 4);
    }
    px(x, y, r, g, b, a = 255) {
        if (x < 0 || y < 0 || x >= TILE_PX || y >= TILE_PX) return;
        const i = (y * TILE_PX + x) * 4;
        this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
    }
    /** Rellena toda la tésela con `base` variando la luminancia ±spread. */
    noiseFill(base, spread, alpha = 255) {
        for (let y = 0; y < TILE_PX; y++) {
            for (let x = 0; x < TILE_PX; x++) {
                const d = Math.floor((this.rng.float() * 2 - 1) * spread);
                this.px(x, y, base[0] + d, base[1] + d, base[2] + d, alpha);
            }
        }
    }
    /** Pinta `count` motas del color dado en posiciones aleatorias. */
    speckle(count, color, alpha = 255) {
        for (let i = 0; i < count; i++) {
            this.px(this.rng.int(TILE_PX), this.rng.int(TILE_PX), color[0], color[1], color[2], alpha);
        }
    }
}

/* ---- Pintores de téselas ---- */

export const painters = {};

painters[TILE.GRASS_TOP] = (t) => t.noiseFill([106, 170, 64], 16);

painters[TILE.DIRT] = (t) => { t.noiseFill([134, 96, 67], 13); t.speckle(10, [90, 62, 40]); };

painters[TILE.GRASS_SIDE] = (t) => {
    painters[TILE.DIRT](t);
    for (let x = 0; x < TILE_PX; x++) {
        const depth = 2 + t.rng.int(3); // borde dentado de hierba
        for (let y = 0; y < depth; y++) {
            const d = Math.floor((t.rng.float() * 2 - 1) * 16);
            t.px(x, y, 106 + d, 170 + d, 64 + d);
        }
    }
};

painters[TILE.STONE] = (t) => { t.noiseFill([127, 127, 127], 9); t.speckle(8, [100, 100, 100]); };

painters[TILE.COBBLE] = (t) => {
    t.noiseFill([130, 130, 130], 12);
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            const jx = (x + t.rng.int(2)) % 5, jy = (y + t.rng.int(2)) % 5;
            if (jx === 0 || jy === 0) t.px(x, y, 88, 88, 88);          // mortero
            else if (jx === 2 && jy === 2) t.px(x, y, 158, 158, 158);  // brillo central
        }
    }
};

painters[TILE.BEDROCK] = (t) => { t.noiseFill([62, 62, 62], 26); t.speckle(12, [30, 30, 30]); };

painters[TILE.SAND] = (t) => t.noiseFill([219, 207, 163], 11);

painters[TILE.GRAVEL] = (t) => {
    t.noiseFill([131, 127, 122], 14);
    t.speckle(26, [104, 92, 80]);
    t.speckle(14, [160, 158, 155]);
};

painters[TILE.PLANKS] = (t) => {
    t.noiseFill([170, 132, 82], 8);
    for (let y = 0; y < TILE_PX; y++) {
        const band = Math.floor(y / 4);
        if (y % 4 === 3) { for (let x = 0; x < TILE_PX; x++) t.px(x, y, 110, 84, 50); } // juntas
        else { const sx = band % 2 === 0 ? 11 : 4; t.px(sx, y, 118, 90, 54); }          // testas
    }
    t.speckle(12, [148, 112, 66]); // veta
};

painters[TILE.LOG_SIDE] = (t) => {
    for (let x = 0; x < TILE_PX; x++) {
        const shade = t.rng.int(3) === 0 ? -26 : t.rng.int(18) - 9;
        for (let y = 0; y < TILE_PX; y++) {
            const d = shade + t.rng.int(7) - 3;
            t.px(x, y, 104 + d, 82 + d, 50 + d);
        }
    }
};

painters[TILE.LOG_TOP] = (t) => {
    t.noiseFill([178, 142, 88], 6);
    const c = 7.5;
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            const r = Math.sqrt((x - c) * (x - c) + (y - c) * (y - c));
            if (Math.floor(r) % 2 === 0 && r < 7) t.px(x, y, 140, 108, 62);
            if (r >= 7) t.px(x, y, 104, 82, 50); // corteza
        }
    }
};

painters[TILE.LEAVES] = (t) => {
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            if (t.rng.float() < 0.24) { t.px(x, y, 0, 0, 0, 0); continue; } // huecos
            const d = t.rng.int(36) - 18;
            t.px(x, y, 58 + d, 128 + d, 42 + d);
        }
    }
};

painters[TILE.GLASS] = (t) => {
    for (let i = 0; i < TILE_PX; i++) { // marco
        t.px(i, 0, 210, 230, 240, 200); t.px(i, 15, 210, 230, 240, 200);
        t.px(0, i, 210, 230, 240, 200); t.px(15, i, 210, 230, 240, 200);
    }
    for (let i = 2; i < 7; i++) t.px(i, 9 - i, 235, 245, 250, 140); // destello
};

painters[TILE.SPONGE] = (t) => {
    t.noiseFill([196, 190, 74], 12);
    for (let i = 0; i < 9; i++) {
        const x = t.rng.int(15), y = t.rng.int(15);
        t.px(x, y, 148, 138, 48); t.px(x + 1, y, 148, 138, 48); t.px(x, y + 1, 148, 138, 48);
    }
};

painters[TILE.GOLD_BLOCK] = (t) => {
    t.noiseFill([248, 212, 74], 8);
    for (let i = 0; i < TILE_PX; i++) {
        t.px(i, 0, 254, 238, 140); t.px(0, i, 254, 238, 140);   // bisel claro
        t.px(i, 15, 184, 140, 36); t.px(15, i, 184, 140, 36);   // bisel oscuro
    }
};

painters[TILE.BRICKS] = (t) => {
    t.noiseFill([150, 72, 60], 10);
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            const row = Math.floor(y / 4);
            const mortarV = (x + (row % 2 === 0 ? 0 : 4)) % 8 === 0;
            if (y % 4 === 3 || mortarV) t.px(x, y, 186, 178, 168);
        }
    }
};

const oreTile = (blobColor) => (t) => {
    painters[TILE.STONE](t);
    for (let i = 0; i < 5; i++) {
        const x = 1 + t.rng.int(13), y = 1 + t.rng.int(13);
        t.px(x, y, ...blobColor); t.px(x + 1, y, ...blobColor);
        t.px(x, y + 1, ...blobColor);
        if (t.rng.int(2)) t.px(x + 1, y + 1, ...blobColor);
    }
};
painters[TILE.GOLD_ORE] = oreTile([252, 222, 112]);
painters[TILE.IRON_ORE] = oreTile([216, 167, 138]);
painters[TILE.COAL_ORE] = oreTile([52, 52, 52]);

painters[TILE.WATER] = (t) => {
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            const d = t.rng.int(38) - 19;
            t.px(x, y, 44 + d, 88 + d, 218 + d, 168);
        }
    }
};

painters[TILE.LAVA] = (t) => {
    const rng = new PRNG(777);
    const n = new Perlin2D(rng);
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            const v = n.value(x / 4, y / 4) + 0.4 * n.value(x / 2, y / 2);
            if (v > 0.35) t.px(x, y, 252, 200, 72);
            else if (v > -0.1) t.px(x, y, 224, 110, 34);
            else t.px(x, y, 150, 42, 16);
        }
    }
};

painters[TILE.FLOWER_YELLOW] = (t) => {
    for (let y = 7; y <= 14; y++) t.px(8, y, 46, 118, 34);      // tallo
    t.px(7, 10, 46, 118, 34);                                    // hoja
    for (let y = 3; y <= 5; y++) for (let x = 7; x <= 9; x++) t.px(x, y, 232, 222, 74); // puff
    t.px(8, 4, 236, 168, 44);
};

painters[TILE.FLOWER_RED] = (t) => {
    for (let y = 7; y <= 14; y++) t.px(8, y, 46, 118, 34);
    t.px(9, 11, 46, 118, 34);
    const R = [204, 44, 52];
    t.px(8, 3, ...R); t.px(7, 4, ...R); t.px(9, 4, ...R);
    t.px(7, 5, ...R); t.px(9, 5, ...R); t.px(8, 6, ...R);
    t.px(8, 4, 120, 20, 26); t.px(8, 5, 120, 20, 26);            // centro
};

painters[TILE.MUSHROOM_BROWN] = (t) => {
    for (let y = 9; y <= 14; y++) t.px(8, y, 206, 196, 172);     // pie
    for (let x = 5; x <= 11; x++) t.px(x, 8, 146, 104, 66);      // sombrero
    for (let x = 6; x <= 10; x++) t.px(x, 7, 146, 104, 66);
    for (let x = 7; x <= 9; x++) t.px(x, 6, 168, 124, 82);
};

painters[TILE.MUSHROOM_RED] = (t) => {
    for (let y = 9; y <= 14; y++) t.px(8, y, 214, 206, 186);
    for (let x = 5; x <= 11; x++) t.px(x, 8, 196, 44, 38);
    for (let x = 6; x <= 10; x++) t.px(x, 7, 196, 44, 38);
    for (let x = 7; x <= 9; x++) t.px(x, 6, 214, 60, 50);
    t.px(6, 8, 240, 236, 230); t.px(9, 7, 240, 236, 230);        // motas
};

painters[TILE.SAPLING] = (t) => {
    for (let y = 8; y <= 14; y++) t.px(8, y, 104, 82, 50);       // tronquito
    const G = [64, 142, 48];
    for (let i = 0; i < 16; i++) {
        const x = 5 + t.rng.int(7), y = 2 + t.rng.int(7);
        if (Math.abs(x - 8) + Math.abs(y - 5) <= 4) t.px(x, y, ...G);
    }
    t.px(8, 5, ...G); t.px(7, 5, ...G); t.px(9, 5, ...G); t.px(8, 4, ...G);
};

painters[TILE.MOSSY] = (t) => {
    painters[TILE.COBBLE](t);
    for (let i = 0; i < 7; i++) {
        const x = t.rng.int(14), y = t.rng.int(14);
        t.px(x, y, 92, 132, 62); t.px(x + 1, y, 92, 132, 62); t.px(x, y + 1, 78, 118, 52);
    }
};

painters[TILE.OBSIDIAN] = (t) => {
    t.noiseFill([26, 20, 38], 9);
    t.speckle(6, [92, 62, 142]);
    t.speckle(4, [50, 40, 74]);
};

painters[TILE.BOOKSHELF] = (t) => {
    painters[TILE.PLANKS](t);
    const bookColors = [[168, 52, 44], [62, 116, 60], [64, 78, 158], [140, 106, 48], [96, 60, 130]];
    for (const rowY of [2, 8]) {
        for (let x = 1; x < 15; x++) {
            const col = bookColors[t.rng.int(bookColors.length)];
            for (let y = rowY; y < rowY + 5; y++) {
                t.px(x, y, ...(x % 3 === 0 ? [40, 28, 18] : col)); // separación entre libros
            }
        }
    }
};

for (let i = 0; i < 16; i++) {
    painters[TILE.WOOL0 + i] = (t) => {
        const [r, g, b] = WOOL_COLORS[i];
        for (let y = 0; y < TILE_PX; y++) {
            for (let x = 0; x < TILE_PX; x++) {
                const weave = (x + y) % 2 === 0 ? 6 : -6; // trama sutil
                const d = weave + t.rng.int(9) - 4;
                t.px(x, y, r + d, g + d, b + d);
            }
        }
    };
}

/* ---- Téselas del plan de biomas (documents/03-biomas.md) ---- */

painters[TILE.SNOW] = (t) => t.noiseFill([238, 244, 250], 6);

/** Lateral de suelo: DIRT con el borde superior dentado del color del top. */
const soilSideTile = (edge, spread) => (t) => {
    painters[TILE.DIRT](t);
    for (let x = 0; x < TILE_PX; x++) {
        const depth = 2 + t.rng.int(3); // borde dentado como GRASS_SIDE
        for (let y = 0; y < depth; y++) {
            const d = Math.floor((t.rng.float() * 2 - 1) * spread);
            t.px(x, y, edge[0] + d, edge[1] + d, edge[2] + d);
        }
    }
};
painters[TILE.GRASS_SNOW_SIDE] = soilSideTile([238, 244, 250], 6);
painters[TILE.MYCELIUM_SIDE] = soilSideTile([122, 106, 122], 10);
painters[TILE.PODZOL_SIDE] = soilSideTile([150, 98, 48], 12);

painters[TILE.ICE] = (t) => {
    t.noiseFill([148, 186, 238], 10, 210);
    for (let i = 0; i < 4; i++) { // vetas diagonales
        const x0 = t.rng.int(10), y0 = t.rng.int(10);
        for (let j = 0; j < 5; j++) t.px(x0 + j, y0 + j, 196, 224, 250, 210);
    }
    t.speckle(6, [226, 242, 252], 210); // destellos
};

/** Tronco lateral con paleta propia (variante de LOG_SIDE). */
const logSideTile = (base) => (t) => {
    for (let x = 0; x < TILE_PX; x++) {
        const shade = t.rng.int(3) === 0 ? -26 : t.rng.int(18) - 9;
        for (let y = 0; y < TILE_PX; y++) {
            const d = shade + t.rng.int(7) - 3;
            t.px(x, y, base[0] + d, base[1] + d, base[2] + d);
        }
    }
};
painters[TILE.SPRUCE_LOG_SIDE] = logSideTile([72, 54, 34]);                                     // abeto pardo oscuro
painters[TILE.JUNGLE_LOG_SIDE] = (t) => { logSideTile([118, 90, 52])(t); t.speckle(14, [82, 60, 32]); }; // jungla moteado
painters[TILE.ACACIA_LOG_SIDE] = (t) => { logSideTile([128, 120, 112])(t); t.speckle(12, [186, 108, 62]); }; // acacia gris-naranja
painters[TILE.CHERRY_LOG_SIDE] = logSideTile([98, 62, 62]);                                     // cerezo pardo rosado
painters[TILE.PALE_LOG_SIDE] = logSideTile([140, 140, 134]);                                    // pálido gris desaturado

/** Hojas con huecos (alfa 0) y paleta propia (variante de LEAVES). */
const leavesTile = (base) => (t) => {
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
            if (t.rng.float() < 0.24) { t.px(x, y, 0, 0, 0, 0); continue; } // huecos
            const d = t.rng.int(36) - 18;
            t.px(x, y, base[0] + d, base[1] + d, base[2] + d);
        }
    }
};
painters[TILE.SPRUCE_LEAVES] = leavesTile([42, 96, 70]);    // verde azulado oscuro
painters[TILE.JUNGLE_LEAVES] = leavesTile([46, 142, 36]);   // verde intenso
painters[TILE.ACACIA_LEAVES] = leavesTile([106, 128, 46]);  // verde oliva
painters[TILE.CHERRY_LEAVES] = leavesTile([222, 158, 190]); // rosa cerezo
painters[TILE.PALE_LEAVES] = leavesTile([118, 132, 116]);   // gris verdoso

painters[TILE.CACTUS_SIDE] = (t) => {
    t.noiseFill([58, 128, 44], 10);
    for (const x of [2, 7, 12]) { // costillas verticales
        for (let y = 0; y < TILE_PX; y++) t.px(x, y, 42, 100, 34);
    }
    t.speckle(8, [216, 232, 188]); // pinchos claros
};

painters[TILE.CACTUS_TOP] = (t) => {
    t.noiseFill([70, 142, 52], 8);
    for (let i = 2; i <= 13; i++) { // anillo
        t.px(i, 2, 46, 104, 36); t.px(i, 13, 46, 104, 36);
        t.px(2, i, 46, 104, 36); t.px(13, i, 46, 104, 36);
    }
};

painters[TILE.MYCELIUM_TOP] = (t) => {
    t.noiseFill([122, 106, 122], 10);
    t.speckle(14, [150, 122, 154]); // moteado lila claro
    t.speckle(8, [94, 82, 100]);    // moteado oscuro
};

painters[TILE.PODZOL_TOP] = (t) => {
    t.noiseFill([150, 98, 48], 12);
    t.speckle(12, [110, 72, 34]);   // hojarasca oscura
    t.speckle(8, [186, 130, 62]);   // hojas secas claras
};

painters[TILE.DEAD_BUSH] = (t) => {
    const M = [122, 88, 50];                                 // madera seca
    for (let y = 6; y <= 14; y++) t.px(8, y, ...M);          // tallo
    for (let i = 1; i <= 3; i++) {
        t.px(8 - i, 9 - i, ...M);                            // rama izquierda
        t.px(8 + i, 10 - i, ...M);                           // rama derecha
    }
    t.px(4, 5, ...M); t.px(12, 6, ...M);                     // puntas
    t.px(6, 12, 96, 68, 38); t.px(10, 13, 96, 68, 38);       // brotes bajos
};

painters[TILE.TALL_GRASS] = (t) => {
    for (let i = 0; i < 9; i++) { // briznas de altura variable
        const x = 3 + t.rng.int(10);
        const top = 4 + t.rng.int(5);
        for (let y = top; y <= 14; y++) {
            const d = t.rng.int(22) - 11;
            t.px(x, y, 92 + d, 158 + d, 58 + d);
        }
    }
};

/* ---- Herramientas del crafteo (sprites planos con fondo transparente) ---- */

const MANGO = [124, 92, 56];
const SOMBRA_MANGO = [92, 66, 38];

/** Mango diagonal de la esquina inferior izquierda hacia arriba a la derecha. */
function mangoDiagonal(t, desde = 2, hasta = 11) {
    for (let i = desde; i <= hasta; i++) {
        t.px(i, 15 - i, ...MANGO);
        t.px(i + 1, 15 - i, ...SOMBRA_MANGO);
    }
}

painters[TILE.PALO] = (t) => mangoDiagonal(t, 2, 12);

const picoTile = (cabeza, brillo) => (t) => {
    mangoDiagonal(t);
    // cabeza en arco (parábola suave) con las puntas caídas
    for (let x = 5; x <= 14; x++) {
        const y = Math.round(1 + 0.09 * (x - 10) * (x - 10));
        t.px(x, y, ...cabeza);
        t.px(x, y + 1, ...(x === 5 || x === 14 ? cabeza : brillo));
    }
};

const hachaTile = (cabeza, brillo) => (t) => {
    mangoDiagonal(t);
    for (let y = 1; y <= 5; y++) {
        for (let x = 8; x <= 12; x++) {
            if (x + y <= 16) t.px(x, y, ...(y === 1 || x === 8 ? brillo : cabeza));
        }
    }
};

const palaTile = (cabeza, brillo) => (t) => {
    mangoDiagonal(t, 2, 9);
    for (let y = 1; y <= 5; y++) {
        for (let x = 10; x <= 13; x++) t.px(x, y, ...(y === 1 ? brillo : cabeza));
    }
};

const CABEZA_MADERA = [150, 112, 62], BRILLO_MADERA = [178, 138, 84];
const CABEZA_PIEDRA = [128, 128, 128], BRILLO_PIEDRA = [162, 162, 162];
painters[TILE.PICO_MADERA] = picoTile(CABEZA_MADERA, BRILLO_MADERA);
painters[TILE.HACHA_MADERA] = hachaTile(CABEZA_MADERA, BRILLO_MADERA);
painters[TILE.PALA_MADERA] = palaTile(CABEZA_MADERA, BRILLO_MADERA);
painters[TILE.PICO_PIEDRA] = picoTile(CABEZA_PIEDRA, BRILLO_PIEDRA);
painters[TILE.HACHA_PIEDRA] = hachaTile(CABEZA_PIEDRA, BRILLO_PIEDRA);
painters[TILE.PALA_PIEDRA] = palaTile(CABEZA_PIEDRA, BRILLO_PIEDRA);

painters[TILE.CRAFTING_TOP] = (t) => {
    // sobre de madera cálida con marco, esquinas reforzadas y rejilla de
    // trabajo central (diseño propio al estilo banco de carpintero)
    t.noiseFill([168, 118, 74], 9);
    for (let i = 0; i < TILE_PX; i++) {                  // marco oscuro
        t.px(i, 0, 52, 36, 22); t.px(i, 15, 52, 36, 22);
        t.px(0, i, 52, 36, 22); t.px(15, i, 52, 36, 22);
    }
    for (const [cx, cy] of [[1, 1], [13, 1], [1, 13], [13, 13]]) {
        t.px(cx, cy, 220, 188, 124);                     // cuña clara de refuerzo
        t.px(cx + 1, cy, 220, 188, 124);
        t.px(cx, cy + 1, 220, 188, 124);
        t.px(cx + 1, cy + 1, 96, 62, 34);                // sombra interior
    }
    for (let y = 4; y <= 11; y++) {                      // celdas de la rejilla
        for (let x = 4; x <= 11; x++) {
            const d = t.rng.int(9) - 4;
            t.px(x, y, 192 + d, 142 + d, 92 + d);
        }
    }
    for (let i = 3; i <= 12; i++) {                      // ranuras de la rejilla
        t.px(i, 3, 82, 56, 34); t.px(i, 12, 82, 56, 34);
        t.px(3, i, 82, 56, 34); t.px(12, i, 82, 56, 34);
        t.px(i, 6, 82, 56, 34); t.px(i, 9, 82, 56, 34);
        t.px(6, i, 82, 56, 34); t.px(9, i, 82, 56, 34);
    }
};

painters[TILE.CRAFTING_SIDE] = (t) => {
    painters[TILE.PLANKS](t);
    // canto del sobre asomando arriba
    for (let x = 0; x < TILE_PX; x++) { t.px(x, 0, 92, 62, 36); t.px(x, 1, 128, 90, 54); }
    // herramientas colgadas: silueta de sierra y martillo
    for (let x = 3; x <= 6; x++) t.px(x, 5, 120, 120, 126);
    for (let y = 5; y <= 9; y++) t.px(6, y, 96, 70, 44);
    for (let x = 9; x <= 12; x++) t.px(x, 6, 120, 120, 126);
    t.px(10, 5, 150, 150, 156); t.px(11, 5, 150, 150, 156);
    for (let y = 6; y <= 10; y++) t.px(10, y, 96, 70, 44);
};

/* ---- Items de drops y fundición (sprites planos, fondo transparente) ---- */

/** Mancha orgánica centrada: base + sombra inferior + brillo superior. */
const manchaTile = (base, sombra, brillo) => (t) => {
    for (let y = 4; y <= 11; y++) {
        const half = 5 - Math.abs(y - 8) * 0.8;
        for (let x = Math.round(8 - half); x <= Math.round(7 + half); x++) {
            t.px(x, y, ...(y > 9 ? sombra : base));
        }
    }
    t.px(6, 5, ...brillo); t.px(7, 5, ...brillo);
};

painters[TILE.CUERO] = manchaTile([176, 118, 62], [140, 90, 46], [200, 146, 88]);
painters[TILE.CARNE_CRUDA] = manchaTile([214, 82, 74], [170, 56, 50], [236, 130, 122]);
painters[TILE.CARNE_ASADA] = manchaTile([158, 96, 52], [118, 68, 36], [196, 134, 82]);
painters[TILE.CARNE_PODRIDA] = manchaTile([148, 120, 64], [108, 88, 46], [172, 150, 92]);
painters[TILE.POLVORA] = (t) => { manchaTile([108, 108, 108], [72, 72, 72], [140, 140, 140])(t); t.speckle(8, [58, 58, 58]); };
painters[TILE.BOLA_SLIME] = manchaTile([112, 196, 96], [78, 152, 66], [168, 226, 150]);
painters[TILE.TINTA] = manchaTile([42, 42, 58], [24, 24, 36], [78, 78, 104]);
painters[TILE.CARBON] = (t) => { manchaTile([52, 52, 52], [30, 30, 30], [90, 90, 90])(t); t.speckle(5, [16, 16, 16]); };
painters[TILE.ESCAMA] = manchaTile([96, 168, 172], [64, 126, 130], [150, 212, 214]);
painters[TILE.MEMBRANA] = manchaTile([190, 178, 150], [148, 138, 112], [216, 208, 186]);

painters[TILE.PLUMA] = (t) => {
    for (let i = 0; i <= 8; i++) {                         // pluma diagonal
        t.px(4 + i, 12 - i, 236, 236, 232);
        t.px(5 + i, 12 - i, 214, 214, 208);
    }
    for (let i = 2; i <= 6; i++) t.px(3 + i, 14 - i, 168, 168, 162); // cañón
};

painters[TILE.HUESO] = (t) => {
    for (let i = 0; i <= 7; i++) t.px(4 + i, 11 - i, 234, 230, 218); // caña
    t.px(3, 12, 234, 230, 218); t.px(4, 12, 234, 230, 218); t.px(3, 11, 234, 230, 218);
    t.px(11, 4, 234, 230, 218); t.px(12, 4, 234, 230, 218); t.px(12, 5, 234, 230, 218);
    t.px(4, 13, 196, 190, 174); t.px(13, 4, 196, 190, 174); // sombras de las cabezas
};

painters[TILE.HILO] = (t) => {
    for (let a = 0; a < 20; a++) {                          // ovillo
        const x = Math.round(8 + Math.cos(a * 0.9) * (2 + a * 0.1));
        const y = Math.round(8 + Math.sin(a * 0.9) * (2 + a * 0.08));
        t.px(x, y, 226, 226, 222);
    }
    t.px(8, 8, 198, 198, 192);
};

painters[TILE.PERLA] = (t) => {
    manchaTile([64, 150, 140], [40, 108, 100], [140, 214, 202])(t);
    t.px(7, 6, 210, 246, 240);                              // destello
};

const pezTile = (cuerpo, sombra) => (t) => {
    for (let x = 4; x <= 10; x++) {                         // cuerpo
        const half = 2 - Math.abs(x - 7) * 0.5;
        for (let y = Math.round(8 - half); y <= Math.round(8 + half); y++) t.px(x, y, ...cuerpo);
    }
    t.px(11, 7, ...sombra); t.px(11, 9, ...sombra); t.px(12, 8, ...sombra); // cola
    t.px(5, 7, 20, 20, 20);                                 // ojo
};
painters[TILE.PEZ_CRUDO] = pezTile([150, 170, 190], [110, 130, 150]);
painters[TILE.PEZ_ASADO] = pezTile([190, 140, 80], [150, 104, 56]);

const lingoteTile = (claro, medio, oscuro) => (t) => {
    for (let y = 7; y <= 11; y++) {                         // lingote trapezoidal
        const in0 = 3 + (11 - y), in1 = 12 - (11 - y) + 1;
        for (let x = in0; x <= in1; x++) t.px(x, y, ...(y === 7 ? claro : y >= 10 ? oscuro : medio));
    }
};
painters[TILE.LINGOTE_HIERRO] = lingoteTile([230, 230, 232], [196, 198, 202], [150, 152, 158]);
painters[TILE.LINGOTE_ORO] = lingoteTile([252, 234, 140], [236, 196, 80], [190, 148, 48]);

const CABEZA_HIERRO = [206, 208, 212], BRILLO_HIERRO = [236, 238, 242];
painters[TILE.PICO_HIERRO] = picoTile(CABEZA_HIERRO, BRILLO_HIERRO);
painters[TILE.HACHA_HIERRO] = hachaTile(CABEZA_HIERRO, BRILLO_HIERRO);
painters[TILE.PALA_HIERRO] = palaTile(CABEZA_HIERRO, BRILLO_HIERRO);

const espadaTile = (hoja, brillo) => (t) => {
    mangoDiagonal(t, 2, 4);                                 // empuñadura corta
    t.px(4, 10, 96, 66, 38); t.px(6, 12, 96, 66, 38);       // guarda
    for (let i = 0; i <= 7; i++) {                          // hoja diagonal
        t.px(5 + i, 10 - i, ...hoja);
        t.px(6 + i, 10 - i, ...brillo);
    }
    t.px(13, 2, ...brillo);                                 // punta
};
painters[TILE.ESPADA_MADERA] = espadaTile([166, 128, 78], [196, 158, 104]);
painters[TILE.ESPADA_PIEDRA] = espadaTile([128, 128, 128], [162, 162, 162]);
painters[TILE.ESPADA_HIERRO] = espadaTile([206, 208, 212], [240, 242, 246]);

/* ---- Bloques funcionales ---- */

painters[TILE.FURNACE_SIDE] = (t) => {
    painters[TILE.COBBLE](t);
    for (let y = 9; y <= 13; y++) {                         // boca del horno
        for (let x = 5; x <= 10; x++) t.px(x, y, 26, 22, 20);
    }
    t.px(6, 12, 240, 160, 60); t.px(8, 11, 240, 160, 60);   // brasas
    t.px(9, 13, 200, 90, 40); t.px(7, 13, 200, 90, 40);
};

painters[TILE.FURNACE_TOP] = (t) => {
    painters[TILE.COBBLE](t);
    for (let x = 4; x <= 11; x++) for (let y = 4; y <= 11; y++) t.px(x, y, 92, 92, 92);
    for (let x = 5; x <= 10; x++) for (let y = 5; y <= 10; y++) t.px(x, y, 70, 70, 70);
};

painters[TILE.DOOR_T] = (t) => {
    painters[TILE.PLANKS](t);
    for (let i = 0; i < TILE_PX; i++) {                     // marco
        t.px(i, 0, 84, 60, 34); t.px(i, 15, 84, 60, 34);
        t.px(0, i, 84, 60, 34); t.px(15, i, 84, 60, 34);
    }
    for (let y = 3; y <= 6; y++) {                          // ventanuco (hueco alfa)
        for (let x = 5; x <= 10; x++) t.px(x, y, 0, 0, 0, 0);
    }
    t.px(12, 9, 210, 190, 120); t.px(12, 10, 210, 190, 120); // pomo
};

painters[TILE.DOOR_OPEN_T] = (t) => {
    // hoja abierta pegada al canto: casi todo hueco, tablón lateral visible
    for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x <= 3; x++) {
            const d = t.rng.int(9) - 4;
            t.px(x, y, 170 + d, 132 + d, 82 + d);
        }
        t.px(0, y, 84, 60, 34);
    }
    t.px(2, 8, 210, 190, 120);                              // pomo
};

painters[TILE.FENCE_T] = (t) => {
    for (let y = 2; y < TILE_PX; y++) { t.px(7, y, 124, 92, 56); t.px(8, y, 104, 76, 46); } // poste
    for (const ry of [5, 10]) {                             // travesaños
        for (let x = 0; x < TILE_PX; x++) { t.px(x, ry, 140, 106, 64); t.px(x, ry + 1, 116, 86, 50); }
    }
};

painters[TILE.WINDOW_T] = (t) => {
    painters[TILE.GLASS](t);
    for (let i = 0; i < TILE_PX; i++) {                     // marco de madera
        t.px(i, 0, 124, 92, 56); t.px(i, 15, 124, 92, 56);
        t.px(0, i, 124, 92, 56); t.px(15, i, 124, 92, 56);
        t.px(i, 7, 140, 106, 64); t.px(7, i, 140, 106, 64); // parteluz
    }
};

painters[TILE.TORCH_T] = (t) => {
    for (let y = 7; y <= 14; y++) { t.px(7, y, 124, 92, 56); t.px(8, y, 104, 76, 46); } // palo
    t.px(7, 5, 252, 220, 100); t.px(8, 5, 252, 220, 100);   // llama
    t.px(7, 6, 244, 160, 60); t.px(8, 6, 244, 160, 60);
    t.px(7, 4, 255, 244, 180);
};

painters[TILE.BED_TOP] = (t) => {
    t.noiseFill([170, 52, 52], 8);                          // manta roja
    for (let y = 1; y <= 4; y++) for (let x = 2; x <= 13; x++) t.px(x, y, 236, 232, 224); // almohada
    for (let x = 0; x < TILE_PX; x++) t.px(x, 5, 130, 36, 36); // doblez
    for (let i = 0; i < TILE_PX; i++) {                     // borde del armazón
        t.px(i, 0, 110, 84, 50); t.px(i, 15, 110, 84, 50);
        t.px(0, i, 110, 84, 50); t.px(15, i, 110, 84, 50);
    }
};

/**
 * Construye el atlas completo. Devuelve el canvas (para subirlo como textura
 * WebGL y para pintar iconos del HUD).
 */
export function buildAtlas() {
    const size = ATLAS_GRID * TILE_PX;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    for (const [tileIdx, paint] of Object.entries(painters)) {
        const idx = Number(tileIdx);
        const tile = new Tile(1000 + idx); // semilla estable por tésela
        paint(tile);
        const img = new ImageData(tile.data, TILE_PX, TILE_PX);
        ctx.putImageData(img, (idx % ATLAS_GRID) * TILE_PX, Math.floor(idx / ATLAS_GRID) * TILE_PX);
    }
    return canvas;
}

/**
 * Textura de nubes 256×256 tileable (blanco con alfa), generada con ruido
 * fractal mezclado en los bordes para que repita sin costuras.
 */
export function buildCloudTexture(seed = 4242) {
    const S = 256;
    const noise = new Fractal2D(new PRNG(seed), 4);
    const raw = (x, y) => noise.value(x / 48, y / 48);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const fx = x / S, fy = y / S;
            const v = raw(x, y) * (1 - fx) * (1 - fy) + raw(x - S, y) * fx * (1 - fy) +
                      raw(x, y - S) * (1 - fx) * fy + raw(x - S, y - S) * fx * fy;
            const i = (y * S + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
            img.data[i + 3] = v > 0.32 ? 190 : 0;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

/** Coordenadas UV [u0,v0,u1,v1] de una tésela dentro del atlas. */
export function tileUV(tile) {
    const s = 1 / ATLAS_GRID;
    const u = (tile % ATLAS_GRID) * s;
    const v = Math.floor(tile / ATLAS_GRID) * s;
    return [u, v, u + s, v + s];
}

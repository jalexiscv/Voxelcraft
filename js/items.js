/**
 * Items y crafteo: objetos que NO son bloques (herramientas, palos) y las
 * recetas para fabricarlos en la CUADRÍCULA de crafteo. Módulo puro (sin
 * DOM, probable en Node): el HUD pinta la pantalla y main.js aplica reglas.
 *
 * Los ids de item viven desde ITEM_BASE (200) para no chocar jamás con los
 * ids de bloque (bytes 0..255 del mundo; los items nunca se colocan).
 *
 * Método clásico de crafteo:
 *  - La pantalla de inventario (E) trae una cuadrícula personal de 2×2.
 *  - La mesa de crafteo (bloque colocable) abre la cuadrícula de 3×3.
 *  - Las recetas CON FORMA (`pattern`) exigen colocar los ingredientes con
 *    esa disposición (se admite el espejo horizontal); las SIN forma
 *    (`in`) solo exigen las cantidades, en cualquier celda.
 *
 * Una herramienta acelera el picado del material que le corresponde
 * (def.tool del bloque): cada golpe cuenta por `factor` (madera ×2,
 * piedra ×3); ver la dureza en blocks.js y el picado en main.js.
 */
import { B } from './blocks.js';
import { TILE } from './atlas.js';

export const ITEM_BASE = 200;

export const ITEMS = {
    PALO: 200,
    PICO_MADERA: 201, HACHA_MADERA: 202, PALA_MADERA: 203,
    PICO_PIEDRA: 204, HACHA_PIEDRA: 205, PALA_PIEDRA: 206,
    // materiales que sueltan los mobs (tabla en documents/04-items.md)
    CUERO: 207, PLUMA: 208, CARNE_CRUDA: 209, CARNE_ASADA: 210,
    HUESO: 211, HILO: 212, POLVORA: 213, CARNE_PODRIDA: 214,
    PERLA: 215, BOLA_SLIME: 216, TINTA: 217, PEZ_CRUDO: 218,
    PEZ_ASADO: 219, ESCAMA: 220, MEMBRANA: 221,
    // fundición y nivel de hierro
    CARBON: 222, LINGOTE_HIERRO: 223, LINGOTE_ORO: 224,
    PICO_HIERRO: 225, HACHA_HIERRO: 226, PALA_HIERRO: 227,
    ESPADA_MADERA: 228, ESPADA_PIEDRA: 229, ESPADA_HIERRO: 230,
};

/** Definiciones de item por id: nombre, tésela del sprite y herramienta. */
export const ITEM_DEFS = {
    [ITEMS.PALO]:         { name: 'Palo', tile: TILE.PALO },
    [ITEMS.PICO_MADERA]:  { name: 'Pico de madera', tile: TILE.PICO_MADERA, tool: { tipo: 'pico', factor: 2 } },
    [ITEMS.HACHA_MADERA]: { name: 'Hacha de madera', tile: TILE.HACHA_MADERA, tool: { tipo: 'hacha', factor: 2 } },
    [ITEMS.PALA_MADERA]:  { name: 'Pala de madera', tile: TILE.PALA_MADERA, tool: { tipo: 'pala', factor: 2 } },
    [ITEMS.PICO_PIEDRA]:  { name: 'Pico de piedra', tile: TILE.PICO_PIEDRA, tool: { tipo: 'pico', factor: 3 } },
    [ITEMS.HACHA_PIEDRA]: { name: 'Hacha de piedra', tile: TILE.HACHA_PIEDRA, tool: { tipo: 'hacha', factor: 3 } },
    [ITEMS.PALA_PIEDRA]:  { name: 'Pala de piedra', tile: TILE.PALA_PIEDRA, tool: { tipo: 'pala', factor: 3 } },
    [ITEMS.CUERO]:         { name: 'Cuero', tile: TILE.CUERO },
    [ITEMS.PLUMA]:         { name: 'Pluma', tile: TILE.PLUMA },
    [ITEMS.CARNE_CRUDA]:   { name: 'Carne cruda', tile: TILE.CARNE_CRUDA, food: 3 },
    [ITEMS.CARNE_ASADA]:   { name: 'Carne asada', tile: TILE.CARNE_ASADA, food: 8 },
    [ITEMS.HUESO]:         { name: 'Hueso', tile: TILE.HUESO },
    [ITEMS.HILO]:          { name: 'Hilo', tile: TILE.HILO },
    [ITEMS.POLVORA]:       { name: 'Pólvora', tile: TILE.POLVORA },
    [ITEMS.CARNE_PODRIDA]: { name: 'Carne podrida', tile: TILE.CARNE_PODRIDA, food: 2 },
    [ITEMS.PERLA]:         { name: 'Perla', tile: TILE.PERLA },
    [ITEMS.BOLA_SLIME]:    { name: 'Bola de slime', tile: TILE.BOLA_SLIME },
    [ITEMS.TINTA]:         { name: 'Tinta', tile: TILE.TINTA },
    [ITEMS.PEZ_CRUDO]:     { name: 'Pez crudo', tile: TILE.PEZ_CRUDO, food: 2 },
    [ITEMS.PEZ_ASADO]:     { name: 'Pez asado', tile: TILE.PEZ_ASADO, food: 6 },
    [ITEMS.ESCAMA]:        { name: 'Escama', tile: TILE.ESCAMA },
    [ITEMS.MEMBRANA]:      { name: 'Membrana', tile: TILE.MEMBRANA },
    [ITEMS.CARBON]:        { name: 'Carbón', tile: TILE.CARBON },
    [ITEMS.LINGOTE_HIERRO]: { name: 'Lingote de hierro', tile: TILE.LINGOTE_HIERRO },
    [ITEMS.LINGOTE_ORO]:   { name: 'Lingote de oro', tile: TILE.LINGOTE_ORO },
    [ITEMS.PICO_HIERRO]:   { name: 'Pico de hierro', tile: TILE.PICO_HIERRO, tool: { tipo: 'pico', factor: 4 } },
    [ITEMS.HACHA_HIERRO]:  { name: 'Hacha de hierro', tile: TILE.HACHA_HIERRO, tool: { tipo: 'hacha', factor: 4 } },
    [ITEMS.PALA_HIERRO]:   { name: 'Pala de hierro', tile: TILE.PALA_HIERRO, tool: { tipo: 'pala', factor: 4 } },
    [ITEMS.ESPADA_MADERA]: { name: 'Espada de madera', tile: TILE.ESPADA_MADERA, sword: 5 },
    [ITEMS.ESPADA_PIEDRA]: { name: 'Espada de piedra', tile: TILE.ESPADA_PIEDRA, sword: 6 },
    [ITEMS.ESPADA_HIERRO]: { name: 'Espada de hierro', tile: TILE.ESPADA_HIERRO, sword: 8 },
};

/**
 * Fundiciones del horno (entrada → salida, 1:1) y combustibles (usos que
 * aporta cada unidad). La interfaz del horno vive en el HUD; la fundición
 * es por sesión (sin estado por bloque: adaptación documentada).
 */
export const FUNDICIONES = [
    { in: B.IRON_ORE, out: ITEMS.LINGOTE_HIERRO },
    { in: B.GOLD_ORE, out: ITEMS.LINGOTE_ORO },
    { in: B.SAND, out: B.GLASS },
    { in: B.COBBLE, out: B.STONE },
    { in: B.LOG, out: ITEMS.CARBON },          // carbón vegetal
    { in: ITEMS.CARNE_CRUDA, out: ITEMS.CARNE_ASADA },
    { in: ITEMS.PEZ_CRUDO, out: ITEMS.PEZ_ASADO },
];

export const COMBUSTIBLES = {
    [ITEMS.CARBON]: 4,
    [B.LOG]: 2,
    [B.PLANKS]: 1,
    [ITEMS.PALO]: 1,
};

/** Funde una unidad: consume entrada y devuelve el id producido, o 0. */
export function fundir(inv, entradaId) {
    const f = FUNDICIONES.find((x) => x.in === entradaId);
    if (!f || !inv.take(entradaId, 1)) return 0;
    inv.add(f.out, 1);
    return f.out;
}

export const isItem = (id) => id >= ITEM_BASE;

/**
 * Recetario. Con forma: `pattern` (filas de caracteres; espacio = vacío) y
 * `keys` (carácter → id). Sin forma: `in` (cantidades). La progresión
 * clásica: tronco → tablones → palos → mesa (2×2) → herramientas (3×3);
 * la roca picada suelta adoquín para el salto a piedra.
 */
export const RECIPES = [
    { name: 'Tablones', out: { id: B.PLANKS, n: 4 }, in: [{ id: B.LOG, n: 1 }] },
    { name: 'Palos', out: { id: ITEMS.PALO, n: 4 }, in: [{ id: B.PLANKS, n: 2 }] },
    { name: 'Mesa de crafteo', out: { id: B.CRAFTING_TABLE, n: 1 },
        pattern: ['PP', 'PP'], keys: { P: B.PLANKS } },
    { name: 'Pico de madera', out: { id: ITEMS.PICO_MADERA, n: 1 },
        pattern: ['PPP', ' S ', ' S '], keys: { P: B.PLANKS, S: ITEMS.PALO } },
    { name: 'Hacha de madera', out: { id: ITEMS.HACHA_MADERA, n: 1 },
        pattern: ['PP', 'PS', ' S'], keys: { P: B.PLANKS, S: ITEMS.PALO } },
    { name: 'Pala de madera', out: { id: ITEMS.PALA_MADERA, n: 1 },
        pattern: ['P', 'S', 'S'], keys: { P: B.PLANKS, S: ITEMS.PALO } },
    { name: 'Pico de piedra', out: { id: ITEMS.PICO_PIEDRA, n: 1 },
        pattern: ['CCC', ' S ', ' S '], keys: { C: B.COBBLE, S: ITEMS.PALO } },
    { name: 'Hacha de piedra', out: { id: ITEMS.HACHA_PIEDRA, n: 1 },
        pattern: ['CC', 'CS', ' S'], keys: { C: B.COBBLE, S: ITEMS.PALO } },
    { name: 'Pala de piedra', out: { id: ITEMS.PALA_PIEDRA, n: 1 },
        pattern: ['C', 'S', 'S'], keys: { C: B.COBBLE, S: ITEMS.PALO } },
    { name: 'Pico de hierro', out: { id: ITEMS.PICO_HIERRO, n: 1 },
        pattern: ['HHH', ' S ', ' S '], keys: { H: ITEMS.LINGOTE_HIERRO, S: ITEMS.PALO } },
    { name: 'Hacha de hierro', out: { id: ITEMS.HACHA_HIERRO, n: 1 },
        pattern: ['HH', 'HS', ' S'], keys: { H: ITEMS.LINGOTE_HIERRO, S: ITEMS.PALO } },
    { name: 'Pala de hierro', out: { id: ITEMS.PALA_HIERRO, n: 1 },
        pattern: ['H', 'S', 'S'], keys: { H: ITEMS.LINGOTE_HIERRO, S: ITEMS.PALO } },
    { name: 'Espada de madera', out: { id: ITEMS.ESPADA_MADERA, n: 1 },
        pattern: ['P', 'P', 'S'], keys: { P: B.PLANKS, S: ITEMS.PALO } },
    { name: 'Espada de piedra', out: { id: ITEMS.ESPADA_PIEDRA, n: 1 },
        pattern: ['C', 'C', 'S'], keys: { C: B.COBBLE, S: ITEMS.PALO } },
    { name: 'Espada de hierro', out: { id: ITEMS.ESPADA_HIERRO, n: 1 },
        pattern: ['H', 'H', 'S'], keys: { H: ITEMS.LINGOTE_HIERRO, S: ITEMS.PALO } },
    { name: 'Horno', out: { id: B.FURNACE, n: 1 },
        pattern: ['CCC', 'C C', 'CCC'], keys: { C: B.COBBLE } },
    { name: 'Puerta', out: { id: B.DOOR_CLOSED, n: 1 },
        pattern: ['PP', 'PP', 'PP'], keys: { P: B.PLANKS } },
    { name: 'Valla', out: { id: B.FENCE, n: 2 },
        pattern: ['SPS', 'SPS'], keys: { S: ITEMS.PALO, P: B.PLANKS } },
    { name: 'Ventana', out: { id: B.WINDOW, n: 2 },
        pattern: ['GG', 'GG'], keys: { G: B.GLASS } },
    { name: 'Antorcha', out: { id: B.TORCH, n: 4 },
        pattern: ['C', 'S'], keys: { C: ITEMS.CARBON, S: ITEMS.PALO } },
    { name: 'Cama', out: { id: B.BED, n: 1 },
        pattern: ['WWW', 'PPP'], keys: { W: B.WOOL0, P: B.PLANKS } },
    { name: 'Librería', out: { id: B.BOOKSHELF, n: 1 }, in: [{ id: B.PLANKS, n: 6 }] },
    { name: 'Cristal', out: { id: B.GLASS, n: 1 }, in: [{ id: B.SAND, n: 2 }] },
];

// Deriva `in` (cantidades) de las recetas con forma: el recetario y
// craftable() hablan siempre en cantidades, tengan forma o no.
for (const r of RECIPES) {
    if (!r.pattern) continue;
    const n = {};
    for (const fila of r.pattern) {
        for (const ch of fila) {
            if (ch === ' ') continue;
            n[r.keys[ch]] = (n[r.keys[ch]] || 0) + 1;
        }
    }
    r.in = Object.entries(n).map(([id, cant]) => ({ id: Number(id), n: cant }));
}

/** Matriz de ids de una receta con forma. */
function matrizDe(recipe) {
    return recipe.pattern.map((fila) => [...fila].map((ch) => (ch === ' ' ? 0 : recipe.keys[ch])));
}

/** Recorta la cuadrícula a la caja mínima que contiene sus celdas ocupadas. */
function normalizar(cells, w) {
    let x0 = w, x1 = -1, y0 = w, y1 = -1;
    for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
            if (cells[y * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        }
    }
    if (x1 < 0) return null;
    const filas = [];
    for (let y = y0; y <= y1; y++) {
        const fila = [];
        for (let x = x0; x <= x1; x++) fila.push(cells[y * w + x]);
        filas.push(fila);
    }
    return filas;
}

const iguales = (a, b) =>
    a.length === b.length && a.every((fila, y) => fila.length === b[y].length && fila.every((v, x) => v === b[y][x]));
const espejo = (m) => m.map((fila) => [...fila].reverse());

/**
 * ¿Qué receta produce la disposición actual de la cuadrícula?
 * `cells` es un array de w×w ids (0 = celda vacía). Devuelve la receta o null.
 */
export function matchGrid(cells, w) {
    const g = normalizar(cells, w);
    if (!g) return null;
    const cuenta = {};
    for (const id of cells) if (id) cuenta[id] = (cuenta[id] || 0) + 1;
    for (const r of RECIPES) {
        if (r.pattern) {
            const m = matrizDe(r);
            if (iguales(g, m) || iguales(g, espejo(m))) return r;
        } else {
            const ids = Object.keys(cuenta);
            if (ids.length === r.in.length && r.in.every((i) => cuenta[i.id] === i.n)) return r;
        }
    }
    return null;
}

/**
 * Coloca la receta en una cuadrícula w×w NUEVA si cabe y las existencias
 * alcanzan (el recetario del HUD la usa para autocolocar). Devuelve el
 * array de celdas o null; NO toca el inventario (eso lo hace el caller).
 */
export function autoColocar(recipe, w, inv) {
    if (!craftable(inv, recipe)) return null;
    const cells = new Array(w * w).fill(0);
    if (recipe.pattern) {
        const m = matrizDe(recipe);
        if (m.length > w || m[0].length > w) return null; // necesita mesa
        m.forEach((fila, y) => fila.forEach((id, x) => { cells[y * w + x] = id; }));
        return cells;
    }
    const unidades = recipe.in.flatMap((i) => new Array(i.n).fill(i.id));
    if (unidades.length > w * w) return null;
    unidades.forEach((id, k) => { cells[k] = id; });
    return cells;
}

/** ¿Alcanzan las existencias del inventario para la receta? */
export function craftable(inv, recipe) {
    return recipe.in.every((ing) => inv.count(ing.id) >= ing.n);
}

/** Fabrica directo desde el inventario (pruebas y usos sin cuadrícula). */
export function craft(inv, recipe) {
    if (!craftable(inv, recipe)) return false;
    for (const ing of recipe.in) inv.take(ing.id, ing.n);
    inv.add(recipe.out.id, recipe.out.n);
    return true;
}

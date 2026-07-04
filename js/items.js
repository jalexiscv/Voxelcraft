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
};

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

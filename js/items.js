/**
 * Items y crafteo: objetos que NO son bloques (herramientas, palos) y las
 * recetas para fabricarlos fusionando materiales del inventario. Módulo puro
 * (sin DOM, probable en Node): el HUD pinta la mesa y main.js aplica reglas.
 *
 * Los ids de item viven desde ITEM_BASE (200) para no chocar jamás con los
 * ids de bloque (bytes 0..255 del mundo; los items nunca se colocan).
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
 * Recetario (sin cuadrícula: ingredientes y cantidades). La progresión
 * clásica: tronco → tablones → palos → herramientas de madera → con el
 * pico ya se pica roca (que suelta adoquín) → herramientas de piedra.
 */
export const RECIPES = [
    { name: 'Tablones', out: { id: B.PLANKS, n: 4 }, in: [{ id: B.LOG, n: 1 }] },
    { name: 'Palos', out: { id: ITEMS.PALO, n: 4 }, in: [{ id: B.PLANKS, n: 2 }] },
    { name: 'Pico de madera', out: { id: ITEMS.PICO_MADERA, n: 1 }, in: [{ id: B.PLANKS, n: 3 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Hacha de madera', out: { id: ITEMS.HACHA_MADERA, n: 1 }, in: [{ id: B.PLANKS, n: 3 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Pala de madera', out: { id: ITEMS.PALA_MADERA, n: 1 }, in: [{ id: B.PLANKS, n: 1 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Pico de piedra', out: { id: ITEMS.PICO_PIEDRA, n: 1 }, in: [{ id: B.COBBLE, n: 3 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Hacha de piedra', out: { id: ITEMS.HACHA_PIEDRA, n: 1 }, in: [{ id: B.COBBLE, n: 3 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Pala de piedra', out: { id: ITEMS.PALA_PIEDRA, n: 1 }, in: [{ id: B.COBBLE, n: 1 }, { id: ITEMS.PALO, n: 2 }] },
    { name: 'Librería', out: { id: B.BOOKSHELF, n: 1 }, in: [{ id: B.PLANKS, n: 6 }] },
    { name: 'Cristal', out: { id: B.GLASS, n: 1 }, in: [{ id: B.SAND, n: 2 }] },
];

/** ¿Alcanzan las existencias del inventario para la receta? */
export function craftable(inv, recipe) {
    return recipe.in.every((ing) => inv.count(ing.id) >= ing.n);
}

/** Fabrica: consume los ingredientes y añade el producto. */
export function craft(inv, recipe) {
    if (!craftable(inv, recipe)) return false;
    for (const ing of recipe.in) inv.take(ing.id, ing.n);
    inv.add(recipe.out.id, recipe.out.n);
    return true;
}

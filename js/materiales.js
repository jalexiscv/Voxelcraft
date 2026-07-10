/**
 * Plan de asignación de los materiales generados (js/materiales.data.js).
 *
 * Fuente ÚNICA de verdad para los números de id de bloque y de tésela de atlas
 * de cada material del paquete de texturas real. Tanto blocks.js (ids + defs)
 * como atlas.pngtiles.js (téselas → PNG) importan de aquí, así ambos coinciden.
 *
 * Asignación determinista por orden de MATERIALES:
 *   - id de bloque: MAT_ID_BASE + índice del material. Base 128 → deja libres
 *     los ids 88..127 para materiales añadidos a mano. Todos caben de sobra en
 *     los 16 bits por celda (world.js).
 *   - téselas: cada CARA ÚNICA (path de PNG) recibe una tésela correlativa a
 *     partir de MAT_TILE_BASE. Dos materiales que comparten un PNG comparten
 *     tésela (p. ej. varias variantes que reusan la misma cara).
 */
import { MATERIALES } from './materiales.data.js';

export const MAT_ID_BASE = 128;   // primer id de bloque para materiales generados
export const MAT_TILE_BASE = 200; // primera tésela de atlas para sus PNG

/** Nombre de PNG de una cara ('top'|'side'|'bottom') de un material. */
function pngDeCara(tex, cara) {
    if (typeof tex === 'string') return tex;
    if (cara === 'bottom') return tex.bottom || tex.top || tex.side;
    if (cara === 'top') return tex.top || tex.side;
    return tex.side || tex.top; // side
}

// ---- Índice de téselas: cada PNG único → una tésela correlativa ----
const pngPorTesela = {};        // índice de tésela → nombre de PNG (para atlas.pngtiles)
const teselaPorPng = new Map(); // nombre de PNG → índice de tésela (dedup)
let siguienteTesela = MAT_TILE_BASE;
const teselaDePng = (png) => {
    if (teselaPorPng.has(png)) return teselaPorPng.get(png);
    const t = siguienteTesela++;
    teselaPorPng.set(png, t);
    pngPorTesela[t] = png;
    return t;
};

/**
 * Lista enriquecida de materiales lista para registrar: cada uno con su id de
 * bloque y sus téselas top/side/bottom ya resueltas (números de tésela).
 */
export const MATERIALES_PLAN = MATERIALES.map((m, i) => ({
    key: m.key,
    name: m.name,
    flags: m.flags || {},
    id: MAT_ID_BASE + i,
    top: teselaDePng(pngDeCara(m.tex, 'top')),
    side: teselaDePng(pngDeCara(m.tex, 'side')),
    bottom: teselaDePng(pngDeCara(m.tex, 'bottom')),
}));

/** índice de tésela → nombre de PNG, para el registro del atlas. */
export const MAT_PNG_TILES = pngPorTesela;

/** Nº de téselas únicas consumidas (para verificar que caben en la rejilla). */
export const MAT_TILE_COUNT = siguienteTesela - MAT_TILE_BASE;

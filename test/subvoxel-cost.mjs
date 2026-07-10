/**
 * PROTOTIPO DE COSTE — Sub-voxelización 8×8×8 global (experimento aislado).
 *
 * NO forma parte del juego. Mide, sobre UN chunk real generado por el propio
 * worldgen, el coste de convertir cada bloque en una rejilla N×N×N de
 * sub-vóxeles con color real de textura, y lo extrapola a la escena completa.
 * Objetivo: decidir con datos si "todo el mundo sub-voxelizado siempre" es
 * viable en un navegador antes de comprometer semanas de reescritura.
 *
 * Uso:  node test/subvoxel-cost.mjs [N]     (N = subdivisiones por eje, def 8)
 *
 * Métricas:
 *   1. Datos por chunk: ids (1 B/sub-vóxel) + color RGB (3 B/sub-vóxel).
 *   2. Sub-mallado con culling interior: ms y nº de triángulos emitidos.
 *   3. Extrapolación a 361 chunks (distancia de render 8 + 1 de margen).
 */
import { performance } from 'node:perf_hooks';
import { Generator, CHUNK, SY } from '../js/worldgen.js';
import { B, DEFS } from '../js/blocks.js';
import { TILE_PX, painters } from '../js/atlas.js';
import { PRNG } from '../js/noise.js';

const N = Math.max(2, Math.min(16, parseInt(process.argv[2] || '8', 10)));
const SUB = N * N * N;                 // sub-vóxeles por bloque
const RENDER_CHUNKS = (2 * (8 + 1) + 1) ** 2; // 361 a distancia 8 + 1 margen

/* ---- Téselas reales del atlas (mismo pintor que el juego, sin DOM) ---- */
// Réplica mínima de la clase Tile (no exportada) para correr los painters.
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
    noiseFill(base, spread, alpha = 255) {
        for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++) {
            const d = Math.floor((this.rng.float() * 2 - 1) * spread);
            this.px(x, y, base[0] + d, base[1] + d, base[2] + d, alpha);
        }
    }
    speckle(count, color, alpha = 255) {
        for (let i = 0; i < count; i++)
            this.px(this.rng.int(TILE_PX), this.rng.int(TILE_PX), color[0], color[1], color[2], alpha);
    }
}

// Pinta una tésela por índice; cae a un gris plano si no hay painter (items, etc.).
const tileCache = new Map();
function tilePixels(idx) {
    if (tileCache.has(idx)) return tileCache.get(idx);
    const t = new Tile(1000 + idx);
    if (painters[idx]) { try { painters[idx](t); } catch { t.noiseFill([127, 127, 127], 8); } }
    else t.noiseFill([127, 127, 127], 8);
    tileCache.set(idx, t.data);
    return t.data;
}

// Color RGB del sub-vóxel (sx,sy,sz) de un bloque, muestreando la cara que
// corresponde a su eje dominante (top/side/bottom) del atlas 16×16 → N×N.
function subColor(id, sx, sy, sz) {
    const def = DEFS[id];
    // eje de textura: usamos 'top' para la capa superior, 'bottom' abajo, 'side' resto
    const tile = sy === N - 1 ? def.top : (sy === 0 ? def.bottom : def.side);
    const px = tilePixels(tile);
    // submuestreo 16→N sobre el plano horizontal (x,z) de la cara
    const tx = Math.min(TILE_PX - 1, Math.floor((sx + 0.5) / N * TILE_PX));
    const tz = Math.min(TILE_PX - 1, Math.floor((sz + 0.5) / N * TILE_PX));
    const i = (tz * TILE_PX + tx) * 4;
    return [px[i], px[i + 1], px[i + 2]];
}

/* ---- 1. Generar un chunk real ---- */
const gen = new Generator(12345);
const t0 = performance.now();
const blocks = gen.generateChunk(0, 0);   // Uint8Array CHUNK*SY*CHUNK
const tGen = performance.now() - t0;
const li = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;

// ¿cuántos bloques no-aire? (los únicos que se sub-voxelizan)
let solidos = 0;
for (let i = 0; i < blocks.length; i++) if (blocks[i] !== B.AIR) solidos++;

/* ---- 2. Sub-voxelizar: construir ids + color por sub-vóxel ---- */
// Rejilla del chunk a resolución sub: (CHUNK*N) × (SY*N) × (CHUNK*N)
const SW = CHUNK * N, SH = SY * N;
const totalSub = SW * SH * SW;
const subId = new Uint8Array(totalSub);           // 1 B/sub-vóxel
const subRGB = new Uint8Array(totalSub * 3);      // 3 B/sub-vóxel (color real)
const sIdx = (x, y, z) => (y * SW + z) * SW + x;

const tSub0 = performance.now();
let subSolidos = 0;
for (let lx = 0; lx < CHUNK; lx++)
    for (let lz = 0; lz < CHUNK; lz++)
        for (let y = 0; y < SY; y++) {
            const id = blocks[li(lx, y, lz)];
            if (id === B.AIR) continue;
            for (let sx = 0; sx < N; sx++)
                for (let sy = 0; sy < N; sy++)
                    for (let sz = 0; sz < N; sz++) {
                        const gx = lx * N + sx, gy = y * N + sy, gz = lz * N + sz;
                        const k = sIdx(gx, gy, gz);
                        subId[k] = id;
                        const [r, g, b] = subColor(id, sx, sy, sz);
                        subRGB[k * 3] = r; subRGB[k * 3 + 1] = g; subRGB[k * 3 + 2] = b;
                        subSolidos++;
                    }
        }
const tSubFill = performance.now() - tSub0;

/* ---- 3. Sub-mallado con culling interior (coste por frame real) ---- */
// Solo emitimos una cara cuando el sub-vóxel vecino es aire → superficie real.
const solid = (x, y, z) =>
    x >= 0 && y >= 0 && z >= 0 && x < SW && y < SH && z < SW && subId[sIdx(x, y, z)] !== 0;
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const tMesh0 = performance.now();
let caras = 0;
for (let y = 0; y < SH; y++)
    for (let z = 0; z < SW; z++)
        for (let x = 0; x < SW; x++) {
            if (subId[sIdx(x, y, z)] === 0) continue;
            for (const [dx, dy, dz] of DIRS)
                if (!solid(x + dx, y + dy, z + dz)) caras++;
        }
const tMesh = performance.now() - tMesh0;
const tris = caras * 2;
const verts = caras * 4;

/* ---- Comparación: mallado ACTUAL del mismo chunk (bloques enteros) ---- */
// Recreamos el culling a resolución de bloque para tener la línea base.
const bsolid = (x, y, z) =>
    x >= 0 && y >= 0 && z >= 0 && x < CHUNK && y < SY && z < CHUNK && blocks[li(x, y, z)] !== 0;
let carasBase = 0;
for (let y = 0; y < SY; y++)
    for (let z = 0; z < CHUNK; z++)
        for (let x = 0; x < CHUNK; x++) {
            if (blocks[li(x, y, z)] === 0) continue;
            for (const [dx, dy, dz] of DIRS) if (!bsolid(x + dx, y + dy, z + dz)) carasBase++;
        }

/* ---- Informe ---- */
const MB = (b) => (b / 1e6).toFixed(1);
const GB = (b) => (b / 1e9).toFixed(1);
const bytesChunk = subId.byteLength + subRGB.byteLength;
// malla GPU: stride típico de tu formato ~6 floats/vért en el juego; aquí
// pos(3)+color(3)=6 floats/vért = 24 B/vért como estimación conservadora.
const bytesMallaChunk = verts * 6 * 4;

console.log(`\n=== PROTOTIPO DE COSTE — sub-voxelización ${N}×${N}×${N} (${SUB}/bloque) ===\n`);
console.log(`Chunk de muestra: ${CHUNK}×${SY}×${CHUNK} = ${(CHUNK * SY * CHUNK).toLocaleString()} celdas`);
console.log(`  bloques no-aire:      ${solidos.toLocaleString()}  (${(100 * solidos / blocks.length).toFixed(0)}% lleno)`);
console.log(`  generación:           ${tGen.toFixed(1)} ms\n`);

console.log(`--- DATOS por chunk (todo el chunk sub-voxelizado) ---`);
console.log(`  sub-vóxeles totales:  ${totalSub.toLocaleString()}`);
console.log(`  sub-vóxeles sólidos:  ${subSolidos.toLocaleString()}`);
console.log(`  ids (1 B):            ${MB(subId.byteLength)} MB`);
console.log(`  color RGB (3 B):      ${MB(subRGB.byteLength)} MB`);
console.log(`  TOTAL datos/chunk:    ${MB(bytesChunk)} MB`);
console.log(`  llenado sub-vóxeles:  ${tSubFill.toFixed(0)} ms\n`);

console.log(`--- MALLADO (coste por frame al remallar un chunk) ---`);
console.log(`  caras base (bloques): ${carasBase.toLocaleString()}  → ${(carasBase * 2).toLocaleString()} tris`);
console.log(`  caras sub-voxel:      ${caras.toLocaleString()}  → ${tris.toLocaleString()} tris`);
console.log(`  factor de triángulos: ×${(caras / carasBase).toFixed(0)}`);
console.log(`  tiempo sub-mallado:   ${tMesh.toFixed(0)} ms   (tu mallado actual: ~2–11 ms)`);
console.log(`  malla GPU/chunk:      ${MB(bytesMallaChunk)} MB\n`);

console.log(`--- EXTRAPOLACIÓN a la escena (${RENDER_CHUNKS} chunks, dist. render 8) ---`);
console.log(`  datos en RAM:         ${GB(bytesChunk * RENDER_CHUNKS)} GB`);
console.log(`  mallas en GPU:        ${GB(bytesMallaChunk * RENDER_CHUNKS)} GB`);
console.log(`  triángulos en escena: ${((tris * RENDER_CHUNKS) / 1e6).toFixed(0)} M`);
console.log(`  presupuesto navegador: ~1–2 GB RAM / ~1–4 M tris fluidos\n`);

const cabe = (bytesChunk + bytesMallaChunk) * RENDER_CHUNKS < 2e9;
console.log(`VEREDICTO: ${cabe ? '✅ cabría' : '❌ NO cabe en el presupuesto de un navegador'}`);

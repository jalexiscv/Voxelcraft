/**
 * Mundo infinito: mapa disperso de chunks de 16×16×64 creados bajo demanda.
 * Cada chunk guarda sus bloques, su mapa de alturas para la luz solar y si
 * fue modificado por el jugador (solo esos se persisten; el resto se
 * regenera de la semilla).
 *
 * Coordenadas globales x/z ilimitadas (negativos incluidos): chunk = x >> 4,
 * local = x & 15. Índice dentro del chunk: (y·16 + lz)·16 + lx.
 */
import { B, DEFS } from './blocks.js';

export const CHUNK = 16;
export const WORLD_HEIGHT = 64;

export const chunkKey = (cx, cz) => cx + ',' + cz;

export class World {
    constructor(seed) {
        this.seed = seed;
        this.sy = WORLD_HEIGHT;
        this.chunks = new Map();  // "cx,cz" → {blocks, heights, modified}
        this.dirty = new Set();   // chunks pendientes de remallado
    }

    hasChunk(cx, cz) { return this.chunks.has(chunkKey(cx, cz)); }

    /** Incorpora un chunk generado (o cargado; `modified` si viene de guardado). */
    addChunk(cx, cz, blocks, modified = false) {
        const chunk = { blocks, heights: new Int16Array(CHUNK * CHUNK).fill(-1), modified };
        this.chunks.set(chunkKey(cx, cz), chunk);
        for (let lx = 0; lx < CHUNK; lx++) {
            for (let lz = 0; lz < CHUNK; lz++) this.updateColumnHeight(chunk, lx, lz);
        }
    }

    /** Id de bloque; chunks no generados y fuera de rango vertical: aire. */
    get(x, y, z) {
        if (y < 0 || y >= this.sy) return B.AIR;
        const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
        if (!c) return B.AIR;
        return c.blocks[(y * CHUNK + (z & 15)) * CHUNK + (x & 15)];
    }

    /**
     * Solidez para la física: un chunk aún no generado es una barrera sólida
     * (el jugador no puede adelantarse a la generación y caer al vacío).
     */
    solidAt(x, y, z) {
        if (y < 0 || y >= this.sy) return false;
        const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
        if (!c) return true;
        return DEFS[c.blocks[(y * CHUNK + (z & 15)) * CHUNK + (x & 15)]].solid;
    }

    /**
     * Escribe un bloque (solo en chunks generados), marca el chunk como
     * modificado por el jugador y encola el remallado del chunk y de los
     * vecinos afectados si la celda está en un borde.
     */
    set(x, y, z, id) {
        if (y < 0 || y >= this.sy) return;
        const cx = x >> 4, cz = z >> 4;
        const c = this.chunks.get(chunkKey(cx, cz));
        if (!c) return;
        const lx = x & 15, lz = z & 15;
        c.blocks[(y * CHUNK + lz) * CHUNK + lx] = id;
        c.modified = true;
        this.updateColumnHeight(c, lx, lz);

        this.dirty.add(chunkKey(cx, cz));
        if (lx === 0) this.dirty.add(chunkKey(cx - 1, cz));
        if (lx === CHUNK - 1) this.dirty.add(chunkKey(cx + 1, cz));
        if (lz === 0) this.dirty.add(chunkKey(cx, cz - 1));
        if (lz === CHUNK - 1) this.dirty.add(chunkKey(cx, cz + 1));
    }

    updateColumnHeight(chunk, lx, lz) {
        for (let y = this.sy - 1; y >= 0; y--) {
            if (DEFS[chunk.blocks[(y * CHUNK + lz) * CHUNK + lx]].opaque) {
                chunk.heights[lz * CHUNK + lx] = y;
                return;
            }
        }
        chunk.heights[lz * CHUNK + lx] = -1;
    }

    /** ¿Recibe luz solar directa? (chunks no generados: sí). */
    sunlit(x, y, z) {
        const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
        if (!c) return true;
        return y > c.heights[(z & 15) * CHUNK + (x & 15)];
    }

    /** y de la superficie sólida más alta (0 si la columna no existe). */
    surfaceY(x, z) {
        for (let y = this.sy - 1; y >= 0; y--) {
            if (DEFS[this.get(x, y, z)].solid) return y;
        }
        return 0;
    }

    /** ¿Existen el chunk y sus 8 vecinos? (requisito para mallarlo). */
    meshable(cx, cz) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (!this.chunks.has(chunkKey(cx + dx, cz + dz))) return false;
            }
        }
        return true;
    }
}

/* ---- Compresión RLE para persistir chunks ---- */

/** Comprime bytes como pares (longitud ≤255, valor). */
export function rleEncode(bytes) {
    const out = [];
    let i = 0;
    while (i < bytes.length) {
        const v = bytes[i];
        let run = 1;
        while (i + run < bytes.length && bytes[i + run] === v && run < 255) run++;
        out.push(run, v);
        i += run;
    }
    return new Uint8Array(out);
}

export function rleDecode(encoded, expectedLength) {
    const out = new Uint8Array(expectedLength);
    let o = 0;
    for (let i = 0; i < encoded.length; i += 2) {
        out.fill(encoded[i + 1], o, o + encoded[i]);
        o += encoded[i];
    }
    if (o !== expectedLength) throw new Error('Guardado corrupto: longitud RLE inesperada');
    return out;
}

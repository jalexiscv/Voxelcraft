/**
 * Mundo infinito: mapa disperso de chunks de 16×16×64 creados bajo demanda.
 * Cada chunk guarda sus bloques, su mapa de alturas para la luz solar, su
 * campo de luz de bloque (antorchas/lava, niveles 0..15) y si fue modificado
 * por el jugador (solo esos se persisten; el resto se regenera de la semilla).
 *
 * Coordenadas globales x/z ilimitadas (negativos incluidos): chunk = x >> 4,
 * local = x & 15. Índice dentro del chunk: (y·16 + lz)·16 + lx.
 */
import { B, DEFS, esLava } from './blocks.js';
import { CHUNK, WORLD_HEIGHT, Y_BASE } from './dimensiones.js';
import { ChunkPaletizado, LuzSeccionada } from './secciones.js';

// re-export: los consumidores históricos (storage, main, mesher…) las
// importan de aquí; la fuente única es js/dimensiones.js
export { CHUNK, WORLD_HEIGHT, Y_BASE };

export const chunkKey = (cx, cz) => cx + ',' + cz;

/* ---- Luz de bloque (antorchas y lava iluminan su entorno) ----
 *
 * Cada chunk lleva un Uint8Array paralelo a `blocks` con el nivel de luz
 * 0..15 de cada celda. Las fuentes son los bloques con DEFS[id].bright
 * (antorcha 14, lava 15) y la luz se propaga por BFS restando 1 por bloque
 * a través de celdas no opacas. El campo se recalcula perezosamente: al
 * añadir un chunk o editar cerca de una fuente solo se marca `lightDirty`,
 * y la primera consulta (blockLightAt, que usa el mallador) lo reconstruye
 * tomando también las fuentes de los chunks vecinos dentro del radio.
 */
const LIGHT_PAD = 15;                 // alcance máximo de una fuente (nivel 15 → 14 pasos)
const LGW = CHUNK + LIGHT_PAD * 2;    // ancho de la región de propagación (46)

// tablas planas por id (más rápidas que DEFS[id].x en los bucles calientes)
const EMIT = new Uint8Array(DEFS.length);   // nivel de emisión: lava 15, antorcha 14
const OPACO = new Uint8Array(DEFS.length);  // 1 si el bloque corta la luz
for (let i = 0; i < DEFS.length; i++) {
    if (!DEFS[i]) continue;
    OPACO[i] = DEFS[i].opaque ? 1 : 0;
    EMIT[i] = DEFS[i].bright ? (esLava(i) ? 15 : 14) : 0;
}

// región de trabajo reutilizada entre recálculos (sin basura por llamada)
const luzRegion = new Uint8Array(LGW * WORLD_HEIGHT * LGW);
const colasLuz = Array.from({ length: 16 }, () => []); // cubetas BFS por nivel
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export class World {
    constructor(seed) {
        this.seed = seed;
        this.sy = WORLD_HEIGHT;
        this.chunks = new Map();  // "cx,cz" → {blocks, heights, modified}
        this.dirty = new Set();   // chunks pendientes de remallado
        // estado por posición de los bloques con contenido (cofres):
        // "x,y,z" → objeto plano serializable (viaja tal cual al guardado)
        this.blockData = new Map();
        // celda [x,y,z] que se está tallando (picado con cráter): el mesher
        // la omite de la malla del chunk y renderer.drawCarve la dibuja aparte.
        // null cuando no hay picado con cráter en curso.
        this.carveHidden = null;
    }

    /** Estado extra del bloque en esa posición, o null si no tiene. */
    getBlockData(x, y, z) {
        return this.blockData.get(x + ',' + y + ',' + z) || null;
    }

    /** Asocia un objeto plano serializable a la posición (null lo borra). */
    setBlockData(x, y, z, data) {
        const key = x + ',' + y + ',' + z;
        if (data === null || data === undefined) this.blockData.delete(key);
        else this.blockData.set(key, data);
    }

    hasChunk(cx, cz) { return this.chunks.has(chunkKey(cx, cz)); }

    /** Incorpora un chunk generado (o cargado; `modified` si viene de guardado). */
    addChunk(cx, cz, blocks, modified = false) {
        const chunk = {
            // el generador y el guardado hablan arrays planos; aquí se
            // paletiza por secciones (js/secciones.js) — el cielo y la roca
            // uniforme dejan de ocupar memoria
            blocks: blocks instanceof ChunkPaletizado ? blocks : new ChunkPaletizado(blocks),
            heights: new Int16Array(CHUNK * CHUNK).fill(-1),
            light: new LuzSeccionada(), // luz de bloque 0..15, seccionada (vacía = 0 B)
            lightDirty: true,           // se calcula en la 1ª consulta
            modified,
        };
        this.chunks.set(chunkKey(cx, cz), chunk);
        for (let lx = 0; lx < CHUNK; lx++) {
            for (let lz = 0; lz < CHUNK; lz++) this.updateColumnHeight(chunk, lx, lz);
        }
        // las fuentes del chunk nuevo pueden alcanzar a los vecinos ya cargados
        // (aún sin mallar: el mallado exige el vecindario 3×3 completo)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const n = this.chunks.get(chunkKey(cx + dx, cz + dz));
                if (n && (dx || dz)) n.lightDirty = true;
            }
        }
    }

    /** Id de bloque; chunks no generados y fuera de rango vertical: aire. */
    get(x, y, z) {
        if (y < 0 || y >= this.sy) return B.AIR;
        const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
        if (!c) return B.AIR;
        return c.blocks.get((y * CHUNK + (z & 15)) * CHUNK + (x & 15));
    }

    /**
     * Solidez para la física: un chunk aún no generado es una barrera sólida
     * (el jugador no puede adelantarse a la generación y caer al vacío).
     */
    solidAt(x, y, z) {
        if (y < 0 || y >= this.sy) return false;
        const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
        if (!c) return true;
        return DEFS[c.blocks.get((y * CHUNK + (z & 15)) * CHUNK + (x & 15))].solid;
    }

    /**
     * Id si TODA la sección vertical s (bloques y en [s·16, s·16+16)) del
     * chunk es un único bloque, o −1 si es mixta o el chunk no existe. El
     * mesher lo usa para saltarse el cielo entero de un golpe.
     */
    seccionUniforme(cx, cz, s) {
        const c = this.chunks.get(chunkKey(cx, cz));
        return c ? c.blocks.uniformeDe(s) : -1;
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
        const idx = (y * CHUNK + lz) * CHUNK + lx;
        const viejo = c.blocks.get(idx);
        // ¿afecta a la luz de bloque? Solo si cambia una fuente, o si cambia
        // la opacidad donde ya circulaba luz (consultado ANTES de escribir).
        const tocaLuz = EMIT[viejo] !== EMIT[id] ||
            (OPACO[viejo] !== OPACO[id] && this.hayLuzCerca(x, y, z));
        c.blocks.set(idx, id);
        c.modified = true;
        this.updateColumnHeight(c, lx, lz);
        // romper el bloque descarta su estado (el contenido del cofre se
        // reparte como drops ANTES de llamar a set; aquí solo se limpia)
        if (id === B.AIR) this.blockData.delete(x + ',' + y + ',' + z);

        this.dirty.add(chunkKey(cx, cz));
        if (lx === 0) this.dirty.add(chunkKey(cx - 1, cz));
        if (lx === CHUNK - 1) this.dirty.add(chunkKey(cx + 1, cz));
        if (lz === 0) this.dirty.add(chunkKey(cx, cz - 1));
        if (lz === CHUNK - 1) this.dirty.add(chunkKey(cx, cz + 1));

        if (tocaLuz) {
            c.lightDirty = true;
            // vecinos alcanzables por la luz (la fuente a <15 del borde los toca):
            // distancia Manhattan en x/z desde la celda hasta el chunk vecino
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (!dx && !dz) continue;
                    const n = this.chunks.get(chunkKey(cx + dx, cz + dz));
                    if (!n) continue;
                    const dX = dx < 0 ? lx + 1 : (dx > 0 ? CHUNK - lx : 0);
                    const dZ = dz < 0 ? lz + 1 : (dz > 0 ? CHUNK - lz : 0);
                    if (dX + dZ > LIGHT_PAD - 1) continue;
                    n.lightDirty = true;
                    this.dirty.add(chunkKey(cx + dx, cz + dz)); // remallar el brillo
                }
            }
        }

        // gancho opcional (multijugador): notifica la edición YA aplicada,
        // con el id anterior por si el oyente necesita distinguir alta/baja
        if (this.onSet) this.onSet(x, y, z, id, viejo);
        // gancho opcional (fluidos, js/fluidos.js): despierta a los líquidos
        // del entorno; solo existe donde corresponde simular (local/servidor)
        if (this.fluidos) this.fluidos.tocar(x, y, z);
    }

    /** ¿Hay luz de bloque en la celda o en alguna de sus 6 vecinas? */
    hayLuzCerca(x, y, z) {
        if (this.blockLightAt(x, y, z) > 0) return true;
        for (const [dx, dy, dz] of DIRS) {
            if (this.blockLightAt(x + dx, y + dy, z + dz) > 0) return true;
        }
        return false;
    }

    /** Luz de bloque 0..15 de una celda (0 fuera de chunks o del rango vertical). */
    blockLightAt(x, y, z) {
        if (y < 0 || y >= this.sy) return 0;
        const cx = x >> 4, cz = z >> 4;
        const c = this.chunks.get(chunkKey(cx, cz));
        if (!c) return 0;
        if (c.lightDirty) this.recomputeChunkLight(cx, cz);
        return c.light.get((y * CHUNK + (z & 15)) * CHUNK + (x & 15));
    }

    /**
     * Reconstruye el campo de luz de bloque de un chunk: siembra todas las
     * fuentes (propias y de los vecinos cargados dentro del radio de 15) en
     * una región 46×64×46 y propaga por BFS de cubetas descendentes (las
     * fuentes altas primero, así cada celda recibe su nivel máximo una vez).
     */
    recomputeChunkLight(cx, cz) {
        const c = this.chunks.get(chunkKey(cx, cz));
        if (!c) return;
        c.lightDirty = false;
        const sy = this.sy;
        const gx0 = cx * CHUNK - LIGHT_PAD, gz0 = cz * CHUNK - LIGHT_PAD;

        // vecindario 3×3 de chunks paletizados (la región de 46 cabe en él)
        const hood = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const n = this.chunks.get(chunkKey(cx + dx, cz + dz));
                hood.push(n ? n.blocks : null);
            }
        }

        // 1) recolecta de semillas ANTES de tocar la región: fuentesDeLuz
        // salta por paleta las secciones sin emisores, así el caso común
        // (ninguna lava/antorcha en el vecindario) sale gratis por abajo.
        // También acota la ventana vertical alcanzable (semillas ±15).
        const semillas = []; // pares aplanados [idxRegión, nivel, ...]
        let yMin = sy, yMax = -1;
        for (let h = 0; h < 9; h++) {
            const blocks = hood[h];
            if (!blocks) continue;
            const bx0 = (cx + ((h / 3 | 0) - 1)) * CHUNK - gx0;
            const bz0 = (cz + (h % 3 - 1)) * CHUNK - gz0;
            for (const [i, nivel] of blocks.fuentesDeLuz(EMIT)) {
                const rx = bx0 + (i & 15), rz = bz0 + ((i >> 4) & 15);
                if (rx < 0 || rx >= LGW || rz < 0 || rz >= LGW) continue;
                const y = i >> 8;
                semillas.push(((y * LGW + rz) * LGW + rx), nivel);
                if (y < yMin) yMin = y;
                if (y > yMax) yMax = y;
            }
        }

        c.light.limpiar(); // campo vacío: las secciones vuelven a costar 0 B
        if (semillas.length === 0) return; // sin fuentes: listo, sin BFS ni volcado

        luzRegion.fill(0);
        for (const cola of colasLuz) cola.length = 0;
        for (let k = 0; k < semillas.length; k += 2) {
            const idx = semillas[k], nivel = semillas[k + 1];
            if (luzRegion[idx] < nivel) { luzRegion[idx] = nivel; colasLuz[nivel].push(idx); }
        }

        // id de bloque por coordenada global (chunks no cargados: aire)
        const idAt = (gx, y, gz) => {
            const blocks = hood[((gx >> 4) - cx + 1) * 3 + ((gz >> 4) - cz + 1)];
            return blocks ? blocks.get((y * CHUNK + (gz & 15)) * CHUNK + (gx & 15)) : B.AIR;
        };

        // 2) propagación: −1 por paso a través de celdas no opacas
        for (let nivel = 15; nivel >= 2; nivel--) {
            const cola = colasLuz[nivel];
            for (let qi = 0; qi < cola.length; qi++) {
                const idx = cola[qi];
                if (luzRegion[idx] !== nivel) continue; // superada por otra fuente
                const rx = idx % LGW, resto = (idx / LGW) | 0;
                const rz = resto % LGW, y = (resto / LGW) | 0;
                for (const [dx, dy, dz] of DIRS) {
                    const nx = rx + dx, ny = y + dy, nz = rz + dz;
                    if (nx < 0 || nx >= LGW || ny < 0 || ny >= sy || nz < 0 || nz >= LGW) continue;
                    const nIdx = (ny * LGW + nz) * LGW + nx;
                    if (luzRegion[nIdx] >= nivel - 1) continue;
                    if (OPACO[idAt(gx0 + nx, ny, gz0 + nz)]) continue;
                    luzRegion[nIdx] = nivel - 1;
                    colasLuz[nivel - 1].push(nIdx);
                }
            }
        }

        // 3) volcado de la ventana central SOLO en el rango y alcanzable
        // (semillas ±15); escribir únicamente niveles > 0 mantiene vacías
        // las secciones sin luz (LuzSeccionada no asigna nada con 0)
        yMin = Math.max(0, yMin - LIGHT_PAD);
        yMax = Math.min(sy - 1, yMax + LIGHT_PAD);
        const light = c.light;
        for (let y = yMin; y <= yMax; y++) {
            for (let lz = 0; lz < CHUNK; lz++) {
                const rBase = (y * LGW + lz + LIGHT_PAD) * LGW + LIGHT_PAD;
                const cBase = (y * CHUNK + lz) * CHUNK;
                for (let lx = 0; lx < CHUNK; lx++) {
                    const v = luzRegion[rBase + lx];
                    if (v) light.set(cBase + lx, v);
                }
            }
        }
    }

    updateColumnHeight(chunk, lx, lz) {
        // topeOpaco baja sección a sección: el cielo (aire uniforme) se salta
        // de 16 en 16 y las secciones sin opacos se descartan por paleta
        chunk.heights[lz * CHUNK + lx] = chunk.blocks.topeOpaco(lx, lz, OPACO);
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

/* ---- Compresión RLE para persistir chunks ----
 *
 * Los ids de bloque son de 16 bits (hasta 65535 tipos), así que el RLE
 * serializa a un Uint16Array con pares (longitud, valor), ambos de 16 bits.
 * La longitud llega hasta 65535 (un chunk son 16384 celdas, así que una
 * columna uniforme cabe entera en un par). IndexedDB clona el typed array
 * tal cual, sin base64 ni empaquetado manual.
 */

/** Comprime un Uint16Array de ids como pares (longitud ≤65535, valor). */
export function rleEncode(cells) {
    const out = [];
    let i = 0;
    while (i < cells.length) {
        const v = cells[i];
        let run = 1;
        while (i + run < cells.length && cells[i + run] === v && run < 65535) run++;
        out.push(run, v);
        i += run;
    }
    return new Uint16Array(out);
}

export function rleDecode(encoded, expectedLength) {
    const out = new Uint16Array(expectedLength);
    let o = 0;
    for (let i = 0; i < encoded.length; i += 2) {
        out.fill(encoded[i + 1], o, o + encoded[i]);
        o += encoded[i];
    }
    if (o !== expectedLength) throw new Error('Guardado corrupto: longitud RLE inesperada');
    return out;
}

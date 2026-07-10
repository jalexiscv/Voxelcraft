/**
 * Almacenamiento paletizado de chunks por SECCIONES, como el Minecraft real:
 * el chunk de 16×384×16 se divide en 24 secciones de 16×16×16 (4096 celdas)
 * y cada sección guarda una PALETA (los ids distintos que contiene) y las
 * celdas como índices en esa paleta, empaquetados al ancho mínimo:
 *
 *   bits 0  — sección UNIFORME (todo aire, toda piedra…): solo la paleta de
 *             una entrada, sin array de celdas. Es el caso dominante: el
 *             cielo entero y la roca profunda sin cuevas no ocupan nada.
 *   bits 4  — paleta ≤ 16: nibbles en un Uint8Array de 2048 B (subsuelo
 *             típico: piedra + menas + aire de cueva).
 *   bits 8  — paleta ≤ 256: un byte por celda (4096 B; superficies variadas).
 *   bits 16 — más de 256 ids distintos en 4096 celdas (rarísimo): ids crudos
 *             sin paleta, como el array plano clásico.
 *
 * Frente al array plano de 192 KB por chunk, un chunk normal queda en unos
 * pocos KB. El módulo es puro (sin DOM, probable en Node); la conversión
 * plano⇄secciones vive aquí: el generador y el guardado RLE siguen hablando
 * arrays planos (mismo formato en disco, sin migración).
 *
 * Índice plano i = (y·16 + lz)·16 + lx: cada sección son 4096 índices
 * CONTIGUOS (sección s ⇔ i en [s·4096, (s+1)·4096)), así que i>>>12 da la
 * sección e (i & 4095) la celda local — sin aritmética extra.
 */
import { CHUNK, WORLD_HEIGHT } from './dimensiones.js';

export const SECCION_H = 16;                              // alto de una sección
export const CELDAS_SECCION = CHUNK * CHUNK * SECCION_H;  // 4096
export const NUM_SECCIONES = WORLD_HEIGHT / SECCION_H;    // 24
const TOTAL = CHUNK * WORLD_HEIGHT * CHUNK;               // 98304 celdas/chunk

/** Una sección de 4096 celdas con paleta e índices al ancho mínimo. */
class Seccion {
    constructor(id = 0) {
        this.pal = [id];   // paleta: pal[índice] = id de bloque (null en bits 16)
        this.bits = 0;     // 0 | 4 | 8 | 16
        this.datos = null; // null | Uint8Array(2048) | Uint8Array(4096) | Uint16Array(4096)
    }

    /** Id de bloque de la celda local j (0..4095). */
    get(j) {
        const b = this.bits;
        if (b === 0) return this.pal[0];
        if (b === 4) return this.pal[(j & 1) ? (this.datos[j >> 1] >> 4) : (this.datos[j >> 1] & 15)];
        if (b === 8) return this.pal[this.datos[j]];
        return this.datos[j]; // 16: ids crudos
    }

    /** Escribe el id en la celda local j, ensanchando paleta/datos si toca. */
    set(j, id) {
        if (this.bits === 0) {
            if (id === this.pal[0]) return;          // sigue uniforme
            this.datos = new Uint8Array(CELDAS_SECCION / 2); // nibbles a 0 = pal[0]
            this.bits = 4;
        }
        if (this.bits === 16) { this.datos[j] = id; return; }
        let idx = this.pal.indexOf(id);              // paleta corta: lineal basta
        if (idx === -1) {
            if (this.bits === 4 && this.pal.length >= 16) this.ensanchar8();
            if (this.bits === 8 && this.pal.length >= 256) {
                this.ensanchar16();
                this.datos[j] = id;
                return;
            }
            this.pal.push(id);
            idx = this.pal.length - 1;
        }
        if (this.bits === 4) {
            const k = j >> 1, b = this.datos[k];
            this.datos[k] = (j & 1) ? ((b & 0x0f) | (idx << 4)) : ((b & 0xf0) | idx);
        } else {
            this.datos[j] = idx;
        }
    }

    /** 4 → 8 bits: desempaqueta los nibbles a un byte por celda. */
    ensanchar8() {
        const nuevo = new Uint8Array(CELDAS_SECCION);
        for (let j = 0; j < CELDAS_SECCION; j++) {
            nuevo[j] = (j & 1) ? (this.datos[j >> 1] >> 4) : (this.datos[j >> 1] & 15);
        }
        this.datos = nuevo;
        this.bits = 8;
    }

    /** 8 → 16 bits: ids crudos, la paleta deja de existir. */
    ensanchar16() {
        const nuevo = new Uint16Array(CELDAS_SECCION);
        for (let j = 0; j < CELDAS_SECCION; j++) nuevo[j] = this.pal[this.datos[j]];
        this.datos = nuevo;
        this.pal = null;
        this.bits = 16;
    }

    /** ¿Puede contener el id? (por paleta; en bits 16 no se sabe sin escanear) */
    puedeContener(id) {
        return this.bits === 16 || this.pal.includes(id);
    }
}

export class ChunkPaletizado {
    /** @param {Uint16Array|null} plano — celdas planas a importar (o vacío = aire). */
    constructor(plano = null) {
        this.secs = new Array(NUM_SECCIONES);
        for (let s = 0; s < NUM_SECCIONES; s++) this.secs[s] = new Seccion(0);
        if (plano) this.cargar(plano);
    }

    /** Importa un array plano (del generador o del guardado RLE). */
    cargar(plano) {
        if (plano.length !== TOTAL) throw new Error('Chunk plano de longitud inesperada: ' + plano.length);
        for (let s = 0; s < NUM_SECCIONES; s++) {
            const base = s * CELDAS_SECCION;
            const primero = plano[base];
            let uniforme = true;
            for (let j = 1; j < CELDAS_SECCION; j++) {
                if (plano[base + j] !== primero) { uniforme = false; break; }
            }
            const sec = new Seccion(primero);
            if (!uniforme) {
                for (let j = 0; j < CELDAS_SECCION; j++) sec.set(j, plano[base + j]);
            }
            this.secs[s] = sec;
        }
    }

    /** Id de bloque del índice plano i (0..98303). */
    get(i) { return this.secs[i >>> 12].get(i & 4095); }

    /** Escribe el id en el índice plano i. */
    set(i, id) { this.secs[i >>> 12].set(i & 4095, id); }

    /** Exporta a array plano (para el RLE del guardado). */
    aplanar() {
        const out = new Uint16Array(TOTAL);
        for (let s = 0; s < NUM_SECCIONES; s++) {
            const sec = this.secs[s], base = s * CELDAS_SECCION;
            if (sec.bits === 0) {
                if (sec.pal[0] !== 0) out.fill(sec.pal[0], base, base + CELDAS_SECCION);
                continue;
            }
            for (let j = 0; j < CELDAS_SECCION; j++) out[base + j] = sec.get(j);
        }
        return out;
    }

    /** Id si TODA la sección s es un único bloque, o −1 si es mixta. */
    uniformeDe(s) {
        const sec = this.secs[s];
        return sec.bits === 0 ? sec.pal[0] : -1;
    }

    /**
     * Fuentes de luz del chunk: [índicePlano, nivel] para toda celda cuyo id
     * emita según la tabla `EMIT` (indexada por id). Las secciones cuya paleta
     * no contiene emisores se saltan enteras — el caso común es no tener
     * ninguna y costar solo 24 miradas a paletas.
     */
    fuentesDeLuz(EMIT) {
        const out = [];
        for (let s = 0; s < NUM_SECCIONES; s++) {
            const sec = this.secs[s], base = s << 12;
            if (sec.bits === 0) {
                const nivel = EMIT[sec.pal[0]];
                if (nivel) for (let j = 0; j < CELDAS_SECCION; j++) out.push([base + j, nivel]);
                continue;
            }
            if (sec.bits !== 16 && !sec.pal.some((id) => EMIT[id])) continue;
            for (let j = 0; j < CELDAS_SECCION; j++) {
                const nivel = EMIT[sec.get(j)];
                if (nivel) out.push([base + j, nivel]);
            }
        }
        return out;
    }

    /** Índices planos que contienen el id (para los bloques dinámicos). */
    buscarId(id) {
        const out = [];
        for (let s = 0; s < NUM_SECCIONES; s++) {
            const sec = this.secs[s], base = s << 12;
            if (sec.bits === 0) {
                if (sec.pal[0] === id) for (let j = 0; j < CELDAS_SECCION; j++) out.push(base + j);
                continue;
            }
            if (!sec.puedeContener(id)) continue;
            for (let j = 0; j < CELDAS_SECCION; j++) {
                if (sec.get(j) === id) out.push(base + j);
            }
        }
        return out;
    }

    /**
     * y de la celda opaca más alta de la columna (lx, lz) según la tabla
     * `OPACO` (indexada por id), o −1 si no hay. Baja sección a sección:
     * el cielo (aire uniforme) se salta de 16 en 16.
     */
    topeOpaco(lx, lz, OPACO) {
        const col = lz * CHUNK + lx;
        for (let s = NUM_SECCIONES - 1; s >= 0; s--) {
            const sec = this.secs[s];
            if (sec.bits === 0) {
                if (OPACO[sec.pal[0]]) return (s << 4) + SECCION_H - 1; // techo de la sección maciza
                continue;
            }
            if (sec.bits !== 16 && !sec.pal.some((id) => OPACO[id])) continue;
            for (let yl = SECCION_H - 1; yl >= 0; yl--) {
                if (OPACO[sec.get(yl * (CHUNK * CHUNK) + col)]) return (s << 4) + yl;
            }
        }
        return -1;
    }

    /** Memoria aproximada en bytes (depuración/medición). */
    bytes() {
        let total = 0;
        for (const sec of this.secs) {
            total += 48 + (sec.pal ? sec.pal.length * 8 : 0) + (sec.datos ? sec.datos.byteLength : 0);
        }
        return total;
    }
}

/**
 * Campo de LUZ DE BLOQUE seccionado: niveles 0..15 por celda, con el mismo
 * troceado en 24 secciones que ChunkPaletizado. Una sección sin ninguna luz
 * es `null` (el caso dominante: la mayoría de chunks no tiene antorchas ni
 * lava, y en los que sí, la luz vive en 1-3 secciones); una sección con luz
 * son nibbles en 2 KB (frente a los 96 KB del Uint8Array plano por chunk).
 *
 * Contrato con el recálculo de world.js: `limpiar()` deja todo vacío y las
 * escrituras con valor 0 sobre una sección vacía NO asignan nada — el
 * volcado solo escribe los niveles > 0.
 */
export class LuzSeccionada {
    constructor() {
        this.secs = new Array(NUM_SECCIONES).fill(null);
    }

    /** Nivel 0..15 del índice plano i (secciones vacías: 0). */
    get(i) {
        const sec = this.secs[i >>> 12];
        if (!sec) return 0;
        const j = i & 4095;
        return (j & 1) ? (sec[j >> 1] >> 4) : (sec[j >> 1] & 15);
    }

    /** Escribe el nivel en i; un 0 sobre sección vacía no asigna memoria. */
    set(i, v) {
        const s = i >>> 12;
        let sec = this.secs[s];
        if (!sec) {
            if (v === 0) return;
            sec = this.secs[s] = new Uint8Array(CELDAS_SECCION / 2);
        }
        const j = i & 4095, k = j >> 1;
        sec[k] = (j & 1) ? ((sec[k] & 0x0f) | (v << 4)) : ((sec[k] & 0xf0) | v);
    }

    /** Vacía el campo entero (todas las secciones a null, sin basura). */
    limpiar() {
        this.secs.fill(null);
    }

    /** Memoria aproximada en bytes (depuración/medición). */
    bytes() {
        let total = 16;
        for (const sec of this.secs) total += sec ? sec.byteLength + 16 : 0;
        return total;
    }
}

/**
 * Registro genérico de BLOQUES DINÁMICOS: bloques sin malla estática
 * (flag `dinamico` en blocks.js) cuya representación en el mundo es una
 * ENTIDAD de partes-caja (contrato de js/mobs/model.js) dibujada por frame
 * con el pipeline de mobrender. Extraído del sistema de cámaras cuando
 * llegó el segundo bloque dinámico (la lata de Red Bull).
 *
 * Cada tipo instancia su registro con el id de bloque a rastrear y una
 * fábrica de entidades; el rastreo en chunks cargados es barato:
 *  - sync(world): escanea los chunks recién añadidos y da de baja los
 *    descargados (main.js lo llama tras el streaming).
 *  - onSet(x, y, z, id): alta/baja puntual al colocar o romper el bloque
 *    (main.js lo llama junto a world.set en las acciones del jugador).
 *
 * Módulo puro (sin DOM ni WebGL): probable en Node.
 */
import { CHUNK, chunkKey } from './world.js';

export class RegistroDinamico {
    /**
     * @param {number} blockId — id de bloque que se rastrea (B.*)
     * @param {(x:number, y:number, z:number) => object} crearEntidad —
     *   fábrica de la entidad falsa (campos que mobrender espera de un mob)
     */
    constructor(blockId, crearEntidad) {
        this.blockId = blockId;
        this.crearEntidad = crearEntidad;
        this.porChunk = new Map();  // "cx,cz" → [{x,y,z}] bloques hallados
        this.entidades = [];        // entidades vivas para el render
    }

    /** Olvida todo (cambio de mundo). */
    reset() {
        this.porChunk.clear();
        this.entidades = [];
    }

    /**
     * Reconcilia el registro con los chunks cargados: escanea UNA vez cada
     * chunk nuevo y da de baja los descargados. Barato: O(chunks) en Map.
     */
    sync(world) {
        let cambio = false;
        for (const key of [...this.porChunk.keys()]) {
            if (!world.chunks.has(key)) {
                if (this.porChunk.get(key).length > 0) cambio = true;
                this.porChunk.delete(key);
            }
        }
        for (const [key, chunk] of world.chunks) {
            if (this.porChunk.has(key)) continue;
            const lista = this.escanear(key, chunk.blocks);
            this.porChunk.set(key, lista);
            if (lista.length > 0) cambio = true;
        }
        if (cambio) this.reconstruir();
    }

    /** Alta/baja puntual: llamar junto a world.set al colocar o romper. */
    onSet(x, y, z, id) {
        const key = chunkKey(x >> 4, z >> 4);
        const lista = this.porChunk.get(key);
        if (!lista) return; // chunk sin escanear: sync lo recogerá
        const i = lista.findIndex((c) => c.x === x && c.y === y && c.z === z);
        if (id === this.blockId && i < 0) {
            lista.push({ x, y, z });
            this.reconstruir();
        } else if (id !== this.blockId && i >= 0) {
            lista.splice(i, 1);
            this.reconstruir();
        }
    }

    /** Escaneo lineal del chunk (16×64×16 bytes): posiciones con el bloque. */
    escanear(key, blocks) {
        const lista = [];
        if (!blocks.includes(this.blockId)) return lista; // atajo del caso común
        const [cx, cz] = key.split(',').map(Number);
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i] !== this.blockId) continue;
            const lx = i & 15, lz = (i >> 4) & 15, y = i >> 8;
            lista.push({ x: cx * CHUNK + lx, y, z: cz * CHUNK + lz });
        }
        return lista;
    }

    /** Rehace la lista de entidades desde el registro (cambia rara vez). */
    reconstruir() {
        this.entidades = [];
        for (const lista of this.porChunk.values()) {
            for (const c of lista) this.entidades.push(this.crearEntidad(c.x, c.y, c.z));
        }
    }
}

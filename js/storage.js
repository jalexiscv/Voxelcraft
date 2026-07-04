/**
 * Persistencia en IndexedDB (localStorage se queda corto para un mundo
 * infinito). Se guarda:
 *  - 'meta'   → semilla, estado del jugador y hora del mundo; bajo otra
 *               clave, el estado por posición (blockData: cofres).
 *  - 'chunks' → SOLO los chunks modificados por el jugador, comprimidos con
 *               RLE; el resto se regenera de la semilla al explorar.
 * Un guardado es una instantánea completa: limpia y reescribe ambos stores.
 */
import { CHUNK, WORLD_HEIGHT, rleEncode, rleDecode } from './world.js';

const DB_NAME = 'voxelcraft';
const DB_VERSION = 1;
const META_KEY = 'default';
const BLOCKDATA_KEY = 'blockData:default';

/* ---- Serialización de blockData (funciones puras, probables en Node) ---- */

/** Mapa "x,y,z" → objeto plano ⇒ objeto plano anidado para el guardado. */
export function blockDataToJSON(blockData) {
    return Object.fromEntries(blockData);
}

/** Objeto del guardado ⇒ Map (guardados antiguos: sin clave → mapa vacío). */
export function blockDataFromJSON(obj) {
    return new Map(Object.entries(obj || {}));
}

function openDB() {
    return new Promise((resolve, reject) => {
        const rq = indexedDB.open(DB_NAME, DB_VERSION);
        rq.onupgradeneeded = () => {
            rq.result.createObjectStore('meta');
            rq.result.createObjectStore('chunks');
        };
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
    });
}

/** Guarda la partida. Devuelve el número de chunks persistidos. */
export async function saveWorld(world, meta) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['meta', 'chunks'], 'readwrite');
        const chunks = tx.objectStore('chunks');
        chunks.clear();
        tx.objectStore('meta').put(meta, META_KEY);
        tx.objectStore('meta').put(blockDataToJSON(world.blockData), BLOCKDATA_KEY);
        let n = 0;
        for (const [key, c] of world.chunks) {
            if (c.modified) { chunks.put(rleEncode(c.blocks), key); n++; }
        }
        tx.oncomplete = () => { db.close(); resolve(n); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** Metadatos de la partida guardada, o null si no hay. */
export async function loadMeta() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const rq = db.transaction('meta').objectStore('meta').get(META_KEY);
        rq.onsuccess = () => { db.close(); resolve(rq.result || null); };
        rq.onerror = () => { db.close(); reject(rq.error); };
    });
}

export async function hasSave() {
    try { return (await loadMeta()) !== null; } catch (e) { return false; }
}

/** Vuelca los chunks editados del guardado (y su blockData) en el mundo. */
export async function loadChunksInto(world) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['meta', 'chunks']);
        const store = tx.objectStore('chunks');
        const keysRq = store.getAllKeys();
        const valsRq = store.getAll();
        // guardados antiguos: sin la clave el resultado es undefined → mapa vacío
        const dataRq = tx.objectStore('meta').get(BLOCKDATA_KEY);
        let keys = null, vals = null, dataDone = false;
        const finish = () => {
            if (!keys || !vals || !dataDone) return;
            const size = CHUNK * WORLD_HEIGHT * CHUNK;
            for (let i = 0; i < keys.length; i++) {
                const [cx, cz] = String(keys[i]).split(',').map(Number);
                world.addChunk(cx, cz, rleDecode(vals[i], size), true);
            }
            world.blockData = blockDataFromJSON(dataRq.result);
            db.close();
            resolve(keys.length);
        };
        keysRq.onsuccess = () => { keys = keysRq.result; finish(); };
        valsRq.onsuccess = () => { vals = valsRq.result; finish(); };
        dataRq.onsuccess = () => { dataDone = true; finish(); };
        keysRq.onerror = valsRq.onerror = dataRq.onerror =
            () => { db.close(); reject(keysRq.error || valsRq.error || dataRq.error); };
    });
}

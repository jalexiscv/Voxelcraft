/**
 * Agricultura: lógica pura de los cultivos (trigo, zanahoria, patata).
 * Módulo puro (sin DOM, probable en Node): main.js aplica las reglas de
 * interacción (labrar, sembrar, cosechar) y aquí viven las tablas y el
 * crecimiento por muestreo aleatorio.
 *
 * La etapa de crecimiento ES el id de bloque (B.TRIGO_0..B.PATATA_3,
 * ids 72..83 contiguos por familia): el mundo guarda un byte por celda,
 * así que la persistencia de la etapa sale gratis con el guardado normal.
 */
import { B, esAgua } from './blocks.js';
import { ITEMS } from './items.js';
import { CHUNK } from './world.js';

// los cultivos ocupan el rango contiguo 72..83: cuatro etapas por familia
const CULTIVO_MIN = B.TRIGO_0;
const CULTIVO_MAX = B.PATATA_3;
const ETAPAS = 4;

// ítem que se recupera al arrancar cada familia inmadura (lo sembrado)
const SEMILLA_POR_FAMILIA = [ITEMS.SEMILLAS_TRIGO, ITEMS.ZANAHORIA, ITEMS.PATATA];

/* ---- Parámetros del crecimiento ---- */
const PERIODO = 3;          // s entre pasadas de muestreo
const MUESTRAS = 28;        // columnas sondeadas por chunk y pasada
const PROB_CRECER = 1 / 12; // probabilidad de avanzar etapa al ser sondeado
const RADIO_RIEGO = 4;      // distancia máxima al agua que duplica la prob.

/** ¿Es `id` un bloque de cultivo (cualquier familia y etapa)? */
export const esCultivo = (id) => id >= CULTIVO_MIN && id <= CULTIVO_MAX;

/** Etapa 0..3 del cultivo (−1 si el id no es cultivo). */
export const etapaDe = (id) => (esCultivo(id) ? (id - CULTIVO_MIN) % ETAPAS : -1);

/** ¿Está el cultivo en su etapa final (listo para el botín completo)? */
export const maduro = (id) => etapaDe(id) === ETAPAS - 1;

/** Id del bloque una etapa más crecido (los maduros se quedan como están). */
export const siguienteEtapa = (id) => (esCultivo(id) && !maduro(id) ? id + 1 : id);

/** Familia 0 trigo / 1 zanahoria / 2 patata (−1 si no es cultivo). */
const familiaDe = (id) => (esCultivo(id) ? ((id - CULTIVO_MIN) / ETAPAS) | 0 : -1);

/**
 * Bloque de etapa 0 que siembra cada ítem, o null si no es plantable.
 * Zanahoria y patata se replantan a sí mismas (comida Y semilla, como
 * en el clásico); el trigo se siembra con sus semillas.
 */
export function plantaDe(itemId) {
    if (itemId === ITEMS.SEMILLAS_TRIGO) return B.TRIGO_0;
    if (itemId === ITEMS.ZANAHORIA) return B.ZANAHORIA_0;
    if (itemId === ITEMS.PATATA) return B.PATATA_0;
    return null;
}

/**
 * Botín al romper un cultivo, como lista de {id, n} de ítems.
 * Maduro: trigo da 1 trigo + 1-2 semillas; zanahoria, 2-3; patata, 1-3.
 * Inmaduro: solo se recupera lo sembrado (1 semilla / 1 unidad).
 * `rng` es inyectable (() => [0,1)) para pruebas deterministas.
 */
export function cosechaDe(id, rng = Math.random) {
    const familia = familiaDe(id);
    if (familia < 0) return [];
    if (!maduro(id)) return [{ id: SEMILLA_POR_FAMILIA[familia], n: 1 }];
    if (familia === 0) {
        return [
            { id: ITEMS.TRIGO, n: 1 },
            { id: ITEMS.SEMILLAS_TRIGO, n: 1 + ((rng() * 2) | 0) }, // 1-2
        ];
    }
    if (familia === 1) return [{ id: ITEMS.ZANAHORIA, n: 2 + ((rng() * 2) | 0) }]; // 2-3
    return [{ id: ITEMS.PATATA, n: 1 + ((rng() * 3) | 0) }]; // 1-3
}

/** ¿Hay agua a ≤ RADIO_RIEGO en la capa del cultivo o en la de la tierra? */
function regado(world, x, y, z) {
    for (let dy = 0; dy >= -1; dy--) {
        for (let dx = -RADIO_RIEGO; dx <= RADIO_RIEGO; dx++) {
            for (let dz = -RADIO_RIEGO; dz <= RADIO_RIEGO; dz++) {
                if (esAgua(world.get(x + dx, y + dy, z + dz))) return true;
            }
        }
    }
    return false;
}

// acumulador interno entre fotogramas: una pasada de muestreo cada PERIODO s
let acumulador = 0;

/**
 * Crecimiento por muestreo aleatorio (el «random tick» de esta casa): cada
 * ~PERIODO s sondea MUESTRAS columnas al azar de cada chunk cargado. El
 * cultivo vive justo encima de la columna opaca (chunk.heights, el mismo
 * mapa que usa la luz solar), así que un techo opaco lo deja sin sondeos:
 * sin cielo encima no crece, igual que en el clásico exige luz. Solo avanza
 * de etapa SOBRE tierra labrada (con la tierra rota debajo, simplemente no
 * crece) y con probabilidad PROB_CRECER, duplicada si hay agua cerca (riego).
 * Escribe con world.set, que ya encola el remallado por su cuenta.
 * Devuelve cuántos cultivos avanzaron (útil en pruebas); `rng` inyectable.
 */
export function tickCultivos(world, dt, rng = Math.random) {
    acumulador += dt;
    if (acumulador < PERIODO) return 0;
    acumulador = 0;
    let crecidos = 0;
    for (const [key, chunk] of world.chunks) {
        const [cx, cz] = key.split(',').map(Number);
        for (let s = 0; s < MUESTRAS; s++) {
            const lx = (rng() * CHUNK) | 0;
            const lz = (rng() * CHUNK) | 0;
            // el cultivo no es opaco: si existe, está sobre el tope opaco
            const y = chunk.heights[lz * CHUNK + lx] + 1;
            if (y <= 0) continue; // columna vacía
            const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
            const id = world.get(x, y, z);
            if (!esCultivo(id) || maduro(id)) continue;
            if (world.get(x, y - 1, z) !== B.FARMLAND) continue;
            const prob = PROB_CRECER * (regado(world, x, y, z) ? 2 : 1);
            if (rng() < prob) {
                world.set(x, y, z, siguienteEtapa(id));
                crecidos++;
            }
        }
    }
    return crecidos;
}

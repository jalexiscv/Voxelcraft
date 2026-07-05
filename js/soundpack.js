/**
 * Paquete de sonidos local OPCIONAL (soundpack).
 *
 * VoxelCraft es 100 % procedural y el repo NO distribuye archivos de audio:
 * este módulo solo sondea en tiempo de ejecución el directorio `sounds/` de
 * la raíz por si el usuario ha colocado ahí sus propios mp3 como override
 * personal. Ese directorio vive únicamente en la copia local (está en
 * .gitignore) y jamás forma parte del repo; si un archivo no existe, el
 * motor sintetiza con WebAudio como siempre.
 *
 * Convención de nombres (todo bajo sounds/ en la raíz):
 *   - Familias de material, variantes numeradas 1..4 (step/dig/place las
 *     comparten con distinto volumen):
 *       grass1.mp3 .. grass4.mp3     stone1.mp3 .. stone4.mp3
 *       wood1.mp3  .. wood4.mp3      gravel1.mp3 .. gravel4.mp3
 *       sand1.mp3  .. sand4.mp3      cloth1.mp3 .. cloth4.mp3
 *   - Música de fondo: calm1.mp3 .. calm4.mp3
 *   - Voces de mobs: mob.<id>.<idle|hurt|death>.mp3, o con variante
 *     numerada (mob.zombi.idle1.mp3 .. mob.zombi.idle4.mp3). El kind
 *     `say` del contrato de voz (def.voice) equivale a `idle`.
 *   - Eventos: evento.<nombre>.mp3 (p. ej. evento.explosion.mp3 o
 *     evento.puerta_abrir.mp3; catálogo completo en EVENTOS de js/audio.js).
 *
 * API (sin dependencias del resto del motor; nada de DOM en el nivel
 * superior, todo el trabajo de red es perezoso):
 *   init(ctx)          registra el AudioContext; no descarga nada.
 *   resolver(id)       Promise<AudioBuffer|null>; sondea el id UNA sola vez
 *                      con fetch (404 => null cacheado, sin ruido propio).
 *   obtener(id)        acceso síncrono: buffer si ya está cacheado o null
 *                      (lanza el sondeo en segundo plano la primera vez).
 *   variantes(base, n) elige al azar entre base1..base<n> ya cargadas; null
 *                      si ninguna está disponible (sondea las que falten).
 */

const BASE = 'sounds/';

/** id -> AudioBuffer | null (resultado definitivo del sondeo). */
const cache = new Map();

/** id -> Promise en vuelo, para no sondear dos veces el mismo id. */
const pendientes = new Map();

let ctx = null;

/** Registra el AudioContext (llamar desde SoundEngine.ensure). Perezoso. */
export function init(audioCtx) {
    ctx = audioCtx;
}

/**
 * Sondea `sounds/<id>.mp3` una única vez y devuelve una Promise del
 * AudioBuffer decodificado, o null si no existe o no decodifica. El
 * resultado (incluido el null del 404) queda cacheado para siempre.
 */
export function resolver(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pendientes.has(id)) return pendientes.get(id);
    if (!ctx) return Promise.resolve(null); // sin contexto aún: no se cachea

    const p = fetch(BASE + id + '.mp3')
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((datos) => (datos ? ctx.decodeAudioData(datos) : null))
        .catch(() => null) // 404, red o decodificación: silencio, sin throw
        .then((buffer) => {
            cache.set(id, buffer || null);
            pendientes.delete(id);
            return buffer || null;
        });
    pendientes.set(id, p);
    return p;
}

/**
 * Acceso síncrono para la ruta caliente: devuelve el buffer si el sondeo ya
 * terminó con éxito y null en cualquier otro caso (no existe, aún en vuelo
 * o sin sondear; en este último caso lo lanza en segundo plano).
 */
export function obtener(id) {
    if (cache.has(id)) return cache.get(id);
    resolver(id);
    return null;
}

/**
 * Variantes numeradas: elige un buffer al azar entre `base`1..`base`n de
 * las que ya estén cargadas, o null si ninguna está disponible todavía
 * (las que falten por sondear se lanzan en segundo plano).
 */
export function variantes(base, n) {
    const listas = [];
    for (let i = 1; i <= n; i++) {
        const id = base + i;
        if (cache.has(id)) {
            const buffer = cache.get(id);
            if (buffer) listas.push(buffer);
        } else {
            resolver(id); // sondeo perezoso, una sola vez por id
        }
    }
    if (!listas.length) return null;
    return listas[(Math.random() * listas.length) | 0];
}

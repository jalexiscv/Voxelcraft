/**
 * Paquete de sonidos local OPCIONAL (soundpack).
 *
 * VoxelCraft es 100 % procedural y el repo NO distribuye archivos de audio:
 * este módulo solo sondea en tiempo de ejecución el directorio `sounds/` de
 * la raíz por si el usuario ha colocado ahí sus propios archivos como
 * override personal. Ese directorio vive únicamente en la copia local (está
 * en .gitignore) y jamás forma parte del repo; si un archivo no existe, el
 * motor sintetiza con WebAudio como siempre.
 *
 * Formatos aceptados, por id y en este orden: `.mp3` (decodeAudioData
 * nativo) y `.fsb` (bancos FMOD FSB5 vía js/fsb5.js: códecs PCM* envueltos
 * en WAV, MPEG como frames mp3 crudos y FADPCM decodificado en JS puro;
 * VORBIS y demás no son decodificables y caen al sintetizador con aviso).
 *
 * Convención de nombres (todo bajo sounds/ en la raíz; se muestra .mp3
 * pero cada id acepta también .fsb):
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

import { parseFSB5, sampleAWav, decodeFADPCM, pcm16AWav } from './fsb5.js';

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

/** Extensiones aceptadas, en orden de sondeo. */
const EXTS = ['.mp3', '.fsb'];

/** Rutas que sondearía un id, en orden (expuesto para las pruebas). */
export function rutasDe(id) {
    return EXTS.map((ext) => BASE + id + ext);
}

/** Códecs FSB5 sin soporte ya avisados (un warn por códec, no por archivo). */
const codecsAvisados = new Set();

/**
 * Decodifica un banco FSB5: los códecs PCM se envuelven en WAV y MPEG son
 * frames mp3 crudos que WebAudio entiende tal cual. Otros códecs (VORBIS,
 * ADPCM…) no son decodificables aquí: se avisa una vez y se devuelve null
 * (el sintetizador cubre el sonido).
 */
async function decodificarFSB(datos) {
    const { header, samples } = parseFSB5(datos);
    const sample = samples[0];
    if (!sample || !sample.data.length) return null;
    if (header.codec.startsWith('PCM')) {
        const wav = sampleAWav(sample, header.codec);
        return wav ? ctx.decodeAudioData(wav.buffer) : null;
    }
    if (header.codec === 'MPEG') {
        return ctx.decodeAudioData(sample.data.slice().buffer);
    }
    if (header.codec === 'FADPCM') {
        const pcm = decodeFADPCM(sample);
        const wav = pcm16AWav(pcm, sample.frequency, sample.channels);
        return wav ? ctx.decodeAudioData(wav.buffer) : null;
    }
    if (!codecsAvisados.has(header.codec)) {
        codecsAvisados.add(header.codec);
        console.warn(`[soundpack] códec FSB5 sin soporte: ${header.codec} (se usa el sintetizador)`);
    }
    return null;
}

/**
 * Sondea `sounds/<id>.mp3` y después `sounds/<id>.fsb`, una única vez por
 * id, y devuelve una Promise del AudioBuffer decodificado, o null si no
 * existe o no decodifica. El resultado (incluido el null del 404) queda
 * cacheado para siempre.
 */
export function resolver(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pendientes.has(id)) return pendientes.get(id);
    if (!ctx) return Promise.resolve(null); // sin contexto aún: no se cachea

    const p = (async () => {
        for (const ext of EXTS) {
            try {
                const res = await fetch(BASE + id + ext);
                if (!res.ok) continue;
                const datos = await res.arrayBuffer();
                const buffer = ext === '.fsb'
                    ? await decodificarFSB(datos)
                    : await ctx.decodeAudioData(datos);
                if (buffer) return buffer;
            } catch { /* 404, red o decodificación: probar la siguiente */ }
        }
        return null;
    })().then((buffer) => {
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

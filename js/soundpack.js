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
 *     numerada (mob.zombie.idle1.mp3 .. mob.zombie.idle4.mp3). El kind
 *     `say` del contrato de voz (def.voice) equivale a `idle`.
 *   - Eventos: evento.<nombre>.mp3 (p. ej. evento.explosion.mp3 o
 *     evento.puerta_abrir.mp3; catálogo completo en EVENTOS de js/audio.js).
 *
 * API (sin dependencias del resto del motor; nada de DOM en el nivel
 * superior, todo el trabajo de red es perezoso):
 *   init(ctx)          registra el AudioContext y lanza en segundo plano el
 *                      sondeo único de sounds/manifest.json (ver abajo).
 *   resolver(id)       Promise<AudioBuffer|null>; sondea el id UNA sola vez
 *                      con fetch (404 => null cacheado, sin ruido propio).
 *   obtener(id)        acceso síncrono: buffer si ya está cacheado o null
 *                      (lanza el sondeo en segundo plano la primera vez).
 *   variantes(base, n) elige al azar entre base1..base<n> ya cargadas; null
 *                      si ninguna está disponible (sondea las que falten).
 *
 * Árbol estilo Bedrock (opcional, ADEMÁS de la convención plana): si el
 * usuario coloca un pack con subcarpetas (mob/zombie/say1.mp3,
 * step/grass2.mp3…) puede generar sounds/manifest.json con la herramienta
 * local `node .hermes/tools/generar-manifest.mjs`. Con manifest presente
 * este módulo resuelve rutas del árbol sin adivinar nombres; si el fetch
 * del manifest da 404, todo sigue en el modo clásico sin árbol.
 *   cargarManifest()      fetch único y perezoso del manifest (lo lanza
 *                         init); Promise<Set<rutas>|null>.
 *   resolverArbol(ruta)   Promise<AudioBuffer|null> de una ruta relativa
 *                         EXACTA del manifest; mp3 y ogg con decodeAudioData
 *                         nativo, fsb con el parser propio.
 *   variantesArbol(pref)  elige al azar entre las rutas del manifest que
 *                         empiecen por el prefijo (mob/zombie/say,
 *                         step/grass…) ya cargadas; sondea el resto en
 *                         segundo plano (misma caché, mismo contrato que
 *                         variantes()).
 *   rutasArbol(pref)      rutas del manifest que empiezan por el prefijo
 *                         (síncrono; expuesto para pruebas y depuración).
 *   resolverVozMob(id, kind, prefijos)  voz de mob del árbol: si llegan los
 *                         prefijos del campo `sonidos` de la def se prueban
 *                         EN ORDEN antes que nada; después carpeta =
 *                         CARPETA_MOB alias o el propio id con los candidatos
 *                         por kind de la tabla VOCES; Promise con el primer
 *                         buffer disponible o null.
 */

import { parseFSB5, sampleAWav, decodeFADPCM, pcm16AWav } from './fsb5.js';

const BASE = 'sounds/';

/** id -> AudioBuffer | null (resultado definitivo del sondeo). */
const cache = new Map();

/** id -> Promise en vuelo, para no sondear dos veces el mismo id. */
const pendientes = new Map();

let ctx = null;

/** Registra el AudioContext (llamar desde SoundEngine.ensure). Perezoso:
 *  no descarga audio; solo dispara el sondeo único del manifest del árbol. */
export function init(audioCtx) {
    ctx = audioCtx;
    cargarManifest(); // en segundo plano; 404 => modo clásico sin árbol
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

/* ==========================================================================
 * Árbol estilo Bedrock: resolución por sounds/manifest.json
 *
 * El navegador no puede listar directorios, así que el árbol se describe en
 * sounds/manifest.json (array JSON de rutas relativas a sounds/, separador
 * `/`, con extensión), regenerable con la herramienta local
 * `node .hermes/tools/generar-manifest.mjs`. Sin manifest no hay árbol y
 * este bloque entero queda inerte: la convención plana de arriba y el
 * sintetizador siguen funcionando exactamente igual.
 * ========================================================================== */

/** Set con todas las rutas del manifest, o null si (aún) no hay árbol. */
let arbolRutas = null;

/** Índice carpeta -> nombres de archivo, para resolver prefijos sin
 *  recorrer las ~4600 rutas en cada consulta. */
let arbolCarpetas = null;

/** Promise del fetch del manifest (una sola vez por sesión). */
let manifestPromesa = null;

/** prefijo consultado -> rutas que lo satisfacen (memoizado). */
const prefijosCache = new Map();

/**
 * Sondea sounds/manifest.json UNA sola vez y construye el Set de rutas y el
 * índice por carpeta. 404, red caída o JSON inválido => null silencioso
 * (modo clásico). Idempotente: init la lanza, pero puede llamarse desde
 * cualquier sitio (las APIs del árbol la esperan por su cuenta).
 */
export function cargarManifest() {
    if (manifestPromesa) return manifestPromesa;
    manifestPromesa = (async () => {
        try {
            const res = await fetch(BASE + 'manifest.json');
            if (!res.ok) return null; // 404: pack sin árbol
            const datos = await res.json();
            const rutas = Array.isArray(datos) ? datos : [];
            if (!rutas.length) return null;
            arbolRutas = new Set(rutas);
            arbolCarpetas = new Map();
            for (const ruta of rutas) {
                const corte = ruta.lastIndexOf('/');
                const carpeta = corte >= 0 ? ruta.slice(0, corte) : '';
                const nombre = ruta.slice(corte + 1);
                let lista = arbolCarpetas.get(carpeta);
                if (!lista) arbolCarpetas.set(carpeta, lista = []);
                lista.push(nombre);
            }
            return arbolRutas;
        } catch {
            return null; // sin manifest: modo clásico, sin ruido propio
        }
    })();
    return manifestPromesa;
}

/**
 * Rutas del manifest que empiezan por `prefijo` (semántica startsWith pura:
 * `mob/zombie/say` casa say1.mp3, `mob/warden/idle` casa idle_1.mp3 y
 * `mob/cat` casa también la subcarpeta cat/ocelot). Síncrono: devuelve []
 * si el manifest aún no está cargado. Resultado memoizado por prefijo.
 */
export function rutasArbol(prefijo) {
    if (!arbolCarpetas) return [];
    const memo = prefijosCache.get(prefijo);
    if (memo) return memo;
    const lista = [];
    const corte = prefijo.lastIndexOf('/');
    const carpeta = corte >= 0 ? prefijo.slice(0, corte) : '';
    const resto = prefijo.slice(corte + 1);
    // 1) Archivos de la carpeta exacta cuyo nombre empiece por el resto.
    const nombres = arbolCarpetas.get(carpeta);
    if (nombres) {
        for (const nombre of nombres) {
            if (nombre.startsWith(resto)) {
                lista.push(carpeta ? carpeta + '/' + nombre : nombre);
            }
        }
    }
    // 2) Carpetas más profundas alcanzadas por el prefijo (todo su contenido).
    for (const [otra, archivos] of arbolCarpetas) {
        if (otra === carpeta || !(otra + '/').startsWith(prefijo)) continue;
        for (const nombre of archivos) lista.push(otra + '/' + nombre);
    }
    prefijosCache.set(prefijo, lista);
    return lista;
}

/**
 * Resuelve una ruta relativa EXACTA del manifest (p. ej.
 * `mob/zombie/say1.mp3`) a un AudioBuffer, con la misma caché y el mismo
 * contrato que resolver(): un único fetch por ruta, null definitivo si la
 * ruta no está en el manifest o no decodifica. mp3 y ogg van por
 * decodeAudioData nativo; fsb por el parser propio.
 */
export function resolverArbol(ruta) {
    const clave = 'arbol:' + ruta; // sin choques con los ids planos
    if (cache.has(clave)) return Promise.resolve(cache.get(clave));
    if (pendientes.has(clave)) return pendientes.get(clave);
    if (!ctx) return Promise.resolve(null); // sin contexto aún: no se cachea

    const p = (async () => {
        const rutas = await cargarManifest();
        if (!rutas || !rutas.has(ruta)) return null;
        try {
            const res = await fetch(BASE + ruta);
            if (!res.ok) return null;
            const datos = await res.arrayBuffer();
            return ruta.endsWith('.fsb')
                ? await decodificarFSB(datos)
                : await ctx.decodeAudioData(datos); // mp3 y ogg nativos
        } catch {
            return null; // red o decodificación: cae al sintetizador
        }
    })().then((buffer) => {
        cache.set(clave, buffer || null);
        pendientes.delete(clave);
        return buffer || null;
    });
    pendientes.set(clave, p);
    return p;
}

/**
 * Variantes del árbol: elige un buffer al azar entre las rutas del manifest
 * que empiezan por `prefijo` y ya están cargadas; las que falten se sondean
 * en segundo plano (mismo contrato síncrono que variantes()). Cubre solo
 * las numeraciones con y sin guion bajo (say1 / idle_1) sin listas a mano.
 */
export function variantesArbol(prefijo) {
    if (!arbolCarpetas) {
        cargarManifest(); // por si se llama antes de init
        return null;
    }
    const listas = [];
    for (const ruta of rutasArbol(prefijo)) {
        const clave = 'arbol:' + ruta;
        if (cache.has(clave)) {
            const buffer = cache.get(clave);
            if (buffer) listas.push(buffer);
        } else {
            resolverArbol(ruta); // sondeo perezoso, una sola vez por ruta
        }
    }
    if (!listas.length) return null;
    return listas[(Math.random() * listas.length) | 0];
}

/**
 * Alias id de mob -> carpeta del árbol cuando difieren (verificados contra
 * el manifest real del pack). ghast y wandering_trader se comprobaron y su
 * carpeta coincide con el id, así que no necesitan alias. Los cuatro peces
 * comparten la carpeta genérica `fish` y cave_spider reutiliza `spider`
 * (el árbol no trae carpetas propias para ellos).
 */
export const CARPETA_MOB = {
    enderman: 'endermen',
    iron_golem: 'irongolem',
    snow_golem: 'snowgolem',
    polar_bear: 'polarbear',
    vindicator: 'vindication_illager',
    evoker: 'evocation_illager',
    ocelot: 'cat/ocelot',
    donkey: 'horse/donkey',
    cod: 'fish',
    salmon: 'fish',
    tropical_fish: 'fish',
    pufferfish: 'fish',
    cave_spider: 'spider',
};

/**
 * Candidatos de nombre por tipo de voz, en orden de preferencia: el árbol
 * no es homogéneo (zombie dice say1, warden idle_1, squid ambient1, cat
 * meow1, wolf bark1…) y variantesArbol por prefijo absorbe la numeración
 * con o sin guion bajo.
 */
export const VOCES = {
    say: ['say', 'idle', 'ambient', 'meow', 'bark', 'haggle', 'agitated'],
    hurt: ['hurt', 'hit', 'hitt'],
    death: ['death'],
};

/**
 * Variante al azar entre `rutas` del manifest: resuelve la elegida y, si no
 * decodifica, prueba el resto antes de rendirse. Promise<AudioBuffer|null>.
 */
async function resolverEntreRutas(rutas) {
    if (!rutas.length) return null;
    const elegida = rutas[(Math.random() * rutas.length) | 0];
    const buffer = await resolverArbol(elegida);
    if (buffer) return buffer;
    // La elegida no decodificó: prueba el resto antes de rendirse.
    for (const otra of rutas) {
        if (otra === elegida) continue;
        const repuesto = await resolverArbol(otra);
        if (repuesto) return repuesto;
    }
    return null;
}

/**
 * Voz de mob desde el árbol. Si llega `prefijos` (array del campo `sonidos`
 * de la def del mob, rutas bajo sounds/ sin extensión ni variante) se prueba
 * cada prefijo EN ORDEN — variante al azar entre sus rutas del manifest —
 * antes que los candidatos genéricos. Después recorre los candidatos de
 * VOCES[kind] bajo `mob/<carpeta>/` (carpeta = alias de CARPETA_MOB o el
 * propio id) y devuelve el primer AudioBuffer disponible, o null si el mob
 * no tiene esa voz en el manifest (el llamante cae a la convención plana o
 * al sintetizador). Entre las variantes de un candidato elige una al azar.
 */
export async function resolverVozMob(mobId, kind, prefijos = null) {
    await cargarManifest();
    if (!arbolCarpetas) return null;
    // 1) Prefijos propios del mob (def.sonidos), en orden estricto.
    if (Array.isArray(prefijos)) {
        for (const prefijo of prefijos) {
            const buffer = await resolverEntreRutas(rutasArbol(prefijo));
            if (buffer) return buffer;
        }
    }
    // 2) Candidatos genéricos de la tabla VOCES bajo la carpeta del mob.
    const carpeta = CARPETA_MOB[mobId] || mobId;
    for (const candidato of VOCES[kind] || [kind]) {
        const buffer = await resolverEntreRutas(rutasArbol(`mob/${carpeta}/${candidato}`));
        if (buffer) return buffer;
    }
    return null;
}

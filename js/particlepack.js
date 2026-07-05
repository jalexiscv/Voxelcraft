/**
 * Carga de efectos de partículas desde `particles/*.json` (formato Bedrock).
 * Gemelo perezoso de soundpack/modelpack: fetch silencioso ante 404, un
 * único sondeo cacheado por fichero. Los efectos que existan se parsean con
 * particles.js (intérprete Molang) y quedan listos para dispararse; los que
 * falten, ausentes (el evento simplemente no pinta partículas).
 *
 * EFECTOS mapea cada EVENTO del juego a los ficheros que lo componen, en
 * orden de dibujo. Una explosión, p. ej., es destello + humo + fuego.
 */

import { parseEffect } from './particles.js';

const BASE = 'particles/';

/** Evento del juego → ficheros de `particles/` que lo componen, en orden de
 *  dibujo. La explosión es una composición propia (bola de fuego + humo +
 *  chispas) pensada para lucir; el resto reutiliza los efectos Bedrock. */
export const EFECTOS = {
    explosion: ['vc_explosion_fireball', 'vc_explosion_smoke', 'vc_explosion_sparks'],
    mob_death: ['explosion_death'],
    mob_hurt: ['basic_crit'],
    block_break: ['block_destruct'],
};

/** nombre de fichero → Promise<descriptor|null> (sondeo único cacheado). */
const cache = new Map();

/** Carga y parsea un fichero de efecto (una vez). 404/error → null. */
function cargarFichero(nombre) {
    if (cache.has(nombre)) return cache.get(nombre);
    const p = (async () => {
        try {
            const res = await fetch(BASE + nombre + '.json');
            if (!res.ok) return null;
            return parseEffect(await res.json());
        } catch {
            return null;
        }
    })();
    cache.set(nombre, p);
    return p;
}

/**
 * Precarga todos los efectos de todos los eventos y devuelve un mapa
 * evento → [descriptores no nulos]. Se llama una vez al arrancar el mundo;
 * sin `particles/` (todo 404) devuelve eventos con listas vacías y el juego
 * sigue sin partículas.
 */
export async function cargarEfectos() {
    const salida = {};
    for (const [evento, ficheros] of Object.entries(EFECTOS)) {
        const descs = await Promise.all(ficheros.map(cargarFichero));
        salida[evento] = descs.filter(Boolean);
    }
    return salida;
}

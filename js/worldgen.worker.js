/**
 * Web Worker de generación: recibe peticiones de chunk y responde con los
 * bloques (transferidos sin copia). Cachea el Generator por semilla para no
 * reconstruir las tablas de ruido en cada petición.
 *
 * Entrada:  {seed: number, cx: number, cz: number}
 * Salida:   {cx, cz, blocks: ArrayBuffer}
 */
import { Generator } from './worldgen.js';

let generator = null;
let generatorSeed = null;

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
    self.addEventListener('message', (e) => {
        const { seed, cx, cz } = e.data;
        if (generatorSeed !== seed) {
            generator = new Generator(seed);
            generatorSeed = seed;
        }
        const blocks = generator.generateChunk(cx, cz);
        self.postMessage({ cx, cz, blocks: blocks.buffer }, [blocks.buffer]);
    });
}

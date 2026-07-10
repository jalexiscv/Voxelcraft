/**
 * BiomeMap: clima determinista y selección de bioma (plan en
 * documents/03-biomas.md; contrato de definición en model.js).
 *
 * El bioma es una FUNCIÓN GLOBAL PURA de (semilla, x, z, altura): el
 * Generator (worker) y MobSystem (hilo principal) instancian cada uno su
 * BiomeMap con la misma semilla y ven exactamente el mismo mapa, sin
 * costuras en bordes de chunk (la altura ya es global).
 *
 * Selección en dos ejes:
 *  1. Clase de terreno por ALTURA: oceano (sumergido), playa, montana o
 *     tierra.
 *  2. En 'tierra', CLIMA por ruidos de baja frecuencia: primero las bandas
 *     de rareza (weird), luego la primera ventana temp×humid que case en el
 *     orden del registro, y si ninguna casa, el comodín (llanura).
 */
import { PRNG, Fractal2D } from '../noise.js';
import { ORDER } from './registry.js';
// Nivel del mar y umbral de montaña: la fuente única es js/dimensiones.js;
// se re-exportan aquí para los consumidores históricos (mobs, tests…).
import { SEA_LEVEL, MOUNTAIN_H } from '../dimensiones.js';
export { SEA_LEVEL, MOUNTAIN_H };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Clase de terreno por altura de superficie (sin costuras). */
function claseDeTerreno(h) {
    if (h + 1 <= SEA_LEVEL) return 'oceano'; // sumergido
    if (h <= SEA_LEVEL + 1) return 'playa';
    if (h >= MOUNTAIN_H) return 'montana';
    return 'tierra';
}

/** Anillo de muestreo alrededor de una columna costera (radio 3). */
const ANILLO = [[-3, -3], [0, -3], [3, -3], [-3, 0], [3, 0], [-3, 3], [0, 3], [3, 3]];

/** ¿Cae v dentro de la ventana [min, max)? (semiabierta: bordes sin doblez) */
const dentro = (v, [min, max]) => v >= min && v < max;

/** El comodín: el único def de 'tierra' sin clima ni rareza (llanura). */
function comodin() {
    return ORDER.find((d) => d.terrain === 'tierra' && !d.clima && !d.rare) || null;
}

export class BiomeMap {
    constructor(seed) {
        // Los ruidos se construyen EN ORDEN FIJO desde la semilla (misma
        // disciplina que Generator): funciones globales idénticas para
        // cualquier instancia con la misma semilla.
        const rng = new PRNG(seed);
        this.temp = new Fractal2D(rng, 4);
        this.humid = new Fractal2D(rng, 4);
        this.weird = new Fractal2D(rng, 3);
    }

    /** Clima en (x, z): { temp, humid, weird }, cada eje en [-1, 1]. */
    climate(x, z) {
        const v = (ruido, esc) => clamp(ruido.value(x / esc, z / esc) * 0.7, -1, 1);
        return {
            temp: v(this.temp, 180),
            humid: v(this.humid, 180),
            weird: v(this.weird, 300),
        };
    }

    /** ¿Hay agua (columna sumergida) en el anillo alrededor de (x, z)? */
    aguaCerca(x, z, heightAt) {
        for (const [dx, dz] of ANILLO) {
            if (heightAt(x + dx, z + dz) + 1 <= SEA_LEVEL) return true;
        }
        return false;
    }

    /**
     * Bioma de la columna (x, z) con altura de superficie h: devuelve la
     * DEFINICIÓN (ver model.js). Robusto con un registro parcial: mientras
     * falten biomas, cae al comodín para no dejar columnas sin bioma.
     *
     * `heightAt(x, z)` es opcional: con él, una candidata a playa sin agua
     * en su anillo se trata como tierra (las llanuras interiores a nivel
     * del mar no son playa; un tercio del mundo está a esa cota). Sin él
     * (pruebas), la clase por altura manda.
     */
    at(x, z, h, heightAt = null) {
        let terreno = claseDeTerreno(h);
        if (terreno === 'playa' && heightAt && !this.aguaCerca(x, z, heightAt)) terreno = 'tierra';

        if (terreno !== 'tierra') {
            // primer def del registro con esa clase de terreno
            for (const def of ORDER) if (def.terrain === terreno) return def;
            return comodin(); // aún no existe: comodín provisional
        }

        const clima = this.climate(x, z);
        // 1º: bandas de rareza (setas/palido), en el orden del registro
        for (const def of ORDER) {
            if (def.terrain !== 'tierra' || !def.rare) continue;
            if (dentro(clima.weird, def.rare.weird)) return def;
        }
        // 2º: primera ventana climática que case (temp y humid dentro)
        for (const def of ORDER) {
            if (def.terrain !== 'tierra' || def.rare || !def.clima) continue;
            if (dentro(clima.temp, def.clima.temp) && dentro(clima.humid, def.clima.humid)) return def;
        }
        // 3º: el comodín (llanura)
        return comodin();
    }
}

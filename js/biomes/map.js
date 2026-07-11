/**
 * BiomeMap: selección determinista de bioma sobre el CATÁLOGO GENERADO del
 * paquete real (js/biomes/biomes.data.js; la fuente única es
 * assets/biomes/*.biome.json — ver documents/03-biomas.md).
 *
 * El bioma es una FUNCIÓN GLOBAL PURA de (semilla, x, z, altura): el
 * Generator (worker) y MobSystem (hilo principal) instancian cada uno su
 * BiomeMap con la misma semilla y ven exactamente el mismo mapa, sin
 * costuras en bordes de chunk (la altura ya es global).
 *
 * Selección (el sistema legado de los .biome.json, adaptado):
 *  1. Clase de terreno por ALTURA: oceano (sumergido), playa (cota del mar
 *     con agua en el anillo), montana o tierra.
 *  2. ZONA climática (frozen/cold/medium/lukewarm/warm) por el ruido de
 *     temperatura; los candidatos por zona salen de generate_for_climates
 *     del pack, con sus pesos.
 *  3. tierra: parcelas Voronoi jitterizadas (~192 bloques); cada parcela
 *     sortea su bioma base entre los candidatos de la zona de su sitio.
 *  4. montana: ice_mountains en zona helada, extreme_hills en el resto;
 *     playa: cold_beach en zonas frías, beach en las demás; oceano: la
 *     variante de la zona, profunda bajo SEA_LEVEL − 20.
 *  5. Transformaciones del pack (tierra y montana): la banda alta del ruido
 *     de cerros aplica hills_transformation y la banda rara del ruido de
 *     mutación aplica mutate_transformation (encadenables).
 *  6. La banda rara del ruido weird coloca mushroom_island (y su orilla).
 * Catalogados pero NO colocados: ríos, edges, nether, end y legacy
 * (documents/03-biomas.md los lista con su motivo).
 */
import { PRNG, Fractal2D, hashSeed } from '../noise.js';
import { BIOMAS } from './biomes.data.js';
// Nivel del mar y umbral de montaña: la fuente única es js/dimensiones.js;
// se re-exportan aquí para los consumidores históricos (mobs, tests…).
import { SEA_LEVEL, MOUNTAIN_H } from '../dimensiones.js';
export { SEA_LEVEL, MOUNTAIN_H };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Catálogo completo indexado por id (los 71 biomas del pack). */
export const BIOMES = {};
for (const def of BIOMAS) BIOMES[def.id] = def;

/* ---- Candidatos por zona climática (generate_for_climates del pack) ---- */
const ZONAS = ['frozen', 'cold', 'medium', 'lukewarm', 'warm'];
const TIERRA_POR_ZONA = {};
const OCEANO_POR_ZONA = {};
for (const zona of ZONAS) {
    TIERRA_POR_ZONA[zona] = [];
    OCEANO_POR_ZONA[zona] = { somero: [], profundo: [] };
}
for (const def of BIOMAS) {
    if (!def.zonas) continue;
    for (const [zona, peso] of def.zonas) {
        if (def.terrain === 'oceano') {
            OCEANO_POR_ZONA[zona][def.tags.includes('deep') ? 'profundo' : 'somero'].push([def, peso]);
        } else if (def.terrain === 'tierra') {
            TIERRA_POR_ZONA[zona].push([def, peso]);
        }
    }
}
// el pack no declara tierra en la zona templada-cálida (solo océanos):
// la tierra lukewarm construye con los candidatos de medium
TIERRA_POR_ZONA.lukewarm = TIERRA_POR_ZONA.medium;

/** Cortes del ruido de temperatura → zona (calibrados para Fractal2D·0.7). */
const ZONA_CORTES = [[-0.34, 'frozen'], [-0.12, 'cold'], [0.16, 'medium'], [0.28, 'lukewarm'], [Infinity, 'warm']];
const FRIAS = new Set(['frozen', 'cold']);

const PROFUNDO = SEA_LEVEL - 20;  // cota de océano profundo
const CELDA = 384;                // lado de las parcelas Voronoi de tierra
const ESC_TEMP = 700;             // escala del ruido de temperatura (regiones climáticas)
const RAREZA = 0.62;              // banda del ruido weird → isla de setas
const CERROS = 0.40;              // banda del ruido de cerros → hills_transformation
const MUTACION = 0.72;            // banda del ruido de mutación → mutate_transformation

// sales de RNG posicional (worldgen usa 11..44; aldeas 55 y 66)
const SAL_SITIO = 71, SAL_BIOMA = 72, SAL_CERROS = 73, SAL_MUTA = 74;

/** Elección ponderada sobre pares [def|id, peso] con r en [0, 1). */
function elegir(pares, r) {
    let total = 0;
    for (const [, peso] of pares) total += peso;
    let v = r * total;
    for (const [valor, peso] of pares) {
        if (v < peso) return valor;
        v -= peso;
    }
    return pares[pares.length - 1][0];
}

/** Clase de terreno por altura de superficie (sin costuras). */
function claseDeTerreno(h) {
    if (h + 1 <= SEA_LEVEL) return 'oceano'; // sumergido
    if (h <= SEA_LEVEL + 1) return 'playa';
    if (h >= MOUNTAIN_H) return 'montana';
    return 'tierra';
}

/** Anillo de muestreo alrededor de una columna costera (radio 3). */
const ANILLO = [[-3, -3], [0, -3], [3, -3], [-3, 0], [3, 0], [-3, 3], [0, 3], [3, 3]];

export class BiomeMap {
    constructor(seed) {
        this.seed = seed;
        // Los ruidos se construyen EN ORDEN FIJO desde la semilla (misma
        // disciplina que Generator): funciones globales idénticas para
        // cualquier instancia con la misma semilla.
        const rng = new PRNG(seed);
        this.temp = new Fractal2D(rng, 4);
        this.humid = new Fractal2D(rng, 4);
        this.weird = new Fractal2D(rng, 3);
        this.cerros = new Fractal2D(rng, 3);
        this.muta = new Fractal2D(rng, 3);
    }

    /** Clima en (x, z): { temp, humid, weird }, cada eje en [-1, 1]. */
    climate(x, z) {
        const v = (ruido, esc) => clamp(ruido.value(x / esc, z / esc) * 0.7, -1, 1);
        return {
            temp: v(this.temp, ESC_TEMP),
            humid: v(this.humid, 180),
            weird: v(this.weird, 300),
        };
    }

    /** Zona climática del pack en (x, z), por el ruido de temperatura. */
    zonaEn(x, z) {
        const t = clamp(this.temp.value(x / ESC_TEMP, z / ESC_TEMP) * 0.7, -1, 1);
        for (const [corte, zona] of ZONA_CORTES) if (t < corte) return zona;
    }

    /** ¿Hay agua (columna sumergida) en el anillo alrededor de (x, z)? */
    aguaCerca(x, z, heightAt) {
        for (const [dx, dz] of ANILLO) {
            if (heightAt(x + dx, z + dz) + 1 <= SEA_LEVEL) return true;
        }
        return false;
    }

    /**
     * Bioma base de tierra: parcela Voronoi jitterizada. El sitio más
     * cercano manda; su zona climática (evaluada EN EL SITIO, no en la
     * columna) elige los candidatos, y el sorteo ponderado es fijo por
     * parcela — toda la parcela comparte bioma y las fronteras son
     * orgánicas, sin costuras entre chunks.
     */
    baseDeTierra(x, z) {
        const cx0 = Math.floor(x / CELDA), cz0 = Math.floor(z / CELDA);
        let mejorD = Infinity, mejorCX = 0, mejorCZ = 0, mejorSX = 0, mejorSZ = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cx = cx0 + dx, cz = cz0 + dz;
                const r = new PRNG(hashSeed(this.seed, cx, cz, SAL_SITIO));
                const sx = (cx + r.float()) * CELDA, sz = (cz + r.float()) * CELDA;
                const d = (sx - x) * (sx - x) + (sz - z) * (sz - z);
                if (d < mejorD) {
                    mejorD = d; mejorCX = cx; mejorCZ = cz; mejorSX = sx; mejorSZ = sz;
                }
            }
        }
        const candidatos = TIERRA_POR_ZONA[this.zonaEn(mejorSX, mejorSZ)];
        if (!candidatos || candidatos.length === 0) return BIOMES.plains;
        const r = new PRNG(hashSeed(this.seed, mejorCX, mejorCZ, SAL_BIOMA));
        return elegir(candidatos, r.float());
    }

    /**
     * Transformaciones del pack sobre el bioma base: cerros y mutación.
     * La elección entre destinos ponderados es fija por parcela de 32/64
     * bloques (la mancha entera comparte destino). Un destino que no exista
     * en el catálogo o que sea de océano se ignora.
     */
    transformar(def, x, z) {
        if (def.hills && this.cerros.value(x / 90, z / 90) > CERROS) {
            const r = new PRNG(hashSeed(this.seed, x >> 5, z >> 5, SAL_CERROS));
            const destino = BIOMES[elegir(def.hills, r.float())];
            if (destino && destino.terrain !== 'oceano') def = destino;
        }
        if (def.mutate && this.muta.value(x / 240, z / 240) > MUTACION) {
            const r = new PRNG(hashSeed(this.seed, x >> 6, z >> 6, SAL_MUTA));
            const destino = BIOMES[elegir(def.mutate, r.float())];
            if (destino && destino.terrain !== 'oceano') def = destino;
        }
        return def;
    }

    /**
     * Bioma de la columna (x, z) con altura de superficie h: devuelve la
     * DEFINICIÓN generada (ver model.js).
     *
     * `heightAt(x, z)` es opcional: con él, una candidata a playa sin agua
     * en su anillo se trata como tierra (las llanuras interiores a nivel
     * del mar no son playa; un tercio del mundo está a esa cota). Sin él
     * (pruebas), la clase por altura manda.
     */
    at(x, z, h, heightAt = null) {
        let terreno = claseDeTerreno(h);
        if (terreno === 'playa' && heightAt && !this.aguaCerca(x, z, heightAt)) terreno = 'tierra';

        if (terreno === 'oceano') {
            const listas = OCEANO_POR_ZONA[this.zonaEn(x, z)];
            const lista = (h < PROFUNDO && listas.profundo.length) ? listas.profundo
                : (listas.somero.length ? listas.somero : [[BIOMES.ocean, 1]]);
            return lista[0][0]; // una variante por zona y profundidad
        }

        const raro = clamp(this.weird.value(x / 300, z / 300) * 0.7, -1, 1) > RAREZA;
        if (terreno === 'playa') {
            if (raro) return BIOMES.mushroom_island_shore;
            return FRIAS.has(this.zonaEn(x, z)) ? BIOMES.cold_beach : BIOMES.beach;
        }
        if (terreno === 'montana') {
            const base = this.zonaEn(x, z) === 'frozen' ? BIOMES.ice_mountains : BIOMES.extreme_hills;
            return this.transformar(base, x, z);
        }
        if (raro) return BIOMES.mushroom_island;
        return this.transformar(this.baseDeTierra(x, z), x, z);
    }
}

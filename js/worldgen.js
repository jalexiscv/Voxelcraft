/**
 * Generador procedural de mundo INFINITO por chunks (módulo puro, testeable
 * en Node; lo ejecuta worldgen.worker.js).
 *
 * Principios (los mismos del Minecraft real):
 *
 * 1. El terreno es una FUNCIÓN GLOBAL PURA de (semilla, x, z): cualquier
 *    chunk que evalúe `surfaceHeight` obtiene el mismo valor, se genere
 *    antes o después. Modelo paramétrico 1.18: continentalidad → spline →
 *    tipo de terreno + amplitud del relieve.
 * 2. Las features (cuevas, vetas, árboles) usan RNG SEMBRADO POR POSICIÓN
 *    (hashSeed(semilla, cx, cz, sal)), no secuencial: cada chunk decide las
 *    suyas sin importar el orden de generación.
 * 3. Las features que cruzan bordes se resuelven "mirando a los vecinos":
 *    al generar el chunk C se re-simulan (barato y determinista) los gusanos
 *    y árboles originados en los chunks cercanos, y se escribe SOLO la
 *    porción que cae dentro de C. Así una cueva atraviesa chunks sin costuras.
 * 4. El agua es local: todo hueco entre la superficie y el nivel del mar se
 *    llena al generar la columna (no hay flood fill global: un mundo
 *    infinito no tiene bordes desde los que inundar).
 */
import { PRNG, Fractal2D, hashSeed } from './noise.js';
import { B } from './blocks.js';
import { BiomeMap } from './biomes/map.js';
import { aplicarAldeas } from './villages/build.js';
import { aplicarTemplo } from './templo.js';

export const CHUNK = 16;
export const SY = 64;
export const SEA = 32;

const CAVE_RADIUS = 4;   // radio (en chunks) del vecindario de cuevas
const FEAT_RADIUS = 1;   // radio para vetas y árboles
const SALT = { CAVES: 11, ORES: 22, TREES: 33, FLORA: 44 };

/** Interpolación suave 0..1 de t entre a y b (Hermite). */
function smoothstep(a, b, t) {
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
}

/** Spline monótona por tramos (continentalidad → altura base, estilo 1.18). */
function spline(points, t) {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
        if (t < points[i][0]) {
            const [t0, v0] = points[i - 1], [t1, v1] = points[i];
            return v0 + smoothstep(t0, t1, t) * (v1 - v0);
        }
    }
    return points[points.length - 1][1];
}

const BASE_SPLINE = [
    [-1.0, -12],  // océano profundo
    [-0.35, -4],  // plataforma costera
    [-0.1, 0],    // playa / nivel del mar
    [0.15, 2],    // llanura
    [0.6, 5],     // interior elevado
    [1.1, 9],     // altiplano
];

export class Generator {
    constructor(seed) {
        this.seed = seed;
        // Los ruidos se construyen en orden fijo desde la semilla: son
        // funciones globales idénticas para todos los chunks.
        const rng = new PRNG(seed);
        this.continents = new Fractal2D(rng, 6);
        this.relief = new Fractal2D(rng, 6);
        this.detail = new Fractal2D(rng, 4);
        this.warpX = new Fractal2D(rng, 3);
        this.warpZ = new Fractal2D(rng, 3);
        this.soil = new Fractal2D(rng, 4);
        this.sandN = new Fractal2D(rng, 4);
        this.gravelN = new Fractal2D(rng, 4);
        // mapa de biomas: el MISMO BiomeMap (misma semilla) que instancia
        // MobSystem en el hilo principal — ambos ven idéntico mapa
        this.biomes = new BiomeMap(seed);
    }

    /** Altura de superficie: función global pura de (x, z). */
    surfaceHeight(x, z) {
        const wx = x + this.warpX.value(x / 60, z / 60) * 6;
        const wz = z + this.warpZ.value(x / 60, z / 60) * 6;
        const c = this.continents.value(wx / 120, wz / 120);
        const base = spline(BASE_SPLINE, c);
        const mountainMask = smoothstep(0.2, 0.75, c);
        const r = this.relief.value(wx / 48, wz / 48) * (1 + 9 * mountainMask);
        const d = this.detail.value(wx / 12, wz / 12) * 1.4;
        return Math.max(1, Math.min(SY - 6, Math.floor(SEA + base + r + d)));
    }

    /**
     * Bloque superficial de una columna: lecho global por ruidos si está
     * sumergida, y si no, el `surface.top` del bioma (con sus variantes
     * `topFrio` por clima local y `topAlt` por el ruido soil). `bioma` es
     * opcional: quien ya lo conozca lo pasa para no recalcularlo.
     */
    surfaceBlock(x, z, h, bioma = null) {
        if (h + 1 <= SEA) { // sumergido: lecho por ruidos (global, sin bioma)
            if (this.gravelN.value(x / 16, z / 16) > 0.4) return B.GRAVEL;
            if (this.sandN.value(x / 16, z / 16) > -0.3) return B.SAND;
            return B.DIRT;
        }
        const s = (bioma || this.biomes.at(x, z, h)).surface;
        // frío local: variante nevada (montañas con t < -0.3)
        if (s.topFrio && this.biomes.climate(x, z).temp < -0.3) return B[s.topFrio];
        // superficie alternativa (p. ej. podzol⇄hierba de la taiga): el ruido
        // soil ya existente, llevado a ≈[0,1], decide por columna (determinista)
        if (s.topAlt && this.soil.value(x / 12, z / 12) * 0.5 + 0.5 < s.altChance) {
            return B[s.topAlt];
        }
        return B[s.top];
    }

    /**
     * Genera el chunk (cx, cz) completo. Función pura: el resultado depende
     * solo de (semilla, cx, cz).
     * @returns {Uint16Array} CHUNK×SY×CHUNK, índice (y·CHUNK + lz)·CHUNK + lx
     *   (16 bits por celda para admitir más de 256 ids de bloque)
     */
    generateChunk(cx, cz) {
        const blocks = new Uint16Array(CHUNK * SY * CHUNK);
        const li = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;
        const x0 = cx * CHUNK, z0 = cz * CHUNK;

        // caché de alturas por columna (se consulta mucho en las features)
        const hCache = new Map();
        const heightAt = (x, z) => {
            const k = x + ',' + z;
            let h = hCache.get(k);
            if (h === undefined) { h = this.surfaceHeight(x, z); hCache.set(k, h); }
            return h;
        };

        /* ---- 1. Terreno y agua por columna (local y puro) ---- */
        for (let lx = 0; lx < CHUNK; lx++) {
            for (let lz = 0; lz < CHUNK; lz++) {
                const x = x0 + lx, z = z0 + lz;
                const h = heightAt(x, z);
                const bioma = this.biomes.at(x, z, h, heightAt);
                const dirtDepth = 2 + Math.floor(Math.abs(this.soil.value(x / 12, z / 12)) * 3);
                // bajo la superficie manda el bioma (p. ej. desierto: SAND);
                // el lecho sumergido conserva la tierra clásica
                const under = h + 1 <= SEA ? B.DIRT : B[bioma.surface.under];
                blocks[li(lx, 0, lz)] = B.BEDROCK;
                for (let y = 1; y < h; y++) {
                    blocks[li(lx, y, lz)] = y > h - dirtDepth ? under : B.STONE;
                }
                blocks[li(lx, h, lz)] = this.surfaceBlock(x, z, h, bioma);
                for (let y = h + 1; y < SEA; y++) blocks[li(lx, y, lz)] = B.WATER;
                // biomas helados: la celda superior del agua se congela
                if (bioma.congelado && blocks[li(lx, SEA - 1, lz)] === B.WATER) {
                    blocks[li(lx, SEA - 1, lz)] = B.ICE;
                }
            }
        }

        /* ---- 2. Cuevas: gusanos de los chunks vecinos que crucen este ---- */
        for (let nx = cx - CAVE_RADIUS; nx <= cx + CAVE_RADIUS; nx++) {
            for (let nz = cz - CAVE_RADIUS; nz <= cz + CAVE_RADIUS; nz++) {
                const rng = new PRNG(hashSeed(this.seed, nx, nz, SALT.CAVES));
                const worms = rng.int(3); // 0..2 gusanos por chunk de origen
                for (let i = 0; i < worms; i++) {
                    this.carveWorm(rng, blocks, x0, z0, heightAt,
                        nx * CHUNK + rng.float() * CHUNK,
                        6 + rng.float() * 42,
                        nz * CHUNK + rng.float() * CHUNK,
                        Math.floor(rng.float() * rng.float() * 110),
                        1 + rng.float() * 1.6);
                }
            }
        }

        /* ---- 3. Vetas de mineral ---- */
        const ORES = [
            { id: B.COAL_ORE, veins: 3, yMax: 52 },
            { id: B.IRON_ORE, veins: 2, yMax: 40 },
            { id: B.GOLD_ORE, veins: 1, yMax: 26 },
        ];
        for (let nx = cx - FEAT_RADIUS; nx <= cx + FEAT_RADIUS; nx++) {
            for (let nz = cz - FEAT_RADIUS; nz <= cz + FEAT_RADIUS; nz++) {
                const rng = new PRNG(hashSeed(this.seed, nx, nz, SALT.ORES));
                for (const ore of ORES) {
                    for (let v = 0; v < ore.veins; v++) {
                        this.oreVein(rng, blocks, x0, z0, ore.id,
                            nx * CHUNK + rng.float() * CHUNK,
                            2 + rng.float() * (ore.yMax - 2),
                            nz * CHUNK + rng.float() * CHUNK,
                            4 + rng.int(10));
                    }
                }
            }
        }

        /* ---- 4. Árboles (pueden cruzar bordes: radio 1) ---- */
        for (let nx = cx - FEAT_RADIUS; nx <= cx + FEAT_RADIUS; nx++) {
            for (let nz = cz - FEAT_RADIUS; nz <= cz + FEAT_RADIUS; nz++) {
                const rng = new PRNG(hashSeed(this.seed, nx, nz, SALT.TREES));
                // secuencia FIJA de rolls por chunk de origen, idéntica sea
                // cual sea el bioma: probabilidad, nº de candidatos y posición
                // de cada uno. El bioma del punto solo decide si el candidato
                // se planta (chance/max) y con qué forma y bloques.
                const roll = rng.float();
                const candidatos = 1 + rng.int(2);
                for (let t = 0; t < candidatos; t++) {
                    const tx = nx * CHUNK + rng.int(CHUNK);
                    const tz = nz * CHUNK + rng.int(CHUNK);
                    const arboles = this.biomes.at(tx, tz, heightAt(tx, tz), heightAt).trees;
                    const plantar = arboles && roll < arboles.chance &&
                        t < Math.min(candidatos, arboles.max);
                    this.plantTree(rng, blocks, x0, z0, heightAt, tx, tz,
                        plantar ? arboles : null);
                }
            }
        }

        /* ---- 5. Flora y cactus del bioma (solo dentro del propio chunk) ---- */
        {
            const rng = new PRNG(hashSeed(this.seed, cx, cz, SALT.FLORA));
            const n = rng.int(4);
            for (let i = 0; i < n; i++) {
                // rolls de secuencia fija (misma cantidad se plante o no)
                const lx = rng.int(CHUNK), lz = rng.int(CHUNK);
                const rCactus = rng.float(); // probabilidad de cactus
                const rPlanta = rng.float(); // altura del cactus o elección por pesos
                const x = x0 + lx, z = z0 + lz;
                const h = heightAt(x, z);
                if (h + 1 >= SY) continue;
                const bioma = this.biomes.at(x, z, h, heightAt);
                const suelo = blocks[li(lx, h, lz)];
                // cactus del desierto: columna de 1-3 sobre arena
                if (bioma.cactus && suelo === B.SAND && rCactus < bioma.cactus.chance) {
                    const alto = 1 + Math.floor(rPlanta * 3);
                    for (let y = h + 1; y <= h + alto && blocks[li(lx, y, lz)] === B.AIR; y++) {
                        blocks[li(lx, y, lz)] = B.CACTUS;
                    }
                    continue;
                }
                // flora del bioma, elegida por pesos y solo sobre su top
                if (!bioma.flora || bioma.flora.length === 0) continue;
                if (suelo !== B[bioma.surface.top] || blocks[li(lx, h + 1, lz)] !== B.AIR) continue;
                let v = rPlanta * bioma.flora.reduce((s, f) => s + f.weight, 0);
                let planta = bioma.flora[bioma.flora.length - 1].block;
                for (const f of bioma.flora) {
                    if (v < f.weight) { planta = f.block; break; }
                    v -= f.weight;
                }
                blocks[li(lx, h + 1, lz)] = B[planta];
            }
        }

        /* ---- 6. Aldeas: piezas de la celda propia y las 8 vecinas (villages/build.js) ---- */
        aplicarAldeas(this, blocks, cx, cz, heightAt);

        /* ---- 7. Templo del origen: monumento fijo en el punto de aparición ---- */
        // después de las aldeas: si una alcanzara el origen, el templo
        // reescribe sus columnas y siempre gana (misma costura pura)
        aplicarTemplo(this, blocks, cx, cz, heightAt);

        return blocks;
    }

    /**
     * Gusano de cueva. IMPORTANTE para el determinismo: consume el RNG en una
     * secuencia fija (independiente de qué chunk lo evalúe) y solo restringe
     * las ESCRITURAS al chunk destino. Talla únicamente piedra bajo la
     * superficie (−3) para no perforar océanos ni el manto vegetal.
     */
    carveWorm(rng, blocks, x0, z0, heightAt, x, y, z, length, radiusMax) {
        let theta = rng.float() * Math.PI * 2, dTheta = 0;
        let phi = (rng.float() - 0.5) * 0.6, dPhi = 0;
        for (let step = 0; step < length; step++) {
            x += Math.sin(theta) * Math.cos(phi);
            z += Math.cos(theta) * Math.cos(phi);
            y += Math.sin(phi);
            theta += dTheta * 0.2;
            dTheta = dTheta * 0.9 + (rng.float() - rng.float());
            phi = phi * 0.7 + dPhi * 0.25;
            dPhi = dPhi * 0.75 + (rng.float() - rng.float());

            const r = 1 + Math.sin(step * Math.PI / length) * radiusMax;
            // descarte rápido si la esfera no toca el chunk destino
            if (x + r < x0 || x - r >= x0 + CHUNK || z + r < z0 || z - r >= z0 + CHUNK) continue;

            const r2 = r * r;
            for (let bx = Math.floor(x - r); bx <= x + r; bx++) {
                if (bx < x0 || bx >= x0 + CHUNK) continue;
                for (let bz = Math.floor(z - r); bz <= z + r; bz++) {
                    if (bz < z0 || bz >= z0 + CHUNK) continue;
                    const yTop = Math.min(SY - 2, heightAt(bx, bz) - 3); // no romper la superficie
                    for (let by = Math.max(1, Math.floor(y - r)); by <= Math.min(yTop, y + r); by++) {
                        const dx = bx - x, dy = by - y, dz = bz - z;
                        if (dx * dx + dy * dy * 2 + dz * dz > r2) continue;
                        const i = (by * CHUNK + (bz - z0)) * CHUNK + (bx - x0);
                        if (blocks[i] === B.STONE) blocks[i] = B.AIR;
                    }
                }
            }
        }
    }

    /** Veta de mineral: caminata corta reemplazando solo piedra. */
    oreVein(rng, blocks, x0, z0, oreId, x, y, z, length) {
        let theta = rng.float() * Math.PI * 2;
        let phi = (rng.float() - 0.5) * 0.8;
        for (let step = 0; step < length; step++) {
            x += Math.sin(theta) * Math.cos(phi);
            z += Math.cos(theta) * Math.cos(phi);
            y += Math.sin(phi) * 0.6;
            theta += (rng.float() - rng.float()) * 0.6;
            const bx = Math.round(x), by = Math.round(y), bz = Math.round(z);
            for (const [ox, oy, oz] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
                const px = bx + ox, py = by + oy, pz = bz + oz;
                if (px < x0 || px >= x0 + CHUNK || pz < z0 || pz >= z0 + CHUNK || py < 1 || py >= SY - 1) continue;
                const i = (py * CHUNK + (pz - z0)) * CHUNK + (px - x0);
                if (blocks[i] === B.STONE) blocks[i] = oreId;
            }
        }
    }

    /**
     * Árbol parametrizado por el bioma: `arboles` = {kind, log, leaves}, o
     * null para no plantar. CRÍTICO para el determinismo: la geometría se
     * decide SIEMPRE con la misma secuencia de RNG (aunque no se plante o el
     * árbol no toque este chunk) — un roll de altura y 16 saltos de esquina;
     * cada forma deriva sus medidas de esos mismos rolls sin consumir extras,
     * de modo que todos los chunks vecinos "ven" la misma secuencia.
     */
    plantTree(rng, blocks, x0, z0, heightAt, x, z, arboles) {
        // rolls de secuencia fija (se consumen SIEMPRE, se plante o no)
        const hRoll = rng.float();
        const cornerSkips = [];
        for (let i = 0; i < 16; i++) cornerSkips.push(rng.int(2));
        if (!arboles) return;

        // altura del tronco por forma: [mínimo, abanico] sobre el mismo roll
        const TRONCO = {
            roble: [4, 3], conifera: [6, 4], acacia: [4, 2],
            jungla: [8, 5], cerezo: [3, 2],
        };
        const [minimo, abanico] = TRONCO[arboles.kind];
        const height = minimo + Math.floor(hRoll * abanico);
        const log = B[arboles.log], leaves = B[arboles.leaves];

        const base = heightAt(x, z);
        // condiciones puras: techo suficiente y suelo plantable (el bloque
        // superficial de la columna debe ser hierba, podzol o hierba nevada)
        if (base + height + 2 >= SY) return;
        const suelo = this.surfaceBlock(x, z, base, this.biomes.at(x, z, base, heightAt));
        if (suelo !== B.GRASS && suelo !== B.PODZOL && suelo !== B.SNOWY_GRASS) return;

        const write = (bx, by, bz, id, onlyAir) => {
            if (bx < x0 || bx >= x0 + CHUNK || bz < z0 || bz >= z0 + CHUNK || by < 1 || by >= SY) return;
            const i = (by * CHUNK + (bz - z0)) * CHUNK + (bx - x0);
            if (onlyAir && blocks[i] !== B.AIR) return;
            blocks[i] = id;
        };

        write(x, base, z, B.DIRT, false);
        for (let i = 1; i <= height; i++) write(x, base + i, z, log, false);

        // capa cuadrada de hojas de radio r centrada en (cx, cz); las
        // esquinas se aclaran con los saltos sorteados por adelantado
        let corner = 0;
        const capa = (cy, r, huecoTronco = false, cx = x, cz = z) => {
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (r > 0 && Math.abs(dx) === r && Math.abs(dz) === r) {
                        if (cornerSkips[corner++ % 16] === 0) continue; // esquinas ralas
                    }
                    if (huecoTronco && dx === 0 && dz === 0) continue; // hueco del tronco
                    write(cx + dx, cy, cz + dz, leaves, true);
                }
            }
        };

        const top = base + height; // última celda del tronco
        if (arboles.kind === 'roble') {
            // la copa clásica: dos pisos anchos y dos estrechos
            for (let dy = 0; dy <= 3; dy++) capa(top - 2 + dy, dy < 2 ? 2 : 1, dy < 2);
        } else if (arboles.kind === 'conifera') {
            // copa cónica: anillos 2,2,1,1 rematados en punta
            const radios = [2, 2, 1, 1];
            for (let dy = 0; dy <= 3; dy++) capa(top - 3 + dy, radios[dy]);
            capa(top + 1, 0);
        } else if (arboles.kind === 'acacia') {
            // copa plana 5×5 desplazada 1-2 bloques (derivado de rolls fijos)
            const ax = x + (cornerSkips[0] ? 1 : -1) * (1 + cornerSkips[1]);
            const az = z + (cornerSkips[2] ? 1 : -1) * (1 + cornerSkips[3]);
            capa(top, 2, false, ax, az);
            capa(top + 1, 1, false, ax, az);
        } else if (arboles.kind === 'jungla') {
            // copa compacta en lo alto del tronco: 5×5 doble y remate 3×3
            capa(top - 1, 2);
            capa(top, 2);
            capa(top + 1, 1);
        } else { // cerezo
            // copa ancha redondeada 5×5×3 (las esquinas ralas la suavizan)
            capa(top - 1, 2);
            capa(top, 2);
            capa(top + 1, 2);
        }
    }
}

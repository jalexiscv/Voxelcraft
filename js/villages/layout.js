/**
 * Trazador determinista de aldeas: decide por CELDA de 8×8 chunks si nace
 * una aldea y, en ese caso, traza todas sus piezas (pozo en el ancla,
 * caminos en cruz y parcelas con edificio) de forma 100 % pura y
 * reproducible (documents/05-aldeas.md, fase 1 del plan).
 *
 * Módulo PURO: no conoce ni el DOM ni el generador de mundo. Quien llama
 * (worldgen.js o las pruebas) inyecta las `sondas`
 * { biomaEn(x, z) → id de bioma, alturaEn(x, z) → y del suelo } con las que
 * el trazador consulta el terreno. Misma semilla + misma celda + mismas
 * sondas ⇒ misma aldea, sin importar el orden de generación de chunks.
 */
import { PRNG, hashSeed } from '../noise.js';
import { BIOMAS_ALDEA, POOL, UNICOS } from './model.js';
import { PLANOS } from './planos/registry.js';

/** Lado de la celda de aldea en chunks (8×8 chunks = 128×128 bloques). */
export const CELDA_CHUNKS = 8;

/** Sal de la feature aldea (worldgen.js reserva 11/22/33/44 para las suyas). */
export const SAL_ALDEA = 55;

import { CHUNK, SEA_LEVEL } from '../dimensiones.js';

const CELDA_BLOQUES = CELDA_CHUNKS * CHUNK; // 128 bloques por lado de celda
const NIVEL_MAR = SEA_LEVEL;                // fuente única: dimensiones.js
const PROB_ALDEA = 0.12;                    // fracción de celdas con aldea (antes de requisitos)
const PLAZA = 4;                            // semilado de la plaza del pozo (7×7 + anillo)

/**
 * Margen del ancla respecto al borde de la celda. El radio máximo de una
 * aldea es ~37 bloques (caminos de hasta PLAZA+28 = 32 desde el ancla más
 * media parcela de 11 de ancho), así que con 24 de margen la aldea entera
 * cabe en su celda + 1 chunk (37 − 24 = 13 ≤ 16): la materialización solo
 * necesita consultar la celda propia y las 8 vecinas.
 */
const MARGEN = 24;

/**
 * Cardinales en orden fijo: −Z, +X, +Z, −X. Cumplen doble función:
 * direcciones de los caminos y tabla de rotación de fachada — un plano con
 * rot r tiene su fachada (−Z local) mirando a DIRECCIONES[r] en mundo. El
 * materializador debe aplicar esta MISMA tabla al girar las capas.
 */
const DIRECCIONES = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** ¿Se tocan dos cajas 2D inclusivas [x0, z0, x1, z1]? */
const chocan = (a, b) =>
    a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

/**
 * Caja 2D inclusiva [x0, z0, x1, z1] que ocupa una pieza en el plano XZ.
 * Convención de anclaje: (x, z) es el CENTRO de la huella del edificio (con
 * lado par, la huella es [x − (lado>>1), x − (lado>>1) + lado − 1]); si rot
 * es impar, ancho y fondo se intercambian. Un camino ocupa su único bloque.
 */
export function cajaDePieza(pieza) {
    if (pieza.tipo === 'camino') return [pieza.x, pieza.z, pieza.x, pieza.z];
    const [ancho, , fondo] = PLANOS[pieza.id].tam;
    const fx = (pieza.rot % 2) ? fondo : ancho; // huella rotada en mundo
    const fz = (pieza.rot % 2) ? ancho : fondo;
    const x0 = pieza.x - (fx >> 1), z0 = pieza.z - (fz >> 1);
    return [x0, z0, x0 + fx - 1, z0 + fz - 1];
}

/** Sorteo ponderado de un plano del POOL, excluyendo los UNICOS ya usados. */
function sortearPlano(rng, usados) {
    const candidatos = Object.entries(POOL).filter(([id]) => !usados.has(id));
    let total = 0;
    for (const [, peso] of candidatos) total += peso;
    let r = rng.int(total);
    for (const [id, peso] of candidatos) {
        r -= peso;
        if (r < 0) return id;
    }
    return candidatos[candidatos.length - 1][0]; // inalcanzable (r < total)
}

/**
 * Pieza de edificio para la parcela en la estación `d` del camino de
 * dirección (dx, dz), en el lado `lado` (±1): a 1 bloque de separación del
 * camino, centrada a lo largo de él y con la fachada (−Z local) mirando
 * hacia él. La y es la altura del suelo en el centro de la parcela (el
 * aplanado por parcela nivelará a esa cota).
 */
function piezaDeParcela(id, ancla, dx, dz, d, lado, sondas) {
    const [ancho, , fondo] = PLANOS[id].tam;
    const px = -dz * lado, pz = dx * lado; // unitario del camino hacia la parcela
    const rot = DIRECCIONES.findIndex(([fx, fz]) => fx === -px && fz === -pz);
    // caja en mundo: `ancho` a lo largo del camino, `fondo` en perpendicular
    let x0, z0, fx, fz;
    if (dz === 0) {                        // camino a lo largo de X
        fx = ancho; fz = fondo;
        x0 = ancla.x + dx * d - (fx >> 1);
        z0 = (pz > 0) ? ancla.z + 2 : ancla.z - 2 - (fz - 1);
    } else {                               // camino a lo largo de Z
        fx = fondo; fz = ancho;
        z0 = ancla.z + dz * d - (fz >> 1);
        x0 = (px > 0) ? ancla.x + 2 : ancla.x - 2 - (fx - 1);
    }
    const cx = x0 + (fx >> 1), cz = z0 + (fz >> 1);
    return { tipo: 'edificio', id, x: cx, z: cz, rot, y: sondas.alturaEn(cx, cz) };
}

/**
 * Decide y traza la aldea de una celda: null si no nace, o
 * { ancla: {x, z, y}, piezas } con piezas[0] = pozo, piezas de edificio
 * { tipo: 'edificio', id, x, z, rot, y } y de camino { tipo: 'camino', x, z }
 * (bloque a bloque; su y la decide el materializador con alturaEn para
 * seguir el terreno). Toda la decisión sale de UN solo PRNG consumido en
 * secuencia fija; si un requisito falla, la celda queda SIN aldea, sin
 * reintentos (determinismo).
 */
export function villageAt(seed, celdaX, celdaZ, sondas) {
    const rng = new PRNG(hashSeed(seed, celdaX, celdaZ, SAL_ALDEA));

    // --- ¿Nace aldea en esta celda? (~12 %) ---
    if (rng.float() >= PROB_ALDEA) return null;

    // --- Ancla dentro de la celda, con margen para caber en celda + 1 chunk ---
    const rango = CELDA_BLOQUES - 2 * MARGEN + 1;
    const ax = celdaX * CELDA_BLOQUES + MARGEN + rng.int(rango);
    const az = celdaZ * CELDA_BLOQUES + MARGEN + rng.int(rango);

    // --- Requisitos del plan (documents/05-aldeas.md §2) ---
    if (!BIOMAS_ALDEA.includes(sondas.biomaEn(ax, az))) return null;
    const ay = sondas.alturaEn(ax, az);
    if (ay <= NIVEL_MAR) return null;      // sobre el nivel del mar
    let hMin = Infinity, hMax = -Infinity; // desnivel < 4 en el 7×7 del pozo
    for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
            const h = sondas.alturaEn(ax + dx, az + dz);
            if (h < hMin) hMin = h;
            if (h > hMax) hMax = h;
        }
    }
    if (hMax - hMin >= 4) return null;

    // --- Trazado con el MISMO rng en secuencia fija ---
    const ancla = { x: ax, z: az, y: ay };
    const piezas = [{ tipo: 'edificio', id: 'pozo', x: ax, z: az, rot: 0, y: ay }];
    const cajas = [[ax - PLAZA, az - PLAZA, ax + PLAZA, az + PLAZA]]; // plaza reservada
    const usados = new Set();              // UNICOS ya colocados en esta aldea

    const nCaminos = 2 + rng.int(3);       // 2-4 caminos en cruz
    const dirInicial = rng.int(4);         // cardinal del primero (el resto, consecutivos)
    for (let i = 0; i < nCaminos; i++) {
        const [dx, dz] = DIRECCIONES[(dirInicial + i) % 4];
        const fin = PLAZA + 12 + rng.int(17); // 12-28 bloques desde el borde de la plaza
        for (let d = PLAZA + 1; d <= fin; d++) {
            piezas.push({ tipo: 'camino', x: ax + dx * d, z: az + dz * d });
        }
        // parcelas alternas a ambos lados cada 8-12 bloques
        let d = PLAZA, lado = 1;
        for (;;) {
            d += 8 + rng.int(5);
            if (d > fin) break;
            const id = sortearPlano(rng, usados);
            const pieza = piezaDeParcela(id, ancla, dx, dz, d, lado, sondas);
            lado = -lado;
            const caja = cajaDePieza(pieza);
            if (cajas.some((c) => chocan(c, caja))) continue; // choca: se descarta
            cajas.push(caja);
            piezas.push(pieza);
            if (UNICOS.includes(id)) usados.add(id);
        }
    }
    return { ancla, piezas };
}

/**
 * Rectángulo [x0, z0, x1, z1] que engloba TODAS las piezas de la aldea
 * (con los tamaños ya rotados de los planos): es la caja que el generador
 * consulta para saber si la aldea toca un chunk y hay que materializarla.
 */
export function rectanguloDe(aldea) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const pieza of aldea.piezas) {
        const c = cajaDePieza(pieza);
        if (c[0] < x0) x0 = c[0];
        if (c[1] < z0) z0 = c[1];
        if (c[2] > x1) x1 = c[2];
        if (c[3] > z1) z1 = c[3];
    }
    return [x0, z0, x1, z1];
}

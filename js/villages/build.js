/**
 * Materializador de aldeas en chunks (fase 2 del plan de
 * documents/05-aldeas.md): al generar un chunk, worldgen.js consulta la
 * celda de aldea del chunk y las 8 vecinas (layout.js garantiza que toda
 * aldea cabe en su celda + 1 chunk) y escribe SOLO los bloques de las
 * piezas que caen dentro del chunk — el mismo principio de costura
 * orden-independiente que cuevas y árboles.
 *
 * Determinismo: las sondas del trazador usan las funciones GLOBALES puras
 * del generador (surfaceHeight y BiomeMap, con la misma firma con la que
 * worldgen las consulta), nunca el chunk ya poblado; las celdas y las
 * piezas se recorren en orden fijo. Mismo resultado se genere el chunk que
 * se genere primero, sin estado compartido entre chunks (la caché de celdas
 * es de una función pura: solo ahorra re-trazados).
 */
import { PRNG, hashSeed } from '../noise.js';
import { B } from '../blocks.js';
import { ROLES_POSICIONALES, resolverBloque } from './model.js';
import { CELDA_CHUNKS, villageAt, rectanguloDe, cajaDePieza } from './layout.js';
import { PLANOS } from './planos/registry.js';

const CHUNK = 16;     // lado de chunk en bloques (= worldgen.js)
const SY = 64;        // altura del mundo (= worldgen.js)
const NIVEL_MAR = 32; // = SEA de worldgen.js
const RELLENO = 4;    // profundidad del relleno de DIRT bajo cada parcela
const SAL_CULTIVO = 66; // sal del rol posicional CULTIVO (sigue a SAL_ALDEA = 55)

/**
 * Bloque de cultivo del rol posicional CULTIVO para la columna de mundo
 * (x, z): función PURA de (semilla, x, z), así que la misma columna sale
 * igual se genere el chunk que se genere. Familia por columna con el trigo
 * como pan de la aldea (~50 % trigo, ~25 % zanahoria, ~25 % patata) y etapa
 * 0..3 sesgada a las medias/altas (10/20/35/35 %): una granja recién
 * descubierta se ve crecida pero no uniforme.
 */
export function bloqueCultivo(seed, x, z) {
    const rng = new PRNG(hashSeed(seed, x, z, SAL_CULTIVO));
    const f = rng.float();
    const familia = f < 0.5 ? B.TRIGO_0 : f < 0.75 ? B.ZANAHORIA_0 : B.PATATA_0;
    const e = rng.float();
    const etapa = e < 0.10 ? 0 : e < 0.30 ? 1 : e < 0.65 ? 2 : 3;
    return familia + etapa; // la etapa ES el id (ids contiguos por familia)
}

/**
 * Caché módulo-local del trazado por (semilla, celda). villageAt es PURO
 * (misma semilla + mismas sondas ⇒ misma aldea), así que la caché es solo
 * una optimización: sirve el mismo trazado a cualquier Generator de la
 * misma semilla sin re-trazar la aldea chunk tras chunk.
 */
const cacheCeldas = new Map();

/**
 * Trazado cacheado de la celda: null si no tiene aldea, o
 * { aldea, rect, biomaAncla } listo para materializar.
 */
function aldeaDeCelda(seed, celdaX, celdaZ, sondas) {
    const k = seed + '|' + celdaX + '|' + celdaZ;
    let entrada = cacheCeldas.get(k);
    if (entrada === undefined) {
        const aldea = villageAt(seed, celdaX, celdaZ, sondas);
        entrada = aldea && {
            aldea,
            rect: rectanguloDe(aldea),
            // aldea homogénea: TODOS los roles se resuelven con el bioma
            // del ancla aunque el rectángulo cruce a otro bioma
            biomaAncla: sondas.biomaEn(aldea.ancla.x, aldea.ancla.z),
        };
        cacheCeldas.set(k, entrada);
    }
    return entrada;
}

/**
 * Coordenadas locales [lx, lz] del plano para la celda (u, v) de su huella
 * en mundo (u, v ≥ 0 desde la esquina x0/z0 de cajaDePieza). Inversa de la
 * tabla DIRECCIONES de layout.js: con rot r la fachada (fila lz = 0 del
 * plano) mira a [−Z, +X, +Z, −X][r] en mundo.
 */
function localDe(rot, u, v, ancho, fondo) {
    switch (rot) {
        case 0: return [u, v];
        case 1: return [v, fondo - 1 - u];
        case 2: return [ancho - 1 - u, fondo - 1 - v];
        default: return [ancho - 1 - v, u];
    }
}

/**
 * Materializa en el chunk (cx, cz) todas las aldeas de su celda y las 8
 * vecinas cuyo rectángulo lo toque. `gen` es el Generator (aporta seed,
 * biomes y, vía `alturaEn`, la altura base del terreno); `alturaEn(x, z)`
 * debe ser surfaceHeight (cacheada o no): NUNCA el chunk ya poblado.
 */
export function aplicarAldeas(gen, blocks, cx, cz, alturaEn) {
    const sondas = {
        alturaEn,
        // misma firma de BiomeMap que usa worldgen (con alturaEn, para que
        // una candidata a playa sin agua en su anillo cuente como tierra)
        biomaEn: (x, z) => gen.biomes.at(x, z, alturaEn(x, z), alturaEn).id,
    };
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const celdaX = Math.floor(cx / CELDA_CHUNKS);
    const celdaZ = Math.floor(cz / CELDA_CHUNKS);
    // celda propia y 8 vecinas EN ORDEN FIJO: si dos aldeas alcanzaran las
    // mismas columnas, toda generación escribiría en el mismo orden
    for (let nx = celdaX - 1; nx <= celdaX + 1; nx++) {
        for (let nz = celdaZ - 1; nz <= celdaZ + 1; nz++) {
            const entrada = aldeaDeCelda(gen.seed, nx, nz, sondas);
            if (!entrada) continue; // celda sin aldea: salida rápida
            const [rx0, rz0, rx1, rz1] = entrada.rect;
            if (rx1 < x0 || rx0 >= x0 + CHUNK ||
                rz1 < z0 || rz0 >= z0 + CHUNK) continue; // no toca el chunk
            materializarAldea(entrada, gen.seed, blocks, x0, z0, alturaEn);
        }
    }
}

/**
 * Escribe en el chunk los bloques de la aldea que caen dentro de él,
 * recorriendo las piezas en el orden fijo del trazado.
 */
function materializarAldea(entrada, seed, blocks, x0, z0, alturaEn) {
    const li = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;
    const camino = resolverBloque('CAMINO', entrada.biomaAncla);
    for (const pieza of entrada.aldea.piezas) {
        if (pieza.tipo === 'camino') {
            const { x, z } = pieza;
            if (x < x0 || x >= x0 + CHUNK || z < z0 || z >= z0 + CHUNK) continue;
            const h = alturaEn(x, z); // el camino sigue la elevación base
            if (h + 1 <= NIVEL_MAR) continue; // columna sumergida: el agua no se toca
            blocks[li(x - x0, h, z - z0)] = camino; // el suelo pasa a CAMINO
            // 2 de aire encima: despeja flora y ramas para poder caminar
            for (let y = h + 1; y <= Math.min(SY - 1, h + 2); y++) {
                blocks[li(x - x0, y, z - z0)] = B.AIR;
            }
        } else {
            estamparEdificio(pieza, entrada.biomaAncla, seed, blocks, x0, z0, li);
        }
    }
}

/**
 * Aplana la parcela a la y de la pieza y estampa el plano rotado. El
 * trabajo es por COLUMNA de la huella: cada chunk procesa solo las suyas y
 * el edificio queda íntegro aunque cruce el borde.
 */
function estamparEdificio(pieza, biomaAncla, seed, blocks, x0, z0, li) {
    const plano = PLANOS[pieza.id];
    const [ancho, alto, fondo] = plano.tam;
    const caja = cajaDePieza(pieza); // huella [x0, z0, x1, z1] ya rotada
    const wx0 = Math.max(caja[0], x0), wx1 = Math.min(caja[2], x0 + CHUNK - 1);
    const wz0 = Math.max(caja[1], z0), wz1 = Math.min(caja[3], z0 + CHUNK - 1);
    if (wx0 > wx1 || wz0 > wz1) return; // la huella no toca este chunk

    // clave → id de bloque, resuelta UNA vez con el bioma del ancla; los
    // roles posicionales quedan a null y se resuelven columna a columna
    const ids = {};
    const posicional = {};
    for (const [ch, valor] of Object.entries(plano.clave)) {
        if (ROLES_POSICIONALES.includes(valor)) posicional[ch] = valor;
        else ids[ch] = resolverBloque(valor, biomaAncla);
    }

    const yBase = pieza.y;                         // la capa 0 va a ras de suelo
    const yCorte = Math.min(SY - 1, yBase + alto); // corte: alto del plano + 1
    for (let wx = wx0; wx <= wx1; wx++) {
        for (let wz = wz0; wz <= wz1; wz++) {
            const lcx = wx - x0, lcz = wz - z0;
            // aplanado: DIRT incondicional hasta RELLENO por debajo (tapa
            // cuevas y hondonadas: el edificio nunca queda flotando) y corte
            // a aire por encima (desmonta laderas y copas de árboles)
            for (let y = Math.max(1, yBase - RELLENO); y < yBase; y++) {
                blocks[li(lcx, y, lcz)] = B.DIRT;
            }
            for (let y = yBase; y <= yCorte; y++) {
                blocks[li(lcx, y, lcz)] = B.AIR;
            }
            // estampado del plano rotado: el punto NO escribe (conserva el
            // aire del corte, que ya vació los interiores)
            const [lx, lz] = localDe(pieza.rot, wx - caja[0], wz - caja[1], ancho, fondo);
            for (let dy = 0; dy < alto; dy++) {
                const y = yBase + dy;
                if (y >= SY) break; // techo del mundo: se trunca (rarísimo)
                const ch = plano.capas[dy][lz][lx];
                if (ch === '.') continue;
                // CULTIVO: bloque por columna de mundo (semilla, wx, wz)
                const id = posicional[ch] === 'CULTIVO'
                    ? bloqueCultivo(seed, wx, wz)
                    : ids[ch];
                // puerta de dos bloques: la celda del plano marca la hoja
                // INFERIOR y su TOP va a y+1 (dentro del corte de aire). Si
                // el plano trae la puerta apilada (casa_grande y biblioteca:
                // D también en la capa 2), la celda con otra puerta justo
                // DEBAJO es la hoja superior. Determinista e independiente
                // del orden: ambas celdas comparten columna (y chunk) y las
                // dos ramas escriben el mismo resultado en las mismas y
                if (id === B.DOOR_CLOSED) {
                    const chAbajo = dy > 0 ? plano.capas[dy - 1][lz][lx] : null;
                    if (chAbajo !== null && ids[chAbajo] === B.DOOR_CLOSED) {
                        blocks[li(lcx, y, lcz)] = B.DOOR_TOP_CLOSED;
                    } else {
                        blocks[li(lcx, y, lcz)] = B.DOOR_CLOSED;
                        if (y + 1 < SY) blocks[li(lcx, y + 1, lcz)] = B.DOOR_TOP_CLOSED;
                    }
                    continue;
                }
                blocks[li(lcx, y, lcz)] = id;
            }
        }
    }
}

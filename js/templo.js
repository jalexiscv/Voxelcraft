/**
 * Templo del origen: monumento fijo que corona SIEMPRE el punto de
 * aparición (columnas alrededor de x=0, z=0). Diseño voxel propio: una
 * pirámide escalonada brutalista sobre plataforma en gradas, con columnatas
 * en las fachadas, contrafuertes diagonales en las cuatro esquinas, torres
 * gemelas flanqueando la entrada sur y una cámara interior con el kit de
 * inicio bajo una claraboya de cristal.
 *
 * Módulo PURO con el mismo patrón de costura que js/villages/build.js: al
 * generar un chunk, worldgen.js (paso 7) llama a aplicarTemplo y este
 * escribe SOLO las celdas del chunk que caen dentro de la huella. Toda la
 * geometría es una función pura de (y0, x, y, z) — y0 se deriva de
 * alturaEn(0, 0), idéntica desde cualquier chunk — así que el resultado es
 * byte a byte el mismo se genere en el orden que se genere. Los acentos de
 * musgo usan hash posicional (nunca RNG secuencial).
 *
 * Se aplica DESPUÉS de las aldeas: si una aldea alcanzara el origen, el
 * templo reescribe sus columnas de arriba abajo y siempre gana.
 */
import { hashSeed } from './noise.js';
import { B } from './blocks.js';

const CHUNK = 16;      // lado de chunk en bloques (= worldgen.js)
const SY = 64;         // altura del mundo (= worldgen.js)
const SEA = 32;        // nivel del mar (= worldgen.js)

const SEMI = 15;       // semilado de la base: 31×31 centrada en el origen
const MARGEN = 1;      // margen del rectángulo para el descarte por chunk
const RELLENO = 6;     // profundidad del relleno bajo la plataforma (tapa cuevas)
const Y0_MAX = 48;     // con y0 ≤ 48 las torres (y0+14) no pasan de y=62
const SAL_MUSGO = 770; // sal del hash posicional de los acentos de musgo

/** Geometría pública (la consume la suite de pruebas). */
export const TEMPLO = {
    SEMI,                 // semilado de la base (31×31)
    ALTO_PLATAFORMA: 3,   // plaza a y0+3 (tres gradas de 1)
    ALTO_CUERPO: 6,       // cima (claraboya) a y0+9; parapeto a y0+10
    ALTO_TORRES: 14,      // remate de las torres a y0+14 (≤ 62)
};

/**
 * Nivel de la base del templo: la altura del terreno en el origen, acotada
 * a [SEA, 48] para que ni se hunda en el mar ni el remate pase de y=62.
 * Función pura de alturaEn (surfaceHeight): idéntica desde cualquier chunk.
 */
export function nivelBaseTemplo(alturaEn) {
    return Math.max(SEA, Math.min(Y0_MAX, alturaEn(0, 0)));
}

/**
 * Acento determinista de musgo sobre el adoquín: hash posicional (semilla,
 * x, z, y) — sin estado, cada chunk ve el mismo acento en la misma celda.
 */
function conMusgo(seed, x, y, z) {
    return hashSeed(seed, x, z, SAL_MUSGO + y) % 7 === 0 ? B.MOSSY_COBBLE : B.COBBLE;
}

/**
 * Bloque del templo en la celda (x, y, z) del MUNDO (huella |x|,|z| ≤ SEMI,
 * y por encima del relleno): función pura de (y0, semilla). Devuelve
 * también el AIRE del corte — quien llama sobrescribe la columna entera.
 *
 * Cotas verticales (todas relativas a y0 = nivelBaseTemplo):
 *   y0+1..y0+3   gradas de COBBLE (d ≤ 15 / 13 / 11); plaza yP = y0+3
 *   yP+1..yP+5   cuerpo de STONE en terrazas (d ≤ 9 / 8 / 7) y cámara 9×9×5
 *   yC = yP+6    cima 13×13 con claraboya 5×5 de GLASS; parapeto en yC+1
 *   yP+1..yP+11  torres gemelas 5×5 en la fachada sur (remate plano)
 */
function bloqueTemplo(x, y, z, y0, seed) {
    const yP = y0 + 3;                 // plaza: cota superior de la plataforma
    const yC = yP + 6;                 // cima: cubierta del cuerpo
    const ax = Math.abs(x), az = Math.abs(z);
    const d = Math.max(ax, az);        // distancia Chebyshev al eje del templo

    /* 1. Relleno profundo: zócalo de piedra que tapa cuevas y hondonadas. */
    if (y <= y0) return B.STONE;

    /* 2. Cámara interior 9×9×5 bajo la claraboya: hueco + kit de inicio
       contra el muro norte (+Z) y antorchas de pie en muros este/oeste/sur. */
    if (ax <= 4 && az <= 4 && y >= yP + 1 && y <= yP + 5) {
        if (y === yP + 1) {
            if (z === 4) {
                if (x === -4) return B.CRAFTING_TABLE;
                if (x === -2) return B.FURNACE;
                if (x === 2) return B.CHEST;   // nace vacío (sin blockData)
                if (x === 4) return B.BED;
            }
            if ((z === 0 || z === -4) && ax === 4) return B.TORCH;
        }
        return B.AIR;
    }

    /* 3. Corredor de entrada 3×4 hacia el sur (−Z): trinchera abierta que
       atraviesa las terrazas y desemboca en la cámara. */
    if (ax <= 1 && z >= -9 && z <= -5 && y >= yP + 1 && y <= yP + 4) return B.AIR;

    /* 4. Torres gemelas 5×5 flanqueando la entrada (centros en x=±6, z=−9),
       más altas que el cuerpo, con pilastras alternas en las caras. */
    {
        const tx = x < 0 ? -6 : 6;     // centro de la torre de este lado
        const u = x - tx, v = z + 9;   // coordenadas locales de la torre
        if (Math.abs(u) <= 2 && Math.abs(v) <= 2 && y >= yP + 1 && y <= yP + 11) {
            if (Math.max(Math.abs(u), Math.abs(v)) === 2) {   // muro exterior
                if (Math.abs(u) === 2 && Math.abs(v) === 2) return B.STONE; // arista
                const s = Math.abs(u) === 2 ? v : u;          // recorre la cara
                if ((s & 1) === 1) return conMusgo(seed, x, y, z); // pilastra
            }
            return B.STONE;
        }
    }

    /* 5. Parapeto perimetral de la cima (1 de alto sobre el borde 13×13). */
    if (d === 6 && y === yC + 1) return B.STONE;

    /* 6. Cima plana 13×13 con claraboya central 5×5 de cristal, a ras: nadie
       cae dentro y el sol ilumina la cámara. */
    if (d <= 6 && y === yC) return ax <= 2 && az <= 2 ? B.GLASS : B.STONE;

    /* 7. Contrafuertes diagonales: alerones escalonados de COBBLE que bajan
       desde media altura del cuerpo (yP+4 en d=9) hasta las esquinas de la
       plataforma (y0+2 en d=14), sobre la banda |ax−az| ≤ 1. */
    if (Math.abs(ax - az) <= 1 && d >= 9 && d <= 14 && y <= yP + 13 - d) {
        return conMusgo(seed, x, y, z);
    }

    /* 8. Cuerpo piramidal truncado de STONE en tres terrazas, con columnatas
       en las paredes vistas: franjas verticales alternas STONE/COBBLE. */
    if (d <= 9 && y >= yP + 1) {
        const techo = d <= 6 ? yC : d === 7 ? yP + 5 : d === 8 ? yP + 4 : yP + 2;
        if (y <= techo) {
            const pared = d === 9 || (d === 8 && y >= yP + 3) || (d === 7 && y === yP + 5);
            if (pared) {
                const s = az === d ? x : z;    // coordenada que recorre la cara
                if ((s & 1) === 1) return conMusgo(seed, x, y, z);
            }
            return B.STONE;
        }
    }

    /* 9. Plataforma en gradas de COBBLE (d ≤ 11 / 13 / 15, cada grada 1 más
       alta y 2 más estrecha), con senda de piedra en el eje de entrada (los
       escalones de las gradas la hacen transitable) y suelo pulido en la
       cámara y el corredor. */
    {
        const top = d <= 11 ? yP : d <= 13 ? y0 + 2 : y0 + 1;
        if (y <= top) {
            if (y === top && ((ax <= 1 && z <= -5) || (ax <= 4 && az <= 4))) return B.STONE;
            return B.COBBLE;
        }
    }

    /* 10. Corte de aire: despeja terreno, árboles o aldeas sobre el templo. */
    return B.AIR;
}

/**
 * Materializa en el chunk (cx, cz) la porción del templo que le toque.
 * Misma firma y contrato que aplicarAldeas: `gen` aporta la semilla y
 * `alturaEn(x, z)` debe ser surfaceHeight (cacheada o no), NUNCA el chunk ya
 * poblado. Si el rectángulo del templo (base + margen) no toca el chunk,
 * salida inmediata sin coste.
 */
export function aplicarTemplo(gen, blocks, cx, cz, alturaEn) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    if (x0 > SEMI + MARGEN || x0 + CHUNK - 1 < -SEMI - MARGEN ||
        z0 > SEMI + MARGEN || z0 + CHUNK - 1 < -SEMI - MARGEN) return;

    const y0 = nivelBaseTemplo(alturaEn);
    const li = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;
    // intersección de la huella con el chunk: cada chunk escribe SOLO lo suyo
    const xa = Math.max(-SEMI, x0), xb = Math.min(SEMI, x0 + CHUNK - 1);
    const za = Math.max(-SEMI, z0), zb = Math.min(SEMI, z0 + CHUNK - 1);
    for (let x = xa; x <= xb; x++) {
        for (let z = za; z <= zb; z++) {
            // la columna entera es del templo: relleno, estructura y corte
            for (let y = Math.max(1, y0 - RELLENO); y < SY; y++) {
                blocks[li(x - x0, y, z - z0)] = bloqueTemplo(x, y, z, y0, gen.seed);
            }
        }
    }
}

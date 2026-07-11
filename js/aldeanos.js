/**
 * Aldeanos constructores: lógica pura de sus proyectos de obra. Módulo puro
 * (sin DOM, probable en Node): quien conduce al aldeano (mobs/main) decide
 * cuándo caminar, acarrear y colocar; aquí viven el sorteo del proyecto, la
 * búsqueda del solar, el plan de obra ordenado y la cadencia del oficio.
 *
 * Reutiliza las piezas reales del sistema de aldeas: los planos del registro
 * (PLANOS y la lista PLANOS_ALDEANOS de planos exclusivos de los aldeanos),
 * la caja rotada (cajaDePieza) y el estampado de la consola (estampar de
 * construcciones.js), que aquí no escribe en el mundo sino que RECOLECTA las
 * celdas en un plan que la obra recorre de abajo arriba.
 *
 * El azar SIEMPRE llega inyectado como `rng` (PRNG de noise.js, con .float()
 * y .int(n)): misma semilla ⇒ mismo proyecto, mismo solar y mismo plan.
 */
import { B, DEFS } from './blocks.js';
import { SEA_LEVEL } from './dimensiones.js';
import { estampar } from './construcciones.js';
import { cajaDePieza } from './villages/layout.js';
import { PLANOS, PLANOS_ALDEANOS } from './villages/planos/registry.js';

/** Proyectos que un aldeano puede emprender, con su peso de sorteo. */
export const PROYECTOS = [['choza', 3], ['huerto', 3], ['estatua', 1]];

// pool real del sorteo: PROYECTOS acotado a lo que el registro declara
// construible por aldeanos (PLANOS_ALDEANOS es la fuente de verdad)
const POOL = PROYECTOS.filter(([id]) => PLANOS_ALDEANOS.includes(id));

/** Distancia [mín, máx] del centro del solar al punto donde se busca. */
const RADIO_SOLAR = [8, 24];

/** Suelos naturales sobre los que se puede fundar (nada ya construido). */
const SUELO_NATURAL = new Set([
    B.GRASS, B.DIRT, B.SAND, B.SNOWY_GRASS, B.PODZOL, B.MYCELIUM,
]);

/**
 * Cadencia del oficio de constructor:
 * - COLOCA_CD: segundos entre bloque y bloque colocado en la obra.
 * - CARGA_BLOQUES: bloques que rinde cada viaje al punto de acopio (agotada
 *   la carga, el aldeano vuelve a por materiales).
 * - PROYECTO_CD: segundos de descanso entre terminar una obra y sortear la
 *   siguiente.
 * - RADIO_ACOPIO: distancia [mín, máx] del punto de acopio al centro de la
 *   obra (véase puntoDeAcopio).
 */
export const RITMO = {
    COLOCA_CD: 0.5,
    CARGA_BLOQUES: 12,
    PROYECTO_CD: 150,
    RADIO_ACOPIO: [6, 12],
};

/**
 * Sorteo ponderado del próximo proyecto: devuelve un id de plano elegido
 * con un solo rng.float() sobre los pesos de PROYECTOS.
 */
export function elegirProyecto(rng) {
    let total = 0;
    for (const [, peso] of POOL) total += peso;
    let r = rng.float() * total;
    for (const [id, peso] of POOL) {
        r -= peso;
        if (r < 0) return id;
    }
    return POOL[POOL.length - 1][0]; // inalcanzable (r < total)
}

/**
 * ¿Vale la parcela `caja` para fundar a cota `y`? TODA columna debe estar
 * en un chunk generado, ser llana (superficie a ±1 de la cota), seca (por
 * encima de SEA_LEVEL + 1: ni mar ni playa), de suelo natural
 * (SUELO_NATURAL) y sin nada construido por encima: hasta `y + alto` solo
 * se toleran aire y plantas (def.cross, que la obra despeja) — un muro
 * ajeno, un tronco o unas hojas vetan el solar, así la obra no pisa
 * construcciones previas ni árboles.
 */
function solarValido(world, caja, y, alto) {
    for (let x = caja[0]; x <= caja[2]; x++) {
        for (let z = caja[1]; z <= caja[3]; z++) {
            if (!world.hasChunk(x >> 4, z >> 4)) return false;
            const sy = world.surfaceY(x, z);
            if (Math.abs(sy - y) > 1) return false;
            if (sy <= SEA_LEVEL + 1) return false;
            if (!SUELO_NATURAL.has(world.get(x, sy, z))) return false;
            for (let yy = sy + 1; yy <= y + alto; yy++) {
                const id = world.get(x, yy, z);
                if (id !== B.AIR && !DEFS[id].cross) return false;
            }
        }
    }
    return true;
}

/**
 * Busca un solar para el plano cerca de (x0, z0): en cada intento sortea un
 * centro candidato a RADIO_SOLAR bloques (ángulo y radio por `rng`) y una
 * rotación rng.int(4), toma como cota la superficie del centro y valida la
 * huella completa con solarValido. El consumo de rng es fijo por intento
 * (ángulo, radio, rotación), de modo que la secuencia no depende de qué
 * candidato falle. Devuelve { pieza, caja } — la pieza con la misma forma
 * que las de aldea, lista para planDeObra — o null si ningún intento vale.
 */
export function buscarSolar(world, x0, z0, idPlano, rng, intentos = 12) {
    const alto = PLANOS[idPlano].tam[1];
    for (let i = 0; i < intentos; i++) {
        const ang = rng.float() * 2 * Math.PI;
        const radio = RADIO_SOLAR[0] + rng.float() * (RADIO_SOLAR[1] - RADIO_SOLAR[0]);
        const x = Math.round(x0 + Math.cos(ang) * radio);
        const z = Math.round(z0 + Math.sin(ang) * radio);
        const rot = rng.int(4);
        if (!world.hasChunk(x >> 4, z >> 4)) continue;
        const y = world.surfaceY(x, z);
        const pieza = { tipo: 'edificio', id: idPlano, x, z, rot, y };
        const caja = cajaDePieza(pieza);
        if (solarValido(world, caja, y, alto)) return { pieza, caja };
    }
    return null;
}

/**
 * Plan de obra de la pieza: la lista de celdas {x, y, z, id} que estampar
 * escribiría en el mundo, deduplicada por celda quedándose con la ÚLTIMA
 * escritura (el corte de aire pasa primero y el bloque definitivo después)
 * y ordenada por y ascendente — a igual cota, por x y luego z—: la obra se
 * levanta de abajo arriba, bloque a bloque. Las celdas de B.AIR se
 * conservan: son las que despejan la hierba y la vegetación del solar.
 * Puro: no lee ni toca el mundo — quien coloca decide cómo aplicar cada
 * celda (world.set, red…) y puede descartar los no-ops al aplicarla.
 */
export function planDeObra(pieza, biomaId, semilla) {
    const celdas = new Map();
    estampar(pieza, biomaId, semilla, (x, y, z, id) => {
        celdas.set(x + ',' + y + ',' + z, { x, y, z, id });
    });
    return [...celdas.values()].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
}

/**
 * Punto [x, z] al que el aldeano «va a por materiales»: a distancia
 * RITMO.RADIO_ACOPIO del centro de la obra, con el rumbo sorteado por `rng`
 * y redondeado al bloque (el redondeo puede desviar la distancia hasta
 * media diagonal, √2/2).
 */
export function puntoDeAcopio(pieza, rng) {
    const ang = rng.float() * 2 * Math.PI;
    const [rMin, rMax] = RITMO.RADIO_ACOPIO;
    const radio = rMin + rng.float() * (rMax - rMin);
    return [
        Math.round(pieza.x + Math.cos(ang) * radio),
        Math.round(pieza.z + Math.sin(ang) * radio),
    ];
}

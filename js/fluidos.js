/**
 * Fluidez de líquidos: el agua y la lava fluyen como en el clásico.
 * Módulo puro (sin DOM, probable en Node): main.js lo activa en los mundos
 * locales y server/multijugador.mjs en el mundo global; el cliente en línea
 * NO simula (recibe las ediciones del servidor por red, como el clima).
 *
 * El nivel del líquido ES el id de bloque (B.WATER_FLOW1..+8, como la etapa
 * de los cultivos): la fuente vale 8, el flujo lleva 1..8 y el 8 es además
 * la columna que cae con altura llena. La simulación es una cola dirigida
 * por eventos: world.set avisa (gancho world.fluidos.tocar) y solo se
 * procesan las celdas líquidas vecinas de cada edición — un océano en calma
 * cuesta cero.
 *
 * Reglas (las del clásico, con dos adaptaciones declaradas):
 *  - Prefiere caer: si abajo hay hueco, cae con nivel 8 y no se esparce.
 *  - Sobre suelo sólido se esparce a las 4 direcciones con nivel − decaimiento
 *    (agua 1 → alcanza 7 bloques; lava 2 → alcanza 3) hasta agotarse.
 *  - Sin soporte (ni líquido encima ni vecino de nivel mayor) el flujo decae
 *    y termina secándose; las fuentes solo desaparecen si algo las reemplaza.
 *  - Fuente infinita (solo agua): un flujo con ≥2 fuentes vecinas y suelo
 *    firme se convierte en fuente (los agujeros del océano se rellenan).
 *  - Agua + lava: la celda de LAVA se petrifica — fuente → obsidiana,
 *    flujo → adoquín (adaptación: sin distinguir el lado del contacto).
 *  - El líquido arrasa las plantas (bloques `cross`: flores, cultivos,
 *    antorchas…) sin botín, y se esparce en las 4 direcciones a la vez
 *    (adaptación: sin buscar el hueco más cercano como el clásico).
 */
import { B, DEFS, esAgua, esLava, nivelDe } from './blocks.js';

/* ---- Parámetros de la simulación ---- */
const PERIODO_AGUA = 0.25; // s entre pasos del agua (5 ticks del clásico)
const PERIODO_LAVA = 1.5;  // s entre pasos de la lava (30 ticks)
const DECAE_AGUA = 1;      // pérdida de nivel por bloque esparcido
const DECAE_LAVA = 2;
const NIVEL_CAIDA = 8;     // nivel de la columna que cae (altura llena)
const PASO_MAX = 1024;     // celdas procesadas por paso (el resto espera)

const HORIZ = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Id del flujo de la familia con ese nivel (1..8). */
const idFlujo = (agua, nivel) => (agua ? B.WATER_FLOW1 : B.LAVA_FLOW1) + nivel - 1;

/** ¿Puede el líquido ocupar esta celda? (aire o planta que arrasa). */
const reemplazable = (id) => id === B.AIR || DEFS[id].cross;

const clave = (x, y, z) => x + ',' + y + ',' + z;

/**
 * Activa la simulación en un mundo: crea las colas y el gancho `tocar` que
 * world.set invoca tras cada edición. Solo debe llamarse donde corresponde
 * simular (mundo local o servidor); sin activar, el mundo no encola nada.
 */
export function activarFluidos(world) {
    const colaAgua = new Set();
    const colaLava = new Set();
    world.fluidos = {
        colaAgua, colaLava, tAgua: 0, tLava: 0,
        // encola las celdas LÍQUIDAS del entorno de la edición (la propia
        // celda y sus 6 vecinas): romper un dique despierta al agua contigua
        tocar(x, y, z) {
            for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
                const nx = x + dx, ny = y + dy, nz = z + dz;
                const id = world.get(nx, ny, nz);
                if (esAgua(id)) colaAgua.add(clave(nx, ny, nz));
                else if (esLava(id)) colaLava.add(clave(nx, ny, nz));
            }
        },
    };
}

/**
 * Avanza la simulación: cada fluido da un paso al vencer su periodo (agua
 * rápida, lava lenta). Devuelve cuántas celdas cambiaron (útil en pruebas).
 */
export function tickFluidos(world, dt) {
    const f = world.fluidos;
    if (!f) return 0;
    let cambios = 0;
    f.tAgua += dt;
    if (f.tAgua >= PERIODO_AGUA) { f.tAgua = 0; cambios += paso(world, f.colaAgua, true); }
    f.tLava += dt;
    if (f.tLava >= PERIODO_LAVA) { f.tLava = 0; cambios += paso(world, f.colaLava, false); }
    return cambios;
}

/**
 * Un paso de una familia: procesa una instantánea de la cola (lo que las
 * escrituras encolen durante el paso espera al siguiente, así el avance es
 * de un bloque por periodo, como los ticks del clásico).
 */
function paso(world, cola, agua) {
    let cambios = 0;
    const pendientes = [...cola];
    const lote = pendientes.length > PASO_MAX ? pendientes.slice(0, PASO_MAX) : pendientes;
    for (const key of lote) {
        cola.delete(key);
        const [x, y, z] = key.split(',').map(Number);
        cambios += procesar(world, x, y, z, agua);
    }
    return cambios;
}

/** Petrifica una celda de lava tocada por agua: fuente → obsidiana, flujo → adoquín. */
function petrificar(world, x, y, z, id) {
    world.set(x, y, z, id === B.LAVA ? B.OBSIDIAN : B.COBBLE);
}

/**
 * Procesa una celda líquida: contacto agua↔lava, sostén del flujo (decae si
 * nadie lo alimenta) y esparcido (caer primero, esparcir sobre suelo firme).
 * Cada cambio pasa por world.set, que re-encola el entorno por el gancho.
 */
function procesar(world, x, y, z, agua) {
    const es = agua ? esAgua : esLava;
    const id = world.get(x, y, z);
    if (!es(id)) return 0; // la cola iba atrasada: ya no es de esta familia
    const fuente = agua ? B.WATER : B.LAVA;
    const decae = agua ? DECAE_AGUA : DECAE_LAVA;

    // contacto agua↔lava: siempre se petrifica la celda de LAVA
    if (agua) {
        let petrificados = 0;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
            const nId = world.get(x + dx, y + dy, z + dz);
            if (esLava(nId)) { petrificar(world, x + dx, y + dy, z + dz, nId); petrificados++; }
        }
        if (petrificados) return petrificados;
    } else {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
            if (esAgua(world.get(x + dx, y + dy, z + dz))) {
                petrificar(world, x, y, z, id);
                return 1;
            }
        }
    }

    // sostén del flujo: recalcula el nivel que le corresponde y decae solo
    if (id !== fuente) {
        const abajo = world.get(x, y - 1, z);
        // fuente infinita (solo agua): dos fuentes vecinas sobre suelo firme
        if (agua) {
            let fuentes = 0;
            for (const [dx, dz] of HORIZ) if (world.get(x + dx, y, z + dz) === B.WATER) fuentes++;
            if (fuentes >= 2 && (DEFS[abajo].solid || abajo === B.WATER)) {
                world.set(x, y, z, B.WATER);
                return 1;
            }
        }
        let deseado;
        if (es(world.get(x, y + 1, z))) {
            deseado = NIVEL_CAIDA; // lo alimenta la columna de arriba
        } else {
            let max = 0;
            for (const [dx, dz] of HORIZ) {
                const nId = world.get(x + dx, y, z + dz);
                if (es(nId)) max = Math.max(max, nivelDe(nId));
            }
            deseado = max - decae;
        }
        if (deseado <= 0) { world.set(x, y, z, B.AIR); return 1; }
        if (deseado !== nivelDe(id)) { world.set(x, y, z, idFlujo(agua, deseado)); return 1; }
    }

    // esparcido: caer tiene prioridad absoluta sobre esparcirse
    const abajo = world.get(x, y - 1, z);
    if (y > 0 && reemplazable(abajo)) {
        world.set(x, y - 1, z, idFlujo(agua, NIVEL_CAIDA));
        return 1;
    }
    if (es(abajo)) return 0;          // la columna ya alimenta a la de abajo
    if (!DEFS[abajo].solid) return 0; // otro no-sólido (líquido ajeno ya resuelto)

    const objetivo = nivelDe(id) - decae;
    if (objetivo <= 0) return 0;
    let cambios = 0;
    for (const [dx, dz] of HORIZ) {
        const nId = world.get(x + dx, y, z + dz);
        if (reemplazable(nId)) {
            world.set(x + dx, y, z + dz, idFlujo(agua, objetivo));
            cambios++;
        } else if (es(nId) && nId !== fuente && nivelDe(nId) < objetivo) {
            world.set(x + dx, y, z + dz, idFlujo(agua, objetivo)); // sube el nivel del vecino
            cambios++;
        }
    }
    return cambios;
}

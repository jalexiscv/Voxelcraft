/**
 * Mecánica del par de puerta de dos bloques (hoja inferior + hoja superior).
 *
 * Módulo PURO: solo conoce el registro de bloques y un `world` con
 * get(x, y, z) / set(x, y, z, id) (y `sy` para el techo del mundo), así que
 * es testeable en Node sin navegador. Las cuatro hojas viven en ids propios
 * (DOOR_CLOSED/DOOR_OPEN abajo, DOOR_TOP_CLOSED/DOOR_TOP_OPEN arriba) y las
 * operaciones de aquí garantizan que el par nunca queda a medias: colocar
 * escribe las dos hojas, alternar gira las dos y romper limpia las dos.
 */
import { B, isSolid } from './blocks.js';

/** ¿El id es una hoja de puerta (cualquiera de las cuatro)? */
export const esPuerta = (id) =>
    id === B.DOOR_CLOSED || id === B.DOOR_OPEN ||
    id === B.DOOR_TOP_CLOSED || id === B.DOOR_TOP_OPEN;

/** ¿El id es una hoja SUPERIOR (abierta o cerrada)? */
export const esHojaSuperior = (id) =>
    id === B.DOOR_TOP_CLOSED || id === B.DOOR_TOP_OPEN;

/** ¿El id es una hoja abierta (girada al eje x)? */
export const esAbierta = (id) =>
    id === B.DOOR_OPEN || id === B.DOOR_TOP_OPEN;

/** La OTRA hoja del par (inferior ↔ superior) con el mismo estado. */
export function parDe(id) {
    switch (id) {
        case B.DOOR_CLOSED:     return B.DOOR_TOP_CLOSED;
        case B.DOOR_OPEN:       return B.DOOR_TOP_OPEN;
        case B.DOOR_TOP_CLOSED: return B.DOOR_CLOSED;
        case B.DOOR_TOP_OPEN:   return B.DOOR_OPEN;
        default: return id; // no es puerta: se devuelve tal cual
    }
}

/** La MISMA hoja con el estado alternado (cerrada ↔ abierta). */
export function alternada(id) {
    switch (id) {
        case B.DOOR_CLOSED:     return B.DOOR_OPEN;
        case B.DOOR_OPEN:       return B.DOOR_CLOSED;
        case B.DOOR_TOP_CLOSED: return B.DOOR_TOP_OPEN;
        case B.DOOR_TOP_OPEN:   return B.DOOR_TOP_CLOSED;
        default: return id;
    }
}

/** y de la hoja INFERIOR del par al que pertenece la hoja con ese id. */
const yBaseDe = (id, y) => (esHojaSuperior(id) ? y - 1 : y);

/**
 * Coloca una puerta cerrada con la hoja inferior en (x, y, z): exige aire
 * en las DOS celdas del vano y suelo sólido debajo. Devuelve true si la
 * colocó (quien llama decide entonces si consume del inventario).
 */
export function colocarPuerta(world, x, y, z) {
    // el techo del mundo no admite la hoja superior (get devolvería aire
    // ahí fuera pero set no escribiría: quedaría media puerta)
    if (y < 1 || (world.sy !== undefined && y + 1 >= world.sy)) return false;
    if (world.get(x, y, z) !== B.AIR || world.get(x, y + 1, z) !== B.AIR) return false;
    if (!isSolid(world.get(x, y - 1, z))) return false;
    world.set(x, y, z, B.DOOR_CLOSED);
    world.set(x, y + 1, z, B.DOOR_TOP_CLOSED);
    return true;
}

/**
 * Alterna el par entero (cerrada ↔ abierta) desde CUALQUIERA de las dos
 * hojas. Solo reescribe celdas que sean puerta o aire (un par incoherente
 * de un guardado antiguo se repara al alternarlo sin pisar otros bloques).
 * Devuelve el id nuevo de la hoja inferior, o null si (x, y, z) no es puerta.
 */
export function alternarPuerta(world, x, y, z) {
    const id = world.get(x, y, z);
    if (!esPuerta(id)) return null;
    const yb = yBaseDe(id, y);
    // el estado nuevo del PAR sale de la hoja pulsada: aunque las dos hojas
    // estuvieran desincronizadas, tras alternar quedan coherentes
    const bajo = esAbierta(id) ? B.DOOR_CLOSED : B.DOOR_OPEN;
    const enBase = world.get(x, yb, z);
    if (esPuerta(enBase) || enBase === B.AIR) world.set(x, yb, z, bajo);
    const enTop = world.get(x, yb + 1, z);
    if (esPuerta(enTop) || enTop === B.AIR) world.set(x, yb + 1, z, parDe(bajo));
    return bajo;
}

/**
 * Rompe el par entero desde CUALQUIERA de las dos hojas: limpia ambas a
 * aire (sin tocar celdas que no sean puerta) y devuelve la posición de la
 * hoja inferior {x, y, z} para el drop único, o null si no era puerta.
 */
export function romperPuerta(world, x, y, z) {
    const id = world.get(x, y, z);
    if (!esPuerta(id)) return null;
    const yb = yBaseDe(id, y);
    if (esPuerta(world.get(x, yb, z))) world.set(x, yb, z, B.AIR);
    if (esPuerta(world.get(x, yb + 1, z))) world.set(x, yb + 1, z, B.AIR);
    return { x, y: yb, z };
}

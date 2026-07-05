/**
 * Huevos de aparición del modo creativo: un id numérico por cada mob del
 * registro, para que el selector los ofrezca como «colocables» junto a los
 * bloques e items. Al usarlos (clic derecho sobre una cara) main.js hace
 * aparecer el mob en la celda adyacente vía MobSystem.spawnAt.
 *
 * Los ids viven desde EGG_BASE (300), por encima de los items (200..), en
 * el ORDEN estable del registro (js/mobs/registry.js): un guardado con un
 * huevo en la hotbar apunta al mismo mob en cualquier sesión. Nunca se
 * escriben en el mundo (no son bloques) ni entran al inventario de
 * supervivencia (solo el selector del creativo los ofrece).
 *
 * El cascarón del icono se pinta con la paleta procedural PROPIA del mob:
 * base = color medio de su piel pintada, motas = media de sus texels
 * oscuros — cada huevo hereda la identidad de color de su mob, como los
 * spawn eggs del juego original. Módulo puro (sin DOM): el HUD dibuja.
 */
import { MOBS } from './mobs/registry.js';
import { Skin } from './mobs/skin.js';
import { toSeed } from './noise.js';

export const EGG_BASE = 300;

/** id de huevo → id de mob, en el orden estable del registro. */
const MOB_DE = new Map(Object.keys(MOBS).map((mobId, i) => [EGG_BASE + i, mobId]));

/** Ids de todos los huevos, en el orden del registro (para el selector). */
export const EGG_IDS = [...MOB_DE.keys()];

export const esHuevo = (id) => MOB_DE.has(id);

/** Id del mob que hace aparecer un huevo, o null si el id no es un huevo. */
export const mobDeHuevo = (id) => MOB_DE.get(id) || null;

/** Nombre legible del huevo («Huevo de Vaca»). */
export function nombreHuevo(id) {
    const def = MOBS[MOB_DE.get(id)];
    return def ? `Huevo de ${def.name}` : '?';
}

/** {base, mota} cacheados por huevo (la piel solo se pinta una vez). */
const cacheColores = new Map();

/**
 * Colores del cascarón: se pinta la piel procedural del mob (variante 0,
 * misma semilla que el render) y se toma el color medio de sus texels
 * opacos (base) y el medio de los más oscuros que la base (mota).
 */
export function coloresHuevo(id) {
    if (cacheColores.has(id)) return cacheColores.get(id);
    const def = MOBS[MOB_DE.get(id)];
    if (!def) return { base: [160, 160, 160], mota: [96, 96, 96] };

    const piel = new Skin(def.skin.w, def.skin.h, toSeed(def.id));
    def.paint(piel, 0);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < piel.data.length; i += 4) {
        if (!piel.data[i + 3]) continue;
        r += piel.data[i]; g += piel.data[i + 1]; b += piel.data[i + 2]; n++;
    }
    const base = n ? [(r / n) | 0, (g / n) | 0, (b / n) | 0] : [160, 160, 160];

    const lumBase = base[0] + base[1] + base[2];
    let r2 = 0, g2 = 0, b2 = 0, n2 = 0;
    for (let i = 0; i < piel.data.length; i += 4) {
        if (!piel.data[i + 3]) continue;
        if (piel.data[i] + piel.data[i + 1] + piel.data[i + 2] >= lumBase) continue;
        r2 += piel.data[i]; g2 += piel.data[i + 1]; b2 += piel.data[i + 2]; n2++;
    }
    const mota = n2 ? [(r2 / n2) | 0, (g2 / n2) | 0, (b2 / n2) | 0]
        : [(base[0] * 0.6) | 0, (base[1] * 0.6) | 0, (base[2] * 0.6) | 0];

    const colores = { base, mota };
    cacheColores.set(id, colores);
    return colores;
}

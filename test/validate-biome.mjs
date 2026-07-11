/**
 * Validador del contrato de definición de biomas (ver js/biomes/model.js).
 * Uso: node test/validate-biome.mjs <id> [<id>...]   (p. ej. plains)
 *
 * Las definiciones son GENERADAS (assets/biomes/ → tools/gen-biomas.mjs →
 * js/biomes/biomes.data.js): este validador comprueba que la traducción
 * respeta el contrato — campos obligatorios, zonas y transformaciones bien
 * formadas (apuntando a ids del catálogo), nombres de bloque existentes en
 * B y coherencia de las listas de mobs contra el registro: día sin
 * hostiles, noche solo hostiles o pasivos nocturnos, agua solo mobs
 * acuáticos; los mobs de cueva son globales y solo pueden listarse en night.
 */
import { pathToFileURL } from 'node:url';
import { TERRAINS, TREE_KINDS } from '../js/biomes/model.js';
import { BIOMES } from '../js/biomes/map.js';
import { B } from '../js/blocks.js';
import { MOBS } from '../js/mobs/registry.js';

const LISTAS_MOBS = ['day', 'night', 'water'];

/** Valida una definición; devuelve {errors, warnings} (vacíos si es válida). */
export function validate(def, expectedId) {
    const errors = [];
    const warnings = [];
    const err = (msg) => errors.push(msg);

    /* ---- Campos generales ---- */
    if (!def || typeof def !== 'object') return { errors: ['la definición no es un objeto'], warnings };
    if (def.id !== expectedId) err(`id "${def.id}" ≠ id esperado "${expectedId}"`);
    if (!def.name) err('falta name');
    if (def.terrain !== null && !TERRAINS.includes(def.terrain)) {
        err(`terrain "${def.terrain}" desconocido (${TERRAINS.join('|')} o null)`);
    }
    if (typeof def.congelado !== 'boolean') err('congelado debe ser booleano');
    if (![null, 'lluvia', 'nieve'].includes(def.precipitacion)) {
        err(`precipitacion "${def.precipitacion}" desconocida (lluvia|nieve|null)`);
    }
    if (!Array.isArray(def.tags)) err('faltan las tags del pack');

    /* ---- Colocación: zonas y transformaciones del pack ---- */
    const ZONAS = ['frozen', 'cold', 'medium', 'lukewarm', 'warm'];
    if (def.zonas !== null) {
        if (!Array.isArray(def.zonas) || def.zonas.length === 0) {
            err('zonas debe ser null o una lista [zona, peso] no vacía');
        } else {
            for (const par of def.zonas) {
                if (!Array.isArray(par) || !ZONAS.includes(par[0]) || !(par[1] > 0)) {
                    err(`zonas: entrada inválida ${JSON.stringify(par)}`);
                }
            }
        }
    }
    for (const campo of ['hills', 'mutate']) {
        if (def[campo] === null) continue;
        if (!Array.isArray(def[campo]) || def[campo].length === 0) {
            err(`${campo} debe ser null o una lista [id, peso] no vacía`);
            continue;
        }
        for (const [idDestino, peso] of def[campo]) {
            if (!BIOMES[idDestino]) err(`${campo}: el destino "${idDestino}" no existe en el catálogo`);
            if (!(peso > 0)) err(`${campo}: peso inválido para "${idDestino}"`);
        }
    }

    /* ---- Terreno ---- */
    const bloque = (name, tag) => {
        if (typeof name !== 'string' || !(name in B)) err(`${tag}: bloque "${name}" no existe en B`);
    };
    if (!def.surface || typeof def.surface !== 'object') {
        err('falta surface {top, under}');
    } else {
        bloque(def.surface.top, 'surface.top');
        bloque(def.surface.under, 'surface.under');
        if (def.surface.topAlt !== undefined) {
            bloque(def.surface.topAlt, 'surface.topAlt');
            if (!(def.surface.altChance > 0 && def.surface.altChance < 1)) {
                err('surface.altChance debe estar en (0, 1) cuando hay topAlt');
            }
        }
        if (def.surface.topFrio !== undefined) bloque(def.surface.topFrio, 'surface.topFrio');
    }

    /* ---- Vegetación ---- */
    if (def.trees) {
        if (!TREE_KINDS.includes(def.trees.kind)) {
            err(`trees.kind "${def.trees.kind}" desconocido (${TREE_KINDS.join('|')})`);
        }
        bloque(def.trees.log, 'trees.log');
        bloque(def.trees.leaves, 'trees.leaves');
        if (!(def.trees.chance > 0 && def.trees.chance <= 1)) err('trees.chance debe estar en (0, 1]');
        if (!Number.isInteger(def.trees.max) || def.trees.max < 1 || def.trees.max > 3) {
            err('trees.max debe ser un entero 1..3');
        }
    }
    if (def.cactus && !(def.cactus.chance > 0 && def.cactus.chance <= 1)) {
        err('cactus.chance debe estar en (0, 1]');
    }
    if (def.flora !== undefined && def.flora !== null) {
        if (!Array.isArray(def.flora)) {
            err('flora debe ser un array de {block, weight}');
        } else {
            for (const f of def.flora) {
                bloque(f && f.block, 'flora');
                if (!f || !(f.weight > 0)) err(`flora "${f && f.block}": weight debe ser > 0`);
            }
        }
    }

    /* ---- Habitantes: coherencia contra el registro de mobs ---- */
    if (!def.mobs || !LISTAS_MOBS.every((k) => Array.isArray(def.mobs[k]))) {
        err('mobs.day/night/water deben ser arrays (usa [] si no aplica)');
    } else {
        for (const lista of Object.keys(def.mobs)) {
            if (!LISTAS_MOBS.includes(lista)) { err(`mobs.${lista}: lista desconocida (${LISTAS_MOBS.join('|')})`); continue; }
            for (const id of def.mobs[lista]) {
                const mob = MOBS[id];
                if (!mob) { err(`mobs.${lista}: "${id}" no existe en el registro de mobs`); continue; }
                const spawn = mob.spawn || {};
                if (spawn.cave && lista !== 'night') {
                    err(`mobs.${lista}: "${id}" es de cueva (spawn.cave): solo puede listarse en night (sale a la superficie de noche)`);
                }
                if (lista === 'day' && mob.hostile) err(`mobs.day: "${id}" es hostil (los hostiles son nocturnos)`);
                if (lista === 'night' && !mob.hostile && !spawn.night) {
                    err(`mobs.night: "${id}" no es hostil ni tiene spawn.night`);
                }
                if (lista === 'water' && !spawn.water) err(`mobs.water: "${id}" no tiene spawn.water`);
            }
        }
    }

    return { errors, warnings };
}

/* ---- CLI ---- */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const ids = process.argv.slice(2);
    if (ids.length === 0) {
        console.error('Uso: node test/validate-biome.mjs <id> [<id>...]');
        process.exit(2);
    }
    let failed = 0;
    for (const id of ids) {
        const result = BIOMES[id]
            ? validate(BIOMES[id], id)
            : { errors: [`"${id}" no existe en el catálogo generado (js/biomes/biomes.data.js)`], warnings: [] };
        for (const w of result.warnings) console.log(`  AVISO ${id}: ${w}`);
        if (result.errors.length === 0) {
            console.log(`  OK  ${id}`);
        } else {
            failed++;
            for (const e of result.errors) console.log(`  FALLA ${id}: ${e}`);
        }
    }
    process.exit(failed ? 1 : 0);
}

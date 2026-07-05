/**
 * Validador del contrato de planos de aldea (ver js/villages/model.js).
 * Uso: node test/validate-plano.mjs <id> [<id>...]   (p. ej. casa_pequena)
 *
 * Comprueba dimensiones bien formadas (tam contra capas/filas), que todo
 * carácter usado esté declarado en clave (salvo '.' = aire), que toda clave
 * sea un rol de paleta, un rol posicional o un bloque existente en B, la
 * puerta en la fachada
 * −Z de la capa 1, al menos una antorcha y el cimiento suficientemente
 * macizo (capa 0 con ≥ 60 % de celdas no vacías).
 *
 * La coherencia del POOL y de las PALETAS es una propiedad del conjunto,
 * no de un plano suelto: la comprueba test/villages.mjs.
 */
import { pathToFileURL } from 'node:url';
import { ROLES, ROLES_POSICIONALES } from '../js/villages/model.js';
import { B } from '../js/blocks.js';

const LADO_MIN = 3, LADO_MAX = 12;   // ancho y fondo admisibles
const ALTO_MIN = 3, ALTO_MAX = 12;   // capas admisibles
const CIMIENTO_MIN = 0.6;            // fracción mínima llena de la capa 0

/** Valida un plano; devuelve {errors, warnings} (vacíos si es válido). */
export function validatePlano(plano, expectedId) {
    const errors = [];
    const warnings = [];
    const err = (msg) => errors.push(msg);

    /* ---- Campos generales ---- */
    if (!plano || typeof plano !== 'object') return { errors: ['la exportación PLANO no es un objeto'], warnings };
    if (typeof plano.id !== 'string' || !plano.id) err('falta id (string)');
    else if (expectedId && plano.id !== expectedId) err(`id "${plano.id}" ≠ nombre de archivo "${expectedId}"`);

    /* ---- Dimensiones ---- */
    let ancho = 0, alto = 0, fondo = 0;
    if (!Array.isArray(plano.tam) || plano.tam.length !== 3 || !plano.tam.every(Number.isInteger)) {
        err('tam debe ser [ancho, alto, fondo] de 3 enteros');
    } else {
        [ancho, alto, fondo] = plano.tam;
        if (ancho < LADO_MIN || ancho > LADO_MAX) err(`ancho ${ancho} fuera de ${LADO_MIN}..${LADO_MAX}`);
        if (fondo < LADO_MIN || fondo > LADO_MAX) err(`fondo ${fondo} fuera de ${LADO_MIN}..${LADO_MAX}`);
        if (alto < ALTO_MIN || alto > ALTO_MAX) err(`alto ${alto} fuera de ${ALTO_MIN}..${ALTO_MAX}`);
    }

    /* ---- Clave: cada carácter apunta a un rol o a un bloque de B ---- */
    const clave = (plano.clave && typeof plano.clave === 'object') ? plano.clave : null;
    if (!clave) {
        err('falta clave {carácter: rol|bloque}');
    } else {
        for (const [ch, valor] of Object.entries(clave)) {
            if (ch.length !== 1) err(`clave "${ch}": el carácter debe ser de longitud 1`);
            if (ch === '.') warnings.push("clave '.': el punto ya es aire, no hace falta declararlo");
            if (!ROLES.includes(valor) && !ROLES_POSICIONALES.includes(valor) && !(valor in B)) {
                err(`clave "${ch}": "${valor}" no es rol (${ROLES.join('|')}), ` +
                    `rol posicional (${ROLES_POSICIONALES.join('|')}) ni bloque de B`);
            }
        }
    }

    /* ---- Capas: geometría y caracteres declarados ---- */
    const sinDeclarar = new Set();
    if (!Array.isArray(plano.capas)) {
        err('capas debe ser un array de capas (de suelo a techo)');
    } else {
        if (alto && plano.capas.length !== alto) {
            err(`capas.length ${plano.capas.length} ≠ alto ${alto}`);
        }
        plano.capas.forEach((capa, y) => {
            if (!Array.isArray(capa) || (fondo && capa.length !== fondo)) {
                err(`capa ${y}: debe tener ${fondo || '(fondo)'} filas`);
                return;
            }
            capa.forEach((fila, z) => {
                if (typeof fila !== 'string' || (ancho && fila.length !== ancho)) {
                    err(`capa ${y} fila ${z}: debe ser un string de ${ancho || '(ancho)'} caracteres`);
                    return;
                }
                for (const ch of fila) {
                    if (ch !== '.' && clave && !(ch in clave)) sinDeclarar.add(ch);
                }
            });
        });
    }
    for (const ch of sinDeclarar) err(`carácter "${ch}" usado en las capas sin declarar en clave`);

    /* ---- Reglas semánticas: puerta, antorcha y cimiento ---- */
    if (clave && Array.isArray(plano.capas)) {
        const es = (ch, nombre) => ch !== '.' && clave[ch] === nombre;

        // puerta en la fila de fachada (z = 0) de la capa 1; la apilada en
        // la capa 2 para el vano doble es opcional y no se comprueba
        const capa1 = plano.capas[1];
        const fachada = (Array.isArray(capa1) && typeof capa1[0] === 'string') ? capa1[0] : '';
        if (![...fachada].some((ch) => es(ch, 'DOOR_CLOSED'))) {
            err('sin DOOR_CLOSED en la fila de fachada (z = 0) de la capa 1');
        }

        // toda construcción lleva luz (la variante abandonada la quitará)
        let antorchas = 0;
        for (const capa of plano.capas) {
            if (!Array.isArray(capa)) continue;
            for (const fila of capa) {
                if (typeof fila !== 'string') continue;
                for (const ch of fila) if (es(ch, 'TORCH')) antorchas++;
            }
        }
        if (antorchas === 0) err('sin TORCH en el plano');

        // cimiento: la capa 0 se apoya sobre la parcela nivelada
        const capa0 = plano.capas[0];
        if (Array.isArray(capa0)) {
            let llenas = 0, celdas = 0;
            for (const fila of capa0) {
                if (typeof fila !== 'string') continue;
                celdas += fila.length;
                for (const ch of fila) if (ch !== '.') llenas++;
            }
            if (celdas > 0 && llenas / celdas < CIMIENTO_MIN) {
                err(`capa 0 (cimiento) solo ${Math.round((llenas / celdas) * 100)} % llena ` +
                    `(mínimo ${Math.round(CIMIENTO_MIN * 100)} %)`);
            }
        }
    }

    return { errors, warnings };
}

/* ---- CLI ---- */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const ids = process.argv.slice(2);
    if (ids.length === 0) {
        console.error('Uso: node test/validate-plano.mjs <id> [<id>...]');
        process.exit(2);
    }
    let failed = 0;
    for (const id of ids) {
        let result;
        try {
            const mod = await import(`../js/villages/planos/${id}.js`);
            result = validatePlano(mod.PLANO, id);
        } catch (e) {
            result = { errors: [`no se pudo importar js/villages/planos/${id}.js: ${e.message}`], warnings: [] };
        }
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

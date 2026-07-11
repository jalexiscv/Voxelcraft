/**
 * Suite de la consola de comandos (módulo puro) — `node test/comandos.mjs`.
 * Prueba el parseo, la búsqueda por nombre (acentos plegados), la
 * validación de argumentos, los mensajes de error y el bloqueo de los
 * comandos de servidor en el mundo global, contra un contexto de mentira
 * que registra las llamadas.
 */
import assert from 'node:assert';
import { ejecutarComando } from '../js/comandos.js';
import { B } from '../js/blocks.js';
import { ITEMS } from '../js/items.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

/** Contexto de mentira: registra cada llamada y responde valores fijos. */
function ctxFalso(sobre = {}) {
    const llamadas = [];
    const ctx = {
        llamadas,
        enLinea: () => false,
        modo: () => 'supervivencia',
        pos: () => [10, 70, -20],
        tp: (x, y, z) => llamadas.push(['tp', x, y, z]),
        hora: (t) => llamadas.push(['hora', t]),
        clima: (e) => llamadas.push(['clima', e]),
        dar: (id, n) => llamadas.push(['dar', id, n]),
        cambiarModo: (m) => llamadas.push(['modo', m]),
        cambiarDificultad: (d) => llamadas.push(['dificultad', d]),
        curar: () => llamadas.push(['curar']),
        matar: () => llamadas.push(['matar']),
        aparecer: (tipo, n) => { llamadas.push(['aparecer', tipo, n]); return n; },
        construir: (id) => { llamadas.push(['construir', id]); return { caja: [0, 0, 6, 6], alto: 5 }; },
        semilla: () => 987654,
        ...sobre,
    };
    return ctx;
}

console.log('Consola de comandos');

test('línea vacía y comando desconocido responden con guía', () => {
    const ctx = ctxFalso();
    assert.match(ejecutarComando('/', ctx)[0], /\/ayuda/);
    assert.match(ejecutarComando('/noexiste', ctx)[0], /desconocido/i);
    assert.equal(ctx.llamadas.length, 0);
});

test('/ayuda lista todos los comandos y /ayuda tp explica su uso', () => {
    const ctx = ctxFalso();
    const lineas = ejecutarComando('/ayuda', ctx);
    for (const n of ['/tp', '/hora', '/clima', '/dar', '/modo', '/dificultad',
        '/curar', '/matar', '/aparecer', '/construir', '/semilla']) {
        assert.ok(lineas.join(' ').includes(n), `falta ${n} en /ayuda`);
    }
    assert.match(ejecutarComando('/ayuda tp', ctx)[0], /\/tp <x> <y> <z>/);
    assert.match(ejecutarComando('/ayuda nada', ctx)[0], /No existe/);
});

test('/tp acepta absolutas y relativas (~ y ~±n) y rechaza basura', () => {
    const ctx = ctxFalso();
    ejecutarComando('/tp 100 80 -40', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['tp', 100, 80, -40]);
    ejecutarComando('/tp ~ ~10 ~-5', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['tp', 10, 80, -25]);
    assert.match(ejecutarComando('/tp 1 2', ctx)[0], /Uso/);
    assert.match(ejecutarComando('/tp a b c', ctx)[0], /no válidas/);
    assert.equal(ctx.llamadas.length, 0);
});

test('/hora entiende nombres y números 0..24 con la convención de F3', () => {
    const ctx = ctxFalso();
    ejecutarComando('/hora medianoche', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['hora', 0.5]);
    ejecutarComando('/hora AMANECER', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['hora', 0.77]);
    ejecutarComando('/hora 6', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['hora', 0.25]);
    ejecutarComando('/hora 24', ctx); // 24 h = 0 h (envuelve)
    assert.deepEqual(ctx.llamadas.pop(), ['hora', 0]);
    assert.match(ejecutarComando('/hora 25', ctx)[0], /No entiendo/);
    assert.match(ejecutarComando('/hora', ctx)[0], /Uso/);
    assert.equal(ctx.llamadas.length, 0);
});

test('/clima fuerza estados válidos y rechaza el resto', () => {
    const ctx = ctxFalso();
    ejecutarComando('/clima tormenta', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['clima', 'tormenta']);
    assert.match(ejecutarComando('/clima granizo', ctx)[0], /Uso/);
    assert.equal(ctx.llamadas.length, 0);
});

test('/dar encuentra por nombre plegando acentos y entiende la cantidad', () => {
    const ctx = ctxFalso();
    ejecutarComando('/dar adoquin 32', ctx); // sin tilde: debe hallar «Adoquín»
    assert.deepEqual(ctx.llamadas.pop(), ['dar', B.COBBLE, 32]);
    ejecutarComando('/dar Pan', ctx); // item, cantidad por defecto 1
    assert.deepEqual(ctx.llamadas.pop(), ['dar', ITEMS.PAN, 1]);
    ejecutarComando('/dar mesa de crafteo', ctx); // nombre de varias palabras
    assert.deepEqual(ctx.llamadas.pop(), ['dar', B.CRAFTING_TABLE, 1]);
    ejecutarComando('/dar obsidiana 9999', ctx); // el tope recorta a 999
    assert.deepEqual(ctx.llamadas.pop(), ['dar', B.OBSIDIAN, 999]);
});

test('/dar avisa ante ambigüedad, nombre desconocido y modo creativo', () => {
    const ctx = ctxFalso();
    assert.match(ejecutarComando('/dar lana', ctx)[0], /¿Cuál de estos\?/);
    assert.match(ejecutarComando('/dar unobtainium', ctx)[0], /No conozco/);
    assert.match(ejecutarComando('/dar', ctx)[0], /Uso/);
    assert.equal(ctx.llamadas.length, 0);
    const creativo = ctxFalso({ modo: () => 'creativo' });
    assert.match(ejecutarComando('/dar adoquin', creativo)[0], /creativo/);
    assert.equal(creativo.llamadas.length, 0);
});

test('los cultivos y otras piezas no colocables no son dables', () => {
    const ctx = ctxFalso();
    // «trigo» debe resolver al ITEM Trigo, no al bloque de cultivo
    ejecutarComando('/dar trigo', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['dar', ITEMS.TRIGO, 1]);
});

test('/modo y /dificultad cambian, avisan del uso y del modo repetido', () => {
    const ctx = ctxFalso();
    ejecutarComando('/modo creativo', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['modo', 'creativo']);
    ejecutarComando('/modo c', ctx); // prefijo único
    assert.deepEqual(ctx.llamadas.pop(), ['modo', 'creativo']);
    assert.match(ejecutarComando('/modo supervivencia', ctx)[0], /Ya estás/);
    assert.match(ejecutarComando('/modo dios', ctx)[0], /Uso/);
    ejecutarComando('/dificultad pacífica', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['dificultad', 'pacifica']);
    assert.equal(ctx.llamadas.length, 0);
});

test('/curar y /matar operan en supervivencia y se niegan en creativo', () => {
    const ctx = ctxFalso();
    ejecutarComando('/curar', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['curar']);
    ejecutarComando('/matar', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['matar']);
    const creativo = ctxFalso({ modo: () => 'creativo' });
    assert.match(ejecutarComando('/curar', creativo)[0], /creativo/i);
    assert.match(ejecutarComando('/matar', creativo)[0], /creativo/i);
    assert.equal(creativo.llamadas.length, 0);
});

test('/aparecer acepta nombre en español o clave del registro y acota n', () => {
    const ctx = ctxFalso();
    ejecutarComando('/aparecer cerdo 3', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['aparecer', 'pig', 3]);
    ejecutarComando('/aparecer zombie', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['aparecer', 'zombie', 1]);
    ejecutarComando('/aparecer creeper 99', ctx); // el tope recorta a 10
    assert.deepEqual(ctx.llamadas.pop(), ['aparecer', 'creeper', 10]);
    assert.match(ejecutarComando('/aparecer dodo', ctx)[0], /No conozco/);
    const lleno = ctxFalso({ aparecer: () => 0 });
    assert.match(ejecutarComando('/aparecer vaca', lleno)[0], /No hay sitio/);
});

test('/construir lista, resuelve nombres con acentos y reporta el tamaño', () => {
    const ctx = ctxFalso();
    const lista = ejecutarComando('/construir', ctx).join(' ');
    for (const n of ['Casa pequeña', 'Granja', 'Herrería', 'Atalaya']) {
        assert.ok(lista.includes(n), `falta ${n} en la lista`);
    }
    assert.equal(ctx.llamadas.length, 0); // listar no construye
    assert.match(ejecutarComando('/construir herreria', ctx)[0],
        /Herrería construida \(7×5×7\) frente a ti/);
    assert.deepEqual(ctx.llamadas.pop(), ['construir', 'herreria']);
    ejecutarComando('/construir casa_grande', ctx); // también por id del plano
    assert.deepEqual(ctx.llamadas.pop(), ['construir', 'casa_grande']);
    assert.match(ejecutarComando('/construir casa', ctx)[0], /¿Cuál de estas\?/);
    assert.match(ejecutarComando('/construir castillo', ctx)[0], /No conozco/);
    assert.equal(ctx.llamadas.length, 0);
    const sinTerreno = ctxFalso({ construir: () => null });
    assert.match(ejecutarComando('/construir pozo', sinTerreno)[0], /no está generado/);
});

test('/semilla responde con la semilla del contexto', () => {
    assert.match(ejecutarComando('/semilla', ctxFalso())[0], /987654/);
});

test('en el mundo global se bloquean los comandos del servidor y no el resto', () => {
    const ctx = ctxFalso({ enLinea: () => true });
    for (const linea of ['/hora dia', '/clima lluvia', '/modo creativo',
        '/dificultad normal', '/aparecer cerdo']) {
        assert.match(ejecutarComando(linea, ctx)[0], /mundo global/);
    }
    assert.equal(ctx.llamadas.length, 0);
    ejecutarComando('/tp ~ ~ ~', ctx); // los personales siguen disponibles
    assert.deepEqual(ctx.llamadas.pop(), ['tp', 10, 70, -20]);
    ejecutarComando('/dar pan', ctx);
    assert.deepEqual(ctx.llamadas.pop(), ['dar', ITEMS.PAN, 1]);
});

console.log(`\n${ok} pruebas en verde`);

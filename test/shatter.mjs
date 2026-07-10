/**
 * Suite del ShatterSystem (módulo puro): desgranado, física de rebote y
 * desvanecimiento. Sin DOM ni WebGL — corre en Node.
 */
import assert from 'node:assert';
import { ShatterSystem } from '../js/shatter.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

// PRNG determinista para tests reproducibles
let seed = 1;
const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// sampler de color plano: gris salvo la cara superior (verde) para verificar
// que la cara dominante se elige bien
const sampler = (cara) => cara === 'top' ? [0, 200, 0] : [120, 120, 120];

// mundo de prueba: suelo sólido en y<10, aire encima
const world = { solidAt: (x, y, z) => y < 10 };

console.log('ShatterSystem');

test('spawn genera fragmentos de la cáscara con densidad doble', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    assert.ok(s.list.length > 0, 'debe crear fragmentos');
    // con n=8, step=2 la cáscara son 56 celdas (las que tienen alguna coord en
    // {0,6}); con DENSIDAD=2 esquirlas por celda salen 112 fragmentos densos,
    // sin llenar geométricamente el interior sólido (que serían 512)
    assert.strictEqual(s.list.length, 112, 'cáscara ×densidad 2: ' + s.list.length);
    assert.ok(s.list.length < 512, 'no materializa el bloque entero');
});

test('cada fragmento nace dentro del bloque', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    for (const f of s.list) {
        assert.ok(f.pos[0] >= 5 && f.pos[0] <= 6, 'x dentro del bloque');
        assert.ok(f.pos[1] >= 12 && f.pos[1] <= 13, 'y dentro del bloque');
        assert.ok(f.pos[2] >= 5 && f.pos[2] <= 6, 'z dentro del bloque');
    }
});

test('la cara superior hereda su color real', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    // debe existir al menos un fragmento verde (cara top) y uno gris (lateral)
    const verde = s.list.some((f) => f.color[1] === 200 && f.color[0] === 0);
    const gris = s.list.some((f) => f.color[0] === 120);
    assert.ok(verde, 'algún fragmento debe venir de la cara superior (verde)');
    assert.ok(gris, 'algún fragmento debe venir de un lateral (gris)');
});

test('los fragmentos estallan hacia arriba y afuera', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    const subenAlgunos = s.list.filter((f) => f.vel[1] > 0).length;
    assert.ok(subenAlgunos > s.list.length * 0.6, 'la mayoría sube al estallar');
});

test('la física los hace caer y posarse en el suelo', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    // simula 3 s a 60 fps
    for (let i = 0; i < 180; i++) s.update(1 / 60, world);
    // los que sobrevivan deben estar sobre el suelo (y ≥ 10) y muchos posados
    for (const f of s.list) assert.ok(f.pos[1] >= 9.9, 'no atraviesan el suelo: ' + f.pos[1]);
});

test('al asentarse los fragmentos se aplanan y oscurecen (montón)', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    for (let i = 0; i < 180; i++) s.update(1 / 60, world);
    const posados = s.list.filter((f) => f.rest);
    assert.ok(posados.length > 0, 'debe haber fragmentos posados');
    for (const f of posados) {
        assert.ok(f.flat < 1, 'un fragmento posado está aplanado: ' + f.flat);
        assert.ok(f.shade < 1, 'un fragmento posado está algo en sombra: ' + f.shade);
    }
    // los que siguen en vuelo conservan su forma de cubo
    for (const f of s.list.filter((f) => !f.rest)) assert.strictEqual(f.flat, 1, 'en vuelo, cubo entero');
});

test('los fragmentos expiran (TTL) y la lista se vacía', () => {
    const s = new ShatterSystem();
    s.spawn(1, 5, 12, 5, sampler, 8, 2, rng);
    for (let i = 0; i < 300; i++) s.update(1 / 60, world); // 5 s > TTL máx
    assert.strictEqual(s.list.length, 0, 'todos deben expirar');
});

test('fade cae de 1 a 0 al final de la vida', () => {
    const joven = { age: 0.1, ttl: 1.6 };
    const viejo = { age: 1.55, ttl: 1.6 };
    assert.strictEqual(ShatterSystem.fade(joven), 1, 'joven a plena opacidad');
    assert.ok(ShatterSystem.fade(viejo) < 0.5, 'casi expirado, translúcido');
});

test('respeta el tope de fragmentos (CAP)', () => {
    const s = new ShatterSystem();
    // muchos spawns seguidos: la lista no debe crecer sin límite
    for (let k = 0; k < 100; k++) s.spawn(1, k, 12, 0, sampler, 8, 2, rng);
    assert.ok(s.list.length <= 2800, 'no supera el CAP: ' + s.list.length);
});

test('sampler que devuelve null omite esas celdas (transparencia)', () => {
    const s = new ShatterSystem();
    s.spawn(1, 0, 0, 0, () => null, 8, 2, rng);
    assert.strictEqual(s.list.length, 0, 'sin color → sin fragmentos');
});

console.log(`\n${ok} pruebas OK`);

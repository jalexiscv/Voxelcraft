/**
 * Suite del CarveState (módulo puro, Fase 2): tallado de cráter por esfera,
 * sub-vóxeles arrancados con color real y consistencia de la rejilla.
 */
import assert from 'node:assert';
import { CarveState, CARVE_N } from '../js/carve.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

// sampler: verde arriba, marrón abajo, gris a los lados (para verificar cara)
const sampler = (cara) => cara === 'top' ? [0, 200, 0] : (cara === 'bottom' ? [130, 90, 60] : [128, 128, 128]);

console.log('CarveState');

test('nace lleno: todos los sub-vóxeles presentes', () => {
    const s = new CarveState(1, 10, 20, 30, sampler);
    assert.strictEqual(s.vivos, CARVE_N ** 3);
    assert.ok(s.has(0, 0, 0) && s.has(CARVE_N - 1, CARVE_N - 1, CARVE_N - 1));
    assert.strictEqual(s.fraccion, 1);
});

test('carve arranca una esfera y devuelve los fragmentos', () => {
    const s = new CarveState(1, 0, 0, 0, sampler);
    const antes = s.vivos;
    const frag = s.carve(0.5, 1.0, 0.5, 1.7); // impacto en la cara superior
    assert.ok(frag.length > 0, 'debe arrancar algo');
    assert.strictEqual(s.vivos, antes - frag.length, 'vivos baja exactamente lo arrancado');
    assert.ok(s.dirty, 'la malla queda sucia tras tallar');
});

test('los fragmentos llevan posición en el mundo y color real', () => {
    const s = new CarveState(1, 100, 50, 200, sampler);
    const frag = s.carve(0.5, 1.0, 0.5, 1.7);
    for (const f of frag) {
        assert.ok(f.pos[0] >= 100 && f.pos[0] <= 101, 'x en el bloque');
        assert.ok(f.pos[1] >= 50 && f.pos[1] <= 51, 'y en el bloque');
        assert.ok(Array.isArray(f.color) && f.color.length === 3, 'color rgb');
    }
    // impacto arriba → algún fragmento verde (cara superior)
    assert.ok(frag.some((f) => f.color[1] === 200 && f.color[0] === 0), 'esfera superior toca césped verde');
});

test('tallar el mismo sitio dos veces no re-arranca huecos', () => {
    const s = new CarveState(1, 0, 0, 0, sampler);
    const a = s.carve(0.5, 0.5, 0.5, 2).length;
    const b = s.carve(0.5, 0.5, 0.5, 2).length; // ya vacío en el centro
    assert.ok(b < a, 'la segunda pasada arranca menos (ya había hueco)');
});

test('un cráter deja huecos internos consultables', () => {
    const s = new CarveState(1, 0, 0, 0, sampler);
    s.carve(0.5, 0.5, 0.5, 2.5);
    const centro = Math.floor(CARVE_N / 2);
    assert.ok(!s.has(centro, centro, centro), 'el centro del cráter está vacío');
    assert.ok(s.has(0, 0, 0), 'una esquina lejana sigue presente');
});

test('tallar a fondo puede vaciar el bloque (fracción baja)', () => {
    const s = new CarveState(1, 0, 0, 0, sampler);
    // varios impactos repartidos
    for (let u = 0.2; u <= 0.8; u += 0.3)
        for (let v = 0.2; v <= 0.8; v += 0.3)
            s.carve(u, v, 0.5, 3);
    assert.ok(s.fraccion < 1, 'quedó menos que el bloque entero: ' + s.fraccion.toFixed(2));
});

test('carve fuera de radio no toca nada (radio 0)', () => {
    const s = new CarveState(1, 0, 0, 0, sampler);
    const frag = s.carve(0.5, 0.5, 0.5, 0);
    assert.strictEqual(frag.length, 0, 'radio 0 no arranca');
});

test('sampler null cae a gris (no rompe)', () => {
    const s = new CarveState(1, 0, 0, 0, () => null);
    const frag = s.carve(0.5, 1.0, 0.5, 1.7);
    assert.ok(frag.length > 0);
    assert.deepStrictEqual(frag[0].color, [150, 150, 150], 'gris por defecto');
});

console.log(`\n${ok} pruebas OK`);

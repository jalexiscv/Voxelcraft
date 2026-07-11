/**
 * Suite del ClimaSystem (módulo puro): máquina de estados con PRNG
 * inyectado, rampa de intensidad, rayos solo en tormenta, precipitación por
 * bioma (lluvia/nieve/desierto), emisión sobre un mundo falso (las gotas
 * mueren en su columna, bajo techo no entran) y persistencia por JSON.
 */
import assert from 'node:assert';
import { ClimaSystem, VEL_LLUVIA, VEL_NIEVE } from '../js/clima.js';
import { ParticleSystem } from '../js/particles.js';
import { BIOMES } from '../js/biomes/map.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

/** PRNG determinista (LCG) para reproducibilidad total. */
const lcg = (semilla = 42) => {
    let s = semilla >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};

/** Mundo plano falso: superficie sólida en y=10 (y=30 bajo el "techo"). */
const mundoPlano = (conTecho = false) => ({
    surfaceY: (x) => (conTecho && x >= 100 ? 30 : 10),
});
const biomasTemplados = { at: () => ({ precipitacion: 'lluvia' }) };

console.log('ClimaSystem');

test('arranca despejado con intensidad 0 y duración dentro de la ventana', () => {
    const c = new ClimaSystem(lcg());
    assert.strictEqual(c.estado, 'despejado');
    assert.strictEqual(c.intensidad, 0);
    assert.ok(c.restante >= 240 && c.restante <= 600);
});

test('al agotarse el despejado pasa a precipitación (lluvia o tormenta)', () => {
    const c = new ClimaSystem(lcg(7));
    c.restante = 0.01;
    c.update(0.02);
    assert.ok(c.estado === 'lluvia' || c.estado === 'tormenta', 'debe llover: ' + c.estado);
    // y tras la precipitación siempre vuelve a despejado
    c.restante = 0.01;
    c.update(0.02);
    assert.strictEqual(c.estado, 'despejado');
});

test('con el rng en el tramo bajo (<0.3) la tormenta aparece', () => {
    const c = new ClimaSystem(() => 0.1); // rng constante: siguiente() < 0.3
    c.forzar('despejado');
    c.restante = 0;
    c.update(0.01);
    assert.strictEqual(c.estado, 'tormenta');
});

test('la intensidad sube en rampa (~5 s) hasta el objetivo del estado', () => {
    const c = new ClimaSystem(lcg());
    c.forzar('tormenta');
    for (let i = 0; i < 100; i++) c.update(0.05); // 5 s
    assert.ok(Math.abs(c.intensidad - 1) < 1e-9, 'tormenta llega a 1: ' + c.intensidad);
    c.forzar('despejado');
    for (let i = 0; i < 30; i++) c.update(0.05); // 1.5 s de bajada
    assert.ok(c.intensidad > 0 && c.intensidad < 1, 'baja gradualmente');
    for (let i = 0; i < 100; i++) c.update(0.05);
    assert.strictEqual(c.intensidad, 0);
});

test('los rayos disparan onRayo y el flash decae; nunca en lluvia', () => {
    const c = new ClimaSystem(lcg(3));
    c.forzar('tormenta');
    c.intensidad = 1; // saltar la rampa
    let rayos = 0;
    c.onRayo = () => rayos++;
    for (let i = 0; i < 60 * 20; i++) c.update(1 / 60); // 20 s de tormenta
    assert.ok(rayos >= 1, 'al menos un rayo en 20 s de tormenta: ' + rayos);
    // tras un rayo el flash existe y decae a 0
    c.tRayo = 0;
    c.update(1 / 60);
    assert.ok(c.flash > 0.9, 'flash recién disparado');
    for (let i = 0; i < 60; i++) c.update(1 / 60);
    assert.strictEqual(c.flash, 0, 'flash extinguido');

    const l = new ClimaSystem(lcg(3));
    l.forzar('lluvia');
    l.intensidad = 0.6;
    let rayosLluvia = 0;
    l.onRayo = () => rayosLluvia++;
    for (let i = 0; i < 60 * 30; i++) l.update(1 / 60);
    assert.strictEqual(rayosLluvia, 0, 'sin rayos fuera de la tormenta');
});

test('precipitación por bioma: la trae el catálogo generado del pack', () => {
    const c = new ClimaSystem(lcg());
    assert.strictEqual(c.precipitacionEn(BIOMES.ice_plains), 'nieve');  // T 0 < 0.15
    assert.strictEqual(c.precipitacionEn(BIOMES.cold_taiga), 'nieve');  // T −0.5
    assert.strictEqual(c.precipitacionEn(BIOMES.desert), null);         // downfall 0
    assert.strictEqual(c.precipitacionEn(BIOMES.savanna), null);        // downfall 0
    assert.strictEqual(c.precipitacionEn(BIOMES.plains), 'lluvia');
    assert.strictEqual(c.precipitacionEn(BIOMES.jungle), 'lluvia');
});

test('emitir puebla el sistema y cada gota muere al llegar a su suelo', () => {
    const c = new ClimaSystem(lcg(9));
    c.forzar('lluvia');
    c.intensidad = 0.6;
    const parts = new ParticleSystem(lcg(11), 700);
    // jugador en (0, 20, 0): gotas nacen en y≈29..34 y el suelo está en y=11.05
    for (let i = 0; i < 30; i++) c.emitir(1 / 60, parts, mundoPlano(), biomasTemplados, 0, 20, 0);
    assert.ok(parts.list.length > 20, 'hay gotas vivas: ' + parts.list.length);
    for (const p of parts.list) {
        const recorrido = p.life * VEL_LLUVIA;
        const hastaSuelo = p.pos[1] - 11.05;
        assert.ok(Math.abs(recorrido - hastaSuelo) < 0.01, 'la vida acaba en el suelo');
    }
});

test('bajo techo alto no entra nada y en desierto no se emite', () => {
    const c = new ClimaSystem(lcg(5));
    c.forzar('lluvia');
    c.intensidad = 0.6;
    // techo en y=30 con gotas naciendo en y≈29..34 (columnas x>=100): la
    // mayoría de alturas de nacimiento quedan bajo el techo → no se emiten
    const parts = new ParticleSystem(lcg(2), 700);
    const techoTotal = { surfaceY: () => 60 };  // techo por encima del nacimiento
    for (let i = 0; i < 30; i++) c.emitir(1 / 60, parts, techoTotal, biomasTemplados, 0, 20, 0);
    assert.strictEqual(parts.list.length, 0, 'ninguna gota bajo un techo total');

    const desierto = { at: () => ({ precipitacion: null }) };
    const parts2 = new ParticleSystem(lcg(2), 700);
    for (let i = 0; i < 30; i++) c.emitir(1 / 60, parts2, mundoPlano(), desierto, 0, 20, 0);
    assert.strictEqual(parts2.list.length, 0, 'en el desierto no llueve');
});

test('la nieve cae despacio (velocidad del copo, no de la gota)', () => {
    const c = new ClimaSystem(lcg(13));
    c.forzar('lluvia');
    c.intensidad = 0.6;
    const frio = { at: () => ({ precipitacion: 'nieve' }) };
    const parts = new ParticleSystem(lcg(4), 700);
    for (let i = 0; i < 30; i++) c.emitir(1 / 60, parts, mundoPlano(), frio, 0, 20, 0);
    assert.ok(parts.list.length > 0, 'hay copos');
    for (const p of parts.list) {
        assert.ok(Math.abs(p.vel[1] + VEL_NIEVE) < 0.01, 'cae a velocidad de copo');
    }
});

test('el rayo visible pinta una columna y devuelve el punto de impacto', () => {
    const c = new ClimaSystem(lcg(21));
    const parts = new ParticleSystem(lcg(6), 700);
    const [x, y, z] = c.rayoVisible(parts, mundoPlano(), 0, 0);
    assert.ok(parts.list.length >= 30, 'columna densa: ' + parts.list.length);
    assert.strictEqual(y, 11, 'impacto sobre la superficie');
    assert.ok(Math.abs(x) <= 24 && Math.abs(z) <= 24, 'cerca del jugador');
});

test('tintarCielo agrisa con la intensidad y blanquea con el flash', () => {
    const c = new ClimaSystem(lcg());
    const cielo = [0.55, 0.78, 0.95];
    assert.deepStrictEqual(c.tintarCielo(cielo, 1), cielo, 'sin clima no cambia');
    c.intensidad = 1;
    const gris = c.tintarCielo(cielo, 1);
    assert.ok(gris[2] < cielo[2], 'el azul cae con la tormenta');
    c.flash = 1;
    const blanco = c.tintarCielo(cielo, 1);
    assert.ok(blanco[0] > 0.8 && blanco[1] > 0.8 && blanco[2] > 0.8, 'flash casi blanco');
});

test('persistencia: toJSON/fromJSON conservan el estado; basura → despejado', () => {
    const c = new ClimaSystem(lcg(17));
    c.forzar('tormenta');
    c.intensidad = 0.83;
    const c2 = ClimaSystem.fromJSON(JSON.parse(JSON.stringify(c.toJSON())), lcg(1));
    assert.strictEqual(c2.estado, 'tormenta');
    assert.ok(Math.abs(c2.intensidad - 0.83) < 1e-9);
    assert.ok(Math.abs(c2.restante - c.restante) < 1e-9);
    const c3 = ClimaSystem.fromJSON({ estado: 'huracán', restante: -5 });
    assert.strictEqual(c3.estado, 'despejado');
    const c4 = ClimaSystem.fromJSON(undefined);
    assert.strictEqual(c4.estado, 'despejado');
});

test('factorLuz oscurece hasta un 30 % bajo tormenta plena', () => {
    const c = new ClimaSystem(lcg());
    assert.strictEqual(c.factorLuz(), 1);
    c.intensidad = 1;
    assert.ok(Math.abs(c.factorLuz() - 0.7) < 1e-9);
});

console.log(`\n${ok} pruebas del clima superadas`);

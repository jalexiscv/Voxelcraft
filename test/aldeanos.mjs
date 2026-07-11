/**
 * Suite de los proyectos de los aldeanos constructores — `node test/aldeanos.mjs`.
 * Prueba en Node el módulo puro js/aldeanos.js sobre el World real: sorteo
 * ponderado del proyecto, búsqueda de solar (llano, seco, natural y sin
 * construcciones ni árboles), plan de obra deduplicado y ordenado de abajo
 * arriba, punto de acopio a distancia y determinismo con el PRNG de la casa.
 */
import assert from 'node:assert';
import { World, CHUNK, WORLD_HEIGHT } from '../js/world.js';
import { SEA_LEVEL } from '../js/dimensiones.js';
import { B } from '../js/blocks.js';
import { PRNG } from '../js/noise.js';
import { cajaDePieza } from '../js/villages/layout.js';
import { PLANOS_ALDEANOS } from '../js/villages/planos/registry.js';
import {
    PROYECTOS, RITMO, elegirProyecto, buscarSolar, planDeObra, puntoDeAcopio,
} from '../js/aldeanos.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

// cota del suelo del laboratorio: bien por encima de SEA_LEVEL + 1 (129)
const SUELO = 139;

/**
 * Mundo de laboratorio 3×3 chunks (x, z en [−16, 47]): piedra hasta `top`−1
 * y el bloque `suelo` en `top` (el índice del buffer es y-mayor: cada franja
 * de CHUNK² celdas es una capa completa, como en test/fluidos.mjs).
 */
function laboratorio(top = SUELO, suelo = B.GRASS) {
    const w = new World(1);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
            const b = new Uint16Array(CHUNK * WORLD_HEIGHT * CHUNK);
            b.fill(B.STONE, 0, top * CHUNK * CHUNK);
            b.fill(suelo, top * CHUNK * CHUNK, (top + 1) * CHUNK * CHUNK);
            w.addChunk(cx, cz, b);
        }
    }
    return w;
}

/** Pieza de referencia sobre el laboratorio plano (centro del área). */
const piezaEn = (id, rot = 0) => ({ tipo: 'edificio', id, x: 16, z: 16, rot, y: SUELO });

console.log('Aldeanos constructores');

test('elegirProyecto respeta los pesos 3/3/1 del sorteo', () => {
    assert.deepEqual(PROYECTOS.map(([id]) => id), ['choza', 'huerto', 'estatua']);
    // con un rng de valor fijo, los cortes de la ruleta caen en 3/7 y 6/7
    const fijo = (v) => ({ float: () => v });
    assert.equal(elegirProyecto(fijo(0)), 'choza');
    assert.equal(elegirProyecto(fijo(3 / 7 - 0.001)), 'choza');
    assert.equal(elegirProyecto(fijo(3 / 7 + 0.001)), 'huerto');
    assert.equal(elegirProyecto(fijo(6 / 7 - 0.001)), 'huerto');
    assert.equal(elegirProyecto(fijo(6 / 7 + 0.001)), 'estatua');
    assert.equal(elegirProyecto(fijo(0.999)), 'estatua');
    // y con el PRNG real las frecuencias rondan los pesos (700 sorteos)
    const rng = new PRNG(1);
    const conteo = { choza: 0, huerto: 0, estatua: 0 };
    for (let i = 0; i < 700; i++) conteo[elegirProyecto(rng)]++;
    assert.ok(Math.abs(conteo.choza - 300) < 60, `choza: ${conteo.choza}`);
    assert.ok(Math.abs(conteo.huerto - 300) < 60, `huerto: ${conteo.huerto}`);
    assert.ok(Math.abs(conteo.estatua - 100) < 60, `estatua: ${conteo.estatua}`);
});

test('buscarSolar halla un solar llano y seco en el mundo plano', () => {
    const res = buscarSolar(laboratorio(), 16, 16, 'casa_pequena', new PRNG(42));
    assert.ok(res, 'sin solar en terreno perfecto');
    const { pieza, caja } = res;
    assert.equal(pieza.tipo, 'edificio');
    assert.equal(pieza.id, 'casa_pequena');
    assert.equal(pieza.y, SUELO, 'la cota es la superficie del centro');
    assert.ok(Number.isInteger(pieza.rot) && pieza.rot >= 0 && pieza.rot < 4);
    // el centro cae a 8..24 bloques (con la holgura √2/2 del redondeo)
    const d = Math.hypot(pieza.x - 16, pieza.z - 16);
    assert.ok(d >= 8 - Math.SQRT1_2 && d <= 24 + Math.SQRT1_2, `centro a ${d} bloques`);
    assert.deepEqual(caja, cajaDePieza(pieza));
});

test('buscarSolar niega el solar en terreno abrupto (damero ±3)', () => {
    const w = laboratorio();
    // pilares de piedra +3 en damero: toda huella mezcla cotas 139 y 142
    for (let x = -16; x <= 47; x++) {
        for (let z = -16; z <= 47; z++) {
            if ((x + z) & 1) {
                for (let dy = 1; dy <= 3; dy++) w.set(x, SUELO + dy, z, B.STONE);
            }
        }
    }
    assert.equal(buscarSolar(w, 16, 16, 'casa_pequena', new PRNG(42)), null);
});

test('buscarSolar niega la playa (suelo al nivel del mar) pero no la tierra firme', () => {
    const playa = laboratorio(SEA_LEVEL, B.SAND);
    assert.equal(buscarSolar(playa, 16, 16, 'casa_pequena', new PRNG(42)), null);
    // a SEA_LEVEL + 2 ya se cumple el «y > SEA_LEVEL + 1»
    const firme = laboratorio(SEA_LEVEL + 2, B.SAND);
    assert.ok(buscarSolar(firme, 16, 16, 'casa_pequena', new PRNG(42)));
});

test('buscarSolar descarta huellas con bloques construidos', () => {
    const w = laboratorio();
    // rejilla de adoquín cada 4 bloques a 1 sobre el suelo: toda huella de
    // casa_pequena (5×5) pilla al menos uno
    for (let x = -16; x <= 47; x += 4) {
        for (let z = -16; z <= 47; z += 4) w.set(x, SUELO + 1, z, B.COBBLE);
    }
    assert.equal(buscarSolar(w, 16, 16, 'casa_pequena', new PRNG(42)), null);
});

test('las plantas no vetan el solar (la obra las despeja)', () => {
    const w = laboratorio();
    for (let x = -16; x <= 47; x++) {
        for (let z = -16; z <= 47; z++) {
            w.set(x, SUELO + 1, z, ((x + z) & 1) ? B.TALL_GRASS : B.FLOWER_RED);
        }
    }
    assert.ok(buscarSolar(w, 16, 16, 'casa_pequena', new PRNG(42)), 'la vegetación vetó');
});

test('planDeObra: de abajo arriba, sin duplicados y dentro de la caja', () => {
    const pieza = piezaEn('casa_pequena');
    const plan = planDeObra(pieza, 'plains', 12345);
    assert.ok(plan.length > 0, 'plan vacío');
    const caja = cajaDePieza(pieza);
    const vistos = new Set();
    for (let i = 0; i < plan.length; i++) {
        const { x, y, z } = plan[i];
        assert.ok(x >= caja[0] && x <= caja[2] && z >= caja[1] && z <= caja[3],
            `celda (${x},${y},${z}) fuera de la caja`);
        const clave = `${x},${y},${z}`;
        assert.ok(!vistos.has(clave), `celda duplicada ${clave}`);
        vistos.add(clave);
        if (i > 0) {
            const p = plan[i - 1];
            assert.ok(p.y < y || (p.y === y && (p.x < x || (p.x === x && p.z < z))),
                `plan desordenado en la celda ${i}`);
        }
    }
    // la puerta sobrevive a la deduplicación (el corte de aire pasa antes)
    assert.ok(plan.some((c) => c.id === B.DOOR_CLOSED), 'sin puerta');
    assert.ok(plan.some((c) => c.id === B.TORCH), 'sin antorcha');
    // y el corte de aire se conserva: despeja la vegetación del solar
    assert.ok(plan.some((c) => c.id === B.AIR && c.y > SUELO), 'sin corte de aire');
});

test('puntoDeAcopio queda a 6..12 bloques del centro de la obra', () => {
    const rng = new PRNG(7);
    const pieza = piezaEn('casa_pequena');
    const [rMin, rMax] = RITMO.RADIO_ACOPIO;
    for (let i = 0; i < 256; i++) {
        const [x, z] = puntoDeAcopio(pieza, rng);
        assert.ok(Number.isInteger(x) && Number.isInteger(z), 'coordenadas no enteras');
        // holgura √2/2: el redondeo al bloque mueve el punto media diagonal
        const d = Math.hypot(x - 16, z - 16);
        assert.ok(d >= rMin - Math.SQRT1_2 && d <= rMax + Math.SQRT1_2, `a ${d} bloques`);
    }
});

test('determinismo: misma semilla ⇒ mismo solar y mismo plan', () => {
    const w = laboratorio();
    const a = buscarSolar(w, 16, 16, 'casa_pequena', new PRNG(2026));
    const b = buscarSolar(w, 16, 16, 'casa_pequena', new PRNG(2026));
    assert.deepEqual(a, b, 'solares distintos con la misma semilla');
    assert.deepEqual(planDeObra(a.pieza, 'plains', 99), planDeObra(b.pieza, 'plains', 99));
});

// ---- Planos exclusivos de los aldeanos (choza, huerto, estatua) ----
// Llegan por el export PLANOS_ALDEANOS del registro; si esta rama aún no lo
// tuviera, estas pruebas se omitirían con un aviso en vez de fallar.
if (!PLANOS_ALDEANOS) {
    console.log('  ⚠ PLANOS_ALDEANOS aún no está en el registro: pruebas de choza/huerto/estatua omitidas');
} else {
    test('PROYECTOS sortea exactamente los planos de los aldeanos', () => {
        assert.deepEqual([...PROYECTOS.map(([id]) => id)].sort(), [...PLANOS_ALDEANOS].sort());
        for (const [, peso] of PROYECTOS) assert.ok(peso > 0, 'peso no positivo');
    });

    test('buscarSolar también encuentra sitio para la choza', () => {
        const res = buscarSolar(laboratorio(), 16, 16, 'choza', new PRNG(3));
        assert.ok(res, 'sin solar para la choza');
        assert.equal(res.pieza.id, 'choza');
    });

    test('el huerto se planifica con tierra labrada, agua y cultivo', () => {
        const plan = planDeObra(piezaEn('huerto'), 'plains', 12345);
        assert.ok(plan.some((c) => c.id === B.FARMLAND), 'sin tierra labrada');
        assert.ok(plan.some((c) => c.id === B.WATER), 'sin agua');
        assert.ok(plan.some((c) => c.id >= B.TRIGO_0 && c.id <= B.PATATA_3), 'sin cultivo');
    });

    test('la estatua luce su bloque de oro', () => {
        const plan = planDeObra(piezaEn('estatua'), 'plains', 12345);
        assert.ok(plan.some((c) => c.id === B.GOLD_BLOCK), 'sin bloque de oro');
    });
}

/* ==== Integración: builderAI del MobSystem real sobre el mundo real ==== */
{
    const { MobSystem } = await import('../js/mobs.js');
    const { BIOMES } = await import('../js/biomes/map.js');
    const villager = (await import('../js/mobs/villager.js')).default;
    const silencio = { sound() {}, damagePlayer() {}, explosion() {}, drop() {}, particles() {} };
    // zombi de laboratorio: hostil quieto que no arde (para medir la defensa)
    const zombi = {
        id: 'zombie', name: 'Zombi', hostile: true, noBurn: true,
        aabb: { w: 0.6, h: 1.9 }, hp: 12, speed: 0.01, drops: [],
        behavior: { aggro: 10, attackRange: 1.6, damage: 2, cooldown: 1.1 },
    };
    const ctx = { pos: [16.5, SUELO + 1, 16.5], eye: [16.5, SUELO + 2.6, 16.5],
        look: [0, 0, -1], day: 1, creative: false, peaceful: false };

    test('el ciclo completo de la obra: solar, acopio, acarreo, construcción y remate', () => {
        const w = laboratorio();
        const sys = new MobSystem({ villager }, w, silencio, 7);
        sys.biomes = { at: () => BIOMES.plains, climate: () => ({ temp: 0, humid: 0, weird: 0 }) };
        const m = sys.spawnAt('villager', 16, SUELO + 1, 16);
        assert.ok(m, 'el aldeano nace');

        const fases = new Set();
        let plan = null, caja = null;
        // dt = 0.05 (el tick real del servidor): la física de mobs no es
        // barrida y con pasos grandes tunela el suelo
        for (let t = 0; t < 600 && !(plan && !m.obra); t += 0.05) {
            if (!m.obra) m.obraCd = 0; // sin descansos: al grano (el sorteo sigue siendo suyo)
            sys.update(0.05, ctx);
            if (m.obra) {
                fases.add(m.obra.fase);
                if (!plan) { plan = m.obra.plan; caja = m.obra.caja; }
            }
        }
        assert.ok(plan, 'nunca emprendió una obra');
        assert.equal(m.obra, null, 'la obra no terminó en 600 s simulados');
        assert.ok(fases.has('acopio') && fases.has('acarreo') && fases.has('obra'),
            `faltan fases del oficio: ${[...fases]}`);
        assert.ok(m.obraCd > 60, 'sin descanso tras rematar la obra');
        // toda celda del plan quedó en el mundo tal cual (última escritura)
        const malas = plan.filter((c) => w.get(c.x, c.y, c.z) !== c.id);
        assert.equal(malas.length, 0, `celdas sin colocar: ${malas.length} de ${plan.length}`);
        assert.ok(plan.length > 40, 'el plan era sospechosamente corto');
        // y la obra cae dentro de su caja en XZ
        assert.ok(caja[0] >= -16 && caja[2] <= 47 && caja[1] >= -16 && caja[3] <= 47);
    });

    test('el aldeano defiende la obra: planta cara al hostil y lo golpea', () => {
        const w = laboratorio();
        const sys = new MobSystem({ villager, zombie: zombi }, w, silencio, 11);
        sys.biomes = { at: () => BIOMES.plains, climate: () => ({ temp: 0, humid: 0, weird: 0 }) };
        const m = sys.spawnAt('villager', 16, SUELO + 1, 16);
        // que emprenda obra primero (así defiende la OBRA, no solo su pellejo)
        for (let t = 0; t < 120 && !m.obra; t += 0.05) {
            m.obraCd = 0;
            sys.update(0.05, ctx);
        }
        assert.ok(m.obra, 'sin obra que defender');
        const z = sys.spawnAt('zombie', Math.round(m.obra.pieza.x), SUELO + 1, Math.round(m.obra.pieza.z));
        let herido = false;
        for (let t = 0; t < 60 && !herido; t += 0.05) {
            sys.update(0.05, ctx);
            if (z.hp < zombi.hp || z.dying()) herido = true;
        }
        assert.ok(herido, 'el aldeano no defendió la obra (el zombi sigue intacto)');
    });
}

console.log(`\n${ok} pruebas en verde`);

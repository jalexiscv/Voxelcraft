/**
 * Suite de la fluidez de líquidos — `node test/fluidos.mjs`.
 * Ejercita el módulo puro js/fluidos.js sobre el World real: esparcido por
 * niveles con el alcance del clásico (agua 7, lava 3), prioridad de caída,
 * secado al retirar la fuente, fuente infinita, petrificación agua↔lava,
 * plantas arrasadas, cadencias por fluido y luz/malla de los flujos.
 */
import assert from 'node:assert';
import { World, CHUNK, WORLD_HEIGHT } from '../js/world.js';
import { B, DEFS, esAgua, esLava, nivelDe } from '../js/blocks.js';
import { activarFluidos, tickFluidos } from '../js/fluidos.js';
import { meshChunk } from '../js/mesher.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

const SUELO = 8; // primer y de aire: suelo de piedra en 0..7

/** Mundo de laboratorio 3×3 chunks: piedra hasta y<8, aire encima, fluidos activos. */
function laboratorio() {
    const w = new World(1);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
            const b = new Uint16Array(CHUNK * WORLD_HEIGHT * CHUNK);
            b.fill(B.STONE, 0, SUELO * CHUNK * CHUNK);
            w.addChunk(cx, cz, b);
        }
    }
    activarFluidos(w);
    return w;
}

/** Avanza n pasos de agua (0.25 s cada uno; la lava vence cada 6). */
const pasos = (w, n) => { for (let i = 0; i < n; i++) tickFluidos(w, 0.25); };

/** Celdas de la familia dentro de un radio en el plano y (para conteos). */
function liquidosEn(w, y, es, radio = 12) {
    const celdas = [];
    for (let x = -radio; x <= radio; x++) {
        for (let z = -radio; z <= radio; z++) {
            if (es(w.get(x, y, z))) celdas.push([x, z]);
        }
    }
    return celdas;
}

console.log('Fluidez de líquidos');

test('sin activar, tickFluidos es un no-op', () => {
    const w = new World(2);
    assert.equal(w.fluidos, undefined);
    assert.equal(tickFluidos(w, 1), 0);
});

test('la fuente se esparce por niveles y alcanza 7 bloques (agua)', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.WATER);
    pasos(w, 12);
    // el nivel decae 1 por bloque de distancia Manhattan a la fuente
    assert.equal(w.get(9, SUELO, 8), B.WATER_FLOW1 + 6, 'a 1 bloque, nivel 7');
    assert.equal(w.get(12, SUELO, 8), B.WATER_FLOW1 + 3, 'a 4 bloques, nivel 4');
    assert.equal(w.get(15, SUELO, 8), B.WATER_FLOW1, 'a 7 bloques, nivel 1');
    assert.equal(w.get(16, SUELO, 8), B.AIR, 'a 8 bloques ya no llega');
    assert.equal(w.get(8, SUELO + 1, 8), B.AIR, 'no sube');
});

test('caer tiene prioridad: columna llena y sin esparcirse en el aire', () => {
    const w = laboratorio();
    w.set(8, SUELO + 3, 8, B.WATER); // fuente flotando a 3 del suelo
    pasos(w, 3);
    assert.equal(w.get(8, SUELO + 2, 8), B.WATER_FLOW1 + 7, 'columna que cae (nivel 8)');
    assert.equal(w.get(8, SUELO + 1, 8), B.WATER_FLOW1 + 7);
    assert.equal(w.get(9, SUELO + 3, 8), B.AIR, 'mientras cae no se esparce');
    pasos(w, 9);
    assert.equal(w.get(9, SUELO, 8), B.WATER_FLOW1 + 6, 'al tocar suelo se esparce con nivel 7');
});

test('retirar la fuente seca todo el flujo', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.WATER);
    pasos(w, 12);
    assert.ok(liquidosEn(w, SUELO, esAgua).length > 20, 'hay un charco');
    w.set(8, SUELO, 8, B.AIR);
    pasos(w, 40);
    assert.equal(liquidosEn(w, SUELO, esAgua).length, 0, 'sin fuente no queda agua');
});

test('fuente infinita: el hueco entre dos fuentes se vuelve fuente', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.WATER);
    w.set(10, SUELO, 8, B.WATER);
    pasos(w, 4);
    assert.equal(w.get(9, SUELO, 8), B.WATER, 'el hueco intermedio se consolida');
});

test('la lava alcanza 3 bloques y va 6 veces más lenta', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.LAVA);
    tickFluidos(w, 0.25);
    assert.equal(w.get(9, SUELO, 8), B.AIR, 'a cadencia de agua aún no fluyó');
    pasos(w, 6 * 5); // 5 pasos de lava
    assert.equal(w.get(9, SUELO, 8), B.LAVA_FLOW1 + 5, 'a 1 bloque, nivel 6');
    assert.equal(w.get(10, SUELO, 8), B.LAVA_FLOW1 + 3, 'a 2 bloques, nivel 4');
    assert.equal(w.get(11, SUELO, 8), B.LAVA_FLOW1 + 1, 'a 3 bloques, nivel 2');
    assert.equal(w.get(12, SUELO, 8), B.AIR, 'a 4 bloques ya no llega');
});

test('agua + lava: la fuente de lava se vuelve obsidiana y el flujo adoquín', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.WATER);
    w.set(9, SUELO, 8, B.LAVA);
    w.set(8, SUELO, 12, B.WATER);
    w.set(9, SUELO, 12, B.LAVA_FLOW1 + 5); // flujo de lava ya puesto
    pasos(w, 1);
    assert.equal(w.get(9, SUELO, 8), B.OBSIDIAN);
    assert.equal(w.get(9, SUELO, 12), B.COBBLE);
});

test('el agua arrasa las plantas pero un muro la contiene', () => {
    const w = laboratorio();
    w.set(9, SUELO, 8, B.FLOWER_RED);
    w.set(7, SUELO, 8, B.BRICKS);
    w.set(8, SUELO, 8, B.WATER);
    pasos(w, 3);
    assert.equal(w.get(9, SUELO, 8), B.WATER_FLOW1 + 6, 'la flor cede al agua');
    assert.equal(w.get(7, SUELO, 8), B.BRICKS, 'el muro aguanta');
    assert.equal(w.get(6, SUELO, 8), B.AIR, 'y detrás del muro no pasa nada');
});

test('la lava que fluye emite luz 15 y el flujo de agua entra en la malla de agua', () => {
    const w = laboratorio();
    w.set(4, SUELO, 4, B.LAVA_FLOW1 + 3);
    assert.equal(w.blockLightAt(4, SUELO, 4), 15);
    w.set(8, SUELO, 8, B.WATER_FLOW1 + 3); // nivel 4: media altura
    const malla = meshChunk(w, 0, 0);
    assert.ok(malla.water.length > 0, 'hay malla de agua');
    // el techo del flujo queda a 0.875·4/8 sobre su base (stride 6: x,y,z,u,v,luz)
    let topeAgua = 0;
    for (let i = 0; i < malla.water.length; i += 6) {
        if (Math.floor(malla.water[i]) === 8 && Math.floor(malla.water[i + 2]) === 8) {
            topeAgua = Math.max(topeAgua, malla.water[i + 1]);
        }
    }
    assert.ok(Math.abs(topeAgua - (SUELO + 0.875 * 4 / 8)) < 1e-6,
        `altura del flujo nivel 4: ${topeAgua}`);
});

test('la superficie es continua: niveles vecinos comparten la esquina (sin rendijas)', () => {
    const w = laboratorio();
    w.set(8, SUELO, 8, B.WATER_FLOW1 + 6); // nivel 7
    w.set(9, SUELO, 8, B.WATER_FLOW1 + 4); // nivel 5, pegado
    const malla = meshChunk(w, 0, 0);
    // en la arista compartida (x=9, z∈{8,9}) TODOS los vértices de tapa deben
    // coincidir: el promedio de las dos alturas (0.875·(7+5)/2/8 = 0.65625)
    for (const zEsq of [8, 9]) {
        const alturas = new Set();
        for (let i = 0; i < malla.water.length; i += 6) {
            if (malla.water[i] === 9 && malla.water[i + 2] === zEsq && malla.water[i + 1] > SUELO + 0.01) {
                alturas.add(malla.water[i + 1]);
            }
        }
        assert.deepEqual([...alturas], [SUELO + 0.65625], `esquina (9,${zEsq}): ${[...alturas]}`);
    }
});

test('los flujos ni se pican ni se colocan ni aparecen en el selector', () => {
    for (let n = 0; n < 8; n++) {
        for (const id of [B.WATER_FLOW1 + n, B.LAVA_FLOW1 + n]) {
            assert.ok(DEFS[id] && DEFS[id].liquid && !DEFS[id].solid, `def de ${id}`);
            assert.ok(!DEFS[id].placeable && !DEFS[id].breakable, `flags de ${id}`);
            assert.equal(nivelDe(id), n + 1);
        }
    }
    assert.ok(esAgua(B.WATER) && esLava(B.LAVA) && nivelDe(B.WATER) === 8);
    assert.ok(!esAgua(B.LAVA_FLOW1) && !esLava(B.WATER_FLOW1));
});

console.log(`\n${ok} pruebas superadas`);

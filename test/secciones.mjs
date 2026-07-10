/**
 * Suite del ChunkPaletizado (js/secciones.js): equivalencia exacta con el
 * array plano de referencia (fuzz), ensanchados de paleta 0→4→8→16 bits,
 * aplanado de ida y vuelta, utilidades por paleta (fuentes de luz, búsqueda
 * de id, tope opaco) y que la memoria baje de verdad.
 */
import assert from 'node:assert';
import { ChunkPaletizado, LuzSeccionada, NUM_SECCIONES, CELDAS_SECCION, SECCION_H } from '../js/secciones.js';
import { CHUNK, WORLD_HEIGHT } from '../js/dimensiones.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

const TOTAL = CHUNK * WORLD_HEIGHT * CHUNK;
const lcg = (semilla = 42) => {
    let s = semilla >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};
const li = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;

console.log('ChunkPaletizado');

test('recién creado es todo aire y las 24 secciones son uniformes', () => {
    const c = new ChunkPaletizado();
    assert.strictEqual(NUM_SECCIONES, WORLD_HEIGHT / SECCION_H);
    assert.strictEqual(c.get(0), 0);
    assert.strictEqual(c.get(TOTAL - 1), 0);
    for (let s = 0; s < NUM_SECCIONES; s++) assert.strictEqual(c.uniformeDe(s), 0);
    assert.ok(c.bytes() < 4096, 'un chunk vacío pesa casi nada: ' + c.bytes());
});

test('carga un chunk sintético y devuelve exactamente lo mismo que el plano', () => {
    // mundo en miniatura: bedrock, piedra con menas, superficie y cielo
    const rng = lcg(7);
    const plano = new Uint16Array(TOTAL);
    for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
            plano[li(lx, 0, lz)] = 7; // bedrock
            for (let y = 1; y < 130; y++) {
                const r = rng();
                plano[li(lx, y, lz)] = r < 0.02 ? 14 : (r < 0.03 ? 550 : (r < 0.06 ? 0 : 1));
            }
            plano[li(lx, 130, lz)] = 2; // hierba
        }
    }
    const c = new ChunkPaletizado(plano);
    for (let i = 0; i < TOTAL; i++) {
        if (c.get(i) !== plano[i]) assert.fail(`celda ${i}: ${c.get(i)} != ${plano[i]}`);
    }
    // el cielo (y>144) queda uniforme; la sección de la superficie (y 128..143
    // con piedra, hierba y aire) es mixta
    assert.strictEqual(c.uniformeDe(NUM_SECCIONES - 1), 0);
    assert.strictEqual(c.uniformeDe(8), -1);
    assert.ok(c.bytes() < 40000, 'chunk realista muy por debajo del plano (192KB): ' + c.bytes());
});

test('fuzz de escrituras: 20k sets aleatorios equivalen al array plano', () => {
    const rng = lcg(99);
    const plano = new Uint16Array(TOTAL);
    const c = new ChunkPaletizado();
    for (let k = 0; k < 20000; k++) {
        const i = Math.floor(rng() * TOTAL);
        const id = Math.floor(rng() * 30); // paletas que crecen sobre 16 → 8 bits
        plano[i] = id;
        c.set(i, id);
        if (k % 500 === 0) {
            const j = Math.floor(rng() * TOTAL);
            assert.strictEqual(c.get(j), plano[j], 'lectura intermedia en ' + j);
        }
    }
    for (let i = 0; i < TOTAL; i++) {
        if (c.get(i) !== plano[i]) assert.fail(`celda ${i}: ${c.get(i)} != ${plano[i]}`);
    }
});

test('ensanchado extremo a 16 bits: >256 ids distintos en una sección', () => {
    const c = new ChunkPaletizado();
    // 300 ids distintos en la sección 0 → 4 → 8 → 16 bits
    for (let j = 0; j < 300; j++) c.set(j, 1000 + j);
    for (let j = 0; j < 300; j++) assert.strictEqual(c.get(j), 1000 + j);
    assert.strictEqual(c.get(3000), 0, 'las celdas no escritas siguen siendo aire');
    // y el resto del chunk no se ve afectado
    assert.strictEqual(c.uniformeDe(5), 0);
});

test('aplanar hace la ida y vuelta exacta (para el RLE del guardado)', () => {
    const rng = lcg(21);
    const plano = new Uint16Array(TOTAL);
    for (let k = 0; k < 5000; k++) plano[Math.floor(rng() * TOTAL)] = Math.floor(rng() * 700);
    const c = new ChunkPaletizado(plano);
    const vuelta = c.aplanar();
    assert.strictEqual(vuelta.length, TOTAL);
    for (let i = 0; i < TOTAL; i++) {
        if (vuelta[i] !== plano[i]) assert.fail(`aplanado ${i}: ${vuelta[i]} != ${plano[i]}`);
    }
});

test('fuentesDeLuz encuentra exactamente las celdas emisoras', () => {
    const EMIT = new Uint8Array(700);
    EMIT[9] = 15;  // lava
    EMIT[68] = 14; // antorcha
    const c = new ChunkPaletizado();
    c.set(li(3, 5, 3), 9);
    c.set(li(8, 200, 8), 68);
    c.set(li(1, 1, 1), 1); // piedra: no emite
    const fuentes = c.fuentesDeLuz(EMIT).sort((a, b) => a[0] - b[0]);
    assert.deepStrictEqual(fuentes, [[li(3, 5, 3), 15], [li(8, 200, 8), 14]]);
});

test('una sección UNIFORME de lava emite entera (4096 fuentes)', () => {
    const EMIT = new Uint8Array(700);
    EMIT[9] = 15;
    const plano = new Uint16Array(TOTAL);
    plano.fill(9, 0, CELDAS_SECCION); // sección 0 entera de lava
    const c = new ChunkPaletizado(plano);
    assert.strictEqual(c.uniformeDe(0), 9);
    assert.strictEqual(c.fuentesDeLuz(EMIT).length, CELDAS_SECCION);
});

test('buscarId localiza los dinámicos y salta el resto por paleta', () => {
    const c = new ChunkPaletizado();
    c.set(li(4, 100, 4), 86);  // cámara
    c.set(li(9, 300, 2), 86);
    c.set(li(0, 0, 0), 1);
    const idx = c.buscarId(86).sort((a, b) => a - b);
    assert.deepStrictEqual(idx, [li(4, 100, 4), li(9, 300, 2)].sort((a, b) => a - b));
    assert.deepStrictEqual(c.buscarId(999), []);
});

test('topeOpaco salta el cielo por secciones y respeta los no opacos', () => {
    const OPACO = new Uint8Array(700);
    OPACO[1] = 1; // piedra opaca (el 18, cristal, no)
    const c = new ChunkPaletizado();
    for (let y = 0; y <= 120; y++) c.set(li(5, y, 5), 1);
    c.set(li(5, 200, 5), 18); // cristal flotante: NO cuenta
    assert.strictEqual(c.topeOpaco(5, 5, OPACO), 120);
    assert.strictEqual(c.topeOpaco(0, 0, OPACO), -1, 'columna vacía: −1');
});

test('topeOpaco sobre una sección maciza uniforme devuelve su techo', () => {
    const OPACO = new Uint8Array(700);
    OPACO[1] = 1;
    const plano = new Uint16Array(TOTAL);
    plano.fill(1, 0, CELDAS_SECCION * 3); // secciones 0..2 macizas (y 0..47)
    const c = new ChunkPaletizado(plano);
    assert.strictEqual(c.topeOpaco(7, 7, OPACO), 47);
});

test('la memoria de un chunk realista baja más de 8 veces frente al plano', () => {
    // perfil como el mundo real: bedrock, 128 de subsuelo con cuevas y menas,
    // superficie variada y 250 de cielo
    const rng = lcg(1234);
    const plano = new Uint16Array(TOTAL);
    for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
            plano[li(lx, 0, lz)] = 7;
            for (let y = 1; y < 128; y++) {
                const r = rng();
                plano[li(lx, y, lz)] = r < 0.04 ? 0 : (r < 0.05 ? 14 : (r < 0.055 ? 550 : 1));
            }
            for (let y = 128; y < 132; y++) plano[li(lx, y, lz)] = 3;
            plano[li(lx, 132, lz)] = 2;
        }
    }
    const c = new ChunkPaletizado(plano);
    const planoBytes = TOTAL * 2;
    assert.ok(c.bytes() * 8 < planoBytes,
        `paletizado ${c.bytes()} B ≥ 1/8 del plano ${planoBytes} B`);
    console.log(`    (perfil sintético: ${c.bytes()} B frente a ${planoBytes} B planos)`);
});

console.log('\nLuzSeccionada');

test('recién creada es todo 0 y no ocupa memoria', () => {
    const l = new LuzSeccionada();
    assert.strictEqual(l.get(0), 0);
    assert.strictEqual(l.get(TOTAL - 1), 0);
    assert.ok(l.bytes() < 64, 'campo vacío casi gratis: ' + l.bytes());
});

test('escribir 0 sobre sección vacía NO asigna nada', () => {
    const l = new LuzSeccionada();
    for (let k = 0; k < 1000; k++) l.set(k * 97 % TOTAL, 0);
    assert.ok(l.bytes() < 64, 'sigue vacía: ' + l.bytes());
});

test('fuzz de niveles 0..15: equivalencia con el array plano (nibbles)', () => {
    const rng = lcg(31);
    const plano = new Uint8Array(TOTAL);
    const l = new LuzSeccionada();
    for (let k = 0; k < 20000; k++) {
        const i = Math.floor(rng() * TOTAL);
        const v = Math.floor(rng() * 16);
        plano[i] = v;
        l.set(i, v);
    }
    for (let i = 0; i < TOTAL; i++) {
        if (l.get(i) !== plano[i]) assert.fail(`luz ${i}: ${l.get(i)} != ${plano[i]}`);
    }
    // celdas vecinas de nibble no se pisan entre sí
    l.set(100, 15); l.set(101, 7);
    assert.strictEqual(l.get(100), 15);
    assert.strictEqual(l.get(101), 7);
});

test('la luz de una antorcha ocupa 1-2 secciones, no el chunk entero', () => {
    const l = new LuzSeccionada();
    // esfera de luz alrededor de y=100 (sección 6): como el volcado real
    for (let y = 86; y <= 114; y++) {
        for (let lz = 0; lz < 16; lz++) {
            for (let lx = 0; lx < 16; lx++) l.set(li(lx, y, lz), 5);
        }
    }
    const conDatos = l.secs.filter((s) => s).length;
    assert.ok(conDatos <= 3, 'secciones asignadas: ' + conDatos);
    assert.ok(l.bytes() < 8192, 'muy por debajo de los 96 KB planos: ' + l.bytes());
});

test('limpiar() vuelve a dejarlo todo vacío y a coste cero', () => {
    const l = new LuzSeccionada();
    l.set(li(5, 100, 5), 14);
    assert.strictEqual(l.get(li(5, 100, 5)), 14);
    l.limpiar();
    assert.strictEqual(l.get(li(5, 100, 5)), 0);
    assert.ok(l.bytes() < 64);
});

console.log(`\n${ok} pruebas de secciones superadas`);

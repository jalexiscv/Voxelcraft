/**
 * Suite de las construcciones de la consola — `node test/construcciones.mjs`.
 * Prueba en Node el módulo puro: catálogo completo, colocación frente al
 * jugador (rotación de fachada hacia él, caja a la separación correcta),
 * estampado con paleta por bioma, puertas de dos hojas, relleno y corte,
 * cultivos posicionales de la granja y determinismo.
 */
import assert from 'node:assert';
import { CONSTRUCCIONES, colocacionDe, estampar } from '../js/construcciones.js';
import { PLANOS } from '../js/villages/planos/registry.js';
import { RELLENO } from '../js/villages/build.js';
import { B } from '../js/blocks.js';

let ok = 0;
const test = (nombre, fn) => { fn(); ok++; console.log('  ✓', nombre); };

/** Estampa y devuelve el mapa `x,y,z` → id (la última escritura gana). */
function estampado(idPlano, mirando, biomaId = 'plains', px = 0, pz = 0, y = 70) {
    const { pieza, caja } = colocacionDe(idPlano, px, pz, mirando, y);
    const celdas = new Map();
    const alto = estampar(pieza, biomaId, 12345, (x, y2, z, id) => {
        celdas.set(`${x},${y2},${z}`, id);
    });
    return { caja, alto, celdas };
}

const deId = (celdas, id) =>
    [...celdas.entries()].filter(([, v]) => v === id).map(([k]) => k.split(',').map(Number));

console.log('Construcciones de la consola');

test('el catálogo ofrece los 8 planos de aldea y las torres de consola', () => {
    assert.equal(CONSTRUCCIONES.length, 9);
    const nombres = CONSTRUCCIONES.map((c) => c.nombre);
    for (const n of ['Pozo', 'Casa pequeña', 'Casa grande', 'Granja',
        'Herrería', 'Biblioteca', 'Templo', 'Atalaya', 'Torres']) {
        assert.ok(nombres.includes(n), `falta ${n}`);
    }
    for (const c of CONSTRUCCIONES) assert.ok(PLANOS[c.id], `plano ${c.id} inexistente`);
});

test('la rotación deja la fachada mirando al jugador en los 4 cardinales', () => {
    // DIRECCIONES de layout.js: fachada de rot r mira a [−Z, +X, +Z, −X][r]
    assert.equal(colocacionDe('casa_pequena', 0, 0, [0, 1], 70).pieza.rot, 0);
    assert.equal(colocacionDe('casa_pequena', 0, 0, [-1, 0], 70).pieza.rot, 1);
    assert.equal(colocacionDe('casa_pequena', 0, 0, [0, -1], 70).pieza.rot, 2);
    assert.equal(colocacionDe('casa_pequena', 0, 0, [1, 0], 70).pieza.rot, 3);
});

test('la caja queda delante del jugador, a 2 bloques, y no lo pisa', () => {
    for (const [mirando, dentro] of [
        [[0, 1], (c) => c[1] === 2], [[0, -1], (c) => c[3] === -2],
        [[1, 0], (c) => c[0] === 2], [[-1, 0], (c) => c[2] === -2],
    ]) {
        const { caja } = colocacionDe('casa_grande', 0, 0, mirando, 70);
        assert.ok(dentro(caja), `borde cercano mal para ${mirando}: ${caja}`);
        const jugadorDentro = caja[0] <= 0 && 0 <= caja[2] && caja[1] <= 0 && 0 <= caja[3];
        assert.ok(!jugadorDentro, `la caja pisa al jugador para ${mirando}`);
    }
});

test('la puerta cae en el borde cercano al jugador en los 4 cardinales', () => {
    for (const [mirando, enBorde] of [
        [[0, 1], (p, c) => p[2] === c[1]], [[0, -1], (p, c) => p[2] === c[3]],
        [[1, 0], (p, c) => p[0] === c[0]], [[-1, 0], (p, c) => p[0] === c[2]],
    ]) {
        const { caja, celdas } = estampado('casa_pequena', mirando);
        const puertas = deId(celdas, B.DOOR_CLOSED);
        assert.equal(puertas.length, 1, `puertas ≠ 1 para ${mirando}`);
        assert.ok(enBorde(puertas[0], caja), `puerta fuera de fachada para ${mirando}`);
        // hoja superior apilada justo encima
        const [x, y, z] = puertas[0];
        assert.equal(celdas.get(`${x},${y + 1},${z}`), B.DOOR_TOP_CLOSED);
    }
});

test('paleta por bioma: plains en madera, desert en arena', () => {
    const llanura = estampado('casa_pequena', [0, 1], 'plains');
    assert.ok(deId(llanura.celdas, B.PLANKS).length > 0, 'muros de tablones');
    assert.ok(deId(llanura.celdas, B.LOG).length > 0, 'esquinas de tronco');
    assert.ok(deId(llanura.celdas, B.COBBLE).length === 25, 'solera 5×5 de adoquín');
    const desierto = estampado('casa_pequena', [0, 1], 'desert');
    assert.ok(deId(desierto.celdas, B.SAND).length > 0, 'muros de arena');
    assert.equal(deId(desierto.celdas, B.PLANKS).length, 0, 'sin tablones en desierto');
});

test('relleno de DIRT bajo la parcela y corte de aire sobre el plano', () => {
    const { caja, alto, celdas } = estampado('casa_pequena', [0, 1]);
    const columnas = (caja[2] - caja[0] + 1) * (caja[3] - caja[1] + 1);
    assert.equal(deId(celdas, B.DIRT).length, columnas * RELLENO);
    // el corte llega un bloque por encima del plano y el remate 3×3 deja aire
    assert.ok(deId(celdas, B.AIR).some(([, y]) => y === 70 + alto));
    // ninguna escritura sale de la caja en XZ ni del rango vertical
    for (const [x, y, z] of [...celdas.keys()].map((k) => k.split(',').map(Number))) {
        assert.ok(x >= caja[0] && x <= caja[2] && z >= caja[1] && z <= caja[3], 'fuera de caja');
        assert.ok(y >= 70 - RELLENO && y <= 70 + alto, 'fuera de rango vertical');
    }
});

test('la granja siembra cultivos reales y deterministas', () => {
    const a = estampado('granja', [0, 1]);
    const cultivos = [...a.celdas.values()].filter((id) => id >= B.TRIGO_0 && id <= B.PATATA_3);
    assert.ok(cultivos.length > 0, 'sin cultivos');
    assert.ok(deId(a.celdas, B.FARMLAND).length > 0, 'sin tierra labrada');
    const b = estampado('granja', [0, 1]);
    assert.deepEqual([...a.celdas.entries()], [...b.celdas.entries()], 'no determinista');
});

test('los 9 planos del catálogo se estampan sin lanzar y con antorcha', () => {
    for (const c of CONSTRUCCIONES) {
        const { celdas } = estampado(c.id, [0, -1], 'taiga', 100, 100, 80);
        assert.ok(celdas.size > 0, `${c.id} no escribe nada`);
        assert.ok(deId(celdas, B.TORCH).length > 0, `${c.id} sin antorcha`);
    }
});

/* ==== Torres: el plano gigante exclusivo de la consola ==== */
{
    const { LISTA_PLANOS, PLANOS_CONSOLA } = await import('../js/villages/planos/registry.js');
    const { WORLD_HEIGHT } = await import('../js/dimensiones.js');

    test('las torres quedan fuera del worldgen y de los aldeanos', () => {
        assert.ok(PLANOS_CONSOLA.includes('torres'));
        assert.ok(!LISTA_PLANOS.some((p) => p.id === 'torres'), 'en el pool del worldgen');
        assert.ok(!Object.keys(PLANOS).includes('torres'), 'enumerable (validate-plano la vería)');
        assert.ok(PLANOS.torres, 'irresoluble por id');
    });

    test('el plano generado cumple el contrato tam/clave/capas', () => {
        const p = PLANOS.torres;
        const [ancho, alto, fondo] = p.tam;
        assert.equal(p.capas.length, alto);
        for (const capa of p.capas) {
            assert.equal(capa.length, fondo);
            for (const fila of capa) assert.equal(fila.length, ancho);
        }
        const usados = new Set();
        for (const capa of p.capas) for (const fila of capa) for (const ch of fila) usados.add(ch);
        usados.delete('.');
        for (const ch of usados) assert.ok(p.clave[ch], `char ${ch} sin declarar en clave`);
    });

    test('las torres se estampan con sus materiales, 4 puertas y balizas', () => {
        const { caja, celdas } = estampado('torres', [0, 1], 'plains', 0, 0, 70);
        assert.ok(deId(celdas, B.DIORITE).length > 15000, 'pocas costillas blancas');
        assert.ok(deId(celdas, B.ANDESITE).length > 10000, 'pocas costillas grises');
        assert.ok(deId(celdas, B.GLASS).length > 4000, 'poco ventanal');
        const puertas = deId(celdas, B.DOOR_CLOSED);
        assert.equal(puertas.length, 4, 'las 3 torres y el podio llevan puerta');
        for (const [x, y, z] of puertas) {
            assert.equal(celdas.get(`${x},${y + 1},${z}`), B.DOOR_TOP_CLOSED, 'sin hoja superior');
        }
        assert.ok(deId(celdas, B.TORCH).length >= 14, 'faltan balizas');
        // la torre central roza el techo: hay bloques a más de 200 de la base
        assert.ok([...celdas.entries()].some(([k, v]) => v !== B.AIR && Number(k.split(',')[1]) > 70 + 200),
            'la torre central no llega a su altura');
        // huella gigante pero contenida en su caja
        assert.equal(caja[2] - caja[0] + 1, 56);
        assert.equal(caja[3] - caja[1] + 1, 56);
    });

    test('con la base alta el estampado respeta el techo del mundo (recorta)', () => {
        const { pieza } = colocacionDe('torres', 0, 0, [0, 1], 300);
        let tope = 0;
        estampar(pieza, 'plains', 12345, (x, y, z, id) => { if (y > tope) tope = y; });
        assert.ok(tope < WORLD_HEIGHT, `escritura a y=${tope} ≥ ${WORLD_HEIGHT}`);
    });
}

console.log(`\n${ok} pruebas en verde`);

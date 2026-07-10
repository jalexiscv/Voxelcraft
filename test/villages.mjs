/**
 * Suite del sistema de aldeas — `node test/villages.mjs`.
 * Prueba en Node los módulos puros: la paleta resuelve todos los roles a
 * bloques existentes en todos los biomas de aldea, el pool sortea edificios
 * con plano en el registro, los 8 arquetipos cumplen el contrato del plano
 * (validate-plano.mjs), el pozo queda fuera del pool porque es el ancla, y
 * el trazador (layout.js) es determinista, respeta los requisitos del ancla
 * y produce piezas sin solapes con sondas simuladas de terreno.
 *
 * Cierra la suite la sección de integración con el generador REAL
 * (worldgen + villages/build.js): caminos y edificios materializados en los
 * chunks, costura orden-independiente en bordes de chunk, no-op sin aldea y
 * granjas con cultivos reales (rol posicional CULTIVO sobre FARMLAND).
 */
import {
    ROLES, ROLES_POSICIONALES, PALETAS, BIOMAS_ALDEA, POOL, UNICOS,
    resolverRol, resolverBloque,
} from '../js/villages/model.js';
import { PLANOS, LISTA_PLANOS } from '../js/villages/planos/registry.js';
import {
    CELDA_CHUNKS, villageAt, rectanguloDe,
} from '../js/villages/layout.js';
import { BIOMES } from '../js/biomes/registry.js';
import { B } from '../js/blocks.js';
import { Generator, SEA, SY } from '../js/worldgen.js';
import { aplicarAldeas, bloqueCultivo } from '../js/villages/build.js';
import { validatePlano } from './validate-plano.mjs';

let ok = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { ok++; console.log(`  OK  ${name}`); }
    else { fail++; console.log(`  FALLA ${name}`); }
};

/* ==== Paleta: todos los roles resuelven en todos los biomas ==== */
console.log('== Paleta por bioma ==');
{
    check('BIOMAS_ALDEA son ids reales del registro de biomas',
        BIOMAS_ALDEA.every((id) => BIOMES[id] && BIOMES[id].id === id));
    check('PALETAS cubre exactamente los biomas de aldea',
        Object.keys(PALETAS).length === BIOMAS_ALDEA.length &&
        BIOMAS_ALDEA.every((id) => PALETAS[id]));
    for (const bioma of BIOMAS_ALDEA) {
        const resuelve = ROLES.every((rol) => {
            const nombre = resolverRol(rol, bioma);
            return typeof nombre === 'string' && nombre in B &&
                resolverBloque(rol, bioma) === B[nombre];
        });
        check(`la paleta de ${bioma} resuelve los ${ROLES.length} roles a bloques de B`, resuelve);
    }
    // el comodín: los biomas sin paleta propia construyen como la llanura
    check('bosque y cerezos comparten la paleta de llanura (comodín)',
        ['bosque', 'cerezos'].every((id) =>
            ROLES.every((rol) => resolverRol(rol, id) === resolverRol(rol, 'llanura'))));
    check('resolverBloque acepta nombres literales además de roles',
        resolverBloque('WATER', 'llanura') === B.WATER &&
        resolverBloque('TORCH', 'desierto') === B.TORCH);
    // los roles posicionales no son de paleta: resolverBloque devuelve null
    // (los materializa build.js por columna) sin romperse en ningún bioma
    check('el rol posicional CULTIVO devuelve null en resolverBloque (todo bioma)',
        ROLES_POSICIONALES.includes('CULTIVO') &&
        BIOMAS_ALDEA.every((id) => resolverBloque('CULTIVO', id) === null));
}

/* ==== Pool de edificios ==== */
console.log('== Pool de edificios ==');
{
    const ids = Object.keys(POOL);
    check('todos los pesos del pool son positivos',
        ids.length > 0 && ids.every((id) => Number.isFinite(POOL[id]) && POOL[id] > 0));
    check('todo edificio del pool tiene plano en el registro',
        ids.every((id) => PLANOS[id] && PLANOS[id].id === id));
    check('los edificios únicos están en el pool con peso 1',
        UNICOS.every((id) => POOL[id] === 1));
    check('el pozo existe en el registro y NO está en el pool (es el ancla)',
        PLANOS.pozo && PLANOS.pozo.id === 'pozo' && !('pozo' in POOL));
}

/* ==== Contrato de los planos del registro ==== */
console.log('== Contrato de los planos del registro ==');
{
    check('PLANOS y LISTA_PLANOS contienen las mismas definiciones',
        LISTA_PLANOS.length === Object.keys(PLANOS).length &&
        LISTA_PLANOS.every((p) => PLANOS[p.id] === p));
    check('el registro tiene los 8 arquetipos con el pozo primero',
        LISTA_PLANOS.length === 8 && LISTA_PLANOS[0].id === 'pozo');
    for (const [id, plano] of Object.entries(PLANOS)) {
        const { errors } = validatePlano(plano, id);
        check(`contrato válido: ${id}${errors.length ? ` → ${errors[0]}` : ''}`, errors.length === 0);
    }
    // toda clave de todo plano materializa a un bloque en todo bioma de
    // aldea, salvo los roles posicionales (los resuelve build.js por columna)
    let claveResuelve = true;
    for (const plano of LISTA_PLANOS) {
        for (const valor of Object.values(plano.clave)) {
            if (ROLES_POSICIONALES.includes(valor)) continue;
            for (const bioma of BIOMAS_ALDEA) {
                if (!Number.isInteger(resolverBloque(valor, bioma))) claveResuelve = false;
            }
        }
    }
    check('toda clave no posicional de todo plano resuelve a bloque en todo bioma de aldea',
        claveResuelve);
    // la granja siembra de verdad: tierra labrada y rol posicional CULTIVO,
    // sin la aproximación antigua de hierba alta sobre tierra
    const claveGranja = Object.values(PLANOS.granja.clave);
    check('la granja usa FARMLAND y CULTIVO (ni DIRT ni TALL_GRASS aproximados)',
        claveGranja.includes('FARMLAND') && claveGranja.includes('CULTIVO') &&
        !claveGranja.includes('DIRT') && !claveGranja.includes('TALL_GRASS'));
}

/* ==== Cultivos: reparto determinista del rol posicional CULTIVO ==== */
console.log('== Cultivos: reparto de bloqueCultivo ==');
{
    // función pura: la misma columna da el mismo bloque en cualquier orden
    let estable = true, enRango = true;
    const familias = [0, 0, 0]; // trigo, zanahoria, patata
    const etapas = [0, 0, 0, 0];
    for (let x = -40; x < 40; x++) {
        for (let z = -40; z < 40; z++) {
            const id = bloqueCultivo(12345, x, z);
            if (id !== bloqueCultivo(12345, x, z)) estable = false;
            if (id < B.TRIGO_0 || id > B.PATATA_3) { enRango = false; continue; }
            familias[((id - B.TRIGO_0) / 4) | 0]++;
            etapas[(id - B.TRIGO_0) % 4]++;
        }
    }
    const n = 80 * 80;
    check('bloqueCultivo es puro (misma columna ⇒ mismo bloque) y siempre da cultivo',
        estable && enRango);
    check(`reparto de familias ~50/25/25 % sobre ${n} columnas ` +
        `(trigo ${familias[0]}, zanahoria ${familias[1]}, patata ${familias[2]})`,
        familias[0] > familias[1] && familias[0] > familias[2] &&
        Math.abs(familias[0] / n - 0.50) < 0.05 &&
        Math.abs(familias[1] / n - 0.25) < 0.05 &&
        Math.abs(familias[2] / n - 0.25) < 0.05);
    check(`etapas sesgadas a medias/altas y todas presentes ` +
        `(0: ${etapas[0]}, 1: ${etapas[1]}, 2: ${etapas[2]}, 3: ${etapas[3]})`,
        etapas.every((e) => e > 0) &&
        etapas[2] + etapas[3] > n / 2 && etapas[0] < etapas[2] && etapas[0] < etapas[3]);
    check('otra semilla reparte distinto (el hash mezcla la semilla del mundo)',
        Array.from({ length: 64 }, (_, i) => i)
            .some((i) => bloqueCultivo(12345, i, -i) !== bloqueCultivo(54321, i, -i)));
}

/* ==== Trazador: utilidades de la sección (sondas simuladas y cajas) ==== */
const SEMILLA = 20260704;
// sondas inyectadas: el trazador no conoce el generador, quien llama decide
const llanura = { biomaEn: () => 'llanura', alturaEn: () => SEA + 8 };
// caja [x0, z0, x1, z1] de una pieza, recalculada AQUÍ (independiente del
// módulo) para verificar la convención: (x, z) centro, huella rotada si rot impar
const cajaTest = (p) => {
    if (p.tipo === 'camino') return [p.x, p.z, p.x, p.z];
    const [ancho, , fondo] = PLANOS[p.id].tam;
    const fx = (p.rot % 2) ? fondo : ancho, fz = (p.rot % 2) ? ancho : fondo;
    const x0 = p.x - (fx >> 1), z0 = p.z - (fz >> 1);
    return [x0, z0, x0 + fx - 1, z0 + fz - 1];
};
const chocanTest = (a, b) =>
    a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const aldeas = []; // [celdaX, celdaZ, aldea] halladas en la pasada de densidad

/* ==== Trazador: determinismo y densidad ==== */
console.log('== Trazador: determinismo y densidad ==');
{
    let n = 0, celdaVacia = null;
    for (let cx = 0; cx < 30; cx++) {
        for (let cz = 0; cz < 20; cz++) {
            const a = villageAt(SEMILLA, cx, cz, llanura);
            if (a) { n++; aldeas.push([cx, cz, a]); }
            else if (!celdaVacia) celdaVacia = [cx, cz];
        }
    }
    check(`densidad ~12 % sobre 600 celdas llanas (6-20 %): sale ${(n / 6).toFixed(1)} %`,
        n >= 36 && n <= 120);
    check('hay aldeas y celdas vacías en la muestra', aldeas.length > 0 && celdaVacia !== null);
    check('determinismo: dos llamadas devuelven piezas idénticas (JSON igual)',
        aldeas.every(([cx, cz, a]) =>
            JSON.stringify(villageAt(SEMILLA, cx, cz, llanura)) === JSON.stringify(a)));
    check('una celda sin aldea también es estable (null ambas veces)',
        celdaVacia !== null &&
        villageAt(SEMILLA, celdaVacia[0], celdaVacia[1], llanura) === null &&
        villageAt(SEMILLA, celdaVacia[0], celdaVacia[1], llanura) === null);
}

/* ==== Trazador: requisitos del ancla ==== */
console.log('== Trazador: requisitos del ancla ==');
{
    const oceano = { biomaEn: () => 'oceano', alturaEn: () => SEA + 8 };
    const abrupto = { biomaEn: () => 'llanura', alturaEn: (x, z) => SEA + 8 + ((x + z) & 7) };
    const hundido = { biomaEn: () => 'llanura', alturaEn: () => SEA - 2 };
    check('bioma fuera de BIOMAS_ALDEA (oceano) ⇒ null en toda celda con aldea',
        aldeas.every(([cx, cz]) => villageAt(SEMILLA, cx, cz, oceano) === null));
    check('desnivel ≥ 4 en el 7×7 del ancla ⇒ null (sin reintentos)',
        aldeas.every(([cx, cz]) => villageAt(SEMILLA, cx, cz, abrupto) === null));
    check('ancla al nivel del mar o por debajo ⇒ null',
        aldeas.every(([cx, cz]) => villageAt(SEMILLA, cx, cz, hundido) === null));
}

/* ==== Trazador: piezas, solapes y rectángulo ==== */
console.log('== Trazador: piezas, solapes y rectángulo ==');
{
    let unPozo = true, pozoEnAncla = true, unicosOk = true, sinSolape = true,
        dentroRect = true, idsOk = true, caminosOk = true, dentroCelda = true;
    let parcelas = 0;
    for (const [cx, cz, a] of aldeas) {
        const edificios = a.piezas.filter((p) => p.tipo === 'edificio');
        const caminos = a.piezas.filter((p) => p.tipo === 'camino');
        // exactamente un pozo, en el ancla y como primera pieza
        const pozos = edificios.filter((p) => p.id === 'pozo');
        if (pozos.length !== 1) unPozo = false;
        else if (pozos[0] !== a.piezas[0] || pozos[0].x !== a.ancla.x ||
                 pozos[0].z !== a.ancla.z || pozos[0].y !== a.ancla.y) pozoEnAncla = false;
        // toda pieza bien formada: edificio del registro (los de parcela, del
        // pool) con rot 0..3 y y del suelo, o camino sin y (la pone worldgen)
        for (const p of a.piezas) {
            if (p.tipo === 'edificio') {
                if (!PLANOS[p.id] || (p.id !== 'pozo' && !(p.id in POOL)) ||
                    ![0, 1, 2, 3].includes(p.rot) || p.y !== SEA + 8) idsOk = false;
            } else if (p.tipo !== 'camino' || 'y' in p) idsOk = false;
        }
        // nunca dos edificios de oficio singulares repetidos
        for (const u of UNICOS) {
            if (edificios.filter((p) => p.id === u).length > 1) unicosOk = false;
        }
        // parcelas sin solape: cajas de edificios disjuntas dos a dos
        const cajas = edificios.map(cajaTest);
        for (let i = 0; i < cajas.length; i++) {
            for (let j = i + 1; j < cajas.length; j++) {
                if (chocanTest(cajas[i], cajas[j])) sinSolape = false;
            }
        }
        // rectanguloDe engloba todas las piezas y cabe en celda + 1 chunk
        const [rx0, rz0, rx1, rz1] = rectanguloDe(a);
        for (const p of a.piezas) {
            const c = cajaTest(p);
            if (c[0] < rx0 || c[1] < rz0 || c[2] > rx1 || c[3] > rz1) dentroRect = false;
        }
        const lado = CELDA_CHUNKS * 16;
        if (rx0 < cx * lado - 16 || rz0 < cz * lado - 16 ||
            rx1 > (cx + 1) * lado + 16 || rz1 > (cz + 1) * lado + 16) dentroCelda = false;
        // 2-4 caminos de 12-28 bloques ⇒ al menos 24 bloques de camino
        if (caminos.length < 24) caminosOk = false;
        parcelas += edificios.length - 1;
    }
    check(`exactamente un pozo por aldea (${aldeas.length} aldeas)`, unPozo);
    check('el pozo es la primera pieza y está en el ancla con su misma y', pozoEnAncla);
    check('toda pieza es edificio del registro (rot 0..3, y del suelo) o camino sin y', idsOk);
    check('nunca dos edificios de UNICOS repetidos en una misma aldea', unicosOk);
    check('parcelas sin solape (cajas de edificios disjuntas dos a dos)', sinSolape);
    check('rectanguloDe contiene todas las piezas (huellas rotadas incluidas)', dentroRect);
    check('toda aldea cabe en su celda + 1 chunk de margen', dentroCelda);
    check(`todo trazado tiene ≥ 24 bloques de camino y el conjunto suma parcelas (${parcelas})`,
        caminosOk && parcelas > 0);
}

/* ==== Integración con el generador real (worldgen + villages/build) ==== */
console.log('== Integración con el generador real ==');
{
    // La MISMA semilla fija de la suite tiene aldea en la rejilla de celdas
    // -6..6 (la primera cae en llanura y su pozo cruza un borde de chunk).
    const gen = new Generator(SEMILLA);
    // sondas del generador: altura BASE del terreno (surfaceHeight) y bioma
    // con la misma firma que usa worldgen — nunca el chunk ya poblado, para
    // que el trazado sea idéntico se consulte desde el chunk que se consulte
    const alturaEn = (x, z) => gen.surfaceHeight(x, z);
    const sondas = {
        alturaEn,
        biomaEn: (x, z) => gen.biomes.at(x, z, alturaEn(x, z), alturaEn).id,
    };
    let aldea = null;
    for (let cx = -6; cx <= 6 && !aldea; cx++) {
        for (let cz = -6; cz <= 6 && !aldea; cz++) {
            aldea = villageAt(SEMILLA, cx, cz, sondas);
        }
    }
    check('la semilla fija tiene una aldea en la rejilla de celdas -6..6', aldea !== null);
    const biomaAncla = sondas.biomaEn(aldea.ancla.x, aldea.ancla.z);
    check(`el ancla cae en un bioma de aldea (${biomaAncla})`, BIOMAS_ALDEA.includes(biomaAncla));

    // genera TODOS los chunks que cubre el rectángulo de la aldea
    const [rx0, rz0, rx1, rz1] = rectanguloDe(aldea);
    const chunks = new Map();
    let msAldea = 0, nAldea = 0;
    for (let cx = Math.floor(rx0 / 16); cx <= Math.floor(rx1 / 16); cx++) {
        for (let cz = Math.floor(rz0 / 16); cz <= Math.floor(rz1 / 16); cz++) {
            const t = Date.now();
            chunks.set(cx + ',' + cz, gen.generateChunk(cx, cz));
            msAldea += Date.now() - t;
            nAldea++;
        }
    }
    const en = (x, y, z) => { // lectura global sobre los chunks generados
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        const c = chunks.get(cx + ',' + cz);
        return c ? c[(y * 16 + (z - cz * 16)) * 16 + (x - cx * 16)] : B.AIR;
    };

    // caminos: el bloque superficial es el CAMINO del bioma del ancla y
    // sobre él hay 2 de aire (las columnas sumergidas no se materializan)
    const caminoId = resolverBloque('CAMINO', biomaAncla);
    let nCaminos = 0, caminosMal = 0;
    for (const p of aldea.piezas) {
        if (p.tipo !== 'camino') continue;
        const h = alturaEn(p.x, p.z);
        if (h + 1 <= SEA) continue; // sumergida: el agua no se toca
        nCaminos++;
        if (en(p.x, h, p.z) !== caminoId ||
            en(p.x, h + 1, p.z) !== B.AIR || en(p.x, h + 2, p.z) !== B.AIR) caminosMal++;
    }
    check(`todo camino no sumergido lleva el CAMINO del bioma del ancla y 2 de aire (${nCaminos})`,
        nCaminos > 0 && caminosMal === 0);

    // el terreno virgen nunca genera puertas ni antorchas: si aparecen, son
    // de la aldea materializada
    let puertas = 0, antorchas = 0;
    for (const c of chunks.values()) {
        for (const b of c) {
            if (b === B.DOOR_CLOSED) puertas++;
            else if (b === B.TORCH) antorchas++;
        }
    }
    check(`hay DOOR_CLOSED (${puertas}) y TORCH (${antorchas}) materializadas`,
        puertas >= 1 && antorchas >= 1);

    // edificio que cruza un borde de chunk: con lado ≤ 12 < 16, la huella
    // toca exactamente dos chunks en el eje que cruza
    let cruce = null;
    for (const p of aldea.piezas) {
        if (p.tipo !== 'edificio' || cruce) continue;
        const c = cajaTest(p);
        if (Math.floor(c[0] / 16) !== Math.floor(c[2] / 16)) cruce = { p, c, ejeX: true };
        else if (Math.floor(c[1] / 16) !== Math.floor(c[3] / 16)) cruce = { p, c, ejeX: false };
    }
    check('hay un edificio cuya huella cruza un borde de chunk', cruce !== null);

    // costura: los chunks de la huella, generados en los DOS órdenes
    // posibles con generadores frescos, son byte a byte idénticos
    const lista = [];
    for (let cx = Math.floor(cruce.c[0] / 16); cx <= Math.floor(cruce.c[2] / 16); cx++) {
        for (let cz = Math.floor(cruce.c[1] / 16); cz <= Math.floor(cruce.c[3] / 16); cz++) {
            lista.push([cx, cz]);
        }
    }
    const gAB = new Generator(SEMILLA), gBA = new Generator(SEMILLA);
    const bufAB = new Map(), bufBA = new Map();
    for (const [cx, cz] of lista) bufAB.set(cx + ',' + cz, gAB.generateChunk(cx, cz));
    for (const [cx, cz] of [...lista].reverse()) bufBA.set(cx + ',' + cz, gBA.generateChunk(cx, cz));
    check('los dos órdenes de generación producen chunks byte a byte idénticos',
        lista.every(([cx, cz]) => Buffer.from(bufAB.get(cx + ',' + cz))
            .equals(Buffer.from(bufBA.get(cx + ',' + cz)))));

    // integridad: las columnas a AMBOS lados del borde reproducen el plano
    // capa a capa ('.' = aire del corte); el mapeo local se recalcula aquí
    // con la convención de DIRECCIONES (fachada lz=0 mira a [−Z,+X,+Z,−X][rot])
    {
        const plano = PLANOS[cruce.p.id];
        const [ancho, alto, fondo] = plano.tam;
        const localTest = (rot, u, v) =>
            rot === 0 ? [u, v] :
            rot === 1 ? [v, fondo - 1 - u] :
            rot === 2 ? [ancho - 1 - u, fondo - 1 - v] : [ancho - 1 - v, u];
        const borde = cruce.ejeX
            ? Math.floor(cruce.c[2] / 16) * 16
            : Math.floor(cruce.c[3] / 16) * 16;
        const celdas = [];
        if (cruce.ejeX) {
            for (let z = cruce.c[1]; z <= cruce.c[3]; z++) celdas.push([borde - 1, z], [borde, z]);
        } else {
            for (let x = cruce.c[0]; x <= cruce.c[2]; x++) celdas.push([x, borde - 1], [x, borde]);
        }
        let integro = true;
        for (const [x, z] of celdas) {
            const [lx, lz] = localTest(cruce.p.rot, x - cruce.c[0], z - cruce.c[1]);
            for (let dy = 0; dy < alto; dy++) {
                const y = cruce.p.y + dy;
                if (y >= SY) break;
                const ch = plano.capas[dy][lz][lx];
                const esperado = ch === '.' ? B.AIR :
                    plano.clave[ch] === 'CULTIVO' ? bloqueCultivo(SEMILLA, x, z) :
                    resolverBloque(plano.clave[ch], biomaAncla);
                const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
                const real = bufAB.get(cx + ',' + cz)[(y * 16 + (z - cz * 16)) * 16 + (x - cx * 16)];
                if (real !== esperado) integro = false;
            }
        }
        check(`el edificio que cruza el borde queda íntegro (${cruce.p.id}, rot ${cruce.p.rot})`, integro);
    }

    // celda con el vecindario 3×3 libre de aldeas: aplicarAldeas no escribe
    // nada, luego el chunk es byte a byte el del generador previo (el único
    // cambio de generateChunk fue añadir este paso)
    let libre = null;
    for (let cx = -5; cx <= 5 && !libre; cx++) {
        for (let cz = -5; cz <= 5 && !libre; cz++) {
            let vacio = true;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (villageAt(SEMILLA, cx + dx, cz + dz, sondas)) vacio = false;
                }
            }
            if (vacio) libre = [cx, cz];
        }
    }
    check('hay una celda con el vecindario 3×3 libre de aldeas', libre !== null);
    const ccx = libre[0] * CELDA_CHUNKS + 4, ccz = libre[1] * CELDA_CHUNKS + 4;
    const t0 = Date.now();
    const chunkSin = gen.generateChunk(ccx, ccz);
    const msSin = Date.now() - t0;
    const copia = Uint8Array.from(chunkSin);
    aplicarAldeas(gen, copia, ccx, ccz, alturaEn);
    check('sin aldea, el materializador es un no-op: el chunk no cambia respecto al generador previo',
        Buffer.from(copia).equals(Buffer.from(chunkSin)));
    console.log(`  (chunk con aldea ${(msAldea / nAldea).toFixed(1)} ms de media` +
        ` sobre ${nAldea}; sin aldea ${msSin} ms)`);
}

/* ==== Granja real: cultivos sobre tierra labrada ==== */
console.log('== Granja real: cultivos sobre tierra labrada ==');
{
    const gen = new Generator(SEMILLA);
    const alturaEn = (x, z) => gen.surfaceHeight(x, z);
    const sondas = {
        alturaEn,
        biomaEn: (x, z) => gen.biomes.at(x, z, alturaEn(x, z), alturaEn).id,
    };
    // primera aldea de la rejilla de celdas -8..8 con granja entre sus piezas
    let granja = null;
    for (let cx = -8; cx <= 8 && !granja; cx++) {
        for (let cz = -8; cz <= 8 && !granja; cz++) {
            const a = villageAt(SEMILLA, cx, cz, sondas);
            if (a) granja = a.piezas.find((p) => p.tipo === 'edificio' && p.id === 'granja') || null;
        }
    }
    check('hay una granja de aldea en la rejilla de celdas -8..8', granja !== null);

    // chunks de la huella generados en los DOS órdenes con generadores
    // frescos (mismo patrón que la costura): el reparto es determinista
    const caja = cajaTest(granja);
    const lista = [];
    for (let cx = Math.floor(caja[0] / 16); cx <= Math.floor(caja[2] / 16); cx++) {
        for (let cz = Math.floor(caja[1] / 16); cz <= Math.floor(caja[3] / 16); cz++) {
            lista.push([cx, cz]);
        }
    }
    const gAB = new Generator(SEMILLA), gBA = new Generator(SEMILLA);
    const bufAB = new Map(), bufBA = new Map();
    for (const [cx, cz] of lista) bufAB.set(cx + ',' + cz, gAB.generateChunk(cx, cz));
    for (const [cx, cz] of [...lista].reverse()) bufBA.set(cx + ',' + cz, gBA.generateChunk(cx, cz));
    check('dos generaciones de la granja son byte a byte idénticas (reparto determinista)',
        lista.every(([cx, cz]) => Buffer.from(bufAB.get(cx + ',' + cz))
            .equals(Buffer.from(bufBA.get(cx + ',' + cz)))));

    const en = (x, y, z) => { // lectura global sobre los chunks generados
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        const c = bufAB.get(cx + ',' + cz);
        return c ? c[(y * 16 + (z - cz * 16)) * 16 + (x - cx * 16)] : B.AIR;
    };

    // recorre la huella con la convención de DIRECCIONES y compara el
    // estampado real con el plano: FARMLAND bajo cada CULTIVO, canal de
    // agua entero y ni una TALL_GRASS en los bancales
    const plano = PLANOS.granja;
    const [ancho, , fondo] = plano.tam;
    const localTest = (rot, u, v) =>
        rot === 0 ? [u, v] :
        rot === 1 ? [v, fondo - 1 - u] :
        rot === 2 ? [ancho - 1 - u, fondo - 1 - v] : [ancho - 1 - v, u];
    let farmland = 0, agua = 0, cultivos = 0, mal = 0, hierba = 0;
    const familias = [0, 0, 0], etapas = [0, 0, 0, 0];
    for (let x = caja[0]; x <= caja[2]; x++) {
        for (let z = caja[1]; z <= caja[3]; z++) {
            const [lx, lz] = localTest(granja.rot, x - caja[0], z - caja[1]);
            const ch0 = plano.capas[0][lz][lx];
            if (ch0 === 'D' && en(x, granja.y, z) === B.FARMLAND) farmland++;
            if (ch0 === 'W' && en(x, granja.y, z) === B.WATER) agua++;
            if (plano.capas[1][lz][lx] !== 'G') continue;
            const id = en(x, granja.y + 1, z);
            if (id === B.TALL_GRASS) hierba++;
            if (id >= B.TRIGO_0 && id <= B.PATATA_3 &&
                id === bloqueCultivo(SEMILLA, x, z) &&
                en(x, granja.y, z) === B.FARMLAND) {
                cultivos++;
                familias[((id - B.TRIGO_0) / 4) | 0]++;
                etapas[(id - B.TRIGO_0) % 4]++;
            } else mal++;
        }
    }
    check('los 30 bancales son FARMLAND y el canal de 5 aguas está entero',
        farmland === 30 && agua === 5);
    check('30 cultivos reales estampados, cada uno = bloqueCultivo y SOBRE su FARMLAND',
        cultivos === 30 && mal === 0);
    check('ninguna TALL_GRASS en los bancales (adiós a la aproximación)', hierba === 0);
    check(`las tres familias aparecen en la granja ` +
        `(trigo ${familias[0]}, zanahoria ${familias[1]}, patata ${familias[2]})`,
        familias.every((f) => f > 0) && familias[0] + familias[1] + familias[2] === 30);
    check(`hay variedad de etapas con mayoría crecida ` +
        `(0: ${etapas[0]}, 1: ${etapas[1]}, 2: ${etapas[2]}, 3: ${etapas[3]})`,
        etapas.filter((e) => e > 0).length >= 2 &&
        etapas[2] + etapas[3] >= etapas[0] + etapas[1]);

    // invariante de tickCultivos en TODOS los chunks generados: cualquier
    // bloque de cultivo (etapas 72..83) tiene FARMLAND justo debajo
    let sueltos = 0;
    for (const c of bufAB.values()) {
        for (let y = 1; y < SY; y++) {
            for (let i = 0; i < 256; i++) {
                const id = c[y * 256 + i];
                if (id >= B.TRIGO_0 && id <= B.PATATA_3 &&
                    c[(y - 1) * 256 + i] !== B.FARMLAND) sueltos++;
            }
        }
    }
    check('todo cultivo materializado está sobre FARMLAND (crecerá con tickCultivos)',
        sueltos === 0);
}

console.log(`\nResultado: ${ok} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

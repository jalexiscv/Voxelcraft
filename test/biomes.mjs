/**
 * Suite del sistema de biomas — `node test/biomes.mjs`.
 * Prueba en Node los módulos puros: determinismo del BiomeMap, cobertura de
 * la selección (toda columna tiene bioma), constantes sincronizadas con el
 * generador, el contrato de TODO el catálogo generado del pack
 * (assets/biomes/ → js/biomes/biomes.data.js) y que la colocación por
 * zonas/transformaciones alcanza lo que promete.
 */
import { BiomeMap, BIOMES, SEA_LEVEL, MOUNTAIN_H } from '../js/biomes/map.js';
import { BIOMAS } from '../js/biomes/biomes.data.js';
import { MOBS } from '../js/mobs/registry.js';
import { SEA, SY, CHUNK, Generator } from '../js/worldgen.js';
import { PRNG } from '../js/noise.js';
import { B } from '../js/blocks.js';
import { validate } from './validate-biome.mjs';

let ok = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { ok++; console.log(`  OK  ${name}`); }
    else { fail++; console.log(`  FALLA ${name}`); }
};

/* ==== Determinismo del mapa ==== */
console.log('== Determinismo del mapa ==');
{
    const a = new BiomeMap(12345);
    const b = new BiomeMap(12345);
    const c = new BiomeMap(99991);
    let mismoBioma = true, mismoClima = true, climaDistinto = false, enRango = true;
    for (let x = -400; x <= 400; x += 50) {
        for (let z = -400; z <= 400; z += 50) {
            if (a.at(x, z, 140) !== b.at(x, z, 140)) mismoBioma = false;
            const ca = a.climate(x, z), cb = b.climate(x, z), cc = c.climate(x, z);
            if (ca.temp !== cb.temp || ca.humid !== cb.humid || ca.weird !== cb.weird) mismoClima = false;
            if (ca.temp !== cc.temp || ca.humid !== cc.humid || ca.weird !== cc.weird) climaDistinto = true;
            for (const v of [ca.temp, ca.humid, ca.weird]) {
                if (!(v >= -1 && v <= 1)) enRango = false;
            }
        }
    }
    check('misma semilla ⇒ mismo bioma en toda la rejilla', mismoBioma);
    check('misma semilla ⇒ mismo clima punto a punto', mismoClima);
    check('semilla distinta ⇒ clima distinto en algún punto', climaDistinto);
    check('clima siempre dentro de [-1, 1]', enRango);
}

/* ==== Cobertura de la selección ==== */
console.log('== Cobertura de la selección ==');
{
    const mapa = new BiomeMap(2026);
    // alturas de las cuatro clases: océano, playa, tierra y montaña
    const alturas = [SEA_LEVEL - 30, SEA_LEVEL - 12, SEA_LEVEL - 1, SEA_LEVEL,
        SEA_LEVEL + 1, SEA_LEVEL + 6, MOUNTAIN_H, MOUNTAIN_H + 8];
    let cubiertas = true, clasesCoherentes = true;
    for (let x = -600; x <= 600; x += 40) {
        for (let z = -600; z <= 600; z += 40) {
            for (const h of alturas) {
                const def = mapa.at(x, z, h);
                if (!def || !def.id) { cubiertas = false; continue; }
                if (h + 1 <= SEA_LEVEL && def.terrain !== 'oceano') clasesCoherentes = false;
                // a cota de tierra caben 'tierra' y 'montana': el pack mete
                // ice_mountains como colinas DE la tundra (hills_transformation)
                if (h > SEA_LEVEL + 1 && h < MOUNTAIN_H &&
                    def.terrain !== 'tierra' && def.terrain !== 'montana') clasesCoherentes = false;
            }
        }
    }
    check('at() devuelve definición para toda columna y altura', cubiertas);
    check('la clase del def casa con la altura (océano/tierra)', clasesCoherentes);
}

/* ==== Constantes sincronizadas con el generador ==== */
console.log('== Constantes sincronizadas ==');
check('SEA_LEVEL coincide con SEA de worldgen.js', SEA_LEVEL === SEA);
check('MOUNTAIN_H por encima del nivel del mar', MOUNTAIN_H > SEA_LEVEL);

/* ==== Contrato de todo el catálogo generado ==== */
console.log('== Catálogo generado del pack ==');
{
    check('el catálogo trae los 71 biomas del pack', BIOMAS.length === 71);
    check('BIOMES indexa el catálogo completo', Object.keys(BIOMES).length === BIOMAS.length);
    let contratosMal = 0;
    for (const def of BIOMAS) {
        const { errors } = validate(def, def.id);
        if (errors.length) {
            contratosMal++;
            console.log(`    · ${def.id}: ${errors[0]}`);
        }
    }
    check(`las ${BIOMAS.length} definiciones cumplen el contrato`, contratosMal === 0);
    check('los ids y nombres están en inglés (sin acentos ni ñ)',
        BIOMAS.every((d) => /^[a-z0-9_]+$/.test(d.id) && /^[A-Za-z0-9 ]+$/.test(d.name)));
}

/* ==== Colocación: zonas y variantes alcanzables ==== */
console.log('== Colocación por zonas ==');
{
    const mapa = new BiomeMap(31416);
    const vistos = new Set();
    for (let x = -4000; x <= 4000; x += 20) {
        for (let z = -4000; z <= 4000; z += 20) {
            vistos.add(mapa.at(x, z, SEA_LEVEL + 6).id);        // tierra
        }
    }
    for (let x = -3000; x <= 3000; x += 60) {
        for (let z = -3000; z <= 3000; z += 60) {
            vistos.add(mapa.at(x, z, SEA_LEVEL - 25).id);       // océano profundo
            vistos.add(mapa.at(x, z, SEA_LEVEL - 5).id);        // océano somero
            vistos.add(mapa.at(x, z, SEA_LEVEL).id);            // playa
            vistos.add(mapa.at(x, z, MOUNTAIN_H + 4).id);       // montaña
        }
    }
    // todo bioma base declarado en generate_for_climates aparece
    const bases = BIOMAS.filter((d) => d.zonas && d.terrain === 'tierra').map((d) => d.id);
    const basesFuera = bases.filter((id) => !vistos.has(id));
    check(`los ${bases.length} biomas base de tierra aparecen` +
        (basesFuera.length ? ` → faltan: ${basesFuera.join(', ')}` : ''), basesFuera.length === 0);
    for (const id of ['extreme_hills', 'ice_mountains', 'beach', 'cold_beach',
        'deep_ocean', 'warm_ocean', 'mushroom_island']) {
        check(`la clase/zona coloca ${id}`, vistos.has(id));
    }
    // las transformaciones del pack colocan variantes (colinas y mutaciones)
    check('alguna variante de colinas aparece (hills_transformation)',
        [...vistos].some((id) => BIOMES[id].tags.includes('hills')));
    check('alguna variante mutada aparece (mutate_transformation)',
        [...vistos].some((id) => BIOMES[id].tags.includes('mutated')));
    // los no colocables no se cuelan (otra dimensión y sistemas sin trazar)
    for (const id of ['hell', 'the_end', 'river', 'frozen_river', 'legacy_frozen_ocean']) {
        check(`${id} queda catalogado pero sin colocar`, !vistos.has(id));
    }
}

/* ==== Cobertura del elenco: todo mob tiene dónde aparecer ==== */
console.log('== Cobertura del elenco ==');
{
    const habitables = new Set();
    for (const def of BIOMAS) {
        for (const lista of ['day', 'night', 'water']) {
            def.mobs[lista].forEach((id) => habitables.add(id));
        }
    }
    for (const m of Object.values(MOBS)) {
        if (m.spawn && m.spawn.cave) habitables.add(m.id); // los de cueva son globales
        if (m.spawn && m.spawn.summonOnly) habitables.add(m.id); // solo por invocación (dron)
    }
    const sinHogar = Object.keys(MOBS).filter((id) => !habitables.has(id));
    check(`los ${Object.keys(MOBS).length} mobs tienen bioma, cueva o invocación donde aparecer` +
        (sinHogar.length ? ` → sin hogar: ${sinHogar.join(', ')}` : ''), sinHogar.length === 0);
    const desconocidos = [...habitables].filter((id) => !MOBS[id]);
    check('las listas de los biomas solo citan mobs existentes', desconocidos.length === 0);
}

/* ==== Integración con el generador de mundo ==== */
console.log('== Integración con el generador ==');
{
    const gen = new Generator(7);
    check('el Generator instancia su propio BiomeMap', gen.biomes instanceof BiomeMap);

    // disciplina de RNG de plantTree: consume los MISMOS rolls plante o no
    // (así la secuencia por chunk de origen no depende del bioma)
    const plano = () => SEA + 8; // altura de 'tierra' para el candidato
    const sinArbol = new PRNG(99), conArbol = new PRNG(99);
    gen.plantTree(sinArbol, new Uint16Array(CHUNK * SY * CHUNK), 0, 0, plano, 8, 8, null);
    gen.plantTree(conArbol, new Uint16Array(CHUNK * SY * CHUNK), 0, 0, plano, 8, 8,
        { kind: 'roble', log: 'LOG', leaves: 'LEAVES' });
    check('plantTree consume los mismos rolls plante o no', sinArbol.state === conArbol.state);

    // cada forma de árbol escribe su madera y sus hojas parametrizadas
    // (el abedul del pack usa los bloques MAT_ del paquete de texturas)
    const FORMAS = [
        ['roble', 'LOG', 'LEAVES'],
        ['roble', 'MAT_BIRCH_LOG', 'LEAVES'],
        ['conifera', 'SPRUCE_LOG', 'SPRUCE_LEAVES'],
        ['acacia', 'ACACIA_LOG', 'ACACIA_LEAVES'],
        ['jungla', 'JUNGLE_LOG', 'JUNGLE_LEAVES'],
        ['cerezo', 'CHERRY_LOG', 'CHERRY_LEAVES'],
    ];
    for (const [kind, log, leaves] of FORMAS) {
        const buf = new Uint16Array(CHUNK * SY * CHUNK);
        gen.plantTree(new PRNG(5), buf, 0, 0, plano, 8, 8, { kind, log, leaves });
        const cuenta = (id) => buf.reduce((s, v) => s + (v === id ? 1 : 0), 0);
        check(`la forma '${kind}' escribe ${log} y ${leaves}`,
            cuenta(B[log]) >= 3 && cuenta(B[leaves]) >= 5);
    }

    // la flora de los biomas brota en el mundo generado (elección por pesos):
    // se generan chunks cuyo centro cae en un bioma con flores Y hierba alta
    // (llanuras) — la rejilla fija alrededor del origen puede caer en
    // regiones sin plantas o solo con setas (tundras, pantanos, bosques)
    let hierbaAlta = 0, flores = 0, generados = 0;
    busqueda:
    for (let cx = -40; cx <= 40; cx++) {
        for (let cz = -40; cz <= 40; cz++) {
            const x = cx * CHUNK + 8, z = cz * CHUNK + 8;
            const bioma = gen.biomes.at(x, z, gen.surfaceHeight(x, z));
            if (bioma.terrain !== 'tierra' ||
                !bioma.flora.some((f) => f.block.startsWith('FLOWER')) ||
                !bioma.flora.some((f) => f.block === 'TALL_GRASS')) continue;
            for (const v of gen.generateChunk(cx, cz)) {
                if (v === B.TALL_GRASS) hierbaAlta++;
                else if (v === B.FLOWER_YELLOW || v === B.FLOWER_RED) flores++;
            }
            if (++generados >= 24) break busqueda;
        }
    }
    check(`la flora del bioma brota (hierba alta y flores en ${generados} chunks de llanura)`,
        hierbaAlta > 0 && flores > 0);
}

console.log(`\nResultado: ${ok} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

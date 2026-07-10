/**
 * Suite del sistema de biomas — `node test/biomes.mjs`.
 * Prueba en Node los módulos puros: determinismo del BiomeMap, cobertura de
 * la selección (toda columna tiene bioma), constantes sincronizadas con el
 * generador, el contrato de TODAS las definiciones del registro y la
 * ausencia de solapes entre ventanas climáticas.
 */
import { BiomeMap, SEA_LEVEL, MOUNTAIN_H } from '../js/biomes/map.js';
import { BIOMES, ORDER } from '../js/biomes/registry.js';
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
            if (a.at(x, z, 40) !== b.at(x, z, 40)) mismoBioma = false;
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
    // la selección puede coincidir entre semillas en puntos sueltos: lo que
    // debe diferir entre semillas es el clima subyacente
    check('semilla distinta ⇒ clima distinto en algún punto', climaDistinto);
    check('clima siempre dentro de [-1, 1]', enRango);
}

/* ==== Cobertura de la selección ==== */
console.log('== Cobertura de la selección ==');
{
    const mapa = new BiomeMap(2026);
    // alturas de las cuatro clases: océano, playa, tierra y montaña
    const alturas = [SEA_LEVEL - 12, SEA_LEVEL - 1, SEA_LEVEL, SEA_LEVEL + 1,
        SEA_LEVEL + 6, SEA_LEVEL + 12, MOUNTAIN_H, MOUNTAIN_H + 8];
    let cubiertas = true, tierraCoherente = true;
    for (let x = -600; x <= 600; x += 40) {
        for (let z = -600; z <= 600; z += 40) {
            for (const h of alturas) {
                const def = mapa.at(x, z, h);
                if (!def || !def.id) cubiertas = false;
                else if (h > SEA_LEVEL + 1 && h < MOUNTAIN_H && def.terrain !== 'tierra') {
                    tierraCoherente = false;
                }
            }
        }
    }
    check('at() devuelve definición para toda columna y altura', cubiertas);
    check("en alturas de tierra el def es de terrain 'tierra'", tierraCoherente);
}

/* ==== Constantes sincronizadas con el generador ==== */
console.log('== Constantes sincronizadas ==');
check('SEA_LEVEL coincide con SEA de worldgen.js', SEA_LEVEL === SEA);
check('MOUNTAIN_H por encima del nivel del mar', MOUNTAIN_H > SEA_LEVEL);

/* ==== Contrato de las definiciones del registro ==== */
console.log('== Definiciones del registro ==');
{
    const defs = Object.values(BIOMES);
    check('BIOMES y ORDER contienen las mismas definiciones',
        ORDER.length === defs.length && ORDER.every((d) => BIOMES[d.id] === d));
    const comodines = ORDER.filter((d) => d.terrain === 'tierra' && !d.clima && !d.rare);
    check('exactamente un comodín de tierra sin clima', comodines.length === 1);
    for (const [id, def] of Object.entries(BIOMES)) {
        const { errors } = validate(def, id);
        check(`contrato válido: ${id}${errors.length ? ` → ${errors[0]}` : ''}`, errors.length === 0);
    }
}

/* ==== Ventanas climáticas: toda ventana es alcanzable ==== */
console.log('== Ventanas climáticas ==');
{
    // Los solapes son legales: ORDER resuelve (el primero gana; el pantano
    // roba a propósito la franja húmeda del bosque). Lo que no puede
    // ocurrir es que una ventana quede TOTALMENTE a la sombra de anteriores.
    const conClima = ORDER.filter((d) => d.terrain === 'tierra' && d.clima && !d.rare);
    const gana = new Set();
    for (let t = -1; t <= 1.0001; t += 0.05) {
        for (let h = -1; h <= 1.0001; h += 0.05) {
            const win = conClima.find((d) =>
                t >= d.clima.temp[0] && t < d.clima.temp[1] &&
                h >= d.clima.humid[0] && h < d.clima.humid[1]);
            if (win) gana.add(win.id);
        }
    }
    for (const d of conClima) {
        check(`la ventana climática de ${d.id} es alcanzable`, gana.has(d.id));
    }
}

/* ==== Cobertura del elenco: todo mob tiene dónde aparecer ==== */
console.log('== Cobertura del elenco ==');
{
    const habitables = new Set();
    for (const def of ORDER) {
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
    const plano = () => SEA + 8; // altura de 'tierra' (llanura) para el candidato
    const sinArbol = new PRNG(99), conArbol = new PRNG(99);
    gen.plantTree(sinArbol, new Uint16Array(CHUNK * SY * CHUNK), 0, 0, plano, 8, 8, null);
    gen.plantTree(conArbol, new Uint16Array(CHUNK * SY * CHUNK), 0, 0, plano, 8, 8,
        { kind: 'roble', log: 'LOG', leaves: 'LEAVES' });
    check('plantTree consume los mismos rolls plante o no', sinArbol.state === conArbol.state);

    // cada forma de árbol escribe su madera y sus hojas parametrizadas
    const FORMAS = [
        ['roble', 'LOG', 'LEAVES'],
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

    // la flora de la llanura brota en el mundo generado (elección por pesos)
    let hierbaAlta = 0, flores = 0;
    for (let cx = -2; cx <= 2; cx++) {
        for (let cz = -2; cz <= 2; cz++) {
            for (const v of gen.generateChunk(cx, cz)) {
                if (v === B.TALL_GRASS) hierbaAlta++;
                else if (v === B.FLOWER_YELLOW || v === B.FLOWER_RED) flores++;
            }
        }
    }
    check('la flora del bioma brota (hierba alta y flores)', hierbaAlta > 0 && flores > 0);
}

console.log(`\nResultado: ${ok} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

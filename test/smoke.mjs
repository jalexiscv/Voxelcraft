/* Pruebas de humo de VoxelCraft (mundo infinito): lógica pura ejecutable en
   Node, sin DOM ni WebGL.  Uso: node voxelcraft/test/smoke.mjs */
const base = new URL('../js/', import.meta.url).href;

const { PRNG, toSeed, hashSeed, Perlin2D, Fractal2D } = await import(base + 'noise.js');
const { B, DEFS, PLACEABLE } = await import(base + 'blocks.js');
const { ATLAS_GRID, painters } = await import(base + 'atlas.js');
const { Generator, SEA } = await import(base + 'worldgen.js');
const { World, CHUNK, rleEncode, rleDecode } = await import(base + 'world.js');
const { meshChunk } = await import(base + 'mesher.js');
const { Player, raycast } = await import(base + 'player.js');
const { mat4Perspective, mat4View, mat4Multiply, lookDir } = await import(base + 'math.js');

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log('  OK  ' + name); }
    else { fail++; console.log('  FALLA ' + name); }
}
const eq = (a, b) => Buffer.from(a).equals(Buffer.from(b));

console.log('== PRNG, hash y ruido ==');
const r1 = new PRNG(42), r2 = new PRNG(42);
check('PRNG determinista', r1.next() === r2.next() && r1.float() === r2.float());
check('toSeed estable', toSeed('hola') === toSeed('hola') && toSeed('hola') !== toSeed('adios'));
check('hashSeed estable y sensible a posición',
    hashSeed(1, 2, 3, 4) === hashSeed(1, 2, 3, 4) &&
    hashSeed(1, 2, 3, 4) !== hashSeed(1, 3, 2, 4) &&
    hashSeed(1, -5, 7, 4) === hashSeed(1, -5, 7, 4) &&
    hashSeed(1, -5, 7, 4) >= 1);
const p = new Perlin2D(new PRNG(7));
let inRange = true;
for (let i = 0; i < 500; i++) {
    const v = p.value(i * 0.37, i * 0.71);
    if (v < -1.6 || v > 1.6) inRange = false;
}
check('Perlin acotado', inRange);
const f = new Fractal2D(new PRNG(7), 8);
check('Fractal continuo', Math.abs(f.value(1.0, 1.0) - f.value(1.001, 1.0)) < 0.05);

console.log('== Registro de bloques ==');
check('63 tipos definidos', DEFS.length === 63 && DEFS.every(d => d));
check('selector sin aire/agua/lava/bedrock',
    !PLACEABLE.includes(B.AIR) && !PLACEABLE.includes(B.WATER) &&
    !PLACEABLE.includes(B.LAVA) && !PLACEABLE.includes(B.BEDROCK));

console.log('== Atlas de texturas ==');
{
    // toda tésela referenciada por un bloque tiene pintor y cabe en la rejilla
    const maxTile = ATLAS_GRID * ATLAS_GRID;
    let sinPintor = 0, fueraDeRejilla = 0;
    for (const d of DEFS) {
        for (const tile of [d.top, d.side, d.bottom]) {
            if (typeof painters[tile] !== 'function') sinPintor++;
            if (!(tile >= 0 && tile < maxTile)) fueraDeRejilla++;
        }
    }
    check('toda tésela referenciada por DEFS tiene pintor', sinPintor === 0);
    check('toda tésela cae dentro de la rejilla del atlas', fueraDeRejilla === 0);
    check('ningún pintor fuera de la rejilla',
        Object.keys(painters).every((idx) => Number(idx) >= 0 && Number(idx) < maxTile));
}

console.log('== Generación por chunks (determinismo e independencia del orden) ==');
const gen = new Generator(12345);
const t0 = Date.now();
const c00 = gen.generateChunk(0, 0);
console.log(`  (un chunk en ${Date.now() - t0} ms)`);
check('tamaño de chunk correcto', c00.length === CHUNK * 64 * CHUNK);
check('mismo chunk, dos instancias ⇒ idéntico', eq(c00, new Generator(12345).generateChunk(0, 0)));
{
    // independencia del orden: (3,3) generado en frío vs tras generar otros
    const gA = new Generator(12345);
    const direct = gA.generateChunk(3, 3);
    const gB = new Generator(12345);
    gB.generateChunk(0, 0); gB.generateChunk(-2, 5); gB.generateChunk(3, 2);
    check('independiente del orden de generación', eq(direct, gB.generateChunk(3, 3)));
}
check('semillas distintas ⇒ chunks distintos', !eq(c00, new Generator(999).generateChunk(0, 0)));
check('coordenadas negativas funcionan', new Generator(12345).generateChunk(-7, -3).length === c00.length);

console.log('== Mundo infinito: área 7×7 alrededor del origen ==');
const world = new World(12345);
for (let cx = -3; cx <= 3; cx++) {
    for (let cz = -3; cz <= 3; cz++) world.addChunk(cx, cz, gen.generateChunk(cx, cz));
}
const counts = {};
for (const [, c] of world.chunks) for (const b of c.blocks) counts[b] = (counts[b] || 0) + 1;
check('hay hierba', (counts[B.GRASS] || 0) > 100);
check('hay agua', (counts[B.WATER] || 0) > 100);
check('hay piedra', (counts[B.STONE] || 0) > 10000);
check('hay árboles (troncos y hojas)', (counts[B.LOG] || 0) > 5 && (counts[B.LEAVES] || 0) > 50);
check('hay menas', (counts[B.COAL_ORE] || 0) > 0 && (counts[B.IRON_ORE] || 0) > 0 && (counts[B.GOLD_ORE] || 0) > 0);
check('hay cuevas (aire bajo tierra)', (() => {
    let caves = 0;
    for (let x = -40; x < 40; x += 2) {
        for (let z = -40; z < 40; z += 2) {
            for (let y = 4; y < 24; y++) if (world.get(x, y, z) === B.AIR) caves++;
        }
    }
    return caves > 20;
})());
check('lecho de roca en y=0', world.get(5, 0, 5) === B.BEDROCK && world.get(-20, 0, 17) === B.BEDROCK);
check('acceso con coordenadas negativas', world.get(-1, 30, -1) === gen.generateChunk(-1, -1)[(30 * CHUNK + 15) * CHUNK + 15]);

console.log('== Coherencia del terreno (incluye bordes de chunk) ==');
{
    const solidTop = (x, z) => {
        for (let y = 63; y >= 0; y--) {
            const b = world.get(x, y, z);
            if (b !== B.AIR && b !== B.WATER && b !== B.LEAVES && b !== B.LOG && b < B.FLOWER_YELLOW) return y;
        }
        return 0;
    };
    const all = [], borders = [];
    for (let z = -44; z < 44; z += 3) {
        for (let x = -47; x < 47; x++) {
            const d = Math.abs(solidTop(x, z) - solidTop(x - 1, z));
            all.push(d);
            if ((x & 15) === 0) borders.push(d); // transición entre chunks
        }
    }
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    console.log(`  (Δh medio ${avg(all).toFixed(2)}; en bordes de chunk ${avg(borders).toFixed(2)})`);
    check('terreno suave (Δh medio < 0.6)', avg(all) < 0.6);
    check('sin costuras entre chunks (Δh en bordes ≈ interior)', avg(borders) < avg(all) * 2 + 0.2);
    check('sin picos aleatorios (saltos >4 < 1 %)', all.filter((d) => d > 4).length / all.length < 0.01);
}

console.log('== World: escritura, luz y barrera ==');
{
    const sy = world.surfaceY(4, 4);
    check('superficie razonable', sy > 5 && sy < 60);
    world.set(4, sy + 5, 4, B.STONE);
    check('set marca chunk sucio', world.dirty.size >= 1);
    check('set marca chunk como modificado', world.chunks.get('0,0').modified === true);
    check('altura de columna actualizada', !world.sunlit(4, sy + 4, 4) || sy + 5 < 0);
    check('chunk no generado: get=aire, solidAt=barrera',
        world.get(500, 30, 500) === B.AIR && world.solidAt(500, 30, 500) === true);
    check('meshable exige vecindario completo', world.meshable(0, 0) && !world.meshable(3, 3));
}

console.log('== Mallado (incluye chunk negativo) ==');
world.dirty.clear();
const mesh = meshChunk(world, 0, 0);
const meshNeg = meshChunk(world, -1, -1);
check('malla sólida no vacía', mesh.solid.length > 0 && meshNeg.solid.length > 0);
check('stride válido (múltiplo de 18 floats)', mesh.solid.length % 18 === 0 && meshNeg.solid.length % 18 === 0);
let uvOk = true, lightOk = true;
for (let i = 0; i < mesh.solid.length; i += 6) {
    const u = mesh.solid[i + 3], v = mesh.solid[i + 4], l = mesh.solid[i + 5];
    if (u < 0 || u > 1 || v < 0 || v > 1) uvOk = false;
    if (l < 0 || l > 1.01) lightOk = false;
}
check('UVs dentro del atlas', uvOk);
check('luz por vértice en [0,1]', lightOk);
check('hay malla de agua en el área', (() => {
    let n = 0;
    for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) n += meshChunk(world, cx, cz).water.length;
    return n > 0;
})());

console.log('== Raycast ==');
{
    const sx = 4, sz = 4;
    const top = world.surfaceY(sx, sz);
    const hit = raycast(world, [sx + 0.5, 60, sz + 0.5], [0, -1, 0], 64);
    check('raycast vertical golpea', hit !== null && hit.ny === 1);
    check('raycast reporta bloque sólido', hit && DEFS[hit.id].solid);
    check('raycast al cielo no golpea', raycast(world, [sx, top + 3, sz], [0, 1, 0], 5) === null);
}

console.log('== Física del jugador ==');
const player = new Player();
player.spawn(world, 48);
const [spx, spz] = [Math.floor(player.pos[0]), Math.floor(player.pos[2])];
check('spawn sobre la superficie de su columna', player.pos[1] > world.surfaceY(spx, spz));
check('spawn en tierra firme (no bajo el agua)',
    world.get(spx, world.surfaceY(spx, spz) + 1, spz) !== B.WATER &&
    world.surfaceY(spx, spz) + 1 >= SEA);
const noInput = { forward: false, back: false, left: false, right: false, jump: false, down: false, sprint: false };
for (let i = 0; i < 120; i++) player.update(1 / 60, noInput, world);
check('cae y aterriza (onGround)', player.onGround);
const yRest = player.pos[1];
for (let i = 0; i < 60; i++) player.update(1 / 60, noInput, world);
check('reposo estable sin hundirse', Math.abs(player.pos[1] - yRest) < 0.01);
player.update(1 / 60, { ...noInput, jump: true }, world);
check('salto imprime velocidad vertical', player.vel[1] > 5);
let maxY = player.pos[1];
for (let i = 0; i < 120; i++) { player.update(1 / 60, noInput, world); maxY = Math.max(maxY, player.pos[1]); }
check('altura de salto ≈ 1–1.5 bloques', maxY - yRest > 0.9 && maxY - yRest < 1.6);
{
    // barrera de chunks: caminar contra territorio no generado no atraviesa
    const border = new Player();
    border.pos = [55.5, world.surfaceY(55, 55) + 1.01, 55.5]; // borde del área 7×7 (x<64 generado)
    for (let i = 0; i < 300; i++) border.update(1 / 60, { ...noInput, forward: false, right: true }, world);
    check('barrera de chunks no generados', border.pos[0] < 64.5);
}

{
    // salir del agua nadando contra la orilla (corregido en 0.4.1): orilla al
    // ras de la superficie — tierra en z≥0 (celdas sólidas hasta y=10) y agua
    // en z<0 (celdas 6..10, superficie en y=11)
    const shore = {
        sy: 64,
        get(x, y, z) {
            if (y <= 5) return B.STONE;
            if (y <= 10) return z >= 0 ? B.STONE : B.WATER;
            return B.AIR;
        },
        solidAt(x, y, z) { const id = this.get(x, y, z); return id !== B.AIR && id !== B.WATER; },
        surfaceY(x, z) { return z >= 0 ? 10 : 5; },
    };
    const nadador = new Player();
    nadador.pos = [0.5, 7, -3.5];
    nadador.yaw = Math.PI; // su frente (−Z local) apunta hacia +Z: la orilla
    for (let i = 0; i < 300; i++) nadador.update(1 / 60, { ...noInput, forward: true, jump: true }, shore);
    // sigue botando porque mantiene el salto pulsado: basta con que esté en tierra
    check('sale del agua saltando contra la orilla', nadador.pos[1] > 10.9 && nadador.pos[2] > 0);

    // contra una pared submarina alta no hay aupamiento (no hay borde libre)
    const muro = new Player();
    muro.pos = [0.5, 7, -3.5];
    muro.yaw = Math.PI;
    const alto = {
        ...shore,
        get(x, y, z) {
            if (y <= 5) return B.STONE;
            if (z >= 0) return y <= 20 ? B.STONE : B.AIR; // muro de 15 bloques
            return y <= 10 ? B.WATER : B.AIR;
        },
    };
    for (let i = 0; i < 300; i++) muro.update(1 / 60, { ...noInput, forward: true, jump: true }, alto);
    check('una pared alta no catapulta fuera del agua', muro.pos[1] < 13);
}

console.log('== Guardado RLE por chunk ==');
const chunk00 = world.chunks.get('0,0').blocks;
const enc = rleEncode(chunk00);
check('RLE ida y vuelta', eq(rleDecode(enc, chunk00.length), chunk00));
console.log(`  (chunk 16×64×16 = ${chunk00.length} B → RLE ${enc.length} B, ${(100 * enc.length / chunk00.length).toFixed(1)} %)`);

console.log('== Matrices ==');
const proj = new Float32Array(16), view = new Float32Array(16), pv = new Float32Array(16);
mat4Perspective(proj, Math.PI / 2, 1, 0.1, 100);
mat4View(view, 0, 0, 0, 0, 0);
mat4Multiply(pv, proj, view);
const px = pv[0] * 0 + pv[4] * 0 + pv[8] * -10 + pv[12];
const pw = pv[3] * 0 + pv[7] * 0 + pv[11] * -10 + pv[15];
check('proyección: punto frontal centrado con w>0', Math.abs(px) < 1e-5 && pw > 0);
const d = lookDir(0, 0);
check('lookDir(0,0) mira a −Z', Math.abs(d[0]) < 1e-9 && Math.abs(d[2] + 1) < 1e-9);

/* ==== Inventario de supervivencia ==== */
console.log('== Inventario ==');
{
    const { Inventory } = await import(base + 'inventory.js');
    const inv = new Inventory();
    inv.add(B.DIRT, 2);
    inv.add(B.DIRT);
    check('recolectar acumula existencias', inv.count(B.DIRT) === 3);
    check('colocar consume existencias', inv.take(B.DIRT, 2) && inv.count(B.DIRT) === 1);
    check('no se consume más de lo que hay', !inv.take(B.DIRT, 5) && inv.count(B.DIRT) === 1);
    const copia = new Inventory(inv.toJSON());
    check('sobrevive al guardado (toJSON → constructor)',
        copia.count(B.DIRT) === 1 && copia.ids().length === 1);
    check('agotar un material lo vacía del selector', inv.take(B.DIRT) && inv.ids().length === 0);
    const pilas = new Inventory();
    pilas.add(B.SAND, 130);
    pilas.add(B.STONE, 3);
    check('las existencias se dividen en pilas de hasta 64 por casilla',
        JSON.stringify(pilas.stacks().map((p) => p.n)) === JSON.stringify([64, 3, 64, 2]) ||
        JSON.stringify(pilas.stacks().map((p) => `${p.id}:${p.n}`)) ===
        JSON.stringify([`${B.STONE}:3`, `${B.SAND}:64`, `${B.SAND}:64`, `${B.SAND}:2`]));
}

/* ==== Dureza, crafteo y drops ==== */
console.log('== Dureza, crafteo y drops ==');
{
    check('todo bloque rompible tiene dureza ≥ 1',
        DEFS.every((d) => !d || !d.breakable || d.hardness >= 1));
    check('la obsidiana es más dura que la roca', DEFS[B.OBSIDIAN].hardness > DEFS[B.STONE].hardness);
    check('las plantas se rompen de un golpe', DEFS[B.TALL_GRASS].hardness === 1);

    const { RECIPES, craft, craftable, ITEM_DEFS, isItem, ITEMS, matchGrid, autoColocar } = await import(base + 'items.js');
    const { Inventory } = await import(base + 'inventory.js');
    check('las recetas solo citan bloques o items existentes',
        RECIPES.every((r) => [r.out, ...r.in].every(({ id }) =>
            (isItem(id) ? ITEM_DEFS[id] : DEFS[id]) !== undefined)));

    const inv = new Inventory();
    const receta = (nombre) => RECIPES.find((r) => r.name === nombre);
    check('sin materiales no se puede fabricar', !craftable(inv, receta('Pico de madera')));
    // 2 troncos → 8 tablones; 2 para palos y 3 para el pico
    inv.add(B.LOG, 2);
    check('troncos → tablones → palos → pico (cadena completa)',
        craft(inv, receta('Tablones')) && craft(inv, receta('Tablones')) &&
        craft(inv, receta('Palos')) && craft(inv, receta('Pico de madera')) &&
        ITEM_DEFS[receta('Pico de madera').out.id].tool.tipo === 'pico');

    // crafteo por cuadrícula: recetas con FORMA (patrón, con espejo) y sin ella
    const P = B.PLANKS, S = ITEMS.PALO;
    check('la T del pico casa en la mesa 3×3',
        (matchGrid([P, P, P, 0, S, 0, 0, S, 0], 3) || {}).name === 'Pico de madera');
    check('la misma cuenta mal dispuesta NO fabrica el pico',
        (matchGrid([P, P, P, S, S, 0, 0, 0, 0], 3) || {}).name !== 'Pico de madera');
    check('el hacha admite su espejo horizontal',
        (matchGrid([P, P, 0, S, P, 0, S, 0, 0], 3) || {}).name === 'Hacha de madera');
    check('una receta sin forma casa en cualquier celda',
        (matchGrid([0, 0, B.LOG, 0], 2) || {}).name === 'Tablones');
    check('la mesa se fabrica con 2×2 de tablones',
        (matchGrid([P, P, P, P], 2) || {}).name === 'Mesa de crafteo');
    {
        const invG = new Inventory();
        invG.add(P, 3); invG.add(S, 2);
        const pico = RECIPES.find((r) => r.name === 'Pico de madera');
        check('el pico no cabe en la cuadrícula personal 2×2', autoColocar(pico, 2, invG) === null);
        const cells = autoColocar(pico, 3, invG);
        check('el recetario autocoloca la forma del pico en la mesa',
            cells !== null && (matchGrid(cells, 3) || {}).name === 'Pico de madera');
        check('sin existencias no se autocoloca', autoColocar(pico, 3, new Inventory()) === null);
    }

    const { DropSystem } = await import(base + 'drops.js');
    const suelo = { solidAt: (x, y) => y < 10 };
    const lejos = [40, 10, 40];
    const drops = new DropSystem();
    drops.spawn(B.DIRT, 0, 20, 0, () => 0.5);
    for (let i = 0; i < 200; i++) drops.update(1 / 30, lejos, suelo, () => {});
    check('el drop cae y reposa sobre el suelo',
        drops.list.length === 1 && drops.list[0].pos[1] > 9 && drops.list[0].pos[1] < 11.5);
    let recogido = null;
    for (let i = 0; i < 90; i++) drops.update(1 / 30, [0.5, 9.6, 0.5], suelo, (id) => { recogido = id; });
    check('al acercarse, el drop vuela a la mano y se recoge', recogido === B.DIRT);
    const efimero = new DropSystem();
    efimero.spawn(B.SAND, 0, 20, 0, () => 0.5);
    for (let i = 0; i < 70; i++) efimero.update(1, lejos, suelo, () => {});
    check('un drop no recogido se desvanece', efimero.list.length === 0);
}

console.log(`\nResultado: ${pass} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

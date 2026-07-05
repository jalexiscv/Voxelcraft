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
check('86 tipos definidos', DEFS.length === 86 && DEFS.every(d => d));
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
    // luz codificada: parte entera = luz de bloque 0..15, fracción = sol ≤0.96
    const bloque = Math.floor(l), sol = l - bloque;
    if (bloque < 0 || bloque > 15 || sol <= 0 || sol > 0.9601) lightOk = false;
}
check('UVs dentro del atlas', uvOk);
check('luz por vértice decodificable (sol ≤0.96 + bloque 0..15)', lightOk);
check('hay malla de agua en el área', (() => {
    let n = 0;
    for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) n += meshChunk(world, cx, cz).water.length;
    return n > 0;
})());

/* Chunk de laboratorio: suelo de piedra (y<8) y aire encima. */
const flatChunk = () => {
    const b = new Uint8Array(CHUNK * 64 * CHUNK);
    b.fill(B.STONE, 0, 8 * CHUNK * CHUNK);
    return b;
};

console.log('== Luz de bloques ==');
{
    const wl = new World(1);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) wl.addChunk(cx, cz, flatChunk());
    }
    check('sin fuentes, todo a oscuras', wl.blockLightAt(8, 10, 8) === 0);

    wl.set(8, 10, 8, B.TORCH);
    check('la antorcha emite nivel 14 en su celda', wl.blockLightAt(8, 10, 8) === 14);
    check('la luz decae 1 por bloque con la distancia',
        wl.blockLightAt(9, 10, 8) === 13 && wl.blockLightAt(10, 10, 8) === 12 &&
        wl.blockLightAt(8, 10, 11) === 11 && wl.blockLightAt(8, 13, 8) === 11);
    check('fuera de chunks la luz es 0', wl.blockLightAt(500, 10, 500) === 0);

    wl.set(9, 10, 8, B.STONE); // muro pegado a la antorcha
    check('un bloque opaco corta la luz (solo llega rodeándolo)',
        wl.blockLightAt(9, 10, 8) === 0 && wl.blockLightAt(10, 10, 8) === 10);
    wl.set(9, 10, 8, B.AIR);
    check('retirar el muro restaura la propagación', wl.blockLightAt(10, 10, 8) === 12);

    // una fuente a <15 del borde cruza al chunk vecino y lo marca para remallar
    wl.dirty.clear();
    wl.set(0, 10, 0, B.TORCH);
    check('la luz cruza los bordes de chunk',
        wl.blockLightAt(-1, 10, 0) === 13 && wl.blockLightAt(0, 10, -3) === 11);
    check('los vecinos alcanzados quedan sucios (remallado)',
        wl.dirty.has('-1,0') && wl.dirty.has('0,-1') && wl.dirty.has('-1,-1'));
    wl.set(0, 10, 0, B.AIR);
    check('quitar la antorcha apaga su luz', wl.blockLightAt(-1, 10, 0) === 0 && wl.blockLightAt(0, 10, 0) === 0);

    wl.set(4, 10, 20, B.LAVA); // en el chunk (0,1)
    check('la lava emite nivel 15', wl.blockLightAt(4, 10, 20) === 15 && wl.blockLightAt(4, 10, 21) === 14);

    // el mallado codifica sol y bloque en un solo float: fract/floor los separan
    const m = meshChunk(wl, 0, 0); // conserva la antorcha de (8,10,8)
    let decodOk = true, conBloque = false;
    for (let i = 0; i < m.solid.length; i += 6) {
        const l = m.solid[i + 5], bloque = Math.floor(l), sol = l - bloque;
        if (bloque < 0 || bloque > 15 || sol <= 0 || sol > 0.9601) decodOk = false;
        if (bloque >= 1) conBloque = true;
    }
    check('attrs de malla decodificables con fract/floor', decodOk);
    check('la malla junto a la antorcha lleva luz de bloque ≥1', conBloque);
}

console.log('== Paneles finos ==');
{
    check('puerta y ventana llevan el flag panel (colisión intacta)',
        DEFS[B.DOOR_CLOSED].panel === true && DEFS[B.DOOR_OPEN].panel === 'x' &&
        DEFS[B.WINDOW].panel === true &&
        DEFS[B.DOOR_CLOSED].solid && DEFS[B.WINDOW].solid && !DEFS[B.DOOR_OPEN].solid);

    const wp = new World(2);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) wp.addChunk(cx, cz, flatChunk());
    }
    wp.set(2, 10, 2, B.WINDOW);
    const mp = meshChunk(wp, 0, 0);
    // todos los vértices de la celda del panel viven en los planos z=0.40/0.60
    let finas = 0, gordas = 0;
    for (let i = 0; i < mp.solid.length; i += 6) {
        const x = mp.solid[i], y = mp.solid[i + 1], z = mp.solid[i + 2];
        if (y < 10 || y > 11 || x < 2 || x > 3) continue; // solo la celda de la ventana
        if (Math.abs(z - 2.4) < 1e-3 || Math.abs(z - 2.6) < 1e-3) finas++;
        else gordas++;
    }
    check('la ventana se malla como caja fina (6 caras en z 0.40/0.60)',
        finas === 36 && gordas === 0);
}

/* ==== Puertas de dos bloques y valla 3D ==== */
console.log('== Puertas y vallas ==');
{
    const { TILE, TILE_PX } = await import(base + 'atlas.js');
    const { esPuerta, esHojaSuperior, esAbierta, parDe, alternada,
            colocarPuerta, alternarPuerta, romperPuerta } = await import(base + 'doors.js');

    // ids y flags de las cuatro hojas: cerradas = panel en z, abiertas = la
    // MISMA hoja girada (panel en x); solo la inferior cerrada va al selector
    check('hojas superiores con ids fijos 84/85 (registro completo: 86)',
        B.DOOR_TOP_CLOSED === 84 && B.DOOR_TOP_OPEN === 85 && DEFS.length === 86);
    check('flags de panel: cerradas en z (true), abiertas giradas en x',
        DEFS[B.DOOR_CLOSED].panel === true && DEFS[B.DOOR_TOP_CLOSED].panel === true &&
        DEFS[B.DOOR_OPEN].panel === 'x' && DEFS[B.DOOR_TOP_OPEN].panel === 'x');
    check('solo la hoja inferior cerrada es colocable y ninguna hoja es opaca',
        DEFS[B.DOOR_CLOSED].placeable && !DEFS[B.DOOR_OPEN].placeable &&
        !DEFS[B.DOOR_TOP_CLOSED].placeable && !DEFS[B.DOOR_TOP_OPEN].placeable &&
        [B.DOOR_CLOSED, B.DOOR_OPEN, B.DOOR_TOP_CLOSED, B.DOOR_TOP_OPEN]
            .every((id) => !DEFS[id].opaque));
    check('las hojas cerradas colisionan y las abiertas se atraviesan',
        DEFS[B.DOOR_CLOSED].solid && DEFS[B.DOOR_TOP_CLOSED].solid &&
        !DEFS[B.DOOR_OPEN].solid && !DEFS[B.DOOR_TOP_OPEN].solid);
    check('téselas de puerta (hoja, vidriera, canto) y valla pintables',
        [TILE.DOOR_T, TILE.DOOR_OPEN_T, TILE.DOOR_TOP_T, TILE.FENCE_T]
            .every((tl) => tl >= 0 && tl < ATLAS_GRID * ATLAS_GRID &&
                typeof painters[tl] === 'function'));
    check('las cuatro hojas comparten el canto de listones (edge)',
        [B.DOOR_CLOSED, B.DOOR_OPEN, B.DOOR_TOP_CLOSED, B.DOOR_TOP_OPEN]
            .every((id) => DEFS[id].edge === TILE.DOOR_OPEN_T));

    // clasificadores puros del par (doors.js)
    check('esPuerta/esHojaSuperior/esAbierta clasifican las cuatro hojas',
        [B.DOOR_CLOSED, B.DOOR_OPEN, B.DOOR_TOP_CLOSED, B.DOOR_TOP_OPEN].every(esPuerta) &&
        !esPuerta(B.PLANKS) && !esPuerta(B.FENCE) &&
        esHojaSuperior(B.DOOR_TOP_CLOSED) && esHojaSuperior(B.DOOR_TOP_OPEN) &&
        !esHojaSuperior(B.DOOR_CLOSED) && !esHojaSuperior(B.DOOR_OPEN) &&
        esAbierta(B.DOOR_OPEN) && esAbierta(B.DOOR_TOP_OPEN) &&
        !esAbierta(B.DOOR_CLOSED) && !esAbierta(B.DOOR_TOP_CLOSED));
    check('parDe y alternada emparejan hojas y respetan lo que no es puerta',
        parDe(B.DOOR_CLOSED) === B.DOOR_TOP_CLOSED && parDe(B.DOOR_TOP_OPEN) === B.DOOR_OPEN &&
        alternada(B.DOOR_CLOSED) === B.DOOR_OPEN &&
        alternada(alternada(B.DOOR_TOP_CLOSED)) === B.DOOR_TOP_CLOSED &&
        parDe(B.STONE) === B.STONE && alternada(B.STONE) === B.STONE);

    // mecánica del par sobre un World headless (suelo de piedra en y<8)
    const wd = new World(7);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) wd.addChunk(cx, cz, flatChunk());
    }
    check('colocar escribe las DOS hojas sobre suelo sólido',
        colocarPuerta(wd, 5, 8, 5) === true &&
        wd.get(5, 8, 5) === B.DOOR_CLOSED && wd.get(5, 9, 5) === B.DOOR_TOP_CLOSED);
    check('no se coloca sin vano libre de 2, sin suelo o contra el techo',
        colocarPuerta(wd, 5, 8, 5) === false &&   // vano ocupado por la propia puerta
        colocarPuerta(wd, 5, 9, 5) === false &&   // la hoja superior estorba
        colocarPuerta(wd, 9, 20, 9) === false &&  // sin suelo sólido debajo
        colocarPuerta(wd, 9, 63, 9) === false);   // el techo no admite la hoja superior
    check('alternar desde la hoja SUPERIOR abre el par entero',
        alternarPuerta(wd, 5, 9, 5) === B.DOOR_OPEN &&
        wd.get(5, 8, 5) === B.DOOR_OPEN && wd.get(5, 9, 5) === B.DOOR_TOP_OPEN);
    check('alternar desde la hoja inferior vuelve a cerrar el par',
        alternarPuerta(wd, 5, 8, 5) === B.DOOR_CLOSED &&
        wd.get(5, 8, 5) === B.DOOR_CLOSED && wd.get(5, 9, 5) === B.DOOR_TOP_CLOSED);
    check('alternar donde no hay puerta devuelve null', alternarPuerta(wd, 2, 8, 2) === null);
    check('romper desde cualquiera de las hojas limpia el par y da la base',
        (() => {
            const basePos = romperPuerta(wd, 5, 9, 5); // desde la hoja superior
            return basePos !== null && basePos.y === 8 &&
                wd.get(5, 8, 5) === B.AIR && wd.get(5, 9, 5) === B.AIR &&
                romperPuerta(wd, 5, 8, 5) === null; // ya no queda puerta
        })());

    // mallado: la hoja abierta GIRA (panel en x) frente a la cerrada (panel en z)
    const wm = new World(8);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) wm.addChunk(cx, cz, flatChunk());
    }
    wm.set(2, 10, 2, B.DOOR_CLOSED);              // panel clásico en z
    wm.set(7, 10, 7, B.DOOR_OPEN);                // hoja girada: panel en x
    wm.set(2, 10, 7, B.DOOR_CLOSED);              // cerrada con jambas en ±z…
    wm.set(2, 10, 6, B.STONE);                    // …muro a lo largo de z:
    wm.set(2, 10, 8, B.STONE);                    // …la hoja gira al eje x
    wm.set(12, 10, 4, B.DOOR_OPEN);               // abierta con jamba en x+…
    wm.set(13, 10, 4, B.STONE);                   // …bisagra pegada a x+
    wm.set(12, 10, 2, B.FENCE);                   // valla sola (sin vecinos)
    wm.set(4, 10, 12, B.FENCE);                   // pareja de vallas conectadas…
    wm.set(5, 10, 12, B.FENCE);                   // …travesaños entre ambas
    wm.set(9, 10, 12, B.FENCE);                   // valla contra muro sólido…
    wm.set(10, 10, 12, B.STONE);                  // …conecta con él
    wm.set(12, 10, 7, B.FENCE);                   // valla junto a una planta…
    wm.set(13, 10, 7, B.TALL_GRASS);              // …que NO conecta
    const mm = meshChunk(wm, 0, 0);
    const vertsCelda = (m, cx0, cy0, cz0) => {
        const v = [];
        for (let i = 0; i < m.solid.length; i += 6) {
            const x = m.solid[i], y = m.solid[i + 1], z = m.solid[i + 2];
            if (x >= cx0 && x <= cx0 + 1 && y >= cy0 && y <= cy0 + 1 &&
                z >= cz0 && z <= cz0 + 1) v.push([x, y, z]);
        }
        return v;
    };
    const eps = 1e-6;
    const vCerrada = vertsCelda(mm, 2, 10, 2), vAbierta = vertsCelda(mm, 7, 10, 7);
    check('la hoja cerrada se malla como panel fino en z (hoja a lo ancho de x)',
        vCerrada.length > 0 &&
        vCerrada.every(([, , z]) => z >= 2.4 - eps && z <= 2.6 + eps) &&
        vCerrada.some(([x]) => x < 2.05) && vCerrada.some(([x]) => x > 2.95));
    check('la hoja abierta GIRA y se pega a su bisagra (x− sin jambas)',
        vAbierta.length > 0 &&
        vAbierta.every(([x]) => x >= 7.04 - eps && x <= 7.24 + eps) &&
        vAbierta.some(([, , z]) => z < 7.05) && vAbierta.some(([, , z]) => z > 7.95));

    // orientación por jambas: el muro que enmarca la puerta manda. Las caras
    // de las jambas caen en los planos frontera de la celda con x entera:
    // filtrando por x fraccionaria quedan solo los vértices de la hoja
    const vMuroZ = vertsCelda(mm, 2, 10, 7).filter(([x]) => x % 1 !== 0);
    check('cerrada entre jambas ±z: la hoja gira al plano del muro (grosor en x)',
        vMuroZ.length > 0 &&
        vMuroZ.every(([x]) => x >= 2.4 - eps && x <= 2.6 + eps) &&
        vMuroZ.some(([, , z]) => z < 7.05) && vMuroZ.some(([, , z]) => z > 7.95));
    const vBisagra = vertsCelda(mm, 12, 10, 4).filter(([x]) => x % 1 !== 0);
    check('abierta con jamba en x+: la hoja se pega a esa bisagra',
        vBisagra.length > 0 &&
        vBisagra.every(([x]) => x >= 12.76 - eps && x <= 12.96 + eps));

    // el raycast golpea la hoja abierta (panel no sólido): sin esto la
    // puerta abierta sería intocable y no podría volver a cerrarse
    const rayo = raycast(wm, [7.5, 10.5, 5.5], [0, 0, 1], 4);
    check('el raycast golpea la hoja abierta y la puerta puede cerrarse',
        !!rayo && rayo.id === B.DOOR_OPEN && rayo.x === 7 && rayo.z === 7);

    // valla 3D: poste siempre; travesaños SOLO hacia vecinos conectables
    const vSola = vertsCelda(mm, 12, 10, 2);
    check('la valla sola emite solo el poste central (sin travesaños)',
        vSola.length > 0 && vSola.every(([x, , z]) =>
            x >= 12.375 - eps && x <= 12.625 + eps &&
            z >= 2.375 - eps && z <= 2.625 + eps));
    const vPareja = vertsCelda(mm, 4, 10, 12);
    check('con una valla vecina brotan travesaños hasta el borde (más quads que sola)',
        vPareja.length > vSola.length && vPareja.some(([x]) => x > 4.95));
    check('los travesaños solo van hacia el lado conectado',
        vPareja.every(([x]) => x >= 4.375 - eps) &&
        vPareja.every(([, , z]) => z >= 12.375 - eps && z <= 12.625 + eps));
    const vMuro = vertsCelda(mm, 9, 10, 12);
    check('la valla también conecta con un bloque sólido opaco',
        vMuro.some(([x, , z]) => x > 9.99 && z > 12.4 - eps && z < 12.6 + eps));
    // el quad diagonal de la planta vecina toca el plano x=13: se descarta ese
    // plano y se exige la firma exacta del poste (esquinas solo en y=10/11)
    const vPlanta = vertsCelda(mm, 12, 10, 7).filter(([x]) => x < 12.99);
    check('una planta vecina NO conecta (queda el poste solo)',
        vPlanta.length === vSola.length && vPlanta.every(([x, y, z]) =>
            x >= 12.375 - eps && x <= 12.625 + eps &&
            z >= 7.375 - eps && z <= 7.625 + eps &&
            (Math.abs(y - 10) < eps || Math.abs(y - 11) < eps)));

    // arte: pintores headless sobre un lienzo mínimo compatible con Tile
    const lienzo = (semilla) => ({
        rng: new PRNG(semilla),
        data: new Uint8ClampedArray(TILE_PX * TILE_PX * 4),
        px(x, y, r, g, b, a = 255) {
            if (x < 0 || y < 0 || x >= TILE_PX || y >= TILE_PX) return;
            const i = (y * TILE_PX + x) * 4;
            this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
        },
    });
    const alfas = (tile) => {
        const t = lienzo(1000 + tile); // misma convención de semilla que buildAtlas
        painters[tile](t);
        const a = [];
        for (let i = 3; i < t.data.length; i += 4) a.push(t.data[i]);
        return a;
    };
    const aTop = alfas(TILE.DOOR_TOP_T), aBajo = alfas(TILE.DOOR_T);
    check('la vidriera superior tiene cuarterones translúcidos (alfa parcial)',
        aTop.filter((a) => a > 0 && a < 255).length >= 20);
    check('la hoja inferior es opaca en toda su carpintería (sin agujeros)',
        aBajo.length === TILE_PX * TILE_PX && aBajo.every((a) => a === 255));
    check('el marco de la vidriera sigue opaco (solo el vidrio es translúcido)',
        aTop.filter((a) => a === 255).length > TILE_PX * TILE_PX / 2);
}

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

    // horno: fundiciones, combustibles y la receta en anillo
    const { FUNDICIONES, COMBUSTIBLES, fundir } = await import(base + 'items.js');
    check('toda fundición produce un bloque o item existente',
        FUNDICIONES.every((f) => (isItem(f.out) ? ITEM_DEFS[f.out] : DEFS[f.out]) &&
            (isItem(f.in) ? ITEM_DEFS[f.in] : DEFS[f.in])));
    check('todo combustible existe y aporta usos', Object.entries(COMBUSTIBLES)
        .every(([id, usos]) => usos > 0 && (isItem(Number(id)) ? ITEM_DEFS[id] : DEFS[id])));
    {
        const horno = new Inventory();
        horno.add(B.IRON_ORE, 2);
        const salida = fundir(horno, B.IRON_ORE);
        check('fundir mena de hierro da lingote y consume la mena',
            salida === ITEMS.LINGOTE_HIERRO && horno.count(B.IRON_ORE) === 1 &&
            horno.count(ITEMS.LINGOTE_HIERRO) === 1);
        check('no se funde lo que no tiene fundición', fundir(horno, B.DIRT) === 0);
    }
    const C = B.COBBLE;
    check('el horno se fabrica con el anillo de 8 adoquines',
        (matchGrid([C, C, C, C, 0, C, C, C, C], 3) || {}).name === 'Horno');

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

/* ==== Cofres: estado por posición, persistencia y receta ==== */
console.log('== Cofres ==');
{
    const { blockDataToJSON, blockDataFromJSON } = await import(base + 'storage.js');
    const { matchGrid } = await import(base + 'items.js');
    const { Inventory } = await import(base + 'inventory.js');

    check('el cofre suena a madera y aguanta 3 golpes',
        DEFS[B.CHEST].sound === 'wood' && DEFS[B.CHEST].hardness === 3);

    const wc = new World(3);
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) wc.addChunk(cx, cz, flatChunk());
    }
    wc.set(5, 10, 5, B.CHEST);
    check('sin estado asociado, getBlockData devuelve null', wc.getBlockData(5, 10, 5) === null);
    // el contenido viaja como el toJSON de un inventario (objeto plano id → n)
    const contenido = new Inventory();
    contenido.add(B.DIRT, 12); contenido.add(B.COBBLE, 3);
    wc.setBlockData(5, 10, 5, contenido.toJSON());
    check('setBlockData/getBlockData guardan y devuelven el objeto',
        wc.getBlockData(5, 10, 5)[B.DIRT] === 12 && wc.getBlockData(5, 10, 5)[B.COBBLE] === 3);
    check('el contenido rehidrata un Inventory (formato de la futura UI)',
        new Inventory(wc.getBlockData(5, 10, 5)).count(B.DIRT) === 12);
    check('setBlockData(null) borra el estado', (() => {
        wc.setBlockData(6, 10, 5, { 1: 1 });
        wc.setBlockData(6, 10, 5, null);
        return wc.getBlockData(6, 10, 5) === null;
    })());
    wc.set(5, 10, 5, B.AIR); // romper el cofre
    check('romper el bloque limpia su blockData', wc.getBlockData(5, 10, 5) === null && wc.blockData.size === 0);

    // ciclo de guardado/carga simulado con las funciones puras de storage
    wc.set(2, 9, 2, B.CHEST);
    wc.setBlockData(2, 9, 2, contenido.toJSON());
    const guardado = JSON.parse(JSON.stringify(blockDataToJSON(wc.blockData))); // instantánea serializada
    const wc2 = new World(3);
    wc2.blockData = blockDataFromJSON(guardado);
    check('el blockData sobrevive al ciclo de guardado/carga',
        wc2.getBlockData(2, 9, 2) !== null && new Inventory(wc2.getBlockData(2, 9, 2)).count(B.COBBLE) === 3);
    check('un guardado antiguo (sin blockData) carga con el mapa vacío',
        blockDataFromJSON(undefined).size === 0 && blockDataFromJSON(null).size === 0);

    const P = B.PLANKS;
    check('el cofre se fabrica con el anillo de 8 tablones',
        (matchGrid([P, P, P, P, 0, P, P, P, P], 3) || {}).name === 'Cofre');
}

/* ==== Cultivos: bloques, agricultura, recetas y botín ==== */
console.log('== Cultivos ==');
{
    const { TILE } = await import(base + 'atlas.js');
    const { esCultivo, etapaDe, maduro, siguienteEtapa, plantaDe, cosechaDe, tickCultivos } =
        await import(base + 'farming.js');
    const { ITEMS, ITEM_DEFS, RECIPES, matchGrid, craft, fundir, isItem } = await import(base + 'items.js');
    const { Inventory } = await import(base + 'inventory.js');
    const receta = (nombre) => RECIPES.find((r) => r.name === nombre);

    // ids fijos del plan (documents/04-items.md): la etapa ES el id de bloque
    check('ids fijos del plan: FARMLAND 71 y cultivos 72..83',
        B.FARMLAND === 71 && B.TRIGO_0 === 72 && B.TRIGO_3 === 75 &&
        B.ZANAHORIA_0 === 76 && B.ZANAHORIA_3 === 79 &&
        B.PATATA_0 === 80 && B.PATATA_3 === 83 && DEFS.length === 86);
    check('items de agricultura con ids fijos 231..239',
        ITEMS.SEMILLAS_TRIGO === 231 && ITEMS.TRIGO === 232 && ITEMS.PAN === 233 &&
        ITEMS.ZANAHORIA === 234 && ITEMS.PATATA === 235 && ITEMS.PATATA_ASADA === 236 &&
        ITEMS.AZADA_MADERA === 237 && ITEMS.AZADA_PIEDRA === 238 && ITEMS.AZADA_HIERRO === 239);

    // flags de bloque: toda etapa es una planta en X que no estorba ni tapa luz
    const etapas = [];
    for (let id = B.TRIGO_0; id <= B.PATATA_3; id++) etapas.push(DEFS[id]);
    check('toda etapa es planta: cross, ni sólida ni opaca, de un golpe',
        etapas.every((d) => d.cross && !d.solid && !d.opaque && d.hardness === 1));
    check('ni etapas ni tierra labrada aparecen en el selector',
        etapas.every((d) => !d.placeable) && !DEFS[B.FARMLAND].placeable &&
        PLACEABLE.every((id) => id < B.FARMLAND || id > B.PATATA_3));
    check('la tierra labrada es sólida y opaca con tapa propia',
        DEFS[B.FARMLAND].solid && DEFS[B.FARMLAND].opaque &&
        DEFS[B.FARMLAND].top === TILE.FARMLAND_TOP &&
        DEFS[B.FARMLAND].top !== DEFS[B.FARMLAND].side &&
        typeof painters[DEFS[B.FARMLAND].top] === 'function');

    // clasificación y etapas: esCultivo cubre exactamente 72..83
    check('esCultivo acierta en todo el rango de ids',
        DEFS.every((d, id) => esCultivo(id) === (id >= B.TRIGO_0 && id <= B.PATATA_3)));
    check('etapaDe lee la etapa dentro de cada familia',
        etapaDe(B.TRIGO_0) === 0 && etapaDe(B.TRIGO_2) === 2 &&
        etapaDe(B.ZANAHORIA_1) === 1 && etapaDe(B.PATATA_3) === 3 && etapaDe(B.STONE) === -1);
    check('maduro solo en la etapa final',
        maduro(B.TRIGO_3) && maduro(B.ZANAHORIA_3) && maduro(B.PATATA_3) &&
        !maduro(B.TRIGO_2) && !maduro(B.ZANAHORIA_0) && !maduro(B.FARMLAND));
    check('siguienteEtapa avanza sin saltar de familia',
        siguienteEtapa(B.TRIGO_0) === B.TRIGO_1 && siguienteEtapa(B.TRIGO_3) === B.TRIGO_3 &&
        siguienteEtapa(B.ZANAHORIA_3) === B.ZANAHORIA_3 && siguienteEtapa(B.STONE) === B.STONE);

    // siembra: cada ítem plantable produce la etapa 0 de su familia
    check('plantaDe siembra semillas, zanahoria y patata',
        plantaDe(ITEMS.SEMILLAS_TRIGO) === B.TRIGO_0 && plantaDe(ITEMS.ZANAHORIA) === B.ZANAHORIA_0 &&
        plantaDe(ITEMS.PATATA) === B.PATATA_0 &&
        plantaDe(ITEMS.TRIGO) === null && plantaDe(ITEMS.PAN) === null && plantaDe(B.DIRT) === null);
    check('cosechar inmaduro devuelve solo lo sembrado (replantable)',
        [B.TRIGO_0, B.ZANAHORIA_0, B.PATATA_0].every((etapa0) => [0, 1, 2].every((e) => {
            const botin = cosechaDe(etapa0 + e, () => 0);
            return botin.length === 1 && botin[0].n === 1 && plantaDe(botin[0].id) === etapa0;
        })));
    check('trigo maduro: 1 trigo + 1-2 semillas según el azar',
        JSON.stringify(cosechaDe(B.TRIGO_3, () => 0)) ===
            JSON.stringify([{ id: ITEMS.TRIGO, n: 1 }, { id: ITEMS.SEMILLAS_TRIGO, n: 1 }]) &&
        JSON.stringify(cosechaDe(B.TRIGO_3, () => 0.999)) ===
            JSON.stringify([{ id: ITEMS.TRIGO, n: 1 }, { id: ITEMS.SEMILLAS_TRIGO, n: 2 }]));
    check('zanahoria madura 2-3 y patata madura 1-3',
        cosechaDe(B.ZANAHORIA_3, () => 0)[0].n === 2 && cosechaDe(B.ZANAHORIA_3, () => 0.999)[0].n === 3 &&
        cosechaDe(B.PATATA_3, () => 0)[0].n === 1 && cosechaDe(B.PATATA_3, () => 0.999)[0].n === 3);
    check('lo que no es cultivo no da botín', cosechaDe(B.STONE).length === 0 && cosechaDe(B.AIR).length === 0);

    // crecimiento por muestreo: sobre tierra labrada madura; sobre tierra no
    const wf = new World(4);
    wf.addChunk(0, 0, flatChunk());
    wf.set(8, 8, 8, B.FARMLAND);
    wf.set(8, 9, 8, B.TRIGO_0);   // sembrado sobre tierra labrada
    wf.set(4, 8, 4, B.DIRT);
    wf.set(4, 9, 4, B.TRIGO_0);   // sembrado «en secano» sobre tierra rota
    const rngF = new PRNG(7);
    let pasadas = 0;
    while (wf.get(8, 9, 8) !== B.TRIGO_3 && pasadas < 4000) {
        tickCultivos(wf, 3, () => rngF.float()); // dt = PERIODO: una pasada por llamada
        pasadas++;
    }
    check('el trigo sobre tierra labrada madura con los ticks', wf.get(8, 9, 8) === B.TRIGO_3);
    tickCultivos(wf, 3, () => rngF.float());
    check('el cultivo maduro se queda como está', wf.get(8, 9, 8) === B.TRIGO_3);
    check('sin tierra labrada debajo no crece', wf.get(4, 9, 4) === B.TRIGO_0);

    // recetas: pan en fila, con forma de verdad (la columna no vale)
    const T = ITEMS.TRIGO;
    check('el pan se fabrica con 3 trigos en fila',
        (matchGrid([T, T, T, 0, 0, 0, 0, 0, 0], 3) || {}).name === 'Pan');
    check('3 trigos en columna NO hacen pan',
        (matchGrid([T, 0, 0, T, 0, 0, T, 0, 0], 3) || {}).name !== 'Pan');
    {
        const inv = new Inventory();
        inv.add(T, 3);
        check('hornear pan consume el trigo y da comida (food 5)',
            craft(inv, receta('Pan')) && inv.count(ITEMS.PAN) === 1 && inv.count(T) === 0 &&
            ITEM_DEFS[ITEMS.PAN].food === 5);
    }

    // horno: la patata cruda se asa
    {
        const horno = new Inventory();
        horno.add(ITEMS.PATATA, 2);
        check('fundir patata da patata asada y consume la cruda',
            fundir(horno, ITEMS.PATATA) === ITEMS.PATATA_ASADA &&
            horno.count(ITEMS.PATATA) === 1 && horno.count(ITEMS.PATATA_ASADA) === 1);
    }

    // azadas: recetas con forma (y su espejo) en los tres materiales
    const P = B.PLANKS, S = ITEMS.PALO;
    check('la azada de madera casa en la mesa 3×3 (y su espejo)',
        (matchGrid([P, P, 0, 0, S, 0, 0, S, 0], 3) || {}).name === 'Azada de madera' &&
        (matchGrid([P, P, 0, S, 0, 0, S, 0, 0], 3) || {}).name === 'Azada de madera');
    check('hay azadas de los tres materiales con salida correcta',
        receta('Azada de madera').out.id === ITEMS.AZADA_MADERA &&
        receta('Azada de piedra').out.id === ITEMS.AZADA_PIEDRA &&
        receta('Azada de hierro').out.id === ITEMS.AZADA_HIERRO);
    {
        const inv = new Inventory();
        inv.add(P, 2); inv.add(S, 2);
        check('la azada de madera se fabrica con 2 tablones y 2 palos',
            craft(inv, receta('Azada de madera')) && inv.count(ITEMS.AZADA_MADERA) === 1);
    }
    check('las azadas son herramientas de tipo azada con factor creciente',
        ITEM_DEFS[ITEMS.AZADA_MADERA].tool.tipo === 'azada' &&
        ITEM_DEFS[ITEMS.AZADA_PIEDRA].tool.tipo === 'azada' &&
        ITEM_DEFS[ITEMS.AZADA_HIERRO].tool.tipo === 'azada' &&
        ITEM_DEFS[ITEMS.AZADA_MADERA].tool.factor < ITEM_DEFS[ITEMS.AZADA_PIEDRA].tool.factor &&
        ITEM_DEFS[ITEMS.AZADA_PIEDRA].tool.factor < ITEM_DEFS[ITEMS.AZADA_HIERRO].tool.factor);

    // ITEM_DEFS nuevos: tésela pintable dentro del atlas y comida correcta
    const nuevos = [ITEMS.SEMILLAS_TRIGO, ITEMS.TRIGO, ITEMS.PAN, ITEMS.ZANAHORIA,
        ITEMS.PATATA, ITEMS.PATATA_ASADA, ITEMS.AZADA_MADERA, ITEMS.AZADA_PIEDRA, ITEMS.AZADA_HIERRO];
    check('los 9 items nuevos existen con nombre y tésela pintable',
        nuevos.every((id) => isItem(id) && ITEM_DEFS[id] && ITEM_DEFS[id].name &&
            ITEM_DEFS[id].tile >= 0 && ITEM_DEFS[id].tile < ATLAS_GRID * ATLAS_GRID &&
            typeof painters[ITEM_DEFS[id].tile] === 'function'));
    check('valores de comida del plan: pan 5, zanahoria 3, patata 1, asada 5',
        ITEM_DEFS[ITEMS.PAN].food === 5 && ITEM_DEFS[ITEMS.ZANAHORIA].food === 3 &&
        ITEM_DEFS[ITEMS.PATATA].food === 1 && ITEM_DEFS[ITEMS.PATATA_ASADA].food === 5 &&
        ITEM_DEFS[ITEMS.SEMILLAS_TRIGO].food === undefined && ITEM_DEFS[ITEMS.TRIGO].food === undefined);

    // botín de no-muertos: la hortaliza rara que arranca la agricultura
    const { validate } = await import(new URL('./validate-mob.mjs', import.meta.url).href);
    for (const id of ['zombie', 'husk', 'drowned']) {
        const def = (await import(base + `mobs/${id}.js`)).default;
        const { errors } = validate(def, id);
        check(`contrato válido tras el botín nuevo: ${id}${errors.length ? ` → ${errors[0]}` : ''}`,
            errors.length === 0);
        check(`${id} suelta zanahoria y patata (raras, chance válida)`,
            [ITEMS.ZANAHORIA, ITEMS.PATATA].every((it) =>
                def.drops.some((d) => d.id === it && d.chance > 0 && d.chance <= 1)));
    }
}

/* ==== Sonidos: catálogo declarativo de eventos y pack local opcional ==== */
console.log('== Sonidos ==');
{
    // ambos módulos deben importarse sin DOM (nada de window/document arriba)
    const audio = await import(base + 'audio.js');
    const pack = await import(base + 'soundpack.js');
    check('audio.js y soundpack.js se importan sin DOM',
        typeof audio.SoundEngine === 'function' && typeof pack.resolver === 'function' &&
        typeof pack.obtener === 'function' && typeof pack.variantes === 'function');

    const { EVENTOS } = audio;
    const nuevos = ['comer', 'puerta_abrir', 'puerta_cerrar', 'cofre_abrir', 'cofre_cerrar',
        'fundir', 'labrar', 'sembrar', 'cosechar', 'campana'];
    check('el catálogo trae los eventos nuevos y cada receta es función',
        nuevos.every((id) => typeof EVENTOS[id] === 'function'));
    check('los efectos clásicos siguen en el catálogo',
        ['splash', 'fuse', 'explosion', 'arrow', 'player_hurt', 'click']
            .every((id) => typeof EVENTOS[id] === 'function'));

    // sin AudioContext registrado el pack no sondea nada ni toca la red
    check('sin contexto, resolver/obtener devuelven null sin sondear',
        (await pack.resolver('grass1')) === null && pack.obtener('grass1') === null);

    // convención de nombres: cada id sondea sounds/<id>.mp3 y luego .fsb
    // (fetch simulado; con «no existe» jamás se llega a decodeAudioData)
    const urls = [];
    const fetchReal = globalThis.fetch;
    globalThis.fetch = (url) => { urls.push(String(url)); return Promise.resolve({ ok: false }); };
    pack.init({});
    await pack.resolver('evento.campana');
    await Promise.all([1, 2, 3, 4].map((i) => pack.resolver('stone' + i)));
    pack.variantes('mob.zombie.idle', 2);
    globalThis.fetch = fetchReal;
    // init lanza además el sondeo único de sounds/manifest.json (árbol
    // Bedrock opcional); todo lo demás debe ser audio con extensión aceptada
    check('toda ruta del pack cae bajo sounds/ con extensión aceptada',
        urls.length >= 7 && urls.every((u) => u.startsWith('sounds/') &&
            (u.endsWith('.mp3') || u.endsWith('.fsb') || u === 'sounds/manifest.json')));
    check('init sondea el manifest del árbol UNA sola vez',
        urls.filter((u) => u === 'sounds/manifest.json').length === 1);
    check('cada id sondea .mp3 primero y .fsb después',
        JSON.stringify(pack.rutasDe('stone1')) ===
            JSON.stringify(['sounds/stone1.mp3', 'sounds/stone1.fsb']) &&
        urls.indexOf('sounds/evento.campana.mp3') < urls.indexOf('sounds/evento.campana.fsb'));
    check('la convención cubre evento.<nombre>, familias y voces de mob',
        urls.includes('sounds/evento.campana.mp3') && urls.includes('sounds/stone3.fsb') &&
        urls.includes('sounds/mob.zombie.idle1.mp3'));
    check('el sondeo fallido queda cacheado como null (sin repetir el fetch)',
        pack.obtener('evento.campana') === null && (await pack.resolver('evento.campana')) === null);

    // Puerta anti-tormenta de 404: el respaldo plano solo se sondea cuando
    // el árbol CONCLUYÓ; con el manifest pendiente se responde null («no sé»)
    const packG = await import(base + 'soundpack.js?gating=1');
    check('antes de concluir el manifest, arbolListo es false', packG.arbolListo() === false);
    const fetchReal2 = globalThis.fetch;
    globalThis.fetch = async (url) => (String(url).endsWith('manifest.json')
        ? { ok: true, json: async () => ['mob/gato/meow1.mp3'] }
        : { ok: false });
    packG.init({});
    await packG.cargarManifest();
    globalThis.fetch = fetchReal2;
    check('al concluir, arbolListo es true y el árbol responde por prefijo',
        packG.arbolListo() === true && packG.rutasArbol('mob/gato/meow').length === 1);

    // el pack por defecto de esta tanda concluyó SIN árbol (manifest 404):
    // ahí la convención plana sí es el respaldo legítimo
    const { hayVozEnArbol, hayEnArbol } = await import(base + 'audio.js');
    await pack.cargarManifest();
    check('árbol concluido sin rutas: la convención plana queda habilitada',
        hayVozEnArbol('zombie', 'say') === false && hayEnArbol('step/grass') === false);
}

/* ==== Voces del árbol: prioridad def.sonidos → tabla genérica VOCES ==== */
{
    // instancia FRESCA del módulo (la de arriba ya cacheó «sin manifest»);
    // el query string fuerza otra entrada en la caché de módulos de Node
    const pack = await import(base + 'soundpack.js?arbol=prioridad');
    const MANIFIESTO = ['mob/cow/say1.mp3', 'mob/cow/say2.mp3', 'mob/cow/hurt1.mp3',
        'mob/gato/meow1.mp3'];
    const fetchReal = globalThis.fetch;
    globalThis.fetch = (url) => {
        const u = String(url);
        if (u === 'sounds/manifest.json') {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MANIFIESTO) });
        }
        const ruta = u.slice('sounds/'.length);
        if (!MANIFIESTO.includes(ruta)) return Promise.resolve({ ok: false });
        // la ruta viaja en los bytes para saber qué archivo se «decodificó»
        return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(ruta).buffer) });
    };
    // AudioContext simulado: devuelve la ruta como etiqueta del «buffer»
    pack.init({ decodeAudioData: async (datos) => ({ ruta: new TextDecoder().decode(datos) }) });

    const propio = await pack.resolverVozMob('cow', 'say', ['mob/gato/meow']);
    check('def.sonidos gana a la tabla genérica (su prefijo se resuelve primero)',
        propio !== null && propio.ruta === 'mob/gato/meow1.mp3');
    const generico = await pack.resolverVozMob('cow', 'say');
    check('sin def.sonidos la tabla VOCES resuelve bajo mob/<carpeta>/',
        generico !== null && /^mob\/cow\/say[12]\.mp3$/.test(generico.ruta));
    const caido = await pack.resolverVozMob('cow', 'hurt', ['mob/no_existe/nada']);
    check('un prefijo sin rutas en el manifest cae a la tabla genérica',
        caido !== null && caido.ruta === 'mob/cow/hurt1.mp3');
    check('sin voz en el árbol devuelve null (cae a convención plana o síntesis)',
        (await pack.resolverVozMob('cow', 'death')) === null);
    globalThis.fetch = fetchReal;
}

/* ==== FSB5: parser puro de bancos FMOD para el pack local ==== */
console.log('== FSB5 ==');
{
    const { parseFSB5, pcm16ToWav, sampleAWav } = await import(base + 'fsb5.js');

    // banco sintético: cabecera de 60 bytes + 1 sample PCM16 mono 44100
    const N = 100;                                     // muestras de audio
    const datos = new Uint8Array(60 + 8 + N * 2);
    const v = new DataView(datos.buffer);
    datos.set([0x46, 0x53, 0x42, 0x35], 0);            // "FSB5"
    v.setUint32(4, 1, true);                           // versión 1 (cabecera 60)
    v.setUint32(8, 1, true);                           // 1 sample
    v.setUint32(12, 8, true);                          // cabeceras de sample: 8 B
    v.setUint32(16, 0, true);                          // sin tabla de nombres
    v.setUint32(20, N * 2, true);                      // datos: N muestras PCM16
    v.setUint32(24, 2, true);                          // modo 2 = PCM16
    // uint64 empaquetado: sampleCount<<34 | dataOffset<<6 | (canales-1)<<5 | freq<<1
    v.setBigUint64(60, (BigInt(N) << 34n) | (8n << 1n), true); // 44100 Hz, mono
    for (let i = 0; i < N; i++) {                      // onda dientes de sierra
        v.setInt16(60 + 8 + i * 2, ((i * 655) % 65536) - 32768, true);
    }

    const { header, samples } = parseFSB5(datos);
    check('el banco sintético se parsea (códec, frecuencia, canales)',
        header.codec === 'PCM16' && header.numSamples === 1 &&
        samples[0].frequency === 44100 && samples[0].channels === 1);
    check('los datos del sample se recortan exactos', samples[0].data.length === N * 2);

    const wav = pcm16ToWav(samples[0]);
    const w = new DataView(wav.buffer);
    check('pcm16ToWav produce un WAV canónico (RIFF/WAVE, 44100 Hz, 16 bits)',
        wav.length === 44 + N * 2 &&
        String.fromCharCode(wav[0], wav[1], wav[2], wav[3]) === 'RIFF' &&
        String.fromCharCode(wav[8], wav[9], wav[10], wav[11]) === 'WAVE' &&
        w.getUint32(24, true) === 44100 && w.getUint16(34, true) === 16);
    check('sampleAWav rechaza códecs no PCM y acepta PCMFLOAT',
        sampleAWav(samples[0], 'VORBIS') === null &&
        sampleAWav(samples[0], 'PCMFLOAT')?.length === 44 + N * 2);
    check('un archivo que no es FSB5 lanza un error claro',
        (() => { try { parseFSB5(new Uint8Array(16)); return false; } catch (e) { return /FSB5/.test(e.message); } })());

    // FADPCM determinista: frame con índice de coeficientes 0 (coefs nulos),
    // shift 6 e historia 0 => cada nibble n decodifica exacto a
    // (n < 8 ? n : n - 16) * 64, sin depender de muestras anteriores.
    const { decodeFADPCM, pcm16AWav } = await import(base + 'fsb5.js');
    const banco = new Uint8Array(60 + 8 + 140);
    const bv = new DataView(banco.buffer);
    banco.set([0x46, 0x53, 0x42, 0x35], 0);            // "FSB5"
    bv.setUint32(4, 1, true); bv.setUint32(8, 1, true);
    bv.setUint32(12, 8, true); bv.setUint32(16, 0, true);
    bv.setUint32(20, 140, true);
    bv.setUint32(24, 16, true);                        // modo 16 = FADPCM
    bv.setBigUint64(60, (256n << 34n) | (9n << 1n), true); // 256 muestras, 48000 Hz
    const frame = 60 + 8;
    bv.setUint32(frame + 4, 0x66666666, true);         // shifts: todos 6
    bv.setUint32(frame + 0x0c, 0x76543210, true);      // nibbles 0..7
    bv.setUint32(frame + 0x10, 0xFEDCBA98, true);      // nibbles 8..15 (negativos)
    const fad = parseFSB5(banco);
    const pcm = decodeFADPCM(fad.samples[0]);
    const esperado = [0, 64, 128, 192, 256, 320, 384, 448,
        -512, -448, -384, -320, -256, -192, -128, -64];
    check('FADPCM decodifica el frame de referencia muestra a muestra',
        fad.header.codec === 'FADPCM' && pcm.length === 256 &&
        esperado.every((v, i) => pcm[i] === v) && pcm[16] === 0 && pcm[255] === 0);
    const wavFad = pcm16AWav(pcm, 48000, 1);
    check('el PCM decodificado se envuelve en WAV canónico',
        wavFad.length === 44 + 512 &&
        new DataView(wavFad.buffer).getUint32(24, true) === 48000);
}

/* ==== Modelos geo: parser Bedrock y override local opcional ==== */
console.log('== Modelos geo ==');
{
    // Geo SINTÉTICO construido aquí mismo: la suite JAMÁS depende del
    // models/ real (es un override local gitignored, quizá ausente).
    const { parseGeo, animForBone } = await import(base + 'geo.js');
    const { buildPartMesh } = await import(base + 'mobs/model.js');
    const { modeloDe, autoPiel } = await import(base + 'modelpack.js');
    const { MobRenderer } = await import(base + 'mobrender.js');

    const geoSint = {
        'geometry.sintetico': {
            texturewidth: 128,
            textureheight: 64,
            bones: [
                { name: 'body', pivot: [0, 12, 0], bind_pose_rotation: [22.5, -45, 90],
                    cubes: [{ origin: [-4, 12, -6], size: [8, 10, 6], uv: [18, 4] }] },
                { name: 'head', pivot: [0, 20, -6],
                    cubes: [{ origin: [-3, 20, -10], size: [6, 6, 6], uv: [0, 0] }] },
                { name: 'leg0', pivot: [-3, 6, 5], cubes: [{ origin: [-4, 0, 4], size: [2, 6, 2], uv: [0, 16] }] },
                { name: 'leg1', pivot: [3, 6, 5], cubes: [{ origin: [2, 0, 4], size: [2, 6, 2], uv: [0, 16] }] },
                { name: 'leg2', pivot: [-3, 6, -5], cubes: [{ origin: [-4, 0, -6], size: [2, 6, 2], uv: [0, 16] }] },
                { name: 'leg3', pivot: [3, 6, -5], cubes: [{ origin: [2, 0, -6], size: [2, 6, 2], uv: [0, 16] }] },
                { name: 'doble', pivot: [0, 10, 0],
                    cubes: [{ origin: [-1, 10, -1], size: [2, 2, 2], uv: [40, 0], inflate: 0.5 },
                        { origin: [-1, 12, -1], size: [2, 2, 2], uv: [40, 8] }] },
                { name: 'oculto', neverRender: true, cubes: [{ origin: [0, 0, 0], size: [1, 1, 1], uv: [0, 0] }] },
                { name: 'sin_cubos', pivot: [0, 0, 0] },
            ],
        },
    };

    const g = parseGeo(geoSint)['geometry.sintetico'];
    const parte = (n) => g.partes.find((p) => p.name === n);
    check('parseGeo registra la geometría con su lienzo declarado',
        g !== undefined && g.texW === 128 && g.texH === 64 && g.avisos.length === 0);
    check('conversión exacta: origin RELATIVO al pivote (absoluto − pivote por eje)',
        JSON.stringify(parte('body').origin) === JSON.stringify([-4, 0, -6]) &&
        JSON.stringify(parte('body').pivot) === JSON.stringify([0, 12, 0]) &&
        JSON.stringify(parte('head').origin) === JSON.stringify([-3, 0, -4]) &&
        JSON.stringify(parte('leg0').origin) === JSON.stringify([-1, -6, -1]));
    const rad = Math.PI / 180;
    const cerca = (a, b) => Math.abs(a - b) < 1e-12;
    check('bind_pose_rotation en grados → rot en radianes con signo [−x, −y, +z]',
        cerca(parte('body').rot[0], -22.5 * rad) && cerca(parte('body').rot[1], 45 * rad) &&
        cerca(parte('body').rot[2], 90 * rad) && parte('head').rot === undefined);
    check('un bone con dos cubes da dos partes con el mismo pivote (inflate por cube)',
        parte('doble_0') !== undefined && parte('doble_1') !== undefined &&
        JSON.stringify(parte('doble_0').pivot) === JSON.stringify(parte('doble_1').pivot) &&
        parte('doble_0').inflate === 0.5 && parte('doble_1').inflate === undefined);
    check('neverRender y bones sin cubes quedan fuera (8 partes visibles)',
        g.partes.length === 8 && !parte('oculto') && !parte('sin_cubos'));
    check('anims parseadas: cabeza y marcha diagonal de cuadrúpedo (leg0/leg3 ↔ leg1/leg2)',
        parte('head').anim === 'head' && parte('body').anim === undefined &&
        parte('leg0').anim === 'leg0' && parte('leg3').anim === 'leg0' &&
        parte('leg1').anim === 'leg1' && parte('leg2').anim === 'leg1');
    check('animForBone: brazos, alas, cuadrúpedo con L/R, bípedo y multipatas',
        animForBone('leftArm') === 'arm0' && animForBone('rightArm') === 'arm1' &&
        animForBone('wing0') === 'flapL' && animForBone('wing1') === 'flapR' &&
        animForBone('rightWing') === 'flapL' && animForBone('leftWing') === 'flapR' &&
        animForBone('leg_front_right') === 'leg0' && animForBone('leg_back_left') === 'leg0' &&
        animForBone('leg_front_left') === 'leg1' && animForBone('leg_back_right') === 'leg1' &&
        animForBone('rightLeg') === 'leg0' && animForBone('leftLeg') === 'leg1' &&
        animForBone('leg4') === 'leg0' && animForBone('leg5') === 'leg1' &&
        animForBone('tail') === 'none');

    // mirror: la geometría no cambia, solo se refleja la U dentro de su rect
    const caja = { name: 'caja', size: [4, 6, 2], pivot: [0, 0, 0], origin: [-2, 0, -1], uv: [4, 4] };
    const normal = buildPartMesh(caja, 64, 32);
    const espejo = buildPartMesh({ ...caja, mirror: true }, 64, 32);
    let igual = normal.length === espejo.length, uCambia = false;
    for (let i = 0; igual && i < normal.length; i += 6) {
        if (normal[i] !== espejo[i] || normal[i + 1] !== espejo[i + 1] ||
            normal[i + 2] !== espejo[i + 2] || normal[i + 4] !== espejo[i + 4] ||
            normal[i + 5] !== espejo[i + 5]) igual = false;
        if (normal[i + 3] !== espejo[i + 3]) uCambia = true;
    }
    check('mirror solo cambia la U (posición, V y luz idénticas malla a malla)', igual && uCambia);

    // render simulado sin WebGL: basta para construir tipos y aplicar packs
    const glFalso = {
        TEXTURE_2D: 0, RGBA: 0, UNSIGNED_BYTE: 0, NEAREST: 0, CLAMP_TO_EDGE: 0,
        TEXTURE_MIN_FILTER: 0, TEXTURE_MAG_FILTER: 0, TEXTURE_WRAP_S: 0, TEXTURE_WRAP_T: 0,
        createTexture: () => ({}), bindTexture() {}, texImage2D() {},
        texParameteri() {}, deleteTexture() {},
    };
    const rendFalso = {
        gl: glFalso,
        compile: () => ({}),
        uniformMap: () => ({}),
        makeVAO: (mesh) => ({ vao: {}, n: mesh.length / 6 }),
        freeMesh() {},
    };
    const defBase = {
        skin: { w: 16, h: 16 },
        paint(s) { s.fill(0, 0, 16, 16, [90, 140, 200], 8); },
        parts: [{ name: 'cuerpo', size: [4, 4, 4], pivot: [0, 4, 0], origin: [-2, -2, -2], uv: [0, 0] }],
    };
    const defSin = { ...defBase, id: 'prueba_sin_pack' };
    const defCon = { ...defBase, id: 'prueba_con_pack' };
    const mr = new MobRenderer(rendFalso, { [defSin.id]: defSin, [defCon.id]: defCon });

    const fetchReal = globalThis.fetch;
    // 1) SIN pack: todo sondeo da 404 → mobrender conserva las partes del def
    globalThis.fetch = () => Promise.resolve({ ok: false });
    const partesProc = mr.types.get('prueba_sin_pack').parts;
    await mr.applyPack(defSin);
    check('sin pack local, mobrender sigue con def.parts (modelo procedural)',
        mr.types.get('prueba_sin_pack').parts === partesProc &&
        (await modeloDe('prueba_sin_pack')) === null);

    // 2) CON geo local (servido por el fetch simulado): la malla se sustituye
    //    y, sin PNG ni createImageBitmap (Node), se texturiza con la auto-piel
    globalThis.fetch = (url) => Promise.resolve(
        String(url) === 'models/entity/prueba_con_pack.geo.json'
            ? { ok: true, json: () => Promise.resolve(geoSint) }
            : { ok: false });
    const partesAntes = mr.types.get('prueba_con_pack').parts;
    await mr.applyPack(defCon);
    globalThis.fetch = fetchReal;
    const tipo = mr.types.get('prueba_con_pack');
    check('con geo local mobrender sustituye la malla y conserva anims y rot',
        tipo.parts !== partesAntes && tipo.parts.length === 8 &&
        tipo.parts.some((p) => p.name === 'head' && p.anim === 'head') &&
        tipo.parts.some((p) => p.name === 'body' && p.rot !== null));

    const modelo = await modeloDe('prueba_con_pack'); // ya cacheado: sin red
    const piel = autoPiel(defCon, modelo, 0);
    const alfa = (x, y) => piel.data[(y * piel.w + x) * 4 + 3];
    check('la auto-piel pinta el desplegado del geo en su lienzo (y solo eso)',
        piel.w === 128 && piel.h === 64 && alfa(25, 11) === 255 && alfa(127, 63) === 0);

    // horneado de rotaciones ancestrales: el hijo de un padre rotado hereda
    // rot y pivote del padre (el cuello del caballo arrastra la cabeza)
    const geoCadena = parseGeo({
        format_version: '1.8.0',
        'geometry.cadena': {
            texturewidth: 32, textureheight: 32,
            bones: [
                { name: 'body', pivot: [0, 10, 0], cubes: [{ origin: [-2, 4, -2], size: [4, 6, 4], uv: [0, 0] }] },
                { name: 'neck', parent: 'body', pivot: [0, 10, -2], rotation: [30, 0, 0], cubes: [{ origin: [-1, 10, -4], size: [2, 6, 3], uv: [0, 10] }] },
                { name: 'head', parent: 'neck', pivot: [0, 16, -3], cubes: [{ origin: [-2, 16, -6], size: [4, 4, 4], uv: [0, 19] }] },
            ],
        },
    })['geometry.cadena'];
    const cabeza = geoCadena.partes.find((p) => p.name === 'head');
    check('la rotación del ancestro se hornea en el hijo (rot y pivote heredados)',
        !!cabeza && !!cabeza.rot && Math.abs(cabeza.rot[0] - (-30 * Math.PI / 180)) < 1e-9 &&
        cabeza.pivot[0] === 0 && cabeza.pivot[1] === 10 && cabeza.pivot[2] === -2 &&
        cabeza.origin[1] === 6 && cabeza.origin[2] === -4);

    // bind_pose_rotation (legacy 1.8) posa SOLO al propio hueso: los hijos
    // traen coordenadas finales y NO la heredan (vaca, tortuga)
    const geoLegacy = parseGeo({
        format_version: '1.8.0',
        'geometry.legacy': {
            texturewidth: 32, textureheight: 32,
            bones: [
                { name: 'body', pivot: [0, 12, 0], bind_pose_rotation: [90, 0, 0],
                  cubes: [{ origin: [-3, 6, -4], size: [6, 10, 8], uv: [0, 0] }] },
                { name: 'head', parent: 'body', pivot: [0, 14, -5],
                  cubes: [{ origin: [-2, 12, -9], size: [4, 4, 4], uv: [0, 18] }] },
            ],
        },
    })['geometry.legacy'];
    const cuerpoLegacy = geoLegacy.partes.find((p) => p.name === 'body');
    const cabezaLegacy = geoLegacy.partes.find((p) => p.name === 'head');
    check('bind_pose ancestral NO se hereda (el hijo queda sin rot y con su pivote)',
        !!cuerpoLegacy.rot && !cabezaLegacy.rot &&
        cabezaLegacy.pivot[1] === 14 && cabezaLegacy.pivot[2] === -5);

    // filtro de atrezo por especie (modelpack): equipamiento fuera siempre;
    // el burro conserva las orejas de mula y descarta las de caballo
    const { filtrarAtrezo } = await import(base + 'modelpack.js');
    const partesPrueba = ['Body', 'Saddle', 'ReinsL', 'Bridle_0', 'BitR', 'BagL', 'EarL', 'MuleEarL']
        .map((name) => ({ name }));
    const burro = filtrarAtrezo(partesPrueba, 'donkey').map((p) => p.name);
    const caballo = filtrarAtrezo(partesPrueba, 'horse').map((p) => p.name);
    check('el atrezo (silla, bridas, riendas, alforjas) se filtra siempre',
        !burro.includes('Saddle') && !burro.includes('ReinsL') && !burro.includes('Bridle_0') &&
        !burro.includes('BitR') && !burro.includes('BagL') && burro.includes('Body'));
    check('cada especie muestra solo sus orejas (burro: mula; caballo: caballo)',
        burro.includes('MuleEarL') && !burro.includes('EarL') &&
        caballo.includes('EarL') && !caballo.includes('MuleEarL'));

    // pose por especie: el geo de la araña trae las 8 patas rectas apiladas
    // (el abanico lo pone la animación de runtime del juego original, que
    // no viene en los archivos); aplicarPose lo hornea como rot estática
    const { aplicarPose } = await import(base + 'modelpack.js');
    const patas = ['body0', 'leg0', 'leg1', 'leg2', 'leg6', 'leg7'].map((name) => ({ name }));
    const arana = aplicarPose(patas, 'spider');
    const rotY = (n) => { const p = arana.find((q) => q.name === n); return p.rot ? p.rot[1] : 0; };
    check('la araña recibe el abanico de patas (rot distintas por lado y posición)',
        !arana.find((p) => p.name === 'body0').rot &&
        rotY('leg0') > 0 && rotY('leg1') < 0 && rotY('leg0') !== rotY('leg2') &&
        Math.abs(rotY('leg6') + rotY('leg0')) < 1e-9 && Math.abs(rotY('leg7') + rotY('leg1')) < 1e-9);
    check('la pose por especie no toca a los demás mobs',
        aplicarPose(patas, 'cow').every((p) => !p.rot));

    // traslados de pose: el enderman legacy trae la cabeza incrustada en el
    // torso y los pies 4 px bajo tierra; mov desplaza el pivote (la caja,
    // relativa a él, viaja entera) sin añadir rotación
    const huesos = [
        { name: 'head', pivot: [0, 24, 0], origin: [-4, 0, -4] },
        { name: 'rightLeg', pivot: [-2, 26, 0], origin: [-1, -30, -1] },
        { name: 'body', pivot: [0, 38, 0], origin: [-4, -12, -2] },
    ];
    const ender = aplicarPose(huesos, 'enderman');
    check('el enderman recoloca cabeza y piernas por traslado de pivote',
        ender.find((p) => p.name === 'head').pivot[1] === 38 &&
        ender.find((p) => p.name === 'rightLeg').pivot[1] === 30 &&
        ender.find((p) => p.name === 'body').pivot[1] === 38 &&
        ender.every((p) => !p.rot) &&
        ender.find((p) => p.name === 'head').origin[1] === 0);
}

/* ==== Templo del origen: monumento fijo en el punto de aparición ==== */
console.log('== Templo del origen ==');
{
    const { nivelBaseTemplo, TEMPLO } = await import(base + 'templo.js');

    // la base 31×31 centrada en el origen cae exactamente en 4 chunks; se
    // generan en DOS órdenes distintos con generadores frescos (el segundo
    // además "ensucia" sus cachés con un chunk lejano) ⇒ byte a byte igual
    const cobertura = [[-1, -1], [-1, 0], [0, -1], [0, 0]];
    const gA = new Generator(12345), gB = new Generator(12345);
    const bufA = new Map(), bufB = new Map();
    for (const [cx, cz] of cobertura) bufA.set(cx + ',' + cz, gA.generateChunk(cx, cz));
    gB.generateChunk(4, -2); // otro orden Y otro historial de generación
    for (const [cx, cz] of [...cobertura].reverse()) bufB.set(cx + ',' + cz, gB.generateChunk(cx, cz));
    check('dos órdenes de generación ⇒ chunks byte a byte idénticos',
        cobertura.every(([cx, cz]) => Buffer.from(bufA.get(cx + ',' + cz))
            .equals(Buffer.from(bufB.get(cx + ',' + cz)))));

    const en = (x, y, z) => {
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        return bufA.get(cx + ',' + cz)[(y * 16 + (z - cz * 16)) * 16 + (x - cx * 16)];
    };
    // cotas de la geometría: y0 es función pura, idéntica desde todo chunk
    const y0 = nivelBaseTemplo((x, z) => gA.surfaceHeight(x, z));
    const yP = y0 + TEMPLO.ALTO_PLATAFORMA;                    // plaza
    const yC = yP + TEMPLO.ALTO_CUERPO;                        // cima
    check('la base acota la cima a ≤61 y las torres a ≤62',
        yC + 1 <= 61 && y0 + TEMPLO.ALTO_TORRES <= 62);

    // recuento SOLO en la huella (|x|,|z| ≤ 15) por encima del relleno:
    // todo lo que queda ahí lo escribió el templo (su corte vació el resto)
    const n = {};
    let sobre62 = 0;
    for (let x = -TEMPLO.SEMI; x <= TEMPLO.SEMI; x++) {
        for (let z = -TEMPLO.SEMI; z <= TEMPLO.SEMI; z++) {
            for (let y = 1; y < 64; y++) {
                const b = en(x, y, z);
                if (y > 62 && b !== B.AIR) sobre62++;
                if (y > y0 && b !== B.AIR) n[b] = (n[b] || 0) + 1;
            }
        }
    }
    check('cuerpo de STONE y gradas/contrafuertes de COBBLE en masa',
        n[B.STONE] > 1000 && n[B.COBBLE] > 1000);
    check('acentos deterministas de adoquín musgoso', (n[B.MOSSY_COBBLE] || 0) > 10);
    check('claraboya de GLASS 5×5 a ras de la cima (y nada más de cristal)',
        n[B.GLASS] === 25 && en(0, yC, 0) === B.GLASS && en(-2, yC, 2) === B.GLASS &&
        en(3, yC, 0) === B.STONE);
    check('cámara iluminada: exactamente 4 antorchas interiores', n[B.TORCH] === 4);
    check('kit de inicio exacto: 1 cofre + 1 mesa + 1 horno + 1 cama',
        n[B.CHEST] === 1 && n[B.CRAFTING_TABLE] === 1 &&
        n[B.FURNACE] === 1 && n[B.BED] === 1);
    check('la cámara es hueca bajo la claraboya (aire en su centro)',
        en(0, yP + 1, 0) === B.AIR && en(0, yP + 3, 0) === B.AIR &&
        en(0, yP + 5, 0) === B.AIR && en(3, yP + 2, -3) === B.AIR);
    check('el corredor de 3×4 perfora la fachada sur hasta la cámara',
        en(0, yP + 1, -7) === B.AIR && en(1, yP + 4, -9) === B.AIR &&
        en(0, yP, -7) === B.STONE && en(2, yP + 1, -7) !== B.AIR);
    check('torres gemelas 5×5 flanqueando la entrada, más altas que el cuerpo',
        en(-6, yP + 11, -9) === B.STONE && en(6, yP + 11, -9) === B.STONE &&
        en(6, yP + 12, -9) === B.AIR && yP + 11 > yC + 1);
    check('parapeto perimetral de 1 de alto en la cima',
        en(6, yC + 1, 0) === B.STONE && en(-6, yC + 1, 3) === B.STONE &&
        en(5, yC + 1, 0) === B.AIR);
    check('contrafuertes de COBBLE en las 4 esquinas',
        [[10, 10], [-10, 10], [10, -10], [-10, -10]].every(([x, z]) => {
            const b = en(x, yP + 3, z);
            return b === B.COBBLE || b === B.MOSSY_COBBLE;
        }));
    check('nada del templo por encima de y=62', sobre62 === 0);

    // la superficie del origen ES el templo: la lógica de spawn de siempre
    // deja al jugador de pie sobre la claraboya de la cima
    check('la columna del origen culmina en la cima (spawn sobre el templo)',
        world.surfaceY(0, 0) === yC && world.get(0, yC, 0) === B.GLASS);

    // un chunk lejano ni contiene templo ni se contamina por generarlo antes
    const lejosFresco = new Generator(12345).generateChunk(40, 40);
    const lejosTras = gA.generateChunk(40, 40); // gA ya generó el templo entero
    check('chunk lejano (40,40) idéntico se genere o no el templo antes',
        Buffer.from(lejosFresco).equals(Buffer.from(lejosTras)));
    check('el chunk lejano no contiene bloques del templo',
        [B.GLASS, B.TORCH, B.CHEST, B.CRAFTING_TABLE, B.FURNACE, B.BED,
            B.COBBLE, B.MOSSY_COBBLE].every((id) => !lejosFresco.includes(id)));
}

console.log(`\nResultado: ${pass} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

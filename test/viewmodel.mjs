/* Pruebas de la mano en primera persona (viewmodel): geometría y pose son
   funciones puras sin WebGL, así que se validan en Node proyectando con las
   mismas matrices del juego.  Uso: node test/viewmodel.mjs */
const base = new URL('../js/', import.meta.url).href;

const { blockMesh, spriteMesh, armMesh, armTexture, handMatrix, SWING_DUR } =
    await import(base + 'viewmodel.js');
const { B, DEFS } = await import(base + 'blocks.js');
const { TILE_PX, ATLAS_GRID, tileUV } = await import(base + 'atlas.js');
const { mat4Perspective } = await import(base + 'math.js');

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log('  OK  ' + name); }
    else { fail++; console.log('  FALLA ' + name); }
}

/* ---- utilidades: proyección con la perspectiva del juego (70°, 16:9) ---- */

const PROJ = mat4Perspective(new Float32Array(16), 70 * Math.PI / 180, 16 / 9, 0.05, 8);

function mulVec(m, v) {
    const r = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        r[i] = m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i] * v[3];
    }
    return r;
}

/** Punto de modelo → coordenadas NDC de pantalla ([-1,1]², y arriba). */
function proyectar(model, p) {
    const w = mulVec(model, [p[0], p[1], p[2], 1]);
    const c = mulVec(PROJ, w);
    return [c[0] / c[3], c[1] / c[3]];
}

/* ---- geometría ---- */

console.log('== Geometría del cubo en mano ==');
{
    const mesh = blockMesh(DEFS[B.STONE]);
    check('6 caras × 2 triángulos (216 floats)', mesh.length === 216);
    let dentro = true, uvOk = true;
    for (let i = 0; i < mesh.length; i += 6) {
        if (Math.abs(mesh[i]) > 0.5 || Math.abs(mesh[i + 1]) > 0.5 || Math.abs(mesh[i + 2]) > 0.5) dentro = false;
        if (mesh[i + 3] < 0 || mesh[i + 3] > 1 || mesh[i + 4] < 0 || mesh[i + 4] > 1) uvOk = false;
    }
    check('vértices dentro del cubo unitario centrado', dentro);
    check('UVs dentro del atlas', uvOk);
    const [u0, v0, u1, v1] = tileUV(DEFS[B.STONE].top);
    let topOk = true; // la primera cara es la superior: sus UVs, en su tésela
    for (let i = 0; i < 36; i += 6) {
        if (mesh[i + 3] < u0 || mesh[i + 3] > u1 || mesh[i + 4] < v0 || mesh[i + 4] > v1) topOk = false;
    }
    check('la cara superior usa la tésela top del bloque', topOk);
}

console.log('== Sprite extruido (item en mano) ==');
{
    // atlas sintético: la tésela 5 es un cuadrado lleno; la 7, un solo píxel
    const atlas = { width: ATLAS_GRID * TILE_PX, data: new Uint8Array(256 * 256 * 4) };
    const marca = (tile, c, r) => {
        const tx = (tile % ATLAS_GRID) * TILE_PX, ty = Math.floor(tile / ATLAS_GRID) * TILE_PX;
        atlas.data[((ty + r) * atlas.width + tx + c) * 4 + 3] = 255;
    };
    for (let r = 0; r < TILE_PX; r++) for (let c = 0; c < TILE_PX; c++) marca(5, c, r);
    marca(7, 3, 4);

    const lleno = spriteMesh(5, atlas);
    // frente + dorso (12 vértices) + 4 paredes por el perímetro (16 por lado)
    check('tésela llena: 12 + 64×6 vértices', lleno.length / 6 === 12 + 64 * 6);
    const solo = spriteMesh(7, atlas);
    check('un píxel: 12 + 4×6 vértices (4 paredes)', solo.length / 6 === 12 + 4 * 6);
    let zOk = true, caja = true;
    for (let i = 0; i < lleno.length; i += 6) {
        if (Math.abs(lleno[i + 2]) > 1 / 32 + 1e-6) zOk = false;
        if (lleno[i] < -1e-6 || lleno[i] > 1 + 1e-6 || lleno[i + 1] < -1e-6 || lleno[i + 1] > 1 + 1e-6) caja = false;
    }
    check('grosor de 1 px (z ±1/32)', zOk);
    check('el sprite ocupa [0,1]²', caja);
}

console.log('== Brazo (mano vacía) ==');
{
    const mesh = armMesh();
    check('caja de 6 caras (216 floats)', mesh.length === 216);
    let maxY = -Infinity, minY = Infinity;
    for (let i = 0; i < mesh.length; i += 6) {
        maxY = Math.max(maxY, mesh[i + 1]);
        minY = Math.min(minY, mesh[i + 1]);
    }
    check('el puño culmina en y=0 y el hombro queda por debajo de −0,8',
        maxY === 0 && minY < -0.8);
    const a = armTexture(), b = armTexture();
    check('piel 16×16 RGBA opaca y determinista',
        a.data.length === 16 * 16 * 4 &&
        a.data.every((v, i) => v === b.data[i]) &&
        a.data.every((v, i) => (i % 4 !== 3) || v === 255));
}

console.log('== Pose en pantalla ==');
{
    const m = new Float32Array(16);

    // bloque en reposo (p=1: curvas de golpe a cero): abajo a la derecha
    handMatrix(m, 'block', 1, 1, 0, 0);
    const [cx, cy] = proyectar(m, [0, 0, 0]);
    check('bloque en reposo en el cuadrante inferior derecho',
        cx > 0.2 && cx < 1.1 && cy < -0.5);
    const [, cyTop] = proyectar(m, [0, 0.5, 0]);
    check('la cara superior del bloque asoma en pantalla', cyTop > -1 && cyTop < 0);

    // golpe a medias: el bloque barre hacia el centro-abajo (se desplaza)
    handMatrix(m, 'block', 1, 0.5, 0, 0);
    const [sx] = proyectar(m, [0, 0, 0]);
    check('el golpe desplaza el bloque hacia la izquierda', sx < cx - 0.1);

    // cambio de ítem: con equip 0 la mano queda claramente más abajo
    handMatrix(m, 'block', 0, 1, 0, 0);
    const [, cyBaja] = proyectar(m, [0, 0, 0]);
    check('equip 0 hunde la mano', cyBaja < cy - 0.5);

    // brazo: puño visible abajo a la derecha, hombro fuera de pantalla
    handMatrix(m, 'arm', 1, 1, 0, 0);
    const [px, py] = proyectar(m, [0, 0, 0]);
    check('puño visible en el cuadrante inferior derecho',
        px > 0.3 && px < 1 && py > -1 && py < -0.4);
    const [hx, hy] = proyectar(m, [0, -0.9, 0]);
    check('el hombro nace fuera de pantalla (esquina inferior derecha)',
        hx > 1 || hy < -1);

    // sprite en reposo: el centro del item, a la derecha y bajo el horizonte
    handMatrix(m, 'sprite', 1, 1, 0, 0);
    const [ix, iy] = proyectar(m, [0.5, 0.5, 0]);
    check('item plano a la derecha y bajo el centro', ix > 0.2 && iy < 0);
    const [, iyTop] = proyectar(m, [0.5, 1, 0]);
    check('la cabeza de la herramienta asoma claramente', iyTop > -0.8);

    check('SWING_DUR encadena con la repetición de acción (0,25 s)', SWING_DUR === 0.25);
}

console.log(`\nResultado: ${pass} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

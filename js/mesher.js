/**
 * Mallado de chunks: convierte una región 16×16×64 del mundo en triángulos.
 *
 * - Culling de caras: solo se emiten caras contra vecinos no opacos.
 * - Iluminación por vértice: sombreado por cara × luz solar de columna ×
 *   oclusión ambiental (AO) de 3 vecinos por esquina.
 * - Dos mallas por chunk: sólida (con recorte alfa para hojas/cristal/plantas)
 *   y de agua (translúcida, se dibuja después con blending).
 *
 * Formato de vértice: [x, y, z, u, v, luz] — stride 6 floats. El atributo de
 * luz CODIFICA dos canales en un solo float: la parte fraccionaria es la luz
 * solar (recortada a ≤0.96) y la parte entera es la luz de bloque 0..15 de la
 * celda que da la cara (antorchas/lava); el shader las separa con fract/floor.
 */
import { B, DEFS } from './blocks.js';
import { tileUV } from './atlas.js';
import { CHUNK } from './world.js';

const SUN_SHADOW = 0.55; // multiplicador de luz para celdas sin sol directo
const SUN_MAX = 0.96;    // tope del canal solar (deja libre la parte entera)
const PANEL_Z0 = 0.40, PANEL_Z1 = 0.60; // grosor de los paneles finos (en z o en x según def.panel)
const FENCE_P0 = 0.375, FENCE_P1 = 0.625;         // sección del poste de la valla
const FENCE_T0 = 0.44, FENCE_T1 = 0.56;           // sección transversal de los travesaños
const FENCE_RAILS = [[0.36, 0.54], [0.72, 0.90]]; // bandas de altura de los travesaños

/** Las 6 caras del cubo: normal, sombreado y esquinas en orden de perímetro. */
const FACES = [
    { n: [1, 0, 0],  shade: 0.6, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: [-1, 0, 0], shade: 0.6, corners: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] },
    { n: [0, 1, 0],  shade: 1.0, corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
    { n: [0, -1, 0], shade: 0.5, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1],  shade: 0.8, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], shade: 0.8, corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },
];

/** UV local (0..1) de una esquina según la orientación de la cara. */
function cornerUV(normal, pos) {
    if (normal[1] !== 0) return [pos[0], pos[2]];       // techo/suelo: planta
    if (normal[0] !== 0) return [pos[2], 1 - pos[1]];   // este/oeste
    return [pos[0], 1 - pos[1]];                        // norte/sur
}

/** Ejes tangentes a la normal (para la prueba de AO por esquina). */
function tangentAxes(normal) {
    if (normal[0] !== 0) return [1, 2];
    if (normal[1] !== 0) return [0, 2];
    return [0, 1];
}

function occludes(world, x, y, z) {
    return DEFS[world.get(x, y, z)].opaque;
}

/** AO clásica: dos lados y la esquina diagonal alrededor del vértice. */
function vertexAO(world, nx, ny, nz, ta, tb, sa, sb) {
    const cell = [nx, ny, nz];
    const c1 = cell.slice(); c1[ta] += sa;
    const c2 = cell.slice(); c2[tb] += sb;
    const cc = cell.slice(); cc[ta] += sa; cc[tb] += sb;
    const s1 = occludes(world, c1[0], c1[1], c1[2]) ? 1 : 0;
    const s2 = occludes(world, c2[0], c2[1], c2[2]) ? 1 : 0;
    if (s1 && s2) return 0.5;
    const corner = occludes(world, cc[0], cc[1], cc[2]) ? 1 : 0;
    return 1 - 0.16 * (s1 + s2 + corner);
}

function emitFace(out, world, x, y, z, face, tile, topH, bright) {
    const [u0, v0, u1, v1] = tileUV(tile);
    const [nx, ny, nz] = [x + face.n[0], y + face.n[1], z + face.n[2]];
    const [ta, tb] = tangentAxes(face.n);
    const sun = bright ? 1 : (world.sunlit(nx, ny, nz) ? 1 : SUN_SHADOW);
    // luz de bloque de la celda que da la cara (constante en las 4 esquinas:
    // la parte entera no varía dentro del triángulo y fract interpola bien)
    const luzBloque = world.blockLightAt(nx, ny, nz);

    const verts = face.corners.map((pos) => {
        const [lu, lv] = cornerUV(face.n, pos);
        const ao = bright ? 1 : vertexAO(world, nx, ny, nz, ta, tb, pos[ta] ? 1 : -1, pos[tb] ? 1 : -1);
        return [
            x + pos[0],
            y + (pos[1] ? topH : 0),
            z + pos[2],
            u0 + lu * (u1 - u0),
            v0 + lv * (v1 - v0),
            Math.min(face.shade * sun * ao, SUN_MAX) + luzBloque,
        ];
    });
    // dos triángulos: 0-1-2 y 0-2-3
    out.push(...verts[0], ...verts[1], ...verts[2], ...verts[0], ...verts[2], ...verts[3]);
}

/** Planta en X: dos quads diagonales a plena luz del bloque. */
function emitCross(out, world, x, y, z, tile) {
    const [u0, v0, u1, v1] = tileUV(tile);
    const sun = world.sunlit(x, y, z) ? 1 : SUN_SHADOW;
    // la propia celda aporta la luz de bloque (una antorcha se ilumina a sí misma)
    const luz = Math.min(sun, SUN_MAX) + world.blockLightAt(x, y, z);
    const quads = [
        [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]],
        [[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]],
    ];
    for (const quad of quads) {
        const verts = quad.map((pos) => [
            x + pos[0], y + pos[1], z + pos[2],
            u0 + pos[0] * (u1 - u0),
            v0 + (1 - pos[1]) * (v1 - v0),
            luz,
        ]);
        out.push(...verts[0], ...verts[1], ...verts[2], ...verts[0], ...verts[2], ...verts[3]);
    }
}

/** Retranqueo de la hoja abierta respecto a su jamba (evita el z-fighting). */
const BISAGRA = 0.04;

/**
 * Panel fino (puerta/ventana): caja y∈[0,1] con el grosor (0.2) en un eje.
 * La ORIENTACIÓN sale de las JAMBAS vecinas (bloques sólidos u otros
 * paneles): la hoja cerrada y la ventana se alinean con el muro que las
 * enmarca (muro a lo largo de x → grosor en z, y viceversa) y la hoja
 * abierta gira 90° y se PEGA a la jamba de su bisagra, en vez de quedarse
 * centrada en el vano. Sin jambas claras se cae al clásico (grosor en z;
 * abierta contra x−). Las caras grandes llevan la tésela completa y los
 * cantos franjas de def.edge (o de la propia tésela). Sin AO (caja
 * retranqueada); la luz es la de la propia celda. La colisión no cambia.
 */
function emitPanel(out, world, x, y, z, id, def) {
    const [u0, v0, u1, v1] = tileUV(def.side);
    const [eu0, ev0, eu1, ev1] = tileUV(def.edge !== null ? def.edge : def.side);
    const deu = eu1 - eu0, dev = ev1 - ev0;
    const grosor = PANEL_Z1 - PANEL_Z0; // 0.2 ≈ 3 px de tésela
    const sun = world.sunlit(x, y, z) ? 1 : SUN_SHADOW;
    const luzBloque = world.blockLightAt(x, y, z);
    const luz = (shade) => Math.min(shade * sun, SUN_MAX) + luzBloque;
    const quad = (a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);

    const esPuertaId = (i) => i === B.DOOR_CLOSED || i === B.DOOR_OPEN ||
        i === B.DOOR_TOP_CLOSED || i === B.DOOR_TOP_OPEN;
    const puerta = esPuertaId(id);
    const abierta = id === B.DOOR_OPEN || id === B.DOOR_TOP_OPEN;
    const yBase = (id === B.DOOR_TOP_CLOSED || id === B.DOOR_TOP_OPEN) ? y - 1 : y;

    // jamba: sólido u otro panel en el vecino; para la puerta cuenta a la
    // altura de cualquiera de sus dos hojas (el marco puede no llegar a ambas)
    const jamba = (dx, dz) => {
        const ys = puerta ? [yBase, yBase + 1] : [y];
        return ys.some((yy) => {
            const n = DEFS[world.get(x + dx, yy, z + dz)];
            return n.solid || !!n.panel;
        });
    };
    const jx0 = jamba(-1, 0), jx1 = jamba(1, 0);
    const jz0 = jamba(0, -1), jz1 = jamba(0, 1);
    // el muro corre a lo largo de x salvo que SOLO haya jambas en z
    const muroEnX = !((jz0 || jz1) && !(jx0 || jx1));

    // eje del grosor y borde inferior de la caja dentro del bloque
    let grosorEnX, off;
    if (!puerta || !abierta) {
        grosorEnX = !muroEnX;   // cerrada/ventana: en el plano del muro
        off = PANEL_Z0;         // centrada en el vano
    } else if (muroEnX) {
        grosorEnX = true;       // abierta: girada 90°, pegada a su bisagra
        off = (jx1 && !jx0) ? 1 - BISAGRA - grosor : BISAGRA;
    } else {
        grosorEnX = false;
        off = (jz1 && !jz0) ? 1 - BISAGRA - grosor : BISAGRA;
    }

    // un canto se oculta contra vecinos opacos, contra la otra hoja del par
    // o contra otra ventana contigua (las cajas encajan)
    const cantoOculto = (nId) => DEFS[nId].opaque ||
        (puerta ? esPuertaId(nId) : nId === id);

    if (grosorEnX) {
        // grosor en x: caras grandes mirando a ±x
        const x0 = x + off, x1 = x + off + grosor;
        for (const xc of [x0, x1]) {
            const l = luz(0.6);
            quad([xc, y, z, u0, v1, l], [xc, y, z + 1, u1, v1, l],
                 [xc, y + 1, z + 1, u1, v0, l], [xc, y + 1, z, u0, v0, l]);
        }
        // cantos ±z: franja vertical del listón
        for (const dz of [-1, 1]) {
            if (cantoOculto(world.get(x, y, z + dz))) continue;
            const zc = dz < 0 ? z : z + 1, l = luz(0.8);
            quad([x0, y, zc, eu0, ev1, l], [x1, y, zc, eu0 + grosor * deu, ev1, l],
                 [x1, y + 1, zc, eu0 + grosor * deu, ev0, l], [x0, y + 1, zc, eu0, ev0, l]);
        }
        // cantos ±y: franja del listón a lo largo de z
        for (const dy of [-1, 1]) {
            if (cantoOculto(world.get(x, y + dy, z))) continue;
            const yc = dy < 0 ? y : y + 1, l = luz(dy < 0 ? 0.5 : 1.0);
            quad([x0, yc, z, eu0, ev0, l], [x1, yc, z, eu0 + grosor * deu, ev0, l],
                 [x1, yc, z + 1, eu0 + grosor * deu, ev0 + dev, l], [x0, yc, z + 1, eu0, ev0 + dev, l]);
        }
        return;
    }

    // grosor en z: caras grandes mirando a ±z
    const z0 = z + off, z1 = z + off + grosor;
    for (const zc of [z0, z1]) {
        const l = luz(0.8);
        quad([x, y, zc, u0, v1, l], [x + 1, y, zc, u1, v1, l],
             [x + 1, y + 1, zc, u1, v0, l], [x, y + 1, zc, u0, v0, l]);
    }
    // cantos ±x: franja vertical
    for (const dx of [-1, 1]) {
        if (cantoOculto(world.get(x + dx, y, z))) continue;
        const xc = dx < 0 ? x : x + 1, l = luz(0.6);
        quad([xc, y, z0, eu0, ev1, l], [xc, y, z1, eu0 + grosor * deu, ev1, l],
             [xc, y + 1, z1, eu0 + grosor * deu, ev0, l], [xc, y + 1, z0, eu0, ev0, l]);
    }
    // cantos ±y: franja horizontal (arriba claro, abajo oscuro, como los cubos)
    for (const dy of [-1, 1]) {
        if (cantoOculto(world.get(x, y + dy, z))) continue;
        const yc = dy < 0 ? y : y + 1, l = luz(dy < 0 ? 0.5 : 1.0);
        quad([x, yc, z0, eu0, ev0, l], [x + 1, yc, z0, eu1, ev0, l],
             [x + 1, yc, z1, eu1, ev0 + grosor * dev, l], [x, yc, z1, eu0, ev0 + grosor * dev, l]);
    }
}

/**
 * Caja alineada a ejes dentro de la celda (x,y,z): límites locales en 0..1.
 * Cada cara toma como UV la subregión de la tésela correspondiente a su
 * huella (mismo criterio que las franjas de emitPanel), así el poste y los
 * travesaños de la valla comparten la textura sin costuras. `skip` es una
 * máscara de bits para omitir caras ocultas (orden: +x,-x,+y,-y,+z,-z).
 * Sin AO (geometría retranqueada); `luz` viene precalculada de la celda.
 */
function emitBox(out, x, y, z, box, uv, luz, skip = 0) {
    const [bx0, by0, bz0, bx1, by1, bz1] = box;
    const [u0, v0, u1, v1] = uv;
    const U = (f) => u0 + f * (u1 - u0);
    const V = (f) => v0 + f * (v1 - v0);
    const quad = (a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
    // caras ±x (v = 1-y para no invertir la textura en vertical)
    for (const [bit, xf] of [[0, bx1], [1, bx0]]) {
        if (skip & (1 << bit)) continue;
        const l = luz(0.6), xc = x + xf;
        quad([xc, y + by0, z + bz0, U(bz0), V(1 - by0), l],
             [xc, y + by0, z + bz1, U(bz1), V(1 - by0), l],
             [xc, y + by1, z + bz1, U(bz1), V(1 - by1), l],
             [xc, y + by1, z + bz0, U(bz0), V(1 - by1), l]);
    }
    // caras ±y (planta: u = x, v = z; arriba claro, abajo oscuro)
    for (const [bit, yf, shade] of [[2, by1, 1.0], [3, by0, 0.5]]) {
        if (skip & (1 << bit)) continue;
        const l = luz(shade), yc = y + yf;
        quad([x + bx0, yc, z + bz0, U(bx0), V(bz0), l],
             [x + bx1, yc, z + bz0, U(bx1), V(bz0), l],
             [x + bx1, yc, z + bz1, U(bx1), V(bz1), l],
             [x + bx0, yc, z + bz1, U(bx0), V(bz1), l]);
    }
    // caras ±z
    for (const [bit, zf] of [[4, bz1], [5, bz0]]) {
        if (skip & (1 << bit)) continue;
        const l = luz(0.8), zc = z + zf;
        quad([x + bx0, y + by0, zc, U(bx0), V(1 - by0), l],
             [x + bx1, y + by0, zc, U(bx1), V(1 - by0), l],
             [x + bx1, y + by1, zc, U(bx1), V(1 - by1), l],
             [x + bx0, y + by1, zc, U(bx0), V(1 - by1), l]);
    }
}

/**
 * Valla 3D: poste central (x,z∈[0.375,0.625], y∈[0,1]) y, por cada vecino
 * horizontal conectable (otra valla o un sólido opaco), DOS travesaños desde
 * el poste hasta el borde del bloque. Los extremos de los travesaños no
 * emiten cara: contra otra valla el travesaño continúa sin costura, contra
 * un muro opaco quedaría pegada, y contra el poste propio queda dentro.
 * La colisión no cambia (la def sigue siendo un sólido de bloque completo).
 */
function emitFence(out, world, x, y, z, def) {
    const uv = tileUV(def.side);
    const sun = world.sunlit(x, y, z) ? 1 : SUN_SHADOW;
    const luzBloque = world.blockLightAt(x, y, z);
    const luz = (shade) => Math.min(shade * sun, SUN_MAX) + luzBloque;

    // poste central: tapa y base solo si el vecino vertical no las oculta
    let skipPoste = 0;
    if (DEFS[world.get(x, y + 1, z)].opaque) skipPoste |= 1 << 2;
    if (DEFS[world.get(x, y - 1, z)].opaque) skipPoste |= 1 << 3;
    emitBox(out, x, y, z, [FENCE_P0, 0, FENCE_P0, FENCE_P1, 1, FENCE_P1], uv, luz, skipPoste);

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nDef = DEFS[world.get(x + dx, y, z + dz)];
        if (!nDef.fence && !(nDef.solid && nDef.opaque)) continue; // no conecta
        for (const [ry0, ry1] of FENCE_RAILS) {
            if (dx !== 0) { // travesaño a lo largo de x: extremos ±x ocultos
                const box = dx > 0 ? [FENCE_P1, ry0, FENCE_T0, 1, ry1, FENCE_T1]
                                   : [0, ry0, FENCE_T0, FENCE_P0, ry1, FENCE_T1];
                emitBox(out, x, y, z, box, uv, luz, (1 << 0) | (1 << 1));
            } else {        // travesaño a lo largo de z: extremos ±z ocultos
                const box = dz > 0 ? [FENCE_T0, ry0, FENCE_P1, FENCE_T1, ry1, 1]
                                   : [FENCE_T0, ry0, 0, FENCE_T1, ry1, FENCE_P0];
                emitBox(out, x, y, z, box, uv, luz, (1 << 4) | (1 << 5));
            }
        }
    }
}

/**
 * Malla un chunk (cx, cz). Devuelve {solid, water} como Float32Array
 * (posiciones en coordenadas de mundo; no hace falta matriz por chunk).
 */
export function meshChunk(world, cx, cz) {
    const solid = [], water = [];
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const x1 = x0 + CHUNK, z1 = z0 + CHUNK;

    for (let x = x0; x < x1; x++) {
        for (let z = z0; z < z1; z++) {
            for (let y = 0; y < world.sy; y++) {
                const id = world.get(x, y, z);
                if (id === B.AIR) continue;
                const def = DEFS[id];

                if (def.cross) {
                    emitCross(solid, world, x, y, z, def.side);
                    continue;
                }

                if (def.panel) {
                    emitPanel(solid, world, x, y, z, id, def);
                    continue;
                }

                if (def.fence) {
                    emitFence(solid, world, x, y, z, def);
                    continue;
                }

                const isWater = id === B.WATER;
                const out = isWater ? water : solid;
                // superficie del agua ligeramente hundida
                const topH = isWater && world.get(x, y + 1, z) !== B.WATER ? 0.875 : 1;

                for (const face of FACES) {
                    const nId = world.get(x + face.n[0], y + face.n[1], z + face.n[2]);
                    if (DEFS[nId].opaque) continue;
                    if (def.hideSame && nId === id) continue;
                    const tile = face.n[1] > 0 ? def.top : (face.n[1] < 0 ? def.bottom : def.side);
                    emitFace(out, world, x, y, z, face, tile, topH, def.bright);
                }
            }
        }
    }
    return { solid: new Float32Array(solid), water: new Float32Array(water) };
}

/**
 * Mallado de chunks: convierte una región 16×16×64 del mundo en triángulos.
 *
 * - Culling de caras: solo se emiten caras contra vecinos no opacos.
 * - Iluminación por vértice: sombreado por cara × luz solar de columna ×
 *   oclusión ambiental (AO) de 3 vecinos por esquina.
 * - Dos mallas por chunk: sólida (con recorte alfa para hojas/cristal/plantas)
 *   y de agua (translúcida, se dibuja después con blending).
 *
 * Formato de vértice: [x, y, z, u, v, luz] — stride 6 floats.
 */
import { B, DEFS } from './blocks.js';
import { tileUV } from './atlas.js';
import { CHUNK } from './world.js';

const SUN_SHADOW = 0.55; // multiplicador de luz para celdas sin sol directo

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

    const verts = face.corners.map((pos) => {
        const [lu, lv] = cornerUV(face.n, pos);
        const ao = bright ? 1 : vertexAO(world, nx, ny, nz, ta, tb, pos[ta] ? 1 : -1, pos[tb] ? 1 : -1);
        return [
            x + pos[0],
            y + (pos[1] ? topH : 0),
            z + pos[2],
            u0 + lu * (u1 - u0),
            v0 + lv * (v1 - v0),
            face.shade * sun * ao,
        ];
    });
    // dos triángulos: 0-1-2 y 0-2-3
    out.push(...verts[0], ...verts[1], ...verts[2], ...verts[0], ...verts[2], ...verts[3]);
}

/** Planta en X: dos quads diagonales a plena luz del bloque. */
function emitCross(out, world, x, y, z, tile) {
    const [u0, v0, u1, v1] = tileUV(tile);
    const sun = world.sunlit(x, y, z) ? 1 : SUN_SHADOW;
    const quads = [
        [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]],
        [[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]],
    ];
    for (const quad of quads) {
        const verts = quad.map((pos) => [
            x + pos[0], y + pos[1], z + pos[2],
            u0 + pos[0] * (u1 - u0),
            v0 + (1 - pos[1]) * (v1 - v0),
            sun,
        ]);
        out.push(...verts[0], ...verts[1], ...verts[2], ...verts[0], ...verts[2], ...verts[3]);
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

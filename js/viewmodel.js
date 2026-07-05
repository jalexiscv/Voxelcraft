/**
 * Mano en primera persona (viewmodel), como en el Minecraft clásico: en la
 * esquina inferior derecha se ve lo que el jugador sostiene y su animación.
 *
 *  - Mano vacía: el brazo del jugador (caja 4×12 px con piel procedural).
 *  - Bloque en mano: el cubo con sus téselas, girado 45° (se ven dos caras
 *    y un asomo de la superior).
 *  - Ítem en mano (herramientas, comida, materiales) y bloques-plano
 *    (flores, antorcha, puerta): el sprite de 16×16 extruido a 3D píxel a
 *    píxel, sostenido en diagonal — el aspecto del MC original.
 *
 * Animaciones, calcadas de las curvas del ItemRenderer clásico (1.8):
 *  - Golpe (picar/atacar/usar): el arco diagonal con f=sin(p²·π) y
 *    f1=sin(√p·π) sobre traslación y rotaciones Y/Z/X.
 *  - Cambio de ítem: la mano baja 0,6 u, intercambia el objeto y sube.
 *  - Caminar: balanceo pendular ligado a la velocidad horizontal.
 *
 * Se dibuja tras el fotograma del mundo limpiando SOLO el búfer de
 * profundidad: la mano nunca se incrusta en las paredes. La geometría vive
 * en espacio de cámara (la cámara en el origen mirando a −Z), por lo que su
 * matriz de modelo es independiente de yaw/pitch y del mundo.
 *
 * Los constructores de geometría y la matriz de pose son funciones puras
 * exportadas (probables en Node sin WebGL); la clase ViewModel es el
 * pegamento con GL (reutiliza compile/makeVAO/atlasTex del Renderer).
 */
import { DEFS } from './blocks.js';
import { ITEM_DEFS, isItem } from './items.js';
import { tileUV, TILE_PX, ATLAS_GRID } from './atlas.js';
import {
    mat4Multiply, mat4Translate, mat4Perspective, mat4Scale,
    mat4RotateX, mat4RotateY, mat4RotateZ,
} from './math.js';

export const SWING_DUR = 0.25; // s por golpe: encadena con ACTION_REPEAT

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in float aLight;
uniform mat4 uProj;
uniform mat4 uModel;
out vec2 vUV;
out float vLight;
void main() {
    gl_Position = uProj * uModel * vec4(aPos, 1.0);
    vUV = aUV;
    vLight = aLight;
}`;

// Sin niebla (la mano está a <1 m de la cámara): luz = sombreado por cara
// (aLight) × luz local del jugador (uLight, ya trae día y luz de bloque).
const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in float vLight;
uniform sampler2D uTex;
uniform float uLight;
out vec4 outColor;
void main() {
    vec4 tex = texture(uTex, vUV);
    if (tex.a < 0.5) discard;
    outColor = vec4(tex.rgb * vLight * uLight, 1.0);
}`;

/* ---- Geometría (funciones puras, layout [pos3, uv2, luz1]) ---- */

/** Cubo unitario centrado (±0,5) con las téselas top/bottom/side del def. */
export function blockMesh(def) {
    const quads = [
        { c: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], luz: 1.0, cara: 'top' },
        { c: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], luz: 0.55, cara: 'bottom' },
        { c: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], luz: 0.65, cara: 'side' },
        { c: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]], luz: 0.65, cara: 'side' },
        { c: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]], luz: 0.8, cara: 'side' },
        { c: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], luz: 0.8, cara: 'side' },
    ];
    const data = [];
    for (const q of quads) {
        const [u0, v0, u1, v1] = tileUV(def[q.cara]);
        const uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
        for (const k of [0, 1, 2, 0, 2, 3]) {
            data.push(q.c[k][0] * 0.5, q.c[k][1] * 0.5, q.c[k][2] * 0.5, uv[k][0], uv[k][1], q.luz);
        }
    }
    return new Float32Array(data);
}

/**
 * Sprite de una tésela extruido a 3D (x,y ∈ [0,1], grosor 1 px): caras
 * frontal/trasera como quads completos (el recorte alfa del shader deja solo
 * los píxeles opacos) y una pared por cada borde píxel↔transparente, con el
 * color del propio píxel (UV clavada en su centro). Es la técnica del item
 * en mano del MC original.
 * @param {number} tile — índice de tésela del atlas
 * @param {ImageData|{data,width}} atlas — píxeles del atlas (alfa manda)
 */
export function spriteMesh(tile, atlas) {
    const T = 1 / 32;      // semigrosor: 1 px de sprite en total
    const P = 1 / TILE_PX; // tamaño de un píxel en unidades de modelo
    const [u0, v0, u1, v1] = tileUV(tile);
    const tx = (tile % ATLAS_GRID) * TILE_PX;
    const ty = Math.floor(tile / ATLAS_GRID) * TILE_PX;
    const opaco = (c, r) => {
        if (c < 0 || r < 0 || c >= TILE_PX || r >= TILE_PX) return false;
        return atlas.data[((ty + r) * atlas.width + tx + c) * 4 + 3] >= 128;
    };
    const data = [];
    const quad = (vv, uv, luz) => {
        for (const k of [0, 1, 2, 0, 2, 3]) {
            data.push(vv[k][0], vv[k][1], vv[k][2], uv[k][0], uv[k][1], luz);
        }
    };
    quad([[0, 0, T], [1, 0, T], [1, 1, T], [0, 1, T]],
        [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], 1.0);
    quad([[1, 0, -T], [0, 0, -T], [0, 1, -T], [1, 1, -T]],
        [[u1, v1], [u0, v1], [u0, v0], [u1, v0]], 0.75);
    for (let r = 0; r < TILE_PX; r++) {
        for (let c = 0; c < TILE_PX; c++) {
            if (!opaco(c, r)) continue;
            const cu = u0 + ((c + 0.5) / TILE_PX) * (u1 - u0);
            const cv = v0 + ((r + 0.5) / TILE_PX) * (v1 - v0);
            const uvp = [[cu, cv], [cu, cv], [cu, cv], [cu, cv]];
            const x0 = c * P, x1 = x0 + P;
            const y1 = (TILE_PX - r) * P, y0 = y1 - P; // la fila 0 es la de arriba
            if (!opaco(c - 1, r)) quad([[x0, y0, -T], [x0, y0, T], [x0, y1, T], [x0, y1, -T]], uvp, 0.6);
            if (!opaco(c + 1, r)) quad([[x1, y0, T], [x1, y0, -T], [x1, y1, -T], [x1, y1, T]], uvp, 0.6);
            if (!opaco(c, r - 1)) quad([[x0, y1, T], [x1, y1, T], [x1, y1, -T], [x0, y1, -T]], uvp, 0.85);
            if (!opaco(c, r + 1)) quad([[x0, y0, -T], [x1, y0, -T], [x1, y0, T], [x0, y0, T]], uvp, 0.5);
        }
    }
    return new Float32Array(data);
}

/**
 * Brazo del jugador: caja 4×12 px (0,25×0,9 u, algo más larga de lo real
 * para que nazca fuera de pantalla) con el puño en y=0 y el hombro hacia −Y.
 * UVs sobre la textura 16×16 de armTexture(): puño y hombro en la franja
 * superior, las cuatro caras largas repartidas debajo.
 */
export function armMesh() {
    const W = 0.125, L = 0.9;
    const x0 = -W, x1 = W, z0 = -W, z1 = W, y0 = -L, y1 = 0;
    const data = [];
    const quad = (vv, r, luz) => { // r: rect UV en píxeles [ux0, uy0, ux1, uy1]
        const uv = [[r[0] / 16, r[3] / 16], [r[2] / 16, r[3] / 16], [r[2] / 16, r[1] / 16], [r[0] / 16, r[1] / 16]];
        for (const k of [0, 1, 2, 0, 2, 3]) {
            data.push(vv[k][0], vv[k][1], vv[k][2], uv[k][0], uv[k][1], luz);
        }
    };
    quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 0, 4, 4], 1.0);    // puño
    quad([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], [4, 0, 8, 4], 0.55);   // hombro
    quad([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [0, 4, 4, 16], 0.7);
    quad([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], [4, 4, 8, 16], 0.7);
    quad([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], [8, 4, 12, 16], 0.85);
    quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [12, 4, 16, 16], 0.85);
    return new Float32Array(data);
}

/** Piel del brazo 16×16 (tono clásico con ruido determinista y curvatura). */
export function armTexture() {
    const w = 16, h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    let s = 20260705; // PRNG propio: misma piel en cada carga
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const d = (rnd() * 2 - 1) * 9;
            // leve sombreado cíclico cada 4 px: finge la curvatura del brazo
            const curva = 0.9 + 0.1 * Math.sin(Math.PI * ((x % 4) + 0.5) / 4);
            const i = (y * w + x) * 4;
            data[i] = (199 + d) * curva;
            data[i + 1] = (152 + d) * curva;
            data[i + 2] = (118 + d) * curva;
            data[i + 3] = 255;
        }
    }
    return { data, w, h };
}

/* ---- Pose (matriz de modelo en espacio de cámara) ---- */

const TMP = new Float32Array(16);

/**
 * Matriz de modelo de la mano según el tipo de objeto y la animación.
 * Bloques e ítems siguen la cadena del transformFirstPersonItem clásico
 * (traslación de uso + T(0,56, −0,52, −0,72) + Ry45 + rotaciones del golpe
 * + escala 0,4; los sprites añaden el display "firstperson" del item plano:
 * T(0, 4, 2)/16 · Ry(−135°) · Rz(25°) · escala 1,7 y recentrado).
 * @param {Float32Array} out — matriz 4×4 de salida
 * @param {'arm'|'block'|'sprite'} kind
 * @param {number} equip — 1 mano arriba, 0 abajo (cambio de ítem)
 * @param {number} p — progreso del golpe 0..1 (en reposo, 1: curvas a cero)
 * @param {number} bobX @param {number} bobY — balanceo del paso
 */
export function handMatrix(out, kind, equip, p, bobX, bobY) {
    const f = Math.sin(p * p * Math.PI);
    const f1 = Math.sin(Math.sqrt(p) * Math.PI);
    const f2 = Math.sin(Math.sqrt(p) * Math.PI * 2);
    const equipY = -0.6 * (1 - equip);
    const mul = (m) => mat4Multiply(out, out, m);

    if (kind === 'arm') {
        // puñetazo: barrido amplio hacia el centro con giro del antebrazo
        mat4Translate(out,
            0.46 - 0.3 * f1 + bobX,
            -0.34 + 0.4 * f2 + equipY + bobY,
            -0.6 - 0.4 * Math.sin(p * Math.PI));
        mul(mat4RotateY(TMP, f1 * 1.22));   // 70°
        mul(mat4RotateZ(TMP, f * -0.35));   // −20°
        // pose de reposo: cruza en diagonal desde la esquina inferior
        // derecha, con el puño levemente hacia la cámara y girado sobre
        // su eje para mostrar dos caras del antebrazo
        mul(mat4RotateZ(TMP, 0.9));
        mul(mat4RotateX(TMP, 0.2));
        mul(mat4RotateY(TMP, 0.8));
        return out;
    }

    mat4Translate(out,
        0.52 - 0.4 * f1 + bobX,
        -0.48 + 0.2 * f2 + equipY + bobY,
        -0.72 - 0.2 * Math.sin(p * Math.PI));
    mul(mat4RotateY(TMP, Math.PI / 4));
    mul(mat4RotateY(TMP, f * -0.35));       // −20°
    mul(mat4RotateZ(TMP, f1 * -0.35));      // −20°
    mul(mat4RotateX(TMP, f1 * -1.4));       // −80°: el "hachazo" hacia delante
    mul(mat4Scale(TMP, 0.4, 0.4, 0.4));
    if (kind === 'sprite') {
        mul(mat4Translate(TMP, 0, 0.25, 0.125));
        mul(mat4RotateY(TMP, -2.356));      // −135°
        mul(mat4RotateZ(TMP, 0.436));       // 25°
        mul(mat4Scale(TMP, 1.7, 1.7, 1.7));
        mul(mat4Translate(TMP, -0.5, -0.5, 0));
    }
    return out;
}

/* ---- Pegamento WebGL ---- */

export class ViewModel {
    /**
     * @param {Renderer} renderer — render principal (reutiliza gl y helpers)
     * @param {ImageData} atlasData — píxeles del atlas para las extrusiones
     */
    constructor(renderer, atlasData) {
        this.r = renderer;
        this.gl = renderer.gl;
        this.atlasData = atlasData;
        this.prog = renderer.compile(VS, FS);
        this.u = renderer.uniformMap(this.prog, ['uProj', 'uModel', 'uTex', 'uLight']);
        this.proj = new Float32Array(16);
        this.model = new Float32Array(16);

        this.armGeom = { ...renderer.makeVAO(armMesh()), kind: 'arm' };
        const piel = armTexture();
        this.armTex = this.makeTex(new Uint8Array(piel.data.buffer), piel.w, piel.h);
        this.cache = new Map(); // id → {vao, buf, n, kind}

        // estado de animación
        this.swingT = 0;    // s restantes del golpe en curso
        this.shownId = 0;   // lo que se ve AHORA (retrasa al cambio de ranura)
        this.equip = 1;     // 0 mano abajo .. 1 arriba
        this.bobPhase = 0;  // fase del péndulo del paso
        this.bobAmp = 0;    // amplitud suavizada según la velocidad
    }

    makeTex(data, w, h) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    /** Arranca (o reinicia) la animación de golpe. */
    swing() { this.swingT = SWING_DUR; }

    /**
     * Avanza las animaciones. Llamar desde simulate() (se congela en pausa).
     * @param {Player} player — para el balanceo del paso
     * @param {number} heldId — id efectivo en mano (0 = mano vacía)
     */
    update(dt, player, heldId) {
        if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt);
        // cambio de ítem: baja, intercambia al llegar abajo y vuelve a subir
        if (heldId !== this.shownId) {
            this.equip -= dt * 5;
            if (this.equip <= 0) { this.shownId = heldId; this.equip = 0; }
        } else if (this.equip < 1) {
            this.equip = Math.min(1, this.equip + dt * 5);
        }
        // balanceo pendular ligado a la marcha (solo con los pies en el suelo)
        const hSpeed = Math.hypot(player.vel[0], player.vel[2]);
        const target = player.onGround ? Math.min(hSpeed / 6, 1) : 0;
        this.bobAmp += (target - this.bobAmp) * Math.min(1, dt * 8);
        if (this.bobAmp > 0.01) this.bobPhase += hSpeed * dt * 1.6;
    }

    /** Geometría cacheada del id en mano (cubo, sprite extruido o null). */
    meshFor(id) {
        let g = this.cache.get(id);
        if (g !== undefined) return g;
        if (isItem(id)) {
            const it = ITEM_DEFS[id];
            g = it ? { ...this.r.makeVAO(spriteMesh(it.tile, this.atlasData)), kind: 'sprite' } : null;
        } else {
            const def = DEFS[id];
            if (!def) g = null;
            // plantas, antorchas y puertas se sostienen como item plano (MC real)
            else if (def.cross || def.panel) g = { ...this.r.makeVAO(spriteMesh(def.side, this.atlasData)), kind: 'sprite' };
            else g = { ...this.r.makeVAO(blockMesh(def)), kind: 'block' };
        }
        this.cache.set(id, g);
        return g;
    }

    /**
     * Dibuja la mano SOBRE el fotograma ya renderizado (limpia profundidad).
     * @param {object} f — {aspect, light} con light = luz local 0..1 del
     *   jugador (día/cueva/antorcha, calculada por el caller como en los mobs)
     */
    render(f) {
        const mesh = this.shownId ? this.meshFor(this.shownId) : this.armGeom;
        if (!mesh) return;
        const gl = this.gl;
        const p = SWING_DUR ? 1 - this.swingT / SWING_DUR : 1;
        const bobX = Math.sin(this.bobPhase) * 0.03 * this.bobAmp;
        const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.02 * this.bobAmp;

        gl.clear(gl.DEPTH_BUFFER_BIT); // la mano nunca se incrusta en el mundo
        gl.useProgram(this.prog);
        mat4Perspective(this.proj, 70 * Math.PI / 180, f.aspect, 0.05, 8);
        handMatrix(this.model, mesh.kind, this.equip, p, bobX, bobY);
        gl.uniformMatrix4fv(this.u.uProj, false, this.proj);
        gl.uniformMatrix4fv(this.u.uModel, false, this.model);
        gl.uniform1i(this.u.uTex, 0);
        gl.uniform1f(this.u.uLight, f.light);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mesh.kind === 'arm' ? this.armTex : this.r.atlasTex);
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
        gl.bindVertexArray(null);
        gl.useProgram(this.r.prog); // devolver el programa de chunks
    }
}

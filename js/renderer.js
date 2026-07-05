/**
 * Renderer WebGL2: atlas con filtrado nearest (estética pixelada), una malla
 * sólida y una de agua por chunk, niebla por distancia, factor día/noche,
 * sol y luna como billboards, cubo de selección y plano de nubes.
 */
import { moonUV } from './sky.js';
import { DEFS } from './blocks.js';
import { tileUV } from './atlas.js';
import { ITEM_DEFS, isItem } from './items.js';

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in float aLight;
uniform mat4 uPV;
out vec2 vUV;
out float vLight;
out vec3 vWorldPos;
void main() {
    gl_Position = uPV * vec4(aPos, 1.0);
    vUV = aUV;
    vLight = aLight;
    vWorldPos = aPos;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in float vLight;
in vec3 vWorldPos;
uniform sampler2D uTex;
uniform vec3 uCamPos;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uDay;
uniform float uCutoff;
uniform float uAlphaMul;
uniform vec2 uUVScroll;
out vec4 outColor;
void main() {
    vec4 tex = texture(uTex, vUV + uUVScroll);
    if (tex.a < uCutoff) discard;
    // vLight codifica dos canales: parte entera = luz de bloque 0..15
    // (antorchas/lava, no depende del día), fracción = luz solar (≤0.96)
    float bloque = floor(vLight) / 15.0;
    float sol = fract(vLight);
    vec3 lit = tex.rgb * max(sol * uDay, bloque);
    float dist = distance(vWorldPos, uCamPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    outColor = vec4(mix(lit, uFogColor, fog), tex.a * uAlphaMul);
}`;

const LINE_VS = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uPV;
uniform vec3 uPos;
void main() { gl_Position = uPV * vec4(aPos + uPos, 1.0); }`;

const LINE_FS = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() { outColor = uColor; }`;

// Astros (sol/luna): quad billboard sin niebla ni factor día — brillan con
// luz propia. La esquina (±1,±1) se expande con los ejes de la cámara.
const SKY_VS = `#version 300 es
layout(location=0) in vec2 aCorner;
uniform mat4 uPV;
uniform vec3 uCenter;
uniform vec3 uRight;
uniform vec3 uUp;
uniform float uSize;
uniform vec4 uUVRect;
out vec2 vUV;
void main() {
    vec3 pos = uCenter + (uRight * aCorner.x + uUp * aCorner.y) * uSize * 0.5;
    gl_Position = uPV * vec4(pos, 1.0);
    vUV = mix(uUVRect.xy, uUVRect.zw, aCorner * 0.5 + 0.5);
}`;

const SKY_FS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec3 uTint;
out vec4 outColor;
void main() {
    vec4 tex = texture(uTex, vUV);
    outColor = vec4(tex.rgb * uTint, tex.a);
}`;

// Partículas: quads billboard con color RGBA por vértice (el tinte del
// gradiente Molang) y niebla, para que las nubes de humo se fundan con la
// lejanía como el terreno. Las esquinas se expanden con los ejes de cámara.
const PART_VS = `#version 300 es
layout(location=0) in vec3 aCenter;
layout(location=1) in vec2 aCorner;
layout(location=2) in vec2 aUV;
layout(location=3) in float aSize;
layout(location=4) in vec4 aColor;
uniform mat4 uPV;
uniform vec3 uRight;
uniform vec3 uUp;
out vec2 vUV;
out vec4 vColor;
out vec3 vWorld;
void main() {
    vec3 pos = aCenter + (uRight * aCorner.x + uUp * aCorner.y) * aSize * 0.5;
    vWorld = pos;
    gl_Position = uPV * vec4(pos, 1.0);
    vUV = aUV;
    vColor = aColor;
}`;

const PART_FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vColor;
in vec3 vWorld;
uniform sampler2D uTex;
uniform vec3 uCamPos;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
out vec4 outColor;
void main() {
    vec4 tex = texture(uTex, vUV);
    float a = tex.a * vColor.a;
    if (a < 0.02) discard;
    vec3 rgb = tex.rgb * vColor.rgb;
    float dist = distance(vWorld, uCamPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    outColor = vec4(mix(rgb, uFogColor, fog), a);
}`;

const STRIDE = 6 * 4; // 6 floats por vértice

// layout de un vértice de partícula: centro3, corner2, uv2, size1, color4
const PART_STRIDE = 12 * 4;

/* Esquinas y luz de las 6 caras del cubito de drop (semiarista 1, se escala).
   Luz ≤0.96: el shader decodifica la parte entera como luz de bloque. */
const DROP_QUADS = [
    { c: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], luz: 0.96, cara: 'top' },
    { c: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], luz: 0.55, cara: 'bottom' },
    { c: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], luz: 0.8, cara: 'side' },
    { c: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]], luz: 0.8, cara: 'side' },
    { c: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]], luz: 0.7, cara: 'side' },
    { c: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], luz: 0.7, cara: 'side' },
];

export class Renderer {
    constructor(canvas, atlasCanvas, cloudCanvas, sunCanvas, moonCanvas, particleCanvas) {
        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!gl) throw new Error('WebGL2 no disponible');
        this.gl = gl;
        this.canvas = canvas;

        this.prog = this.compile(VS, FS);
        this.lineProg = this.compile(LINE_VS, LINE_FS);
        this.skyProg = this.compile(SKY_VS, SKY_FS);
        this.partProg = this.compile(PART_VS, PART_FS);
        this.u = this.uniformMap(this.prog, ['uPV', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar', 'uDay', 'uCutoff', 'uAlphaMul', 'uUVScroll']);
        this.lu = this.uniformMap(this.lineProg, ['uPV', 'uPos', 'uColor']);
        this.su = this.uniformMap(this.skyProg, ['uPV', 'uCenter', 'uRight', 'uUp', 'uSize', 'uUVRect', 'uTex', 'uTint']);
        this.pu = this.uniformMap(this.partProg, ['uPV', 'uRight', 'uUp', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar']);

        this.atlasTex = this.makeTexture(atlasCanvas, gl.CLAMP_TO_EDGE);
        this.cloudTex = this.makeTexture(cloudCanvas, gl.REPEAT);
        // nearest también en los astros, por coherencia con la estética pixelada
        this.sunTex = sunCanvas ? this.makeTexture(sunCanvas, gl.CLAMP_TO_EDGE) : null;
        this.moonTex = moonCanvas ? this.makeTexture(moonCanvas, gl.CLAMP_TO_EDGE) : null;
        this.particleTex = particleCanvas ? this.makeTexture(particleCanvas, gl.CLAMP_TO_EDGE) : null;

        this.chunks = new Map(); // "cx,cz" → {solid:{vao,buf,n}, water:{...}}
        this.selectionVAO = this.makeSelectionCube();
        this.skyQuadVAO = this.makeSkyQuad();
        this.cloud = null;

        // búfer dinámico de los drops (se rellena cada fotograma)
        this.dropVAO = gl.createVertexArray();
        this.dropBuf = gl.createBuffer();
        gl.bindVertexArray(this.dropVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dropBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE, 20);
        gl.bindVertexArray(null);

        // búfer dinámico de partículas: centro3, corner2, uv2, size1, color4
        this.partVAO = gl.createVertexArray();
        this.partBuf = gl.createBuffer();
        gl.bindVertexArray(this.partVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
        const off = [0, 12, 20, 28, 32], sz = [3, 2, 2, 1, 4];
        for (let a = 0; a < 5; a++) {
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, sz[a], gl.FLOAT, false, PART_STRIDE, off[a]);
        }
        gl.bindVertexArray(null);

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE); // permite plantas en X y agua bicara sin duplicar lógica
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    compile(vsSrc, fsSrc) {
        const gl = this.gl;
        const mk = (type, src) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                throw new Error('Error de shader: ' + gl.getShaderInfoLog(sh));
            }
            return sh;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, mk(gl.VERTEX_SHADER, vsSrc));
        gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fsSrc));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error('Error de enlace: ' + gl.getProgramInfoLog(prog));
        }
        return prog;
    }

    uniformMap(prog, names) {
        const map = {};
        for (const n of names) map[n] = this.gl.getUniformLocation(prog, n);
        return map;
    }

    makeTexture(canvas, wrap) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        return tex;
    }

    /** Crea un VAO con el layout estándar [pos3, uv2, luz1]. */
    makeVAO(data) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        const buf = gl.createBuffer();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE, 20);
        gl.bindVertexArray(null);
        return { vao, buf, n: data.length / 6 };
    }

    freeMesh(mesh) {
        if (!mesh) return;
        this.gl.deleteVertexArray(mesh.vao);
        this.gl.deleteBuffer(mesh.buf);
    }

    /** Sustituye la geometría de un chunk (tras el mallado). */
    updateChunk(key, meshData) {
        const old = this.chunks.get(key);
        if (old) { this.freeMesh(old.solid); this.freeMesh(old.water); }
        this.chunks.set(key, {
            solid: meshData.solid.length ? this.makeVAO(meshData.solid) : null,
            water: meshData.water.length ? this.makeVAO(meshData.water) : null,
        });
    }

    /** Libera la malla de un chunk descargado (los datos siguen en World). */
    deleteChunk(key) {
        const c = this.chunks.get(key);
        if (!c) return;
        this.freeMesh(c.solid);
        this.freeMesh(c.water);
        this.chunks.delete(key);
    }

    clearChunks() {
        for (const c of this.chunks.values()) { this.freeMesh(c.solid); this.freeMesh(c.water); }
        this.chunks.clear();
    }

    /**
     * Dibuja los drops como cubitos de 0,28 que giran y flotan, con las
     * téselas de su bloque. Asume el estado de la pasada sólida (programa
     * principal, atlas ligado, cutoff 0.5: los huecos alfa se recortan).
     */
    drawDrops(drops, time) {
        const gl = this.gl;
        const S = 0.14;
        const data = new Float32Array(drops.length * 36 * 6);
        let o = 0;
        for (let i = 0; i < drops.length; i++) {
            const d = drops[i];
            const a = time * 1.6 + i * 0.9;                             // giro propio
            const cos = Math.cos(a), sin = Math.sin(a);
            const cy = d.pos[1] + 0.1 + Math.sin(time * 2 + i) * 0.045; // flota

            // items (herramientas, materiales): sprite plano en X que gira
            if (isItem(d.id)) {
                const it = ITEM_DEFS[d.id];
                if (!it) continue;
                const [u0, v0, u1, v1] = tileUV(it.tile);
                const uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
                const S2 = 0.22;
                for (const plano of [
                    [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]],
                    [[0, -1, -1], [0, -1, 1], [0, 1, 1], [0, 1, -1]],
                ]) {
                    for (const k of [0, 1, 2, 0, 2, 3]) {
                        const [ex, ey, ez] = plano[k];
                        const x = ex * S2 * cos - ez * S2 * sin;
                        const z = ex * S2 * sin + ez * S2 * cos;
                        // luz 0.96: tope del canal solar (nada en la parte entera)
                        data.set([d.pos[0] + x, cy + ey * S2, d.pos[2] + z, uv[k][0], uv[k][1], 0.96], o);
                        o += 6;
                    }
                }
                continue;
            }

            const def = DEFS[d.id];
            if (!def) continue;
            for (const q of DROP_QUADS) {
                const [u0, v0, u1, v1] = tileUV(def[q.cara]);
                const uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
                const esquina = (k) => {
                    const [ex, ey, ez] = q.c[k];
                    const x = ex * S * cos - ez * S * sin;
                    const z = ex * S * sin + ez * S * cos;
                    return [d.pos[0] + x, cy + ey * S, d.pos[2] + z, uv[k][0], uv[k][1], q.luz];
                };
                for (const k of [0, 1, 2, 0, 2, 3]) {
                    data.set(esquina(k), o);
                    o += 6;
                }
            }
        }
        gl.bindVertexArray(this.dropVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dropBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, o / 6);
        gl.bindVertexArray(null);
    }

    makeSelectionCube() {
        const a = -0.003, b = 1.003;
        const corners = [[a, a, a], [b, a, a], [b, a, b], [a, a, b], [a, b, a], [b, b, a], [b, b, b], [a, b, b]];
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        const data = new Float32Array(edges.flatMap(([i, j]) => [...corners[i], ...corners[j]]));
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.bindVertexArray(null);
        return vao;
    }

    /** Quad unitario (esquinas ±1) para los billboards de sol y luna. */
    makeSkyQuad() {
        const gl = this.gl;
        const data = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
        gl.bindVertexArray(null);
        return vao;
    }

    /**
     * Dibuja sol y luna como quads billboard orientados con los ejes
     * derecho/arriba de la cámara (f.camRight/f.camUp, que main.js deriva
     * del yaw/pitch del jugador). Se llama justo tras el clear y antes de
     * la geometría sólida: no escriben profundidad, así el terreno los
     * tapa al dibujarse después. Deja blend y depthMask como estaban.
     */
    drawAstros(f) {
        const gl = this.gl;
        if (!this.sunTex || !this.moonTex || !f.sunDir || !f.camRight || !f.camUp) return;
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        gl.useProgram(this.skyProg);
        gl.uniformMatrix4fv(this.su.uPV, false, f.pv);
        gl.uniform3fv(this.su.uRight, f.camRight);
        gl.uniform3fv(this.su.uUp, f.camUp);
        gl.uniform1i(this.su.uTex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindVertexArray(this.skyQuadVAO);
        const D = 420; // distancia del astro a la cámara (dentro del far plane)

        if (f.sunDir[1] > -0.15) { // sol: solo si su elevación asoma
            const g = f.sunGlow || 0;
            gl.bindTexture(gl.TEXTURE_2D, this.sunTex);
            gl.uniform3f(this.su.uCenter,
                f.camPos[0] + f.sunDir[0] * D,
                f.camPos[1] + f.sunDir[1] * D,
                f.camPos[2] + f.sunDir[2] * D);
            gl.uniform1f(this.su.uSize, 56 * (1 + 0.5 * g)); // crece en el horizonte
            // blanco → [1.0, 0.72, 0.45] según el resplandor crepuscular
            gl.uniform3f(this.su.uTint, 1, 1 - 0.28 * g, 1 - 0.55 * g);
            gl.uniform4f(this.su.uUVRect, 0, 0, 1, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        if (-f.sunDir[1] > -0.15) { // luna: dirección opuesta al sol
            const uv = moonUV(f.moonPhase || 0);
            gl.bindTexture(gl.TEXTURE_2D, this.moonTex);
            gl.uniform3f(this.su.uCenter,
                f.camPos[0] - f.sunDir[0] * D,
                f.camPos[1] - f.sunDir[1] * D,
                f.camPos[2] - f.sunDir[2] * D);
            gl.uniform1f(this.su.uSize, 40);
            gl.uniform3f(this.su.uTint, 1, 1, 1);
            gl.uniform4f(this.su.uUVRect, uv[0], uv[1], uv[2], uv[3]);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
    }

    /**
     * Dibuja las partículas como quads billboard (ejes derecho/arriba de la
     * cámara), con su tinte RGBA y niebla. Se llama entre las entidades y
     * las transparencias: con blend y sin escribir profundidad (no se ocultan
     * entre sí ni tapan el agua). Las de textura `terrain` (destrucción de
     * bloque) usan el atlas de bloques; el resto, el atlas de partículas.
     * @param {object[]} parts — snapshots del ParticleSystem
     */
    drawParticles(parts, f) {
        if (!parts || !parts.length) return;
        const gl = this.gl;
        // dos lotes por textura: partículas de bloque (terrain) y las demás
        const lotes = [
            { tex: this.particleTex, list: parts.filter((p) => !p.terrain) },
            { tex: this.atlasTex, list: parts.filter((p) => p.terrain) },
        ];
        gl.useProgram(this.partProg);
        gl.uniformMatrix4fv(this.pu.uPV, false, f.pv);
        gl.uniform3fv(this.pu.uRight, f.camRight);
        gl.uniform3fv(this.pu.uUp, f.camUp);
        gl.uniform3fv(this.pu.uCamPos, f.camPos);
        gl.uniform3fv(this.pu.uFogColor, f.sky);
        gl.uniform1f(this.pu.uFogNear, f.fogNear);
        gl.uniform1f(this.pu.uFogFar, f.fogFar);
        gl.uniform1i(this.pu.uTex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        gl.bindVertexArray(this.partVAO);

        const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        for (const lote of lotes) {
            if (!lote.tex || !lote.list.length) continue;
            const data = new Float32Array(lote.list.length * 6 * 12);
            let o = 0;
            for (const p of lote.list) {
                // uv en px del atlas del efecto → normalizadas por su tamaño
                const u0 = p.uv[0] / p.texW, v0 = p.uv[1] / p.texH;
                const u1 = p.uv[2] / p.texW, v1 = p.uv[3] / p.texH;
                const uvC = [[u0, v1], [u1, v1], [u1, v0], [u0, v1], [u1, v0], [u0, v0]];
                for (let k = 0; k < 6; k++) {
                    data[o++] = p.pos[0]; data[o++] = p.pos[1]; data[o++] = p.pos[2];
                    data[o++] = CORNERS[k][0]; data[o++] = CORNERS[k][1];
                    data[o++] = uvC[k][0]; data[o++] = uvC[k][1];
                    data[o++] = p.size;
                    data[o++] = p.color[0]; data[o++] = p.color[1]; data[o++] = p.color[2]; data[o++] = p.color[3];
                }
            }
            gl.bindTexture(gl.TEXTURE_2D, lote.tex);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, lote.list.length * 6);
        }

        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
        gl.useProgram(this.prog);
    }

    /**
     * Mantiene el plano de nubes centrado en el jugador (mundo infinito):
     * se reconstruye al alejarse >256 bloques del centro anterior. Las UVs
     * están ancladas a coordenadas de mundo, así el patrón no "salta" al
     * reconstruir.
     */
    ensureClouds(px, pz) {
        if (this.cloud && Math.hypot(px - this.cloudCenter[0], pz - this.cloudCenter[1]) < 256) return;
        if (this.cloud) this.freeMesh(this.cloud);
        const y = 70, s = 900, scale = 320;
        const quad = [
            [px - s, pz - s], [px + s, pz - s], [px + s, pz + s],
            [px - s, pz - s], [px + s, pz + s], [px - s, pz + s],
        ];
        // luz 0.96: tope del canal solar (1.0 se decodificaría como luz de bloque)
        const data = new Float32Array(quad.flatMap(([x, z]) => [x, y, z, x / scale, z / scale, 0.96]));
        this.cloud = this.makeVAO(data);
        this.cloudCenter = [px, pz];
    }

    resize() {
        const c = this.canvas;
        const w = c.clientWidth, h = c.clientHeight;
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        this.gl.viewport(0, 0, c.width, c.height);
    }

    /**
     * Dibuja un fotograma completo.
     * @param {object} f — {pv, camPos, sky, day, fogNear, fogFar, selection,
     *   cloudOffset, sunDir, sunGlow, moonPhase, camRight, camUp}
     */
    render(f) {
        const gl = this.gl;
        this.resize();
        gl.clearColor(f.sky[0], f.sky[1], f.sky[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 0. astros: tras el clear y antes del terreno (sin escribir profundidad)
        this.drawAstros(f);

        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.u.uPV, false, f.pv);
        gl.uniform3fv(this.u.uCamPos, f.camPos);
        gl.uniform3fv(this.u.uFogColor, f.sky);
        gl.uniform1f(this.u.uFogNear, f.fogNear);
        gl.uniform1f(this.u.uFogFar, f.fogFar);
        gl.uniform1f(this.u.uDay, f.day);
        gl.uniform1i(this.u.uTex, 0);
        gl.activeTexture(gl.TEXTURE0);

        // 1. geometría sólida (con recorte alfa para hojas/cristal/plantas)
        gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
        gl.uniform1f(this.u.uCutoff, 0.5);
        gl.uniform1f(this.u.uAlphaMul, 1);
        gl.uniform2f(this.u.uUVScroll, 0, 0);
        for (const c of this.chunks.values()) {
            if (c.solid) { gl.bindVertexArray(c.solid.vao); gl.drawArrays(gl.TRIANGLES, 0, c.solid.n); }
        }

        // 1a. drops: cubitos que giran y flotan (mismo estado que los chunks)
        if (f.drops && f.drops.length) this.drawDrops(f.drops, f.time || 0);

        // 1b. entidades (mobs y flechas): opacas, antes de las transparencias;
        // el callback debe dejar restaurado este programa
        if (f.drawEntities) f.drawEntities();

        // 2. cubo de selección (enrojece con el progreso de picado)
        if (f.selection) {
            gl.useProgram(this.lineProg);
            gl.uniformMatrix4fv(this.lu.uPV, false, f.pv);
            gl.uniform3f(this.lu.uPos, f.selection[0], f.selection[1], f.selection[2]);
            const p = f.breakProgress || 0;
            gl.uniform4f(this.lu.uColor, p, p * 0.2, 0.05 * p, 0.7 + 0.3 * p);
            gl.bindVertexArray(this.selectionVAO);
            gl.drawArrays(gl.LINES, 0, 24);
            gl.useProgram(this.prog);
        }

        // 2b. partículas (billboards con tinte): tras las entidades, antes de
        // nubes y agua, para que el humo se funda con la niebla y no se pinte
        // sobre el HUD ni la mano
        if (f.particles && f.particles.length) this.drawParticles(f.particles, f);

        // 3. transparencias: nubes y agua (sin escribir profundidad)
        gl.enable(gl.BLEND);
        gl.depthMask(false);

        if (this.cloud) {
            gl.bindTexture(gl.TEXTURE_2D, this.cloudTex);
            gl.uniform1f(this.u.uCutoff, 0.05);
            gl.uniform1f(this.u.uAlphaMul, 0.8);
            gl.uniform2f(this.u.uUVScroll, f.cloudOffset, 0);
            gl.bindVertexArray(this.cloud.vao);
            gl.drawArrays(gl.TRIANGLES, 0, this.cloud.n);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
        gl.uniform1f(this.u.uCutoff, 0.02);
        gl.uniform1f(this.u.uAlphaMul, 0.9);
        gl.uniform2f(this.u.uUVScroll, 0, 0);
        for (const c of this.chunks.values()) {
            if (c.water) { gl.bindVertexArray(c.water.vao); gl.drawArrays(gl.TRIANGLES, 0, c.water.n); }
        }

        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
    }
}

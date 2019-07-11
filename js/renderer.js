/**
 * Renderer WebGL2: atlas con filtrado nearest (estética pixelada), una malla
 * sólida y una de agua por chunk, niebla por distancia, factor día/noche,
 * sol y luna como billboards, cubo de selección y plano de nubes.
 */
import { moonUV } from './sky.js';

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
    vec3 lit = tex.rgb * vLight * uDay;
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

const STRIDE = 6 * 4; // 6 floats por vértice

export class Renderer {
    constructor(canvas, atlasCanvas, cloudCanvas, sunCanvas, moonCanvas) {
        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!gl) throw new Error('WebGL2 no disponible');
        this.gl = gl;
        this.canvas = canvas;

        this.prog = this.compile(VS, FS);
        this.lineProg = this.compile(LINE_VS, LINE_FS);
        this.skyProg = this.compile(SKY_VS, SKY_FS);
        this.u = this.uniformMap(this.prog, ['uPV', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar', 'uDay', 'uCutoff', 'uAlphaMul', 'uUVScroll']);
        this.lu = this.uniformMap(this.lineProg, ['uPV', 'uPos', 'uColor']);
        this.su = this.uniformMap(this.skyProg, ['uPV', 'uCenter', 'uRight', 'uUp', 'uSize', 'uUVRect', 'uTex', 'uTint']);

        this.atlasTex = this.makeTexture(atlasCanvas, gl.CLAMP_TO_EDGE);
        this.cloudTex = this.makeTexture(cloudCanvas, gl.REPEAT);
        // nearest también en los astros, por coherencia con la estética pixelada
        this.sunTex = sunCanvas ? this.makeTexture(sunCanvas, gl.CLAMP_TO_EDGE) : null;
        this.moonTex = moonCanvas ? this.makeTexture(moonCanvas, gl.CLAMP_TO_EDGE) : null;

        this.chunks = new Map(); // "cx,cz" → {solid:{vao,buf,n}, water:{...}}
        this.selectionVAO = this.makeSelectionCube();
        this.skyQuadVAO = this.makeSkyQuad();
        this.cloud = null;

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
        const data = new Float32Array(quad.flatMap(([x, z]) => [x, y, z, x / scale, z / scale, 1]));
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

        // 1b. entidades (mobs y flechas): opacas, antes de las transparencias;
        // el callback debe dejar restaurado este programa
        if (f.drawEntities) f.drawEntities();

        // 2. cubo de selección
        if (f.selection) {
            gl.useProgram(this.lineProg);
            gl.uniformMatrix4fv(this.lu.uPV, false, f.pv);
            gl.uniform3f(this.lu.uPos, f.selection[0], f.selection[1], f.selection[2]);
            gl.uniform4f(this.lu.uColor, 0, 0, 0, 0.7);
            gl.bindVertexArray(this.selectionVAO);
            gl.drawArrays(gl.LINES, 0, 24);
            gl.useProgram(this.prog);
        }

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

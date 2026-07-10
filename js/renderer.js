/**
 * Renderer WebGL2: atlas con filtrado nearest (estética pixelada), una malla
 * sólida y una de agua por chunk, niebla por distancia, factor día/noche,
 * sol y luna como billboards, cubo de selección y plano de nubes.
 */
import { moonUV } from './sky.js';
import { DEFS } from './blocks.js';
import { tileUV } from './atlas.js';
import { CLOUD_Y } from './dimensiones.js';
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

// Cielo atmosférico de pantalla completa: gradiente cénit→horizonte, arrebol
// crepuscular hacia el sol, estrellas nocturnas y CÚMULOS VOLUMÉTRICOS por
// raymarching de un campo de altura fbm (iluminados por el sol, con borde
// plateado y panza oscura; la tormenta los cierra y los agrisa). Sustituye al
// clearColor plano y al viejo quad de nubes. Un solo triángulo que cubre la
// pantalla (gl_VertexID, sin buffers); el rayo por píxel se reconstruye con
// los ejes de la cámara.
const ATMOS_VS = `#version 300 es
out vec2 vNDC;
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    vNDC = p;
    gl_Position = vec4(p, 0.9999, 1.0); // casi en el plano lejano
}`;

const ATMOS_FS = `#version 300 es
precision highp float;
in vec2 vNDC;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform vec2 uTanFov;    // (tan(fov/2)·aspecto, tan(fov/2))
uniform vec3 uHorizonte; // color actual del cielo/niebla (con clima y crepúsculo)
uniform vec3 uSunDir;
uniform float uDia;      // factor día 0..1
uniform float uGlow;     // resplandor crepuscular 0..0.55
uniform float uNublado;  // intensidad del clima 0..1 (cierra y agrisa las nubes)
uniform float uFlash;    // destello del rayo 0..1 (ilumina las nubes)
uniform float uTiempo;   // segundos (deriva de nubes, titileo de estrellas)
uniform float uNubeY;    // altura de la base de las nubes
out vec4 outColor;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.7; a *= 0.5; }
    return v;
}

// Densidad de nube en un punto: campo de altura 2.5D — la cobertura decide
// dónde hay nube y el propio ruido su grosor (cimas abultadas, base plana).
float densidad(vec3 p) {
    vec2 q = p.xz * 0.0016 + vec2(uTiempo * 0.006, uTiempo * 0.0025);
    float f = fbm(q);
    float cobertura = mix(0.60, 0.34, uNublado); // tormenta: el cielo se cierra
    float nube = smoothstep(cobertura, cobertura + 0.24, f);
    if (nube <= 0.0) return 0.0;
    float h = (p.y - uNubeY) / (26.0 + 96.0 * f); // grosor crece con la nube
    return nube * smoothstep(0.0, 0.16, h) * (1.0 - smoothstep(0.5, 1.0, h));
}

// Raymarch del estrato de nubes [uNubeY, uNubeY+120]: acumula luz
// premultiplicada y transmitancia; el resultado se funde con la bruma
// del horizonte según la distancia de entrada al estrato.
vec4 nubes(vec3 ro, vec3 rd, float mu) {
    float top = uNubeY + 120.0;
    if (abs(rd.y) < 2e-3) return vec4(0.0);
    float ta = (uNubeY - ro.y) / rd.y;
    float tb = (top - ro.y) / rd.y;
    float t0 = max(min(ta, tb), 0.0);
    float t1 = max(ta, tb);
    if (t1 <= 0.0 || t0 > 9000.0) return vec4(0.0);
    t1 = min(t1, t0 + 2400.0);
    const int N = 14;
    float dt = (t1 - t0) / float(N);
    float T = 1.0;
    vec3 acc = vec3(0.0);
    // fase hacia el sol: borde plateado cuando se mira a contraluz
    float fase = 0.85 + 1.1 * pow(max(mu, 0.0), 8.0);
    for (int i = 0; i < N; i++) {
        float t = t0 + (float(i) + 0.5) * dt;
        vec3 p = ro + rd * t;
        float d = densidad(p);
        if (d < 0.01) continue;
        float hfrac = clamp((p.y - uNubeY) / 110.0, 0.0, 1.0);
        // panza en sombra, cima al sol (sobreexpuesta: satura a blanco);
        // de noche apenas lucen; la tormenta las aploma y el rayo las
        // enciende un instante
        vec3 luz = mix(vec3(0.52, 0.55, 0.62), vec3(1.22, 1.19, 1.13), hfrac);
        luz *= (0.16 + 0.9 * uDia) * fase;
        luz = mix(luz, luz * vec3(0.5, 0.52, 0.58), uNublado);
        luz += vec3(uFlash) * 0.9;
        float a = 1.0 - exp(-d * dt * 0.05);
        acc += T * a * luz;
        T *= 1.0 - a;
        if (T < 0.02) break;
    }
    float bruma = exp(-t0 * 0.00042); // lejos, la nube se funde con el horizonte
    return vec4(acc * bruma, (1.0 - T) * bruma);
}

void main() {
    vec3 rd = normalize(uCamFwd + uCamRight * (vNDC.x * uTanFov.x) + uCamUp * (vNDC.y * uTanFov.y));
    float elev = clamp(rd.y, -1.0, 1.0);

    // gradiente atmosférico: el horizonte ES el color de la niebla (el
    // terreno lejano se funde sin costura) y el cénit es su versión honda;
    // la tormenta lo neutraliza (un cielo cubierto no azulea en lo alto)
    vec3 fCenit = mix(vec3(0.36, 0.50, 0.86), vec3(0.52, 0.55, 0.60), uNublado);
    vec3 cenit = uHorizonte * fCenit;
    vec3 col = mix(uHorizonte, cenit, pow(max(elev, 0.0), 0.42));

    float mu = max(dot(rd, uSunDir), 0.0);
    // arrebol: refuerzo cálido direccional hacia el sol en el crepúsculo
    col += vec3(1.0, 0.42, 0.18) * (uGlow * 0.85 * pow(mu, 6.0));
    // halo pegado al disco solar (Mie hacia delante)
    col += vec3(1.0, 0.87, 0.62) * (pow(mu, 320.0) * 1.1 * uDia);

    // estrellas: rejilla angular con brillo y titileo por celda; se funden
    // al amanecer y desaparecen bajo el cielo cubierto
    float noche = (1.0 - smoothstep(0.06, 0.32, uDia)) * (1.0 - uNublado);
    if (noche > 0.003 && elev > 0.02) {
        vec2 suv = vec2(atan(rd.z, rd.x) * 57.0, asin(elev) * 57.0);
        vec2 cel = floor(suv);
        float h = hash12(cel);
        if (h > 0.993) {
            vec2 c = fract(suv) - 0.5;
            float star = smoothstep(0.18, 0.02, length(c));
            star *= 0.55 + 0.45 * sin(uTiempo * 2.6 + h * 999.0);
            col += vec3(0.9, 0.95, 1.0) * star * noche * (h - 0.993) * 120.0;
        }
    }

    // cúmulos por encima del gradiente (composición premultiplicada)
    vec4 nb = nubes(uCamPos, rd, mu);
    col = col * (1.0 - nb.a) + nb.rgb;

    outColor = vec4(col, 1.0);
}`;

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

// Shatter (fragmentos de bloque roto): cubos sólidos con COLOR PLANO por
// vértice (no textura: cada mini-vóxel lleva el color real de su píxel) y
// niebla, para que la nube de esquirlas se funda con la lejanía como el
// terreno. Un sombreado por normal da volumen a los cubitos sin luz global.
const SHATTER_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aColor;
layout(location=2) in float aShade;
uniform mat4 uPV;
out vec3 vColor;
out vec3 vWorld;
out float vShade;
void main() {
    gl_Position = uPV * vec4(aPos, 1.0);
    vColor = aColor;
    vWorld = aPos;
    vShade = aShade;
}`;

const SHATTER_FS = `#version 300 es
precision mediump float;
in vec3 vColor;
in vec3 vWorld;
in float vShade;
uniform vec3 uCamPos;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uDay;
uniform float uAlpha;
out vec4 outColor;
void main() {
    vec3 rgb = vColor * vShade * max(uDay, 0.25);
    float dist = distance(vWorld, uCamPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    outColor = vec4(mix(rgb, uFogColor, fog), uAlpha);
}`;

const STRIDE = 6 * 4; // 6 floats por vértice

// layout de un vértice de partícula: centro3, corner2, uv2, size1, color4
const PART_STRIDE = 12 * 4;

// layout de un vértice de shatter: pos3, color3, shade1
const SHATTER_STRIDE = 7 * 4;

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

/* Caras del mini-cubo de shatter (semiarista 1): esquinas, sombreado por cara
   (da volumen sin luz global) y dirección del vecino `d` (para el culling
   interior de la malla tallada del bloque activo). Orden de DROP_QUADS. */
const SHATTER_FACES = [
    { c: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], shade: 1.0, d: [0, 1, 0] },   // +Y
    { c: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], shade: 0.5, d: [0, -1, 0] }, // -Y
    { c: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], shade: 0.72, d: [1, 0, 0] },  // +X
    { c: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]], shade: 0.72, d: [-1, 0, 0] }, // -X
    { c: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]], shade: 0.86, d: [0, 0, 1] },  // +Z
    { c: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], shade: 0.86, d: [0, 0, -1] }, // -Z
];

export class Renderer {
    // cloudCanvas se conserva en la firma por compatibilidad (arneses y
    // main), pero ya no se usa: las nubes viven en el shader atmosferico
    constructor(canvas, atlasCanvas, cloudCanvas, sunCanvas, moonCanvas, particleCanvas) {
        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!gl) throw new Error('WebGL2 no disponible');
        this.gl = gl;
        this.canvas = canvas;

        this.prog = this.compile(VS, FS);
        this.lineProg = this.compile(LINE_VS, LINE_FS);
        this.skyProg = this.compile(SKY_VS, SKY_FS);
        this.atmosProg = this.compile(ATMOS_VS, ATMOS_FS);
        this.partProg = this.compile(PART_VS, PART_FS);
        this.shatterProg = this.compile(SHATTER_VS, SHATTER_FS);
        this.u = this.uniformMap(this.prog, ['uPV', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar', 'uDay', 'uCutoff', 'uAlphaMul', 'uUVScroll']);
        this.lu = this.uniformMap(this.lineProg, ['uPV', 'uPos', 'uColor']);
        this.su = this.uniformMap(this.skyProg, ['uPV', 'uCenter', 'uRight', 'uUp', 'uSize', 'uUVRect', 'uTex', 'uTint']);
        this.au = this.uniformMap(this.atmosProg, ['uCamPos', 'uCamRight', 'uCamUp', 'uCamFwd', 'uTanFov',
            'uHorizonte', 'uSunDir', 'uDia', 'uGlow', 'uNublado', 'uFlash', 'uTiempo', 'uNubeY']);
        this.atmosVAO = gl.createVertexArray(); // triángulo por gl_VertexID, sin atributos
        this.pu = this.uniformMap(this.partProg, ['uPV', 'uRight', 'uUp', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar']);
        this.shu = this.uniformMap(this.shatterProg, ['uPV', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar', 'uDay', 'uAlpha']);

        this.atlasTex = this.makeTexture(atlasCanvas, gl.CLAMP_TO_EDGE);
        // nearest también en los astros, por coherencia con la estética pixelada
        this.sunTex = sunCanvas ? this.makeTexture(sunCanvas, gl.CLAMP_TO_EDGE) : null;
        this.moonTex = moonCanvas ? this.makeTexture(moonCanvas, gl.CLAMP_TO_EDGE) : null;
        this.particleTex = particleCanvas ? this.makeTexture(particleCanvas, gl.CLAMP_TO_EDGE) : null;

        this.chunks = new Map(); // "cx,cz" → {solid:{vao,buf,n}, water:{...}}
        this.selectionVAO = this.makeSelectionCube();
        this.skyQuadVAO = this.makeSkyQuad();

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

        // búfer dinámico de shatter: pos3, color3, shade1 (cubos sólidos)
        this.shatterVAO = gl.createVertexArray();
        this.shatterBuf = gl.createBuffer();
        gl.bindVertexArray(this.shatterVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.shatterBuf);
        const shOff = [0, 12, 24], shSz = [3, 3, 1];
        for (let a = 0; a < 3; a++) {
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, shSz[a], gl.FLOAT, false, SHATTER_STRIDE, shOff[a]);
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

    /**
     * Dibuja los fragmentos de shatter como mini-cubos sólidos con su color
     * real por vértice y un sombreado por cara para darles volumen. Se llama
     * en la pasada opaca (escribe profundidad: los cubitos se ocluyen entre
     * sí y con el terreno). `fade` da el alfa de desvanecimiento por fragmento.
     */
    drawShatter(frags, f, fade) {
        if (!frags || !frags.length) return;
        const gl = this.gl;
        // 6 caras × 2 tris × 3 vért = 36 vért/cubo, cada uno pos3+color3+shade1
        const data = new Float32Array(frags.length * 36 * 7);
        let o = 0;
        // caras del cubo unitario centrado (±h): esquinas + sombreado por cara
        for (let i = 0; i < frags.length; i++) {
            const fr = frags[i];
            const h = fr.size * 0.5;
            const hy = h * (fr.flat ?? 1);          // aplanado en Y al asentarse
            const sh = fr.shade ?? 1;               // sombra propia (montón posado)
            const [px, py, pz] = fr.pos;
            const [cr, cg, cb] = [fr.color[0] / 255 * sh, fr.color[1] / 255 * sh, fr.color[2] / 255 * sh];
            for (const face of SHATTER_FACES) {
                for (const k of [0, 1, 2, 0, 2, 3]) {
                    const c = face.c[k];
                    data[o++] = px + c[0] * h;
                    data[o++] = py + c[1] * hy;
                    data[o++] = pz + c[2] * h;
                    data[o++] = cr; data[o++] = cg; data[o++] = cb;
                    data[o++] = face.shade;
                }
            }
        }
        gl.useProgram(this.shatterProg);
        gl.uniformMatrix4fv(this.shu.uPV, false, f.pv);
        gl.uniform3fv(this.shu.uCamPos, f.camPos);
        gl.uniform3fv(this.shu.uFogColor, f.sky);
        gl.uniform1f(this.shu.uFogNear, f.fogNear);
        gl.uniform1f(this.shu.uFogFar, f.fogFar);
        gl.uniform1f(this.shu.uDay, f.day);
        gl.uniform1f(this.shu.uAlpha, 1);
        gl.bindVertexArray(this.shatterVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.shatterBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, o / 7);
        gl.bindVertexArray(null);
        gl.useProgram(this.prog);
    }

    /**
     * Reconstruye la malla sub-vóxel del bloque que se está picando (cráter)
     * a partir de `state.present` (rejilla n³ presente/ausente). Culling
     * interior: solo emite la cara de un sub-vóxel si su vecino en esa
     * dirección está ausente (incluye las caras internas del cráter). Se
     * llama solo cuando `state.dirty` (por golpe), no cada frame.
     */
    updateCarve(state) {
        const gl = this.gl;
        if (!this.carveMesh) { this.carveMesh = { vao: gl.createVertexArray(), buf: gl.createBuffer(), n: 0 }; }
        const n = state.n, s = 1 / n;             // arista del sub-vóxel en bloques
        const bx = state.x, by = state.y, bz = state.z;
        const out = [];
        for (let iy = 0; iy < n; iy++)
            for (let iz = 0; iz < n; iz++)
                for (let ix = 0; ix < n; ix++) {
                    if (!state.has(ix, iy, iz)) continue;
                    const [cr, cg, cb] = state.colorDe(ix, iy, iz);
                    const r = cr / 255, g = cg / 255, b = cb / 255;
                    const ox = bx + ix * s, oy = by + iy * s, oz = bz + iz * s;
                    for (const face of SHATTER_FACES) {
                        const [dx, dy, dz] = face.d;
                        if (state.has(ix + dx, iy + dy, iz + dz)) continue; // cara interna oculta
                        for (const k of [0, 1, 2, 0, 2, 3]) {
                            const c = face.c[k];
                            // c en ±1 → esquina 0/1 del sub-vóxel; centro en (0.5s)
                            out.push(
                                ox + ((c[0] + 1) * 0.5) * s,
                                oy + ((c[1] + 1) * 0.5) * s,
                                oz + ((c[2] + 1) * 0.5) * s,
                                r, g, b, face.shade,
                            );
                        }
                    }
                }
        const data = new Float32Array(out);
        gl.bindVertexArray(this.carveMesh.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.carveMesh.buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        const shOff = [0, 12, 24], shSz = [3, 3, 1];
        for (let a = 0; a < 3; a++) {
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, shSz[a], gl.FLOAT, false, SHATTER_STRIDE, shOff[a]);
        }
        gl.bindVertexArray(null);
        this.carveMesh.n = out.length / 7;
        state.dirty = false;
    }

    /** Dibuja la malla tallada del bloque activo (mismo shader que el shatter). */
    drawCarve(f) {
        if (!this.carveMesh || !this.carveMesh.n) return;
        const gl = this.gl;
        gl.useProgram(this.shatterProg);
        gl.uniformMatrix4fv(this.shu.uPV, false, f.pv);
        gl.uniform3fv(this.shu.uCamPos, f.camPos);
        gl.uniform3fv(this.shu.uFogColor, f.sky);
        gl.uniform1f(this.shu.uFogNear, f.fogNear);
        gl.uniform1f(this.shu.uFogFar, f.fogFar);
        gl.uniform1f(this.shu.uDay, f.day);
        gl.uniform1f(this.shu.uAlpha, 1);
        gl.bindVertexArray(this.carveMesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.carveMesh.n);
        gl.bindVertexArray(null);
        gl.useProgram(this.prog);
    }

    /** Libera la malla tallada (al terminar de picar un bloque). */
    clearCarve() { if (this.carveMesh) this.carveMesh.n = 0; }

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
    /**
     * Cielo atmosférico a pantalla completa (un triángulo por gl_VertexID):
     * gradiente, arrebol, estrellas y cúmulos volumétricos. Sin escribir
     * profundidad: todo lo demás se pinta encima.
     */
    drawAtmos(f) {
        const gl = this.gl;
        gl.useProgram(this.atmosProg);
        gl.depthMask(false);
        gl.uniform3fv(this.au.uCamPos, f.camPos);
        gl.uniform3fv(this.au.uCamRight, f.camRight);
        gl.uniform3fv(this.au.uCamUp, f.camUp);
        gl.uniform3fv(this.au.uCamFwd, f.camFwd);
        gl.uniform2fv(this.au.uTanFov, f.tanFov);
        gl.uniform3fv(this.au.uHorizonte, f.sky);
        gl.uniform3fv(this.au.uSunDir, f.sunDir);
        gl.uniform1f(this.au.uDia, f.day);
        gl.uniform1f(this.au.uGlow, f.sunGlow || 0);
        gl.uniform1f(this.au.uNublado, f.nublado || 0);
        gl.uniform1f(this.au.uFlash, f.flash || 0);
        gl.uniform1f(this.au.uTiempo, f.time || 0);
        gl.uniform1f(this.au.uNubeY, CLOUD_Y);
        gl.bindVertexArray(this.atmosVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.depthMask(true);
    }

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

        // la tormenta vela los astros (las nubes del shader quedan detrás de
        // ellos en el orden de pintado; atenuar su brillo hace el efecto)
        const velo = 1 - 0.85 * (f.nublado || 0);

        if (f.sunDir[1] > -0.15) { // sol: solo si su elevación asoma
            const g = f.sunGlow || 0;
            gl.bindTexture(gl.TEXTURE_2D, this.sunTex);
            gl.uniform3f(this.su.uCenter,
                f.camPos[0] + f.sunDir[0] * D,
                f.camPos[1] + f.sunDir[1] * D,
                f.camPos[2] + f.sunDir[2] * D);
            gl.uniform1f(this.su.uSize, 56 * (1 + 0.5 * g)); // crece en el horizonte
            // blanco → [1.0, 0.72, 0.45] según el resplandor crepuscular
            gl.uniform3f(this.su.uTint, velo, (1 - 0.28 * g) * velo, (1 - 0.55 * g) * velo);
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
            gl.uniform3f(this.su.uTint, velo, velo, velo);
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

    resize() {
        const c = this.canvas;
        const w = c.clientWidth, h = c.clientHeight;
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        this.gl.viewport(0, 0, c.width, c.height);
    }

    /**
     * Dibuja un fotograma completo.
     * @param {object} f — {pv, camPos, sky, day, fogNear, fogFar, selection,
     *   sunDir, sunGlow, moonPhase, camRight, camUp, camFwd, tanFov,
     *   nublado, flash}
     */
    render(f) {
        const gl = this.gl;
        this.resize();
        gl.clearColor(f.sky[0], f.sky[1], f.sky[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 0. atmósfera: gradiente + nubes volumétricas + estrellas, a pantalla
        // completa sin escribir profundidad (el terreno la tapará después)
        this.drawAtmos(f);

        // 0b. astros: sobre el gradiente y antes del terreno (la tormenta
        // los vela — las nubes del shader quedan por debajo de ellos)
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

        // 1a-bis. shatter: mini-vóxeles del bloque desgranado (opacos, escriben
        // profundidad como los cubos del terreno). El callback drawShatter
        // deja restaurado el programa principal.
        if (f.shatter && f.shatter.length) this.drawShatter(f.shatter, f, f.shatterFade);

        // 1a-ter. carve: malla tallada del bloque que se pica (el cráter). Su
        // celda está oculta en la malla del chunk, así que este dibujo la
        // sustituye rellenando el hueco con la forma parcial.
        if (f.carve) this.drawCarve(f);

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

        // 3. transparencias: agua (sin escribir profundidad). Las nubes ya no
        // son un quad: viven en el shader atmosférico del principio del frame.
        gl.enable(gl.BLEND);
        gl.depthMask(false);

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

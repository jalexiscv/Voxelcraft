/**
 * Render WebGL2 de mobs: por cada tipo construye una vez la geometría de sus
 * partes-caja (model.js) y su piel procedural (skin.js) como textura, y por
 * fotograma dibuja cada parte con su matriz de modelo (pose + animación).
 *
 * Animaciones (catálogo ANIMS de model.js): balanceo de patas/brazos en
 * contrafase según la rapidez, mirada de la cabeza, aleteo al caer, apertura
 * en Y para patas de araña. Efectos: destello rojo al recibir daño, parpadeo
 * blanco de la mecha del creeper y vuelco al morir.
 */
import { buildModel } from './mobs/model.js';
import { Skin } from './mobs/skin.js';
import { toSeed } from './noise.js';
import {
    mat4Identity, mat4Multiply, mat4Translate,
    mat4RotateX, mat4RotateY, mat4RotateZ,
} from './math.js';

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in float aLight;
uniform mat4 uPV;
uniform mat4 uModel;
out vec2 vUV;
out float vLight;
out vec3 vWorldPos;
void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    gl_Position = uPV * wp;
    vWorldPos = wp.xyz;
    vUV = aUV;
    vLight = aLight;
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
uniform float uBright;
uniform vec4 uTint;
out vec4 outColor;
void main() {
    vec4 tex = texture(uTex, vUV);
    if (tex.a < 0.5) discard;
    vec3 lit = tex.rgb * vLight * uDay * uBright;
    lit = mix(lit, uTint.rgb, uTint.a);
    float dist = distance(vWorldPos, uCamPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    outColor = vec4(mix(lit, uFogColor, fog), 1.0);
}`;

/** Modelo mínimo de la flecha del esqueleto (vara gris de 7 px). */
const ARROW_DEF = {
    id: 'flecha',
    skin: { w: 8, h: 8 },
    paint(skin) { skin.fill(0, 0, 8, 8, [168, 160, 148], 12); },
    parts: [{ name: 'vara', size: [1, 1, 5], pivot: [0, 0, 0], origin: [-0.5, -0.5, -2.5], uv: [0, 0] }],
};

export class MobRenderer {
    /**
     * @param {Renderer} renderer — render principal (reutiliza gl y helpers)
     * @param {Object<string,object>} defs — registro de tipos de mob
     */
    constructor(renderer, defs) {
        this.r = renderer;
        this.gl = renderer.gl;
        this.prog = renderer.compile(VS, FS);
        this.u = renderer.uniformMap(this.prog, [
            'uPV', 'uModel', 'uTex', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar', 'uDay', 'uBright', 'uTint',
        ]);
        this.types = new Map(); // id → {parts:[{vao,buf,n,pivot,rot,anim}], tex}
        for (const def of Object.values(defs)) this.buildType(def);
        this.buildType(ARROW_DEF);

        // matrices de trabajo reutilizadas (sin basura por fotograma)
        this.mA = new Float32Array(16); this.mB = new Float32Array(16);
        this.mC = new Float32Array(16); this.mBase = new Float32Array(16);
        this.mPart = new Float32Array(16);
    }

    /**
     * Geometría + pieles de un tipo, construidas una sola vez. Un def con
     * `variants: N` pinta N texturas (tonalidades): paint(skin, v) recibe la
     * variante y cada mob usa la suya (m.variant, asignada al aparecer).
     */
    buildType(def) {
        const gl = this.gl;
        const texs = [];
        for (let v = 0; v < (def.variants || 1); v++) {
            const skin = new Skin(def.skin.w, def.skin.h, toSeed(def.id) + v * 131);
            def.paint(skin, v);
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, def.skin.w, def.skin.h, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(skin.data.buffer));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            texs.push(tex);
        }

        const parts = buildModel(def).map((p) => ({ ...this.r.makeVAO(p.mesh), ...p }));
        this.types.set(def.id, { parts, texs });
    }

    /**
     * Dibuja todos los mobs y flechas. Llamar entre la geometría sólida y las
     * transparencias del render principal; restaura el programa de chunks.
     * @param {object} f — mismos parámetros de fotograma que Renderer.render
     */
    render(f, mobs, arrows, time, world) {
        const gl = this.gl;
        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.u.uPV, false, f.pv);
        gl.uniform3fv(this.u.uCamPos, f.camPos);
        gl.uniform3fv(this.u.uFogColor, f.sky);
        gl.uniform1f(this.u.uFogNear, f.fogNear);
        gl.uniform1f(this.u.uFogFar, f.fogFar);
        gl.uniform1f(this.u.uDay, f.day);
        gl.uniform1i(this.u.uTex, 0);

        for (const m of mobs) {
            const type = this.types.get(m.def.id);
            if (!type) continue;

            // luz local: a cubierto (cuevas) el mob se ve más oscuro,
            // salvo los que emiten luz propia (calamar brillante, allay…)
            // o los que están junto a una antorcha/lava (luz de bloque)
            const bx = Math.floor(m.pos[0]);
            const by = Math.floor(m.pos[1] + m.def.aabb.h * 0.8);
            const bz = Math.floor(m.pos[2]);
            const sunlit = world.sunlit(bx, by, bz);
            let brillo = (m.def.glow || sunlit) ? 1 : 0.55;
            brillo = Math.max(brillo, world.blockLightAt(bx, by, bz) / 15);
            gl.uniform1f(this.u.uBright, brillo);

            // tintes: mecha (parpadeo blanco) > daño (rojo) > muerte (rojo sostenido)
            if (m.fuseT >= 0 && Math.sin(time * 24) > 0) gl.uniform4f(this.u.uTint, 1, 1, 1, 0.55);
            else if (m.dying()) gl.uniform4f(this.u.uTint, 0.75, 0.1, 0.1, 0.5);
            else if (m.hurtT > 0) gl.uniform4f(this.u.uTint, 0.9, 0.15, 0.15, 0.45);
            else gl.uniform4f(this.u.uTint, 0, 0, 0, 0);

            // base: posición + rumbo (+ vuelco al morir)
            mat4Translate(this.mA, m.pos[0], m.pos[1], m.pos[2]);
            mat4RotateY(this.mB, m.yaw);
            mat4Multiply(this.mBase, this.mA, this.mB);
            if (m.dying()) {
                mat4RotateZ(this.mC, (1 - m.dieT / 0.4) * 1.35);
                mat4Multiply(this.mBase, this.mBase, this.mC);
            }

            gl.bindTexture(gl.TEXTURE_2D, type.texs[(m.variant || 0) % type.texs.length]);
            const swing = Math.sin(m.animPhase) * Math.min(m.animSpeed * 0.6, 1);
            const flap = m.onGround || m.inWater ? 0.12 : Math.sin(time * 26) * 0.9;

            for (const part of type.parts) {
                this.partMatrix(this.mPart, part, m, swing, flap);
                gl.uniformMatrix4fv(this.u.uModel, false, this.mPart);
                gl.bindVertexArray(part.vao);
                gl.drawArrays(gl.TRIANGLES, 0, part.n);
            }
        }

        // flechas en vuelo, orientadas por su velocidad
        const arrow = this.types.get('flecha');
        gl.bindTexture(gl.TEXTURE_2D, arrow.texs[0]);
        gl.uniform1f(this.u.uBright, 1);
        gl.uniform4f(this.u.uTint, 0, 0, 0, 0);
        for (const a of arrows) {
            mat4Translate(this.mA, a.pos[0], a.pos[1], a.pos[2]);
            mat4RotateY(this.mB, Math.atan2(-a.vel[0], -a.vel[2]));
            mat4Multiply(this.mC, this.mA, this.mB);
            mat4RotateX(this.mB, Math.atan2(a.vel[1], Math.hypot(a.vel[0], a.vel[2])));
            mat4Multiply(this.mPart, this.mC, this.mB);
            gl.uniformMatrix4fv(this.u.uModel, false, this.mPart);
            gl.bindVertexArray(arrow.parts[0].vao);
            gl.drawArrays(gl.TRIANGLES, 0, arrow.parts[0].n);
        }

        gl.bindVertexArray(null);
        gl.useProgram(this.r.prog); // devolver el programa de chunks
    }

    /** M = base · T(pivot) · Rz · Ry · Rx (pose estática + animación). */
    partMatrix(out, part, m, swing, flap) {
        mat4Translate(this.mA, part.pivot[0], part.pivot[1], part.pivot[2]);
        mat4Multiply(out, this.mBase, this.mA);

        let rx = part.rot ? part.rot[0] : 0;
        let ry = part.rot ? part.rot[1] : 0;
        let rz = part.rot ? part.rot[2] : 0;
        switch (part.anim) {
            case 'leg0': rx += swing * 0.9; break;
            case 'leg1': rx -= swing * 0.9; break;
            case 'arm0': rx += swing * 0.35; break;
            case 'arm1': rx -= swing * 0.35; break;
            case 'legY0': ry += swing * 0.35; break;
            case 'legY1': ry -= swing * 0.35; break;
            case 'flapL': rz += flap; break;
            case 'flapR': rz -= flap; break;
            case 'head': {
                let rel = m.headYaw - m.yaw;
                rel = Math.atan2(Math.sin(rel), Math.cos(rel));
                ry += rel;
                rx += m.headPitch;
                break;
            }
        }
        if (rz) { mat4RotateZ(this.mA, rz); mat4Multiply(out, out, this.mA); }
        if (ry) { mat4RotateY(this.mA, ry); mat4Multiply(out, out, this.mA); }
        if (rx) { mat4RotateX(this.mA, rx); mat4Multiply(out, out, this.mA); }
    }
}

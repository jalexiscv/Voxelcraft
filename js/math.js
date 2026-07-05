/**
 * Matemáticas 3D mínimas para WebGL (matrices 4×4 column-major).
 * Sin dependencias; todas las funciones operan sobre Float32Array(16).
 */

export function mat4Identity(out) {
    out.fill(0);
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
}

export function mat4Perspective(out, fovyRad, aspect, near, far) {
    const f = 1 / Math.tan(fovyRad / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
}

export function mat4Multiply(out, a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
        for (let f = 0; f < 4; f++) {
            r[c * 4 + f] =
                a[f] * b[c * 4] + a[4 + f] * b[c * 4 + 1] +
                a[8 + f] * b[c * 4 + 2] + a[12 + f] * b[c * 4 + 3];
        }
    }
    out.set(r);
    return out;
}

export function mat4Translate(out, x, y, z) {
    mat4Identity(out);
    out[12] = x; out[13] = y; out[14] = z;
    return out;
}

export function mat4RotateX(out, rad) {
    mat4Identity(out);
    const c = Math.cos(rad), s = Math.sin(rad);
    out[5] = c; out[6] = s; out[9] = -s; out[10] = c;
    return out;
}

export function mat4RotateY(out, rad) {
    mat4Identity(out);
    const c = Math.cos(rad), s = Math.sin(rad);
    out[0] = c; out[2] = -s; out[8] = s; out[10] = c;
    return out;
}

export function mat4RotateZ(out, rad) {
    mat4Identity(out);
    const c = Math.cos(rad), s = Math.sin(rad);
    out[0] = c; out[1] = s; out[4] = -s; out[5] = c;
    return out;
}

export function mat4Scale(out, x, y, z) {
    mat4Identity(out);
    out[0] = x; out[5] = y; out[10] = z;
    return out;
}

/**
 * Matriz de vista en primera persona (inversa de la pose de la cámara):
 * V = Rx(−pitch) · Ry(−yaw) · T(−ojo).
 * yaw=0 mira hacia −Z; pitch positivo mira hacia arriba.
 */
export function mat4View(out, eyeX, eyeY, eyeZ, yaw, pitch) {
    const t = new Float32Array(16), rx = new Float32Array(16), ry = new Float32Array(16);
    mat4Translate(t, -eyeX, -eyeY, -eyeZ);
    mat4RotateY(ry, -yaw);
    mat4RotateX(rx, -pitch);
    mat4Multiply(out, ry, t);
    mat4Multiply(out, rx, out);
    return out;
}

/** Vector unitario de dirección de la mirada a partir de yaw/pitch. */
export function lookDir(yaw, pitch) {
    const cp = Math.cos(pitch);
    return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

export function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
}

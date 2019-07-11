/**
 * Ruido procedural determinista: PRNG Park–Miller, ruido de gradiente 2D,
 * fractal por octavas y distorsión de dominio. Reutilizado por el generador
 * de mundos (Web Worker), el atlas de texturas y las nubes.
 */

/** PRNG determinista Park–Miller (minstd): misma semilla ⇒ misma secuencia. */
export class PRNG {
    constructor(seed) {
        this.state = Math.floor(Math.abs(seed)) % 2147483647;
        if (this.state <= 0) this.state += 2147483646;
    }
    /** Entero en [1, 2^31−2]. */
    next() {
        this.state = (this.state * 16807) % 2147483647;
        return this.state;
    }
    /** Flotante en [0, 1). */
    float() {
        return (this.next() - 1) / 2147483646;
    }
    /** Entero en [0, n). */
    int(n) {
        return Math.floor(this.float() * n);
    }
}

/**
 * Hash posicional: combina enteros (semilla, coordenadas de chunk, sal de
 * feature) en una semilla válida para PRNG. Es el mecanismo del Minecraft
 * real para que cada chunk decida sus propias cuevas/árboles de forma
 * determinista e independiente del orden de generación.
 */
export function hashSeed(...nums) {
    let h = 0x811c9dc5;
    for (const n of nums) {
        const v = n | 0;
        h ^= v;
        h = Math.imul(h, 0x01000193);
        h ^= v >>> 15;
        h = Math.imul(h, 0x85EBCA77);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0xC2B2AE3D);
    h ^= h >>> 13;
    return ((h >>> 0) % 2147483645) + 1;
}

/** Convierte una cadena o número en semilla numérica estable. */
export function toSeed(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
    const s = String(value);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h) || 1;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t, a, b) => a + t * (b - a);

/** Ruido Perlin 2D clásico (tabla de permutación barajada con el PRNG). */
export class Perlin2D {
    constructor(rng) {
        this.p = new Uint8Array(512);
        const base = new Uint8Array(256);
        for (let i = 0; i < 256; i++) base[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = rng.int(i + 1);
            const t = base[i]; base[i] = base[j]; base[j] = t;
        }
        for (let i = 0; i < 512; i++) this.p[i] = base[i & 255];
    }
    grad(hash, x, y) {
        switch (hash & 7) {
            case 0: return  x + y;
            case 1: return -x + y;
            case 2: return  x - y;
            case 3: return -x - y;
            case 4: return  x;
            case 5: return -x;
            case 6: return  y;
            default: return -y;
        }
    }
    /** Valor en ≈[−1, 1]. */
    value(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = fade(x), v = fade(y);
        const p = this.p;
        const a = p[X] + Y, b = p[X + 1] + Y;
        return lerp(v,
            lerp(u, this.grad(p[a], x, y),     this.grad(p[b], x - 1, y)),
            lerp(u, this.grad(p[a + 1], x, y - 1), this.grad(p[b + 1], x - 1, y - 1)));
    }
}

/** Suma de octavas de Perlin (ruido fractal browniano). */
export class Fractal2D {
    constructor(rng, octaves = 8) {
        this.octaves = [];
        for (let i = 0; i < octaves; i++) this.octaves.push(new Perlin2D(rng));
    }
    /** Valor en ≈[−2, 2] con 8 octavas. */
    value(x, y) {
        let sum = 0, freq = 1, amp = 1;
        for (const o of this.octaves) {
            sum += o.value(x * freq, y * freq) * amp;
            freq *= 2;
            amp /= 2;
        }
        return sum;
    }
}

/** Distorsión de dominio: muestrea `source` en coordenadas perturbadas. */
export class Distorted2D {
    constructor(source, distortX, distortY, strength = 8) {
        this.source = source;
        this.dx = distortX;
        this.dy = distortY;
        this.k = strength;
    }
    value(x, y) {
        return this.source.value(
            x + this.dx.value(x, y) * this.k,
            y + this.dy.value(x, y) * this.k);
    }
}

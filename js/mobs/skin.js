/**
 * Piel procedural de un mob: búfer de píxeles RGBA con utilidades de pintado
 * píxel a píxel, en la línea del atlas de bloques. Sin DOM (probable en Node):
 * el render la sube directamente a WebGL con texImage2D.
 *
 * Coordenadas en texels con origen arriba-izquierda, como las UV de model.js.
 */
import { PRNG } from '../noise.js';

export class Skin {
    /**
     * @param {number} w — ancho en texels
     * @param {number} h — alto en texels
     * @param {number} seed — semilla del PRNG (mismo aspecto en cada carga)
     */
    constructor(w, h, seed) {
        this.w = w;
        this.h = h;
        this.rng = new PRNG(seed);
        this.data = new Uint8ClampedArray(w * h * 4); // transparente por defecto
    }

    /** Pinta un texel; fuera de rango se ignora. */
    px(x, y, color, a = 255) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4;
        this.data[i] = color[0];
        this.data[i + 1] = color[1];
        this.data[i + 2] = color[2];
        this.data[i + 3] = a;
    }

    /** Rellena un rectángulo variando la luminancia ±spread (0 = color plano). */
    fill(x, y, w, h, color, spread = 0) {
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                const d = spread ? Math.floor((this.rng.float() * 2 - 1) * spread) : 0;
                this.px(x + i, y + j, [color[0] + d, color[1] + d, color[2] + d]);
            }
        }
    }

    /** Pinta `count` motas del color dado dentro del rectángulo. */
    speckle(x, y, w, h, count, color) {
        for (let i = 0; i < count; i++) {
            this.px(x + this.rng.int(w), y + this.rng.int(h), color);
        }
    }

    /** Borde de 1 texel alrededor del rectángulo (por dentro). */
    outline(x, y, w, h, color) {
        for (let i = 0; i < w; i++) { this.px(x + i, y, color); this.px(x + i, y + h - 1, color); }
        for (let j = 0; j < h; j++) { this.px(x, y + j, color); this.px(x + w - 1, y + j, color); }
    }

    /** Franjas horizontales alternadas (vetas, ropa). */
    stripes(x, y, w, h, period, colorA, colorB, spread = 0) {
        for (let j = 0; j < h; j++) {
            const c = Math.floor(j / period) % 2 === 0 ? colorA : colorB;
            for (let i = 0; i < w; i++) {
                const d = spread ? Math.floor((this.rng.float() * 2 - 1) * spread) : 0;
                this.px(x + i, y + j, [c[0] + d, c[1] + d, c[2] + d]);
            }
        }
    }
}

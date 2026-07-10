/**
 * Carve (Fase 2 del desgranado): el bloque que el jugador está PICANDO se
 * representa como una rejilla N×N×N de sub-vóxeles presentes/ausentes, y cada
 * golpe ARRANCA una esfera de sub-vóxeles alrededor del punto de impacto,
 * abriendo un cráter con forma real. Los sub-vóxeles arrancados se devuelven
 * (posición + color) para que el ShatterSystem los lance como esquirlas.
 *
 * Módulo PURO (sin DOM ni WebGL, probable en Node): el estado y el tallado
 * viven aquí; la MALLA sub-vóxel del bloque activo la construye renderer.js a
 * partir de `state.present`, y main.js orquesta golpes y esquirlas.
 *
 * Un solo CarveState vivo a la vez (el bloque bajo el pico), así el coste es
 * ~0: una rejilla 8³ = 512 bits y un remallado por golpe, no por frame.
 */

export const CARVE_N = 8; // sub-vóxeles por eje del bloque activo

export class CarveState {
    /**
     * @param id id del bloque; x,y,z su celda en el mundo.
     * @param sampler (cara,u,v)→[r,g,b] o null: color real por cara (como Fase 1).
     * @param n subdivisiones por eje.
     */
    constructor(id, x, y, z, sampler, n = CARVE_N) {
        this.id = id; this.x = x; this.y = y; this.z = z;
        this.n = n;
        this.sampler = sampler;
        // present[(iy*n + iz)*n + ix] = 1 si el sub-vóxel sigue ahí
        this.present = new Uint8Array(n * n * n).fill(1);
        this.vivos = n * n * n;         // sub-vóxeles restantes
        this.dirty = true;              // la malla necesita reconstruirse
        // color cacheado por celda de superficie (se calcula al mallar/arrancar)
        this._colorCache = new Map();
    }

    idx(ix, iy, iz) { return (iy * this.n + iz) * this.n + ix; }
    has(ix, iy, iz) {
        const n = this.n;
        if (ix < 0 || iy < 0 || iz < 0 || ix >= n || iy >= n || iz >= n) return false;
        return this.present[this.idx(ix, iy, iz)] === 1;
    }

    /** Color real [r,g,b] del sub-vóxel según la cara que expone (o gris). */
    colorDe(ix, iy, iz) {
        const key = this.idx(ix, iy, iz);
        const cached = this._colorCache.get(key);
        if (cached) return cached;
        const n = this.n;
        // cara dominante: la del eje en el borde más cercano
        let cara, u, v;
        if (iy === n - 1) { cara = 'top'; u = (ix + 0.5) / n; v = (iz + 0.5) / n; }
        else if (iy === 0) { cara = 'bottom'; u = (ix + 0.5) / n; v = (iz + 0.5) / n; }
        else { cara = 'side'; u = (ix + 0.5) / n; v = 1 - (iy + 0.5) / n; }
        let c = this.sampler ? this.sampler(cara, u, v) : null;
        if (!c) c = [150, 150, 150];
        this._colorCache.set(key, c);
        return c;
    }

    /**
     * Arranca una esfera de sub-vóxeles centrada en el punto de impacto (en
     * coordenadas locales 0..1 del bloque) con `radio` en sub-vóxeles.
     * Devuelve los arrancados como {pos:[x,y,z mundo], color:[r,g,b]} para
     * las esquirlas. Marca la malla como sucia si cambió algo.
     */
    carve(lx, ly, lz, radio) {
        const n = this.n;
        // centro en índices de sub-vóxel
        const cx = lx * n, cy = ly * n, cz = lz * n;
        const r = radio, r2 = r * r;
        const arrancados = [];
        const lo = (v) => Math.max(0, Math.floor(v - r));
        const hi = (v) => Math.min(n - 1, Math.ceil(v + r));
        for (let ix = lo(cx); ix <= hi(cx); ix++)
            for (let iy = lo(cy); iy <= hi(cy); iy++)
                for (let iz = lo(cz); iz <= hi(cz); iz++) {
                    if (!this.has(ix, iy, iz)) continue;
                    const dx = ix + 0.5 - cx, dy = iy + 0.5 - cy, dz = iz + 0.5 - cz;
                    if (dx * dx + dy * dy + dz * dz > r2) continue;
                    const color = this.colorDe(ix, iy, iz);
                    this.present[this.idx(ix, iy, iz)] = 0;
                    this.vivos--;
                    arrancados.push({
                        pos: [this.x + (ix + 0.5) / n, this.y + (iy + 0.5) / n, this.z + (iz + 0.5) / n],
                        color,
                    });
                }
        if (arrancados.length) this.dirty = true;
        return arrancados;
    }

    /** ¿Queda tan poco que conviene considerarlo roto? (fracción restante). */
    get fraccion() { return this.vivos / (this.n ** 3); }
}

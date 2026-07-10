/**
 * Shatter: al romper un bloque, en lugar del (o además del) cubito flotante,
 * el bloque se DESGRANA en una nube de mini-vóxeles con el COLOR REAL de sus
 * píxeles de textura, que salen despedidos, caen con gravedad, rebotan en el
 * suelo, ruedan y se desvanecen. Da la sensación de que el cubo estaba hecho
 * por dentro de vóxeles más pequeños.
 *
 * Este módulo es PURO (sin DOM ni WebGL, probable en Node): la simulación
 * vive aquí; el DIBUJO (cubos con color plano por vértice) vive en
 * renderer.js. main.js suministra el muestreo de color por cara/celda para
 * que el sistema no dependa del atlas ni del canvas.
 *
 * Un bloque se sub-voxeliza a N×N×N (por defecto 8): solo la CÁSCARA (las
 * celdas de la superficie del cubo) se convierte en fragmentos —el interior
 * no se ve y solo costaría memoria— con un submuestreo para no lanzar 384
 * fragmentos por bloque de golpe. El color de cada fragmento sale del píxel
 * real de la cara del bloque que le corresponde.
 */

const GRAVEDAD = 22;
const TTL = 3.2;           // s de vida de un fragmento antes de desvanecerse
const REBOTE = 0.32;       // energía conservada al rebotar en el suelo
const ROCE = 0.72;         // rozamiento horizontal al tocar suelo
const CAP = 2800;          // fragmentos simultáneos (los más viejos ceden sitio)

/**
 * Fragmentos de un bloque de N×N×N: recorre la cáscara con paso `step`
 * (submuestreo) y, para cada celda de superficie, crea un fragmento con el
 * color muestreado y una velocidad inicial que estalla desde el centro.
 *
 * @param sampler (cara, u, v) → [r,g,b] en 0..255. `cara` es 'top'|'bottom'|'side';
 *        u,v son coordenadas 0..1 sobre la cara. Devuelve null → celda vacía.
 */
export class ShatterSystem {
    constructor() {
        // fragmento: {pos, vel, color:[r,g,b], size, age, spin}
        this.list = [];
    }

    /**
     * Desgrana el bloque `id` en la celda (x,y,z). `sampler(cara,u,v)` da el
     * color; `n` = subdivisiones por eje; `step` = salto del submuestreo
     * (2 → una de cada 2 celdas por eje: ~96 fragmentos de un bloque 8³).
     * `rng` inyectable para tests deterministas.
     */
    spawn(id, x, y, z, sampler, n = 8, step = 2, rng = Math.random) {
        const size = step / n;                 // arista del mini-cubo en bloques
        const half = size * 0.5;
        // DENSIDAD fragmentos emitidos por celda de la cáscara (2 = el doble
        // de esquirlas, cada una con offset/velocidad propios para que no se
        // solapen y el desgranado se vea más tupido)
        const DENSIDAD = 2;
        // recorre solo la cáscara: al menos una coord en el borde {0, n-1}
        for (let ix = 0; ix < n; ix += step) {
            for (let iy = 0; iy < n; iy += step) {
                for (let iz = 0; iz < n; iz += step) {
                    const borde = ix === 0 || ix >= n - step ||
                                  iy === 0 || iy >= n - step ||
                                  iz === 0 || iz >= n - step;
                    if (!borde) continue;

                    // color de la cara dominante de esta celda de superficie
                    const color = this.colorDeCelda(sampler, ix, iy, iz, n, step);
                    if (!color) continue;

                  for (let rep = 0; rep < DENSIDAD; rep++) {
                    if (this.list.length >= CAP) this.list.shift();

                    // pequeño jitter dentro de la celda para las esquirlas
                    // extra, acotado a ±size/4 para no salir del volumen del bloque
                    const jit = () => (rng() - 0.5) * size * 0.5;
                    // centro del mini-vóxel dentro del bloque (0..1 → mundo)
                    const cx = x + (ix + 0.5) / n + jit();
                    const cy = y + (iy + 0.5) / n + jit();
                    const cz = z + (iz + 0.5) / n + jit();

                    // estallido radial desde el centro del bloque + empuje arriba
                    const dx = (ix + 0.5) / n - 0.5;
                    const dy = (iy + 0.5) / n - 0.5;
                    const dz = (iz + 0.5) / n - 0.5;
                    const fuerza = 3.2 + rng() * 2.5;

                    this.list.push({
                        pos: [cx, cy, cz],
                        vel: [
                            dx * fuerza + (rng() - 0.5) * 1.5,
                            dy * fuerza + 2.4 + rng() * 1.6,   // sesgo hacia arriba
                            dz * fuerza + (rng() - 0.5) * 1.5,
                        ],
                        color,
                        size: size * (0.7 + rng() * 0.5),      // variación de tamaño
                        age: 0,
                        ttl: TTL * (0.7 + rng() * 0.6),
                        rest: false,                            // ya posado en suelo
                        flat: 1,                                // escala en Y (1=cubo; <1 al asentarse)
                        shade: 1,                               // multiplicador de sombra (baja al posarse)
                    });
                  } // rep (DENSIDAD)
                }
            }
        }
    }

    /**
     * Lanza UN fragmento suelto en `pos` con `color` (esquirla del tallado por
     * golpe, Fase 2): estallido corto hacia arriba y afuera, vida más breve
     * que el desgranado completo. `rng` inyectable para tests.
     */
    spawnFragmento(pos, color, rng = Math.random) {
        if (this.list.length >= CAP) this.list.shift();
        this.list.push({
            pos: [pos[0], pos[1], pos[2]],
            vel: [(rng() - 0.5) * 3, 2 + rng() * 2.5, (rng() - 0.5) * 3],
            color,
            size: 0.09 * (0.7 + rng() * 0.5),
            age: 0,
            ttl: TTL * (0.5 + rng() * 0.4),
            rest: false,
            flat: 1,
            shade: 1,
        });
    }

    /** Color de una celda de la cáscara: usa la cara del eje en el que toca borde.
     *  `step` define cuál es la última capa muestreada (borde superior = n-step). */
    colorDeCelda(sampler, ix, iy, iz, n, step) {
        const alto = n - step; // índice de la última capa por eje con este submuestreo
        // prioridad: cara superior/inferior si toca ese borde, si no un lateral
        let cara, u, v;
        if (iy >= alto || iy === 0) {
            cara = iy === 0 ? 'bottom' : 'top';
            u = (ix + 0.5) / n; v = (iz + 0.5) / n;
        } else {
            cara = 'side';
            // en un lateral, u recorre el eje horizontal del borde tocado
            const horiz = (ix === 0 || ix >= alto) ? iz : ix;
            u = (horiz + 0.5) / n; v = 1 - (iy + 0.5) / n;
        }
        return sampler(cara, u, v);
    }

    /**
     * Física de todos los fragmentos. `world.solidAt(x,y,z)` frena la caída.
     * Los posados dejan de integrar y solo cuentan su vida (barato).
     */
    update(dt, world) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const f = this.list[i];
            f.age += dt;
            if (f.age > f.ttl) { this.list.splice(i, 1); continue; }
            if (f.rest) continue; // posado: solo envejece (y se desvanece)

            f.vel[1] -= GRAVEDAD * dt;

            // integración por ejes con colisión contra el terreno del mundo
            for (let eje = 0; eje < 3; eje++) {
                const nuevo = f.pos[eje] + f.vel[eje] * dt;
                const p = [f.pos[0], f.pos[1], f.pos[2]];
                p[eje] = nuevo;
                const bx = Math.floor(p[0]), by = Math.floor(p[1] - (eje === 1 ? 0.02 : 0)), bz = Math.floor(p[2]);
                if (world && world.solidAt(bx, by, bz)) {
                    if (eje === 1 && f.vel[1] < 0) {
                        // rebote amortiguado; si ya casi no bota, se posa
                        if (Math.abs(f.vel[1]) < 1.6) {
                            f.vel[1] = 0; f.vel[0] *= ROCE; f.vel[2] *= ROCE;
                            if (Math.abs(f.vel[0]) < 0.15 && Math.abs(f.vel[2]) < 0.15) {
                                f.rest = true;
                                // asentado: se aplana (parece sedimento del montón)
                                // y baja al ras del suelo; se oscurece un poco
                                f.flat = 0.45 + Math.random() * 0.2;
                                f.pos[1] = Math.floor(f.pos[1]) + f.size * f.flat * 0.5 + 0.01;
                                f.shade = 0.7 + Math.random() * 0.15;
                            }
                        } else {
                            f.vel[1] = -f.vel[1] * REBOTE;
                            f.vel[0] *= ROCE; f.vel[2] *= ROCE;
                        }
                    } else if (eje !== 1) {
                        f.vel[eje] = 0; // choca contra pared: frena en ese eje
                    }
                } else {
                    f.pos[eje] = nuevo;
                }
            }
        }
    }

    /**
     * Alfa de desvanecimiento de un fragmento (1 casi toda su vida, cae a 0 en
     * el último 25 %). Lo usa el renderer para el fundido.
     */
    static fade(f) {
        const t = f.age / f.ttl;
        return t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    }
}

/**
 * Inventario de supervivencia: cuenta de bloques recolectados por id.
 * Módulo puro (sin DOM, probable en Node): main.js aplica las reglas
 * (romper recoge, colocar consume) y el HUD pinta las cantidades.
 * En modo creativo no se usa: acceso a todos los materiales sin cuenta.
 */

/** Tamaño de la pila clásica: máximo de unidades por casilla. */
export const STACK = 64;

export class Inventory {
    /** @param {Object<number,number>} counts — objeto plano id → cantidad (guardado) */
    constructor(counts = {}) {
        this.counts = new Map();
        for (const [id, n] of Object.entries(counts)) {
            if (n > 0) this.counts.set(Number(id), Math.floor(n));
        }
    }

    /** Existencias del bloque (0 si no hay). */
    count(id) { return this.counts.get(id) || 0; }

    /** Recoge `n` unidades del bloque. */
    add(id, n = 1) { this.counts.set(id, this.count(id) + n); }

    /** Consume `n` unidades; si no alcanzan, no toca nada y devuelve false. */
    take(id, n = 1) {
        const c = this.count(id);
        if (c < n) return false;
        if (c === n) this.counts.delete(id);
        else this.counts.set(id, c - n);
        return true;
    }

    /** Ids con existencias, ordenados por id (para el selector). */
    ids() { return [...this.counts.keys()].sort((a, b) => a - b); }

    /**
     * Existencias divididas en pilas de hasta `max` unidades (64, como la
     * pila clásica): un material con más unidades ocupa varias casillas.
     */
    stacks(max = STACK) {
        const pilas = [];
        for (const id of this.ids()) {
            let resto = this.count(id);
            while (resto > 0) {
                const n = Math.min(max, resto);
                pilas.push({ id, n });
                resto -= n;
            }
        }
        return pilas;
    }

    /** Objeto plano para persistir en el guardado. */
    toJSON() { return Object.fromEntries(this.counts); }
}

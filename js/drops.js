/**
 * Drops: los bloques rotos en supervivencia quedan flotando como cubitos 3D
 * que giran y se recogen al acercarse. Módulo puro (sin DOM, probable en
 * Node): la física y la recogida viven aquí; el dibujo, en renderer.js.
 */

const GRAVEDAD = 18;
const TTL = 60;            // s de vida antes de desvanecerse
const RADIO_RECOGIDA = 1.2;
const RADIO_IMAN = 2.75;   // desde aquí el drop vuela hacia el jugador
const VEL_IMAN = 6;
const CAP = 64;            // drops simultáneos (el más viejo cede su sitio)

export class DropSystem {
    constructor() {
        this.list = []; // {id, pos:[x,y,z], vel:[x,y,z], age}
    }

    /** Suelta un drop del bloque `id` en el centro de la celda rota. */
    spawn(id, x, y, z, rng = Math.random) {
        if (this.list.length >= CAP) this.list.shift();
        this.list.push({
            id,
            pos: [x + 0.5, y + 0.4, z + 0.5],
            vel: [(rng() - 0.5) * 2, 2.5, (rng() - 0.5) * 2],
            age: 0,
        });
    }

    /**
     * Física, imán y recogida. `world` aporta solidAt(x, y, z);
     * `onPickup(id)` se llama al recoger (añadir al inventario, sonido…).
     */
    update(dt, playerPos, world, onPickup) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const d = this.list[i];
            d.age += dt;
            if (d.age > TTL) { this.list.splice(i, 1); continue; }

            const dx = playerPos[0] - d.pos[0];
            const dy = (playerPos[1] + 0.9) - d.pos[1]; // hacia el torso
            const dz = playerPos[2] - d.pos[2];
            const dist = Math.hypot(dx, dy, dz);

            if (dist < RADIO_RECOGIDA) {
                onPickup(d.id);
                this.list.splice(i, 1);
                continue;
            }
            if (dist < RADIO_IMAN) {
                // vuela en línea recta hacia el jugador (sin gravedad)
                const k = VEL_IMAN / dist;
                d.vel = [dx * k, dy * k, dz * k];
            } else {
                d.vel[1] -= GRAVEDAD * dt;
            }

            // integración por ejes: el suelo frena la caída y roza en horizontal
            for (let eje = 0; eje < 3; eje++) {
                const nuevo = d.pos[eje] + d.vel[eje] * dt;
                const p = [d.pos[0], d.pos[1], d.pos[2]];
                p[eje] = nuevo;
                if (world.solidAt(Math.floor(p[0]), Math.floor(p[1] - 0.15), Math.floor(p[2])) &&
                    eje === 1 && d.vel[1] < 0) {
                    d.vel[1] = 0;
                    d.vel[0] *= 0.6;
                    d.vel[2] *= 0.6;
                } else if (!world.solidAt(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]))) {
                    d.pos[eje] = nuevo;
                }
            }
        }
    }
}

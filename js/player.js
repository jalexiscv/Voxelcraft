/**
 * Jugador en primera persona: física con AABB (gravedad, salto, natación,
 * vuelo y sprint), resolución de colisiones por ejes y raycast DDA para
 * apuntar bloques (algoritmo de Amanatides & Woo).
 */
import { B, DEFS } from './blocks.js';
import { clamp } from './math.js';

const WIDTH = 0.6;       // ancho del AABB
const HEIGHT = 1.8;      // alto del AABB
const EYE = 1.62;        // altura de los ojos sobre los pies

const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.8;
const SWIM_SPEED = 3.2;
const FLY_SPEED = 13;
const GRAVITY = 28;
const JUMP_VELOCITY = 8.6;   // ≈ 1.3 bloques de salto
const WATER_GRAVITY = 7;
const WATER_SINK_MAX = 3.5;
const SWIM_UP = 4.5;

export class Player {
    constructor() {
        this.pos = [0, 0, 0]; // pies (centro del AABB en XZ)
        this.vel = [0, 0, 0];
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;
        this.inWater = false;
        this.flying = false;
        this.hitWall = false; // colisión horizontal en el último paso
    }

    eye() {
        return [this.pos[0], this.pos[1] + EYE, this.pos[2]];
    }

    /**
     * Coloca al jugador sobre tierra firme cerca del origen: busca en anillos
     * crecientes la primera columna generada, seca y sobre el nivel del mar.
     * `radius` limita la búsqueda al área ya cargada.
     */
    spawn(world, radius = 64) {
        let sx = 0, sz = 0;
        outer:
        for (let r = 0; r < radius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // solo el anillo
                    const y = world.surfaceY(dx, dz);
                    if (y >= 1 && y + 1 >= world.sy / 2 && world.get(dx, y + 1, dz) !== B.WATER) {
                        sx = dx; sz = dz;
                        break outer;
                    }
                }
            }
        }
        this.pos = [sx + 0.5, world.surfaceY(sx, sz) + 1.01, sz + 0.5];
        this.vel = [0, 0, 0];
        this.yaw = 0;
        this.pitch = 0;
        this.flying = false;
    }

    /**
     * Avanza la simulación. `input` = {forward, back, left, right, jump,
     * down, sprint} (booleanos mantenidos).
     */
    update(dt, input, world) {
        const wasInWater = this.inWater;
        this.inWater = this.isInWater(world);

        // dirección deseada en el plano XZ, relativa al yaw
        const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
        const s = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        let wishX = -Math.sin(this.yaw) * f + Math.cos(this.yaw) * s;
        let wishZ = -Math.cos(this.yaw) * f - Math.sin(this.yaw) * s;
        const len = Math.hypot(wishX, wishZ);
        if (len > 1) { wishX /= len; wishZ /= len; }

        const speed = this.flying ? FLY_SPEED
            : this.inWater ? SWIM_SPEED
            : input.sprint ? SPRINT_SPEED : WALK_SPEED;
        const accel = this.flying ? 40 : this.inWater ? 16 : this.onGround ? 40 : 10;

        this.vel[0] = approach(this.vel[0], wishX * speed, accel * dt);
        this.vel[2] = approach(this.vel[2], wishZ * speed, accel * dt);

        // eje vertical según el modo de movimiento
        if (this.flying) {
            const wishY = (input.jump ? 1 : 0) - (input.down ? 1 : 0);
            this.vel[1] = approach(this.vel[1], wishY * FLY_SPEED * 0.8, 50 * dt);
        } else if (this.inWater) {
            this.vel[1] -= WATER_GRAVITY * dt;
            if (this.vel[1] < -WATER_SINK_MAX) this.vel[1] = -WATER_SINK_MAX;
            if (input.jump) this.vel[1] = approach(this.vel[1], SWIM_UP, 30 * dt);
        } else {
            this.vel[1] -= GRAVITY * dt;
            if (input.jump && this.onGround) this.vel[1] = JUMP_VELOCITY;
        }

        this.onGround = false;
        this.hitWall = false;
        this.moveAxis(world, 0, this.vel[0] * dt);
        this.moveAxis(world, 1, this.vel[1] * dt);
        this.moveAxis(world, 2, this.vel[2] * dt);

        // Auparse fuera del agua: el impulso de nado (SWIM_UP) se queda corto
        // para superar la orilla. Al nadar contra un bloque que tenga espacio
        // libre encima, saltar da el impulso de un salto normal (como en el
        // Minecraft real al chocar de frente nadando).
        if (this.inWater && input.jump && this.hitWall) {
            const len = Math.hypot(wishX, wishZ);
            if (len > 0.1) {
                const fx = Math.floor(this.pos[0] + (wishX / len) * 0.8);
                const fz = Math.floor(this.pos[2] + (wishZ / len) * 0.8);
                for (let fy = Math.floor(this.pos[1] + 1.1); fy >= Math.floor(this.pos[1]); fy--) {
                    if (world.solidAt(fx, fy, fz) &&
                        !world.solidAt(fx, fy + 1, fz) && !world.solidAt(fx, fy + 2, fz)) {
                        this.vel[1] = JUMP_VELOCITY;
                        break;
                    }
                }
            }
        }

        // red de seguridad: caer del mundo
        if (this.pos[1] < -20) this.spawn(world);

        return { enteredWater: this.inWater && !wasInWater };
    }

    isInWater(world) {
        const x = Math.floor(this.pos[0]);
        const z = Math.floor(this.pos[2]);
        const feet = world.get(x, Math.floor(this.pos[1] + 0.4), z);
        const chest = world.get(x, Math.floor(this.pos[1] + 1.1), z);
        return feet === B.WATER || chest === B.WATER;
    }

    /** ¿Están los ojos sumergidos? (para el sonido de zambullida, etc.) */
    eyesInWater(world) {
        const [ex, ey, ez] = this.eye();
        return world.get(Math.floor(ex), Math.floor(ey), Math.floor(ez)) === B.WATER;
    }

    /** Mueve un componente y resuelve la colisión contra bloques sólidos. */
    moveAxis(world, axis, delta) {
        if (delta === 0) return;
        this.pos[axis] += delta;
        const half = WIDTH / 2;
        const min = [this.pos[0] - half, this.pos[1], this.pos[2] - half];
        const max = [this.pos[0] + half, this.pos[1] + HEIGHT, this.pos[2] + half];
        const eps = 0.001;

        for (let x = Math.floor(min[0] + eps); x <= Math.floor(max[0] - eps); x++) {
            for (let y = Math.floor(min[1] + eps); y <= Math.floor(max[1] - eps); y++) {
                for (let z = Math.floor(min[2] + eps); z <= Math.floor(max[2] - eps); z++) {
                    // solidAt trata los chunks no generados como barrera
                    if (!world.solidAt(x, y, z)) continue;
                    if (axis === 1) {
                        if (delta < 0) { this.pos[1] = y + 1; this.onGround = true; }
                        else this.pos[1] = y - HEIGHT - eps;
                    } else {
                        const cell = axis === 0 ? x : z;
                        if (delta > 0) this.pos[axis] = cell - half - eps;
                        else this.pos[axis] = cell + 1 + half + eps;
                        this.hitWall = true;
                    }
                    this.vel[axis] = 0;
                    return;
                }
            }
        }
    }

    /** ¿Colisionaría el AABB del jugador con un bloque colocado en (bx,by,bz)? */
    intersectsBlock(bx, by, bz) {
        const half = WIDTH / 2;
        return bx + 1 > this.pos[0] - half && bx < this.pos[0] + half &&
               by + 1 > this.pos[1] && by < this.pos[1] + HEIGHT &&
               bz + 1 > this.pos[2] - half && bz < this.pos[2] + half;
    }

    /** Id del bloque bajo los pies (para el sonido de pasos). */
    groundBlock(world) {
        return world.get(Math.floor(this.pos[0]), Math.floor(this.pos[1] - 0.5), Math.floor(this.pos[2]));
    }
}

function approach(current, target, maxDelta) {
    const d = target - current;
    return Math.abs(d) <= maxDelta ? target : current + Math.sign(d) * maxDelta;
}

/**
 * Raycast DDA por la rejilla de vóxeles. Devuelve el primer bloque sólido o
 * planta alcanzado: {x, y, z, id, nx, ny, nz} (n = normal de la cara) o null.
 */
export function raycast(world, origin, dir, maxDist = 5) {
    let [x, y, z] = origin.map(Math.floor);
    const step = dir.map((d) => (d > 0 ? 1 : -1));
    const tDelta = dir.map((d) => (d === 0 ? Infinity : Math.abs(1 / d)));
    const tMax = dir.map((d, i) => {
        if (d === 0) return Infinity;
        const cell = [x, y, z][i];
        const next = d > 0 ? cell + 1 : cell;
        return Math.abs((next - origin[i]) / d);
    });
    let normal = [0, 0, 0];
    let dist = 0;

    while (dist <= maxDist) {
        const id = world.get(x, y, z);
        const def = DEFS[id];
        // los paneles no sólidos (la hoja abierta de la puerta) también son
        // objetivo: si el rayo los atravesara, la puerta no podría cerrarse;
        // los bloques dinámicos (cámara) tampoco colisionan pero se apuntan
        // igual, para poder romperlos
        if (id !== B.AIR && (def.solid || def.cross || def.panel || def.dinamico)) {
            return { x, y, z, id, nx: normal[0], ny: normal[1], nz: normal[2] };
        }
        // avanzar al siguiente cruce de celda
        const axis = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
        dist = tMax[axis];
        tMax[axis] += tDelta[axis];
        if (axis === 0) x += step[0];
        else if (axis === 1) y += step[1];
        else z += step[2];
        normal = [0, 0, 0];
        normal[axis] = -step[axis];
    }
    return null;
}

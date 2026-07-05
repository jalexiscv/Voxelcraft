/**
 * Sistema de mobs: entidades con física AABB (la misma resolución por ejes
 * que el jugador), IA por estados, aparición/desaparición alrededor del
 * jugador, flechas y explosiones. Sin DOM ni WebGL (probable en Node): los
 * efectos (sonido, daño al jugador, onda expansiva) salen por `hooks`.
 *
 * Estados de IA: 'idle' | 'wander' | 'flee' | 'chase' | 'fuse' | 'hide'.
 * Los pasivos alternan idle/deambular y huyen al ser golpeados; los NEUTRALES
 * (behavior.neutral) viven como pasivos pero se vuelven hostiles un rato al
 * recibir daño; los hostiles persiguen al jugador (cuerpo a cuerpo, arquero,
 * mecha del creeper, o quietos si los miras: behavior.freezeWhenSeen).
 *
 * Locomoción por banderas de la definición: terrestre (por defecto),
 * `flying` (sin gravedad, altitud objetivo), `aquatic` (nada dentro del agua
 * y aletea varado en tierra), `hop` (avanza a saltos: conejo/rana/slime),
 * `glide` (cae lento). Otros rasgos: `timid` (huye si te acercas),
 * `hideOnHurt` (se repliega al ser golpeado), `noBurn` (no arde al sol),
 * `behavior.teleport` (se teletransporta al ser herido) y
 * `behavior.stingOnce` (una sola picadura y se calma, como la abeja).
 */
import { B } from './blocks.js';
import { raycast } from './player.js';
import { PRNG } from './noise.js';
import { clamp } from './math.js';
import { BiomeMap, SEA_LEVEL } from './biomes/map.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 8.2;     // salto automático ante un bloque (~1.2 bloques)
const ACCEL = 24;              // aceleración horizontal
const ACTIVE_RADIUS = 64;      // solo se simulan mobs a esta distancia
const DESPAWN_RADIUS = 80;
const SPAWN_MIN = 24;          // los mobs nunca aparecen más cerca
const SPAWN_MAX = 48;
const SPAWN_INTERVAL = 2;      // s entre tandas de intentos de aparición
const GLOBAL_CAP = 32;         // mobs simultáneos máximos (aparición natural)
const EGG_CAP = 128;           // tope duro con huevos de aparición (creativo)
const ANGER_TIME = 20;         // s de hostilidad de un neutral herido
const NIGHT = 0.35;            // factor de día por debajo del cual es de noche
const ARROW_SPEED = 20;
const ARROW_GRAVITY = 18;
const ARROW_STUCK_TIME = 30;   // s que una flecha queda clavada antes de desvanecerse

export class Mob {
    constructor(def, x, y, z, yaw = 0) {
        this.def = def;
        this.pos = [x, y, z];
        this.vel = [0, 0, 0];
        this.yaw = yaw;               // rumbo del cuerpo
        this.headYaw = yaw;           // mirada (relativa al mundo)
        this.headPitch = 0;
        this.animPhase = 0;           // fase del ciclo de patas
        this.animSpeed = 0;           // rapidez horizontal actual
        this.onGround = false;
        this.inWater = false;
        this.hitWall = false;
        this.hp = def.hp;
        this.hurtT = 0;               // destello rojo restante
        this.dieT = -1;               // ≥0: muriendo (se elimina al llegar a 0)
        this.state = 'idle';
        this.stateT = 1 + Math.random() * 2;
        this.speed = 0;               // rapidez deseada del estado actual
        this.attackCd = 0;
        this.fuseT = -1;              // ≥0: mecha del creeper encendida
        this.voiceT = 3 + Math.random() * 8;
        this.burnT = 0;
        this.angerT = 0;              // >0: neutral enfadado (actúa de hostil)
        this.hopT = 0;                // temporizador del siguiente brinco
        this.targetY = y;             // altitud/profundidad objetivo (volador/acuático)
        this.variant = 0;             // tonalidad de piel (defs con variants)
    }

    dying() { return this.dieT >= 0; }

    /** ¿Colisiona el AABB del mob con el segmento [min,max] de otro AABB? */
    intersects(min, max) {
        const half = this.def.aabb.w / 2;
        return this.pos[0] + half > min[0] && this.pos[0] - half < max[0] &&
               this.pos[1] + this.def.aabb.h > min[1] && this.pos[1] < max[1] &&
               this.pos[2] + half > min[2] && this.pos[2] - half < max[2];
    }
}

export class MobSystem {
    /**
     * @param {Object<string,object>} defs — registro de tipos por id
     * @param {World} world — mundo activo (get/set/solidAt/surfaceY/sunlit)
     * @param {object} hooks — {sound(kind, mob), damagePlayer(dmg, dir), explosion(pos)}
     * @param {number} seed — semilla del PRNG (aparición determinista en tests)
     *                        y del BiomeMap (el mismo mapa que el generador)
     */
    constructor(defs, world, hooks, seed = 1) {
        this.defs = defs;
        this.world = world;
        this.hooks = hooks;
        this.rng = new PRNG(seed);
        this.biomes = new BiomeMap(seed);
        this.mobs = [];
        this.arrows = [];
        this.spawnT = 1; // primer intento pronto tras entrar al mundo
    }

    count() { return this.mobs.length; }

    countOf(id) { return this.mobs.reduce((n, m) => n + (m.def.id === id ? 1 : 0), 0); }

    /**
     * Aparición FORZADA de un tipo en una celda (el huevo de aparición del
     * modo creativo): sin sorteo de hábitat ni topes por tipo — solo un
     * tope duro que protege al render — y con la tonalidad sorteada como
     * en la aparición natural (fija del bioma si la define). El mob saluda
     * con su voz al nacer. Devuelve el mob creado, o null (tipo
     * desconocido o tope alcanzado).
     */
    spawnAt(id, x, y, z) {
        const def = this.defs[id];
        if (!def || this.mobs.length >= EGG_CAP) return null;
        const m = new Mob(def, x + 0.5, y + 0.01, z + 0.5, this.rng.float() * Math.PI * 2);
        if (def.variants > 1) {
            const fija = def.variantBiome && def.variantBiome[this.biomeAt(x, z).id];
            m.variant = fija !== undefined ? fija : this.rng.int(def.variants);
        }
        this.mobs.push(m);
        this.hooks.sound('say', m);
        return m;
    }

    /* ---- Bucle ---- */

    /**
     * Avanza la simulación. `ctx` = {pos, eye, day}: posición (pies) y ojos
     * del jugador, y factor de día 0.22..1 (para aparición y hostilidad).
     */
    update(dt, ctx) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
            this.spawnT = SPAWN_INTERVAL;
            this.trySpawn(ctx);
        }

        for (let i = this.mobs.length - 1; i >= 0; i--) {
            const m = this.mobs[i];
            const dist = Math.hypot(m.pos[0] - ctx.pos[0], m.pos[2] - ctx.pos[2]);
            if (dist > DESPAWN_RADIUS) { this.mobs.splice(i, 1); continue; }
            if (dist > ACTIVE_RADIUS) continue; // dormido: ni IA ni física

            if (m.dying()) {
                m.dieT -= dt;
                if (m.dieT <= 0) this.mobs.splice(i, 1);
                continue;
            }
            this.updateMob(m, dt, ctx, dist);
            if (m.pos[1] < -20) this.mobs.splice(i, 1); // cayó del mundo
        }

        this.updateArrows(dt, ctx);
    }

    updateMob(m, dt, ctx, dist) {
        m.hurtT = Math.max(0, m.hurtT - dt);
        m.attackCd = Math.max(0, m.attackCd - dt);
        m.stateT -= dt;

        // los hostiles arden con el sol del día (amanecer letal clásico)
        if (m.def.hostile && !m.def.noBurn && !m.inWater && ctx.day > 0.5 && this.world.sunlit(
            Math.floor(m.pos[0]), Math.floor(m.pos[1] + 0.5), Math.floor(m.pos[2]))) {
            m.burnT += dt;
            if (m.burnT >= 0.5) { m.burnT = 0; this.hurt(m, 1, [0, 0, 0]); }
        }

        m.angerT = Math.max(0, m.angerT - dt);
        // en modo creativo los hostiles ignoran al jugador (deambulan como pasivos)
        if ((m.def.hostile || m.angerT > 0) && !ctx.creative) this.hostileAI(m, dt, ctx, dist);
        else this.passiveAI(m, dt, ctx, dist);

        this.stepPhysics(m, dt);

        // voz ocasional cerca del jugador
        m.voiceT -= dt;
        if (m.voiceT <= 0) {
            m.voiceT = 6 + this.rng.float() * 10;
            if (dist < 24 && m.def.voice && m.def.voice.say) this.hooks.sound('say', m);
        }
    }

    /* ---- IA ---- */

    passiveAI(m, dt, ctx, dist) {
        // replegado (armadillo): quieto hasta que pase el susto
        if (m.state === 'hide') {
            m.speed = 0;
            if (m.stateT <= 0) this.setState(m, 'idle');
            return;
        }
        // asustadizo (ocelote, zorro...): huye si el jugador se acerca
        if (m.def.timid && dist < 7 && m.state !== 'flee') this.setState(m, 'flee');

        if (m.state === 'flee') {
            m.yaw = Math.atan2(-(m.pos[0] - ctx.pos[0]), -(m.pos[2] - ctx.pos[2])) + Math.PI;
            m.speed = m.def.fleeSpeed || m.def.speed * 2.2;
            if (m.stateT <= 0) this.setState(m, 'wander');
        } else if (m.state === 'wander') {
            m.speed = m.def.speed;
            if (m.stateT <= 0) this.setState(m, 'idle');
        } else if (m.stateT <= 0) {
            this.setState(m, 'wander');
        } else {
            m.speed = 0;
        }
        // mirada: al jugador si está cerca, si no al frente
        this.lookAt(m, dist < 8 ? ctx.eye : null);
    }

    hostileAI(m, dt, ctx, dist) {
        const b = m.def.behavior || {};
        const aggro = b.aggro || 16;
        const d3 = Math.hypot(m.pos[0] - ctx.pos[0], m.pos[1] - ctx.pos[1], m.pos[2] - ctx.pos[2]);

        // mecha del creeper: quieto; explota o se desactiva según la distancia
        if (m.fuseT >= 0) {
            m.speed = 0;
            m.fuseT -= dt;
            if (d3 > 6) { m.fuseT = -1; this.setState(m, 'chase'); }
            else if (m.fuseT <= 0) { this.explode(m, ctx); return; }
            this.lookAt(m, ctx.eye);
            return;
        }

        if (dist > aggro && m.state !== 'chase') {
            this.passiveAI(m, dt, ctx, dist); // sin objetivo: deambula como un pasivo
            return;
        }
        m.state = 'chase';

        const toPlayer = Math.atan2(-(ctx.pos[0] - m.pos[0]), -(ctx.pos[2] - m.pos[2]));
        this.lookAt(m, ctx.eye);

        // el creaking solo avanza cuando nadie lo mira
        if (b.freezeWhenSeen && ctx.look) {
            const toMob = this.dirTo(ctx.eye, [m.pos[0], m.pos[1] + m.def.aabb.h * 0.6, m.pos[2]]);
            const dot = ctx.look[0] * toMob[0] + ctx.look[1] * toMob[1] + ctx.look[2] * toMob[2];
            if (dot > 0.8 && d3 < 28 && this.lineOfSight(m, ctx.eye)) { m.speed = 0; return; }
        }

        // perseguidores voladores/acuáticos apuntan también en vertical
        if (m.def.flying) m.targetY = ctx.eye[1];
        else if (m.def.aquatic) m.targetY = ctx.pos[1] + 0.5;

        if (b.fuse && d3 < 3) { m.fuseT = 1.5; this.hooks.sound('fuse', m); return; }

        if (b.projectile) {
            // arquero: mantiene la distancia y dispara con línea de visión
            if (d3 < 7) { m.yaw = toPlayer + Math.PI; m.speed = m.def.speed; }
            else if (d3 > 11) { m.yaw = toPlayer; m.speed = m.def.speed; }
            else { m.speed = 0; m.yaw = toPlayer; }
            if (m.attackCd <= 0 && d3 < 16 && this.lineOfSight(m, ctx.eye)) {
                m.attackCd = b.cooldown || 2.2;
                this.shootArrow(m, ctx);
            }
            return;
        }

        // cuerpo a cuerpo
        m.yaw = toPlayer;
        m.speed = m.def.speed;
        const range = b.attackRange || 1.6;
        if (d3 < range && m.attackCd <= 0) {
            m.attackCd = b.cooldown || 1.1;
            const dir = this.dirTo(m.pos, ctx.pos);
            this.hooks.damagePlayer(b.damage || 2, dir);
            if (b.lunge && m.onGround) { m.vel[1] = 5; } // brinco de araña/cabra
            if (b.stingOnce) m.angerT = 0;               // la abeja pica una vez
        }
        if (dist > aggro * 1.8) this.setState(m, 'wander'); // lo perdió de vista
    }

    setState(m, state) {
        m.state = state;
        if (state === 'idle') { m.stateT = 1.5 + this.rng.float() * 3; m.speed = 0; }
        if (state === 'wander') {
            m.stateT = 2 + this.rng.float() * 4;
            m.yaw = this.rng.float() * Math.PI * 2;
            m.speed = m.def.speed;
            // voladores y acuáticos deambulan también en vertical
            if (m.def.flying) {
                const ground = this.world.surfaceY(Math.floor(m.pos[0]), Math.floor(m.pos[2]));
                m.targetY = ground + 3 + this.rng.float() * 5;
            } else if (m.def.aquatic) {
                m.targetY = m.pos[1] + (this.rng.float() * 4 - 2);
            }
        }
        if (state === 'flee') m.stateT = 4;
        if (state === 'hide') { m.stateT = 5 + this.rng.float() * 3; m.speed = 0; }
    }

    /** Orienta cabeza (y pitch) hacia un punto, con límite de giro del cuello. */
    lookAt(m, point) {
        if (!point) { m.headYaw = m.yaw; m.headPitch *= 0.8; return; }
        const dx = point[0] - m.pos[0], dz = point[2] - m.pos[2];
        const dy = point[1] - (m.pos[1] + m.def.aabb.h * 0.85);
        const yaw = Math.atan2(-dx, -dz);
        let rel = yaw - m.yaw;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel)); // normalizar a ±π
        m.headYaw = m.yaw + clamp(rel, -1.2, 1.2);
        m.headPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.9, 0.9);
    }

    dirTo(from, to) {
        const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
        const len = Math.hypot(...d) || 1;
        return d.map((v) => v / len);
    }

    lineOfSight(m, eye) {
        const from = [m.pos[0], m.pos[1] + m.def.aabb.h * 0.85, m.pos[2]];
        const dir = this.dirTo(from, eye);
        const dist = Math.hypot(eye[0] - from[0], eye[1] - from[1], eye[2] - from[2]);
        return raycast(this.world, from, dir, dist) === null;
    }

    /* ---- Física ---- */

    stepPhysics(m, dt) {
        const fx = Math.floor(m.pos[0]), fz = Math.floor(m.pos[2]);
        m.inWater = this.world.get(fx, Math.floor(m.pos[1] + 0.3), fz) === B.WATER;

        // velocidad horizontal deseada según el rumbo
        const wishX = -Math.sin(m.yaw) * m.speed;
        const wishZ = -Math.cos(m.yaw) * m.speed;

        if (m.def.hop && !m.def.flying && !m.def.aquatic && m.onGround) {
            // locomoción a saltos (conejo/rana/slime): impulso por brinco,
            // fricción fuerte en el suelo
            m.vel[0] *= 0.6;
            m.vel[2] *= 0.6;
            m.hopT -= dt;
            if (m.speed > 0 && m.hopT <= 0) {
                m.hopT = 0.45 + this.rng.float() * 0.6;
                m.vel[0] = wishX * 1.4;
                m.vel[2] = wishZ * 1.4;
                m.vel[1] = 5.2;
            }
        } else if (m.def.aquatic && !m.inWater) {
            // varado en tierra: no camina, aletea con brincos débiles
            if (m.onGround) {
                m.vel[0] *= 0.4;
                m.vel[2] *= 0.4;
                if (this.rng.float() < 0.02) {
                    m.vel[1] = 3.5;
                    m.vel[0] = this.rng.float() * 2 - 1;
                    m.vel[2] = this.rng.float() * 2 - 1;
                }
            }
        } else {
            m.vel[0] = approach(m.vel[0], wishX, ACCEL * dt);
            m.vel[2] = approach(m.vel[2], wishZ, ACCEL * dt);
        }

        // eje vertical según el modo de locomoción
        if (m.def.flying) {
            const wishY = m.speed > 0 ? clamp((m.targetY - m.pos[1]) * 1.5, -m.def.speed, m.def.speed) : 0;
            m.vel[1] = approach(m.vel[1], wishY, 22 * dt);
        } else if (m.def.aquatic && m.inWater) {
            const wishY = clamp((m.targetY - m.pos[1]) * 1.2, -1.5, 1.5);
            m.vel[1] = approach(m.vel[1], wishY, 18 * dt);
        } else if (m.inWater) {
            m.vel[1] = approach(m.vel[1], 1.6, 20 * dt); // flota y nada hacia arriba
        } else {
            m.vel[1] -= GRAVITY * dt;
            if (m.def.glide && m.vel[1] < -3) m.vel[1] = -3; // aleteo de la gallina
        }

        m.hitWall = false;
        m.onGround = false;
        this.moveAxis(m, 0, m.vel[0] * dt);
        this.moveAxis(m, 1, m.vel[1] * dt);
        this.moveAxis(m, 2, m.vel[2] * dt);

        // salto automático al chocar de frente — pisando suelo o nadando
        // (así también salen del agua por la orilla, como el jugador); los
        // voladores no lo necesitan y los acuáticos no deben auparse a tierra
        if (m.hitWall && m.speed > 0 && !m.def.flying && !m.def.aquatic &&
            (m.onGround || m.inWater)) {
            m.vel[1] = m.def.jumpVel || JUMP_VELOCITY;
        }

        m.animSpeed = Math.hypot(m.vel[0], m.vel[2]);
        m.animPhase += m.animSpeed * dt * 3;
    }

    /** Misma resolución por ejes que el jugador, parametrizada por AABB. */
    moveAxis(m, axis, delta) {
        if (delta === 0) return;
        m.pos[axis] += delta;
        const half = m.def.aabb.w / 2, h = m.def.aabb.h;
        const min = [m.pos[0] - half, m.pos[1], m.pos[2] - half];
        const max = [m.pos[0] + half, m.pos[1] + h, m.pos[2] + half];
        const eps = 0.001;
        for (let x = Math.floor(min[0] + eps); x <= Math.floor(max[0] - eps); x++) {
            for (let y = Math.floor(min[1] + eps); y <= Math.floor(max[1] - eps); y++) {
                for (let z = Math.floor(min[2] + eps); z <= Math.floor(max[2] - eps); z++) {
                    if (!this.world.solidAt(x, y, z)) continue;
                    if (axis === 1) {
                        if (delta < 0) { m.pos[1] = y + 1; m.onGround = true; }
                        else m.pos[1] = y - h - eps;
                    } else {
                        const cell = axis === 0 ? x : z;
                        if (delta > 0) m.pos[axis] = cell - half - eps;
                        else m.pos[axis] = cell + 1 + half + eps;
                        m.hitWall = true;
                    }
                    m.vel[axis] = 0;
                    return;
                }
            }
        }
    }

    /* ---- Daño ---- */

    /** Aplica daño con retroceso; gestiona huida, enfado, teletransporte y muerte. */
    hurt(m, dmg, dir) {
        if (m.dying()) return;
        m.hp -= dmg;
        m.hurtT = 0.5;
        m.vel[0] += dir[0] * 6;
        m.vel[2] += dir[2] * 6;
        if (m.onGround) m.vel[1] = 4.5;
        if (m.hp <= 0) {
            m.dieT = 0.4;
            this.hooks.sound('death', m);
            // botín del mob (tabla en su definición; main decide si aplica)
            if (m.def.drops && this.hooks.drop) {
                for (const d of m.def.drops) {
                    if (d.chance !== undefined && this.rng.float() >= d.chance) continue;
                    const min = d.min || 0;
                    const n = min + this.rng.int((d.max !== undefined ? d.max : min) - min + 1);
                    for (let k = 0; k < n; k++) {
                        this.hooks.drop(d.id, m.pos[0], m.pos[1] + 0.4, m.pos[2]);
                    }
                }
            }
            return;
        }
        this.hooks.sound('hurt', m);
        if (!m.def.hostile && m.def.behavior && m.def.behavior.neutral) m.angerT = ANGER_TIME;
        if (m.def.behavior && m.def.behavior.teleport && this.rng.float() < 0.8) this.teleportAway(m);
        if (m.def.hideOnHurt) this.setState(m, 'hide');
        else this.setState(m, (m.def.hostile || m.angerT > 0) ? 'chase' : 'flee');
    }

    /** Teletransporte del enderman: reaparece en tierra firme cercana. */
    teleportAway(m) {
        for (let i = 0; i < 8; i++) {
            const a = this.rng.float() * Math.PI * 2;
            const d = 5 + this.rng.float() * 11;
            const x = Math.floor(m.pos[0] + Math.cos(a) * d);
            const z = Math.floor(m.pos[2] + Math.sin(a) * d);
            if (!this.world.hasChunk(x >> 4, z >> 4)) continue;
            const y = this.world.surfaceY(x, z) + 1;
            if (y <= 2 || this.world.get(x, y, z) === B.WATER) continue;
            m.pos = [x + 0.5, y + 0.01, z + 0.5];
            m.vel = [0, 0, 0];
            return;
        }
    }

    /** Primer mob alcanzado por el rayo (para el puñetazo del jugador). */
    raycastMob(origin, dir, maxDist) {
        let best = null;
        for (const m of this.mobs) {
            if (m.dying()) continue;
            const half = m.def.aabb.w / 2;
            const t = rayAABB(origin, dir,
                [m.pos[0] - half, m.pos[1], m.pos[2] - half],
                [m.pos[0] + half, m.pos[1] + m.def.aabb.h, m.pos[2] + half]);
            if (t !== null && t <= maxDist && (!best || t < best.dist)) best = { mob: m, dist: t };
        }
        if (!best) return null;
        // un bloque por medio bloquea el golpe
        const hit = raycast(this.world, origin, dir, best.dist);
        return hit ? null : best;
    }

    /* ---- Creeper y flechas ---- */

    explode(m, ctx) {
        const r = (m.def.behavior && m.def.behavior.radius) || 3;
        const [ex, ey, ez] = [m.pos[0], m.pos[1] + 0.5, m.pos[2]];
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (dx * dx + dy * dy + dz * dz > r * r) continue;
                    const x = Math.floor(ex + dx), y = Math.floor(ey + dy), z = Math.floor(ez + dz);
                    const id = this.world.get(x, y, z);
                    if (id !== B.AIR && id !== B.BEDROCK && id !== B.WATER) this.world.set(x, y, z, B.AIR);
                }
            }
        }
        const blast = r * 2;
        const dp = Math.hypot(ctx.pos[0] - ex, ctx.pos[1] - ey, ctx.pos[2] - ez);
        if (dp < blast) this.hooks.damagePlayer(Math.round((1 - dp / blast) * 14), this.dirTo([ex, ey, ez], ctx.pos));
        for (const other of this.mobs) {
            if (other === m || other.dying()) continue;
            const d = Math.hypot(other.pos[0] - ex, other.pos[1] - ey, other.pos[2] - ez);
            if (d < blast) this.hurt(other, Math.round((1 - d / blast) * 20), this.dirTo([ex, ey, ez], other.pos));
        }
        this.hooks.explosion([ex, ey, ez]);
        m.hp = 0;
        m.dieT = 0.01; // sin sonido de muerte propio: lo tapa la explosión
    }

    shootArrow(m, ctx) {
        const from = [m.pos[0], m.pos[1] + m.def.aabb.h * 0.8, m.pos[2]];
        const d = Math.hypot(ctx.eye[0] - from[0], ctx.eye[1] - from[1], ctx.eye[2] - from[2]);
        // compensación de caída: apunta por encima del objetivo
        const target = [ctx.eye[0], ctx.eye[1] + (ARROW_GRAVITY / 2) * (d / ARROW_SPEED) ** 2, ctx.eye[2]];
        const dir = this.dirTo(from, target);
        const dmg = (m.def.behavior && m.def.behavior.damage) || 3;
        this.arrows.push({ pos: from, vel: dir.map((v) => v * ARROW_SPEED), age: 0, dmg });
        this.hooks.sound('shoot', m);
    }

    updateArrows(dt, ctx) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const a = this.arrows[i];

            // clavada en un bloque: inerte hasta desvanecerse (como en el
            // juego clásico, la flecha fallada queda un rato en el suelo)
            if (a.stuckT !== undefined) {
                a.stuckT -= dt;
                if (a.stuckT <= 0) this.arrows.splice(i, 1);
                continue;
            }

            a.age += dt;
            a.vel[1] -= ARROW_GRAVITY * dt;
            for (let k = 0; k < 3; k++) a.pos[k] += a.vel[k] * dt;

            const hitPlayer =
                Math.abs(a.pos[0] - ctx.pos[0]) < 0.4 && Math.abs(a.pos[2] - ctx.pos[2]) < 0.4 &&
                a.pos[1] > ctx.pos[1] && a.pos[1] < ctx.pos[1] + 1.8;
            const mobHit = this.mobs.find((m) => !m.dying() && !m.def.behavior?.projectile &&
                m.intersects([a.pos[0] - 0.05, a.pos[1] - 0.05, a.pos[2] - 0.05], [a.pos[0] + 0.05, a.pos[1] + 0.05, a.pos[2] + 0.05]));

            if (hitPlayer) {
                this.hooks.damagePlayer(a.dmg || 3, this.dirTo([a.pos[0] - a.vel[0], a.pos[1], a.pos[2] - a.vel[2]], a.pos));
            } else if (mobHit) {
                this.hurt(mobHit, a.dmg || 3, [Math.sign(a.vel[0]), 0, Math.sign(a.vel[2])]);
            } else if (this.world.solidAt(Math.floor(a.pos[0]), Math.floor(a.pos[1]), Math.floor(a.pos[2]))) {
                // retrocede medio paso para que la vara asome del bloque y se
                // queda clavada conservando su orientación (la vel no se toca:
                // el render orienta la flecha con ella)
                for (let k = 0; k < 3; k++) a.pos[k] -= a.vel[k] * dt * 0.5;
                a.stuckT = ARROW_STUCK_TIME;
                continue;
            } else if (a.age < 8) {
                continue;
            }
            this.arrows.splice(i, 1);
        }
    }

    /* ---- Aparición ---- */

    /**
     * Tanda de intentos de aparición alrededor del jugador. Cada intento
     * sortea un hábitat — superficie, agua o cueva — y busca un candidato
     * elegible del registro para esa posición; en superficie y agua las
     * listas del bioma de la columna filtran quién puede aparecer.
     */
    trySpawn(ctx) {
        if (this.mobs.length >= GLOBAL_CAP) return;
        for (let attempt = 0; attempt < 5; attempt++) {
            const angle = this.rng.float() * Math.PI * 2;
            const dist = SPAWN_MIN + this.rng.float() * (SPAWN_MAX - SPAWN_MIN);
            const x = Math.floor(ctx.pos[0] + Math.cos(angle) * dist);
            const z = Math.floor(ctx.pos[2] + Math.sin(angle) * dist);
            if (!this.world.hasChunk(x >> 4, z >> 4)) continue;

            const roll = this.rng.float();
            const habitat = roll < 0.6 ? 'land' : (roll < 0.8 ? 'water' : 'cave');
            const spot = this.findSpot(habitat, x, z);
            if (!spot) continue;
            // el bioma se calcula UNA vez por punto con spot válido
            const bioma = this.biomeAt(x, z);

            const eligible = Object.values(this.defs).filter((def) =>
                !(ctx.peaceful && def.hostile) && // dificultad pacífica: sin hostiles
                this.eligibleAt(def, habitat, spot, ctx.day, bioma) &&
                this.countOf(def.id) < ((def.spawn && def.spawn.cap) || 4));
            if (eligible.length === 0) continue;

            const def = eligible[this.rng.int(eligible.length)];
            const group = 1 + this.rng.int((def.spawn && def.spawn.group) || 2);
            for (let g = 0; g < group && this.mobs.length < GLOBAL_CAP; g++) {
                const gx = x + this.rng.int(5) - 2, gz = z + this.rng.int(5) - 2;
                const gs = this.findSpot(habitat, gx, gz);
                if (!gs || !this.eligibleAt(def, habitat, gs, ctx.day, this.biomeAt(gx, gz))) continue;
                const m = new Mob(def, gx + 0.5, gs.y + 0.01, gz + 0.5, this.rng.float() * Math.PI * 2);
                // tonalidad del individuo: fija en los biomas que la definen
                // (conejo blanco en la nieve, dorado en el desierto) o al azar
                if (def.variants > 1) {
                    const fija = def.variantBiome && def.variantBiome[bioma.id];
                    m.variant = fija !== undefined ? fija : this.rng.int(def.variants);
                }
                this.mobs.push(m);
            }
            return; // una tanda por intervalo
        }
    }

    /** Busca una posición válida del hábitat en la columna (x,z), o null. */
    findSpot(habitat, x, z) {
        if (!this.world.hasChunk(x >> 4, z >> 4)) return null;
        const surf = this.world.surfaceY(x, z);
        if (habitat === 'land') {
            const y = surf + 1;
            if (y <= 2 || this.world.get(x, y, z) === B.WATER) return null;
            return { y, below: this.world.get(x, surf, z) };
        }
        if (habitat === 'water') {
            // columna de agua sobre el lecho: aparece a media profundidad
            let top = surf + 1;
            while (this.world.get(x, top, z) === B.WATER) top++;
            if (top === surf + 1) return null; // no hay agua
            const y = surf + 1 + this.rng.int(Math.max(1, top - surf - 2));
            return { y, below: this.world.get(x, surf, z) };
        }
        // cueva: hueco de aire sin luz solar bajo la superficie
        if (surf < 12) return null;
        const y = 4 + this.rng.int(surf - 8);
        if (this.world.get(x, y, z) !== B.AIR || this.world.get(x, y + 1, z) !== B.AIR) return null;
        if (!this.world.solidAt(x, y - 1, z) || this.world.sunlit(x, y, z)) return null;
        return { y, below: this.world.get(x, y - 1, z) };
    }

    /** Bioma de la columna (x, z): mismo mapa que el generador (misma semilla). */
    biomeAt(x, z) {
        // el anillo de la playa consulta alturas vecinas; fuera de los chunks
        // cargados se asume tierra firme (sesgo inofensivo contra la playa)
        const alturas = (xx, zz) => this.world.hasChunk(xx >> 4, zz >> 4)
            ? this.world.surfaceY(xx, zz) : SEA_LEVEL + 8;
        return this.biomes.at(x, z, this.world.surfaceY(x, z), alturas);
    }

    /** ¿Puede `def` aparecer en ese hábitat, posición, hora y bioma? */
    eligibleAt(def, habitat, spot, day, bioma) {
        const sp = def.spawn || {};
        if (habitat === 'water') {
            return !!sp.water && (!def.hostile || day < NIGHT) &&
                bioma.mobs.water.includes(def.id);
        }
        if (habitat === 'cave') return !!sp.cave; // los de cueva son globales (sin bioma)
        if (sp.water) return false;
        // un mob de cueva solo pisa la superficie si el bioma lo saca de noche
        // (adaptación del plan: el slime es nocturno del pantano además de cueva)
        if (sp.cave && !bioma.mobs.night.includes(def.id)) return false;
        const nightSide = def.hostile || !!sp.night;
        if (nightSide) {
            if (day >= NIGHT) return false;
        } else if (day <= 0.45) {
            return false;
        }
        if (sp.block) {
            if (sp.block !== 'ANY' && spot.below !== B[sp.block]) return false;
        } else if (!nightSide) {
            // pasivos diurnos sin bloque declarado: sobre el suelo natural de
            // su bioma (hierba, micelio, arena, podzol... según la definición)
            const s = bioma.surface;
            if (![s.top, s.topAlt, s.topFrio].some((n) => n && spot.below === B[n])) return false;
        }
        // el bioma decide quién habita: lista diurna o nocturna según el lado
        return (nightSide ? bioma.mobs.night : bioma.mobs.day).includes(def.id);
    }
}

function approach(current, target, maxDelta) {
    const d = target - current;
    return Math.abs(d) <= maxDelta ? target : current + Math.sign(d) * maxDelta;
}

/** Intersección rayo-AABB (método de losas). Devuelve t de entrada o null. */
function rayAABB(origin, dir, min, max) {
    let tMin = 0, tMax = Infinity;
    for (let i = 0; i < 3; i++) {
        if (Math.abs(dir[i]) < 1e-9) {
            if (origin[i] < min[i] || origin[i] > max[i]) return null;
            continue;
        }
        let t1 = (min[i] - origin[i]) / dir[i];
        let t2 = (max[i] - origin[i]) / dir[i];
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return null;
    }
    return tMin;
}

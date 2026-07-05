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
        // patrulla orbital del guardián (dron): ángulo alrededor del jugador
        // y reloj propio para las oscilaciones de radio y altura. La fase
        // inicial la fija el yaw, así varios drones reparten la órbita.
        this.patrolAngle = yaw;
        this.patrolT = yaw;
        this.orbitDir = 1;            // sentido del giro orbital (±1)
        // inspección de voladores (guardián): mob que ronda observando y
        // temporizador; cooldown para no re-inspeccionar lo mismo enseguida
        this.inspectTarget = null;
        this.inspectT = 0;
        this.inspectCd = 0;
        // antidron kamikaze: despega bajo su IA (vuelo por-instancia) y
        // arremete contra un dron; jitterT tambalea su rumbo en la embestida.
        // cruiseY = techo de ascenso, fijado al detectar (doble de la altura
        // del dron sobre el suelo EN ESE INSTANTE).
        this.airborne = false;
        this.strikeTarget = null;
        this.cruiseY = 0;
        this.swooping = false;       // ya en fase de picado sobre el dron
        this.jitterT = 0;
        this.jitterYaw = 0;
        // dron escapista: vuelo errático de mosquito. Rumbo/altura objetivo
        // que se re-sortean a saltos bruscos, y reloj hasta el próximo quiebre.
        this.dartT = 0;
        this.dartYaw = yaw;
        this.dartY = y;
        // patrulla de largo alcance del escapista: fase 'out' (alejándose
        // hasta el radio/altura máximos) o 'in' (regresando a probar el
        // perímetro cercano al jugador), con el radio y la altura objetivo
        // sorteados por barrido.
        this.roamPhase = 'out';
        this.roamRadius = 0;
        this.roamCeil = 0;
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
        if (m.def.behavior && m.def.behavior.evasive) this.evasiveAI(m, dt, ctx, dist);
        else if (m.def.behavior && m.def.behavior.antidron) this.antidronAI(m, dt, ctx, dist);
        else if (m.def.behavior && m.def.behavior.guardian) this.guardianAI(m, dt, ctx, dist);
        else if ((m.def.hostile || m.angerT > 0) && !ctx.creative) this.hostileAI(m, dt, ctx, dist);
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

    /**
     * IA del dron ESCAPISTA (behavior.evasive): vuela como un mosquito,
     * SIEMPRE a máxima velocidad (flySpeed, hasta 3× la de un dron), con
     * quiebres BRUSCOS de rumbo y altura — cambios de dirección casi
     * instantáneos («ángulos imposibles») que no frenan la marcha, porque
     * el rumbo se reescribe de golpe y la velocidad se mantiene en su tope.
     *
     * Sobre ese zigzag corre una PATRULLA de largo alcance en torno al
     * jugador: se aleja hasta `roamRadius` (hasta 6× lo que orbita un dron)
     * subiendo hasta `roamCeil` (hasta 6× más alto), y luego REGRESA a
     * probar el perímetro cercano al jugador, para volver a alejarse — así
     * en ciclo. Si un perseguidor (dron/antidron) ronda cerca, la evasión
     * (huir en dirección opuesta) tiene prioridad sobre la fase. Es una
     * presa de práctica: no ataca a nadie.
     */
    evasiveAI(m, dt, ctx, dist) {
        const b = m.def.behavior;
        m.airborne = true;       // vuela por-instancia (aunque no sea flying)
        m.state = 'wander';
        m.dartT -= dt;

        // perseguidor más cercano (dron o antidron) dentro del radio de alerta
        let caza = null, mejor = Infinity;
        for (const otro of this.mobs) {
            if (otro === m || otro.dying()) continue;
            const bo = otro.def.behavior;
            if (!bo || !(bo.guardian || bo.antidron)) continue;
            const d = Math.hypot(otro.pos[0] - m.pos[0], otro.pos[1] - m.pos[1], otro.pos[2] - m.pos[2]);
            if (d < (b.alertRadius || 24) && d < mejor) { mejor = d; caza = otro; }
        }

        // patrulla de largo alcance: distancia horizontal al jugador y a qué
        // fase pertenece. Al llegar al extremo de la fase, cambia de fase y
        // sortea nuevos objetivos (radio/altura) para la siguiente.
        const dxJ = m.pos[0] - ctx.pos[0], dzJ = m.pos[2] - ctx.pos[2];
        const distJ = Math.hypot(dxJ, dzJ);
        const maxRadius = b.roamRadius || 30;    // hasta ~6× la órbita del dron (5)
        const maxCeil = b.roamCeil || 24;        // hasta ~6× más alto que el dron
        if (m.roamRadius === 0) this.nuevoRoam(m, maxRadius, maxCeil); // primer objetivo
        if (m.roamPhase === 'out' && distJ >= m.roamRadius) {
            m.roamPhase = 'in';                  // llegó lejos: vuelve a probar cerca
        } else if (m.roamPhase === 'in' && distJ <= (b.nearRadius || 6)) {
            m.roamPhase = 'out';                 // ya cerca del jugador: aléjate otra vez
            this.nuevoRoam(m, maxRadius, maxCeil);
        }

        // quiebre de mosquito: cada intervalo (más corto si lo persiguen)
        // reescribe el rumbo y la altura objetivo DE GOLPE — el giro es
        // discontinuo. Un choque de pared fuerza otro.
        const periodo = caza ? (b.dartFast || 0.28) : (b.dartSlow || 0.6);
        if (m.dartT <= 0 || m.hitWall) {
            m.dartT = periodo * (0.6 + this.rng.float() * 0.8);
            let base;
            if (caza) {
                // PRIORIDAD: huir del cazador, rumbo opuesto ± abanico ancho
                const away = Math.atan2(-(m.pos[0] - caza.pos[0]), -(m.pos[2] - caza.pos[2])) + Math.PI;
                base = away + (this.rng.float() * 2 - 1) * (b.evadeSpread || 1.6);
            } else {
                // sin cazador: el rumbo base sigue la FASE (alejarse del
                // jugador u orientarse hacia él) con un abanico de zigzag
                const haciaJ = Math.atan2(-(ctx.pos[0] - m.pos[0]), -(ctx.pos[2] - m.pos[2]));
                const objetivo = m.roamPhase === 'out' ? haciaJ + Math.PI : haciaJ;
                base = objetivo + (this.rng.float() * 2 - 1) * (b.roamSpread || 1.1);
            }
            m.dartYaw = base;
            // altura: en 'out' sube hacia el techo de la ronda; en 'in' baja
            // cerca de la altura del jugador; siempre con brincos aleatorios
            const suelo = this.world.hasChunk(Math.floor(m.pos[0]) >> 4, Math.floor(m.pos[2]) >> 4)
                ? this.world.surfaceY(Math.floor(m.pos[0]), Math.floor(m.pos[2])) + 1 : m.pos[1];
            const techo = m.roamPhase === 'out' ? m.roamCeil : (b.ceiling || 9) * 0.5;
            m.dartY = suelo + 3 + this.rng.float() * techo;
        }

        // aplica el rumbo/altura de golpe (sin suavizar: el giro es «imposible»)
        m.yaw = m.dartYaw;
        m.targetY = m.dartY;
        m.speed = m.def.flySpeed || m.def.speed;
        // mira hacia donde vuela (da sensación de reacción nerviosa)
        this.lookAt(m, [m.pos[0] - Math.sin(m.yaw) * 4, m.pos[1], m.pos[2] - Math.cos(m.yaw) * 4]);
    }

    /** Sortea el radio y el techo de la próxima salida de la patrulla. */
    nuevoRoam(m, maxRadius, maxCeil) {
        // radio de alejamiento entre el 55 % y el 100 % del máximo, y techo
        // de subida entre el 40 % y el 100 % — así cada salida es distinta
        m.roamRadius = maxRadius * (0.55 + this.rng.float() * 0.45);
        m.roamCeil = maxCeil * (0.4 + this.rng.float() * 0.6);
    }

    /**
     * IA del antidrón kamikaze (behavior.antidron): reposa QUIETO en el
     * suelo (mob terrestre, con gravedad) hasta detectar un dron en
     * `detectRadius`. Entonces DESPEGA (`airborne`: vuelo por-instancia),
     * asciende hasta el DOBLE de la altura del dron sobre el suelo y
     * arremete contra él a alta velocidad con rumbo TAMBALEANTE (jitter),
     * hasta tocarlo: entonces EXPLOTA y ambos se destruyen a la vez.
     */
    antidronAI(m, dt, ctx, dist) {
        const b = m.def.behavior;
        m.jitterT -= dt;

        // ¿sigue vivo y a la vista el objetivo? si no, busca otro dron
        let objetivo = m.strikeTarget;
        const vivoYcerca = objetivo && !objetivo.dying() && this.mobs.includes(objetivo) &&
            Math.hypot(objetivo.pos[0] - m.pos[0], objetivo.pos[1] - m.pos[1], objetivo.pos[2] - m.pos[2])
                < (b.detectRadius || 20) * 1.5;
        if (!vivoYcerca) {
            objetivo = null; m.strikeTarget = null;
            let mejor = Infinity;
            for (const otro of this.mobs) {
                if (otro === m || otro.dying()) continue;
                // objetivo: un dron (guardián) o el escapista (presa de
                // práctica) — el antidron los persigue a ambos
                const bo = otro.def.behavior;
                if (!bo || !(bo.guardian || bo.quarry)) continue;
                const d = Math.hypot(otro.pos[0] - m.pos[0], otro.pos[1] - m.pos[1], otro.pos[2] - m.pos[2]);
                if (d < (b.detectRadius || 20) && d < mejor) { mejor = d; objetivo = otro; }
            }
            m.strikeTarget = objetivo;
            // al FIJAR el objetivo, congela el techo de ascenso: el doble de
            // la altura del dron sobre el suelo EN ESTE INSTANTE (el dron
            // puede moverse luego; el enunciado mide la altura de detección)
            if (objetivo) {
                const suelo = this.world.hasChunk(Math.floor(objetivo.pos[0]) >> 4, Math.floor(objetivo.pos[2]) >> 4)
                    ? this.world.surfaceY(Math.floor(objetivo.pos[0]), Math.floor(objetivo.pos[2])) + 1
                    : 0;
                const alturaDron = Math.max(0, objetivo.pos[1] - suelo);
                m.cruiseY = suelo + alturaDron * 2;
                m.swooping = false;
            }
        }

        // sin objetivo: reposa quieto en el suelo (aterriza si venía volando)
        if (!objetivo) {
            m.airborne = false;
            m.swooping = false;
            m.speed = 0;
            m.state = 'idle';
            this.lookAt(m, null);
            return;
        }

        // objetivo detectado: despega y embiste
        m.airborne = true;
        m.state = 'chase';

        // maniobra vertical en dos fases:
        //  - ASCENSO: sube hacia el techo congelado (doble de la altura de
        //    detección) para ganar ventaja de altura, mientras no rebase al
        //    dron ni toque el techo.
        //  - PICADO: una vez arriba (o ya por encima del dron), apunta a la
        //    altura del dron y cae sobre él.
        // El flag `swooping` se pega una vez iniciado el picado para no
        // oscilar entre subir y bajar cerca del objetivo.
        if (!m.swooping && (m.pos[1] >= m.cruiseY - 1 || m.pos[1] > objetivo.pos[1] + 1)) {
            m.swooping = true;
        }
        m.targetY = m.swooping ? objetivo.pos[1] : m.cruiseY;

        // rumbo hacia el dron con TAMBALEO: cada poco tiempo se sortea una
        // desviación del rumbo, así la trayectoria zigzaguea a alta
        // velocidad. El tambaleo se ATENÚA al acercarse (dentro de ~4
        // bloques) para asegurar el golpe final: el zigzag es de la
        // aproximación, no debe impedir el impacto.
        const toObj = Math.atan2(-(objetivo.pos[0] - m.pos[0]), -(objetivo.pos[2] - m.pos[2]));
        const d3 = Math.hypot(objetivo.pos[0] - m.pos[0], objetivo.pos[1] - m.pos[1], objetivo.pos[2] - m.pos[2]);
        if (m.jitterT <= 0) {
            m.jitterT = 0.12 + this.rng.float() * 0.18;
            m.jitterYaw = (this.rng.float() * 2 - 1) * (b.wobble || 0.6);
        }
        m.yaw = toObj + m.jitterYaw * clamp(d3 / 4, 0, 1);
        m.speed = m.def.flySpeed || m.def.speed;
        this.lookAt(m, objetivo.pos);

        // impacto: al tocar al dron, EXPLOTA (mata a ambos a la vez)
        if (d3 < (b.hitRange || 1.2)) {
            this.hurt(objetivo, 999, this.dirTo(m.pos, objetivo.pos)); // destruye el dron
            this.explode(m, ctx);                                       // y a sí mismo
        }
    }

    /**
     * IA del guardián volador (behavior.guardian, el dron): protege al
     * jugador. La detección usa DOS radios: los agresores TERRESTRES se
     * detectan a `guardRadius`; los VOLADORES, hasta el TRIPLE de lejos
     * (`airRadiusMul`), porque un dron ve el cielo despejado mucho antes.
     *
     * Prioridad de objetivo (el más cercano de cada clase, en este orden):
     *  1. agresor terrestre en guardRadius → lo persigue y ataca.
     *  2. cualquier VOLADOR (agresivo o no) en el radio aéreo → va a
     *     INSPECCIONARLO: lo ronda unos segundos observándolo y, al
     *     terminar, si era agresivo lo ataca y si era pacífico vuelve al
     *     perímetro sin agredirlo.
     * Sin objetivos, PATRULLA el perímetro del jugador en órbita.
     */
    guardianAI(m, dt, ctx, dist) {
        const b = m.def.behavior;
        const radioTierra = b.guardRadius || 16;
        const radioAire = radioTierra * (b.airRadiusMul || 3);
        m.inspectCd = Math.max(0, m.inspectCd - dt);

        // si ya está inspeccionando un volador vivo y a la vista, sigue
        if (m.inspectTarget && !m.inspectTarget.dying() &&
            this.mobs.includes(m.inspectTarget) &&
            Math.hypot(m.inspectTarget.pos[0] - ctx.pos[0], m.inspectTarget.pos[2] - ctx.pos[2]) < radioAire * 1.3) {
            this.inspectFlyer(m, dt, ctx);
            return;
        }
        m.inspectTarget = null;

        // busca el agresor terrestre más cercano (radio de tierra), el
        // volador AGRESIVO más cercano y el volador más cercano a secas
        // (ambos en el radio aéreo, el triple de amplio). Los mobs del
        // MISMO tipo que el guardián se ignoran: los drones son aliados
        // entre sí, no se auto-vigilan (sí vigilan pájaros, abejas…).
        // el dron escapista (behavior.quarry) es una PRESA de práctica: se
        // persigue de inmediato, sin inspección, midiendo la distancia al
        // GUARDIÁN (no al jugador) para no perderlo cuando escapa lejos
        let presa = null, mejorP = Infinity;
        let terrestre = null, mejorT = Infinity;
        let volAgresivo = null, mejorVA = Infinity;
        let volCualquiera = null, mejorVC = Infinity;
        for (const otro of this.mobs) {
            if (otro === m || otro.dying() || otro.def.id === m.def.id) continue;
            const bo = otro.def.behavior || {};
            const agresivo = otro.def.hostile || otro.angerT > 0;
            const d = Math.hypot(otro.pos[0] - ctx.pos[0], otro.pos[1] - ctx.pos[1], otro.pos[2] - ctx.pos[2]);
            if (bo.quarry) {
                const dm = Math.hypot(otro.pos[0] - m.pos[0], otro.pos[1] - m.pos[1], otro.pos[2] - m.pos[2]);
                if (dm < (b.chaseRadius || 48) && dm < mejorP) { mejorP = dm; presa = otro; }
            }
            if (otro.def.flying) {
                if (d < radioAire && d < mejorVC) { mejorVC = d; volCualquiera = otro; }
                if (agresivo && d < radioAire && d < mejorVA) { mejorVA = d; volAgresivo = otro; }
            } else if (agresivo && d < radioTierra && d < mejorT) {
                mejorT = d; terrestre = otro;
            }
        }

        // 0) prioridad ABSOLUTA a la presa de práctica: persecución inmediata
        if (presa) { this.chaseTarget(m, ctx, presa); return; }

        // 1) prioridad al agresor terrestre: ataque directo
        if (terrestre) { this.chaseTarget(m, ctx, terrestre); return; }

        // 2) un volador a la vista (agresivo o no) y sin inspección reciente:
        // ir a inspeccionarlo (dar el parte de vueltas observándolo)
        if (volCualquiera && m.inspectCd <= 0) {
            m.inspectTarget = volCualquiera;
            m.inspectT = b.inspectTime || 4;
            this.inspectFlyer(m, dt, ctx);
            return;
        }

        // 3) volador AGRESIVO ya inspeccionado (en cooldown): se persigue y
        // ataca directo, sin repetir la inspección
        if (volAgresivo) { this.chaseTarget(m, ctx, volAgresivo); return; }

        this.patrolAround(m, dt, ctx);
    }

    /** Persigue en 3D a un mob y lo golpea cuerpo a cuerpo (guardián). */
    chaseTarget(m, ctx, objetivo) {
        const b = m.def.behavior;
        m.state = 'chase';
        const centro = [objetivo.pos[0], objetivo.pos[1] + objetivo.def.aabb.h * 0.6, objetivo.pos[2]];
        m.yaw = Math.atan2(-(centro[0] - m.pos[0]), -(centro[2] - m.pos[2]));
        m.targetY = centro[1];
        m.speed = m.def.speed;
        this.lookAt(m, centro);
        const d3 = Math.hypot(m.pos[0] - centro[0], m.pos[1] - centro[1], m.pos[2] - centro[2]);
        if (d3 < (b.attackRange || 1.5) && m.attackCd <= 0) {
            m.attackCd = b.cooldown || 1;
            this.hurt(objetivo, b.damage || 4, this.dirTo(m.pos, objetivo.pos));
        }
    }

    /**
     * Inspección de un mob volador (guardián): el dron vuela hasta él y lo
     * RONDA de cerca observándolo mientras corre `inspectT`. Al terminar,
     * si el volador es agresivo (hostil o enfadado) lo ataca; si es
     * pacífico, deja la inspección y vuelve al perímetro SIN agredirlo, con
     * un cooldown para no volver a inspeccionar lo mismo de inmediato.
     */
    inspectFlyer(m, dt, ctx) {
        const objetivo = m.inspectTarget;
        m.inspectT -= dt;

        // órbita de reconocimiento alrededor del volador (radio corto)
        m.state = 'chase';
        m.patrolAngle += 1.6 * dt; // vuelta de observación más viva que la ronda
        const rObs = 2.2;
        const tx = objetivo.pos[0] + Math.cos(m.patrolAngle) * rObs;
        const tz = objetivo.pos[2] + Math.sin(m.patrolAngle) * rObs;
        m.yaw = Math.atan2(-(tx - m.pos[0]), -(tz - m.pos[2]));
        const toPunto = Math.hypot(tx - m.pos[0], tz - m.pos[2]);
        m.speed = m.def.speed * clamp(toPunto / 2.5, 0.4, 1);
        m.targetY = objetivo.pos[1] + objetivo.def.aabb.h * 0.5; // a su altura
        this.lookAt(m, [objetivo.pos[0], objetivo.pos[1] + objetivo.def.aabb.h * 0.6, objetivo.pos[2]]);

        if (m.inspectT > 0) return; // aún observando

        // parte dado: se cierra la inspección. Agresivo → pasa a atacarlo
        // (la persecución la retomará guardianAI, ya sin inspección);
        // pacífico → lo deja en paz y vuelve al perímetro del jugador.
        const agresivo = objetivo.def.hostile || objetivo.angerT > 0;
        m.inspectTarget = null;
        m.inspectCd = m.def.behavior.inspectCooldown || 8;
        if (agresivo) this.chaseTarget(m, ctx, objetivo);
        else this.patrolAround(m, dt, ctx); // regresa al perímetro sin agredir
    }

    /**
     * Patrulla orbital del guardián: en vez de plantarse tras el jugador,
     * persigue un PUNTO que gira a su alrededor. El radio y la altura
     * oscilan suavemente (suma de senos con periodos incomensurables) para
     * una trayectoria semicircular NO fija — sube y baja como si inspeccio-
     * nara el terreno — y de vez en cuando invierte el sentido del giro.
     * El dron vuela SIEMPRE hacia el punto móvil, así nunca queda inmóvil.
     */
    patrolAround(m, dt, ctx) {
        const b = m.def.behavior;
        const rBase = b.patrolRadius || 5;      // radio medio de la órbita
        const angVel = b.patrolSpeed || 0.7;    // rad/s alrededor del jugador

        m.state = 'wander';
        m.patrolT += dt;
        m.patrolAngle += angVel * m.orbitDir * dt;

        // sentido de giro: se invierte a rachas, para que el barrido no sea
        // un círculo perfecto sino idas y venidas por el perímetro
        if (Math.sin(m.patrolT * 0.11) + Math.sin(m.patrolT * 0.017) < -1.4) {
            m.orbitDir = m.patrolAngle % (Math.PI * 2) > Math.PI ? 1 : -1;
        }

        // radio y altura oscilantes (barrido de inspección): dos senos de
        // periodo distinto no repiten pronto, así la ronda no se siente fija
        const radio = rBase + 1.6 * Math.sin(m.patrolT * 0.6) + 0.8 * Math.sin(m.patrolT * 1.3);
        const alt = 2.2 + 1.1 * Math.sin(m.patrolT * 0.45) + 0.5 * Math.sin(m.patrolT * 0.9);

        // punto objetivo sobre la órbita alrededor del jugador
        const tx = ctx.pos[0] + Math.cos(m.patrolAngle) * radio;
        const tz = ctx.pos[2] + Math.sin(m.patrolAngle) * radio;
        const toPunto = Math.hypot(tx - m.pos[0], tz - m.pos[2]);

        m.yaw = Math.atan2(-(tx - m.pos[0]), -(tz - m.pos[2]));
        // se acerca al punto y luego lo sigue orbitando (nunca frena del
        // todo: el punto se mueve, el dron va tras él en ronda perpetua)
        m.speed = m.def.speed * clamp(toPunto / 2.5, 0.35, 1);
        m.targetY = ctx.pos[1] + alt;

        // la mirada barre el terreno: hacia fuera del jugador (vigilando el
        // perímetro), no hacia el propio jugador
        const outX = m.pos[0] + Math.cos(m.patrolAngle) * 4;
        const outZ = m.pos[2] + Math.sin(m.patrolAngle) * 4;
        this.lookAt(m, [outX, m.pos[1], outZ]);
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
        } else if (m.def.snapTurn && m.airborne) {
            // dron escapista: la velocidad SALTA al rumbo nuevo (giro
            // instantáneo sin perder rapidez — los «ángulos imposibles»)
            m.vel[0] = wishX;
            m.vel[2] = wishZ;
        } else {
            // el antidron embiste con aceleración alta (dashAccel) para
            // cerrar sobre el dron pese al zigzag; el resto usa ACCEL
            const acc = (m.airborne && m.def.dashAccel) || ACCEL;
            m.vel[0] = approach(m.vel[0], wishX, acc * dt);
            m.vel[2] = approach(m.vel[2], wishZ, acc * dt);
        }

        // eje vertical según el modo de locomoción. `airborne` es un vuelo
        // por-instancia (el antidron, terrestre en reposo, despega bajo su
        // IA): mientras esté activo se comporta como volador.
        if (m.def.flying || m.airborne) {
            // los voladores solo ajustan altitud al desplazarse; el guardián
            // (hover) y el antidron lanzado sostienen su altura objetivo
            const ajusta = m.speed > 0 || m.def.hover || m.airborne;
            const vMax = m.def.flySpeed || m.def.speed;
            const wishY = ajusta ? clamp((m.targetY - m.pos[1]) * 1.5, -vMax, vMax) : 0;
            m.vel[1] = approach(m.vel[1], wishY, (m.def.climbAccel || 22) * dt);
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
        if (sp.summonOnly) return false; // el dron solo nace por invocación
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

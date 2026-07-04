/**
 * Suite del sistema de mobs — `node test/mobs.mjs`.
 * Prueba en Node los módulos puros: geometría de partes (model.js), pieles
 * (skin.js), física e IA de mobs (mobs.js) sobre un mundo simulado, y valida
 * el contrato de las 68 definiciones de js/mobs/.
 */
import { existsSync } from 'node:fs';
import { B } from '../js/blocks.js';
import { buildPartMesh, partUVRects, ANIMS } from '../js/mobs/model.js';
import { Skin } from '../js/mobs/skin.js';
import { MobSystem, Mob } from '../js/mobs.js';
import { mat4RotateZ } from '../js/math.js';
import { validate } from './validate-mob.mjs';
import cerdo from '../js/mobs/cerdo.js';
import conejo from '../js/mobs/conejo.js';

let ok = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { ok++; console.log(`  OK  ${name}`); }
    else { fail++; console.log(`  FALLA ${name}`); }
};

/**
 * Mundo plano: suelo sólido hasta `ground` (hierba en la superficie). Las
 * pruebas de física usan el suelo por defecto (y=10); las de aparición lo
 * suben a y=40 (> SEA_LEVEL+1) para que las columnas caigan en la clase de
 * terreno 'tierra' y el bioma sea la llanura (el comodín del registro).
 */
class MockWorld {
    constructor(ground = 10) { this.sy = 64; this.ground = ground; this.edits = new Map(); this.walls = new Set(); }
    key(x, y, z) { return `${x},${y},${z}`; }
    addWall(x, y, z) { this.walls.add(this.key(x, y, z)); }
    get(x, y, z) {
        if (this.edits.has(this.key(x, y, z))) return this.edits.get(this.key(x, y, z));
        if (this.walls.has(this.key(x, y, z))) return B.STONE;
        if (y > this.ground) return B.AIR;
        return y === this.ground ? B.GRASS : B.STONE;
    }
    set(x, y, z, id) { this.edits.set(this.key(x, y, z), id); }
    solidAt(x, y, z) { const id = this.get(x, y, z); return id !== B.AIR && id !== B.WATER; }
    surfaceY(x, z) { for (let y = this.sy - 1; y >= 0; y--) if (this.solidAt(x, y, z)) return y; return 0; }
    sunlit(x, y, z) { return y > this.ground && !this.walls.has(this.key(x, y, z)); }
    hasChunk() { return true; }
}

const silentHooks = () => {
    const calls = { sounds: [], damage: [], explosions: 0 };
    return {
        calls,
        sound: (kind) => calls.sounds.push(kind),
        damagePlayer: (dmg, dir) => calls.damage.push({ dmg, dir }),
        explosion: () => calls.explosions++,
    };
};

const DT = 1 / 60;
const simulate = (sys, seconds, ctx) => {
    for (let t = 0; t < seconds; t += DT) sys.update(DT, ctx);
};
// jugador "apartado": dentro del radio activo pero fuera del de agresión
const farCtx = (day = 1) => ({ pos: [30, 11, 30], eye: [30, 12.6, 30], day });

/* ==== Geometría y matemáticas ==== */
console.log('== Geometría de partes ==');
{
    const part = cerdo.parts[0];
    const mesh = buildPartMesh(part, 64, 64);
    check('malla de 36 vértices × 6 floats', mesh.length === 216);
    let uvOk = true, shadeOk = true;
    for (let i = 0; i < mesh.length; i += 6) {
        if (mesh[i + 3] < 0 || mesh[i + 3] > 1 || mesh[i + 4] < 0 || mesh[i + 4] > 1) uvOk = false;
        if (![1, 0.5, 0.8, 0.6].some((v) => Math.abs(v - mesh[i + 5]) < 1e-6)) shadeOk = false;
    }
    check('UV normalizadas dentro de [0,1]', uvOk);
    check('sombreado por cara del catálogo del mesher', shadeOk);
    check('6 rects UV por parte', partUVRects(part).length === 6);

    const m = new Float32Array(16);
    mat4RotateZ(m, Math.PI / 2);
    // (1,0,0) → (0,1,0)
    check('mat4RotateZ gira +X hacia +Y', Math.abs(m[0]) < 1e-6 && Math.abs(m[1] - 1) < 1e-6);

    const s = new Skin(8, 8, 42);
    s.fill(0, 0, 8, 8, [100, 100, 100], 5);
    check('Skin.fill cubre con alfa 255', s.data[3] === 255 && s.data[8 * 8 * 4 - 1] === 255);
}

/* ==== Física ==== */
console.log('== Física de mobs ==');
{
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const m = new Mob(cerdo, 0.5, 15, 0.5);
    sys.mobs.push(m);
    simulate(sys, 2, farCtx());
    check('cae y aterriza sobre la superficie', m.onGround && Math.abs(m.pos[1] - 11) < 0.01);

    // salto automático: pared de 1 bloque de alto en su camino
    world.addWall(0, 11, -2);
    m.pos = [0.5, 11, 0.5]; m.vel = [0, 0, 0];
    m.yaw = 0; // camina hacia −Z
    m.speed = 1.5;
    for (let t = 0; t < 2; t += DT) { m.speed = 1.5; sys.stepPhysics(m, DT); }
    check('salto automático supera 1 bloque', m.pos[2] < -1.5 || m.pos[1] > 11.5);
}

/* ==== IA pasiva y daño ==== */
console.log('== IA pasiva y daño ==');
{
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const m = new Mob(cerdo, 0.5, 11, 0.5);
    sys.mobs.push(m);
    simulate(sys, 8, farCtx());
    check('alterna idle/deambular sin morirse', !m.dying() && ['idle', 'wander'].includes(m.state));

    const before = m.hp;
    sys.hurt(m, 4, [1, 0, 0]);
    check('el golpe resta vida y provoca huida', m.hp === before - 4 && m.state === 'flee' && m.hurtT > 0);
    check('el golpe empuja (retroceso)', m.vel[0] > 2);

    sys.hurt(m, 99, [1, 0, 0]);
    check('sin vida entra en agonía', m.dying());
    simulate(sys, 1, farCtx());
    check('el cadáver desaparece', sys.mobs.length === 0);
    check('sonó hurt y death', hooks.calls.sounds.includes('hurt') && hooks.calls.sounds.includes('death'));
}

/* ==== IA hostil ==== */
console.log('== IA hostil ==');
const zombiTest = {
    id: 'zombi_test', name: 'Zombi de prueba', hostile: true,
    aabb: { w: 0.6, h: 1.8 }, hp: 20, speed: 3,
    behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1 },
    voice: { say: [{ f: 90, d: 0.5 }], hurt: [{ f: 120, d: 0.2 }], death: [{ f: 70, d: 0.6 }] },
};
{
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const m = new Mob(zombiTest, 0.5, 11, -6.5);
    sys.mobs.push(m);
    const ctx = { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 0.25 }; // de noche: no arde
    const d0 = Math.hypot(m.pos[0] - 0.5, m.pos[2] - 0.5);
    simulate(sys, 3, ctx);
    const d1 = Math.hypot(m.pos[0] - 0.5, m.pos[2] - 0.5);
    check('persigue al jugador (se acerca)', d1 < d0);
    check('ataca cuerpo a cuerpo al alcanzarlo', hooks.calls.damage.length >= 1 && hooks.calls.damage[0].dmg === 3);

    // de día y al sol, arde hasta morir
    const sys2 = new MobSystem({}, world, silentHooks(), 7);
    const quemado = new Mob(zombiTest, 0.5, 11, -20.5);
    sys2.mobs.push(quemado);
    simulate(sys2, 12, farCtx(1));
    check('el hostil arde a pleno día', sys2.mobs.length === 0 || quemado.hp < 20);
}
{
    // en modo creativo los hostiles ignoran al jugador
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const zombi = new Mob(zombiTest, 0.5, 11, -3.5);
    sys.mobs.push(zombi);
    simulate(sys, 4, { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 0.25, creative: true });
    check('en creativo el hostil no ataca al jugador', hooks.calls.damage.length === 0);
    check('en creativo el hostil no persigue (deambula)', zombi.state !== 'chase');
}

/* ==== Creeper y flechas ==== */
console.log('== Creeper y flechas ==');
{
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const creeper = new Mob({
        ...zombiTest, id: 'creeper_test', behavior: { aggro: 16, fuse: true, radius: 2 },
    }, 0.5, 11, -2.5);
    sys.mobs.push(creeper);
    simulate(sys, 3, { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 0.25 });
    check('la mecha detona la explosión', hooks.calls.explosions === 1);
    check('la explosión rompe bloques', world.edits.size > 0 && [...world.edits.values()].every((v) => v === B.AIR));
    check('la explosión daña al jugador', hooks.calls.damage.length >= 1);
    check('el creeper desaparece al explotar', sys.mobs.length === 0);
}
{
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const arquero = new Mob({
        ...zombiTest, id: 'esqueleto_test', speed: 1.8,
        behavior: { aggro: 16, projectile: true, cooldown: 2 },
    }, 0.5, 11, -9.5);
    sys.mobs.push(arquero);
    const ctx = { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 0.25 };
    simulate(sys, 0.5, ctx);
    check('el arquero dispara con línea de visión', hooks.calls.sounds.includes('shoot'));
    simulate(sys, 3, ctx);
    check('la flecha impacta o se clava (no queda volando)', sys.arrows.every((a) => a.stuckT !== undefined));
    check('la flecha daña al jugador', hooks.calls.damage.some((d) => d.dmg === 3));
}
{
    // una flecha fallada queda clavada en el suelo y se desvanece después
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    sys.arrows.push({ pos: [0.5, 20, 0.5], vel: [0, -20, 0], age: 0, dmg: 2 });
    const lejos = { pos: [30, 11, 30], eye: [30, 12.62, 30], day: 0.25 };
    simulate(sys, 2, lejos);
    check('la flecha fallada queda clavada en el suelo', sys.arrows.length === 1 && sys.arrows[0].stuckT > 0);
    simulate(sys, 31, lejos);
    check('la flecha clavada se desvanece pasado un rato', sys.arrows.length === 0);
}

/* ==== Puntería y aparición ==== */
console.log('== Puntería y aparición ==');
{
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const m = new Mob(cerdo, 5.5, 11, 0.5);
    sys.mobs.push(m);
    const hit = sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 8);
    check('raycastMob alcanza al mob apuntado', hit !== null && hit.mob === m);
    world.addWall(3, 11, 0);
    check('un bloque por medio bloquea el golpe', sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 8) === null);
    check('fuera de alcance no golpea', sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 2) === null);
}
{
    // suelo en y=40 (> nivel del mar): las columnas caen en 'tierra' y el
    // bioma es la llanura, cuyas listas day/night gobiernan la aparición
    const world = new MockWorld(40);
    const zombi = { ...zombiTest, id: 'zombi' };       // está en llanura.mobs.night
    const osoPolar = { ...cerdo, id: 'oso_polar' };    // NO está en las listas de llanura
    const defs = { cerdo, zombi, oso_polar: osoPolar };
    const dia = new MobSystem(defs, world, silentHooks(), 11);
    simulate(dia, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('de día aparecen mobs y son pasivos', dia.count() > 0 && dia.mobs.every((m) => !m.def.hostile));
    check('un id fuera de las listas del bioma no aparece (oso_polar)',
        dia.mobs.every((m) => m.def.id !== 'oso_polar'));

    // la distancia mínima se mide recién aparecidos (antes de que persigan)
    const noche = new MobSystem(defs, world, silentHooks(), 11);
    simulate(noche, 1.05, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 0.22 });
    check('de noche aparecen hostiles', noche.mobs.some((m) => m.def.hostile));
    check('respetan la distancia mínima de aparición', noche.mobs.length > 0 && noche.mobs.every(
        (m) => Math.hypot(m.pos[0] - 0.5, m.pos[2] - 0.5) >= 20));

    // dificultad pacífica: la misma noche, pero sin ningún hostil
    const pacifica = new MobSystem(defs, world, silentHooks(), 11);
    simulate(pacifica, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 0.22, peaceful: true });
    check('en dificultad pacífica no aparecen hostiles',
        pacifica.mobs.every((m) => !m.def.hostile));

    // las tonalidades (variants) se asignan al aparecer
    const tonos = new MobSystem({ conejo }, world, silentHooks(), 3);
    simulate(tonos, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('los conejos aparecen con tonalidad válida (variants)',
        tonos.count() > 0 && tonos.mobs.every((m) => m.variant >= 0 && m.variant < conejo.variants));
}

/* ==== Comportamientos ampliados ==== */
console.log('== Neutrales, voladores, acuáticos y otros ==');

/** Mundo lago: lecho de arena en y=5 y agua de y=6 a y=10. */
class LakeWorld extends MockWorld {
    get(x, y, z) {
        if (y > 10) return B.AIR;
        if (y > 5) return B.WATER;
        return y === 5 ? B.SAND : B.STONE;
    }
    sunlit(x, y, z) { return y > 5; }
}

{
    // neutral: pasivo hasta que lo hieren, luego contraataca un rato
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const lobo = new Mob({
        ...zombiTest, id: 'lobo_test', hostile: false,
        behavior: { neutral: true, aggro: 16, attackRange: 1.7, damage: 4, cooldown: 1 },
    }, 0.5, 11, -4.5);
    sys.mobs.push(lobo);
    const ctx = { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 1 };
    simulate(sys, 2, ctx);
    check('el neutral no ataca sin provocación', hooks.calls.damage.length === 0);
    sys.hurt(lobo, 2, [0, 0, -1]);
    check('al herirlo se enfada', lobo.angerT > 0);
    simulate(sys, 3, ctx);
    check('enfadado contraataca con su daño', hooks.calls.damage.some((d) => d.dmg === 4));
}
{
    // volador: se sostiene en el aire sin caer
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const ave = new Mob({ ...cerdo, id: 'ave_test', flying: true, speed: 2 }, 0.5, 12, 0.5);
    sys.mobs.push(ave);
    simulate(sys, 6, farCtx());
    check('el volador no cae al suelo', ave.pos[1] > 11.5 && !ave.onGround);
}
{
    // acuático: nada dentro del lago sin salir del agua
    const world = new LakeWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const pez = new Mob({ ...cerdo, id: 'pez_test', aquatic: true, speed: 1.6, aabb: { w: 0.5, h: 0.4 } }, 0.5, 8, 0.5);
    sys.mobs.push(pez);
    simulate(sys, 6, { pos: [30, 11, 30], eye: [30, 12.6, 30], day: 1 });
    check('el pez se mantiene en el agua', pez.pos[1] > 5.5 && pez.pos[1] < 11.5 && !pez.dying());

    // varado en tierra firme: aletea sin caminar
    const seco = new MobSystem({}, new MockWorld(), silentHooks(), 7);
    const varado = new Mob({ ...cerdo, id: 'pez_test', aquatic: true, speed: 1.6, aabb: { w: 0.5, h: 0.4 } }, 0.5, 11, 0.5);
    seco.mobs.push(varado);
    simulate(seco, 3, farCtx());
    check('varado no camina (solo aletea)', Math.hypot(varado.pos[0] - 0.5, varado.pos[2] - 0.5) < 3);
}
{
    // un mob terrestre caído al agua sale por la orilla (corregido en 0.4.1)
    class ShoreWorld extends MockWorld {
        get(x, y, z) {
            if (y <= 5) return B.STONE;
            if (y <= 10) return z >= 0 ? B.STONE : B.WATER;
            return B.AIR;
        }
        sunlit(x, y, z) { return y > 10; }
    }
    const sys = new MobSystem({}, new ShoreWorld(), silentHooks(), 7);
    const vaquita = new Mob(cerdo, 0.5, 7, -3.5);
    sys.mobs.push(vaquita);
    vaquita.yaw = Math.PI; // camina hacia +Z: la orilla
    for (let t = 0; t < 5; t += DT) {
        vaquita.speed = 1.5;
        sys.stepPhysics(vaquita, DT);
    }
    check('el mob terrestre sale del agua por la orilla',
        vaquita.onGround && vaquita.pos[1] > 10.9 && vaquita.pos[2] > 0);
}
{
    // locomoción a saltos (conejo/rana/slime)
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const conejo = new Mob({ ...cerdo, id: 'conejo_test', hop: true, speed: 1.4 }, 0.5, 11, 0.5);
    sys.mobs.push(conejo);
    conejo.yaw = 0; // hacia −Z
    let despegó = false;
    for (let t = 0; t < 3; t += DT) {
        conejo.speed = 1.4;
        sys.stepPhysics(conejo, DT);
        if (!conejo.onGround) despegó = true;
    }
    check('avanza a saltos (despega y progresa)', despegó && conejo.pos[2] < -1);
}
{
    // teletransporte del enderman al ser herido
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 1);
    const ender = new Mob({
        ...zombiTest, id: 'ender_test', hostile: false,
        behavior: { neutral: true, teleport: true, aggro: 16, attackRange: 1.9, damage: 4, cooldown: 1 },
    }, 0.5, 11, 0.5);
    sys.mobs.push(ender);
    sys.hurt(ender, 2, [1, 0, 0]);
    const d = Math.hypot(ender.pos[0] - 0.5, ender.pos[2] - 0.5);
    check('el herido se teletransporta lejos', d >= 4);
}
{
    // creaking: quieto mientras lo miras, avanza al apartar la vista
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const creaking = new Mob({
        ...zombiTest, id: 'creaking_test',
        behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1, freezeWhenSeen: true },
    }, 0.5, 11, -7.5);
    sys.mobs.push(creaking);
    const mirando = { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], look: [0, 0, -1], day: 0.25 };
    const d0 = Math.abs(creaking.pos[2] - 0.5);
    simulate(sys, 2, mirando);
    const d1 = Math.abs(creaking.pos[2] - 0.5);
    check('mirándolo no avanza', d1 > d0 - 0.4);
    simulate(sys, 2, { ...mirando, look: [0, 0, 1] });
    check('al apartar la vista avanza', Math.abs(creaking.pos[2] - 0.5) < d1 - 1);
}
{
    // noBurn: los no-muertos del desierto no arden al sol
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const parched = new Mob({ ...zombiTest, id: 'parched_test', noBurn: true }, 0.5, 11, -20.5);
    sys.mobs.push(parched);
    simulate(sys, 6, farCtx(1));
    check('con noBurn el sol no lo quema', parched.hp === parched.def.hp);
}
{
    // aparición acuática: en el lago solo salen los de spawn.water cuyo id
    // esté en la lista mobs.water del bioma (el bacalao está en llanura)
    const world = new LakeWorld();
    const defs = {
        bacalao: { ...cerdo, id: 'bacalao', aquatic: true, aabb: { w: 0.5, h: 0.4 }, spawn: { water: true, cap: 6, group: 2 } },
        cerdo: { ...cerdo, spawn: { cap: 6, group: 2 } },
    };
    const sys = new MobSystem(defs, world, silentHooks(), 13);
    simulate(sys, 40, { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 1 });
    check('en el lago aparecen peces (y solo peces)',
        sys.count() > 0 && sys.mobs.every((m) => m.def.id === 'bacalao'));
    check('los peces aparecen dentro del agua', sys.mobs.every((m) => m.pos[1] > 5.5 && m.pos[1] < 11.5));
}
{
    // el daño del proyectil es el del tirador (bruja, saqueador…)
    const world = new MockWorld();
    const hooks = silentHooks();
    const sys = new MobSystem({}, world, hooks, 7);
    const bruja = new Mob({
        ...zombiTest, id: 'bruja_test', speed: 1.4,
        behavior: { aggro: 16, projectile: true, cooldown: 2, damage: 2 },
    }, 0.5, 11, -9.5);
    sys.mobs.push(bruja);
    simulate(sys, 3, { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 0.25 });
    check('el proyectil hiere con el daño del tirador', hooks.calls.damage.some((d) => d.dmg === 2));
}

/* ==== Contrato de las 68 definiciones (elenco oficial del Overworld) ==== */
console.log('== Definiciones de mobs ==');
{
    const IDS = [
        // pasivos — terrestres
        'cerdo', 'oveja', 'vaca', 'gallina', 'armadillo', 'camello', 'camello_husk', 'gato',
        'ocelote', 'zorro', 'caballo', 'burro', 'mooshroom', 'conejo', 'sniffer', 'golem_cobre',
        'golem_nieve', 'tortuga', 'aldeano', 'comerciante', 'rana', 'cubo_azufre',
        // pasivos — voladores
        'allay', 'murcielago', 'loro', 'fantasma_feliz',
        // pasivos — acuáticos
        'bacalao', 'salmon', 'pez_tropical', 'calamar', 'calamar_brillante', 'ajolote',
        // neutrales — terrestres
        'lobo', 'cabra', 'panda', 'oso_polar', 'golem_hierro', 'llama', 'enderman',
        // neutrales — voladores y acuáticos
        'abeja', 'pez_globo', 'delfin', 'nautilus',
        // hostiles
        'zombi', 'esqueleto', 'creeper', 'arana', 'arana_cueva', 'ahogado', 'nautilus_zombi',
        'husk', 'stray', 'parched', 'bogged', 'zombi_aldeano', 'bruja', 'saqueador', 'vindicador',
        'evocador', 'ravager', 'slime', 'lepisma', 'fantasma', 'vex', 'creaking', 'breeze',
        'warden', 'guardian',
    ];
    const presentes = IDS.filter((id) => existsSync(new URL(`../js/mobs/${id}.js`, import.meta.url)));
    check(`las ${IDS.length} definiciones existen (${presentes.length}/${IDS.length})`, presentes.length === IDS.length);
    for (const id of presentes) {
        const def = (await import(`../js/mobs/${id}.js`)).default;
        const { errors } = validate(def, id);
        check(`contrato válido: ${id}${errors.length ? ` → ${errors[0]}` : ''}`, errors.length === 0);
    }
    if (presentes.length === IDS.length) {
        const anims = new Set();
        for (const id of IDS) {
            const def = (await import(`../js/mobs/${id}.js`)).default;
            def.parts.forEach((p) => anims.add(p.anim || 'none'));
        }
        check('el elenco usa animaciones variadas (≥5 tipos)', anims.size >= 5 && [...anims].every((a) => ANIMS.includes(a)));
    }
}

console.log(`\nResultado: ${ok} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

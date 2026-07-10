/**
 * Suite del sistema de mobs — `node test/mobs.mjs`.
 * Prueba en Node los módulos puros: geometría de partes (model.js), pieles
 * (skin.js), física e IA de mobs (mobs.js) sobre un mundo simulado, y valida
 * el contrato de las 68 definiciones de js/mobs/.
 */
import { existsSync } from 'node:fs';
import { B } from '../js/blocks.js';
import { WORLD_HEIGHT, SEA_LEVEL } from '../js/dimensiones.js';
import { buildPartMesh, partUVRects, ANIMS } from '../js/mobs/model.js';
import { Skin } from '../js/mobs/skin.js';
import { MobSystem, Mob } from '../js/mobs.js';
import { mat4RotateZ } from '../js/math.js';
import { validate } from './validate-mob.mjs';
import pig from '../js/mobs/pig.js';
import rabbit from '../js/mobs/rabbit.js';

let ok = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { ok++; console.log(`  OK  ${name}`); }
    else { fail++; console.log(`  FALLA ${name}`); }
};

/**
 * Mundo plano: suelo sólido hasta `ground` (hierba en la superficie). Las
 * pruebas de física usan el suelo por defecto (y=10); las de aparición lo
 * suben a TIERRA (> SEA_LEVEL+1) para que las columnas caigan en la clase de
 * terreno 'tierra' y el bioma sea la llanura (el comodín del registro).
 */
const TIERRA = SEA_LEVEL + 8; // suelo de las pruebas de aparicion (> mar+1)

class MockWorld {
    constructor(ground = 10) { this.sy = WORLD_HEIGHT; this.ground = ground; this.edits = new Map(); this.walls = new Set(); }
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
    const calls = { sounds: [], damage: [], explosions: 0, particles: [] };
    return {
        calls,
        sound: (kind) => calls.sounds.push(kind),
        damagePlayer: (dmg, dir) => calls.damage.push({ dmg, dir }),
        explosion: () => calls.explosions++,
        particles: (evento, m, vars) => calls.particles.push({ evento, vars }),
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
    const part = pig.parts[0];
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
    const m = new Mob(pig, 0.5, 15, 0.5);
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
    const m = new Mob(pig, 0.5, 11, 0.5);
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
    // explodeAt genérico: la lata de Red Bull lo invoca desde main.js con
    // radio 4 (cráter circular de área π·4² ≈ 50 bloques cuadrados)
    const world = new MockWorld();
    const hooks = silentHooks();
    let radioHook = 0;
    hooks.explosion = (pos, r) => { hooks.calls.explosions++; radioHook = r; };
    const sys = new MobSystem({}, world, hooks, 7);
    world.set(0, 8, 0, B.BEDROCK); // dentro de la esfera: debe sobrevivir
    sys.explodeAt([0.5, 10.5, 0.5], 4, [0.5, 13.5, 0.5]);
    // semiesfera sólida bajo el centro (dy −4..0): 153 celdas exactas menos
    // la de bedrock, todas a AIR
    const despejadas = [...world.edits.values()].filter((v) => v === B.AIR).length;
    check('explodeAt despeja la semiesfera sólida de radio 4 (152 celdas)',
        despejadas === 152 && hooks.calls.explosions === 1 && radioHook === 4);
    check('el lecho de roca sobrevive a la explosión', world.get(0, 8, 0) === B.BEDROCK);
    check('daña al jugador según la distancia (3 m de 8 → 9 de daño)',
        hooks.calls.damage.length === 1 && hooks.calls.damage[0].dmg === 9);
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
    const m = new Mob(pig, 5.5, 11, 0.5);
    sys.mobs.push(m);
    const hit = sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 8);
    check('raycastMob alcanza al mob apuntado', hit !== null && hit.mob === m);
    world.addWall(3, 11, 0);
    check('un bloque por medio bloquea el golpe', sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 8) === null);
    check('fuera de alcance no golpea', sys.raycastMob([0.5, 11.5, 0.5], [1, 0, 0], 2) === null);
}
{
    // suelo en TIERRA (> nivel del mar): las columnas caen en 'tierra' y el
    // bioma es la llanura, cuyas listas day/night gobiernan la aparición
    const world = new MockWorld(TIERRA);
    const zombie = { ...zombiTest, id: 'zombie' };     // está en llanura.mobs.night
    const osoPolar = { ...pig, id: 'polar_bear' };     // NO está en las listas de llanura
    const defs = { pig, zombie, polar_bear: osoPolar };
    const dia = new MobSystem(defs, world, silentHooks(), 11);
    simulate(dia, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('de día aparecen mobs y son pasivos', dia.count() > 0 && dia.mobs.every((m) => !m.def.hostile));
    check('un id fuera de las listas del bioma no aparece (polar_bear)',
        dia.mobs.every((m) => m.def.id !== 'polar_bear'));

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
    const tonos = new MobSystem({ rabbit }, world, silentHooks(), 3);
    simulate(tonos, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('los conejos aparecen con tonalidad válida (variants)',
        tonos.count() > 0 && tonos.mobs.every((m) => m.variant >= 0 && m.variant < rabbit.variants));

    // aparición forzada (huevo de aparición del creativo): sin sorteos ni
    // topes por tipo, en la celda pedida, con saludo de voz y tonalidad
    const huevos = silentHooks();
    const granja = new MobSystem({ pig, rabbit }, world, huevos, 5);
    const cerdo = granja.spawnAt('pig', 8, 41, 8);
    check('spawnAt hace aparecer el tipo pedido en la celda',
        cerdo !== null && granja.count() === 1 && cerdo.def.id === 'pig' &&
        cerdo.pos[0] === 8.5 && cerdo.pos[2] === 8.5 &&
        huevos.calls.sounds.includes('say'));
    check('spawnAt con tonalidades sortea una variante válida', (() => {
        const conejo = granja.spawnAt('rabbit', 9, 41, 9);
        return conejo && conejo.variant >= 0 && conejo.variant < rabbit.variants;
    })());
    check('spawnAt rechaza tipos desconocidos', granja.spawnAt('warden_falso', 8, 41, 8) === null);
    let nacidos = 0;
    while (granja.spawnAt('pig', 8, 41, 8)) nacidos++;
    check('spawnAt respeta el tope duro de 128 mobs', granja.count() === 128 && nacidos === 126);
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
    const ave = new Mob({ ...pig, id: 'ave_test', flying: true, speed: 2 }, 0.5, 12, 0.5);
    sys.mobs.push(ave);
    simulate(sys, 6, farCtx());
    check('el volador no cae al suelo', ave.pos[1] > 11.5 && !ave.onGround);
}
{
    // DESATASCO por ascenso: un volador que empuja contra una pared a ras
    // del suelo, sin poder avanzar, se eleva para superar el obstáculo y
    // retoma la trayectoria (los drones dejan de quedarse pegados al piso)
    const world = new MockWorld();
    for (let y = 11; y <= 14; y++) world.addWall(3, y, 0); // pared de 4 de alto en x=3
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const ave = new Mob({ ...pig, id: 'ave_atasco', flying: true, speed: 3, flySpeed: 6 }, 1.5, 11, 0.5);
    sys.mobs.push(ave);
    const ctx = { pos: [30, 11, 30], eye: [30, 12.62, 30], day: 1 };
    // fuerza cada tick a querer avanzar hacia +X (contra la pared) a ras
    let yMax = ave.pos[1], atascado = false;
    for (let t = 0; t < 4; t += DT) {
        ave.yaw = -Math.PI / 2; ave.speed = 3; ave.targetY = 11; // empuje bajo hacia +X
        sys.stepPhysics(ave, DT);
        yMax = Math.max(yMax, ave.pos[1]);
        if (t < 0.5 && ave.hitWall) atascado = true; // al inicio choca de pared
    }
    check('el volador atascado contra la pared se eleva (desatasco por ascenso)',
        atascado && yMax > 14);
    check('tras elevarse supera el obstáculo y avanza (retoma trayectoria)',
        ave.pos[0] > 3.5);
}
{
    // acuático: nada dentro del lago sin salir del agua
    const world = new LakeWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const pez = new Mob({ ...pig, id: 'pez_test', aquatic: true, speed: 1.6, aabb: { w: 0.5, h: 0.4 } }, 0.5, 8, 0.5);
    sys.mobs.push(pez);
    simulate(sys, 6, { pos: [30, 11, 30], eye: [30, 12.6, 30], day: 1 });
    check('el pez se mantiene en el agua', pez.pos[1] > 5.5 && pez.pos[1] < 11.5 && !pez.dying());

    // varado en tierra firme: aletea sin caminar
    const seco = new MobSystem({}, new MockWorld(), silentHooks(), 7);
    const varado = new Mob({ ...pig, id: 'pez_test', aquatic: true, speed: 1.6, aabb: { w: 0.5, h: 0.4 } }, 0.5, 11, 0.5);
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
    const vaquita = new Mob(pig, 0.5, 7, -3.5);
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
    const conejo = new Mob({ ...pig, id: 'conejo_test', hop: true, speed: 1.4 }, 0.5, 11, 0.5);
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
        cod: { ...pig, id: 'cod', aquatic: true, aabb: { w: 0.5, h: 0.4 }, spawn: { water: true, cap: 6, group: 2 } },
        pig: { ...pig, spawn: { cap: 6, group: 2 } },
    };
    const sys = new MobSystem(defs, world, silentHooks(), 13);
    simulate(sys, 40, { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 1 });
    check('en el lago aparecen peces (y solo peces)',
        sys.count() > 0 && sys.mobs.every((m) => m.def.id === 'cod'));
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
{
    // dron guardián: patrulla el perímetro del jugador y embiste al agresor
    const dron = (await import('../js/mobs/dron.js')).default;
    const world = new MockWorld();
    const sys = new MobSystem({}, world, silentHooks(), 7);
    const guard = new Mob(dron, 3, 13, 3);
    sys.mobs.push(guard);
    const ctx = { pos: [0.5, 11, 0.5], eye: [0.5, 12.62, 0.5], day: 1 };

    // sin amenazas, patrulla orbital: muestrea la ronda unos segundos y
    // comprueba que da vueltas alrededor del jugador — a un radio acotado,
    // sin quedarse quieto y con radio/altura VARIABLES (no fijos)
    const angulos = [], radios = [], alturas = [];
    let quietoMax = 0, prev = [...guard.pos];
    for (let t = 0; t < 12; t += DT) {
        sys.update(DT, ctx);
        const dx = guard.pos[0] - 0.5, dz = guard.pos[2] - 0.5;
        angulos.push(Math.atan2(dz, dx));
        radios.push(Math.hypot(dx, dz));
        alturas.push(guard.pos[1]);
        quietoMax = Math.max(quietoMax, Math.hypot(guard.pos[0] - prev[0], guard.pos[2] - prev[2]));
        prev = [...guard.pos];
    }
    check('el dron no cae al patrullar (vuela sobre el jugador)',
        alturas.every((y) => y > ctx.pos[1] + 0.5) && !guard.onGround);
    check('patrulla a un radio acotado del jugador (perímetro, no encima ni lejos)',
        radios.every((r) => r > 1.5 && r < 9) && !guard.dying());
    check('orbita: el ángulo alrededor del jugador recorre buena parte del círculo',
        (Math.max(...angulos) - Math.min(...angulos)) > 2);
    check('la ronda no es fija: radio y altura varían visiblemente',
        (Math.max(...radios) - Math.min(...radios)) > 1 &&
        (Math.max(...alturas) - Math.min(...alturas)) > 0.8);
    check('nunca se queda plantado (se mueve todos los fotogramas)', quietoMax > 0.01);

    // aparece un hostil robusto junto al jugador: el dron lo persigue en 3D
    // (baja hacia el objetivo terrestre) y lo hiere hasta matarlo
    const zombi = new Mob({
        ...zombiTest, id: 'zombi_amenaza', hp: 40,
        behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1 },
    }, 3.5, 11, 0.5);
    sys.mobs.push(zombi);
    const hpAntes = zombi.hp;
    let yMin = guard.pos[1];
    for (let t = 0; t < 6; t += DT) { sys.update(DT, ctx); yMin = Math.min(yMin, guard.pos[1]); }
    check('el dron ataca al agresor cercano al jugador', zombi.hp < hpAntes);
    check('el dron persigue en 3D (baja hacia el objetivo terrestre)', yMin < 12.5);

    // el dron NO ataca a un pasivo (una vaca no es una amenaza)
    const paz = new MobSystem({}, world, silentHooks(), 7);
    const guard2 = new Mob(dron, 1.5, 13, 0.5);
    const vaca = new Mob(pig, 2.5, 11, 0.5);
    paz.mobs.push(guard2, vaca);
    const hpVaca = vaca.hp;
    simulate(paz, 5, ctx);
    check('el dron no agrede a los pasivos', vaca.hp === hpVaca && !vaca.dying());

    // DOS RADIOS de detección: un hostil TERRESTRE a 30 bloques (fuera del
    // guardRadius de 16) se ignora; un hostil VOLADOR a la misma distancia
    // SÍ se detecta (radio aéreo = triple = 48)
    {
        const s = new MobSystem({}, world, silentHooks(), 7);
        const g = new Mob(dron, 0.5, 13, 0.5);
        const terrLejos = new Mob({ ...zombiTest, id: 'terr_lejos',
            behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1 } }, 30.5, 11, 0.5);
        s.mobs.push(g, terrLejos);
        simulate(s, 2, ctx);
        check('un agresor terrestre fuera del radio de tierra se ignora (sigue patrullando)',
            Math.hypot(g.pos[0] - 0.5, g.pos[2] - 0.5) < 10);

        const s2 = new MobSystem({}, world, silentHooks(), 7);
        const g2 = new Mob(dron, 0.5, 13, 0.5);
        const volLejos = new Mob({ ...zombiTest, id: 'vol_lejos', flying: true, hostile: true,
            behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1 } }, 30.5, 16, 0.5);
        s2.mobs.push(g2, volLejos);
        simulate(s2, 4, ctx);
        check('un agresor volador a triple distancia SÍ se detecta (el dron va hacia él)',
            Math.hypot(g2.pos[0] - 30.5, g2.pos[2] - 0.5) < 20);
    }

    // INSPECCIÓN de un volador PACÍFICO: el dron va, lo ronda observándolo
    // y regresa al perímetro SIN agredirlo
    {
        const s = new MobSystem({}, world, silentHooks(), 7);
        const g = new Mob(dron, 0.5, 13, 0.5);
        const pajaro = new Mob({ ...pig, id: 'pajaro', flying: true, hp: 12,
            aabb: { w: 0.5, h: 0.5 } }, 12.5, 16, 0.5);
        s.mobs.push(g, pajaro);
        // durante la inspección se acerca al volador
        let cerca = false;
        for (let t = 0; t < 5; t += DT) {
            s.update(DT, ctx);
            if (Math.hypot(g.pos[0] - pajaro.pos[0], g.pos[2] - pajaro.pos[2]) < 4) cerca = true;
        }
        check('el dron inspecciona al volador pacífico (se le acerca a observar)', cerca);
        check('no agrede al volador pacífico', pajaro.hp === 12 && !pajaro.dying());
        // tras la inspección vuelve al perímetro del jugador
        simulate(s, 5, ctx);
        check('tras inspeccionar, el dron regresa al perímetro del jugador',
            Math.hypot(g.pos[0] - 0.5, g.pos[2] - 0.5) < 10 && pajaro.hp === 12);
    }

    // INSPECCIÓN de un volador AGRESIVO: lo ronda y luego SÍ lo ataca
    {
        const s = new MobSystem({}, world, silentHooks(), 7);
        const g = new Mob(dron, 0.5, 13, 0.5);
        const vex = new Mob({ ...zombiTest, id: 'vex_amenaza', flying: true, hostile: true, hp: 40,
            aabb: { w: 0.5, h: 0.6 },
            behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1 } }, 10.5, 15, 0.5);
        s.mobs.push(g, vex);
        const hp0 = vex.hp;
        simulate(s, 12, ctx);
        check('el dron ataca al volador AGRESIVO tras inspeccionarlo', vex.hp < hp0);
    }

    // DOS DRONES juntos NO se auto-vigilan (son aliados del mismo tipo):
    // ambos patrullan sin entrar nunca en inspección, y un pájaro que
    // aparece cerca sí lo inspeccionan (excluir el propio tipo, no todo)
    {
        const s = new MobSystem({}, world, silentHooks(), 7);
        const d1 = new Mob(dron, 2, 13, 1);
        const d2 = new Mob(dron, -1, 13, 2);
        s.mobs.push(d1, d2);
        let seInspeccionan = false;
        for (let t = 0; t < 8; t += DT) {
            s.update(DT, ctx);
            if (d1.inspectTarget || d2.inspectTarget) seInspeccionan = true;
        }
        check('dos drones del mismo tipo no se vigilan entre sí', !seInspeccionan);
        // pero un pájaro ajeno sí desencadena la inspección
        const pajaro = new Mob({ ...pig, id: 'pajaro2', flying: true, aabb: { w: 0.5, h: 0.5 } }, 9.5, 15, 0.5);
        s.mobs.push(pajaro);
        let inspeccionaAjeno = false;
        for (let t = 0; t < 4; t += DT) {
            s.update(DT, ctx);
            if (d1.inspectTarget === pajaro || d2.inspectTarget === pajaro) inspeccionaAjeno = true;
        }
        check('sí inspeccionan un volador ajeno (pájaro), no solo se ignoran todo', inspeccionaAjeno);
    }

    // no aparece de forma natural (summonOnly): ni de día ni de noche
    const salvaje = new MobSystem({ dron }, new MockWorld(TIERRA), silentHooks(), 3);
    simulate(salvaje, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('el dron no aparece de forma natural (solo por invocación)', salvaje.count() === 0);
}

/* ==== Antidron kamikaze ==== */
console.log('== Antidron kamikaze ==');
{
    const antidron = (await import('../js/mobs/antidron.js')).default;
    const dron = (await import('../js/mobs/dron.js')).default;
    const ctx = { pos: [40, 11, 40], eye: [40, 12.62, 40], day: 1 }; // jugador lejos

    // sin drones cerca: reposa QUIETO en el suelo (con gravedad, sin volar)
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const a = new Mob(antidron, 0.5, 15, 0.5); // cae desde el aire
        s.mobs.push(a);
        simulate(s, 3, ctx);
        check('el antidron reposa en el suelo sin drones (aterriza y se queda quieto)',
            a.onGround && Math.abs(a.pos[1] - 11) < 0.2 && !a.airborne &&
            Math.hypot(a.pos[0] - 0.5, a.pos[2] - 0.5) < 1);
    }

    // detecta un dron y DESPEGA: sube por encima de su posición de reposo
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const a = new Mob(antidron, 0.5, 11, 0.5);
        const d = new Mob(dron, 6.5, 19, 0.5); // dron volando a 8 bloques de altura
        s.mobs.push(a, d);
        let yMax = a.pos[1];
        for (let t = 0; t < 3; t += DT) { s.update(DT, ctx); yMax = Math.max(yMax, a.pos[1]); }
        check('al detectar un dron el antidron despega (asciende)', a.airborne && yMax > 13);
    }

    // techo de ascenso: el DOBLE de la altura del dron sobre el suelo,
    // congelado al detectar. Con el dron a 8 bloques (y=19, suelo=11), la
    // altura es 8 y el techo objetivo ≈ y=27 (11 + 8·2)
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const a = new Mob(antidron, 0.5, 11, 0.5);
        const d = new Mob(dron, 20.5, 19, 0.5); // lejos en XZ
        s.mobs.push(a, d);
        s.update(DT, ctx); // un tick: detecta y congela el techo
        check('el techo de ascenso es el doble de la altura del dron (≈y 27)',
            Math.abs(a.cruiseY - 27) < 1.5);
        // y en el aire asciende claramente por encima de su reposo antes de
        // iniciar el picado
        let yMax = a.pos[1];
        for (let t = 0; t < 2; t += DT) { s.update(DT, ctx); yMax = Math.max(yMax, a.pos[1]); }
        check('gana altura sobre su reposo al despegar (asciende varios bloques)', yMax > 16);
    }

    // EMBESTIDA kamikaze: alcanza al dron, EXPLOTA y AMBOS mueren a la vez
    {
        const hooks = silentHooks();
        const s = new MobSystem({}, new MockWorld(), hooks, 7);
        const a = new Mob(antidron, 0.5, 11, 0.5);
        const d = new Mob(dron, 5.5, 16, 0.5);
        s.mobs.push(a, d);
        let explotó = false;
        for (let t = 0; t < 8 && !explotó; t += DT) {
            s.update(DT, ctx);
            if (hooks.calls.explosions > 0) explotó = true;
        }
        check('el antidron impacta y explota', explotó);
        // tras el desenlace, ambos acaban muriendo (dieT ≥ 0 o ya eliminados)
        simulate(s, 1, ctx);
        check('la embestida destruye al dron y al antidron a la vez', s.count() === 0);
    }

    // trayectoria TAMBALEANTE: el rumbo no apunta siempre recto al dron
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const a = new Mob(antidron, 0.5, 11, 0.5);
        const d = new Mob(dron, 18.5, 20, 0.5);
        s.mobs.push(a, d);
        const desvios = [];
        for (let t = 0; t < 2.5; t += DT) {
            s.update(DT, ctx);
            const recto = Math.atan2(-(d.pos[0] - a.pos[0]), -(d.pos[2] - a.pos[2]));
            let rel = a.yaw - recto;
            rel = Math.atan2(Math.sin(rel), Math.cos(rel));
            desvios.push(Math.abs(rel));
        }
        check('la embestida tambalea (el rumbo se desvía del recto a rachas)',
            Math.max(...desvios) > 0.25);
    }

    // no aparece de forma natural (summonOnly)
    const salvaje = new MobSystem({ antidron }, new MockWorld(TIERRA), silentHooks(), 3);
    simulate(salvaje, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('el antidron no aparece de forma natural (solo por invocación)', salvaje.count() === 0);
}

/* ==== Dron escapista ==== */
console.log('== Dron escapista ==');
{
    const escapista = (await import('../js/mobs/dron_escapista.js')).default;
    const dron = (await import('../js/mobs/dron.js')).default;
    const antidron = (await import('../js/mobs/antidron.js')).default;
    // jugador cerca del grupo: dentro del ACTIVE_RADIUS los mobs corren su IA
    const ctx = { pos: [10, 11, 10], eye: [10, 12.62, 10], day: 1 };

    // más rápido: su flySpeed triplica (o casi) al del dron y supera al antidron
    check('el escapista es ~3× más rápido que el dron y más que el antidron',
        escapista.flySpeed >= dron.speed * 2.8 && escapista.flySpeed > antidron.flySpeed);

    // vuela errático: recorre mucho terreno y cambia de rumbo a saltos bruscos
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const e = new Mob(escapista, 20.5, 16, 20.5);
        s.mobs.push(e);
        const yaws = [], pos0 = [...e.pos];
        for (let t = 0; t < 6; t += DT) { s.update(DT, ctx); yaws.push(e.yaw); }
        check('el escapista vuela sin caer (airborne, se mantiene en el aire)',
            e.airborne && e.pos[1] > 12 && !e.dying());
        // recorrido amplio (velocidad alta) y muchos quiebres de rumbo
        const recorrido = Math.hypot(e.pos[0] - pos0[0], e.pos[2] - pos0[2]);
        let quiebres = 0;
        for (let i = 1; i < yaws.length; i++) {
            let d = Math.abs(yaws[i] - yaws[i - 1]);
            d = Math.min(d, Math.PI * 2 - d);
            if (d > 0.8) quiebres++;
        }
        check('traza ángulos imposibles (varios quiebres bruscos de rumbo)', quiebres >= 3);
        check('mantiene alta velocidad en los quiebres (recorre mucho terreno)', recorrido > 8);
    }

    // giro instantáneo: al reescribir el rumbo, la rapidez horizontal no cae
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 3);
        const e = new Mob(escapista, 20.5, 16, 20.5);
        s.mobs.push(e);
        let vMin = Infinity, ticks = 0;
        for (let t = 0; t < 4; t += DT) {
            s.update(DT, ctx);
            const vh = Math.hypot(e.vel[0], e.vel[2]);
            if (++ticks > 20) vMin = Math.min(vMin, vh); // tras el arranque
        }
        check('no pierde velocidad al quebrar (snapTurn mantiene la rapidez)',
            vMin > escapista.flySpeed * 0.7);
    }

    // SALTO evasivo con pausa al ser perseguido: alterna ráfaga y pausa
    // quieto. Mide un salto (distancia recta desde su inicio) y la velocidad
    // de la pausa asentada.
    const medirSalto = (cazDef) => {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const e = new Mob(escapista, 20.5, 20, 20.5);
        // cazador a ~5 bloques: dentro del alertRadius del escapista, pero
        // sin impacto inmediato (el antidron kamikaze explota si está pegado)
        const g = new Mob(cazDef, 25.5, 20, 20.5);
        g.airborne = true;
        s.mobs.push(e, g);
        const cerca = { pos: [20, 11, 20], eye: [20, 12.62, 20], day: 1 };
        const saltos = [], velEnPausa = [];
        let start = [e.pos[0], e.pos[2]], pausaFrames = 0;
        for (let t = 0; t < 12; t += DT) { // saltos largos: más tiempo para ≥2
            const antes = e.hopEvadePhase;
            s.update(DT, cerca);
            // fin de un salto (leap→pause): mide desde el inicio registrado
            // (start es [x, z] → índices 0 y 1)
            if (antes === 'leap' && e.hopEvadePhase === 'pause') {
                saltos.push(Math.hypot(e.pos[0] - start[0], e.pos[2] - start[1]));
                pausaFrames = 0;
            }
            // marca el inicio del PRÓXIMO salto: la posición al salir de pausa
            if (antes === 'pause' && e.hopEvadePhase === 'leap') start = [e.pos[0], e.pos[2]];
            if (e.hopEvadePhase === 'pause' && ++pausaFrames > 1) {
                velEnPausa.push(Math.hypot(e.vel[0], e.vel[2]));
            }
        }
        return { saltos, velEnPausa };
    };
    {
        const pausa = escapista.behavior.hopPause;
        const rDron = medirSalto(dron);
        // 2× recorrido del dron en la pausa, escalado por hopReach (saltos largos)
        const distObjetivo = 2 * dron.speed * pausa * escapista.behavior.hopReach;
        check('al ser perseguido entra en modo salto evasivo (fases leap/pause)',
            rDron.saltos.length >= 2);
        check('el salto es largo: ≈ 2× lo que el cazador recorre en la pausa × hopReach',
            rDron.saltos.some((d) => Math.abs(d - distObjetivo) < 3));
        check('en la pausa se detiene por completo (flota inmóvil)',
            rDron.velEnPausa.length > 0 && rDron.velEnPausa.every((v) => v < 0.5));
        // la distancia del salto ESCALA con la velocidad del cazador: con un
        // cazador simulado más rápido, el escapista fija un salto más largo.
        // Se mide la distancia OBJETIVO del primer salto (m.hopDist) con un
        // dron falso lento y otro rápido, sin dejar que su IA interfiera.
        const distSaltoCon = (velCaza) => {
            const s2 = new MobSystem({}, new MockWorld(), silentHooks(), 7);
            const e2 = new Mob(escapista, 20.5, 20, 20.5);
            const falso = new Mob({ ...dron, id: 'caza_falso', speed: velCaza }, 24.5, 20, 20.5);
            s2.mobs.push(e2, falso);
            const cerca2 = { pos: [20, 11, 20], eye: [20, 12.62, 20], day: 1 };
            // un tick basta para que evadeHop fije hopDist del primer salto
            s2.update(DT, cerca2);
            return e2.hopDist;
        };
        check('el salto escala con la velocidad del cazador (más lejos del más rápido)',
            distSaltoCon(11) > distSaltoCon(4.5) * 1.8);
    }

    // ventaja evasiva realista: contra un dron (más lento) gana distancia neta
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const e = new Mob(escapista, 20.5, 16, 20.5);
        const g = new Mob(dron, 19.5, 15, 20.5);
        s.mobs.push(e, g);
        const cerca = { pos: [20, 11, 20], eye: [20, 12.62, 20], day: 1 };
        const d0 = Math.hypot(e.pos[0] - g.pos[0], e.pos[2] - g.pos[2]);
        simulate(s, 5, cerca);
        const d1 = Math.hypot(e.pos[0] - g.pos[0], e.pos[2] - g.pos[2]);
        check('gana distancia prudente sobre el dron que lo persigue', d1 > d0 + 1);
    }

    // RASTRO de partículas al saltar: cada salto evasivo pide el efecto
    // 'evade_trail' (con la dirección de la estela) vía el hook particles
    {
        const hooks = silentHooks();
        const s = new MobSystem({}, new MockWorld(), hooks, 7);
        const e = new Mob(escapista, 20.5, 20, 20.5);
        const g = new Mob(dron, 25.5, 20, 20.5); g.airborne = true;
        s.mobs.push(e, g);
        const cerca = { pos: [20, 11, 20], eye: [20, 12.62, 20], day: 1 };
        for (let t = 0; t < 4; t += DT) s.update(DT, cerca);
        const trails = hooks.calls.particles.filter((p) => p.evento === 'evade_trail');
        check('deja un rastro de partículas en cada salto evasivo', trails.length >= 2);
        check('el rastro lleva la dirección de la estela',
            trails.length > 0 && typeof trails[0].vars.x === 'number' &&
            typeof trails[0].vars.z === 'number');
    }

    // PATRULLA de largo alcance: se aleja hasta ~6× la órbita de un dron (5)
    // subiendo ~6× más alto, y regresa a probar el perímetro cercano antes
    // de volver a alejarse — todo en ciclo. Sin cazadores cerca.
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const e = new Mob(escapista, 10.5, 14, 10.5);
        s.mobs.push(e);
        const cerca = { pos: [10, 11, 10], eye: [10, 12.62, 10], day: 1 };
        let maxDist = 0, maxAlt = 0, minInDist = Infinity, salidas = 0, prev = 'out';
        for (let t = 0; t < 60; t += DT) {
            s.update(DT, cerca);
            const d = Math.hypot(e.pos[0] - 10, e.pos[2] - 10);
            maxDist = Math.max(maxDist, d);
            maxAlt = Math.max(maxAlt, e.pos[1] - 11);
            if (e.roamPhase === 'in') minInDist = Math.min(minInDist, d);
            if (e.roamPhase === 'out' && prev === 'in') salidas++;
            prev = e.roamPhase;
        }
        // la órbita del dron llega a ~7 bloques y ~3.8 de altura; el escapista
        // debe superarlas holgadamente (varias veces)
        check('se aleja mucho más que un dron (varias veces su órbita)', maxDist > 35);
        check('sube mucho más alto que un dron (varias veces su altura)', maxAlt > 20);
        check('regresa a probar el perímetro cercano al jugador', minInDist < 9);
        check('repite el ciclo alejarse→volver→alejarse', salidas >= 3);
    }

    // los DRONES lo persiguen de inmediato (presa de práctica), sin inspección
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const g = new Mob(dron, 0.5, 14, 0.5);
        const e = new Mob(escapista, 8.5, 15, 0.5);
        s.mobs.push(g, e);
        const d0 = Math.hypot(g.pos[0] - e.pos[0], g.pos[2] - e.pos[2]);
        // un solo tick: el dron ya debe estar en 'chase' con la presa, no patrullando
        s.update(DT, ctx);
        check('el dron persigue al escapista de inmediato (chase, sin inspección)',
            g.state === 'chase' && g.inspectTarget === null);
    }

    // los ANTIDRONES también lo persiguen (lo detectan como objetivo)
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const a = new Mob(antidron, 0.5, 11, 0.5);
        const e = new Mob(escapista, 6.5, 15, 0.5);
        s.mobs.push(a, e);
        let yMax = a.pos[1];
        for (let t = 0; t < 3; t += DT) { s.update(DT, ctx); yMax = Math.max(yMax, a.pos[1]); }
        check('el antidron despega para perseguir al escapista', a.airborne && yMax > 12);
    }

    // no ataca a nadie (es presa, no cazador) ni aparece de forma natural
    {
        const s = new MobSystem({}, new MockWorld(), silentHooks(), 7);
        const e = new Mob(escapista, 20.5, 15, 20.5);
        const vaca = new Mob(pig, 21.5, 11, 20.5);
        s.mobs.push(e, vaca);
        const hpVaca = vaca.hp;
        simulate(s, 4, ctx);
        check('el escapista no agrede a otros mobs (es presa, no cazador)',
            vaca.hp === hpVaca && !vaca.dying());
    }
    const salvaje = new MobSystem({ dron_escapista: escapista }, new MockWorld(TIERRA), silentHooks(), 3);
    simulate(salvaje, 30, { pos: [0.5, 41, 0.5], eye: [0.5, 42.62, 0.5], day: 1 });
    check('el escapista no aparece de forma natural (solo por invocación)', salvaje.count() === 0);
}

/* ==== Contrato de las 68 definiciones (elenco oficial del Overworld) ==== */
console.log('== Definiciones de mobs ==');
{
    const IDS = [
        // pasivos — terrestres
        'pig', 'sheep', 'cow', 'chicken', 'armadillo', 'camel', 'camel_husk', 'cat',
        'ocelot', 'fox', 'horse', 'donkey', 'mooshroom', 'rabbit', 'sniffer', 'copper_golem',
        'snow_golem', 'turtle', 'villager', 'wandering_trader', 'frog', 'sulfur_cube',
        // pasivos — voladores
        'allay', 'bat', 'parrot', 'happy_ghast',
        // pasivos — acuáticos
        'cod', 'salmon', 'tropical_fish', 'squid', 'glow_squid', 'axolotl',
        // neutrales — terrestres
        'wolf', 'goat', 'panda', 'polar_bear', 'iron_golem', 'llama', 'enderman',
        // neutrales — voladores y acuáticos
        'bee', 'pufferfish', 'dolphin', 'nautilus',
        // hostiles
        'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'drowned', 'zombie_nautilus',
        'husk', 'stray', 'parched', 'bogged', 'zombie_villager', 'witch', 'pillager', 'vindicator',
        'evoker', 'ravager', 'slime', 'silverfish', 'ghast', 'vex', 'creaking', 'breeze',
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

    // mobs PROPIOS de la casa (no vanilla): mismo contrato validable, con
    // la anim 'rotor' de las hélices del dron/antidron y el escapista anular
    const PROPIOS = ['dron', 'antidron', 'dron_escapista'];
    for (const id of PROPIOS) {
        const def = (await import(`../js/mobs/${id}.js`)).default;
        const { errors } = validate(def, id);
        check(`contrato válido (propio): ${id}${errors.length ? ` → ${errors[0]}` : ''}`, errors.length === 0);
    }
    check('el dron usa la anim rotor en sus hélices', (await import('../js/mobs/dron.js')).default
        .parts.some((p) => p.anim === 'rotor'));

    // Límites AMPLIADOS del contrato (modelos más complejos): hasta 64 partes
    // y pieles de 256×256. Se validan con defs sintéticas mínimas.
    {
        const base = {
            id: 'zz', name: 'Z', hostile: false, aabb: { w: 0.5, h: 0.5 },
            hp: 5, speed: 1,
            paint(skin) { skin.fill(0, 0, skin.w, skin.h, [128, 128, 128]); }, // cubre todo
            voice: { say: [{ f: 1, d: 1 }], hurt: [{ f: 1, d: 1 }], death: [{ f: 1, d: 1 }] },
        };
        const parteN = (n) => Array.from({ length: n }, (_, i) => ({
            name: `p${i}`, size: [1, 1, 1], pivot: [0, 0, 0], origin: [0, 0, 0],
            uv: [(i % 32) * 4, Math.floor(i / 32) * 4], // sin solapes en 256×256
        }));
        check('acepta una piel de 256×256',
            validate({ ...base, skin: { w: 256, h: 256 }, parts: parteN(1) }, 'zz').errors.length === 0);
        check('acepta hasta 64 partes (modelos complejos)',
            validate({ ...base, skin: { w: 256, h: 256 }, parts: parteN(64) }, 'zz').errors.length === 0);
        check('rechaza más de 64 partes',
            validate({ ...base, skin: { w: 256, h: 256 }, parts: parteN(65) }, 'zz').errors.length > 0);
        check('rechaza una piel de tamaño no soportado (200)',
            validate({ ...base, skin: { w: 200, h: 200 }, parts: parteN(1) }, 'zz').errors.length > 0);
    }

    // Campo `sonidos` (pack local opcional, contrato en documents/02-mobs.md):
    // todo prefijo es ruta bajo mob/ en minúsculas, sin extensión, sin barra
    // inicial y sin número de variante (la variante la elige el manifest).
    {
        const KINDS = ['say', 'hurt', 'death'];
        let defsCon = 0, prefijosTotal = 0;
        const malos = [];
        for (const id of presentes) {
            const def = (await import(`../js/mobs/${id}.js`)).default;
            if (def.sonidos === undefined) continue;
            defsCon++;
            for (const [kind, prefijos] of Object.entries(def.sonidos)) {
                if (!KINDS.includes(kind) || !Array.isArray(prefijos) || prefijos.length === 0) {
                    malos.push(`${id}.${kind}`);
                    continue;
                }
                for (const p of prefijos) {
                    prefijosTotal++;
                    if (typeof p !== 'string' || !/^mob\/[a-z0-9_/.]+$/.test(p)
                        || /\.(mp3|ogg|wav|fsb)$/.test(p) || /[0-9]$/.test(p)) {
                        malos.push(`${id}.${kind}: "${p}"`);
                    }
                }
            }
        }
        check(`las 68 defs traen campo sonidos (${defsCon}/68)`, defsCon === 68);
        check(`todo prefijo de sonidos tiene formato válido (${prefijosTotal} prefijos)${malos.length ? ` → ${malos[0]}` : ''}`,
            prefijosTotal > 0 && malos.length === 0);
    }
}

console.log(`\nResultado: ${ok} OK, ${fail} FALLAN`);
process.exit(fail ? 1 : 0);

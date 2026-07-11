/**
 * Servidor multijugador de VoxelCraft: un ÚNICO mundo global, autoritativo
 * para bloques, hora, clima y mobs. Corre la lógica REAL del juego — los
 * mismos módulos ES del navegador (worldgen, world, mobs, clima), que las
 * suites de test/ ya ejecutan en Node.
 *
 * Arranque:   cd server && npm install && npm start
 * Config:     VC_PUERTO (7777), VC_SEMILLA (solo cuenta al crear el mundo)
 *             y VC_DATOS (carpeta de datos compartida con la API PHP).
 * Identidad:  token HMAC de api/token.php; el secreto compartido vive en
 *             <xampp>/saves/voxelcraft/secreto.clave (lo crea PHP).
 * Persistencia: <xampp>/saves/voxelcraft/mundo-global.json.gz — chunks
 *             editados en RLE (formato de storage.js), hora y clima; se
 *             guarda cada minuto si hay cambios y al apagar con Ctrl+C.
 *
 * Simulación de mobs: un MobSystem por jugador conectado (su «dominio»),
 * con el mundo compartido. Cada dominio aparece/persigue alrededor de su
 * jugador con la IA real; todos los mobs se difunden a todos los clientes.
 * La densidad escala con los jugadores (como el tope por región de MC).
 */
import { WebSocketServer } from 'ws';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { World, CHUNK, rleEncode, rleDecode, chunkKey } from '../js/world.js';
import { WORLD_HEIGHT } from '../js/dimensiones.js';
import { DEFS } from '../js/blocks.js';
import { Generator } from '../js/worldgen.js';
import { MobSystem } from '../js/mobs.js';
import { MOBS } from '../js/mobs/registry.js';
import { ClimaSystem } from '../js/clima.js';
import { activarFluidos, tickFluidos } from '../js/fluidos.js';

/* ---- Configuración ---- */

const PUERTO = parseInt(process.env.VC_PUERTO || '7777', 10);
const TICK_MS = 50;            // simulación a 20 Hz
const DIFUSION_CADA = 2;       // estado a los clientes cada 2 ticks (10 Hz)
const DAY_LENGTH = 600;        // s por ciclo día/noche (igual que main.js)
const RADIO_CHUNKS = 2;        // anillo generado alrededor de cada jugador
const GENERADOS_POR_TICK = 6;  // presupuesto de generación por tick
const GUARDAR_CADA_MS = 60000;
const MAX_JUGADORES = 32;

const __dir = path.dirname(fileURLToPath(import.meta.url));
// server/ vive en <xampp>/htdocs/Minecraft/server → tres niveles arriba es
// la raíz de XAMPP; el secreto y el mundo comparten carpeta con las partidas.
// Fuera de XAMPP (p. ej. un hosting Linux donde ../../.. no es escribible)
// VC_DATOS fija la carpeta; debe ser LA MISMA que use la API PHP, porque
// ambos leen el secreto de los tokens de ahí.
const CARPETA = process.env.VC_DATOS || path.resolve(__dir, '..', '..', '..', 'saves', 'voxelcraft');
const RUTA_MUNDO = path.join(CARPETA, 'mundo-global.json.gz');
const RUTA_SECRETO = path.join(CARPETA, 'secreto.clave');

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ---- Secreto compartido y verificación de tokens ---- */

try {
    mkdirSync(CARPETA, { recursive: true });
} catch (e) {
    // ruta heredada del esquema XAMPP: en otros despliegues suele no ser
    // escribible — mejor una receta clara que un stack trace
    console.error(`No se pudo crear la carpeta de datos ${CARPETA} (${e.code}).`);
    console.error('Opciones: crea esa carpeta con permisos de escritura para este usuario,');
    console.error('o arranca con VC_DATOS=/ruta/escribible node multijugador.mjs');
    console.error('(la MISMA carpeta que use la API PHP: comparten secreto.clave).');
    process.exit(1);
}
if (!existsSync(RUTA_SECRETO)) {
    // normalmente lo crea PHP; si el servidor arranca primero, lo crea él
    const { randomBytes } = await import('node:crypto');
    writeFileSync(RUTA_SECRETO, randomBytes(32).toString('hex'));
}
const SECRETO = readFileSync(RUTA_SECRETO, 'utf8').trim();

/** Verifica "id.alias.exp.firma" y devuelve {id, alias} o null. */
function verificarToken(token) {
    const partes = String(token || '').split('.');
    if (partes.length !== 4) return null;
    const [id, alias, exp, firma] = partes;
    if (!/^[0-9]+$/.test(id) || !/^[A-Za-z0-9_]{3,16}$/.test(alias)) return null;
    if (parseInt(exp, 10) < Date.now() / 1000) return null;
    const esperada = createHmac('sha256', SECRETO).update(`${id}.${alias}.${exp}`).digest('hex');
    const a = Buffer.from(firma, 'utf8'), b = Buffer.from(esperada, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { id: parseInt(id, 10), alias };
}

/* ---- Mundo global ---- */

let semilla = parseInt(process.env.VC_SEMILLA || '0', 10) ||
    Math.floor(Math.random() * 2147483646) + 1;
let hora = 0;         // timeOfDay 0..1
let diaN = 0;
let sucio = false;    // ¿hay cambios sin guardar?

const clima = new ClimaSystem();
const mundo = new World();
const generador = { g: null, de: 0 };

function generar(cx, cz) {
    if (!generador.g || generador.de !== semilla) {
        generador.g = new Generator(semilla);
        generador.de = semilla;
    }
    mundo.addChunk(cx, cz, generador.g.generateChunk(cx, cz));
}

/** Curva de luz diurna 0.22..1 (misma que el cielo en main.js). */
const dayFactor = () => {
    const raw = Math.cos(hora * Math.PI * 2);
    return Math.min(Math.max((raw + 0.7) / 1.4, 0.22), 1);
};

function cargarMundo() {
    if (!existsSync(RUTA_MUNDO)) {
        log(`Mundo nuevo (semilla ${semilla})`);
        return;
    }
    const datos = JSON.parse(gunzipSync(readFileSync(RUTA_MUNDO)).toString('utf8'));
    semilla = datos.semilla;
    hora = datos.hora || 0;
    diaN = datos.diaN || 0;
    if (datos.clima && datos.clima.estado) clima.forzar(datos.clima.estado);
    const size = CHUNK * WORLD_HEIGHT * CHUNK;
    let n = 0;
    for (const [key, b64] of Object.entries(datos.chunks || {})) {
        const [cx, cz] = key.split(',').map(Number);
        const rle = new Uint16Array(new Uint8Array(Buffer.from(b64, 'base64')).buffer);
        mundo.addChunk(cx, cz, rleDecode(rle, size), true);
        n++;
    }
    log(`Mundo cargado: semilla ${semilla}, ${n} chunks editados, día ${diaN}`);
}

function guardarMundo() {
    if (!sucio) return;
    const chunks = {};
    for (const [key, c] of mundo.chunks) {
        if (!c.modified) continue;
        const rle = rleEncode(c.blocks.aplanar());
        chunks[key] = Buffer.from(rle.buffer, rle.byteOffset, rle.byteLength).toString('base64');
    }
    const json = JSON.stringify({ semilla, hora, diaN, clima: clima.toJSON(), chunks });
    writeFileSync(RUTA_MUNDO + '.tmp', gzipSync(json));
    renameSync(RUTA_MUNDO + '.tmp', RUTA_MUNDO);
    sucio = false;
    log(`Mundo guardado (${Object.keys(chunks).length} chunks editados)`);
}

/* ---- Jugadores y mobs ---- */

let cidSiguiente = 1;
let mobIdSiguiente = 1;
const jugadores = new Map(); // cid → jugador

/** Ediciones de bloques pendientes de difundir: [x,y,z,id,cidOrigen]. */
let ediciones = [];
mundo.onSet = (x, y, z, id) => {
    sucio = true;
    // el origen se anota en el momento de aplicar (aplicandoDe); las
    // ediciones del propio servidor (explosiones de mobs) llevan origen 0
    ediciones.push([x, y, z, id, aplicandoDe]);
};
let aplicandoDe = 0;

function crearDominio(jug) {
    const hooks = {
        // los eventos sonoros/visuales viajan como 'mobevt' y cada cliente
        // decide volumen y partículas según su distancia (como en local)
        sound: (kind, m) => {
            if (kind === 'say' || kind === 'hurt' || kind === 'death' || kind === 'fuse' || kind === 'shoot') {
                difundir({ t: 'mobevt', e: kind, id: idDeMob(m), tipo: m.def.id, p: redondear(m.pos) });
            }
        },
        damagePlayer: (dmg, dir) => enviar(jug, { t: 'dano', dmg, dir }),
        explosion: (pos, r) => {
            // la esfera de bloques la aplica explodeAt vía mundo.set (onSet
            // la difunde); aquí solo viaja el estampido audiovisual
            if (pos) difundir({ t: 'explosion', p: redondear(pos), r: r || 3 });
        },
        drop: (id, x, y, z) => {
            // el botín va al dueño del golpe (o del dominio si murió solo)
            const destino = jug.ultimoBotin && jugadores.has(jug.ultimoBotin.cid) && jug.ultimoBotin.hasta > Date.now()
                ? jugadores.get(jug.ultimoBotin.cid) : jug;
            enviar(destino, { t: 'botin', id, p: [x, y, z] });
        },
        particles: () => {},
    };
    const sys = new MobSystem(MOBS, mundo, hooks, semilla + jug.cid);
    return { sys, conocidos: new Map() }; // id → mob difundido
}

const idsDeMobs = new WeakMap();
function idDeMob(m) {
    let id = idsDeMobs.get(m);
    if (!id) { id = mobIdSiguiente++; idsDeMobs.set(m, id); }
    return id;
}

const redondear = (p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100, Math.round(p[2] * 100) / 100];

/** Chunks del anillo del jugador aún no generados. */
function chunksQueFaltan(jug) {
    const faltan = [];
    const pcx = Math.floor(jug.pos[0]) >> 4, pcz = Math.floor(jug.pos[2]) >> 4;
    for (let dx = -RADIO_CHUNKS; dx <= RADIO_CHUNKS; dx++) {
        for (let dz = -RADIO_CHUNKS; dz <= RADIO_CHUNKS; dz++) {
            if (!mundo.chunks.has(chunkKey(pcx + dx, pcz + dz))) faltan.push([pcx + dx, pcz + dz]);
        }
    }
    return faltan;
}

/* ---- Protocolo ---- */

function enviar(jug, msj) {
    if (jug.ws.readyState === 1) jug.ws.send(JSON.stringify(msj));
}

function difundir(msj, salvoCid = 0) {
    const texto = JSON.stringify(msj);
    for (const j of jugadores.values()) {
        if (j.cid !== salvoCid && j.ws.readyState === 1) j.ws.send(texto);
    }
}

/** Instantánea de los chunks editados (RLE base64, formato de storage.js). */
function chunksEditados() {
    const out = {};
    for (const [key, c] of mundo.chunks) {
        if (!c.modified) continue;
        const rle = rleEncode(c.blocks.aplanar());
        out[key] = Buffer.from(rle.buffer, rle.byteOffset, rle.byteLength).toString('base64');
    }
    return out;
}

function listaMobs() {
    const lista = [];
    for (const j of jugadores.values()) {
        for (const m of j.dominio.sys.mobs) {
            lista.push({ id: idDeMob(m), tipo: m.def.id, p: redondear(m.pos), yaw: m.yaw });
        }
    }
    return lista;
}

function conectar(ws, credencial) {
    if (jugadores.size >= MAX_JUGADORES) {
        ws.send(JSON.stringify({ t: 'error', msj: 'Servidor lleno.' }));
        ws.close();
        return;
    }
    const cid = cidSiguiente++;
    // aparición: superficie cerca del origen, en anillo por orden de llegada
    const ang = cid * 2.4, radio = 2 + (cid % 5) * 2;
    const sx = Math.floor(Math.cos(ang) * radio), sz = Math.floor(Math.sin(ang) * radio);
    for (const [cx, cz] of [[sx >> 4, sz >> 4], [0, 0]]) {
        if (!mundo.chunks.has(chunkKey(cx, cz))) generar(cx, cz);
    }
    const sy = mundo.surfaceY(sx, sz) + 1;
    const jug = {
        cid, usuarioId: credencial.id, alias: credencial.alias, ws,
        pos: [sx + 0.5, sy, sz + 0.5], yaw: 0, pitch: 0,
        dominio: null, ultimoBotin: null,
        tasaBloques: 0, tasaChat: 0, // presupuesto por segundo (anti-abuso)
    };
    jug.dominio = crearDominio(jug);
    jugadores.set(cid, jug);

    enviar(jug, {
        t: 'bienvenida', cid, semilla, hora, diaN, clima: clima.toJSON(),
        p: jug.pos,
        jugadores: [...jugadores.values()].filter((j) => j.cid !== cid)
            .map((j) => ({ cid: j.cid, alias: j.alias, p: redondear(j.pos), yaw: j.yaw })),
        chunks: chunksEditados(),
        mobs: listaMobs(),
    });
    difundir({ t: 'entra', cid, alias: jug.alias, p: redondear(jug.pos), yaw: 0 }, cid);
    log(`Entra ${jug.alias} (usuario ${jug.usuarioId}, conexión ${cid}); en línea: ${jugadores.size}`);
    return jug;
}

function desconectar(jug) {
    if (!jugadores.has(jug.cid)) return;
    // los mobs de su dominio se despiden con él
    const bajas = [...jug.dominio.conocidos.keys()];
    jugadores.delete(jug.cid);
    if (bajas.length) difundir({ t: 'mob-', ids: bajas });
    difundir({ t: 'sale', cid: jug.cid });
    log(`Sale ${jug.alias}; en línea: ${jugadores.size}`);
}

function procesar(jug, msj) {
    switch (msj.t) {
        case 'pos': {
            const p = msj.p;
            if (!Array.isArray(p) || p.length !== 3 || p.some((v) => typeof v !== 'number' || !isFinite(v))) return;
            if (Math.abs(p[0]) > 1e7 || Math.abs(p[2]) > 1e7) return;
            jug.pos = [p[0], p[1], p[2]];
            jug.yaw = +msj.yaw || 0;
            jug.pitch = +msj.pitch || 0;
            break;
        }
        case 'bloque': {
            if (jug.tasaBloques++ > 40) return; // se repone cada segundo
            const { x, y, z, id } = msj;
            if (![x, y, z, id].every(Number.isInteger)) return;
            if (y < 0 || y >= mundo.sy || id < 0 || id >= DEFS.length) return;
            if (Math.hypot(x - jug.pos[0], z - jug.pos[2]) > 64) return; // fuera de alcance
            aplicandoDe = jug.cid;
            mundo.set(x, y, z, id);
            aplicandoDe = 0;
            break;
        }
        case 'chat': {
            if (jug.tasaChat++ > 2) return;
            const texto = String(msj.texto || '').trim().slice(0, 200);
            if (texto) difundir({ t: 'chat', alias: jug.alias, texto });
            break;
        }
        case 'golpe': {
            const dmg = Math.min(Math.max(+msj.dmg || 4, 1), 8);
            const dir = Array.isArray(msj.dir) && msj.dir.length === 3 ? msj.dir.map((v) => Math.max(-1, Math.min(1, +v || 0))) : [0, 0, 0];
            for (const j of jugadores.values()) {
                const m = j.dominio.conocidos.get(msj.id);
                if (!m) continue;
                if (Math.hypot(m.pos[0] - jug.pos[0], m.pos[1] - jug.pos[1], m.pos[2] - jug.pos[2]) > 8) return;
                j.ultimoBotin = { cid: jug.cid, hasta: Date.now() + 3000 };
                j.dominio.sys.hurt(m, dmg, dir);
                return;
            }
            break;
        }
    }
}

/* ---- Bucle de simulación ---- */

let nTick = 0;
function tick() {
    const dt = TICK_MS / 1000;
    nTick++;

    // hora y clima del mundo, compartidos por todos
    const horaPrev = hora;
    hora = (hora + dt / DAY_LENGTH) % 1;
    if (hora < horaPrev) diaN++;
    const climaPrev = clima.estado;
    clima.update(dt);
    if (clima.estado !== climaPrev) {
        difundir({ t: 'clima', estado: clima.estado });
        sucio = true;
    }

    // fluidos: el servidor es el único que simula en el mundo global; sus
    // ediciones salen a todos los clientes por el gancho onSet, como las demás
    tickFluidos(mundo, dt);

    // terreno bajo demanda alrededor de cada jugador (con presupuesto)
    let presupuesto = GENERADOS_POR_TICK;
    for (const jug of jugadores.values()) {
        if (presupuesto <= 0) break;
        for (const [cx, cz] of chunksQueFaltan(jug)) {
            generar(cx, cz);
            if (--presupuesto <= 0) break;
        }
        // presupuestos anti-abuso: se reponen 20 veces por segundo
        jug.tasaBloques = Math.max(0, jug.tasaBloques - 2);
        jug.tasaChat = Math.max(0, jug.tasaChat - 0.1);
    }

    // mobs: cada dominio simula con la IA real alrededor de su jugador
    for (const jug of jugadores.values()) {
        const { sys, conocidos } = jug.dominio;
        sys.update(dt, {
            pos: jug.pos,
            eye: [jug.pos[0], jug.pos[1] + 1.6, jug.pos[2]],
            look: [-Math.sin(jug.yaw), 0, -Math.cos(jug.yaw)],
            day: dayFactor(),
            creative: false,
            peaceful: false,
        });
        // altas y bajas respecto a lo ya difundido
        const vivos = new Set();
        const altas = [];
        for (const m of sys.mobs) {
            const id = idDeMob(m);
            vivos.add(id);
            if (!conocidos.has(id)) {
                conocidos.set(id, m);
                altas.push({ id, tipo: m.def.id, p: redondear(m.pos), yaw: m.yaw });
            }
        }
        const bajas = [];
        for (const id of conocidos.keys()) {
            if (!vivos.has(id)) { conocidos.delete(id); bajas.push(id); }
        }
        if (altas.length) difundir({ t: 'mob+', mobs: altas });
        if (bajas.length) difundir({ t: 'mob-', ids: bajas });
    }

    // difusión de estado a 10 Hz: jugadores, mobs, flechas y ediciones
    if (nTick % DIFUSION_CADA === 0) {
        if (ediciones.length) {
            // cada cliente recibe las ediciones ajenas (las suyas ya las aplicó)
            for (const j of jugadores.values()) {
                const ajenas = ediciones.filter((e) => e[4] !== j.cid).map((e) => e.slice(0, 4));
                if (ajenas.length) enviar(j, { t: 'bloques', l: ajenas });
            }
            ediciones = [];
        }
        const js = [...jugadores.values()].map((j) => [j.cid, ...redondear(j.pos), Math.round(j.yaw * 100) / 100, Math.round(j.pitch * 100) / 100]);
        const ms = [], fs = [];
        for (const j of jugadores.values()) {
            for (const [id, m] of j.dominio.conocidos) {
                ms.push([id, ...redondear(m.pos), Math.round(m.yaw * 100) / 100,
                    Math.round((m.headYaw || m.yaw) * 100) / 100,
                    Math.round((m.animSpeed || 0) * 10) / 10,
                    m.hurtT > 0 ? 1 : 0, m.fuseT >= 0 ? Math.round(m.fuseT * 10) / 10 : -1]);
            }
            for (const a of j.dominio.sys.arrows) {
                fs.push([...redondear(a.pos), ...redondear(a.vel)]);
            }
        }
        difundir({ t: 'estado', hora: Math.round(hora * 1e5) / 1e5, diaN, j: js, m: ms, f: fs });
    }
}

/* ---- Arranque ---- */

activarFluidos(mundo); // antes de cargar: las ediciones que despierten líquidos ya encolan
cargarMundo();
generar(0, 0); // el punto de aparición existe desde el minuto cero

const wss = new WebSocketServer({ port: PUERTO });
wss.on('connection', (ws) => {
    let jug = null;
    const guardia = setTimeout(() => { if (!jug) ws.close(); }, 5000);
    ws.on('message', (crudo) => {
        let msj;
        try { msj = JSON.parse(crudo.toString()); } catch (e) { return; }
        if (!jug) {
            if (msj.t !== 'hola') return;
            const credencial = verificarToken(msj.token);
            if (!credencial) {
                ws.send(JSON.stringify({ t: 'error', msj: 'Identidad no válida: vuelve a entrar.' }));
                ws.close();
                return;
            }
            clearTimeout(guardia);
            jug = conectar(ws, credencial);
            return;
        }
        try { procesar(jug, msj); } catch (e) { log(`Error procesando ${msj.t} de ${jug.alias}:`, e.message); }
    });
    ws.on('close', () => { clearTimeout(guardia); if (jug) desconectar(jug); });
    ws.on('error', () => {});
});

setInterval(tick, TICK_MS);
setInterval(guardarMundo, GUARDAR_CADA_MS);
process.on('SIGINT', () => {
    log('Apagando: guardando el mundo…');
    try { guardarMundo(); } catch (e) { log('Error al guardar:', e.message); }
    process.exit(0);
});

log(`Servidor multijugador en ws://localhost:${PUERTO} (semilla ${semilla})`);

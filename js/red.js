/**
 * Cliente del multijugador: WebSocket contra server/multijugador.mjs.
 *
 * El servidor es la autoridad de bloques, hora, clima y mobs. Este módulo
 * mantiene las entidades-sombra (jugadores y mobs remotos interpolados a
 * partir del estado a 10 Hz) y expone MobsRemotos, una fachada con la parte
 * de la API de MobSystem que usa el bucle de main.js — así el resto del
 * juego no distingue entre mobs locales y remotos.
 */
import { JugadorRemoto } from './avatar.js';
import { MOBS } from './mobs/registry.js';
import { chunkKey } from './world.js';

/** Mob remoto: forma mínima que mobrender espera (ver JugadorRemoto). */
class MobRemoto {
    constructor(id, def, p, yaw) {
        this.id = id;
        this.def = def;
        this.pos = [...p];
        this.destino = [...p];
        this.yaw = yaw || 0;
        this.destinoYaw = this.yaw;
        this.headYaw = this.yaw;
        this.animPhase = 0;
        this.animSpeed = 0;
        this.hurtT = 0;
        this.fuseT = -1;
    }

    /** El renderer lo consulta; la muerte remota llega como baja ('mob-'). */
    dying() { return false; }

    update(dt) {
        const dx = this.destino[0] - this.pos[0];
        const dy = this.destino[1] - this.pos[1];
        const dz = this.destino[2] - this.pos[2];
        const d = Math.hypot(dx, dy, dz);
        if (d > 8) {
            this.pos = [...this.destino];
        } else {
            const k = Math.min(1, dt * 12);
            this.pos[0] += dx * k; this.pos[1] += dy * k; this.pos[2] += dz * k;
        }
        this.animPhase += this.animSpeed * dt * 6;
        let dyaw = this.destinoYaw - this.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        this.yaw += dyaw * Math.min(1, dt * 10);
        if (this.hurtT > 0) this.hurtT -= dt;
    }
}

/**
 * Fachada de MobSystem para el modo multijugador: main.js llama update,
 * raycastMob, hurt, explodeAt, spawnAt, count y lee .mobs y .arrows.
 */
export class MobsRemotos {
    constructor(red) {
        this.red = red;
        this.porId = new Map();  // id de red → MobRemoto
        this.mobs = [];          // vista para el renderer (se reconstruye)
        this.arrows = [];
    }

    count() { return this.mobs.length; }

    update(dt) {
        for (const m of this.porId.values()) m.update(dt);
    }

    /** Prueba rayo-AABB contra los mobs remotos (mismo contrato que local). */
    raycastMob(eye, dir, reach) {
        let mejor = null, mejorT = reach;
        for (const m of this.porId.values()) {
            const r = m.def.aabb.w / 2, h = m.def.aabb.h;
            let t0 = 0, t1 = mejorT, ok = true;
            const min = [m.pos[0] - r, m.pos[1], m.pos[2] - r];
            const max = [m.pos[0] + r, m.pos[1] + h, m.pos[2] + r];
            for (let i = 0; i < 3 && ok; i++) {
                if (Math.abs(dir[i]) < 1e-9) {
                    if (eye[i] < min[i] || eye[i] > max[i]) ok = false;
                    continue;
                }
                let a = (min[i] - eye[i]) / dir[i], b = (max[i] - eye[i]) / dir[i];
                if (a > b) [a, b] = [b, a];
                t0 = Math.max(t0, a); t1 = Math.min(t1, b);
                if (t0 > t1) ok = false;
            }
            if (ok && t0 < mejorT) { mejorT = t0; mejor = m; }
        }
        return mejor ? { mob: mejor, t: mejorT } : null;
    }

    /** El golpe viaja al servidor; la reacción visible vuelve por estado. */
    hurt(m, dmg, dir) {
        m.hurtT = 0.4; // respuesta inmediata local; el servidor confirma
        this.red.enviar({ t: 'golpe', id: m.id, dmg, dir: [dir[0], dir[1], dir[2]] });
    }

    // en multijugador las explosiones del cliente solo rompen terreno (las
    // ediciones viajan por onSet); el daño a mobs es del servidor
    explodeAt() {}
    spawnAt() { return null; }

    /* ---- Mantenimiento desde los mensajes de red ---- */

    alta(id, tipo, p, yaw) {
        const def = MOBS[tipo];
        if (!def || this.porId.has(id)) return;
        this.porId.set(id, new MobRemoto(id, def, p, yaw));
        this.rehacer();
    }

    baja(ids) {
        for (const id of ids) this.porId.delete(id);
        this.rehacer();
    }

    estado(ms, fs) {
        for (const [id, x, y, z, yaw, headYaw, animSpeed, herido, fuse] of ms) {
            const m = this.porId.get(id);
            if (!m) continue;
            m.destino[0] = x; m.destino[1] = y; m.destino[2] = z;
            m.destinoYaw = yaw;
            m.headYaw = headYaw;
            m.animSpeed = animSpeed;
            if (herido && m.hurtT <= 0) m.hurtT = 0.35;
            m.fuseT = fuse;
        }
        this.arrows = fs.map(([x, y, z, vx, vy, vz]) => ({ pos: [x, y, z], vel: [vx, vy, vz] }));
    }

    rehacer() { this.mobs = [...this.porId.values()]; }
}

export class RedCliente {
    constructor() {
        this.ws = null;
        this.activo = false;
        this.cid = 0;
        this.hora = 0;
        this.diaN = 0;
        this.jugadores = new Map();      // cid → JugadorRemoto
        this.mobs = new MobsRemotos(this);
        this.mundo = null;               // se fija al crear el mundo local
        this.pendientes = new Map();     // chunk aún no cargado → ediciones
        this.aplicando = false;          // evita el eco al aplicar remotas
        // callbacks que main.js rellena (todos opcionales)
        this.onChat = null; this.onDano = null; this.onBotin = null;
        this.onMobEvt = null; this.onExplosion = null; this.onClima = null;
        this.onEntra = null; this.onSale = null; this.onCaida = null;
    }

    /** Conecta y resuelve con el mensaje de bienvenida del servidor. */
    conectar(url, token) {
        return new Promise((resolve, reject) => {
            let listo = false;
            const ws = new WebSocket(url);
            this.ws = ws;
            ws.onopen = () => ws.send(JSON.stringify({ t: 'hola', token }));
            ws.onmessage = (e) => {
                let msj;
                try { msj = JSON.parse(e.data); } catch (err) { return; }
                if (!listo) {
                    if (msj.t === 'bienvenida') {
                        listo = true;
                        this.activo = true;
                        this.cid = msj.cid;
                        this.hora = msj.hora;
                        this.diaN = msj.diaN;
                        for (const j of msj.jugadores) {
                            this.jugadores.set(j.cid, new JugadorRemoto(j.cid, j.alias, j.p, j.yaw));
                        }
                        for (const m of msj.mobs) this.mobs.alta(m.id, m.tipo, m.p, m.yaw);
                        resolve(msj);
                    } else if (msj.t === 'error') {
                        reject(new Error(msj.msj));
                    }
                    return;
                }
                this.recibir(msj);
            };
            ws.onerror = () => { if (!listo) reject(new Error('No se pudo conectar con el servidor multijugador.')); };
            ws.onclose = () => {
                const estaba = this.activo;
                this.activo = false;
                this.limpiar(); // los mobs y jugadores remotos se van con la conexión
                if (!listo) reject(new Error('No se pudo conectar con el servidor multijugador.'));
                else if (estaba && this.onCaida) this.onCaida();
            };
        });
    }

    cerrar() {
        this.activo = false;
        this.limpiar();
        if (this.ws) { try { this.ws.close(); } catch (e) { /* ya cerrado */ } }
    }

    /** Olvida todas las entidades remotas (al cerrar o caer la conexión). */
    limpiar() {
        this.jugadores.clear();
        this.mobs.porId.clear();
        this.mobs.rehacer();
        this.mobs.arrows = [];
        this.pendientes.clear();
    }

    enviar(msj) {
        if (this.activo && this.ws.readyState === 1) this.ws.send(JSON.stringify(msj));
    }

    enviarPos(pos, yaw, pitch) {
        this.enviar({ t: 'pos', p: [pos[0], pos[1], pos[2]], yaw, pitch });
    }

    /** Gancho de world.onSet: difunde las ediciones locales del jugador. */
    enviarBloque(x, y, z, id) {
        if (!this.aplicando) this.enviar({ t: 'bloque', x, y, z, id });
    }

    enviarChat(texto) {
        this.enviar({ t: 'chat', texto });
    }

    recibir(msj) {
        switch (msj.t) {
            case 'estado': {
                this.hora = msj.hora;
                this.diaN = msj.diaN;
                for (const [cid, x, y, z, yaw, pitch] of msj.j) {
                    if (cid === this.cid) continue;
                    const j = this.jugadores.get(cid);
                    if (j) j.fijar([x, y, z], yaw, pitch);
                }
                this.mobs.estado(msj.m, msj.f);
                break;
            }
            case 'bloques':
                for (const [x, y, z, id] of msj.l) this.aplicarBloque(x, y, z, id);
                break;
            case 'entra': {
                const j = new JugadorRemoto(msj.cid, msj.alias, msj.p, msj.yaw);
                this.jugadores.set(msj.cid, j);
                if (this.onEntra) this.onEntra(msj.alias);
                break;
            }
            case 'sale': {
                const j = this.jugadores.get(msj.cid);
                this.jugadores.delete(msj.cid);
                if (j && this.onSale) this.onSale(j.alias);
                break;
            }
            case 'chat': if (this.onChat) this.onChat(msj.alias, msj.texto); break;
            case 'dano': if (this.onDano) this.onDano(msj.dmg, msj.dir); break;
            case 'botin': if (this.onBotin) this.onBotin(msj.id, msj.p); break;
            case 'mob+': for (const m of msj.mobs) this.mobs.alta(m.id, m.tipo, m.p, m.yaw); break;
            case 'mob-': this.mobs.baja(msj.ids); break;
            case 'mobevt': if (this.onMobEvt) this.onMobEvt(msj.e, msj.tipo, msj.id, msj.p); break;
            case 'explosion': if (this.onExplosion) this.onExplosion(msj.p, msj.r); break;
            case 'clima': if (this.onClima) this.onClima(msj.estado); break;
        }
    }

    /**
     * Aplica una edición remota: directa si el chunk está cargado; si aún
     * no se generó localmente, queda pendiente hasta que llegue del worker.
     */
    aplicarBloque(x, y, z, id) {
        if (!this.mundo) return;
        const key = chunkKey(x >> 4, z >> 4);
        if (!this.mundo.chunks.has(key)) {
            if (!this.pendientes.has(key)) this.pendientes.set(key, []);
            this.pendientes.get(key).push([x, y, z, id]);
            return;
        }
        this.aplicando = true;
        this.mundo.set(x, y, z, id);
        this.aplicando = false;
    }

    /** Llamado tras añadir un chunk del worker: vuelca sus pendientes. */
    aplicarPendientes(cx, cz) {
        const lista = this.pendientes.get(chunkKey(cx, cz));
        if (!lista || !this.mundo) return;
        this.pendientes.delete(chunkKey(cx, cz));
        this.aplicando = true;
        for (const [x, y, z, id] of lista) this.mundo.set(x, y, z, id);
        this.aplicando = false;
    }

    /** Actualiza la interpolación de todas las entidades remotas. */
    update(dt) {
        for (const j of this.jugadores.values()) j.update(dt);
        this.mobs.update(dt);
    }
}

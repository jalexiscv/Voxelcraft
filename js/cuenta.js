/**
 * Cliente de la API de cuentas (api/*.php): registro, sesión y partida en
 * línea. Todas las funciones lanzan Error con un mensaje en español apto
 * para mostrar tal cual en el menú.
 *
 * La partida viaja comprimida con gzip (CompressionStream) para esquivar el
 * límite de paquete de MySQL y ahorrar espacio; si el navegador no lo
 * soporta se sube JSON plano con la cabecera 'X-Comprimido: no'.
 */

const API = './api';

async function llamar(ruta, opciones = {}) {
    let resp;
    try {
        resp = await fetch(`${API}/${ruta}`, { credentials: 'same-origin', ...opciones });
    } catch (e) {
        throw new Error('Sin conexión con el servidor.');
    }
    const datos = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error((datos && datos.error) || `Error del servidor (${resp.status}).`);
    return datos;
}

/** {usuario, partida} de la sesión activa ({usuario: null} si no hay). */
export function sesionActual() {
    return llamar('sesion.php');
}

/** Crea la cuenta e inicia sesión. Devuelve el usuario. */
export async function registrar(alias, email, clave) {
    const r = await llamar('registro.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, email, clave }),
    });
    return r.usuario;
}

/** Inicia sesión con alias o email. Devuelve el usuario. */
export async function entrar(usuario, clave) {
    const r = await llamar('login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
    });
    return r.usuario;
}

export function salir() {
    return llamar('logout.php', { method: 'POST' });
}

/**
 * Pide un código de recuperación al correo. Devuelve {mensaje}; el texto es
 * el mismo exista o no la cuenta (el servidor no lo revela).
 */
export function solicitarCodigo(email) {
    return llamar('recuperacion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'solicitar', email }),
    });
}

/** Cambia la contraseña con el código recibido. Devuelve {mensaje}. */
export function restablecerClave(email, codigo, clave) {
    return llamar('recuperacion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'restablecer', email, codigo, clave }),
    });
}

/** Token firmado para el servidor multijugador (caduca en 5 min). */
export async function token() {
    return (await llamar('token.php')).token;
}

/* ---- Compresión (gzip) del guardado ---- */

async function gzip(texto) {
    const flujo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(flujo).arrayBuffer();
}

async function gunzip(buffer) {
    const flujo = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(flujo).text();
}

const hayGzip = typeof CompressionStream !== 'undefined';

/**
 * Sube la partida exportada (objeto de storage.exportSave). `guardadoEn` es
 * el sello savedAt en ms. Devuelve {bytes, guardadoEn} del servidor.
 */
export async function subirPartida(guardado, guardadoEn) {
    const json = JSON.stringify(guardado);
    const cuerpo = hayGzip ? await gzip(json) : json;
    return llamar('partida.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Comprimido': hayGzip ? 'si' : 'no',
            'X-Guardado-En': String(guardadoEn || 0),
        },
        body: cuerpo,
    });
}

/** Baja la partida en línea como objeto, o null si no hay ninguna. */
export async function bajarPartida() {
    let resp;
    try {
        resp = await fetch(`${API}/partida.php`, { credentials: 'same-origin' });
    } catch (e) {
        throw new Error('Sin conexión con el servidor.');
    }
    if (resp.status === 404) return null;
    if (!resp.ok) {
        const datos = await resp.json().catch(() => null);
        throw new Error((datos && datos.error) || `Error del servidor (${resp.status}).`);
    }
    const comprimido = (resp.headers.get('X-Comprimido') || 'si') !== 'no';
    const crudo = await resp.arrayBuffer();
    const json = comprimido ? await gunzip(crudo) : new TextDecoder().decode(crudo);
    return JSON.parse(json);
}

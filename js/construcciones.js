/**
 * Construcciones prediseñadas de la consola: el comando /construir levanta
 * frente al jugador cualquiera de los planos de aldea (js/villages/planos/),
 * con la fachada —y su puerta— mirando hacia él y la paleta del bioma en el
 * que está. Módulo puro (sin DOM, probable en Node): la colocación es
 * aritmética y el estampado escribe a través de un callback set(x, y, z, id)
 * que main.js conecta al mundo vivo.
 *
 * Reutiliza las piezas reales del sistema de aldeas: los planos y su
 * contrato (villages/model.js), la caja rotada (cajaDePieza), la tabla de
 * rotación (localDe) y el cultivo posicional (bloqueCultivo). El bucle de
 * estampado replica el de villages/build.js (relleno, corte de aire y
 * puertas de dos hojas) sobre un mundo vivo en vez del buffer de un chunk
 * en generación: duplicación deliberada, porque aquel escribe por índice
 * local de chunk con costura orden-independiente y este por coordenadas de
 * mundo.
 */
import { B } from './blocks.js';
import { WORLD_HEIGHT } from './dimensiones.js';
import { ROLES_POSICIONALES, resolverBloque } from './villages/model.js';
import { cajaDePieza } from './villages/layout.js';
import { PLANOS, LISTA_PLANOS, PLANOS_CONSOLA } from './villages/planos/registry.js';
import { bloqueCultivo, localDe, RELLENO } from './villages/build.js';

/** Nombre visible de cada plano (los ids del registro van sin acentos). */
const NOMBRES = {
    pozo: 'Pozo', casa_pequena: 'Casa pequeña', casa_grande: 'Casa grande',
    granja: 'Granja', herreria: 'Herrería', biblioteca: 'Biblioteca',
    templo: 'Templo', atalaya: 'Atalaya', torres: 'Torres',
};

/** Catálogo de la consola: los planos de aldea más los exclusivos de la
 *  consola (PLANOS_CONSOLA: fuera del worldgen), con su nombre visible. */
export const CONSTRUCCIONES = [...LISTA_PLANOS, ...PLANOS_CONSOLA.map((id) => PLANOS[id])]
    .map((p) => ({ id: p.id, nombre: NOMBRES[p.id] || p.id, tam: p.tam }));

/** Separación entre el jugador y el borde de fachada de la construcción. */
const SEPARACION = 2;

/**
 * Coloca el plano frente al jugador: pieza (misma forma que las de aldea)
 * y caja [x0, z0, x1, z1] con el borde de la fachada a SEPARACION bloques
 * en la dirección `mirando` (cardinal [dx, dz]) y centrada lateralmente.
 * La fachada queda mirando HACIA el jugador (rot con DIRECCIONES[rot] =
 * −mirando), así la puerta recibe al que la invocó. `y` es la cota del
 * suelo (el bloque que el jugador pisa): ahí va la capa 0 (cimiento).
 */
export function colocacionDe(idPlano, px, pz, mirando, y) {
    const plano = PLANOS[idPlano];
    const [ancho, , fondo] = plano.tam;
    // DIRECCIONES de layout.js: [−Z, +X, +Z, −X] — fachada opuesta a mirando
    const rot = [[0, 1], [-1, 0], [0, -1], [1, 0]]
        .findIndex(([dx, dz]) => dx === mirando[0] && dz === mirando[1]);
    const fx = (rot % 2) ? fondo : ancho; // huella rotada en mundo
    const fz = (rot % 2) ? ancho : fondo;
    let x0, z0;
    if (mirando[0] === 1)       { x0 = px + SEPARACION;            z0 = pz - (fz >> 1); }
    else if (mirando[0] === -1) { x0 = px - SEPARACION - (fx - 1); z0 = pz - (fz >> 1); }
    else if (mirando[1] === 1)  { z0 = pz + SEPARACION;            x0 = px - (fx >> 1); }
    else                        { z0 = pz - SEPARACION - (fz - 1); x0 = px - (fx >> 1); }
    const pieza = { tipo: 'edificio', id: idPlano, x: x0 + (fx >> 1), z: z0 + (fz >> 1), rot, y };
    return { pieza, caja: cajaDePieza(pieza) };
}

/**
 * Estampa la pieza en el mundo vivo a través de set(x, y, z, id): relleno
 * de DIRT bajo la parcela, corte de aire hasta un bloque sobre el plano,
 * capas rotadas con la paleta del bioma, puertas de dos hojas y cultivos
 * posicionales — las mismas reglas que villages/build.js. Devuelve el alto
 * del plano (para el mensaje de la consola).
 */
export function estampar(pieza, biomaId, semilla, set) {
    const plano = PLANOS[pieza.id];
    const [ancho, alto, fondo] = plano.tam;
    const caja = cajaDePieza(pieza);

    // clave → id de bloque, resuelta una vez con el bioma; los posicionales
    // quedan aparte y se resuelven columna a columna
    const ids = {};
    const posicional = {};
    for (const [ch, valor] of Object.entries(plano.clave)) {
        if (ROLES_POSICIONALES.includes(valor)) posicional[ch] = valor;
        else ids[ch] = resolverBloque(valor, biomaId);
    }

    const yBase = pieza.y;
    const yCorte = Math.min(WORLD_HEIGHT - 1, yBase + alto);
    for (let wx = caja[0]; wx <= caja[2]; wx++) {
        for (let wz = caja[1]; wz <= caja[3]; wz++) {
            for (let y = Math.max(1, yBase - RELLENO); y < yBase; y++) {
                set(wx, y, wz, B.DIRT);
            }
            for (let y = yBase; y <= yCorte; y++) {
                set(wx, y, wz, B.AIR);
            }
            const [lx, lz] = localDe(pieza.rot, wx - caja[0], wz - caja[1], ancho, fondo);
            for (let dy = 0; dy < alto; dy++) {
                const y = yBase + dy;
                if (y >= WORLD_HEIGHT) break;
                const ch = plano.capas[dy][lz][lx];
                if (ch === '.') continue;
                const id = posicional[ch] === 'CULTIVO'
                    ? bloqueCultivo(semilla, wx, wz)
                    : ids[ch];
                if (id === B.DOOR_CLOSED) {
                    const chAbajo = dy > 0 ? plano.capas[dy - 1][lz][lx] : null;
                    if (chAbajo !== null && ids[chAbajo] === B.DOOR_CLOSED) {
                        set(wx, y, wz, B.DOOR_TOP_CLOSED);
                    } else {
                        set(wx, y, wz, B.DOOR_CLOSED);
                        if (y + 1 < WORLD_HEIGHT) set(wx, y + 1, wz, B.DOOR_TOP_CLOSED);
                    }
                    continue;
                }
                set(wx, y, wz, id);
            }
        }
    }
    return alto;
}

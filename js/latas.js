/**
 * Lata de Red Bull (bloque dinámico B.REDBULL): emulación en pixel art
 * procedural de la lata clásica de la bebida energética — cuerpo esbelto de
 * aluminio con los rombos diagonales azul/plata, el emblema de los dos toros
 * rojos frente al sol amarillo y la anilla en la tapa. Como la cámara de
 * vigilancia, el bloque no emite malla en el mesher: su representación en el
 * mundo es una ENTIDAD de partes-caja (contrato de js/mobs/model.js)
 * dibujada por frame con el pipeline de mobrender.
 *
 * La lata NO es inofensiva: al colocarla se arma una MECHA de 10 s
 * (MECHA_S) y al agotarse estalla en una explosión de radio 4 — un cráter
 * circular de área πr² ≈ 50 bloques cuadrados (RADIO_EXPLOSION). Durante
 * la cuenta atrás la lata chisporrotea burbujas de gas (cada vez más
 * deprisa), silba al entrar en los últimos 3 s y parpadea en blanco (el
 * tinte de mecha que mobrender ya aplica a fuseT ≥ 0). Romperla antes de
 * tiempo la DESACTIVA. La mecha vive aquí (update puro con dt); la
 * destrucción, el daño y los efectos los aplica main.js con el pipeline
 * de explosiones de mobs.js.
 *
 * Sin animación de partes: la variedad visual la pone el yaw determinista
 * por celda (yawDeLata, 8 orientaciones), para que una fila de latas no
 * parezca un ejército en formación.
 *
 * El rastreo en chunks cargados (sync/onSet) vive en el registro genérico
 * de bloques dinámicos (js/dinamicos.js).
 *
 * Módulo puro (sin DOM ni WebGL): probable en Node.
 */
import { B } from './blocks.js';
import { RegistroDinamico } from './dinamicos.js';
import { PRNG } from './noise.js';

/* ---- Orientación por posición ---- */

/**
 * Yaw determinista de la lata colocada en (x, y, z): una de 8 orientaciones
 * (múltiplos de 45°) elegida por un hash entero de la celda. Pura: la misma
 * celda produce siempre el mismo giro, en cualquier carga y máquina.
 */
export function yawDeLata(x, y, z) {
    let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
    h = (h ^ (h >> 13)) >>> 0;
    return (h % 8) * (Math.PI / 4);
}

/* ---- Definición del modelo (pseudo-mob de partes-caja) ---- */

// paleta de la lata (diseño propio inspirado en la marca: azul profundo,
// aluminio cepillado, toros rojos y sol amarillo)
const PLATA = [188, 194, 205];
const PLATA_CLARA = [225, 229, 236];
const PLATA_SOMBRA = [148, 154, 166];
const AZUL = [22, 58, 138];
const ROJO = [206, 34, 44];
const AMARILLO = [247, 199, 38];
const AZUL_TEXTO = [26, 44, 96];
const TAPA = [170, 176, 188];
const TAPA_OSCURA = [116, 122, 134];

export const LATA_DEF = {
    id: 'lata',
    name: 'Lata de Red Bull',
    aabb: { w: 0.4, h: 0.75 },  // solo para la muestra de luz del render
    skin: { w: 32, h: 32 },

    /**
     * Pixel art procedural propio. La pared del cuerpo son 16 columnas que
     * dan la vuelta a la lata (4 caras × 4 texels) con 8 filas: los rombos
     * son bandas diagonales de 4 px con período 8 en ambos ejes, así el
     * patrón cierra sin costura al envolver (16 y 8 son múltiplos de 8).
     */
    paint(skin) {
        const rng = new PRNG(407); // PRNG local fijo (mismo criterio que la cámara)
        const caja = (x, y, w, h, color, spread = 0) => {
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const d = spread ? Math.floor((rng.float() * 2 - 1) * spread) : 0;
                    skin.px(x + i, y + j, [color[0] + d, color[1] + d, color[2] + d]);
                }
            }
        };

        // tapas del cuerpo (4,0)..(12,4): aluminio (quedan bajo hombro y base)
        caja(4, 0, 8, 4, TAPA, 4);

        // pared del cuerpo (0,4)..(16,12): rombos diagonales azul/plata
        for (let c = 0; c < 16; c++) {
            for (let r = 0; r < 8; r++) {
                const azul = ((c + r) >> 2) & 1;
                if (azul) caja(c, 4 + r, 1, 1, AZUL, 4);
                else caja(c, 4 + r, 1, 1, PLATA, 6);
            }
        }

        // emblema en la cara frontal (columnas 4..7): placa clara con los
        // dos toros rojos embistiendo a los pies del sol amarillo y la
        // línea azul del rótulo debajo
        const frente = (r, colores) => colores.forEach((col, i) => skin.px(4 + i, 4 + r, col));
        frente(2, [PLATA_CLARA, PLATA_CLARA, PLATA_CLARA, PLATA_CLARA]);
        frente(3, [PLATA_CLARA, AMARILLO, AMARILLO, PLATA_CLARA]);
        frente(4, [ROJO, AMARILLO, AMARILLO, ROJO]);
        frente(5, [PLATA_CLARA, AZUL_TEXTO, AZUL_TEXTO, PLATA_CLARA]);

        // hombro (0,13)..(12,17): tapa superior con la boca troquelada,
        // reverso oscuro y pared de 1 px que atrapa la luz
        caja(3, 13, 3, 3, TAPA, 3);          // tapa (cara superior visible)
        skin.px(4, 14, TAPA_OSCURA);         // boca de la lata
        caja(6, 13, 3, 3, TAPA_OSCURA, 3);   // cara inferior (oculta)
        caja(0, 16, 12, 1, PLATA_CLARA, 4);  // pared del cono superior

        // base (0,18)..(12,22): fondo cóncavo en sombra y pared baja
        caja(3, 18, 3, 3, TAPA, 3);          // cara superior (oculta)
        caja(6, 18, 3, 3, TAPA_OSCURA, 3);   // fondo de la lata
        skin.px(7, 19, PLATA_SOMBRA);        // centro cóncavo
        caja(0, 21, 12, 1, PLATA_SOMBRA, 4); // pared del cono inferior

        // anilla (16,0)..(22,2): aluminio de la tapa con el agujero oscuro
        caja(16, 0, 6, 2, TAPA, 3);
        skin.px(18, 0, TAPA_OSCURA);         // agujero de la anilla
    },

    /**
     * Partes-caja (px, origen = centro del bloque a ras de suelo, frente −Z):
     * silueta clásica de lata «sleek» — base cónica, cuerpo esbelto 4×8,
     * hombro cónico y anilla sobre la tapa. Sin animación (anim por defecto
     * 'none'): la variedad la pone el yaw determinista de la entidad.
     */
    parts: [
        { name: 'base',   size: [3, 1, 3], pivot: [0, 0, 0], origin: [-1.5, 0, -1.5], uv: [0, 18] },
        { name: 'cuerpo', size: [4, 8, 4], pivot: [0, 0, 0], origin: [-2, 1, -2],     uv: [0, 0] },
        { name: 'hombro', size: [3, 1, 3], pivot: [0, 0, 0], origin: [-1.5, 9, -1.5], uv: [0, 13] },
        { name: 'anilla', size: [2, 1, 1], pivot: [0, 0, 0], origin: [-1, 10, -0.5],  uv: [16, 0] },
    ],
};

/* ---- Registro y entidades ---- */

/** Entidad falsa con los campos que mobrender espera de un mob (neutros). */
function crearEntidad(x, y, z) {
    return {
        def: LATA_DEF,
        pos: [x + 0.5, y, z + 0.5],   // centro del bloque, a ras de su suelo
        yaw: yawDeLata(x, y, z),      // orientación fija propia de la celda
        headYaw: 0,
        headPitch: 0,
        variant: 0,
        fuseT: -1,
        hurtT: 0,
        animPhase: 0,
        animSpeed: 0,
        onGround: true,
        inWater: false,
        dying: () => false,
    };
}

/* ---- Mecha y explosión ---- */

export const MECHA_S = 10;         // s de vida de una lata colocada
// radio de la esfera de destrucción: el cráter en planta es un círculo de
// área π·4² ≈ 50 bloques cuadrados (el creeper destruye con radio 3)
export const RADIO_EXPLOSION = 4;
export const AVISO_S = 3;          // últimos s: silbido + parpadeo blanco

/** Intervalo entre chisporroteos según la vida restante: se acelera. */
export function intervaloChispas(restante) {
    return restante > AVISO_S ? 0.5 : (restante > 1 ? 0.25 : 0.12);
}

export class LataSystem extends RegistroDinamico {
    constructor() {
        super(B.REDBULL, crearEntidad);
        this.mechas = new Map(); // "x,y,z" → {t: s restantes, chispaT, avisada}
    }

    reset() {
        super.reset();
        this.mechas.clear();
    }

    /** Alta puntual arranca la mecha; baja (romperla a tiempo) la desactiva. */
    onSet(x, y, z, id) {
        super.onSet(x, y, z, id);
        const k = `${x},${y},${z}`;
        if (id === B.REDBULL) {
            if (!this.mechas.has(k)) this.mechas.set(k, { t: MECHA_S, chispaT: 0, avisada: false });
        } else {
            this.mechas.delete(k);
        }
    }

    /** El sync de chunks también reconcilia las mechas con el registro. */
    sync(world) {
        super.sync(world);
        const vivas = new Set();
        for (const lista of this.porChunk.values()) {
            for (const c of lista) vivas.add(`${c.x},${c.y},${c.z}`);
        }
        // descarga del chunk → la mecha se olvida; al RECARGARLO la lata
        // redescubierta arranca de nuevo en 10 s (adaptación documentada:
        // no hay estado por bloque que persista la cuenta atrás)
        for (const k of [...this.mechas.keys()]) {
            if (!vivas.has(k)) this.mechas.delete(k);
        }
        for (const k of vivas) {
            if (!this.mechas.has(k)) this.mechas.set(k, { t: MECHA_S, chispaT: 0, avisada: false });
        }
    }

    /**
     * Avanza las mechas y sincroniza el parpadeo de las entidades (fuseT
     * solo en los últimos AVISO_S segundos). Devuelve las celdas que:
     * estallan (mecha agotada; la borra: main.js aplica la explosión),
     * chispean (toca soltar burbujas) y silban (acaban de entrar en el
     * tramo de aviso: main.js pone el siseo de mecha).
     */
    update(dt) {
        const estallan = [], chispean = [], silban = [];
        for (const [k, m] of this.mechas) {
            const [x, y, z] = k.split(',').map(Number);
            m.t -= dt;
            if (m.t <= 0) {
                estallan.push({ x, y, z });
                this.mechas.delete(k);
                continue;
            }
            if (!m.avisada && m.t <= AVISO_S) {
                m.avisada = true;
                silban.push({ x, y, z });
            }
            m.chispaT -= dt;
            if (m.chispaT <= 0) {
                m.chispaT = intervaloChispas(m.t);
                chispean.push({ x, y, z });
            }
        }
        for (const e of this.entidades) {
            const m = this.mechas.get(`${Math.floor(e.pos[0])},${e.pos[1]},${Math.floor(e.pos[2])}`);
            e.fuseT = m && m.t <= AVISO_S ? m.t : -1;
        }
        return { estallan, chispean, silban };
    }
}

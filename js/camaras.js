/**
 * Cámara de vigilancia (bloque dinámico B.CAMERA): el bloque no emite malla
 * en el mesher; su representación en el mundo es una ENTIDAD de partes-caja
 * (contrato de js/mobs/model.js) dibujada por frame con el pipeline de
 * mobrender. El cabezal barre el perímetro con un paneo suave (período 8 s,
 * extremos ±70° con pausa breve) y su LED rojo parpadea con patrón de
 * vigilancia (0,15 s encendido cada 1,2 s) alternando entre dos variantes
 * de piel.
 *
 * El rastreo en chunks cargados (sync/onSet) vive en el registro genérico
 * de bloques dinámicos (js/dinamicos.js); aquí solo queda lo propio de la
 * cámara: modelo, piel y animación.
 *
 * Módulo puro (sin DOM ni WebGL): probable en Node.
 */
import { B } from './blocks.js';
import { RegistroDinamico } from './dinamicos.js';
import { PRNG } from './noise.js';

/* ---- Barrido del cabezal ---- */

export const BARRIDO_PERIODO = 8;                     // s por ciclo de paneo completo
export const BARRIDO_AMPLITUD = 70 * Math.PI / 180;   // extremos del barrido (±70°)
const SOBREMARCHA = 1.12;   // el seno se satura cerca de los extremos: al
                            // recortarlo, la cámara HACE UNA PAUSA natural
                            // en cada extremo antes de volver (easing)

/**
 * Yaw del cabezal en el instante t (s): seno recortado, puro y periódico
 * (yaw(t) = yaw(t + BARRIDO_PERIODO)), con extremos exactos en ±70°.
 */
export function yawBarrido(t) {
    const s = Math.sin((t / BARRIDO_PERIODO) * Math.PI * 2) * SOBREMARCHA;
    return BARRIDO_AMPLITUD * Math.max(-1, Math.min(1, s));
}

/* ---- Parpadeo del LED ---- */

export const LED_PERIODO = 1.2;     // s entre destellos
export const LED_ENCENDIDO = 0.15;  // s que dura cada destello

/** Variante de piel según el instante t: 1 = LED encendido, 0 = apagado. */
export function varianteLED(t) {
    const fase = ((t % LED_PERIODO) + LED_PERIODO) % LED_PERIODO;
    return fase < LED_ENCENDIDO ? 1 : 0;
}

/* ---- Definición del modelo (pseudo-mob de partes-caja) ---- */

// cabeceo fijo del cabezal: 15° hacia abajo (rx positiva mira hacia arriba
// en este motor: ver lookAt de mobs.js, así que el picado es negativo)
const CABECEO = -15 * Math.PI / 180;
const PIVOTE_CABEZAL = [0, 12, 0]; // rótula: todo el cabezal gira solidario aquí

/** Zona del LED en la piel (rect x,y,w,h en texels): ahí difieren las variantes. */
export const LED_UV = { x: 43, y: 20, w: 4, h: 2 };

// paleta de la carcasa (gris grafito con arista clara, diseño propio)
const GRAFITO = [64, 68, 76];
const GRAFITO_CLARO = [76, 80, 88];
const GRAFITO_OSCURO = [46, 48, 54];
const ARISTA = [118, 124, 136];
const METAL = [140, 146, 158];
const CABLE = [28, 30, 34];
const LENTE = [30, 52, 110];
const LENTE_FONDO = [24, 34, 64];
const LENTE_BRILLO = [170, 205, 245];
const LED_APAGADO = [88, 20, 18];
const LED_VIVO = [255, 64, 48];

export const CAMARA_DEF = {
    id: 'camara',
    name: 'Cámara de vigilancia',
    aabb: { w: 0.8, h: 1.1 },   // solo para la muestra de luz del render
    variants: 2,                // 0 = LED apagado, 1 = LED encendido
    skin: { w: 64, h: 64 },

    /**
     * Pixel art procedural propio. OJO: no usa skin.rng (cada variante llega
     * con semilla distinta desde mobrender) sino un PRNG local fijo, para que
     * las dos variantes sean texel a texel idénticas SALVO en la zona del LED.
     */
    paint(skin, v = 0) {
        const rng = new PRNG(133);
        const caja = (x, y, w, h, color, spread = 0) => {
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const d = spread ? Math.floor((rng.float() * 2 - 1) * spread) : 0;
                    skin.px(x + i, y + j, [color[0] + d, color[1] + d, color[2] + d]);
                }
            }
        };

        // placa base (0,0)..(32,9): grafito con tapa clara y tornillos
        caja(0, 0, 32, 9, GRAFITO, 5);
        caja(8, 0, 8, 8, GRAFITO_CLARO, 4);              // tapa superior
        for (let i = 0; i < 8; i++) { skin.px(8 + i, 0, ARISTA); skin.px(8, i, ARISTA); } // arista
        skin.px(9, 1, METAL); skin.px(14, 1, METAL);     // brillos de los tornillos
        skin.px(9, 6, METAL); skin.px(14, 6, METAL);

        // tornillo (33,0,4,2): metal con la cabeza brillante
        caja(33, 0, 4, 2, METAL);
        caja(33, 0, 4, 1, [176, 182, 194]);

        // poste (0,10,8,7) y brazo (10,10,8,6): gris con el CABLE pintado
        // bajando por la cara frontal
        caja(0, 10, 8, 7, GRAFITO_CLARO, 5);
        for (let y = 12; y <= 16; y++) skin.px(3, y, CABLE);
        caja(10, 10, 8, 6, GRAFITO_CLARO, 5);
        for (let y = 12; y <= 15; y++) skin.px(13, y, CABLE);

        // rótula (19,10,12,6): grafito oscuro con brillo cenital
        caja(19, 10, 12, 6, GRAFITO_OSCURO, 4);
        skin.px(23, 11, [96, 100, 110]);

        // visera (32,10,22,6): parasol oscuro con canto claro
        caja(32, 10, 22, 6, [40, 42, 48], 3);
        for (let x = 32; x < 54; x++) skin.px(x, 15, [70, 74, 82]);

        // cuerpo del cabezal (0,20,26,13): tapa clara con arista, placa
        // frontal oscura y rejillas de ventilación en ambos laterales
        caja(0, 20, 26, 13, GRAFITO, 5);
        caja(8, 20, 5, 8, GRAFITO_CLARO, 4);             // tapa superior
        for (let i = 0; i < 5; i++) skin.px(8 + i, 20, ARISTA);
        for (let j = 0; j < 8; j++) skin.px(8, 20 + j, ARISTA);
        caja(8, 28, 5, 5, [54, 56, 62], 3);              // placa frontal
        skin.px(9, 29, METAL); skin.px(11, 29, METAL);   // remaches frontales
        for (const gx of [1, 3, 5]) {                    // rejillas laterales
            for (let y = 29; y <= 32; y++) {
                skin.px(gx, y, GRAFITO_OSCURO);          // cara +X (0,28)..(8,33)
                skin.px(13 + gx, y, GRAFITO_OSCURO);     // cara −X (13,28)..(21,33)
            }
        }
        skin.px(22, 29, METAL); skin.px(25, 29, METAL);  // remaches traseros

        // aro del objetivo (27,20,8,4): anillo oscuro con garganta más clara
        caja(27, 20, 8, 4, [38, 40, 46], 3);
        skin.px(29, 22, [58, 62, 70]);

        // lente (36,20,6,3): azul noche con destello especular arriba-izquierda
        caja(36, 20, 6, 3, LENTE_FONDO);
        caja(37, 21, 2, 2, LENTE);
        skin.px(37, 21, LENTE_BRILLO);

        // LED (43,20,4,2): la ÚNICA zona que cambia entre variantes
        caja(LED_UV.x, LED_UV.y, LED_UV.w, LED_UV.h, v ? LED_VIVO : LED_APAGADO);
    },

    /**
     * Partes-caja (px, origen = centro del bloque a ras de suelo, frente −Z):
     * placa con tornillos, poste articulado de dos tramos, rótula y CABEZAL
     * (cuerpo + visera + aro + lente + LED) girando solidario sobre la rótula
     * con la anim 'head' (headYaw = barrido) y el cabeceo fijo en rot.
     */
    parts: [
        { name: 'placa',      size: [8, 1, 8], pivot: [0, 0, 0],  origin: [-4, 0, -4],        uv: [0, 0] },
        { name: 'tornillo_a', size: [1, 1, 1], pivot: [0, 0, 0],  origin: [-3.5, 1, -3.5],    uv: [33, 0] },
        { name: 'tornillo_b', size: [1, 1, 1], pivot: [0, 0, 0],  origin: [2.5, 1, -3.5],     uv: [33, 0] },
        { name: 'tornillo_c', size: [1, 1, 1], pivot: [0, 0, 0],  origin: [-3.5, 1, 2.5],     uv: [33, 0] },
        { name: 'tornillo_d', size: [1, 1, 1], pivot: [0, 0, 0],  origin: [2.5, 1, 2.5],      uv: [33, 0] },
        { name: 'poste',      size: [2, 5, 2], pivot: [0, 0, 0],  origin: [-1, 1, -1],        uv: [0, 10] },
        { name: 'brazo',      size: [2, 4, 2], pivot: [0, 6, 0],  origin: [-1, 0, -1],        uv: [10, 10] },
        { name: 'rotula',     size: [3, 3, 3], pivot: [0, 10, 0], origin: [-1.5, 0, -1.5],    uv: [19, 10], anim: 'head' },
        { name: 'cuerpo',     size: [5, 5, 8], pivot: PIVOTE_CABEZAL, origin: [-2.5, -0.5, -6], uv: [0, 20],  anim: 'head', rot: [CABECEO, 0, 0] },
        { name: 'visera',     size: [6, 1, 5], pivot: PIVOTE_CABEZAL, origin: [-3, 4.5, -7],    uv: [32, 10], anim: 'head', rot: [CABECEO, 0, 0] },
        { name: 'aro',        size: [3, 3, 1], pivot: PIVOTE_CABEZAL, origin: [-1.5, 0.5, -7],  uv: [27, 20], anim: 'head', rot: [CABECEO, 0, 0] },
        { name: 'lente',      size: [2, 2, 1], pivot: PIVOTE_CABEZAL, origin: [-1, 1, -7.5],    uv: [36, 20], anim: 'head', rot: [CABECEO, 0, 0] },
        { name: 'led',        size: [1, 1, 1], pivot: PIVOTE_CABEZAL, origin: [1.5, 4.5, 0.5],  uv: [43, 20], anim: 'head', rot: [CABECEO, 0, 0] },
    ],
};

/* ---- Registro y entidades ---- */

/** Entidad falsa con los campos que mobrender espera de un mob (neutros). */
function crearEntidad(x, y, z) {
    return {
        def: CAMARA_DEF,
        pos: [x + 0.5, y, z + 0.5],   // centro del bloque, a ras de su suelo
        yaw: 0,                       // la base no gira: el barrido va en headYaw
        headYaw: 0,
        headPitch: 0,                 // el cabeceo fijo vive en el rot de las partes
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

export class CamaraSystem extends RegistroDinamico {
    constructor() {
        super(B.CAMERA, crearEntidad);
    }

    /** Anima el barrido y el parpadeo del LED de todas las cámaras. */
    update(t) {
        const yaw = yawBarrido(t);
        const v = varianteLED(t);
        for (const e of this.entidades) {
            e.headYaw = yaw;
            e.variant = v;
        }
    }
}

/**
 * Dron escapista: dron de PRÁCTICA propio de la casa. Vuela como un
 * mosquito — siempre a máxima velocidad (hasta 3× la de un dron), con
 * quiebres bruscos de rumbo y altura («ángulos imposibles» sin frenar) —
 * y evade a los drones y antidrones, que lo persiguen de inmediato al
 * reconocerlo como presa (`behavior.quarry`). La IA `behavior.evasive` y
 * el giro instantáneo (`snapTurn`) viven en mobs.js. No aparece de forma
 * natural: nace del huevo de aparición del modo creativo.
 *
 * Diseño de la imagen (nave anular de combate, vista cenital): casco
 * BEIGE de manta raya que RODEA un anillo hueco central (proa + dos
 * flancos + popa, con 10 segmentos en corona alrededor del agujero),
 * morro apuntado al frente, dos alas en delta con el filo de fuga
 * magenta, góndolas/toberas oscuras bajo los flancos, filos grises y
 * acentos MAGENTA (líneas de energía, luces). Cuatro púas-antena (dos al
 * frente, dos a los lados). Sigue el contrato de definición de mobs (ver
 * model.js; pig.js es el ejemplo canónico).
 *
 * Distribución de la piel 128×128:
 *   (0,0)    proa 16×2×6    → 44×8     (46,0) popa 14×2×5 → 38×7
 *   (0,20)   morro 6×2×8    → 28×10    (46,20) ala 12×1×10 → 44×11 (ambas)
 *   (0,36)   seg. anillo 6×2×2 → 16×4  (los 10 segmentos comparten)
 *   (0,44)   flanco 5×2×16  → 42×18    (ambos comparten)
 *   (46,44)  góndola 3×3×6  → 18×9     (ambas)  (72,44) aleta 2×3×6 → 16×9
 *   (104,36) antena 1×1×9   → 20×11    (las cuatro comparten)
 *
 * Altura del modelo: ~7 px (aletas) frente a un AABB de 0.5 bloques
 * (8 px); es plano y ancho como en la imagen (aabb.w cubre la envergadura).
 */

import { ITEMS } from '../items.js';

const BEIGE = [206, 190, 168];         // casco principal (color del brief)
const BEIGE_OSC = [168, 152, 132];     // sombras del casco
const GRIS = [96, 99, 106];            // filos, góndolas, mecanismos
const GRIS_CLARO = [140, 144, 150];    // biseles metálicos
const NEGRO = [44, 45, 52];            // toberas y juntas
const MAGENTA = [232, 30, 180];        // líneas de energía y luces (brief)
const MAGENTA_OSC = [150, 20, 120];    // magenta en sombra

/** Diez segmentos del anillo, en corona alrededor de un HUECO central
 *  (radio 9 px). Diez (no doce) para no rebasar el tope de 24 partes.
 *  Cada segmento es un arco corto tangente; juntos cierran la corona
 *  dejando el agujero abierto, como en el plano. */
function anilloParts() {
    const R = 9, N = 10, out = [];
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const px = Math.sin(a) * R, pz = Math.cos(a) * R;
        out.push({
            name: `anillo_${i}`,
            size: [6, 2, 2],           // largo tangencial, fino radialmente
            pivot: [px, 5, pz],
            origin: [-3, -1, -1],
            uv: [0, 36],
            rot: [0, -a, 0],           // tangente a la corona
        });
    }
    return out;
}

export default {
    id: 'dron_escapista',
    name: 'Dron escapista',
    hostile: false,
    aabb: { w: 2.0, h: 0.5 },
    hp: 16,
    speed: 4,
    flySpeed: 15,             // hasta 3× la de un dron (5) / antidron (11)
    climbAccel: 90,           // saltos verticales bruscos
    snapTurn: true,           // la velocidad salta al rumbo nuevo (giro «imposible»)
    // presa de práctica (quarry): drones y antidrones lo persiguen. Al ser
    // perseguido dentro de alertRadius huye a SALTOS con pausa (ver abajo);
    // sin cazador, patrulla de largo alcance: se aleja hasta roamRadius (≈6×
    // la órbita de un dron, 5) subiendo hasta roamCeil (≈6× más alto), y
    // vuelve a probar el perímetro cercano (nearRadius) antes de alejarse.
    behavior: {
        evasive: true, quarry: true,
        alertRadius: 26, evadeSpread: 1.7,
        dartSlow: 0.7, ceiling: 10,
        roamRadius: 42, roamCeil: 30, nearRadius: 6, roamSpread: 1.0,
        // salto evasivo: pausa quieto tras cada salto; la distancia del salto
        // es 2× lo que el cazador recorre en esa pausa (ventaja evasiva)
        hopPause: 0.35,
    },
    spawn: { summonOnly: true, cap: 1, group: 1 },
    drops: [{ id: ITEMS.LINGOTE_HIERRO, min: 0, max: 1 }],

    skin: { w: 128, h: 128 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 72, 18, BEIGE, 6);         // casco central
        skin.fill(0, 20, 36, 14, BEIGE, 6);        // morro
        skin.fill(46, 0, 38, 7, BEIGE, 6);         // popa
        skin.fill(0, 44, 42, 18, BEIGE, 6);        // flanco (ambos)
        skin.fill(46, 20, 44, 11, BEIGE, 6);       // ala (ambas)
        skin.fill(0, 36, 16, 4, GRIS, 4);          // segmento de anillo (los 10)
        skin.fill(46, 44, 18, 9, GRIS, 4);         // góndola (ambas)
        skin.fill(104, 36, 20, 10, GRIS_CLARO, 3); // antena (las 4)
        skin.fill(72, 44, 16, 9, BEIGE, 6);        // aleta dorsal
        skin.speckle(0, 0, 44, 8, 60, BEIGE_OSC);  // veta del casco (proa)
        skin.speckle(0, 44, 42, 18, 60, BEIGE_OSC);

        // cara superior de la PROA (6,0)..(22,6): paneles beige con líneas de
        // energía magenta y biseles grises (la placa que orla el anillo)
        skin.fill(7, 1, 14, 1, GRIS_CLARO);        // costura de panel frontal
        skin.fill(8, 2, 1, 4, MAGENTA);            // línea de energía izquierda
        skin.fill(19, 2, 1, 4, MAGENTA);           // línea de energía derecha
        skin.px(11, 4, MAGENTA); skin.px(16, 4, MAGENTA); // luces de estado

        // cara superior del FLANCO (16,44)..(21,60): raya de energía magenta
        // longitudinal y nervios grises (el costado de la manta raya)
        skin.fill(18, 46, 1, 12, MAGENTA);
        skin.fill(20, 48, 1, 8, GRIS_CLARO);

        // cara superior del MORRO (8,20)..(14,28): filo gris y sensor de proa
        skin.fill(9, 21, 6, 1, GRIS_CLARO);
        skin.fill(10, 23, 4, 2, NEGRO);            // sensor
        skin.px(11, 24, MAGENTA); skin.px(13, 24, MAGENTA);

        // cara superior del ALA (56,20)..(68,30): nervios grises y borde
        // magenta de FUGA (el filo trasero luminoso de la imagen)
        skin.fill(56, 21, 12, 1, GRIS);
        skin.fill(56, 29, 12, 1, MAGENTA);
        skin.fill(61, 23, 1, 6, GRIS_CLARO);       // larguero central

        // segmento de anillo (2,36)..(8,40): bisel gris claro con destello
        skin.fill(0, 38, 16, 1, GRIS_CLARO, 1);
        skin.px(3, 37, MAGENTA); skin.px(11, 37, MAGENTA);

        // góndola/tobera (52,44)..(58,50): boca negra con anillo magenta
        skin.fill(53, 46, 4, 4, NEGRO, 2);         // boca
        skin.px(54, 47, MAGENTA); skin.px(56, 48, MAGENTA);

        // aleta dorsal (74,44)..(80,50): raya magenta central
        skin.fill(78, 45, 1, 6, MAGENTA);
    },

    parts: [
        // el casco RODEA el anillo hueco: proa al frente y dos flancos a los
        // lados (nada en el centro, para que el agujero quede abierto)
        { name: 'proa', size: [16, 2, 6], pivot: [0, 5, -11], origin: [-8, -1, -6], uv: [0, 0] },
        { name: 'flanco_i', size: [5, 2, 16], pivot: [-11, 5, 2], origin: [-2.5, -1, -8], uv: [0, 44] },
        { name: 'flanco_d', size: [5, 2, 16], pivot: [11, 5, 2], origin: [-2.5, -1, -8], uv: [0, 44] },
        { name: 'popa', size: [14, 2, 5], pivot: [0, 5, 12], origin: [-7, -1, -2.5], uv: [46, 0] },
        { name: 'morro', size: [6, 2, 8], pivot: [0, 5, -14], origin: [-3, -1, -8], uv: [0, 20] },
        { name: 'ala_i', size: [12, 1, 10], pivot: [-13, 5, 6], origin: [-12, -0.5, -5], uv: [46, 20], rot: [0, 0.34, 0] },
        { name: 'ala_d', size: [12, 1, 10], pivot: [13, 5, 6], origin: [0, -0.5, -5], uv: [46, 20], rot: [0, -0.34, 0] },
        // corona del anillo hueco: 10 segmentos tangentes
        ...anilloParts(),
        // dos góndolas/toberas bajo los flancos, hacia atrás
        { name: 'gondola_i', size: [3, 3, 6], pivot: [-11, 3.5, 6], origin: [-1.5, -3, -3], uv: [46, 44] },
        { name: 'gondola_d', size: [3, 3, 6], pivot: [11, 3.5, 6], origin: [-1.5, -3, -3], uv: [46, 44] },
        // aleta dorsal sobre la proa
        { name: 'aleta', size: [2, 3, 6], pivot: [0, 6, -10], origin: [-1, 0, -3], uv: [72, 44] },
        // cuatro púas-antena: dos al frente abriéndose, dos a los flancos
        { name: 'antena_fi', size: [1, 1, 9], pivot: [-3, 5, -16], origin: [-0.5, -0.5, -9], uv: [104, 36], rot: [0.12, 0.3, 0] },
        { name: 'antena_fd', size: [1, 1, 9], pivot: [3, 5, -16], origin: [-0.5, -0.5, -9], uv: [104, 36], rot: [0.12, -0.3, 0] },
        { name: 'antena_i', size: [1, 1, 9], pivot: [-13, 5, 8], origin: [-0.5, -0.5, 0], uv: [104, 36], rot: [0, -1.0, 0] },
        { name: 'antena_d', size: [1, 1, 9], pivot: [13, 5, 8], origin: [-0.5, -0.5, 0], uv: [104, 36], rot: [0, 1.0, 0] },
    ],

    /** Voz: chirrido agudo y nervioso (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 1320, b: 1.0, d: 0.06, w: 'square', v: 0.1 },
            { f: 1760, b: 1.0, d: 0.05, w: 'square', v: 0.1, at: 0.07 },
        ],
        hurt: [{ f: 900, b: 0.7, d: 0.1, w: 'square', v: 0.18 }],
        death: [{ f: 500, b: 0.2, d: 0.5, w: 'sawtooth', v: 0.2 }],
    },

    /** Prefijos del pack local (no existen en el pack vanilla: cae a voice). */
    sonidos: {
        say: ['mob/dron_escapista/idle'],
        hurt: ['mob/dron_escapista/hurt'],
        death: ['mob/dron_escapista/death'],
    },
};

/**
 * Loro: mob pasivo volador (flying: sin gravedad, alas en aleteo continuo
 * con flapL/flapR). Ave pequeña de cuerpo rojo, alas azules y cola larga
 * amarilla, al estilo del guacamayo (ver model.js para el formato de las
 * partes y el desplegado UV; cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 3×5×4 → 14×9
 *   (24,0)  ala 1×4×4    → 10×8 (las dos alas comparten desplegado)
 *   (0,12)  cabeza 3×4×3 → 12×7
 *   (16,12) pico 1×2×1   → 4×3
 *   (0,24)  cola 2×1×4   → 12×5
 */
import { ITEMS } from '../items.js';

const ROJO = [200, 40, 40];
const ROJO_OSCURO = [160, 26, 30];
const AZUL = [60, 90, 200];
const AZUL_OSCURO = [40, 62, 150];
const AMARILLO = [225, 185, 55];
const AMARILLO_OSCURO = [180, 138, 30];
const GRIS = [150, 150, 148];
const GRIS_OSCURO = [105, 105, 104];
const BLANCO = [238, 236, 230];

export default {
    id: 'loro',
    name: 'Loro',
    hostile: false,
    aabb: { w: 0.4, h: 0.8 },
    hp: 4,
    speed: 2.8,
    fleeSpeed: 3.6,
    flying: true,
    spawn: { cap: 2, group: 1 },
    // Botín: pluma 1-2 — como toda ave, su plumaje siempre deja plumas.
    drops: [{ id: ITEMS.PLUMA, min: 1, max: 2 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 14, 9, ROJO, 8);           // cuerpo
        skin.fill(24, 0, 10, 8, AZUL, 7);          // ala
        skin.fill(0, 12, 12, 7, ROJO, 7);          // cabeza
        skin.fill(16, 12, 4, 3, GRIS, 5);          // pico
        skin.fill(0, 24, 12, 5, AMARILLO, 6);      // cola

        // plumaje del lomo algo revuelto: cara superior del cuerpo (4,0)..(7,4)
        skin.speckle(4, 0, 3, 4, 5, ROJO_OSCURO);
        // cara frontal de la cabeza (3,15)..(6,19): antifaz claro de guacamayo
        // en la fila superior, con un ojo oscuro a cada lado del centro
        skin.fill(3, 15, 3, 1, BLANCO);
        skin.px(3, 15, [35, 35, 40]);              // ojo izquierdo
        skin.px(5, 15, [35, 35, 40]);              // ojo derecho
        // pico: punta curvada más oscura (fila inferior de sus caras laterales)
        skin.fill(16, 14, 4, 1, GRIS_OSCURO, 4);
        // alas: rémiges azul oscuro en el borde inferior (filas 6..8)
        skin.fill(24, 6, 10, 2, AZUL_OSCURO, 5);
        // cola: extremo oscurecido (fila del extremo en arriba/abajo y cara
        // trasera; en la cara inferior v crece hacia el FRENTE, así que su
        // extremo es la fila 24 y no la 27)
        skin.fill(4, 27, 2, 1, AMARILLO_OSCURO, 4);   // cara superior: punta
        skin.fill(6, 24, 2, 1, AMARILLO_OSCURO, 4);   // cara inferior: punta
        skin.fill(10, 28, 2, 1, AMARILLO_OSCURO, 4);  // cara trasera
    },

    parts: [
        { name: 'cuerpo', size: [3, 5, 4], pivot: [0, 5, 0], origin: [-1.5, -2, -2], uv: [0, 0] },
        { name: 'cabeza', size: [3, 4, 3], pivot: [0, 8, -1], origin: [-1.5, 0, -1.5], uv: [0, 12], anim: 'head' },
        { name: 'pico', size: [1, 2, 1], pivot: [0, 8, -1], origin: [-0.5, 1, -2.5], uv: [16, 12], anim: 'head' },
        { name: 'ala_i', size: [1, 4, 4], pivot: [-1.5, 7, 0], origin: [-1, -4, -2], uv: [24, 0], anim: 'flapL' },
        { name: 'ala_d', size: [1, 4, 4], pivot: [1.5, 7, 0], origin: [0, -4, -2], uv: [24, 0], anim: 'flapR' },
        { name: 'cola', size: [2, 1, 4], pivot: [0, 4, 2], origin: [-1, -0.5, 0], uv: [0, 24] },
    ],

    /** Voz: silbidos cuadrados alternos 1000/1300 Hz (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 1000, b: 1.3, d: 0.1, w: 'square', v: 0.15 },
            { f: 1300, b: 0.75, d: 0.1, w: 'square', v: 0.15, at: 0.14 },
            { f: 1000, b: 1.3, d: 0.1, w: 'square', v: 0.13, at: 0.28 },
        ],
        hurt: [{ f: 1450, b: 0.65, d: 0.12, w: 'square', v: 0.3 }],
        death: [{ f: 1200, b: 0.3, d: 0.5, w: 'square', v: 0.26 }],
    },
};

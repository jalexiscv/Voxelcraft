/**
 * Calamar brillante: variante luminosa del calamar. Mob pasivo acuático que
 * nada a la deriva, aletea si queda varado y brilla en la oscuridad (glow).
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64 (idéntica a la del calamar):
 *   (0,0)   manto 10×12×10  → 40×22
 *   (0,24)  tentáculo 2×8×2 → 8×10 (los ocho tentáculos comparten desplegado)
 *
 * Modelo: la misma silueta que el calamar — manto cúbico que flota (y 5..17)
 * con ojos en la cara frontal (−Z) y en las laterales (±X), pico en la cara
 * inferior, y ocho tentáculos en anillo (pivote en ±3, y 8..0) que reman
 * alternando leg0/leg1 con los adyacentes en contrafase — pero en turquesa
 * luminoso salpicado de motas brillantes por todo el manto. Altura del
 * modelo: 17 px frente a un AABB de 0.8 bloques (12.8 px), dentro de
 * tolerancia.
 */
import { ITEMS } from '../items.js';

const TURQUESA = [80, 220, 200];         // manto turquesa luminoso
const TURQUESA_OSCURO = [40, 140, 130];  // aros de los ojos y pliegues
const MOTA = [180, 255, 240];            // motas brillantes del manto
const BLANCO = [235, 255, 250];          // esclerótica
const PUPILA = [10, 40, 44];
const PICO = [20, 90, 85];

export default {
    id: 'calamar_brillante',
    name: 'Calamar brillante',
    hostile: false,
    aquatic: true,
    glow: true,
    aabb: { w: 0.8, h: 0.8 },
    hp: 10,
    speed: 1.2,
    fleeSpeed: 2.0,
    spawn: { cap: 2, group: 2, water: true },
    // Botín: tinta 1-2 — la misma bolsa de tinta que su pariente opaco.
    drops: [{ id: ITEMS.TINTA, min: 1, max: 2 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 40, 22, TURQUESA, 8);        // manto (desplegado completo)
        skin.fill(0, 24, 8, 10, TURQUESA, 7);        // tentáculo compartido

        // motas brillantes repartidas por todo el desplegado del manto
        skin.speckle(0, 0, 40, 22, 70, MOTA);
        skin.speckle(0, 24, 8, 10, 8, MOTA);         // destellos en los tentáculos

        // ojos grandes en las caras laterales: +X en (0,10) y −X en (20,10)
        for (const ex of [0, 20]) {
            skin.outline(ex + 2, 14, 6, 6, TURQUESA_OSCURO); // aro del ojo
            skin.fill(ex + 3, 15, 4, 4, BLANCO);             // esclerótica
            skin.fill(ex + 4, 16, 2, 2, PUPILA);             // pupila
        }

        // par de ojos menores en la cara frontal del manto: rect (10,10)..(20,22)
        for (const ex of [11, 16]) {
            skin.fill(ex, 15, 3, 3, TURQUESA_OSCURO);        // aro del ojo
            skin.fill(ex, 15, 2, 2, BLANCO);                 // esclerótica
            skin.px(ex + 1, 16, PUPILA);                     // pupila
        }

        // pico en el centro de la cara inferior del manto: rect (20,0)..(30,10)
        skin.outline(23, 3, 4, 4, TURQUESA_OSCURO);          // pliegues alrededor
        skin.fill(24, 4, 2, 2, PICO);                        // pico córneo

        // tentáculo: filas de ventosas luminosas en −Z/+Z y punta pálida
        for (let y = 27; y <= 32; y += 2) {
            skin.px(2, y, MOTA);
            skin.px(7, y, MOTA);
        }
        skin.fill(0, 33, 8, 1, MOTA);
    },

    parts: [
        { name: 'manto', size: [10, 12, 10], pivot: [0, 5, 0], origin: [-5, 0, -5], uv: [0, 0] },
        // ocho tentáculos en anillo bajo el manto; adyacentes en contrafase
        { name: 'tent_frente_izq', size: [2, 8, 2], pivot: [-3, 8, -3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg0' },
        { name: 'tent_frente', size: [2, 8, 2], pivot: [0, 8, -3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg1' },
        { name: 'tent_frente_der', size: [2, 8, 2], pivot: [3, 8, -3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg0' },
        { name: 'tent_der', size: [2, 8, 2], pivot: [3, 8, 0], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg1' },
        { name: 'tent_atras_der', size: [2, 8, 2], pivot: [3, 8, 3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg0' },
        { name: 'tent_atras', size: [2, 8, 2], pivot: [0, 8, 3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg1' },
        { name: 'tent_atras_izq', size: [2, 8, 2], pivot: [-3, 8, 3], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg0' },
        { name: 'tent_izq', size: [2, 8, 2], pivot: [-3, 8, 0], origin: [-1, -8, -1], uv: [0, 24], anim: 'leg1' },
    ],

    /** Voz: glup con eco — dos senos, el segundo retrasado y más tenue. */
    voice: {
        say: [
            { f: 220, b: 0.6, d: 0.18, w: 'sine', v: 0.22 },
            { f: 330, b: 0.6, d: 0.12, w: 'sine', v: 0.1, at: 0.14 },
        ],
        hurt: [
            { f: 320, b: 0.7, d: 0.12, w: 'sine', v: 0.28 },
            { f: 480, b: 0.7, d: 0.08, w: 'sine', v: 0.12, at: 0.1 },
        ],
        death: [
            { f: 240, b: 0.35, d: 0.45, w: 'sine', v: 0.26 },
            { f: 360, b: 0.35, d: 0.3, w: 'sine', v: 0.1, at: 0.32 },
        ],
    },
};

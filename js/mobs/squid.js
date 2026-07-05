/**
 * Calamar: mob pasivo acuático que nada a la deriva y aletea si queda varado.
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   manto 10×12×10  → 40×22
 *   (0,24)  tentáculo 2×8×2 → 8×10 (los ocho tentáculos comparten desplegado)
 *
 * Modelo: un manto cúbico que flota (y 5..17) con ojos grandes en las caras
 * laterales (±X) y el pico en la cara inferior; de su base cuelgan ocho
 * tentáculos en anillo (pivote en ±3, y 8..0) que reman alternando
 * leg0/leg1 con los adyacentes en contrafase. Altura del modelo: 17 px
 * frente a un AABB de 0.8 bloques (12.8 px), dentro de tolerancia.
 */
import { ITEMS } from '../items.js';

const AZUL = [70, 90, 120];            // manto azul grisáceo
const AZUL_OSCURO = [48, 64, 92];      // moteado, aros de los ojos y pliegues
const VENTOSA = [150, 164, 190];       // ventosas y puntas de los tentáculos
const BLANCO = [228, 232, 240];        // esclerótica
const PUPILA = [22, 26, 44];
const PICO = [30, 36, 54];

export default {
    id: 'squid',
    name: 'Calamar',
    hostile: false,
    aquatic: true,
    aabb: { w: 0.8, h: 0.8 },
    hp: 10,
    speed: 1.2,
    fleeSpeed: 2.0,
    spawn: { cap: 2, group: 2, water: true },
    // Botín: tinta 1-2 — su bolsa de tinta revienta al morir.
    drops: [{ id: ITEMS.TINTA, min: 1, max: 2 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 40, 22, AZUL, 8);            // manto (desplegado completo)
        skin.fill(0, 24, 8, 10, AZUL, 7);            // tentáculo compartido

        // moteado del manto: lomo/vientre y banda lateral
        skin.speckle(10, 0, 20, 10, 14, AZUL_OSCURO);
        skin.speckle(0, 10, 40, 12, 26, AZUL_OSCURO);

        // ojos grandes en las caras laterales: +X en (0,10) y −X en (20,10)
        for (const ex of [0, 20]) {
            skin.outline(ex + 2, 14, 6, 6, AZUL_OSCURO); // aro del ojo
            skin.fill(ex + 3, 15, 4, 4, BLANCO);         // esclerótica
            skin.fill(ex + 4, 16, 2, 2, PUPILA);         // pupila
        }

        // pico en el centro de la cara inferior del manto: rect (20,0)..(30,10)
        skin.outline(23, 3, 4, 4, AZUL_OSCURO);          // pliegues alrededor
        skin.fill(24, 4, 2, 2, PICO);                    // pico córneo

        // tentáculo: filas de ventosas en las caras −Z/+Z y punta pálida
        for (let y = 27; y <= 32; y += 2) {
            skin.px(2, y, VENTOSA);
            skin.px(7, y, VENTOSA);
        }
        skin.fill(0, 33, 8, 1, VENTOSA);
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

    /** Voz: glup grave — seno descendente con burbujeo de ruido filtrado. */
    voice: {
        say: [
            { f: 200, b: 0.6, d: 0.2, w: 'sine', v: 0.22 },
            { noise: true, f: 650, q: 1, d: 0.07, v: 0.08, at: 0.03 },
        ],
        hurt: [
            { f: 300, b: 0.7, d: 0.14, w: 'sine', v: 0.28 },
            { noise: true, f: 900, q: 1.2, d: 0.06, v: 0.12 },
        ],
        death: [
            { f: 230, b: 0.35, d: 0.5, w: 'sine', v: 0.26 },
            { noise: true, f: 500, q: 0.8, d: 0.3, v: 0.1, at: 0.12 },
        ],
    },

    // Voces reales del pack: squirt (chorro de propulsión) se omite por no ser vocalización.
    sonidos: {
        say: ['mob/squid/ambient'],
        hurt: ['mob/squid/hurt'],
        death: ['mob/squid/death'],
    },
};

/**
 * Husk: zombi del desierto. Hostil cuerpo a cuerpo, humanoide de brazos
 * extendidos como el zombi, pero curtido por el sol: NO arde de día
 * (noBurn) y solo aparece sobre arena. Sigue el contrato de definición de
 * mobs (ver model.js para el formato de las partes y el desplegado UV;
 * mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8    → 32×16
 *   (0,16)  pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *   (16,16) torso 8×12×4    → 24×16
 *   (40,16) brazo 4×12×4    → 16×16 (ambos brazos comparten desplegado)
 *
 * Altura del modelo: 32 px (cabeza en 24..32) frente a un AABB de 1.8
 * bloques (28.8 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const PIEL = [170, 140, 100];          // piel parda resecada por el sol
const PIEL_OSCURA = [136, 110, 76];    // grietas y sombras de la piel
const ROPA = [140, 125, 95];           // harapos gris arena
const ROPA_OSCURA = [112, 99, 73];     // rozaduras y pliegues de la ropa
const OJO = [38, 30, 20];              // cuencas sombrías, casi negras

export default {
    id: 'husk',
    name: 'Husk',
    hostile: true,
    aabb: { w: 0.6, h: 1.8 },
    hp: 20,
    speed: 1.5,
    noBurn: true,                       // el sol del desierto ya no le hace nada
    spawn: { cap: 3, group: 2, block: 'SAND' },
    // botín: carne podrida curtida al sol, como todo zombi; muy rara vez
    // suelta la hortaliza que llevaba encima (fuente inicial de cultivos)
    drops: [
        { id: ITEMS.CARNE_PODRIDA, min: 0, max: 2 },
        { id: ITEMS.ZANAHORIA, min: 1, max: 1, chance: 0.05 },
        { id: ITEMS.PATATA, min: 1, max: 1, chance: 0.05 },
    ],

    /** Persecución cuerpo a cuerpo lenta pero insistente, como el zombi. */
    behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, PIEL, 9);            // cabeza
        skin.fill(0, 16, 16, 16, ROPA, 7);           // pierna (pantalón raído)
        skin.fill(16, 16, 24, 16, ROPA, 8);          // torso (camisa gastada)
        skin.fill(40, 16, 16, 16, PIEL, 9);          // brazo

        // cara frontal de la cabeza: rect (8,8)..(16,16) — gesto sombrío
        skin.px(9, 10, PIEL_OSCURA);                 // ceño hundido
        skin.px(10, 10, PIEL_OSCURA);
        skin.px(13, 10, PIEL_OSCURA);
        skin.px(14, 10, PIEL_OSCURA);
        skin.px(9, 11, OJO);                          // ojo izquierdo, apagado
        skin.px(10, 11, OJO);
        skin.px(13, 11, OJO);                         // ojo derecho, apagado
        skin.px(14, 11, OJO);
        skin.px(9, 12, PIEL_OSCURA);                  // ojeras resecas
        skin.px(14, 12, PIEL_OSCURA);
        skin.px(11, 13, PIEL_OSCURA);                 // nariz agrietada
        skin.px(12, 13, PIEL_OSCURA);
        skin.px(10, 14, OJO);                         // boca entreabierta
        skin.px(11, 14, OJO);
        skin.px(12, 14, OJO);
        skin.px(13, 14, OJO);

        // piel agrietada por el sol en cabeza y brazos
        skin.speckle(0, 0, 32, 16, 18, PIEL_OSCURA);
        skin.speckle(40, 16, 16, 16, 12, PIEL_OSCURA);
        // harapos: rozaduras y jirones que dejan ver la piel parda
        skin.speckle(16, 16, 24, 16, 16, ROPA_OSCURA);
        skin.speckle(20, 24, 8, 8, 4, PIEL);
        // pantalón deshilachado con polvo de arena
        skin.speckle(0, 16, 16, 16, 10, ROPA_OSCURA);
        skin.speckle(0, 22, 16, 10, 6, PIEL);
    },

    parts: [
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [16, 16] },
        // brazos extendidos al frente (pose zombi), con balanceo suave; en
        // este motor (+Y arriba, frente −Z) el brazo caído gira al frente
        // con rx POSITIVO (la convención de Java está invertida aquí)
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        // piernas: pivot.y + origin.y = 0 → los pies tocan el suelo
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg1' },
    ],

    /** Voz: gemido seco y ronco, más grave y áspero que el del zombi. */
    voice: {
        say: [{ f: 85, b: 0.7, d: 0.7, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 125, b: 0.9, d: 0.16, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 95, b: 0.35, d: 0.9, w: 'sawtooth', v: 0.28 }],
    },

    /** Voces reales del pack local (mob/husk: idle1-3, hurt1-2, death1-2). */
    sonidos: {
        say: ['mob/husk/idle'],
        hurt: ['mob/husk/hurt'],
        death: ['mob/husk/death'],
    },
};

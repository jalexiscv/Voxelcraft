/**
 * Ravager: mob hostil, bestia de asedio enorme y acorazada. Cuadrúpedo gris
 * pardo con placas óseas oscuras en el lomo, cabezón con mandíbula inferior
 * prominente y un par de cuernos curvados hacia delante (ver model.js para el
 * formato de las partes y el desplegado UV; mobs.js/hostileAI para el
 * comportamiento). Embiste con lunge y golpea muy fuerte pero despacio.
 *
 * Distribución de la piel 128×64:
 *   (0,0)    cuerpo 18×14×24    → 84×38
 *   (84,0)   cabeza 12×10×10    → 44×20
 *   (84,20)  mandíbula 10×4×4   → 28×8
 *   (112,20) cuerno 2×4×3       → 10×7 (ambos cuernos comparten desplegado)
 *   (0,38)   pata 6×12×6        → 24×18 (las cuatro patas comparten desplegado)
 *
 * Altura del modelo: 31 px (punta de los cuernos) frente a un AABB de 2.2
 * bloques (35.2 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const GRIS = [110, 100, 95];           // gris pardo base
const GRIS_OSCURO = [82, 75, 70];      // vientre y musculatura en sombra
const PLACA = [64, 58, 54];            // placas óseas oscuras del lomo
const CICATRIZ = [156, 146, 136];      // cicatrices claras de viejas batallas
const HUESO = [205, 196, 178];         // cuernos
const HUESO_SUCIO = [160, 148, 128];   // punta desgastada del cuerno
const BOCA = [72, 34, 34];             // interior de las fauces
const DIENTE = [228, 222, 206];
const OJO_BLANCO = [230, 225, 215];
const PUPILA = [24, 22, 20];

export default {
    id: 'ravager',
    name: 'Ravager',
    hostile: true,
    aabb: { w: 1.9, h: 2.2 },
    hp: 40,
    speed: 2.4,
    spawn: { cap: 1, group: 1, night: true },
    // Botín: cuero abundante (su pellejo curtido es enorme)
    drops: [{ id: ITEMS.CUERO, min: 1, max: 2 }],

    /** Embestida: mucho daño por golpe, ritmo lento y acometida (lunge). */
    behavior: { aggro: 18, attackRange: 2.4, damage: 8, cooldown: 1.8, lunge: true },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 84, 38, GRIS, 8);          // cuerpo
        skin.fill(84, 0, 44, 20, GRIS, 8);         // cabeza
        skin.fill(84, 20, 28, 8, GRIS_OSCURO, 6);  // mandíbula
        skin.fill(112, 20, 10, 7, HUESO, 6);       // cuerno
        skin.fill(0, 38, 24, 18, GRIS, 8);         // pata

        // lomo acorazado (cara superior del cuerpo, rect (24,0)..(42,24))
        skin.fill(24, 0, 18, 24, PLACA, 7);
        skin.speckle(24, 0, 18, 24, 16, GRIS_OSCURO);
        // la coraza rebosa por el borde alto de los flancos (filas 24..28)
        skin.fill(0, 24, 84, 4, PLACA, 6);
        // vientre más oscuro (cara inferior del cuerpo, rect (42,0)..(60,24))
        skin.fill(42, 0, 18, 24, GRIS_OSCURO, 6);
        // pelaje curtido y cicatrices en los flancos
        skin.speckle(0, 28, 84, 10, 30, [96, 88, 82]);
        skin.px(4, 29, CICATRIZ); skin.px(5, 30, CICATRIZ);   // zarpazo (flanco +X)
        skin.px(6, 31, CICATRIZ); skin.px(7, 32, CICATRIZ);
        skin.px(50, 28, CICATRIZ); skin.px(51, 29, CICATRIZ); // zarpazo (flanco −X)
        skin.px(52, 30, CICATRIZ);

        // testuz acorazada (cara superior de la cabeza, rect (94,0)..(106,10))
        skin.fill(94, 0, 12, 10, PLACA, 7);
        // cara frontal de la cabeza: rect (94,10)..(106,20)
        skin.fill(94, 10, 12, 2, PLACA, 5);        // ceño hundido
        skin.px(95, 13, OJO_BLANCO);               // ojo izquierdo
        skin.px(96, 13, PUPILA);
        skin.px(103, 13, PUPILA);                  // ojo derecho
        skin.px(104, 13, OJO_BLANCO);
        skin.px(99, 15, GRIS_OSCURO);              // arrugas del morro
        skin.px(100, 15, GRIS_OSCURO);
        skin.fill(94, 18, 12, 2, BOCA, 4);         // fauces superiores
        skin.px(95, 18, DIENTE); skin.px(97, 18, DIENTE);     // colmillos de arriba
        skin.px(99, 18, DIENTE); skin.px(101, 18, DIENTE);
        skin.px(103, 18, DIENTE); skin.px(105, 18, DIENTE);
        // cicatriz en la mejilla (cara −X de la cabeza, rect (106,10)..(116,20))
        skin.px(111, 12, CICATRIZ); skin.px(111, 13, CICATRIZ);
        skin.px(111, 14, CICATRIZ); skin.px(111, 15, CICATRIZ);

        // mandíbula: interior de la boca (cara superior, rect (88,20)..(98,24))
        skin.fill(88, 20, 10, 4, BOCA, 5);
        // dientes que sobresalen (fila alta de la cara frontal, y=24)
        skin.px(88, 24, DIENTE); skin.px(90, 24, DIENTE);
        skin.px(92, 24, DIENTE); skin.px(94, 24, DIENTE);
        skin.px(96, 24, DIENTE);
        skin.px(85, 24, DIENTE);                   // colmillo lateral (+X)
        skin.px(100, 24, DIENTE);                  // colmillo lateral (−X)

        // cuerno: punta desgastada y anillo oscuro en la base
        skin.fill(112, 23, 10, 1, HUESO_SUCIO, 4);
        skin.fill(112, 26, 10, 1, GRIS_OSCURO, 4);

        // pata: muslo en sombra y pezuña acorazada
        skin.fill(0, 44, 24, 3, GRIS_OSCURO, 5);
        skin.fill(0, 53, 24, 3, PLACA, 4);
        skin.fill(12, 38, 6, 6, PLACA, 4);         // planta del pie
    },

    parts: [
        { name: 'cuerpo', size: [18, 14, 24], pivot: [0, 18, 0], origin: [-9, -6, -12], uv: [0, 0] },
        { name: 'cabeza', size: [12, 10, 10], pivot: [0, 21, -12], origin: [-6, -3, -10], uv: [84, 0], anim: 'head' },
        // la mandíbula comparte pivote con la cabeza para girar solidaria
        { name: 'mandibula', size: [10, 4, 4], pivot: [0, 21, -12], origin: [-5, -6, -12], uv: [84, 20], anim: 'head' },
        // cuernos curvados hacia delante como los del toro: en este motor la
        // rot X negativa inclina hacia −Z una caja que crece en +Y (el signo
        // positivo la barrería hacia atrás); la rot Z los abre hacia fuera
        { name: 'cuerno_i', size: [2, 4, 3], pivot: [0, 21, -12], origin: [-6, 6, -4], uv: [112, 20], rot: [-0.35, 0, 0.3], anim: 'head' },
        { name: 'cuerno_d', size: [2, 4, 3], pivot: [0, 21, -12], origin: [4, 6, -4], uv: [112, 20], rot: [-0.35, 0, -0.3], anim: 'head' },
        { name: 'pata_di', size: [6, 12, 6], pivot: [-5, 12, -8], origin: [-3, -12, -3], uv: [0, 38], anim: 'leg0' },
        { name: 'pata_dd', size: [6, 12, 6], pivot: [5, 12, -8], origin: [-3, -12, -3], uv: [0, 38], anim: 'leg1' },
        { name: 'pata_ti', size: [6, 12, 6], pivot: [-5, 12, 8], origin: [-3, -12, -3], uv: [0, 38], anim: 'leg1' },
        { name: 'pata_td', size: [6, 12, 6], pivot: [5, 12, 8], origin: [-3, -12, -3], uv: [0, 38], anim: 'leg0' },
    ],

    /** Voz: bramidos graves — diente de sierra que cae más aliento ronco. */
    voice: {
        say: [
            { f: 120, b: 0.6, d: 0.6, w: 'sawtooth', v: 0.3 },
            { noise: true, f: 200, q: 0.8, d: 0.5, v: 0.16, at: 0.05 },
        ],
        hurt: [
            { f: 170, b: 0.85, d: 0.22, w: 'sawtooth', v: 0.32 },
            { noise: true, f: 320, q: 1, d: 0.18, v: 0.2 },
        ],
        death: [
            { f: 130, b: 0.35, d: 0.9, w: 'sawtooth', v: 0.3 },
            { noise: true, f: 180, q: 0.7, d: 0.7, v: 0.18, at: 0.2 },
        ],
    },
};

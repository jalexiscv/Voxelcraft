/**
 * Ahogado: zombi de las profundidades, hostil cuerpo a cuerpo. Camina por el
 * fondo y por tierra (sin `aquatic`: el motor lo trata como caminante) y
 * aparece en el agua. Sigue el contrato de definición de mobs (ver model.js
 * para el formato de las partes y el desplegado UV; mobs.js/hostileAI para
 * el comportamiento). Humanoide con la pose clásica de brazos al frente
 * (rot X POSITIVA: en este motor el frente es −Z).
 *
 * Distribución de la piel 64×64 (idéntica a la del zombi):
 *   (0,0)   cabeza 8×8×8    → 32×16
 *   (0,16)  pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *   (16,16) torso 8×12×4    → 24×16
 *   (40,16) brazo 4×12×4    → 16×16 (ambos brazos comparten desplegado)
 *
 * Altura del modelo: 32 px (cabeza en 24..32) frente a un AABB de 1.8
 * bloques (28.8 px), dentro de la tolerancia del validador.
 */

const PIEL = [90, 140, 130];           // verde azulado de piel macerada
const PIEL_OSCURA = [64, 106, 100];    // sombras y carne reblandecida
const HARAPO = [52, 60, 66];           // ropa podrida, gris azulado oscuro
const HARAPO_OSCURO = [36, 42, 48];
const ALGA = [34, 92, 58];             // alga adherida, verde profundo
const ALGA_CLARA = [58, 132, 78];      // brote de alga más vivo
const OJO = [82, 236, 216];            // turquesa brillante de las cuencas
const OJO_HALO = [46, 150, 142];       // halo apagado alrededor del ojo

export default {
    id: 'ahogado',
    name: 'Ahogado',
    hostile: true,
    aabb: { w: 0.6, h: 1.8 },
    hp: 20,
    speed: 1.5,
    spawn: { cap: 3, group: 2, water: true },

    /** Persecución cuerpo a cuerpo, calcada del zombi de superficie. */
    behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, PIEL, 8);            // cabeza
        skin.fill(0, 16, 16, 16, HARAPO, 6);         // pierna (harapos)
        skin.fill(16, 16, 24, 16, HARAPO, 6);        // torso (harapos)
        skin.fill(40, 16, 16, 16, PIEL, 8);          // brazo

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.px(9, 11, OJO);                         // ojo izquierdo, turquesa
        skin.px(10, 11, OJO);
        skin.px(13, 11, OJO);                        // ojo derecho
        skin.px(14, 11, OJO);
        skin.px(9, 10, OJO_HALO);                    // halo tenue sobre los ojos
        skin.px(10, 10, OJO_HALO);
        skin.px(13, 10, OJO_HALO);
        skin.px(14, 10, OJO_HALO);
        skin.px(11, 13, PIEL_OSCURA);                // nariz hundida
        skin.px(12, 13, PIEL_OSCURA);
        skin.px(10, 14, HARAPO_OSCURO);              // boca entreabierta
        skin.px(11, 14, HARAPO_OSCURO);
        skin.px(12, 14, HARAPO_OSCURO);

        // algas colgando: mata en la coronilla (rect superior (8,0)..(16,8))
        skin.fill(9, 1, 4, 3, ALGA, 6);
        skin.px(13, 2, ALGA_CLARA);
        skin.px(10, 4, ALGA_CLARA);
        // hebras que caen por la frente y las sienes (caras laterales y frente)
        for (let y = 8; y <= 10; y++) skin.px(8, y, ALGA);       // frente, izquierda
        skin.px(11, 8, ALGA_CLARA);                              // hebra corta central
        skin.px(11, 9, ALGA);
        for (let y = 8; y <= 11; y++) skin.px(15, y, ALGA);      // frente, derecha
        for (let y = 8; y <= 12; y++) skin.px(2, y, ALGA);       // sien +X
        for (let y = 8; y <= 10; y++) skin.px(20, y, ALGA_CLARA); // sien −X
        for (let y = 8; y <= 13; y++) skin.px(27, y, ALGA);      // nuca

        // torso: rect frontal (20,20)..(28,32); algas colgando desde el cuello
        for (let y = 20; y <= 25; y++) skin.px(21, y, ALGA);
        skin.px(21, 26, ALGA_CLARA);
        for (let y = 20; y <= 22; y++) skin.px(24, y, ALGA_CLARA);
        for (let y = 20; y <= 27; y++) skin.px(26, y, ALGA);
        // jirones del harapo que dejan ver la piel macerada
        skin.speckle(16, 16, 24, 16, 14, HARAPO_OSCURO);
        skin.speckle(20, 27, 8, 5, 6, PIEL);
        skin.fill(20, 31, 8, 1, PIEL_OSCURA, 4);     // dobladillo deshecho

        // piernas: harapos rotos y pies descalzos (filas inferiores de las caras)
        skin.speckle(0, 16, 16, 16, 10, HARAPO_OSCURO);
        skin.fill(0, 29, 16, 3, PIEL, 8);            // tobillos y pies desnudos
        skin.fill(8, 16, 4, 4, PIEL_OSCURA, 5);      // planta del pie (rect abajo)

        // brazos: restos de manga arriba, carne hinchada y un alga enredada
        skin.fill(40, 20, 16, 3, HARAPO, 6);         // manga hecha trizas
        skin.speckle(40, 20, 16, 3, 5, HARAPO_OSCURO);
        skin.speckle(40, 24, 16, 8, 10, PIEL_OSCURA);
        for (let y = 25; y <= 29; y++) skin.px(46, y, ALGA);     // alga en la muñeca
        skin.px(46, 30, ALGA_CLARA);
    },

    parts: [
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [16, 16] },
        // brazos extendidos al frente (pose zombi); en este motor (+Y arriba,
        // frente −Z) la extensión al frente exige rot X POSITIVA
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg1' },
    ],

    /** Voz: gorgoteo grave — burbujeo de ruido filtrado sobre un tono hundido. */
    voice: {
        say: [
            { noise: true, f: 250, q: 1, d: 0.4, v: 0.2 },
            { f: 90, b: 0.7, d: 0.5, w: 'sawtooth', v: 0.18, at: 0.05 },
        ],
        hurt: [
            { noise: true, f: 380, q: 1.2, d: 0.18, v: 0.26 },
            { f: 130, b: 0.9, d: 0.14, w: 'sawtooth', v: 0.24 },
        ],
        death: [
            { noise: true, f: 300, q: 0.9, d: 0.5, v: 0.24 },
            { f: 90, b: 0.35, d: 0.8, w: 'sawtooth', v: 0.24 },
            { noise: true, f: 170, q: 0.8, d: 0.4, v: 0.14, at: 0.32 },   // última burbuja
        ],
    },
};

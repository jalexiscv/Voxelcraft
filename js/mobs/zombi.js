/**
 * Zombi: mob hostil cuerpo a cuerpo, humanoide clásico de brazos extendidos.
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js/hostileAI para el comportamiento).
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

const PIEL = [96, 150, 90];            // verde zombi
const PIEL_OSCURA = [72, 116, 70];     // sombras y carne descompuesta
const CAMISETA = [58, 92, 150];        // azul desgastado
const CAMISETA_OSCURA = [44, 70, 118];
const PANTALON = [66, 58, 116];        // azul-morado oscuro
const OJO = [24, 32, 24];              // cuenca hundida, casi negra

export default {
    id: 'zombi',
    name: 'Zombi',
    hostile: true,
    aabb: { w: 0.6, h: 1.8 },
    hp: 20,
    speed: 1.6,
    spawn: { cap: 4, group: 2 },

    /** Persecución cuerpo a cuerpo lenta pero insistente. */
    behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, PIEL, 9);            // cabeza
        skin.fill(0, 16, 16, 16, PANTALON, 7);       // pierna
        skin.fill(16, 16, 24, 16, CAMISETA, 8);      // torso
        skin.fill(40, 16, 16, 16, PIEL, 9);          // brazo

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.px(9, 10, PIEL_OSCURA);                 // cuencas hundidas
        skin.px(10, 10, PIEL_OSCURA);
        skin.px(13, 10, PIEL_OSCURA);
        skin.px(14, 10, PIEL_OSCURA);
        skin.px(9, 11, OJO);                          // ojo izquierdo
        skin.px(10, 11, OJO);
        skin.px(13, 11, OJO);                         // ojo derecho
        skin.px(14, 11, OJO);
        skin.px(11, 13, PIEL_OSCURA);                 // nariz podrida
        skin.px(12, 13, PIEL_OSCURA);
        skin.px(10, 14, OJO);                         // boca entreabierta
        skin.px(11, 14, OJO);
        skin.px(12, 14, OJO);

        // carne en descomposición por cabeza y brazos
        skin.speckle(0, 0, 32, 16, 18, PIEL_OSCURA);
        skin.speckle(40, 16, 16, 16, 12, PIEL_OSCURA);
        // camiseta desgastada: rozaduras y un jirón que deja ver la piel
        skin.speckle(16, 16, 24, 16, 16, CAMISETA_OSCURA);
        skin.speckle(20, 24, 8, 8, 4, PIEL);
        // pantalón con rotos que muestran la piel
        skin.speckle(0, 20, 16, 12, 8, PIEL);
    },

    parts: [
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [16, 16] },
        // brazos extendidos al frente (pose zombi), con balanceo suave; en
        // este motor (+Y arriba, frente −Z) el brazo caído gira al frente
        // con rx positivo: rx=−1.5 lo dejaría extendido hacia la espalda
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg1' },
    ],

    /** Voz: gemidos graves sintetizados (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 95, b: 0.75, d: 0.7, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 140, b: 0.9, d: 0.16, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 110, b: 0.35, d: 0.9, w: 'sawtooth', v: 0.28 }],
    },
};

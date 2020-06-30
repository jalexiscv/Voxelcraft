/**
 * Zombi aldeano: mob hostil cuerpo a cuerpo, aldeano infectado. Conserva la
 * cabeza alargada y la nariz prominente del aldeano, pero con piel verde
 * zombi, túnica rasgada y los brazos extendidos al frente. Sigue el contrato
 * de definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8   → 32×18
 *   (32,0)  nariz 2×4×2     → 8×6
 *   (0,18)  torso 8×12×6    → 28×18 (túnica)
 *   (28,18) brazo 4×12×4    → 16×16 (ambos brazos comparten desplegado)
 *   (44,18) pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 34 px (cabeza en 24..34) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const PIEL = [96, 150, 90];            // verde zombi
const PIEL_OSCURA = [72, 116, 70];     // sombras y carne descompuesta
const TUNICA = [110, 80, 55];          // marrón de la túnica rasgada
const TUNICA_OSCURA = [86, 62, 42];    // dobladillo y desgaste de la tela
const PANTALON = [58, 48, 38];         // piernas oscuras bajo la túnica
const PELO = [74, 54, 36];             // pelo castaño que conserva de aldeano
const CEJA = [50, 40, 26];             // ceja única, casi negra
const OJO = [24, 32, 24];              // cuenca hundida, casi negra

export default {
    id: 'zombi_aldeano',
    name: 'Zombi aldeano',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 20,
    speed: 1.5,
    spawn: { cap: 2, group: 1 },

    /** Persecución cuerpo a cuerpo, igual de insistente que el zombi. */
    behavior: { aggro: 16, attackRange: 1.7, damage: 3, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 18, PIEL, 9);          // cabeza
        skin.fill(8, 0, 16, 8, PELO, 7);           // coronilla y nuca (arriba/abajo)
        skin.fill(32, 0, 8, 6, PIEL, 7);           // nariz
        skin.fill(0, 18, 28, 18, TUNICA, 8);       // torso (túnica)
        skin.fill(28, 18, 16, 16, PIEL, 9);        // brazo
        skin.fill(44, 18, 16, 16, PANTALON, 6);    // pierna

        // cara frontal de la cabeza: rect (8,8)..(16,18)
        for (let x = 9; x <= 14; x++) skin.px(x, 11, CEJA); // ceja única de aldeano
        skin.px(9, 12, PIEL_OSCURA);               // cuencas hundidas
        skin.px(14, 12, PIEL_OSCURA);
        skin.px(10, 12, OJO);                      // ojo izquierdo
        skin.px(13, 12, OJO);                      // ojo derecho
        skin.px(10, 15, OJO);                      // boca entreabierta
        skin.px(11, 15, OJO);
        skin.px(12, 15, OJO);

        // nariz: fosas en la cara frontal (34,2)..(36,6)
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // carne en descomposición por cabeza y brazos
        skin.speckle(0, 0, 32, 16, 18, PIEL_OSCURA);
        skin.speckle(28, 18, 16, 16, 12, PIEL_OSCURA);
        // túnica rasgada: dobladillo oscuro, rozaduras y jirones que dejan ver la piel
        skin.fill(0, 34, 28, 2, TUNICA_OSCURA, 4);
        skin.speckle(0, 18, 28, 16, 16, TUNICA_OSCURA);
        skin.speckle(6, 24, 8, 12, 5, PIEL);
        // pantalón con rotos que muestran la piel
        skin.speckle(44, 22, 16, 12, 8, PIEL);
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 12, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // nariz prominente que sobresale del frente (−Z) y gira con la cabeza
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 2, -6], uv: [32, 0], anim: 'head' },
        // brazos extendidos al frente (pose zombi): en este motor (+Y arriba,
        // frente −Z) el brazo caído gira al frente con rx POSITIVO
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [28, 18], rot: [1.5, 0, 0], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [28, 18], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [44, 18], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [44, 18], anim: 'leg1' },
    ],

    /** Voz: gemido grave de zombi rematado con un "hmm" nasal de aldeano. */
    voice: {
        say: [
            { f: 92, b: 0.75, d: 0.6, w: 'sawtooth', v: 0.22 },
            { f: 210, b: 0.85, d: 0.28, w: 'sawtooth', v: 0.17, at: 0.5 },
        ],
        hurt: [{ f: 140, b: 0.9, d: 0.16, w: 'sawtooth', v: 0.28 }],
        death: [
            { f: 105, b: 0.35, d: 0.9, w: 'sawtooth', v: 0.28 },
            { f: 180, b: 0.55, d: 0.35, w: 'sawtooth', v: 0.18, at: 0.6 },
        ],
    },
};

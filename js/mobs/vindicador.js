/**
 * Vindicador: mob hostil cuerpo a cuerpo de la familia del saqueador. Humanoide
 * de piel gris cetrina, ceño fruncido y casaca azul oscura que carga con el
 * brazo derecho extendido al frente sosteniendo un hacha de hierro. Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8  → 32×18     (32,0)  nariz 2×4×2  → 8×6
 *   (0,18)  torso 8×12×6   → 28×18     (32,18) brazo 4×12×4 → 16×16 (ambos brazos comparten desplegado)
 *   (0,36)  pierna 4×12×4  → 16×16 (ambas piernas comparten desplegado)
 *   (16,36) mango 1×8×1    → 4×9       (24,36) filo 3×4×1   → 8×5
 *
 * Altura del modelo: 34 px (cabeza en 24..34) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const PIEL = [146, 150, 136];          // gris cetrino de la familia del saqueador
const PIEL_OSCURA = [112, 116, 102];   // cuencas hundidas y sombras de la cara
const PELO = [50, 44, 38];             // melena castaño oscuro, casi negra
const CEJA = [54, 56, 48];             // ceño único, cargado sobre la nariz
const OJO_BLANCO = [240, 240, 240];
const OJO_VERDE = [74, 112, 76];       // iris verde característico de la familia
const CASACA = [55, 65, 95];           // azul oscuro de la casaca
const CASACA_OSCURA = [42, 50, 74];    // cuello, dobladillo y desgaste de la tela
const PANTALON = [52, 54, 58];         // gris carbón de las piernas
const BOTA = [38, 38, 40];             // botas casi negras
const MADERA = [110, 80, 50];          // mango del hacha
const HIERRO = [190, 194, 200];        // filo de hierro
const HIERRO_OSCURO = [142, 147, 154]; // sombras y mellas del metal

export default {
    id: 'vindicador',
    name: 'Vindicador',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 24,
    speed: 2.2,
    spawn: { cap: 2, group: 1, night: true },

    /** Carga rápida y golpes de hacha contundentes cuerpo a cuerpo. */
    behavior: { aggro: 16, attackRange: 1.9, damage: 5, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 18, PIEL, 8);           // cabeza
        skin.fill(8, 0, 16, 8, PELO, 6);            // coronilla y nuca (arriba/abajo)
        skin.fill(32, 0, 8, 6, PIEL, 6);            // nariz
        skin.fill(0, 18, 28, 18, CASACA, 8);        // torso (casaca)
        skin.fill(32, 18, 16, 16, CASACA, 8);       // brazo (manga)
        skin.fill(0, 36, 16, 16, PANTALON, 6);      // pierna
        skin.fill(16, 36, 4, 9, MADERA, 7);         // mango del hacha
        skin.fill(24, 36, 8, 5, HIERRO, 6);         // filo del hacha

        // franja de pelo alrededor de las cuatro caras y melena en la nuca
        skin.fill(0, 8, 32, 2, PELO, 6);
        skin.fill(24, 10, 8, 3, PELO, 6);

        // cara frontal de la cabeza: rect (8,8)..(16,18)
        for (let x = 9; x <= 14; x++) skin.px(x, 10, CEJA); // ceja única
        skin.px(11, 11, CEJA);                      // el ceño cae sobre la nariz
        skin.px(12, 11, CEJA);
        skin.px(9, 11, PIEL_OSCURA);                // cuencas hundidas
        skin.px(10, 11, PIEL_OSCURA);
        skin.px(13, 11, PIEL_OSCURA);
        skin.px(14, 11, PIEL_OSCURA);
        skin.px(9, 12, OJO_BLANCO);                 // ojo izquierdo
        skin.px(10, 12, OJO_VERDE);
        skin.px(13, 12, OJO_VERDE);                 // ojo derecho
        skin.px(14, 12, OJO_BLANCO);
        skin.fill(10, 15, 4, 1, PIEL_OSCURA);       // boca apretada, gesto torvo

        // nariz: fosas en la cara frontal (34,2)..(36,6)
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // casaca: cuello y dobladillo oscuros, tela ajada
        skin.fill(0, 24, 28, 1, CASACA_OSCURA, 3);
        skin.fill(0, 34, 28, 2, CASACA_OSCURA, 4);
        skin.speckle(0, 18, 28, 16, 14, CASACA_OSCURA);

        // manos grises asomando al final de las mangas
        skin.fill(32, 30, 16, 4, PIEL, 7);          // últimas filas del brazo
        skin.fill(40, 18, 4, 4, PIEL, 6);           // cara inferior (puño)

        // botas oscuras al pie de las piernas
        skin.fill(0, 49, 16, 3, BOTA, 4);

        // hacha: empuñadura reforzada, contrafilo sombreado y filo bruñido
        skin.fill(16, 41, 4, 2, [88, 62, 38], 4);   // vendas de la empuñadura
        skin.fill(25, 37, 3, 1, HIERRO_OSCURO);     // lomo del filo
        skin.fill(25, 40, 3, 1, [224, 228, 234]);   // borde cortante, recién afilado
        skin.speckle(24, 36, 8, 5, 4, HIERRO_OSCURO); // mellas del metal
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 12, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // nariz prominente que sobresale del frente (−Z) y gira con la cabeza
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 2, -6], uv: [32, 0], anim: 'head' },
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [32, 18], anim: 'arm1' },
        // brazo derecho extendido al frente blandiendo el hacha; en este motor
        // (+Y arriba, frente −Z) rot X POSITIVA lleva la mano al frente
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [32, 18], rot: [1.5, 0, 0], anim: 'arm0' },
        // hacha solidaria al brazo derecho: mismo pivote, misma pose y anim
        { name: 'mango', size: [1, 8, 1], pivot: [6, 22, 0], origin: [-0.5, -15, -0.5], uv: [16, 36], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'filo', size: [3, 4, 1], pivot: [6, 22, 0], origin: [-1.5, -15, -0.5], uv: [24, 36], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 36], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 36], anim: 'leg1' },
    ],

    /** Voz: gruñido agresivo doble, gutural (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 155, b: 0.7, d: 0.16, w: 'sawtooth', v: 0.24, at: 0 },
            { f: 125, b: 0.55, d: 0.22, w: 'sawtooth', v: 0.26, at: 0.2 },
        ],
        hurt: [
            { f: 210, b: 0.9, d: 0.11, w: 'sawtooth', v: 0.3, at: 0 },
            { f: 175, b: 0.85, d: 0.12, w: 'sawtooth', v: 0.28, at: 0.13 },
        ],
        death: [
            { f: 170, b: 0.5, d: 0.28, w: 'sawtooth', v: 0.3, at: 0 },
            { f: 110, b: 0.35, d: 0.5, w: 'sawtooth', v: 0.26, at: 0.24 },
        ],
    },
};

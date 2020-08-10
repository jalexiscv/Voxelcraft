/**
 * Evocador: mob hostil hechicero. Silueta de aldeano (cabeza alargada, nariz
 * prominente y brazos plegados) vestido con túnica negra de detalles dorados
 * y fajín rojo. Ataca a distancia con proyectiles mágicos y aparece solo, de
 * noche. Sigue el contrato de definición de mobs (ver model.js para el
 * formato de las partes y el desplegado UV; mobs.js/hostileAI para el
 * comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8   → 32×18
 *   (32,0)  nariz 2×4×2     → 8×6
 *   (0,18)  torso 8×12×6    → 28×18
 *   (0,36)  brazos 10×4×4   → 28×8 (una sola caja de brazos plegados)
 *   (0,44)  pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 34 px (cabeza en 24..34) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const TUNICA = [35, 35, 40];           // negro azabache de la túnica
const TUNICA_OSCURA = [24, 24, 28];    // pliegues y desgaste de la tela
const DORADO = [200, 170, 80];         // galones y ribetes dorados
const DORADO_OSCURO = [156, 128, 56];  // sombra del bordado
const FAJIN = [152, 38, 38];           // fajín rojo a la cintura
const PIEL = [168, 170, 162];          // piel gris pálida de los brujos
const PIEL_OSCURA = [128, 130, 122];   // sombra de la nariz y arrugas
const PELO = [38, 36, 34];             // pelo negro repeinado
const CEJA = [26, 24, 22];             // ceño fruncido, casi negro
const OJO_BLANCO = [236, 236, 232];
const OJO_VERDE = [72, 128, 66];       // iris verde de los saqueadores

export default {
    id: 'evocador',
    name: 'Evocador',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 24,
    speed: 1.3,
    spawn: { cap: 1, group: 1, night: true },

    /** Hechicero de media distancia: conjura proyectiles con calma. */
    behavior: { aggro: 14, projectile: true, damage: 3, cooldown: 3.0 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 18, PIEL, 6);          // cabeza
        skin.fill(8, 0, 16, 8, PELO, 4);           // coronilla y nuca (arriba/abajo)
        skin.fill(32, 0, 8, 6, PIEL, 5);           // nariz
        skin.fill(0, 18, 28, 18, TUNICA, 5);       // torso (túnica negra)
        skin.fill(0, 36, 28, 8, TUNICA, 5);        // brazos plegados (mangas)
        skin.fill(0, 44, 16, 16, TUNICA_OSCURA, 4);// piernas bajo la túnica

        // cara frontal de la cabeza: rect (8,8)..(16,18)
        skin.px(9, 10, CEJA);                      // ceño maligno: cejas caídas
        skin.px(10, 11, CEJA);                     //   hacia el centro
        skin.px(13, 11, CEJA);
        skin.px(14, 10, CEJA);
        skin.px(9, 12, OJO_BLANCO);                // ojo izquierdo
        skin.px(10, 12, OJO_VERDE);
        skin.px(13, 12, OJO_VERDE);                // ojo derecho
        skin.px(14, 12, OJO_BLANCO);
        skin.px(10, 16, CEJA);                     // boca torcida en mueca
        skin.px(11, 15, CEJA);
        skin.px(12, 15, CEJA);
        skin.px(13, 16, CEJA);

        // nariz: fosas sombreadas en la cara frontal (34,2)..(36,6)
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // túnica: galón dorado vertical por el pecho, rect frontal (6,24)..(14,36)
        skin.fill(9, 24, 2, 12, DORADO, 6);
        skin.px(9, 27, DORADO_OSCURO);             // relieve del bordado
        skin.px(10, 31, DORADO_OSCURO);
        // fajín rojo a la cintura, rodeando los cuatro costados
        skin.fill(0, 29, 28, 2, FAJIN, 5);
        // dobladillo dorado al pie de la túnica y pliegues de la tela
        skin.fill(0, 34, 28, 2, DORADO_OSCURO, 6);
        skin.speckle(0, 18, 28, 11, 12, TUNICA_OSCURA);

        // brazos plegados: puños dorados y manos grises a la vista
        skin.fill(4, 40, 2, 4, DORADO, 5);         // puño derecho (frente)
        skin.fill(12, 40, 2, 4, DORADO, 5);        // puño izquierdo (frente)
        skin.fill(0, 40, 4, 4, PIEL, 5);           // mano derecha (+X)
        skin.fill(14, 40, 4, 4, PIEL, 5);          // mano izquierda (−X)

        // botas oscuras al final de las piernas
        skin.fill(0, 58, 16, 2, [16, 16, 20], 3);
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 12, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // nariz prominente que sobresale del frente (−Z) y gira con la cabeza
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 2, -6], uv: [32, 0], anim: 'head' },
        // brazos plegados: una sola caja horizontal delante del pecho, sin balanceo
        { name: 'brazos', size: [10, 4, 4], pivot: [0, 18, 0], origin: [-5, 0, -7], uv: [0, 36], anim: 'none' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 44], anim: 'leg1' },
    ],

    /** Voz: canturreo grave de tres tonos sine (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 300, b: 0.95, d: 0.15, w: 'sine', v: 0.22, at: 0 },
            { f: 350, b: 0.95, d: 0.15, w: 'sine', v: 0.22, at: 0.18 },
            { f: 250, b: 0.9, d: 0.15, w: 'sine', v: 0.22, at: 0.36 },
        ],
        hurt: [{ f: 460, b: 0.8, d: 0.12, w: 'sine', v: 0.28 }],
        death: [
            { f: 300, b: 0.6, d: 0.3, w: 'sine', v: 0.28, at: 0 },
            { f: 190, b: 0.45, d: 0.45, w: 'sine', v: 0.26, at: 0.28 },
        ],
    },
};

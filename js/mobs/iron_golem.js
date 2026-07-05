/**
 * Golem de hierro: guardián neutral, lento y demoledor. Pasivo hasta que se
 * le hiere; entonces persigue y golpea con un daño enorme. Sigue el contrato
 * de definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   torso 14×14×8   → 44×22
 *   (44,0)  cabeza 6×8×6    → 24×14
 *   (68,0)  nariz 2×4×2     → 8×6
 *   (0,24)  brazo 4×20×4    → 16×24 (ambos brazos comparten desplegado)
 *   (20,24) pierna 5×12×5   → 20×17 (ambas piernas comparten desplegado)
 *
 * Altura del modelo: 34 px (cabeza en 26..34) frente a un AABB de 2.5
 * bloques (40 px), dentro de la tolerancia del validador. Los brazos
 * colgantes bajan hasta y=5, casi rozando el suelo, como el golem clásico.
 */
import { ITEMS } from '../items.js';

const HIERRO = [200, 200, 195];        // hierro claro
const HIERRO_OSCURO = [168, 168, 162]; // juntas y sombras del metal
const OXIDO = [150, 90, 70];           // vetas de óxido
const HIEDRA = [90, 130, 60];          // hiedra trepadora
const OJO = [70, 66, 62];              // cuenca hundida
const OJO_ROJO = [150, 60, 50];        // brillo rojizo de la mirada

export default {
    id: 'iron_golem',
    name: 'Golem de hierro',
    hostile: false,
    aabb: { w: 1.4, h: 2.5 },
    hp: 40,
    speed: 1.4,
    spawn: { cap: 1, group: 1 },
    // botín: lingotes del hierro con el que está forjado
    drops: [{ id: ITEMS.LINGOTE_HIERRO, min: 1, max: 2 }],

    /** Neutral: solo ataca al ser herido, pero entonces no perdona. */
    behavior: { neutral: true, aggro: 14, attackRange: 2.2, damage: 8, cooldown: 1.6 },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 44, 22, HIERRO, 6);          // torso
        skin.fill(44, 0, 24, 14, HIERRO, 6);         // cabeza
        skin.fill(68, 0, 8, 6, HIERRO_OSCURO, 5);    // nariz
        skin.fill(0, 24, 16, 24, HIERRO, 6);         // brazo
        skin.fill(20, 24, 20, 17, HIERRO, 6);        // pierna

        // cara frontal de la cabeza: rect (50,6)..(56,14); ceño y ojos hundidos
        skin.px(51, 7, HIERRO_OSCURO);                // ceja izquierda
        skin.px(54, 7, HIERRO_OSCURO);                // ceja derecha
        skin.px(51, 8, OJO);                          // ojo izquierdo
        skin.px(51, 9, OJO_ROJO);
        skin.px(54, 8, OJO);                          // ojo derecho
        skin.px(54, 9, OJO_ROJO);

        // vetas de óxido: grieta diagonal por el pecho, rect frontal (8,8)..(22,22)
        skin.px(10, 9, OXIDO);
        skin.px(11, 10, OXIDO);
        skin.px(11, 11, OXIDO);
        skin.px(12, 12, OXIDO);
        skin.px(13, 13, OXIDO);
        skin.px(13, 14, OXIDO);
        skin.px(14, 15, OXIDO);
        skin.px(15, 16, OXIDO);
        skin.px(15, 17, OXIDO);
        skin.px(16, 18, OXIDO);
        // veta que baja por el brazo, rect frontal (4,28)..(8,48)
        skin.px(5, 30, OXIDO);
        skin.px(5, 31, OXIDO);
        skin.px(6, 32, OXIDO);
        skin.px(6, 33, OXIDO);
        skin.px(6, 34, OXIDO);
        skin.px(5, 35, OXIDO);
        // desconchones oxidados repartidos por torso, cabeza y piernas
        skin.speckle(0, 0, 44, 22, 22, OXIDO);
        skin.speckle(44, 0, 24, 14, 8, OXIDO);
        skin.speckle(20, 24, 20, 17, 10, OXIDO);
        skin.speckle(0, 24, 16, 24, 10, OXIDO);

        // hiedra trepadora: mata en el costado del torso, rect +X (0,8)..(8,22)
        skin.px(2, 20, HIEDRA);
        skin.px(3, 19, HIEDRA);
        skin.px(2, 18, HIEDRA);
        skin.px(3, 17, HIEDRA);
        skin.px(4, 16, HIEDRA);
        skin.px(3, 15, HIEDRA);
        skin.px(4, 14, HIEDRA);
        skin.px(5, 13, HIEDRA);
        skin.px(4, 12, HIEDRA);
        // brotes sueltos por hombro y pierna
        skin.speckle(8, 0, 14, 8, 6, HIEDRA);         // tapa del torso (hombros)
        skin.speckle(20, 29, 20, 12, 8, HIEDRA);      // pierna
        skin.speckle(30, 8, 14, 14, 6, HIEDRA);       // espalda del torso
    },

    parts: [
        { name: 'torso', size: [14, 14, 8], pivot: [0, 12, 0], origin: [-7, 0, -4], uv: [0, 0] },
        { name: 'cabeza', size: [6, 8, 6], pivot: [0, 26, 0], origin: [-3, 0, -3], uv: [44, 0], anim: 'head' },
        // nariz larga saliente hacia el frente (−Z), solidaria con la cabeza
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 26, 0], origin: [-1, 1, -5], uv: [68, 0], anim: 'head' },
        // brazos colgantes larguísimos, casi rozan el suelo
        { name: 'brazo_i', size: [4, 20, 4], pivot: [-9, 24, 0], origin: [-2, -19, -2], uv: [0, 24], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 20, 4], pivot: [9, 24, 0], origin: [-2, -19, -2], uv: [0, 24], anim: 'arm0' },
        { name: 'pierna_i', size: [5, 12, 5], pivot: [-2.5, 12, 0], origin: [-2.5, -12, -2.5], uv: [20, 24], anim: 'leg0' },
        { name: 'pierna_d', size: [5, 12, 5], pivot: [2.5, 12, 0], origin: [-2.5, -12, -2.5], uv: [20, 24], anim: 'leg1' },
    ],

    /** Voz: crujido metálico (ruido grave) sobre un zumbido de hierro. */
    voice: {
        say: [
            { noise: true, f: 200, q: 1, d: 0.3, v: 0.25 },
            { f: 90, b: 0.9, d: 0.35, w: 'sine', v: 0.2, at: 0.02 },
        ],
        hurt: [
            { noise: true, f: 260, q: 1, d: 0.2, v: 0.3 },
            { f: 120, b: 0.8, d: 0.2, w: 'sine', v: 0.24, at: 0.02 },
        ],
        death: [
            { noise: true, f: 160, q: 0.8, d: 0.6, v: 0.3 },
            { f: 70, b: 0.4, d: 0.8, w: 'sine', v: 0.26, at: 0.05 },
        ],
    },

    // sin say: la carpeta solo tiene pasos y efectos (walk/crack/repair/throw), no hay vocalización ambiente
    sonidos: {
        hurt: ['mob/irongolem/hit'],
        death: ['mob/irongolem/death'],
    },
};

/**
 * Bruja: mob hostil a distancia. Silueta de aldeana (cabeza alta con nariz
 * colgante y verruga, torso-túnica, brazos plegados sobre el pecho, piernas)
 * coronada por un sombrero puntiagudo de tres pisos. Mantiene la distancia y
 * lanza pociones (behavior.projectile, ver hostileAI en mobs.js).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×10×8        → 32×18
 *   (32,0)  pierna 4×12×4        → 16×16 (ambas piernas comparten desplegado)
 *   (48,0)  nariz 2×4×2          → 8×6
 *   (56,0)  verruga 1×1×1        → 4×2
 *   (0,18)  torso-túnica 8×12×6  → 28×18
 *   (28,18) brazos plegados 10×4×4 → 28×8
 *   (0,36)  sombrero ala 6×2×6   → 24×8
 *   (24,36) sombrero medio 4×3×4 → 16×7
 *   (40,36) sombrero punta 2×3×2 → 8×5
 *
 * Altura del modelo: 42 px (punta del sombrero) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

import { ITEMS } from '../items.js';

const TUNICA = [50, 40, 70];           // negro violáceo de túnica y sombrero
const TUNICA_OSCURA = [38, 30, 54];    // pliegues y desgaste de la tela
const PELO = [30, 24, 44];             // cabello y botas, casi negro
const PIEL = [145, 132, 126];          // piel grisácea de aldeana
const PIEL_OSCURA = [116, 104, 100];   // sombras del rostro y la nariz
const VERDE = [104, 168, 76];          // verruga y banda del sombrero
const VERDE_OSCURO = [62, 110, 50];    // fajín, dobladillo y puños
const BLANCO = [235, 233, 228];        // esclerótica
const PUPILA = [70, 40, 90];           // mirada violeta
const BOCA = [58, 40, 48];             // sonrisa torcida

export default {
    id: 'bruja',
    name: 'Bruja',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 26,
    speed: 1.4,
    spawn: { cap: 2, group: 1 },
    // Botín: pólvora y palos (ingredientes de sus pociones y de su escoba)
    drops: [
        { id: ITEMS.POLVORA, min: 0, max: 2 },
        { id: ITEMS.PALO, min: 0, max: 2 },
    ],

    /** Mantiene la distancia y lanza pociones arrojadizas. */
    behavior: { aggro: 14, projectile: true, damage: 2, cooldown: 2.6 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 18, PIEL, 7);            // cabeza
        skin.fill(32, 0, 16, 16, TUNICA, 6);         // pierna
        skin.fill(48, 0, 8, 6, PIEL, 7);             // nariz
        skin.fill(56, 0, 4, 2, VERDE, 8);            // verruga
        skin.fill(0, 18, 28, 18, TUNICA, 7);         // torso-túnica
        skin.fill(28, 18, 28, 8, TUNICA, 7);         // brazos plegados
        skin.fill(0, 36, 24, 8, TUNICA, 7);          // sombrero: ala
        skin.fill(24, 36, 16, 7, TUNICA, 7);         // sombrero: piso medio
        skin.fill(40, 36, 8, 5, TUNICA, 7);          // sombrero: punta

        // cabello: tapa de la cabeza y flequillo alrededor (filas 8..10)
        skin.fill(8, 0, 16, 8, PELO, 5);
        skin.fill(0, 8, 32, 2, PELO, 5);

        // cara frontal de la cabeza: rect (8,8)..(16,18)
        skin.fill(9, 10, 2, 1, PELO);                 // ceja izquierda
        skin.fill(13, 10, 2, 1, PELO);                // ceja derecha
        skin.px(9, 12, BLANCO);                       // ojo izquierdo
        skin.px(10, 12, PUPILA);
        skin.px(13, 12, PUPILA);                      // ojo derecho
        skin.px(14, 12, BLANCO);
        skin.px(10, 15, BOCA);                        // sonrisa torcida
        skin.px(11, 15, BOCA);
        skin.px(12, 15, BOCA);
        skin.px(13, 14, BOCA);                        // comisura levantada
        skin.speckle(0, 8, 32, 10, 8, PIEL_OSCURA);   // arrugas de la cara

        // nariz: fosas sombreadas en la punta de la cara frontal (50,2)..(52,6)
        skin.px(50, 5, PIEL_OSCURA);
        skin.px(51, 5, PIEL_OSCURA);

        // túnica: fajín verde, dobladillo verde y tela ajada
        skin.fill(0, 27, 28, 1, VERDE_OSCURO);        // fajín a media altura
        skin.fill(0, 35, 28, 1, VERDE_OSCURO);        // dobladillo inferior
        skin.speckle(0, 24, 28, 11, 16, TUNICA_OSCURA);

        // brazos plegados: manos al centro del rect frontal (32,22)..(42,26)
        skin.fill(35, 23, 2, 3, PIEL, 5);             // mano izquierda
        skin.fill(39, 23, 2, 3, PIEL, 5);             // mano derecha
        skin.fill(28, 22, 4, 1, VERDE_OSCURO);        // puño de la manga +X
        skin.fill(42, 22, 4, 1, VERDE_OSCURO);        // puño de la manga −X
        skin.speckle(32, 18, 10, 4, 6, TUNICA_OSCURA);

        // piernas: botas oscuras en el tramo inferior (filas 12..16)
        skin.fill(32, 12, 16, 4, PELO, 4);

        // sombrero: banda verde en el ala y tela raída hacia la punta
        skin.fill(0, 42, 24, 1, VERDE);               // banda del ala
        skin.speckle(24, 36, 16, 7, 8, TUNICA_OSCURA);
        skin.speckle(40, 36, 8, 5, 5, TUNICA_OSCURA);
    },

    parts: [
        { name: 'torso', size: [8, 12, 6], pivot: [0, 12, 0], origin: [-4, 0, -3], uv: [0, 18] },
        { name: 'cabeza', size: [8, 10, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        // nariz colgante de aldeana, asomando por la cara (−Z)
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 2, -6], uv: [48, 0], anim: 'head' },
        // verruga verde pegada al costado izquierdo de la nariz
        { name: 'verruga', size: [1, 1, 1], pivot: [0, 24, 0], origin: [-2, 3, -6], uv: [56, 0], anim: 'head' },
        // sombrero puntiagudo: pila de 3 cajas decrecientes sobre la cabeza
        { name: 'sombrero_ala', size: [6, 2, 6], pivot: [0, 24, 0], origin: [-3, 10, -3], uv: [0, 36], anim: 'head' },
        { name: 'sombrero_medio', size: [4, 3, 4], pivot: [0, 24, 0], origin: [-2, 12, -2], uv: [24, 36], anim: 'head' },
        { name: 'sombrero_punta', size: [2, 3, 2], pivot: [0, 24, 0], origin: [-1, 15, -1], uv: [40, 36], anim: 'head' },
        // brazos plegados: una sola caja apoyada delante del pecho (el torso
        // llega hasta z = −3), sin balanceo
        { name: 'brazos', size: [10, 4, 4], pivot: [0, 21, 0], origin: [-5, -2, -7], uv: [28, 18] },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [32, 0], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [32, 0], anim: 'leg1' },
    ],

    /** Voz: risita en ráfaga de notas cuadradas ascendentes (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 500, b: 1.2, d: 0.07, w: 'square', v: 0.18, at: 0 },
            { f: 650, b: 1.2, d: 0.07, w: 'square', v: 0.18, at: 0.09 },
            { f: 800, b: 1.25, d: 0.07, w: 'square', v: 0.16, at: 0.18 },
        ],
        hurt: [{ f: 900, b: 0.7, d: 0.12, w: 'square', v: 0.26 }],
        death: [
            { f: 800, b: 0.9, d: 0.09, w: 'square', v: 0.24, at: 0 },
            { f: 650, b: 0.85, d: 0.09, w: 'square', v: 0.22, at: 0.11 },
            { f: 500, b: 0.8, d: 0.1, w: 'square', v: 0.2, at: 0.22 },
            { f: 360, b: 0.5, d: 0.3, w: 'square', v: 0.18, at: 0.34 },
        ],
    },
};

/**
 * Murciélago: mob pasivo volador (flying: sin gravedad, ver mobs.js) que
 * aparece en cuevas. Cuerpo compacto marrón oscuro con dos alas membranosas
 * grandes en aleteo continuo (flapL/flapR; ver model.js para el formato de
 * las partes y el desplegado UV; cerdo.js es el ejemplo canónico del
 * contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 3×4×3  → 12×7
 *   (0,10)  cabeza 4×4×4  → 16×8
 *   (20,10) oreja 1×2×1   → 4×3  (las dos orejas comparten desplegado)
 *   (0,24)  ala 7×1×5     → 24×6 (las dos alas comparten desplegado)
 */

const MARRON = [70, 50, 40];          // pelaje del cuerpo
const MARRON_CLARO = [94, 70, 56];    // cabeza y orejas
const MEMBRANA = [48, 38, 42];        // membrana de las alas
const HUESO = [108, 84, 66];          // dedos óseos del ala
const ROSA = [148, 92, 100];          // interior de la oreja
const NEGRO = [18, 14, 18];           // ojos
const BLANCO = [235, 230, 225];       // colmillos

export default {
    id: 'murcielago',
    name: 'Murciélago',
    hostile: false,
    aabb: { w: 0.4, h: 0.5 },
    hp: 4,
    speed: 3.2,
    flying: true,
    spawn: { cap: 3, group: 2, cave: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 12, 7, MARRON, 7);         // cuerpo
        skin.fill(0, 10, 16, 8, MARRON_CLARO, 6);  // cabeza
        skin.fill(20, 10, 4, 3, MARRON_CLARO, 5);  // oreja
        skin.fill(0, 24, 24, 6, MEMBRANA, 4);      // ala

        // pelaje del lomo algo revuelto: caras del cuerpo (0,3)..(12,7)
        skin.speckle(0, 3, 12, 4, 10, [86, 62, 50]);
        // cara frontal de la cabeza: rect (4,14)..(8,18)
        skin.px(4, 15, NEGRO);                     // ojo izquierdo
        skin.px(7, 15, NEGRO);                     // ojo derecho
        skin.px(5, 16, [56, 40, 40]);              // nariz chata
        skin.px(6, 16, [56, 40, 40]);
        skin.px(5, 17, BLANCO);                    // colmillos
        skin.px(6, 17, BLANCO);
        // interior de la oreja: cara frontal en (21,11)..(22,13)
        skin.px(21, 11, ROSA);
        skin.px(21, 12, ROSA);
        // dedos óseos del ala: líneas sobre las caras superior (5,24)..(12,29)
        // e inferior (12,24)..(19,29), radiales a lo largo de Z
        skin.fill(8, 24, 1, 5, HUESO, 4);
        skin.fill(11, 24, 1, 5, HUESO, 4);
        skin.fill(15, 24, 1, 5, HUESO, 4);
        skin.fill(18, 24, 1, 5, HUESO, 4);
        // borde de fuga desgastado de la membrana
        skin.speckle(0, 28, 24, 2, 8, [38, 30, 34]);
    },

    parts: [
        { name: 'cuerpo', size: [3, 4, 3], pivot: [0, 3, 0], origin: [-1.5, -2, -1.5], uv: [0, 0] },
        { name: 'cabeza', size: [4, 4, 4], pivot: [0, 5, 0], origin: [-2, 0, -2], uv: [0, 10], anim: 'head' },
        { name: 'oreja_i', size: [1, 2, 1], pivot: [0, 5, 0], origin: [-2, 4, -0.5], uv: [20, 10], anim: 'head' },
        { name: 'oreja_d', size: [1, 2, 1], pivot: [0, 5, 0], origin: [1, 4, -0.5], uv: [20, 10], anim: 'head' },
        { name: 'ala_i', size: [7, 1, 5], pivot: [-1.5, 5, 0], origin: [-7, -0.5, -2.5], uv: [0, 24], anim: 'flapL' },
        { name: 'ala_d', size: [7, 1, 5], pivot: [1.5, 5, 0], origin: [0, -0.5, -2.5], uv: [0, 24], anim: 'flapR' },
    ],

    /** Voz: chirridos agudos de ultrasonido (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 1500, b: 1.2, d: 0.07, w: 'square', v: 0.14 },
            { f: 1620, b: 1.2, d: 0.07, w: 'square', v: 0.12, at: 0.1 },
        ],
        hurt: [{ f: 1750, b: 0.8, d: 0.09, w: 'square', v: 0.24 }],
        death: [{ f: 1450, b: 0.35, d: 0.3, w: 'square', v: 0.22 }],
    },
};

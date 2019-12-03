/**
 * Abeja: mob neutral volador. Zumba por el mundo sin gravedad (flying) y solo
 * ataca si se la hiere: persigue, pica una única vez (stingOnce) y vuelve a
 * calmarse (ver model.js para el formato de las partes y el desplegado UV;
 * cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 7×6×9   → 32×15
 *   (0,16)  ala 4×1×5      → 18×6 (las dos alas comparten desplegado)
 *   (20,16) aguijón 1×1×2  → 6×3
 *
 * Las franjas negras del abdomen se pintan alineadas alrededor del cuerpo.
 * En el desplegado (ver buildPartMesh): en la cara superior v crece hacia
 * atrás (+Z); en la inferior y en las laterales, el borde u/v mínimo es la
 * parte TRASERA. Con z medido en texels desde el frente (0..8), las bandas
 * ocupan z 4..5 y z 7..8.
 */

const AMARILLO = [230, 180, 60];
const NEGRO = [38, 34, 30];
const ALA = [228, 231, 240];
const ALA_VETA = [198, 204, 218];
const OJO = [25, 25, 32];
const BRILLO = [235, 238, 245];

export default {
    id: 'abeja',
    name: 'Abeja',
    hostile: false,
    aabb: { w: 0.55, h: 0.5 },
    hp: 8,
    speed: 2.2,
    flying: true,
    behavior: { neutral: true, aggro: 12, attackRange: 1.2, damage: 2, cooldown: 1.5, stingOnce: true },
    spawn: { cap: 3, group: 2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 15, AMARILLO, 7);      // cuerpo (desplegado completo)
        skin.fill(0, 16, 18, 6, ALA, 3);           // ala
        skin.fill(20, 16, 6, 3, NEGRO, 4);         // aguijón

        // franjas negras del abdomen (z 4..5 y 7..8 desde el frente):
        // cara superior (9,0)..(16,9): v crece hacia atrás → filas 4..5 y 7..8
        skin.fill(9, 4, 7, 2, NEGRO, 4);
        skin.fill(9, 7, 7, 2, NEGRO, 4);
        // cara inferior (16,0)..(23,9): v crece hacia el frente → filas 3..4 y 0..1
        skin.fill(16, 3, 7, 2, NEGRO, 4);
        skin.fill(16, 0, 7, 2, NEGRO, 4);
        // laterales (0,9) y (16,9), 9×6: u crece hacia el frente → columnas 3..4 y 0..1
        skin.fill(3, 9, 2, 6, NEGRO, 4);
        skin.fill(0, 9, 2, 6, NEGRO, 4);
        skin.fill(19, 9, 2, 6, NEGRO, 4);
        skin.fill(16, 9, 2, 6, NEGRO, 4);
        // cara trasera (25,9)..(32,15): cae dentro de la banda final → negra
        skin.fill(25, 9, 7, 6, NEGRO, 4);

        // cara frontal del cuerpo (9,9)..(16,15): ojos grandes 2×2 con brillo
        skin.fill(10, 10, 2, 2, OJO);              // ojo izquierdo
        skin.fill(13, 10, 2, 2, OJO);              // ojo derecho
        skin.px(10, 10, BRILLO);
        skin.px(14, 10, BRILLO);
        skin.px(12, 13, [150, 110, 40]);           // boca diminuta

        // alas: vetas grisáceas en la cara superior (5,16)..(9,21)
        skin.speckle(5, 16, 4, 5, 5, ALA_VETA);
    },

    parts: [
        { name: 'cuerpo', size: [7, 6, 9], pivot: [0, 4, 0], origin: [-3.5, -3, -4.5], uv: [0, 0] },
        { name: 'ala_i', size: [4, 1, 5], pivot: [-1, 7, -0.5], origin: [-4, 0, -2.5], uv: [0, 16], anim: 'flapL' },
        { name: 'ala_d', size: [4, 1, 5], pivot: [1, 7, -0.5], origin: [0, 0, -2.5], uv: [0, 16], anim: 'flapR' },
        { name: 'aguijon', size: [1, 1, 2], pivot: [0, 4, 4.5], origin: [-0.5, -0.5, 0], uv: [20, 16] },
    ],

    /** Voz: zumbido grave de sierra, casi continuo (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 220, b: 1.0, d: 0.4, w: 'sawtooth', v: 0.1 }],
        hurt: [{ f: 330, b: 1.2, d: 0.18, w: 'sawtooth', v: 0.18 }],
        death: [{ f: 240, b: 0.35, d: 0.5, w: 'sawtooth', v: 0.16 }],
    },
};

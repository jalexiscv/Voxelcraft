/**
 * Cubo de azufre: mob pasivo de las cuevas de azufre (26.2). Un único cubo
 * gelatinoso que avanza a saltos (hop) y emite un tenue brillo propio (glow),
 * como corresponde al azufre en la oscuridad. No usa animación por partes:
 * la locomoción a saltos ya lo desplaza entero (ver model.js para el formato
 * de las partes y el desplegado UV; cerdo.js es el ejemplo canónico del
 * contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0) cubo 14×14×14 → 56×28 (único desplegado)
 */

const AZUFRE = [222, 196, 60];
const OCRE = [180, 150, 40];
const RASGO = [64, 52, 20];

export default {
    id: 'cubo_azufre',
    name: 'Cubo de azufre',
    hostile: false,
    aabb: { w: 0.9, h: 0.9 },
    hp: 10,
    speed: 1.2,
    hop: true,
    glow: true,
    spawn: { cap: 3, group: 2, cave: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // desplegado del cubo: fila superior (arriba+abajo) y fila de costados
        skin.fill(14, 0, 28, 14, AZUFRE, 8);   // arriba y abajo
        skin.fill(0, 14, 56, 14, AZUFRE, 8);   // +X, frente, −X y espalda

        // moteado ocre: cristalitos de azufre repartidos por toda la masa
        skin.speckle(14, 0, 28, 14, 50, OCRE);
        skin.speckle(0, 14, 56, 14, 100, OCRE);

        // cara frontal: rect (14,14)..(28,28) — gesto simple y ambiguo
        skin.fill(17, 19, 2, 2, RASGO);        // ojo izquierdo 2×2
        skin.fill(23, 19, 2, 2, RASGO);        // ojo derecho 2×2
        skin.fill(19, 23, 4, 1, RASGO);        // boca de línea
    },

    parts: [
        { name: 'cubo', size: [14, 14, 14], pivot: [0, 0, 0], origin: [-7, 0, -7], uv: [0, 0] },
    ],

    /** Voz: plops gomosos — tono triangular que cae más un soplo corto. */
    voice: {
        say: [
            { f: 250, b: 0.7, d: 0.15, w: 'triangle', v: 0.22 },
            { noise: true, f: 400, q: 1, d: 0.05, v: 0.12, at: 0.02 },
        ],
        hurt: [
            { f: 340, b: 0.8, d: 0.12, w: 'triangle', v: 0.28 },
            { noise: true, f: 500, q: 1, d: 0.05, v: 0.16 },
        ],
        death: [
            { f: 260, b: 0.4, d: 0.4, w: 'triangle', v: 0.26 },      // se desinfla
            { noise: true, f: 350, q: 0.8, d: 0.18, v: 0.14, at: 0.12 },
        ],
    },
};

/**
 * Creeper: mob hostil explosivo. Persigue al jugador y, al acercarse, se
 * detiene y enciende la mecha (behavior.fuse); la explosión (behavior.radius)
 * la resuelve el motor en mobs.js (ver model.js para el formato de las partes
 * y el desplegado UV).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8   → 32×16
 *   (16,16) cuerpo 8×12×4  → 24×16
 *   (0,16)  pata 4×6×4     → 16×10 (las cuatro patas comparten desplegado)
 */

const VERDE = [96, 176, 80];
const VERDE_CLARO = [140, 210, 120];
const VERDE_OSCURO = [60, 120, 50];
const RASGO = [20, 30, 20];

export default {
    id: 'creeper',
    name: 'Creeper',
    hostile: true,
    aabb: { w: 0.6, h: 1.7 },
    hp: 20,
    speed: 1.7,
    spawn: { cap: 3, group: 1 },
    behavior: { aggro: 16, fuse: true, radius: 3 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // base verde con moteado claro y oscuro por toda la piel
        skin.fill(0, 0, 32, 16, VERDE, 8);          // cabeza
        skin.fill(16, 16, 24, 16, VERDE, 8);        // cuerpo
        skin.fill(0, 16, 16, 10, VERDE, 8);         // pata
        skin.speckle(0, 0, 32, 16, 90, VERDE_CLARO);
        skin.speckle(0, 0, 32, 16, 90, VERDE_OSCURO);
        skin.speckle(16, 16, 24, 16, 70, VERDE_CLARO);
        skin.speckle(16, 16, 24, 16, 70, VERDE_OSCURO);
        skin.speckle(0, 16, 16, 10, 30, VERDE_CLARO);
        skin.speckle(0, 16, 16, 10, 30, VERDE_OSCURO);

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.fill(9, 9, 2, 2, RASGO);                // ojo izquierdo 2×2
        skin.fill(13, 9, 2, 2, RASGO);               // ojo derecho 2×2
        // boca: trapecio invertido de 4 de alto que se abre hacia abajo
        skin.fill(11, 11, 2, 1, RASGO);              // arranque estrecho
        skin.fill(10, 12, 4, 2, RASGO);              // tramo ancho
        skin.px(10, 14, RASGO);                      // comisuras que bajan
        skin.px(13, 14, RASGO);
    },

    parts: [
        { name: 'cuerpo', size: [8, 12, 4], pivot: [0, 6, 0], origin: [-4, 0, -2], uv: [16, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 18, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'pata_di', size: [4, 6, 4], pivot: [-2, 6, -3], origin: [-2, -6, -2], uv: [0, 16], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 6, 4], pivot: [2, 6, -3], origin: [-2, -6, -2], uv: [0, 16], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 6, 4], pivot: [-2, 6, 3], origin: [-2, -6, -2], uv: [0, 16], anim: 'leg1' },
        { name: 'pata_td', size: [4, 6, 4], pivot: [2, 6, 3], origin: [-2, -6, -2], uv: [0, 16], anim: 'leg0' },
    ],

    /** Voz: siseos de ruido filtrado (la mecha y la explosión las pone el motor). */
    voice: {
        say: [{ noise: true, f: 3000, q: 1, d: 0.3, v: 0.06 }],
        hurt: [{ noise: true, f: 1800, q: 2, d: 0.1, v: 0.25 }],
        death: [{ noise: true, f: 420, q: 1, d: 0.28, v: 0.3 }],
    },
};

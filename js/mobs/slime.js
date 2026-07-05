/**
 * Slime: mob hostil gelatinoso que avanza a saltos (hop). Persigue al jugador
 * en cuevas y golpea de cerca; el motor resuelve el salto y el contacto en
 * mobs.js (ver model.js para el formato de las partes y el desplegado UV).
 *
 * Distribución de la piel 64×64 (un único cubo 16×16×16 → desplegado 64×32):
 *   (0,0) cubo 16×16×16 → arriba (16,0), abajo (32,0), +X (0,16),
 *         frente (16,16), −X (32,16), espalda (48,16); cada cara 16×16.
 */

import { ITEMS } from '../items.js';

const VERDE = [110, 200, 90];        // capa externa gelatinosa
const VERDE_CLARO = [150, 225, 130]; // brillo del borde de la gelatina
const NUCLEO = [70, 150, 60];        // núcleo interior más oscuro
const RASGO = [25, 45, 25];          // ojos y boca

export default {
    id: 'slime',
    name: 'Slime',
    hostile: true,
    aabb: { w: 1.0, h: 1.0 },
    hp: 8,
    speed: 1.6,
    hop: true,
    spawn: { cap: 3, group: 2, cave: true },
    // Botín: bolas de slime (restos de su propia gelatina al reventar)
    drops: [{ id: ITEMS.BOLA_SLIME, min: 0, max: 2 }],
    behavior: { aggro: 14, attackRange: 1.4, damage: 2, cooldown: 1.3 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // cada cara: capa externa verde con borde claro y núcleo oscuro centrado
        const cara = (x, y) => {
            skin.fill(x, y, 16, 16, VERDE, 8);        // gelatina exterior
            skin.outline(x, y, 16, 16, VERDE_CLARO);  // brillo húmedo del borde
            skin.fill(x + 4, y + 4, 8, 8, NUCLEO, 6); // cuadro interior: el núcleo
        };
        cara(16, 0);   // arriba
        cara(32, 0);   // abajo
        cara(0, 16);   // +X
        cara(16, 16);  // frente (−Z)
        cara(32, 16);  // −X
        cara(48, 16);  // espalda

        // cara frontal del cubo: rect (16,16)..(32,32)
        skin.fill(20, 22, 2, 2, RASGO);            // ojo izquierdo 2×2
        skin.fill(26, 22, 2, 2, RASGO);            // ojo derecho 2×2
        skin.px(20, 22, [210, 235, 200]);          // destellos húmedos
        skin.px(26, 22, [210, 235, 200]);
        skin.fill(23, 26, 2, 1, RASGO);            // boca pequeña
    },

    parts: [
        // el cubo no se articula (anim por defecto 'none'): el salto lo anima el motor
        { name: 'cubo', size: [16, 16, 16], pivot: [0, 0, 0], origin: [-8, 0, -8], uv: [0, 0] },
    ],

    /** Voz: plop húmedo — burbuja de ruido con un glide grave de triángulo. */
    voice: {
        say: [
            { noise: true, f: 350, q: 0.8, d: 0.15, v: 0.22 },
            { f: 200, b: 0.6, d: 0.12, w: 'triangle', v: 0.18, at: 0.02 },
        ],
        hurt: [
            { noise: true, f: 520, q: 1.2, d: 0.1, v: 0.26 },
            { f: 260, b: 0.7, d: 0.1, w: 'triangle', v: 0.2 },
        ],
        death: [
            { noise: true, f: 240, q: 0.7, d: 0.32, v: 0.3 },
            { f: 150, b: 0.35, d: 0.28, w: 'triangle', v: 0.22, at: 0.03 },
        ],
    },

    // Sonidos del pack local (prefijos bajo sounds/ sin extensión ni variante).
    // say/death usan «big» (chapoteo grande: salto ambiente y splat al reventar);
    // hurt usa «small» (squish corto al recibir daño); «attack» no tiene evento en el contrato.
    sonidos: {
        say: ['mob/slime/big'],
        hurt: ['mob/slime/small'],
        death: ['mob/slime/big'],
    },
};

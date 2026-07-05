/**
 * Gato: mob pasivo pequeño y ágil. Atigrado naranja con pecho blanco, orejas
 * puntiagudas y cola alzada que ondea al caminar (anim legY0). Ver model.js
 * para el formato de las partes y el desplegado UV; pig.js es el ejemplo
 * canónico del contrato.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 4×4×10 → 28×14
 *   (32,0)  cola 1×1×6    → 14×7
 *   (0,16)  cabeza 5×4×5  → 20×9
 *   (24,16) oreja 1×2×1   → 4×3 (las dos orejas comparten desplegado)
 *   (0,28)  pata 2×5×2    → 8×7 (las cuatro patas comparten desplegado)
 */

import { ITEMS } from '../items.js';

const NARANJA = [214, 142, 66];    // pelaje base atigrado
const FRANJA = [170, 100, 40];     // franjas del atigrado
const BLANCO = [240, 238, 232];    // pecho, hocico y calcetines
const VERDE = [70, 168, 82];       // ojos
const ROSA = [205, 120, 130];      // nariz e interior de las orejas

export default {
    id: 'cat',
    name: 'Gato',
    hostile: false,
    aabb: { w: 0.5, h: 0.6 },
    hp: 8,
    speed: 1.5,
    fleeSpeed: 3.0,
    spawn: { cap: 2, group: 1 },
    // Botín: hilo, como las arañas que caza (guiño al drop clásico)
    drops: [{ id: ITEMS.HILO, min: 0, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 14, NARANJA, 7);       // cuerpo
        skin.fill(32, 0, 14, 7, NARANJA, 6);       // cola
        skin.fill(0, 16, 20, 9, NARANJA, 7);       // cabeza
        skin.fill(24, 16, 4, 3, FRANJA, 4);        // orejas (dorso oscuro)
        skin.fill(0, 28, 8, 7, NARANJA, 6);        // pata

        // lomo atigrado: cara superior del cuerpo (10,0)..(14,10), bandas
        // transversales alternadas cada 2 texels (v = frente→atrás)
        skin.stripes(10, 0, 4, 10, 2, NARANJA, FRANJA, 5);
        // flancos: franjas verticales en las caras ±X (0,10) y (14,10)
        for (let i = 1; i < 10; i += 3) {
            skin.fill(i, 10, 1, 4, FRANJA, 4);
            skin.fill(14 + i, 10, 1, 4, FRANJA, 4);
        }
        // pecho blanco: cara frontal del cuerpo (10,10)..(14,14)
        skin.fill(10, 10, 4, 4, BLANCO, 4);
        // vientre blanco hacia el pecho: filas frontales de la cara inferior
        skin.fill(14, 7, 4, 3, BLANCO, 4);

        // frente rayada: cara superior de la cabeza (5,16)..(10,21)
        skin.fill(5, 17, 5, 1, FRANJA, 4);
        skin.fill(5, 19, 5, 1, FRANJA, 4);
        // cara frontal de la cabeza: rect (5,21)..(10,25)
        skin.px(6, 22, VERDE);                     // ojo izquierdo
        skin.px(8, 22, VERDE);                     // ojo derecho
        skin.fill(6, 23, 3, 2, BLANCO, 3);         // hocico blanco
        skin.px(7, 23, ROSA);                      // nariz
        // interior rosado de la oreja: cara frontal (25,17)..(26,19)
        skin.fill(25, 17, 1, 2, ROSA, 3);

        // anillos oscuros de la cola: caras arriba/abajo (38..40,0..6)
        skin.fill(38, 1, 2, 1, FRANJA, 3);
        skin.fill(38, 3, 2, 1, FRANJA, 3);
        skin.fill(38, 5, 2, 1, FRANJA, 3);
        // anillos en las caras laterales (fila v=6) y punta oscura
        for (const x of [33, 35, 37, 40, 42, 44]) skin.px(x, 6, FRANJA);
        skin.px(45, 6, FRANJA);

        // calcetines blancos: filas bajas de la pata y planta
        skin.fill(0, 33, 8, 2, BLANCO, 3);
        skin.fill(4, 28, 2, 2, BLANCO, 3);
    },

    parts: [
        { name: 'cuerpo', size: [4, 4, 10], pivot: [0, 6, 0], origin: [-2, -2, -5], uv: [0, 0] },
        { name: 'cabeza', size: [5, 4, 5], pivot: [0, 7, -5], origin: [-2.5, -1, -5], uv: [0, 16], anim: 'head' },
        { name: 'oreja_i', size: [1, 2, 1], pivot: [0, 7, -5], origin: [-2.5, 3, -4], uv: [24, 16], anim: 'head' },
        { name: 'oreja_d', size: [1, 2, 1], pivot: [0, 7, -5], origin: [1.5, 3, -4], uv: [24, 16], anim: 'head' },
        // cola atrás (+Z) algo alzada: en este motor el frente es −Z y la rot X
        // positiva gira hacia el frente-abajo, así que alzarla exige −0.4
        // (magnitud 0.4 del diseño, signo invertido respecto a Java);
        // legY0 la hace ondear lateralmente al caminar
        { name: 'cola', size: [1, 1, 6], pivot: [0, 7.5, 5], origin: [-0.5, -0.5, 0], uv: [32, 0], rot: [-0.4, 0, 0], anim: 'legY0' },
        { name: 'pata_di', size: [2, 5, 2], pivot: [-1, 5, -4], origin: [-1, -5, -1], uv: [0, 28], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 5, 2], pivot: [1, 5, -4], origin: [-1, -5, -1], uv: [0, 28], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 5, 2], pivot: [-1, 5, 4], origin: [-1, -5, -1], uv: [0, 28], anim: 'leg1' },
        { name: 'pata_td', size: [2, 5, 2], pivot: [1, 5, 4], origin: [-1, -5, -1], uv: [0, 28], anim: 'leg0' },
    ],

    /** Voz: maullido senoidal descendente (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 700, b: 0.7, d: 0.3, w: 'sine', v: 0.22 }],
        hurt: [{ f: 900, b: 0.6, d: 0.16, w: 'sine', v: 0.3 }],
        death: [{ f: 750, b: 0.35, d: 0.55, w: 'sine', v: 0.28 }],
    },

    /** Voces del pack local (mob/cat): maullido con ronroneo de respaldo y
     *  hitt* al recibir daño; sin death porque la raíz de mob/cat no trae
     *  ese evento (solo lo tienen las subespecies ocelot/royal_cat). */
    sonidos: {
        // purr abarca también purreow* (startsWith), otra vocalización ambiente
        say: ['mob/cat/meow', 'mob/cat/purr'],
        hurt: ['mob/cat/hitt'],
    },
};

/**
 * Oso polar: mob neutral corpulento. Pasivo hasta que se le hiere; entonces
 * carga con zarpazos potentes. Sigue el contrato de definición de mobs (ver
 * model.js para el formato de las partes y el desplegado UV; mobs.js para el
 * comportamiento).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   cuerpo 12×11×20 → 64×31
 *   (64,0)  cabeza 8×7×9    → 34×16
 *   (0,32)  pata 5×9×5      → 20×14 (las cuatro patas comparten desplegado)
 *
 * Altura del modelo: 20 px (lomo en 9..20, cabeza en 13..20) frente a un
 * AABB de 1.4 bloques (22.4 px), dentro de la tolerancia del validador.
 */

const PELAJE = [235, 238, 240];        // blanco níveo del brief
const PELAJE_SOMBRA = [206, 212, 218]; // matices fríos del pelaje
const HOCICO = [96, 88, 82];           // hocico oscuro
const NARIZ = [34, 30, 30];            // trufa casi negra
const OJO = [26, 28, 34];              // ojos pequeños y oscuros
const ALMOHADILLA = [150, 140, 130];   // planta de las zarpas
const GARRA = [110, 104, 96];          // garras que asoman al frente

export default {
    id: 'oso_polar',
    name: 'Oso polar',
    hostile: false,
    aabb: { w: 1.3, h: 1.4 },
    hp: 30,
    speed: 2.2,
    spawn: { cap: 1, group: 1 },

    /** Neutral: solo ataca si se le provoca, pero pega fuerte. */
    behavior: { neutral: true, aggro: 14, attackRange: 2.0, damage: 6, cooldown: 1.4 },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 64, 31, PELAJE, 6);    // cuerpo
        skin.fill(64, 0, 34, 16, PELAJE, 6);   // cabeza
        skin.fill(0, 32, 20, 14, PELAJE, 6);   // pata

        // cara frontal de la cabeza: rect (73,9)..(81,16)
        skin.px(74, 10, OJO);                  // ojo izquierdo
        skin.px(79, 10, OJO);                  // ojo derecho
        skin.fill(75, 11, 4, 5, HOCICO, 4);    // hocico oscuro centrado
        skin.px(76, 12, NARIZ);                // trufa
        skin.px(77, 12, NARIZ);
        skin.px(76, 14, NARIZ);                // boca entreabierta
        skin.px(77, 14, NARIZ);
        // orejas redondas: cara superior de la cabeza, hacia la nuca
        skin.px(74, 6, PELAJE_SOMBRA);
        skin.px(79, 6, PELAJE_SOMBRA);

        // zarpas: almohadilla en la cara inferior (10,32)..(15,37)
        skin.fill(11, 33, 3, 3, ALMOHADILLA, 4);
        // garras que asoman en la base de la cara frontal (5,37)..(10,46)
        skin.px(6, 45, GARRA);
        skin.px(8, 45, GARRA);

        // pelaje revuelto: mechones fríos en lomo y cabeza
        skin.speckle(20, 0, 24, 20, 26, PELAJE_SOMBRA);
        skin.speckle(0, 20, 64, 11, 30, PELAJE_SOMBRA);
        skin.speckle(64, 0, 34, 16, 14, PELAJE_SOMBRA);
    },

    parts: [
        { name: 'cuerpo', size: [12, 11, 20], pivot: [0, 9, 0], origin: [-6, 0, -10], uv: [0, 0] },
        { name: 'cabeza', size: [8, 7, 9], pivot: [0, 16, -10], origin: [-4, -3, -9], uv: [64, 0], anim: 'head' },
        { name: 'pata_di', size: [5, 9, 5], pivot: [-3.5, 9, -7], origin: [-2.5, -9, -2.5], uv: [0, 32], anim: 'leg0' },
        { name: 'pata_dd', size: [5, 9, 5], pivot: [3.5, 9, -7], origin: [-2.5, -9, -2.5], uv: [0, 32], anim: 'leg1' },
        { name: 'pata_ti', size: [5, 9, 5], pivot: [-3.5, 9, 7], origin: [-2.5, -9, -2.5], uv: [0, 32], anim: 'leg1' },
        { name: 'pata_td', size: [5, 9, 5], pivot: [3.5, 9, 7], origin: [-2.5, -9, -2.5], uv: [0, 32], anim: 'leg0' },
    ],

    /** Voz: gruñido grave y fuerte (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 150, b: 0.6, d: 0.5, w: 'sawtooth', v: 0.3 }],
        hurt: [{ f: 220, b: 0.85, d: 0.18, w: 'sawtooth', v: 0.34 }],
        death: [{ f: 120, b: 0.35, d: 0.9, w: 'sawtooth', v: 0.34 }],
    },
};

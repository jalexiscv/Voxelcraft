/**
 * Lobo: mob neutral (behavior.neutral): deambula pacífico pero, si se le
 * hiere, persigue y muerde durante un rato. Cuadrúpedo gris de pecho amplio,
 * hocico claro y cola alzada (ver model.js para el formato de las partes y el
 * desplegado UV; pig.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 6×6×6   → 24×12    (28,0) hocico 3×3×3 → 12×6
 *   (44,0)  oreja 2×2×1    → 6×3   (ambas orejas comparten desplegado)
 *   (0,16)  cuerpo 6×6×9   → 30×15
 *   (32,16) pecho 7×6×5    → 24×11
 *   (0,34)  cola 2×2×7     → 18×9
 *   (24,34) pata 2×8×2     → 8×10  (las cuatro patas comparten desplegado)
 */

const GRIS = [170, 170, 170];
const GRIS_OSCURO = [128, 128, 132];
const CLARO = [225, 222, 214];          // hocico, vientre y zarpas
const NEGRO = [30, 30, 34];             // trufa y pupilas
const BLANCO_OJO = [244, 242, 235];

export default {
    id: 'wolf',
    name: 'Lobo',
    hostile: false,
    aabb: { w: 0.6, h: 0.85 },
    hp: 8,
    speed: 2.8,
    spawn: { cap: 3, group: 3 },

    /** Neutral: pasivo hasta que lo hieren; entonces muerde con saña. */
    behavior: { neutral: true, aggro: 16, attackRange: 1.6, damage: 4, cooldown: 1.1 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 24, 12, GRIS, 8);            // cabeza
        skin.fill(28, 0, 12, 6, CLARO, 5);           // hocico claro
        skin.fill(44, 0, 6, 3, GRIS, 6);             // oreja (desplegado compartido)
        skin.fill(44, 0, 6, 2, GRIS_OSCURO, 4);      // punta oscura de la oreja
        skin.fill(0, 16, 30, 15, GRIS, 8);           // cuerpo
        skin.fill(32, 16, 24, 11, GRIS, 8);          // pecho
        skin.fill(0, 34, 18, 9, GRIS, 9);            // cola
        skin.fill(24, 34, 8, 10, GRIS, 7);           // pata

        // cara frontal de la cabeza: rect (6,6)..(12,12); el hocico tapa el
        // centro, así que los ojos van a los lados, con ceño oscuro (fieros)
        skin.px(6, 7, GRIS_OSCURO);                  // ceño izquierdo
        skin.px(7, 7, GRIS_OSCURO);
        skin.px(10, 7, GRIS_OSCURO);                 // ceño derecho
        skin.px(11, 7, GRIS_OSCURO);
        skin.px(6, 8, BLANCO_OJO);                   // ojo izquierdo
        skin.px(7, 8, NEGRO);
        skin.px(10, 8, NEGRO);                       // ojo derecho
        skin.px(11, 8, BLANCO_OJO);

        // trufa negra: cara frontal del hocico (31,3)..(34,6) y vista superior
        // (fila 0 del rect (31,0): el borde −Z de la cara de arriba)
        skin.px(32, 3, NEGRO);
        skin.px(32, 0, NEGRO);
        skin.px(32, 5, GRIS_OSCURO);                 // boca bajo la trufa

        // vientre claro (cara inferior del cuerpo) y bajos del pecho
        skin.fill(15, 16, 6, 9, CLARO, 4);
        skin.fill(44, 16, 7, 5, CLARO, 4);
        skin.fill(38, 24, 5, 3, CLARO, 4);           // mancha clara del pecho (cara frontal)

        // pelaje revuelto: lomo, melena del pecho y cola espesa
        skin.speckle(9, 16, 6, 9, 14, GRIS_OSCURO);
        skin.speckle(32, 16, 24, 5, 16, GRIS_OSCURO);
        skin.speckle(0, 34, 18, 9, 16, GRIS_OSCURO);
        skin.fill(16, 41, 2, 2, GRIS_OSCURO, 3);     // punta de la cola (cara trasera)

        // zarpas claras: filas bajas de las caras laterales y planta de la pata
        skin.fill(24, 42, 8, 2, CLARO, 4);
        skin.fill(28, 34, 2, 2, CLARO, 3);
    },

    parts: [
        { name: 'cuerpo', size: [6, 6, 9], pivot: [0, 9, 1], origin: [-3, -3, -4.5], uv: [0, 16] },
        { name: 'pecho', size: [7, 6, 5], pivot: [0, 9, -4], origin: [-3.5, -3, -2.5], uv: [32, 16] },
        { name: 'cabeza', size: [6, 6, 6], pivot: [0, 12, -6], origin: [-3, -3, -6], uv: [0, 0], anim: 'head' },
        { name: 'hocico', size: [3, 3, 3], pivot: [0, 12, -6], origin: [-1.5, -2.5, -9], uv: [28, 0], anim: 'head' },
        { name: 'oreja_i', size: [2, 2, 1], pivot: [0, 12, -6], origin: [-3, 3, -3], uv: [44, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 2, 1], pivot: [0, 12, -6], origin: [1, 3, -3], uv: [44, 0], anim: 'head' },
        // cola hacia atrás (+Z) y alzada: en este motor (frente −Z) alzar una
        // parte que se extiende hacia atrás exige rot X NEGATIVA (la magnitud
        // 0.5 del diseño va en la convención invertida de Minecraft Java)
        { name: 'cola', size: [2, 2, 7], pivot: [0, 11, 5], origin: [-1, -1, 0], uv: [0, 34], rot: [-0.5, 0, 0] },
        { name: 'pata_di', size: [2, 8, 2], pivot: [-2, 8, -4.5], origin: [-1, -8, -1], uv: [24, 34], anim: 'leg0' },
        { name: 'pata_dd', size: [2, 8, 2], pivot: [2, 8, -4.5], origin: [-1, -8, -1], uv: [24, 34], anim: 'leg1' },
        { name: 'pata_ti', size: [2, 8, 2], pivot: [-2, 8, 3.5], origin: [-1, -8, -1], uv: [24, 34], anim: 'leg1' },
        { name: 'pata_td', size: [2, 8, 2], pivot: [2, 8, 3.5], origin: [-1, -8, -1], uv: [24, 34], anim: 'leg0' },
    ],

    /** Voz: aullido ascendente y gañidos agudos (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 400, b: 1.4, d: 0.6, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 900, b: 0.55, d: 0.1, w: 'sawtooth', v: 0.3 }],
        death: [{ f: 520, b: 0.3, d: 0.55, w: 'sawtooth', v: 0.28 }],
    },

    /** Voces del pack local (prefijos bajo sounds/, ver soundpack.js). */
    sonidos: {
        // jadeo relajado como ambiente principal; el ladrido queda de respaldo
        say: ['mob/wolf/panting', 'mob/wolf/bark'],
        // whine (gañido lastimero) de respaldo si hurt1..3 no decodifican
        hurt: ['mob/wolf/hurt', 'mob/wolf/whine'],
        death: ['mob/wolf/death'],
    },
};

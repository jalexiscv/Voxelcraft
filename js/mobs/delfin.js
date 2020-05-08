/**
 * Delfín: mob acuático neutral (aquatic: pasivo hasta que lo hieren) que nada
 * veloz en grupos pequeños. Sigue el contrato de definición de mobs (ver
 * model.js para el formato de las partes y el desplegado UV; cerdo.js es el
 * ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 6×6×14      → 40×20
 *   (0,22)  hocico 2×2×4       → 12×6
 *   (16,22) aleta dorsal 1×3×3 → 8×6
 *   (28,22) cola 4×1×4         → 16×5
 *   (0,30)  aleta lateral 4×1×3 → 14×4 (las dos aletas comparten desplegado)
 *
 * Modelo: cuerpo fusiforme centrado a media agua (y 1..7), hocico proyectado
 * al frente (−Z), aleta dorsal sobre el lomo, cola HORIZONTAL en la popa que
 * batea en legY0 (coleteo lateral al nadar) y aletas pectorales en flapL/R
 * (dentro del agua el render las mantiene en una pose leve y estable; varado
 * en tierra, aletean con desespero durante cada brinco, cuando el mob queda
 * en el aire). Altura del modelo: 10 px frente a un AABB de 0.6
 * bloques (9.6 px), dentro de la tolerancia del validador.
 */

const GRIS = [140, 160, 175];          // dorso gris azulado
const VIENTRE = [214, 224, 232];       // vientre claro
const OSCURO = [95, 115, 132];         // aletas y detalles
const BRILLO = [178, 196, 210];        // reflejos del lomo mojado
const OJO = [25, 30, 45];              // ojo oscuro

export default {
    id: 'delfin',
    name: 'Delfín',
    hostile: false,
    aquatic: true,
    aabb: { w: 0.9, h: 0.6 },
    hp: 10,
    speed: 3.2,
    spawn: { water: true, cap: 2, group: 2 },

    /** Neutral: solo embiste a topetazos si se le hiere primero. */
    behavior: { neutral: true, aggro: 8, attackRange: 1.5, damage: 2, cooldown: 1.2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 40, 20, GRIS, 6);          // cuerpo
        skin.fill(0, 22, 12, 6, GRIS, 5);          // hocico
        skin.fill(16, 22, 8, 6, OSCURO, 5);        // aleta dorsal
        skin.fill(28, 22, 16, 5, GRIS, 6);         // cola
        skin.fill(0, 30, 14, 4, OSCURO, 5);        // aleta lateral

        // vientre claro: cara inferior del cuerpo (20,0)..(26,14)
        skin.fill(20, 0, 6, 14, VIENTRE, 5);
        // el claro sube por la franja baja de flancos y frente (filas 18..20)
        skin.fill(0, 18, 14, 2, VIENTRE, 5);       // flanco +X
        skin.fill(14, 18, 6, 2, VIENTRE, 5);       // frente
        skin.fill(20, 18, 14, 2, VIENTRE, 5);      // flanco −X
        // también en la mandíbula del hocico: cara inferior (6,22)..(8,26)
        skin.fill(6, 22, 2, 4, VIENTRE, 4);

        // reflejos húmedos del lomo: cara superior del cuerpo (14,0)..(20,14)
        skin.speckle(14, 0, 6, 14, 10, BRILLO);
        // espiráculo sobre la frente (fila 3, cerca del borde frontal del lomo)
        skin.px(16, 3, OSCURO);
        skin.px(17, 3, OSCURO);

        // cara frontal del cuerpo: rect (14,14)..(20,20) — ojos a los lados
        // del arranque del hocico (el hocico ocupa el centro, u 16..18)
        skin.px(15, 16, OJO);                      // ojo izquierdo
        skin.px(18, 16, OJO);                      // ojo derecho

        // punta del hocico algo oscura: cara frontal (4,26)..(6,28)
        skin.fill(4, 26, 2, 2, OSCURO, 3);
        // borde de fuga de la cola más oscuro: cara trasera (40,26)..(44,27)
        skin.fill(40, 26, 4, 1, OSCURO, 3);
    },

    parts: [
        { name: 'cuerpo', size: [6, 6, 14], pivot: [0, 4, 0], origin: [-3, -3, -7], uv: [0, 0] },
        { name: 'hocico', size: [2, 2, 4], pivot: [0, 4, -7], origin: [-1, -1, -4], uv: [0, 22], anim: 'head' },
        { name: 'dorsal', size: [1, 3, 3], pivot: [0, 7, 1], origin: [-0.5, 0, -1.5], uv: [16, 22] },
        // cola horizontal en la popa: batea a los lados al nadar (legY0)
        { name: 'cola', size: [4, 1, 4], pivot: [0, 4, 7], origin: [-2, -0.5, 0], uv: [28, 22], anim: 'legY0' },
        // aletas pectorales: caídas hacia abajo (rot Z) y aleteando en flapL/R
        { name: 'aleta_i', size: [4, 1, 3], pivot: [-3, 3, -3], origin: [-4, -0.5, -1.5], uv: [0, 30], rot: [0, 0, 0.35], anim: 'flapL' },
        { name: 'aleta_d', size: [4, 1, 3], pivot: [3, 3, -3], origin: [0, -0.5, -1.5], uv: [0, 30], rot: [0, 0, -0.35], anim: 'flapR' },
    ],

    /** Voz: clics de ecolocalización, ráfagas cuadradas escalonadas. */
    voice: {
        say: [
            { f: 1200, b: 1.0, d: 0.05, w: 'square', v: 0.14 },
            { f: 1200, b: 1.05, d: 0.05, w: 'square', v: 0.14, at: 0.08 },
            { f: 1200, b: 1.1, d: 0.05, w: 'square', v: 0.12, at: 0.16 },
        ],
        hurt: [
            { f: 1500, b: 0.8, d: 0.1, w: 'square', v: 0.24 },
            { f: 1350, b: 0.7, d: 0.08, w: 'square', v: 0.2, at: 0.1 },
        ],
        death: [
            { f: 1300, b: 0.3, d: 0.4, w: 'square', v: 0.22 },
            { f: 700, b: 0.4, d: 0.3, w: 'square', v: 0.14, at: 0.3 },
        ],
    },
};

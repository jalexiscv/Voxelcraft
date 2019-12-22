/**
 * Rana: mob pasivo pequeño que vive cerca del agua y avanza a saltos
 * (hop). Sigue el contrato de definición de mobs (ver model.js para el
 * formato de las partes y el desplegado UV; cerdo.js es el ejemplo
 * canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 5×3×6  → 22×9
 *   (24,0)  ojo 2×2×2     → 8×4  (los dos ojos comparten desplegado)
 *   (0,16)  cabeza 6×3×5  → 22×8
 *   (24,16) anca 2×2×3    → 10×5 (las dos ancas comparten desplegado)
 *
 * Modelo agazapado: cuerpo bajo (1 px sobre el suelo), cabeza ancha al
 * frente (−Z) con los dos ojos saltones encima (partes propias con anim
 * head, giran solidarias con la cabeza) y las ancas plegadas 2×2×3 a los
 * lados con los pies a ras de suelo (pivot.y + origin.y = 0). Altura del
 * modelo: 7 px frente a un AABB de 0.5 bloques (8 px).
 */

const NARANJA = [190, 120, 70];        // naranja templado del lomo
const NARANJA_OSCURO = [150, 90, 50];  // moteado y franjas de las ancas
const CREMA = [235, 215, 175];         // vientre y garganta
const DORADO = [225, 175, 60];         // iris de los ojos saltones
const PUPILA = [40, 30, 20];           // ranura horizontal de la pupila
const BOCA = [110, 60, 40];            // línea de la boca

export default {
    id: 'rana',
    name: 'Rana',
    hostile: false,
    aabb: { w: 0.5, h: 0.5 },
    hp: 5,
    speed: 1.6,
    fleeSpeed: 3.0,
    hop: true,
    spawn: { cap: 2, group: 2 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 22, 9, NARANJA, 8);        // cuerpo
        skin.fill(0, 16, 22, 8, NARANJA, 8);       // cabeza
        skin.fill(24, 0, 8, 4, DORADO, 5);         // ojo
        skin.fill(24, 16, 10, 5, NARANJA, 8);      // anca

        // vientre crema: cara inferior del cuerpo (11,0)..(16,6) y última
        // fila de las caras laterales (fila 8)
        skin.fill(11, 0, 5, 6, CREMA, 6);
        skin.fill(0, 8, 22, 1, CREMA, 5);
        // moteado del lomo: cara superior del cuerpo (6,0)..(11,6)
        skin.speckle(6, 0, 5, 6, 10, NARANJA_OSCURO);

        // garganta crema: cara inferior de la cabeza (11,16)..(17,21)
        skin.fill(11, 16, 6, 5, CREMA, 6);
        // boca: fila inferior de las caras +X, frontal y −X (fila 23)
        skin.fill(0, 23, 16, 1, BOCA, 4);
        // fosas nasales: cara frontal de la cabeza (5,21)..(11,24)
        skin.px(6, 21, BOCA);
        skin.px(9, 21, BOCA);

        // pupila: ranura horizontal en la cara frontal del ojo (26,2)..(28,4)
        skin.fill(26, 2, 2, 1, PUPILA);
        // destello lateral de la pupila en las caras +X y −X del ojo
        skin.px(25, 2, PUPILA);
        skin.px(28, 2, PUPILA);

        // ancas: franja dorsal oscura (fila 19) y pies crema (fila 20)
        skin.fill(24, 19, 10, 1, NARANJA_OSCURO, 5);
        skin.fill(24, 20, 10, 1, CREMA, 5);
    },

    parts: [
        { name: 'cuerpo', size: [5, 3, 6], pivot: [0, 1, 0], origin: [-2.5, 0, -3], uv: [0, 0] },
        { name: 'cabeza', size: [6, 3, 5], pivot: [0, 3, -2], origin: [-3, -1, -4], uv: [0, 16], anim: 'head' },
        { name: 'ojo_i', size: [2, 2, 2], pivot: [0, 3, -2], origin: [-3, 2, -4], uv: [24, 0], anim: 'head' },
        { name: 'ojo_d', size: [2, 2, 2], pivot: [0, 3, -2], origin: [1, 2, -4], uv: [24, 0], anim: 'head' },
        { name: 'anca_i', size: [2, 2, 3], pivot: [-3.5, 2, 1.5], origin: [-1, -2, -1.5], uv: [24, 16], anim: 'leg0' },
        { name: 'anca_d', size: [2, 2, 3], pivot: [3.5, 2, 1.5], origin: [-1, -2, -1.5], uv: [24, 16], anim: 'leg1' },
    ],

    /** Voz: croar grave de doble nota cuadrada que cae (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 180, b: 0.8, d: 0.3, w: 'square', v: 0.22 },
            { f: 180, b: 0.8, d: 0.3, w: 'square', v: 0.2, at: 0.38 },
        ],
        hurt: [{ f: 320, b: 0.7, d: 0.12, w: 'square', v: 0.28 }],
        death: [{ f: 200, b: 0.4, d: 0.5, w: 'square', v: 0.26 }],
    },
};

/**
 * Guardián: mob hostil acuático (aquatic), centinela acorazado del océano.
 * Es un cubo blindado con un único ojo central que vigila el agua y dispara
 * un rayo adaptado como proyectil (behavior.projectile, ver hostileAI en
 * mobs.js). Sigue el contrato de definición de mobs (ver model.js para el
 * formato de las partes y el desplegado UV; cerdo.js es el ejemplo canónico).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 12×12×12 → 48×24
 *   (0,24)  cola 3×3×6      → 18×9
 *   (20,24) púa 1×3×1       → 4×4 (las ocho púas comparten desplegado)
 *
 * Modelo: cuerpo cúbico centrado (y 0..12) con el ojo pintado en el rect
 * frontal (−Z); cola corta en la popa que batea a los lados al nadar (legY0);
 * ocho púas estáticas (anim none) que brotan del blindaje: cuatro en las
 * esquinas de la cara superior con inclinaciones suaves (|rot X| < 0.9,
 * dentro de la convención del motor) y cuatro laterales abiertas con rot Z
 * (Rz positiva lleva la púa hacia −X; negativa, hacia +X). Altura del modelo:
 * 15 px (púas superiores incluidas) frente a un AABB de 0.85 bloques
 * (13.6 px), dentro de la tolerancia del validador.
 */

const VERDE_GRIS = [110, 130, 110];    // blindaje verde grisáceo
const VERDE_CLARO = [142, 160, 140];   // juntas claras del blindaje
const VERDE_OSCURO = [80, 98, 82];     // sombras entre placas
const NARANJA = [200, 120, 60];        // placas e iris
const NARANJA_CLARO = [232, 160, 92];  // puntas de púa y brillo del iris
const BLANCO = [228, 230, 222];        // esclerótica del ojo
const PUPILA = [28, 26, 40];           // pupila oscura

export default {
    id: 'guardian',
    name: 'Guardián',
    hostile: true,
    aquatic: true,
    aabb: { w: 0.85, h: 0.85 },
    hp: 30,
    speed: 2.0,
    spawn: { water: true, cap: 2, group: 1 },

    /** Centinela a distancia: fija el ojo y dispara su rayo (proyectil). */
    behavior: { aggro: 14, projectile: true, damage: 3, cooldown: 2.5 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 48, 24, VERDE_GRIS, 7);            // cuerpo completo
        skin.fill(0, 24, 18, 9, VERDE_GRIS, 7);            // cola
        skin.speckle(12, 0, 24, 12, 30, VERDE_CLARO);      // juntas del lomo
        skin.speckle(0, 12, 48, 12, 60, VERDE_OSCURO);     // sombras del flanco

        // placas naranjas del blindaje repartidas por caras del cuerpo:
        // cara superior (12,0)..(24,12)
        skin.fill(14, 2, 3, 3, NARANJA, 5);
        skin.fill(19, 6, 3, 3, NARANJA, 5);
        // cara +X (0,12)..(12,24)
        skin.fill(2, 14, 3, 3, NARANJA, 5);
        skin.fill(7, 18, 3, 3, NARANJA, 5);
        // cara −X (24,12)..(36,24)
        skin.fill(26, 17, 3, 3, NARANJA, 5);
        skin.fill(31, 13, 3, 3, NARANJA, 5);
        // espalda (36,12)..(48,24)
        skin.fill(38, 14, 3, 3, NARANJA, 5);
        skin.fill(43, 18, 3, 3, NARANJA, 5);

        // cara frontal del cuerpo: rect (12,12)..(24,24) — placas en las
        // esquinas y UN ojo grande central
        skin.fill(13, 13, 2, 2, NARANJA, 5);               // esquinas blindadas
        skin.fill(21, 13, 2, 2, NARANJA, 5);
        skin.fill(13, 21, 2, 2, NARANJA, 5);
        skin.fill(21, 21, 2, 2, NARANJA, 5);
        skin.fill(15, 15, 6, 6, BLANCO, 3);                // esclerótica 6×6
        skin.px(15, 15, VERDE_GRIS);                       // esquinas redondeadas
        skin.px(20, 15, VERDE_GRIS);
        skin.px(15, 20, VERDE_GRIS);
        skin.px(20, 20, VERDE_GRIS);
        skin.fill(16, 16, 4, 4, NARANJA);                  // iris naranja 4×4
        skin.fill(17, 17, 2, 2, PUPILA);                   // pupila oscura 2×2
        skin.px(16, 16, NARANJA_CLARO);                    // brillo del iris

        // cola: banda naranja a media longitud y punta naranja (aleta)
        skin.fill(6, 26, 3, 1, NARANJA, 4);                // banda cara superior
        skin.fill(9, 26, 3, 1, NARANJA, 4);                // banda cara inferior
        skin.fill(2, 30, 1, 3, NARANJA, 4);                // banda flanco +X
        skin.fill(12, 30, 1, 3, NARANJA, 4);               // banda flanco −X
        skin.fill(15, 30, 3, 3, NARANJA, 5);               // punta (cara trasera)

        // púa: naranja con la punta más clara (fila superior = extremo)
        skin.fill(20, 24, 4, 4, NARANJA, 6);
        skin.fill(20, 25, 4, 1, NARANJA_CLARO);            // punta en los flancos
        skin.px(21, 24, NARANJA_CLARO);                    // remate superior
        skin.px(22, 24, NARANJA_CLARO);                    // remate inferior
    },

    parts: [
        { name: 'cuerpo', size: [12, 12, 12], pivot: [0, 6, 0], origin: [-6, -6, -6], uv: [0, 0] },
        // cola en la popa (+Z): batea a los lados al nadar (legY0)
        { name: 'cola', size: [3, 3, 6], pivot: [0, 6, 6], origin: [-1.5, -1.5, 0], uv: [0, 24], anim: 'legY0' },
        // púas superiores: inclinadas hacia cada esquina (rot X negativa suave
        // tumba hacia el frente −Z; rot Z positiva tumba hacia −X)
        { name: 'pua_t1', size: [1, 3, 1], pivot: [-4, 12, -4], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [-0.4, 0, 0.4] },
        { name: 'pua_t2', size: [1, 3, 1], pivot: [4, 12, -4], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [-0.4, 0, -0.4] },
        { name: 'pua_t3', size: [1, 3, 1], pivot: [-4, 12, 4], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0.4, 0, 0.4] },
        { name: 'pua_t4', size: [1, 3, 1], pivot: [4, 12, 4], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0.4, 0, -0.4] },
        // púas laterales: brotan de los flancos con aperturas desiguales
        { name: 'pua_i1', size: [1, 3, 1], pivot: [-6, 7, -2], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0, 0, 1.35] },
        { name: 'pua_i2', size: [1, 3, 1], pivot: [-6, 5, 3], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0, 0, 1.1] },
        { name: 'pua_d1', size: [1, 3, 1], pivot: [6, 7, 2], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0, 0, -1.35] },
        { name: 'pua_d2', size: [1, 3, 1], pivot: [6, 5, -3], origin: [-0.5, 0, -0.5], uv: [20, 24], rot: [0, 0, -1.1] },
    ],

    /** Voz: gruñido electrónico grave con soplo de ruido subacuático. */
    voice: {
        say: [
            { f: 200, b: 0.7, d: 0.3, w: 'sawtooth', v: 0.2 },
            { noise: true, f: 900, q: 1.2, d: 0.25, v: 0.1, at: 0.05 },
        ],
        hurt: [
            { f: 320, b: 0.75, d: 0.15, w: 'sawtooth', v: 0.26 },
            { noise: true, f: 1400, q: 2, d: 0.1, v: 0.14 },
        ],
        death: [
            { f: 240, b: 0.35, d: 0.5, w: 'sawtooth', v: 0.26 },
            { noise: true, f: 700, q: 1, d: 0.45, v: 0.12, at: 0.1 },
        ],
    },
};

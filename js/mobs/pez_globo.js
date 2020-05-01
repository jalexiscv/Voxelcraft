/**
 * Pez globo: mob acuático neutral que pincha a quien se le acerca. Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; cerdo.js es el ejemplo canónico; mobs.js para el
 * comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 5×5×5 → 20×10
 *   (24,0)  cola 1×2×2   → 6×4
 *   (32,0)  púa 1×1×1    → 4×2 (las tres púas comparten desplegado)
 *
 * Modelo: un cubo 5×5×5 que flota a 0.5 px del suelo (y 0.5..5.5) con tres
 * púas 1×1×1 adosadas (arriba y a cada costado), la cara de ojos saltones
 * pintada sobre el rect frontal (−Z) y una colita plana 1×2×2 que culebrea
 * en legY0 desde la cara trasera (+Z). Los pinchos restantes van pintados
 * como motas oscuras en todas las caras. Altura del modelo: 6.5 px frente a
 * un AABB de 0.5 bloques (8 px), dentro de tolerancia.
 */

const AMARILLO = [210, 190, 80];       // lomo amarillo verdoso
const VIENTRE = [238, 236, 224];       // vientre blanco
const PINCHO = [96, 92, 42];           // motas de pinchos pintados
const PUA = [118, 112, 52];            // púas en caja
const PUA_CLARA = [176, 168, 96];      // punta de las púas
const ALETA = [178, 156, 62];          // membrana de la cola
const OJO_BLANCO = [246, 246, 240];
const PUPILA = [28, 30, 52];
const BOCA = [130, 96, 44];

export default {
    id: 'pez_globo',
    name: 'Pez globo',
    hostile: false,
    aabb: { w: 0.5, h: 0.5 },
    hp: 4,
    speed: 1.2,
    aquatic: true,
    spawn: { cap: 3, group: 1, water: true },

    /** Neutral: solo pincha si lo hieren o te pegas demasiado. */
    behavior: { neutral: true, aggro: 3, attackRange: 1.2, damage: 1, cooldown: 1.5 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 20, 10, AMARILLO, 8);      // cuerpo (las seis caras)
        skin.fill(24, 0, 6, 4, ALETA, 6);          // cola
        skin.fill(32, 0, 4, 2, PUA, 5);            // púa (desplegado compartido)

        // vientre blanco: cara inferior (10,0)..(15,5) y borde bajo de la
        // banda lateral (filas 8..10 de las cuatro caras verticales)
        skin.fill(10, 0, 5, 5, VIENTRE, 5);
        skin.fill(0, 8, 20, 2, VIENTRE, 5);

        // pinchos pintados: motas oscuras salientes en todas las caras
        skin.speckle(0, 0, 20, 8, 26, PINCHO);     // lomo y costados
        skin.speckle(10, 0, 5, 5, 4, PINCHO);      // también en el vientre
        skin.speckle(0, 8, 20, 2, 5, PINCHO);

        // cara frontal del cuerpo: rect (5,5)..(10,10) — ojos saltones 2×2
        // con pupila hacia el centro y boquita fruncida debajo
        skin.fill(5, 6, 2, 2, OJO_BLANCO);         // ojo izquierdo
        skin.px(6, 7, PUPILA);
        skin.fill(8, 6, 2, 2, OJO_BLANCO);         // ojo derecho
        skin.px(8, 7, PUPILA);
        skin.px(7, 8, BOCA);

        // púas: punta clara en la cara superior (33,0)
        skin.px(33, 0, PUA_CLARA);

        // cola: raquis oscuro en el borde pegado al cuerpo (columna 24..25
        // es la cara +X; oscurecemos la fila superior de toda la banda)
        skin.fill(24, 2, 6, 1, PINCHO, 4);
    },

    parts: [
        { name: 'cuerpo', size: [5, 5, 5], pivot: [0, 3, 0], origin: [-2.5, -2.5, -2.5], uv: [0, 0] },
        // colita plana que culebrea a los lados desde la cara trasera (+Z)
        { name: 'cola', size: [1, 2, 2], pivot: [0, 3, 2.5], origin: [-0.5, -1, 0], uv: [24, 0], anim: 'legY0' },
        // púas en caja: arriba y a cada costado, adosadas al cubo
        { name: 'pua_arriba', size: [1, 1, 1], pivot: [0, 3, 0], origin: [-0.5, 2.5, -0.5], uv: [32, 0] },
        { name: 'pua_izq', size: [1, 1, 1], pivot: [0, 3, 0], origin: [-3.5, -0.5, -0.5], uv: [32, 0] },
        { name: 'pua_der', size: [1, 1, 1], pivot: [0, 3, 0], origin: [2.5, -0.5, -0.5], uv: [32, 0] },
    ],

    /** Voz: soplidos de ruido filtrado, como aire escapando (ver SoundEngine.mobSay). */
    voice: {
        say: [{ noise: true, f: 500, q: 0.8, d: 0.2, v: 0.18 }],
        hurt: [{ noise: true, f: 720, q: 1.0, d: 0.12, v: 0.26 }],
        death: [
            { noise: true, f: 500, q: 0.8, d: 0.18, v: 0.24 },
            { noise: true, f: 320, q: 0.6, d: 0.4, v: 0.2, at: 0.15 },
        ],
    },
};

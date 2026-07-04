/**
 * Nautilus: mob neutral acuático (25w41a) que deriva por el agua dentro de su
 * concha a bandas y solo embiste si se le hiere (behavior.neutral). Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   concha 10×12×10 → 40×22
 *   (0,24)  manto 8×6×4     → 24×10
 *   (0,36)  tentáculo 1×1×6 → 14×7 (los cuatro tentáculos comparten desplegado)
 *
 * Modelo: la concha flota (y 2..14) y del frente (−Z) asoma el manto con un
 * ojo a cada lado (±X); bajo su borde nacen cuatro tentáculos que ya se
 * extienden hacia −Z por geometría (origin.z negativo) — no necesitan rot
 * para apuntar al frente — y una rot X ligeramente negativa (−0.5, dentro
 * del umbral del validador) solo les hunde la punta hacia el suelo (~1 px),
 * remando en contrafase leg0/leg1. Altura del modelo: 14 px frente a un
 * AABB de 0.95 bloques (15.2 px), dentro de la tolerancia.
 */
import { ITEMS } from '../items.js';

const ROJO_CARAMELO = [200, 80, 60];   // banda roja de la concha
const HUESO = [235, 225, 210];         // banda blanca de la concha
const CARNE = [222, 198, 176];         // manto
const CARNE_OSCURA = [186, 156, 138];  // capucha y borde del manto
const TENTACULO = [210, 162, 140];     // carne de los tentáculos
const PUNTA = [236, 202, 182];         // puntas pálidas
const BLANCO = [245, 245, 245];        // globo ocular
const PUPILA = [24, 26, 40];

export default {
    id: 'nautilus',
    name: 'Nautilus',
    hostile: false,
    aquatic: true,
    aabb: { w: 0.9, h: 0.95 },
    hp: 12,
    speed: 1.4,
    spawn: { cap: 2, group: 2, water: true },
    // Botín: escama 1 — un fragmento nacarado de su concha a bandas.
    drops: [{ id: ITEMS.ESCAMA, min: 1, max: 1 }],

    /** Neutral: pasivo hasta que se le hiere; entonces embiste de cerca. */
    behavior: { neutral: true, aggro: 6, attackRange: 1.3, damage: 1, cooldown: 1.5 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        /* ---- Concha: bandas curvas estilo bastón de caramelo ---- */
        skin.fill(0, 0, 40, 22, HUESO, 5); // base hueso de todo el desplegado

        const PERIODO = 2.6; // ancho de cada banda en texels
        const esRoja = (r) => Math.floor(r / PERIODO) % 2 === 0;
        const banda = (x, y) => {
            const d = Math.floor((skin.rng.float() * 2 - 1) * 7);
            skin.px(x, y, [ROJO_CARAMELO[0] + d, ROJO_CARAMELO[1] + d, ROJO_CARAMELO[2] + d]);
        };

        // caras laterales ±X en (0,10) y (20,10): anillos concéntricos rojos
        // alrededor del ombligo de la espiral (borde frontal, i=9, j=8)
        for (const rx of [0, 20]) {
            for (let j = 0; j < 12; j++) {
                for (let i = 0; i < 10; i++) {
                    if (esRoja(Math.hypot(9 - i, 8 - j))) banda(rx + i, 10 + j);
                }
            }
        }
        // cara frontal (10,10): las bandas doblan la esquina delantera (radio |8−j|)
        for (let j = 0; j < 12; j++) {
            if (esRoja(Math.abs(8 - j))) {
                for (let i = 0; i < 10; i++) banda(10 + i, 10 + j);
            }
        }
        // cara trasera (30,10): continúa los anillos por detrás del ombligo
        for (let j = 0; j < 12; j++) {
            if (esRoja(Math.hypot(9, 8 - j))) {
                for (let i = 0; i < 10; i++) banda(30 + i, 10 + j);
            }
        }
        // caras superior (10,0; frente en t=0) e inferior (20,0; trasera en
        // t=0): las bandas cruzan el lomo y la panza con el mismo radio
        for (let t = 0; t < 10; t++) {
            if (esRoja(Math.hypot(t, 8))) {
                for (let i = 0; i < 10; i++) banda(10 + i, t);
            }
            if (esRoja(Math.hypot(9 - t, 3))) {
                for (let i = 0; i < 10; i++) banda(20 + i, t);
            }
        }

        /* ---- Manto: capucha carnosa con un ojo a cada lado ---- */
        skin.fill(0, 24, 24, 10, CARNE, 6);        // manto (desplegado completo)
        skin.fill(4, 24, 8, 4, CARNE_OSCURA, 5);   // capucha: cara superior
        // ojos en las caras laterales: +X en (0,28) y −X en (12,28), con la
        // pupila pegada al borde frontal (derecho) de cada rect
        for (const ex of [0, 12]) {
            skin.fill(ex + 1, 30, 2, 2, BLANCO);   // globo ocular 2×2
            skin.px(ex + 2, 30, PUPILA);           // pupila mirando al frente
        }
        // cara frontal (4,28)..(12,34): borde del manto y nacimiento de los
        // tentáculos como muescas bajo el pliegue
        skin.fill(4, 32, 8, 2, CARNE_OSCURA, 4);
        skin.px(5, 33, TENTACULO);
        skin.px(7, 33, TENTACULO);
        skin.px(9, 33, TENTACULO);
        skin.px(11, 33, TENTACULO);

        /* ---- Tentáculo compartido ---- */
        skin.fill(0, 36, 14, 7, TENTACULO, 6);     // desplegado completo
        skin.px(6, 36, PUNTA);                     // punta: cara superior
        skin.px(7, 36, PUNTA);                     // punta: cara inferior
        skin.px(6, 42, PUNTA);                     // punta: cara frontal (−Z)
        // ventosas tenues a lo largo de la cara inferior (7,36)..(8,42)
        skin.px(7, 38, CARNE_OSCURA);
        skin.px(7, 40, CARNE_OSCURA);
    },

    parts: [
        { name: 'concha', size: [10, 12, 10], pivot: [0, 8, 1], origin: [-5, -6, -5], uv: [0, 0] },
        { name: 'manto', size: [8, 6, 4], pivot: [0, 6, -4], origin: [-4, -3, -4], uv: [0, 24] },
        // cuatro tentáculos al frente-abajo, en contrafase con el vecino
        { name: 'tent_1', size: [1, 1, 6], pivot: [-3, 4, -6], origin: [-0.5, -1, -5], uv: [0, 36], rot: [-0.5, 0, 0], anim: 'leg0' },
        { name: 'tent_2', size: [1, 1, 6], pivot: [-1, 4, -6], origin: [-0.5, -1, -5], uv: [0, 36], rot: [-0.5, 0, 0], anim: 'leg1' },
        { name: 'tent_3', size: [1, 1, 6], pivot: [1, 4, -6], origin: [-0.5, -1, -5], uv: [0, 36], rot: [-0.5, 0, 0], anim: 'leg0' },
        { name: 'tent_4', size: [1, 1, 6], pivot: [3, 4, -6], origin: [-0.5, -1, -5], uv: [0, 36], rot: [-0.5, 0, 0], anim: 'leg1' },
    ],

    /** Voz: burbujeo grave — seno hondo con blips de ruido filtrado. */
    voice: {
        say: [
            { f: 150, b: 0.55, d: 0.25, w: 'sine', v: 0.22 },
            { noise: true, f: 480, q: 1, d: 0.07, v: 0.08, at: 0.05 },
            { noise: true, f: 640, q: 1.2, d: 0.06, v: 0.06, at: 0.16 },
        ],
        hurt: [
            { f: 240, b: 0.7, d: 0.14, w: 'sine', v: 0.26 },
            { noise: true, f: 820, q: 1.2, d: 0.06, v: 0.1 },
        ],
        death: [
            { f: 175, b: 0.32, d: 0.55, w: 'sine', v: 0.24 },
            { noise: true, f: 430, q: 0.8, d: 0.3, v: 0.1, at: 0.15 },
            { noise: true, f: 300, q: 0.8, d: 0.25, v: 0.08, at: 0.36 },
        ],
    },
};

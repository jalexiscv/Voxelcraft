/**
 * Llama: mob neutral que escupe a distancia. Pasta tranquila, pero si se la
 * hiere responde con escupitajos (behavior.neutral + projectile, ver mobs.js).
 * Cuerpo lanudo con manta decorativa a rayas, cuello vertical con cabeza
 * alargada y orejas "plátano" (ver model.js para el formato de las partes y
 * el desplegado UV; pig.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 10×10×16 → 52×26
 *   (0,26)  cuello 5×12×5   → 20×17
 *   (20,26) cabeza 5×5×7    → 24×12
 *   (44,26) oreja 1×3×1     → 4×4  (las dos orejas comparten desplegado)
 *   (0,43)  pata 4×12×4     → 16×16 (las cuatro patas comparten desplegado)
 */
import { ITEMS } from '../items.js';

const CREMA = [220, 200, 170];
const LANA_CLARA = [236, 222, 196];
const PARDO = [150, 112, 78];
const PARDO_OSCURO = [110, 80, 56];
const MANTA_ROJA = [178, 58, 48];
const MANTA_AZUL = [52, 84, 128];
const OJO = [42, 38, 34];

export default {
    id: 'llama',
    name: 'Llama',
    hostile: false,
    aabb: { w: 0.9, h: 1.9 },
    hp: 18,
    speed: 1.6,
    spawn: { cap: 2, group: 3 },
    // botín: algo de cuero bajo la lana, como el resto de camélidos
    drops: [{ id: ITEMS.CUERO, min: 0, max: 1 }],
    // neutral: pasta en paz, pero al herirla escupe a distancia
    behavior: { neutral: true, aggro: 12, projectile: true, damage: 2, cooldown: 2.5 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 52, 26, CREMA, 8);       // cuerpo lanudo
        skin.fill(0, 26, 20, 17, CREMA, 8);      // cuello
        skin.fill(20, 26, 24, 12, CREMA, 7);     // cabeza
        skin.fill(44, 26, 4, 4, CREMA, 5);       // oreja
        skin.fill(0, 43, 16, 16, CREMA, 8);      // pata

        // manta decorativa: rayas transversales sobre el lomo (cara superior
        // del cuerpo, rect (16,0)..(26,16))
        skin.stripes(16, 0, 10, 16, 2, MANTA_ROJA, MANTA_AZUL, 5);
        // la manta cae por los flancos: franjas verticales en el tercio alto
        // de las caras laterales (+X en (0,16), −X en (26,16), columnas 4..11)
        for (let i = 0; i < 8; i++) {
            const c = i % 2 === 0 ? MANTA_ROJA : MANTA_AZUL;
            skin.fill(4 + i, 16, 1, 5, c, 4);    // flanco +X
            skin.fill(30 + i, 16, 1, 5, c, 4);   // flanco −X
        }

        // lana clara revuelta y manchas pardas por el vientre y los flancos
        skin.speckle(0, 21, 52, 5, 26, PARDO);
        skin.speckle(0, 16, 4, 5, 6, LANA_CLARA);
        skin.speckle(42, 16, 10, 5, 8, LANA_CLARA);
        // pecho del cuello más claro (cara frontal (5,31)..(10,43)) y manchas
        skin.fill(5, 31, 5, 12, LANA_CLARA, 6);
        skin.speckle(0, 31, 5, 12, 6, PARDO);
        skin.speckle(10, 31, 10, 12, 10, PARDO);
        skin.speckle(27, 26, 5, 7, 4, PARDO);    // coronilla moteada

        // cara frontal de la cabeza: rect (27,33)..(32,38)
        skin.px(27, 34, [245, 245, 245]);        // ojo izquierdo
        skin.px(28, 34, OJO);
        skin.px(30, 34, OJO);                    // ojo derecho
        skin.px(31, 34, [245, 245, 245]);
        skin.fill(28, 36, 3, 2, PARDO);          // morro pardo
        skin.px(28, 36, PARDO_OSCURO);           // fosas nasales
        skin.px(30, 36, PARDO_OSCURO);
        skin.fill(28, 37, 3, 1, PARDO_OSCURO);   // boca

        // puntas pardas de las orejas (fila alta de las caras laterales)
        skin.fill(44, 27, 4, 1, PARDO, 4);

        // pezuñas oscuras en las dos filas bajas de la pata
        skin.fill(0, 57, 16, 2, PARDO_OSCURO, 4);
    },

    parts: [
        { name: 'cuerpo', size: [10, 10, 16], pivot: [0, 15, 0], origin: [-5, -5, -8], uv: [0, 0] },
        // cuello, cabeza y orejas giran juntos desde la base del cuello
        { name: 'cuello', size: [5, 12, 5], pivot: [0, 17, -5.5], origin: [-2.5, 0, -2.5], uv: [0, 26], anim: 'head' },
        { name: 'cabeza', size: [5, 5, 7], pivot: [0, 17, -5.5], origin: [-2.5, 10, -4.5], uv: [20, 26], anim: 'head' },
        { name: 'oreja_i', size: [1, 3, 1], pivot: [0, 17, -5.5], origin: [-2.5, 15, -0.5], uv: [44, 26], anim: 'head' },
        { name: 'oreja_d', size: [1, 3, 1], pivot: [0, 17, -5.5], origin: [1.5, 15, -0.5], uv: [44, 26], anim: 'head' },
        { name: 'pata_di', size: [4, 12, 4], pivot: [-3, 12, -5.5], origin: [-2, -12, -2], uv: [0, 43], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 12, 4], pivot: [3, 12, -5.5], origin: [-2, -12, -2], uv: [0, 43], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 12, 4], pivot: [-3, 12, 5.5], origin: [-2, -12, -2], uv: [0, 43], anim: 'leg1' },
        { name: 'pata_td', size: [4, 12, 4], pivot: [3, 12, 5.5], origin: [-2, -12, -2], uv: [0, 43], anim: 'leg0' },
    ],

    /** Voz: balido nasal "mwaa" en dientes de sierra (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 300, b: 0.75, d: 0.4, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 430, b: 0.8, d: 0.22, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 330, b: 0.4, d: 0.6, w: 'sawtooth', v: 0.28 }],
    },

    // Voces reales del pack local (idle1-5, hurt1-3, death1-2 en mob/llama/)
    sonidos: {
        say: ['mob/llama/idle'],
        hurt: ['mob/llama/hurt'],
        death: ['mob/llama/death'],
    },
};

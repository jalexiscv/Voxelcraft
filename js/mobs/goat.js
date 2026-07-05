/**
 * Cabra: mob neutral de montaña. Pasta tranquila, pero si se la hiere baja
 * la testuz y EMBISTE con una acometida (behavior.lunge). Sigue el contrato
 * de definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; pig.js es el ejemplo canónico; mobs.js el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 5×5×7   → 24×12    (26,0) cuerno 1×3×2 → 6×5 (ambos comparten)
 *                                     (26,6) barbita 2×2×1 → 6×3
 *   (0,20)  cuerpo 9×8×14  → 46×22
 *   (0,44)  pata 3×10×3    → 12×13 (las cuatro patas comparten desplegado)
 *
 * Altura del modelo: 23 px (puntas de los cuernos) frente a un AABB de 1.3
 * bloques (20.8 px), dentro de la tolerancia del validador.
 */
import { ITEMS } from '../items.js';

const CREMA = [225, 220, 210];         // pelaje blanco crema
const CREMA_CLARA = [236, 232, 224];   // vientre
const CREMA_OSCURA = [198, 191, 178];  // sombras y moteado del pelaje
const CUERNO = [150, 146, 140];        // gris del cuerno
const CUERNO_OSCURO = [112, 108, 102]; // punta del cuerno
const BARBA = [210, 203, 190];         // barbita algo sucia
const PEZUNA = [90, 80, 72];
const AMBAR = [222, 178, 82];          // iris ámbar caprino
const PUPILA = [35, 32, 30];           // pupila rectangular horizontal
const NARIZ = [168, 142, 136];

export default {
    id: 'goat',
    name: 'Cabra',
    hostile: false,
    aabb: { w: 0.9, h: 1.3 },
    hp: 10,
    speed: 2.8,
    spawn: { cap: 2, group: 2 },
    // botín: algo de cuero de su piel curtida de montaña
    drops: [{ id: ITEMS.CUERO, min: 0, max: 1 }],

    /** Neutral: pasiva hasta que la hieren; entonces embiste (lunge). */
    behavior: { neutral: true, aggro: 12, attackRange: 1.8, damage: 3, cooldown: 1.6, lunge: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 24, 12, CREMA, 7);          // cabeza
        skin.fill(26, 0, 6, 5, CUERNO, 5);          // cuerno (desplegado compartido)
        skin.fill(26, 6, 6, 3, BARBA, 6);           // barbita
        skin.fill(0, 20, 46, 22, CREMA, 7);         // cuerpo
        skin.fill(0, 44, 12, 13, CREMA, 7);         // pata

        // cuernos: punta más oscura (fila superior de las caras laterales
        // y cara de arriba del desplegado)
        skin.fill(26, 2, 6, 1, CUERNO_OSCURO, 4);
        skin.fill(28, 0, 2, 2, CUERNO_OSCURO, 4);

        // cara frontal de la cabeza: rect (7,7)..(12,12)
        skin.fill(7, 8, 2, 2, AMBAR, 4);            // ojo izquierdo
        skin.fill(10, 8, 2, 2, AMBAR, 4);           // ojo derecho
        skin.fill(7, 9, 2, 1, PUPILA);              // pupila rectangular (barra horizontal)
        skin.fill(10, 9, 2, 1, PUPILA);
        skin.fill(8, 11, 3, 1, NARIZ, 4);           // morro rosado
        skin.px(8, 11, [130, 100, 96]);             // fosas nasales
        skin.px(10, 11, [130, 100, 96]);

        // pelaje: lomo y flancos con moteado sutil, vientre más claro
        skin.speckle(14, 20, 9, 14, 14, CREMA_OSCURA);  // lomo (cara superior)
        skin.speckle(0, 34, 46, 8, 26, CREMA_OSCURA);   // flancos y anca
        skin.fill(23, 20, 9, 14, CREMA_CLARA, 5);       // vientre (cara inferior)

        // pezuñas: dos filas inferiores de las caras laterales y cara de abajo
        skin.fill(0, 55, 12, 2, PEZUNA, 4);
        skin.fill(6, 44, 3, 3, PEZUNA, 4);
    },

    parts: [
        { name: 'cuerpo', size: [9, 8, 14], pivot: [0, 14, 0], origin: [-4.5, -4, -7], uv: [0, 20] },
        { name: 'cabeza', size: [5, 5, 7], pivot: [0, 17, -7], origin: [-2.5, -1, -7], uv: [0, 0], anim: 'head' },
        // cuernos inclinados hacia ATRÁS: en este motor (+Y arriba, frente −Z)
        // la caja vertical se tumba hacia la espalda con rx POSITIVO; el
        // rx=−0.3 de la convención de Minecraft Java queda aquí invertido
        { name: 'cuerno_i', size: [1, 3, 2], pivot: [0, 17, -7], origin: [-2.5, 3, -4], uv: [26, 0], rot: [0.3, 0, 0], anim: 'head' },
        { name: 'cuerno_d', size: [1, 3, 2], pivot: [0, 17, -7], origin: [1.5, 3, -4], uv: [26, 0], rot: [0.3, 0, 0], anim: 'head' },
        { name: 'barbita', size: [2, 2, 1], pivot: [0, 17, -7], origin: [-1, -3, -7], uv: [26, 6], anim: 'head' },
        { name: 'pata_di', size: [3, 10, 3], pivot: [-3, 10, -5], origin: [-1.5, -10, -1.5], uv: [0, 44], anim: 'leg0' },
        { name: 'pata_dd', size: [3, 10, 3], pivot: [3, 10, -5], origin: [-1.5, -10, -1.5], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_ti', size: [3, 10, 3], pivot: [-3, 10, 5], origin: [-1.5, -10, -1.5], uv: [0, 44], anim: 'leg1' },
        { name: 'pata_td', size: [3, 10, 3], pivot: [3, 10, 5], origin: [-1.5, -10, -1.5], uv: [0, 44], anim: 'leg0' },
    ],

    /** Voz: balidos graves de onda cuadrada (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 350, b: 0.85, d: 0.35, w: 'square', v: 0.22 }],
        hurt: [{ f: 460, b: 0.8, d: 0.14, w: 'square', v: 0.28 }],
        death: [{ f: 290, b: 0.45, d: 0.6, w: 'square', v: 0.28 }],
    },

    /** Voces reales del pack: balidos idle*; se ignoran las variantes screaming_*. */
    sonidos: {
        say: ['mob/goat/idle'],
        hurt: ['mob/goat/hurt'],
        death: ['mob/goat/death'],
    },
};

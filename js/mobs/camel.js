/**
 * Camello: mob pasivo del desierto. Cuadrúpedo alto de patas largas con una
 * joroba sobre el lomo y un cuello que sube al frente rematado en una cabeza
 * alargada; cuello y cabeza comparten pivote y giran juntos con anim `head`
 * (ver model.js para el formato de las partes y el desplegado UV; pig.js
 * es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 128×64:
 *   (0,0)   cuerpo 14×12×24 → 76×36
 *   (76,0)  joroba 8×4×10   → 36×14
 *   (76,14) cuello 6×16×6   → 24×22
 *   (0,36)  cabeza 6×6×10   → 32×16
 *   (32,36) pata 4×18×4     → 16×22 (las cuatro patas comparten desplegado)
 *   (48,36) oreja 2×3×2     → 8×5 (ambas orejas comparten desplegado)
 */

import { ITEMS } from '../items.js';

const BEIGE = [193, 159, 110];          // pelaje arena
const BEIGE_CLARO = [222, 199, 160];    // hocico y vientre
const PARDO = [138, 106, 68];           // pezuñas y sombras
const OSCURO = [64, 50, 34];            // ojos, fosas nasales
const ROJO_SILLA = [168, 52, 46];       // manta de la silla
const DORADO = [212, 164, 72];          // ribete de la silla

export default {
    id: 'camel',
    name: 'Camello',
    hostile: false,
    aabb: { w: 1.5, h: 2.2 },
    hp: 16,
    speed: 1.4,
    fleeSpeed: 2.4,
    spawn: { cap: 2, group: 2, block: 'SAND' },
    // Botín: cuero de su gruesa piel curtida por el desierto
    drops: [{ id: ITEMS.CUERO, min: 0, max: 1 }],

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // bases (cada rectángulo cubre el desplegado completo de su parte)
        skin.fill(0, 0, 76, 36, BEIGE, 8);          // cuerpo
        skin.fill(76, 0, 36, 14, BEIGE, 8);         // joroba
        skin.fill(76, 14, 24, 22, BEIGE, 7);        // cuello
        skin.fill(0, 36, 32, 16, BEIGE, 7);         // cabeza
        skin.fill(32, 36, 16, 22, BEIGE, 7);        // pata

        // vientre claro: cara inferior del cuerpo (38,0)..(52,24)
        skin.fill(38, 0, 14, 24, BEIGE_CLARO, 6);
        // pelaje del lomo algo revuelto: cara superior (24,0)..(38,24)
        skin.speckle(24, 0, 14, 24, 18, PARDO);

        // silla decorativa: manta roja con ribete dorado cruzando el lomo
        // (banda central de la cara superior del cuerpo, bajo la joroba)
        skin.fill(24, 7, 14, 10, ROJO_SILLA, 5);
        skin.fill(24, 7, 14, 1, DORADO, 4);
        skin.fill(24, 16, 14, 1, DORADO, 4);
        // faldones colgando por los flancos: caras +X (0,24) y −X (38,24)
        skin.fill(8, 24, 8, 7, ROJO_SILLA, 5);
        skin.fill(8, 30, 8, 1, DORADO, 4);
        skin.fill(46, 24, 8, 7, ROJO_SILLA, 5);
        skin.fill(46, 30, 8, 1, DORADO, 4);
        // manta sobre la joroba: banda lateral (76,10)..(112,14) con ribete
        skin.fill(76, 10, 36, 4, ROJO_SILLA, 5);
        skin.fill(76, 12, 36, 1, DORADO, 4);

        // punta del hocico (cara frontal −Z de la cabeza): rect (10,46)..(16,52)
        skin.fill(10, 49, 6, 3, BEIGE_CLARO, 4);    // morro claro
        skin.px(11, 50, OSCURO);                    // fosa nasal izquierda
        skin.px(14, 50, OSCURO);                    // fosa nasal derecha
        skin.fill(12, 51, 2, 1, PARDO, 0);          // boca

        // CARA de perfil (la cabeza es alargada: los ojos van a los LADOS,
        // junto al cráneo). En las caras laterales la U crece del cráneo
        // (izquierda del rect) hacia el morro: +X (0,46)..(10,52) y
        // −X (16,46)..(26,52)
        for (const bx of [0, 16]) {
            skin.fill(bx + 2, 46, 2, 1, PARDO, 0);      // ceja/párpado
            skin.fill(bx + 2, 47, 2, 2, OSCURO, 0);     // ojo grande de perfil
            skin.px(bx + 3, 47, [238, 234, 224]);       // brillo del ojo
            skin.fill(bx + 6, 51, 3, 1, PARDO, 0);      // línea de la boca
            skin.px(bx + 8, 49, PARDO);                 // ollar de perfil
        }

        // orejas: base + pabellón interior pardo en la cara frontal
        skin.fill(48, 36, 8, 5, BEIGE, 6);
        skin.fill(50, 38, 2, 2, PARDO, 4);

        // patas: pezuñas pardas (borde inferior lateral y cara de apoyo)
        skin.fill(32, 56, 16, 2, PARDO, 5);
        skin.fill(40, 36, 4, 4, PARDO, 5);
        // callosidades de las rodillas a media pata
        skin.fill(32, 47, 16, 1, PARDO, 6);
    },

    parts: [
        { name: 'cuerpo', size: [14, 12, 24], pivot: [0, 24, 0], origin: [-7, -6, -12], uv: [0, 0] },
        { name: 'joroba', size: [8, 4, 10], pivot: [0, 30, 0], origin: [-4, 0, -5], uv: [76, 0] },
        { name: 'cuello', size: [6, 16, 6], pivot: [0, 26, -12], origin: [-3, -2, -3], uv: [76, 14], anim: 'head' },
        { name: 'cabeza', size: [6, 6, 10], pivot: [0, 26, -12], origin: [-3, 10, -10], uv: [0, 36], anim: 'head' },
        { name: 'oreja_i', size: [2, 3, 2], pivot: [0, 26, -12], origin: [-3, 16, -2], uv: [48, 36], anim: 'head' },
        { name: 'oreja_d', size: [2, 3, 2], pivot: [0, 26, -12], origin: [1, 16, -2], uv: [48, 36], anim: 'head' },
        { name: 'pata_di', size: [4, 18, 4], pivot: [-4, 18, -9], origin: [-2, -18, -2], uv: [32, 36], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 18, 4], pivot: [4, 18, -9], origin: [-2, -18, -2], uv: [32, 36], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 18, 4], pivot: [-4, 18, 9], origin: [-2, -18, -2], uv: [32, 36], anim: 'leg1' },
        { name: 'pata_td', size: [4, 18, 4], pivot: [4, 18, 9], origin: [-2, -18, -2], uv: [32, 36], anim: 'leg0' },
    ],

    /** Voz: gruñido grave descendente en sierra (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 200, b: 0.75, d: 0.45, w: 'sawtooth', v: 0.26 }],
        hurt: [{ f: 290, b: 0.7, d: 0.22, w: 'sawtooth', v: 0.3 }],
        death: [{ f: 210, b: 0.4, d: 0.7, w: 'sawtooth', v: 0.3 }],
    },

    // Voces del pack local: la carpeta trae ambient/hurt/death con mapeo directo
    sonidos: {
        say: ['mob/camel/ambient'],
        hurt: ['mob/camel/hurt'],
        death: ['mob/camel/death'],
    },
};

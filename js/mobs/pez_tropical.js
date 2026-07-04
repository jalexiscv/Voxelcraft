/**
 * Pez tropical: mob pasivo acuático pequeño y rápido, al estilo del pez
 * payaso. Nada en el agua (aquatic: si queda varado, aletea) siguiendo el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; cerdo.js es el ejemplo canónico del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 1×5×5        → 12×10
 *   (0,16)  cola 1×3×2          → 6×5
 *   (16,16) aleta dorsal 1×2×3  → 8×5
 *
 * Modelo: lámina alta y plana (1 px de grosor) suspendida en el agua con el
 * frente a −Z. El cuerpo naranja (y 1..6) lleva dos franjas blancas
 * verticales que dan la vuelta por el lomo y el vientre; la cola blanca
 * cuelga del canto trasero (+Z) y culebrea en Y (legY0, coletazo de nado) y
 * la aleta dorsal alta corona el lomo (y 6..8). En los flancos ±X de una
 * caja el desplegado corre de atrás (columna 0) hacia delante (columna sz−1),
 * por eso los ojos van en la penúltima columna de cada flanco. Altura del
 * modelo: 8 px frente a un AABB de 0.4 bloques (6.4 px), dentro de la
 * tolerancia del validador.
 */
import { ITEMS } from '../items.js';

const NARANJA = [230, 140, 50];        // cuerpo, naranja intenso
const NARANJA_OSCURO = [190, 105, 30]; // boca y motas de las escamas
const BLANCO = [242, 240, 236];        // franjas, cola y aleta dorsal
const GRIS = [170, 172, 176];          // rayos y cantos de las aletas
const OJO = [25, 25, 35];

export default {
    id: 'pez_tropical',
    name: 'Pez tropical',
    hostile: false,
    aabb: { w: 0.4, h: 0.4 },
    hp: 3,
    speed: 1.9,
    fleeSpeed: 3.4,
    aquatic: true,
    spawn: { cap: 4, group: 3, water: true },
    // Botín: pez crudo 1 — el propio pescado es la pieza de pesca.
    drops: [{ id: ITEMS.PEZ_CRUDO, min: 1, max: 1 }],

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 12, 10, NARANJA, 7);       // cuerpo (las seis caras)
        skin.fill(0, 16, 6, 5, BLANCO, 5);         // cola
        skin.fill(16, 16, 8, 5, BLANCO, 5);        // aleta dorsal

        // escamas: motas oscuras en los flancos, antes de las franjas para
        // que estas queden limpias — rects ±X en (0,5) y (6,5), 5×5 cada uno
        skin.speckle(0, 5, 5, 5, 4, NARANJA_OSCURO);
        skin.speckle(6, 5, 5, 5, 4, NARANJA_OSCURO);

        // franjas blancas verticales: columnas locales 1 y 3 de cada flanco
        // (la 0 es la trasera y la 4 la delantera)
        for (let j = 0; j < 5; j++) {
            skin.px(1, 5 + j, BLANCO); skin.px(3, 5 + j, BLANCO);  // flanco +X
            skin.px(7, 5 + j, BLANCO); skin.px(9, 5 + j, BLANCO);  // flanco −X
        }
        // las franjas dan la vuelta por el lomo (5,0)..(6,5) y el vientre
        // (6,0)..(7,5): filas 1 y 3 (simétricas aunque el vientre corra al revés)
        skin.px(5, 1, BLANCO); skin.px(5, 3, BLANCO);
        skin.px(6, 1, BLANCO); skin.px(6, 3, BLANCO);

        // ojos: penúltima columna (delantera) de cada flanco, fila alta; la
        // pupila oscura cae sobre la franja blanca, que hace de esclerótica
        skin.px(3, 6, OJO);                        // flanco +X
        skin.px(9, 6, OJO);                        // flanco −X
        // boca: cara frontal del cuerpo (5,5)..(6,10), pixel bajo
        skin.px(5, 8, NARANJA_OSCURO);
        // canto trasero del cuerpo (11,5)..(12,10) blanco: empalma con la cola
        skin.fill(11, 5, 1, 5, BLANCO, 4);

        // cola: borde de fuga gris — punta trasera (columna 0 de cada flanco,
        // rects (0,18) y (3,18)) y cara trasera (5,18)..(6,21)
        for (let j = 0; j < 3; j++) { skin.px(0, 18 + j, GRIS); skin.px(3, 18 + j, GRIS); }
        skin.fill(5, 18, 1, 3, GRIS, 4);

        // aleta dorsal: canto superior gris (19,16)..(20,19) y rayos tenues
        skin.fill(19, 16, 1, 3, GRIS, 4);
        skin.speckle(16, 19, 3, 2, 2, GRIS);
        skin.speckle(20, 19, 3, 2, 2, GRIS);
    },

    parts: [
        { name: 'cuerpo', size: [1, 5, 5], pivot: [0, 3.5, 0], origin: [-0.5, -2.5, -2.5], uv: [0, 0] },
        { name: 'cola', size: [1, 3, 2], pivot: [0, 3.5, 2.5], origin: [-0.5, -1.5, 0], uv: [0, 16], anim: 'legY0' },
        { name: 'aleta_dorsal', size: [1, 2, 3], pivot: [0, 6, 0], origin: [-0.5, 0, -1.5], uv: [16, 16] },
    ],

    /** Voz: burbujitas agudas de seno ascendente (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { f: 950, b: 1.4, d: 0.06, w: 'sine', v: 0.12 },
            { f: 1250, b: 1.4, d: 0.05, w: 'sine', v: 0.1, at: 0.09 },
        ],
        hurt: [{ f: 1500, b: 0.8, d: 0.08, w: 'sine', v: 0.2 }],
        death: [
            { f: 1100, b: 0.55, d: 0.14, w: 'sine', v: 0.18 },
            { f: 750, b: 0.55, d: 0.16, w: 'sine', v: 0.14, at: 0.12 },
            { noise: true, f: 3000, q: 2, d: 0.18, v: 0.07, at: 0.24 },
        ],
    },
};

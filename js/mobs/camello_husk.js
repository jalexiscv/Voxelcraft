/**
 * Camello Husk: mob pasivo del desierto, variante no-muerta del camello
 * (sin jinetes en esta adaptación). Silueta de camello — cuerpo alto sobre
 * patas largas, joroba, cuello erguido y cabeza — con piel podrida
 * gris-verdosa, parches de venda y costillas marcadas. Al ser no-muerto no
 * arde al sol y aparece de noche sobre arena (ver model.js para el formato
 * de las partes y el desplegado UV; mobs.js para el comportamiento).
 *
 * Distribución de la piel 128×64 (banda superior y banda inferior):
 *   (0,0)   cabeza 6×7×10   → 32×17     (32,0) cuello 6×13×6 → 24×19
 *   (56,0)  cola 2×9×2      → 8×11      (64,0) oreja 2×3×1   → 6×4 (ambas comparten)
 *   (0,20)  cuerpo 14×12×24 → 76×36
 *   (76,20) pata 4×18×4     → 16×22 (las cuatro patas comparten desplegado)
 *   (92,20) joroba 8×5×10   → 36×15
 */

const PIEL = [136, 142, 108];          // gris verdoso podrido
const PIEL_OSCURA = [104, 110, 82];    // sombras y carne hundida
const COSTILLA = [96, 102, 76];        // surcos de las costillas marcadas
const VENDA = [180, 170, 140];         // parches de venda vieja
const VENDA_OSCURA = [156, 146, 118];  // venda sucia
const PEZUNA = [92, 88, 66];           // dedos callosos
const NARIZ = [78, 70, 52];            // fosas y boca reseca
const OJO = [186, 188, 164];           // ojo apagado, sin brillo

export default {
    id: 'camello_husk',
    name: 'Camello Husk',
    hostile: false,
    aabb: { w: 1.5, h: 2.2 },
    hp: 16,
    speed: 1.2,
    noBurn: true, // no-muerto del desierto: el sol no lo quema
    spawn: { cap: 2, group: 1, block: 'SAND', night: true },

    skin: { w: 128, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // bases de cada desplegado
        skin.fill(0, 0, 32, 17, PIEL, 8);       // cabeza
        skin.fill(32, 0, 24, 19, PIEL, 8);      // cuello
        skin.fill(56, 0, 8, 11, PIEL, 8);       // cola
        skin.fill(64, 0, 6, 4, PIEL, 8);        // oreja
        skin.fill(0, 20, 76, 36, PIEL, 8);      // cuerpo
        skin.fill(76, 20, 16, 22, PIEL, 8);     // pata
        skin.fill(92, 20, 36, 15, PIEL, 8);     // joroba

        // carne en descomposición repartida por todo el pellejo
        skin.speckle(0, 0, 32, 17, 22, PIEL_OSCURA);    // cabeza
        skin.speckle(32, 0, 24, 19, 16, PIEL_OSCURA);   // cuello
        skin.speckle(0, 20, 76, 36, 90, PIEL_OSCURA);   // cuerpo
        skin.speckle(76, 20, 16, 22, 12, PIEL_OSCURA);  // pata
        skin.speckle(92, 20, 36, 15, 26, PIEL_OSCURA);  // joroba
        skin.fill(102, 22, 8, 3, PIEL_OSCURA, 5);       // cresta podrida de la joroba

        // costillas marcadas en los flancos del cuerpo: +X (0,44)..(24,56)
        // y −X (38,44)..(62,56); surcos verticales cada 3 texels
        for (let i = 0; i < 6; i++) {
            skin.fill(3 + i * 3, 46, 1, 7, COSTILLA);   // flanco derecho (+X)
            skin.fill(40 + i * 3, 46, 1, 7, COSTILLA);  // flanco izquierdo (−X)
        }

        // parches de venda (pintados después de las costillas: las cubren)
        skin.fill(27, 26, 6, 7, VENDA, 4);              // lomo (cara superior)
        skin.speckle(27, 26, 6, 7, 4, VENDA_OSCURA);
        skin.fill(52, 46, 6, 5, VENDA, 4);              // flanco izquierdo (−X)
        skin.fill(38, 10, 6, 3, VENDA, 4);              // frente del cuello
        skin.fill(76, 32, 16, 3, VENDA, 3);             // venda anular en las patas
        skin.speckle(76, 32, 16, 3, 5, VENDA_OSCURA);

        // dedos callosos al pie de la pata y en su cara inferior
        skin.fill(76, 40, 16, 2, PEZUNA, 4);
        skin.fill(84, 20, 4, 4, PEZUNA, 4);
        // mechón reseco de la cola
        skin.fill(56, 9, 8, 2, PIEL_OSCURA, 4);

        // cara frontal de la cabeza: rect (10,10)..(16,17)
        skin.px(11, 12, OJO);                           // ojo izquierdo, apagado
        skin.px(14, 12, OJO);                           // ojo derecho, apagado
        skin.px(11, 13, PIEL_OSCURA);                   // ojeras hundidas
        skin.px(14, 13, PIEL_OSCURA);
        skin.px(11, 15, NARIZ);                         // fosas nasales resecas
        skin.px(14, 15, NARIZ);
        skin.fill(12, 16, 2, 1, NARIZ);                 // boca entreabierta
    },

    parts: [
        { name: 'cuerpo', size: [14, 12, 24], pivot: [0, 22, 0], origin: [-7, -6, -12], uv: [0, 20] },
        { name: 'joroba', size: [8, 5, 10], pivot: [0, 28, 0], origin: [-4, 0, -5], uv: [92, 20] },
        { name: 'cuello', size: [6, 13, 6], pivot: [0, 24, -11], origin: [-3, -2, -3], uv: [32, 0] },
        { name: 'cabeza', size: [6, 7, 10], pivot: [0, 34, -11], origin: [-3, -1, -9], uv: [0, 0], anim: 'head' },
        { name: 'oreja_i', size: [2, 3, 1], pivot: [0, 34, -11], origin: [-4, 5, -3], uv: [64, 0], anim: 'head' },
        { name: 'oreja_d', size: [2, 3, 1], pivot: [0, 34, -11], origin: [2, 5, -3], uv: [64, 0], anim: 'head' },
        { name: 'cola', size: [2, 9, 2], pivot: [0, 27, 12], origin: [-1, -9, -1], uv: [56, 0] },
        // paso de andadura del camello: las patas del mismo lado comparten
        // fase (izquierdas leg0, derechas leg1), no la diagonal
        { name: 'pata_di', size: [4, 18, 4], pivot: [-4, 18, -9], origin: [-2, -18, -2], uv: [76, 20], anim: 'leg0' },
        { name: 'pata_dd', size: [4, 18, 4], pivot: [4, 18, -9], origin: [-2, -18, -2], uv: [76, 20], anim: 'leg1' },
        { name: 'pata_ti', size: [4, 18, 4], pivot: [-4, 18, 9], origin: [-2, -18, -2], uv: [76, 20], anim: 'leg0' },
        { name: 'pata_td', size: [4, 18, 4], pivot: [4, 18, 9], origin: [-2, -18, -2], uv: [76, 20], anim: 'leg1' },
    ],

    /** Voz: gruñido ronco muy grave, con un soplo de aire seco por encima. */
    voice: {
        say: [
            { f: 72, b: 0.6, d: 0.85, w: 'sawtooth', v: 0.24 },
            { noise: true, f: 300, q: 1.5, d: 0.5, v: 0.07, at: 0.1 },
        ],
        hurt: [{ f: 115, b: 0.85, d: 0.22, w: 'sawtooth', v: 0.28 }],
        death: [
            { f: 80, b: 0.35, d: 1.2, w: 'sawtooth', v: 0.28 },
            { noise: true, f: 220, q: 1.2, d: 0.8, v: 0.08, at: 0.15 },
        ],
    },
};

/**
 * Araña: mob hostil rastrero de cuerpo bajo y ancho que persigue al jugador
 * y brinca sobre él al atacar (behavior.lunge). Sigue el contrato de
 * definición de mobs (ver model.js para el formato de las partes y el
 * desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8    → 32×16
 *   (0,16)  abdomen 10×8×10 → 40×18
 *   (0,34)  pata 16×2×2     → 36×4 (las cuatro patas izquierdas la comparten)
 *   (0,40)  pata 16×2×2     → 36×4 (las cuatro patas derechas la comparten)
 *
 * Modelo: abdomen atrás (+Z) y cabeza delante (−Z) a media altura; las ocho
 * patas pivotan en el costado del abdomen y se extienden hacia fuera (±X),
 * con rot estática que las abre en Y (abanico escalonado ±0.5..±0.9) y las
 * deja caer en Z (±0.35). El render aplica Rz tras Ry, así que la caída
 * efectiva es 16·cos(ry)·sen(0.35): con el pivote a 6 px las puntas de las
 * patas interiores rozan el suelo y las exteriores quedan a ~1.4 px. Altura
 * del modelo: 13 px frente a un AABB de 0.9 bloques (14.4 px), dentro de la
 * tolerancia del validador.
 */

const NEGRO = [38, 34, 36];            // quitina oscura
const PELO = [80, 76, 78];             // pelillos grises
const ROJIZO = [96, 44, 40];           // marca tenue del abdomen
const OJO = [200, 40, 40];             // rojo brillante
const BRILLO = [255, 120, 120];        // destello de los ojos centrales

export default {
    id: 'arana',
    name: 'Araña',
    hostile: true,
    aabb: { w: 1.4, h: 0.9 },
    hp: 16,
    speed: 2.2,
    spawn: { cap: 3, group: 1 },

    /** Persecución rápida cuerpo a cuerpo con brinco al morder. */
    behavior: { aggro: 14, attackRange: 1.9, damage: 2, cooldown: 1.1, lunge: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, NEGRO, 5);        // cabeza
        skin.fill(0, 16, 40, 18, NEGRO, 5);       // abdomen
        skin.fill(0, 34, 36, 4, NEGRO, 4);        // pata izquierda
        skin.fill(0, 40, 36, 4, NEGRO, 4);        // pata derecha

        // pelillos grises repartidos por todo el cuerpo
        skin.speckle(0, 0, 32, 16, 26, PELO);     // cabeza
        skin.speckle(0, 16, 40, 18, 44, PELO);    // abdomen
        skin.speckle(0, 34, 36, 4, 10, PELO);     // patas izquierdas
        skin.speckle(0, 40, 36, 4, 10, PELO);     // patas derechas

        // marca rojiza tenue en el lomo: cara superior del abdomen (10,16)..(20,26)
        skin.fill(14, 18, 2, 6, ROJIZO, 4);       // trazo central
        skin.px(13, 19, ROJIZO);                  // brazos de la marca
        skin.px(16, 19, ROJIZO);
        skin.px(13, 22, ROJIZO);
        skin.px(16, 22, ROJIZO);

        // cara frontal de la cabeza: rect (8,8)..(16,16) — 8 ojos rojos
        skin.px(8, 10, OJO); skin.px(9, 10, OJO);     // laterales altos
        skin.px(14, 10, OJO); skin.px(15, 10, OJO);
        skin.px(8, 12, OJO); skin.px(9, 12, OJO);     // laterales bajos
        skin.px(14, 12, OJO); skin.px(15, 12, OJO);
        skin.fill(10, 11, 2, 2, OJO);                 // central izquierdo (2×2)
        skin.fill(12, 11, 2, 2, OJO);                 // central derecho (2×2)
        skin.px(10, 11, BRILLO);                      // destello de cada central
        skin.px(13, 11, BRILLO);
        skin.px(9, 14, OJO); skin.px(10, 14, OJO);    // pareja inferior
        skin.px(13, 14, OJO); skin.px(14, 14, OJO);
    },

    parts: [
        { name: 'abdomen', size: [10, 8, 10], pivot: [0, 9, 4], origin: [-5, -4, -5], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 9, -1], origin: [-4, -4, -8], uv: [0, 0], anim: 'head' },
        // patas izquierdas (−X): abanico en Y de delante hacia atrás, caídas en Z
        { name: 'pata_i1', size: [16, 2, 2], pivot: [-5, 6, 0], origin: [-16, -1, -1], uv: [0, 34], rot: [0, -0.9, 0.35], anim: 'legY0' },
        { name: 'pata_i2', size: [16, 2, 2], pivot: [-5, 6, 2], origin: [-16, -1, -1], uv: [0, 34], rot: [0, -0.5, 0.35], anim: 'legY1' },
        { name: 'pata_i3', size: [16, 2, 2], pivot: [-5, 6, 4], origin: [-16, -1, -1], uv: [0, 34], rot: [0, 0.5, 0.35], anim: 'legY0' },
        { name: 'pata_i4', size: [16, 2, 2], pivot: [-5, 6, 6], origin: [-16, -1, -1], uv: [0, 34], rot: [0, 0.9, 0.35], anim: 'legY1' },
        // patas derechas (+X): espejo de las izquierdas con la MISMA anim por
        // pareja — el espejo en X invierte el sentido de legY en z, con lo que
        // cada pareja queda en contrafase (marcha en diagonal, no en remo)
        { name: 'pata_d1', size: [16, 2, 2], pivot: [5, 6, 0], origin: [0, -1, -1], uv: [0, 40], rot: [0, 0.9, -0.35], anim: 'legY0' },
        { name: 'pata_d2', size: [16, 2, 2], pivot: [5, 6, 2], origin: [0, -1, -1], uv: [0, 40], rot: [0, 0.5, -0.35], anim: 'legY1' },
        { name: 'pata_d3', size: [16, 2, 2], pivot: [5, 6, 4], origin: [0, -1, -1], uv: [0, 40], rot: [0, -0.5, -0.35], anim: 'legY0' },
        { name: 'pata_d4', size: [16, 2, 2], pivot: [5, 6, 6], origin: [0, -1, -1], uv: [0, 40], rot: [0, -0.9, -0.35], anim: 'legY1' },
    ],

    /** Voz: siseos de ruido filtrado y chirridos (ver SoundEngine.mobSay). */
    voice: {
        say: [{ noise: true, f: 4200, q: 1.5, d: 0.2, v: 0.14 }],
        hurt: [
            { f: 1500, b: 1.5, d: 0.1, w: 'square', v: 0.2 },          // chirrido ascendente
            { noise: true, f: 5000, q: 2, d: 0.1, v: 0.16 },
        ],
        death: [
            { noise: true, f: 3800, q: 1.2, d: 0.25, v: 0.16 },        // siseo que cae
            { noise: true, f: 2200, q: 1.2, d: 0.25, v: 0.14, at: 0.18 },
            { noise: true, f: 900, q: 1, d: 0.3, v: 0.1, at: 0.36 },
        ],
    },
};

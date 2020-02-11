/**
 * Araña de cueva: variante hostil pequeña y venenosa de la araña, que acecha
 * en cuevas y brinca sobre el jugador al atacar (behavior.lunge). Sigue el
 * contrato de definición de mobs (ver model.js para el formato de las partes
 * y el desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 6×6×6    → 24×12
 *   (0,16)  abdomen 7×6×7   → 28×13
 *   (0,34)  pata 12×2×2     → 28×4 (las cuatro patas izquierdas la comparten)
 *   (0,40)  pata 12×2×2     → 28×4 (las cuatro patas derechas la comparten)
 *
 * Modelo: copia del patrón de arana.js a escala 70 %. Abdomen atrás (+Z) y
 * cabeza delante (−Z) a media altura; las ocho patas pivotan en el costado
 * del abdomen y se extienden hacia fuera (±X), con rot estática que las abre
 * en Y (abanico escalonado ±0.5..±0.9) y las deja caer en Z (±0.35). El
 * render aplica Rz tras Ry, así que la caída efectiva es 12·cos(ry)·sen(0.35):
 * con el pivote a 4.5 px las puntas de las patas interiores rozan el suelo y
 * las exteriores quedan a ~0.9 px. Altura del modelo: 9.5 px frente a un AABB
 * de 0.7 bloques (11.2 px), dentro de la tolerancia del validador.
 */

const QUITINA = [40, 60, 70];          // quitina azul verdosa oscura
const PELO = [72, 102, 108];           // pelillos verdiazules claros
const VENENO = [56, 110, 96];          // marca venenosa del lomo
const OJO = [220, 40, 40];             // rojo brillante
const BRILLO = [255, 130, 120];        // destello de los ojos centrales

export default {
    id: 'arana_cueva',
    name: 'Araña de cueva',
    hostile: true,
    aabb: { w: 1.0, h: 0.7 },
    hp: 8,
    speed: 2.6,
    spawn: { cap: 3, group: 2, cave: true },

    /** Persecución rápida cuerpo a cuerpo con brinco al morder. */
    behavior: { aggro: 14, attackRange: 1.7, damage: 2, cooldown: 1.1, lunge: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 24, 12, QUITINA, 5);      // cabeza
        skin.fill(0, 16, 28, 13, QUITINA, 5);     // abdomen
        skin.fill(0, 34, 28, 4, QUITINA, 4);      // pata izquierda
        skin.fill(0, 40, 28, 4, QUITINA, 4);      // pata derecha

        // pelillos claros repartidos por todo el cuerpo
        skin.speckle(0, 0, 24, 12, 18, PELO);     // cabeza
        skin.speckle(0, 16, 28, 13, 30, PELO);    // abdomen
        skin.speckle(0, 34, 28, 4, 8, PELO);      // patas izquierdas
        skin.speckle(0, 40, 28, 4, 8, PELO);      // patas derechas

        // marca venenosa en el lomo: cara superior del abdomen (7,16)..(14,23)
        skin.fill(10, 17, 1, 5, VENENO, 4);       // trazo central
        skin.px(9, 18, VENENO);                   // brazos de la marca
        skin.px(11, 18, VENENO);
        skin.px(9, 21, VENENO);
        skin.px(11, 21, VENENO);

        // cara frontal de la cabeza: rect (6,6)..(12,12) — 8 ojos rojos
        skin.px(6, 7, OJO);                       // laterales altos
        skin.px(11, 7, OJO);
        skin.px(7, 8, OJO); skin.px(8, 8, OJO);   // central izquierdo
        skin.px(9, 8, OJO); skin.px(10, 8, OJO);  // central derecho
        skin.px(7, 8, BRILLO);                    // destello de cada central
        skin.px(10, 8, BRILLO);
        skin.px(7, 10, OJO);                      // pareja inferior
        skin.px(10, 10, OJO);
    },

    parts: [
        { name: 'abdomen', size: [7, 6, 7], pivot: [0, 6.5, 3], origin: [-3.5, -3, -3.5], uv: [0, 16] },
        { name: 'cabeza', size: [6, 6, 6], pivot: [0, 6.5, -0.5], origin: [-3, -3, -6], uv: [0, 0], anim: 'head' },
        // patas izquierdas (−X): abanico en Y de delante hacia atrás, caídas en Z
        { name: 'pata_i1', size: [12, 2, 2], pivot: [-3.5, 4.5, 0.5], origin: [-12, -1, -1], uv: [0, 34], rot: [0, -0.9, 0.35], anim: 'legY0' },
        { name: 'pata_i2', size: [12, 2, 2], pivot: [-3.5, 4.5, 2], origin: [-12, -1, -1], uv: [0, 34], rot: [0, -0.5, 0.35], anim: 'legY1' },
        { name: 'pata_i3', size: [12, 2, 2], pivot: [-3.5, 4.5, 3.5], origin: [-12, -1, -1], uv: [0, 34], rot: [0, 0.5, 0.35], anim: 'legY0' },
        { name: 'pata_i4', size: [12, 2, 2], pivot: [-3.5, 4.5, 5], origin: [-12, -1, -1], uv: [0, 34], rot: [0, 0.9, 0.35], anim: 'legY1' },
        // patas derechas (+X): espejo de las izquierdas con la MISMA anim por
        // pareja — el espejo en X invierte el sentido de legY en z, con lo que
        // cada pareja queda en contrafase (marcha en diagonal, no en remo)
        { name: 'pata_d1', size: [12, 2, 2], pivot: [3.5, 4.5, 0.5], origin: [0, -1, -1], uv: [0, 40], rot: [0, 0.9, -0.35], anim: 'legY0' },
        { name: 'pata_d2', size: [12, 2, 2], pivot: [3.5, 4.5, 2], origin: [0, -1, -1], uv: [0, 40], rot: [0, 0.5, -0.35], anim: 'legY1' },
        { name: 'pata_d3', size: [12, 2, 2], pivot: [3.5, 4.5, 3.5], origin: [0, -1, -1], uv: [0, 40], rot: [0, -0.5, -0.35], anim: 'legY0' },
        { name: 'pata_d4', size: [12, 2, 2], pivot: [3.5, 4.5, 5], origin: [0, -1, -1], uv: [0, 40], rot: [0, -0.9, -0.35], anim: 'legY1' },
    ],

    /** Voz: siseos agudos de ruido filtrado y chirridos (ver SoundEngine.mobSay). */
    voice: {
        say: [{ noise: true, f: 4500, q: 1.5, d: 0.15, v: 0.14 }],
        hurt: [
            { f: 1800, b: 1.5, d: 0.08, w: 'square', v: 0.18 },        // chirrido agudo ascendente
            { noise: true, f: 5400, q: 2, d: 0.08, v: 0.15 },
        ],
        death: [
            { noise: true, f: 4200, q: 1.4, d: 0.2, v: 0.15 },         // siseo que cae
            { noise: true, f: 2600, q: 1.2, d: 0.2, v: 0.13, at: 0.14 },
            { noise: true, f: 1100, q: 1, d: 0.24, v: 0.09, at: 0.28 },
        ],
    },
};

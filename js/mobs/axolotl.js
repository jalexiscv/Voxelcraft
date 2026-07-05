/**
 * Ajolote: mob pasivo acuático (aquatic: nada en el agua y aletea si queda
 * varado). Sigue el contrato de definición de mobs (ver model.js para el
 * formato de las partes y el desplegado UV; pig.js es el ejemplo canónico
 * del contrato).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 5×4×10   → 30×14
 *   (32,0)  cola 1×3×6      → 14×9
 *   (0,16)  cabeza 6×4×5    → 22×9
 *   (24,16) branquia 1×3×1  → 4×4  (las seis branquias comparten desplegado)
 *   (30,16) pata 1×2×1      → 4×3  (las cuatro patas comparten desplegado)
 *
 * Modelo: cuerpo bajo con la cabeza ancha delante (−Z); tres branquias
 * externas por costado ancladas al pivote del cuello (anim head, giran con
 * la cabeza) y cola aplanada que ondula en horizontal (legY0) al nadar.
 * Altura del modelo: 6.5 px frente a un AABB de 0.45 bloques (7.2 px).
 */

const ROSA = [240, 180, 190];              // piel rosada
const ROSA_FUERTE = [230, 120, 150];       // branquias y membrana de la cola
const ROSA_CLARO = [246, 196, 205];        // vientre
const ROSA_OSCURO = [205, 130, 145];       // deditos y punta de la cola
const FILAMENTO = [245, 150, 175];         // puntas de las branquias
const OJO = [45, 40, 60];                  // ojillos oscuros
const BOCA = [185, 90, 115];               // sonrisa

export default {
    id: 'axolotl',
    name: 'Ajolote',
    hostile: false,
    aabb: { w: 0.7, h: 0.45 },
    hp: 14,
    speed: 2.0,
    fleeSpeed: 3.0,
    aquatic: true,
    spawn: { cap: 2, group: 1, water: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 30, 14, ROSA, 6);          // cuerpo
        skin.fill(32, 0, 14, 9, ROSA, 6);          // cola
        skin.fill(0, 16, 22, 9, ROSA, 6);          // cabeza
        skin.fill(24, 16, 4, 4, ROSA_FUERTE, 6);   // branquia
        skin.fill(30, 16, 4, 3, ROSA, 5);          // pata

        // vientre más claro: cara inferior del cuerpo (15,0)..(20,10)
        skin.fill(15, 0, 5, 10, ROSA_CLARO, 4);
        // motas del lomo: cara superior del cuerpo (10,0)..(15,10)
        skin.speckle(10, 0, 5, 10, 8, ROSA_FUERTE);
        // cola: membrana en el borde superior de las caras laterales y
        // punta oscura (cara trasera (45,6)..(46,9))
        skin.fill(32, 6, 14, 1, ROSA_FUERTE, 4);
        skin.fill(45, 6, 1, 3, ROSA_OSCURO, 4);
        // branquias: filamentos claros en las puntas (fila superior de las
        // caras laterales del desplegado)
        skin.fill(24, 17, 4, 1, FILAMENTO, 4);
        // deditos oscuros: fila inferior de la pata
        skin.fill(30, 18, 4, 1, ROSA_OSCURO, 4);

        // carita sonriente: cara frontal de la cabeza (5,21)..(11,25)
        skin.px(6, 22, OJO);                       // ojo izquierdo
        skin.px(9, 22, OJO);                       // ojo derecho
        skin.px(6, 23, BOCA);                      // comisura izquierda
        skin.px(9, 23, BOCA);                      // comisura derecha
        skin.px(7, 24, BOCA);                      // centro de la sonrisa
        skin.px(8, 24, BOCA);
        skin.px(5, 23, FILAMENTO);                 // mejilla izquierda
        skin.px(10, 23, FILAMENTO);                // mejilla derecha
    },

    parts: [
        { name: 'cuerpo', size: [5, 4, 10], pivot: [0, 4, 0], origin: [-2.5, -2, -5], uv: [0, 0] },
        { name: 'cabeza', size: [6, 4, 5], pivot: [0, 4, -5], origin: [-3, -2, -5], uv: [0, 16], anim: 'head' },
        // branquias externas: tres por costado, pegadas a la cabeza y con su
        // mismo pivote para girar solidarias (comparten desplegado UV)
        { name: 'branquia_i1', size: [1, 3, 1], pivot: [0, 4, -5], origin: [-4, -0.5, -4], uv: [24, 16], anim: 'head' },
        { name: 'branquia_i2', size: [1, 3, 1], pivot: [0, 4, -5], origin: [-4, -0.5, -2.5], uv: [24, 16], anim: 'head' },
        { name: 'branquia_i3', size: [1, 3, 1], pivot: [0, 4, -5], origin: [-4, -0.5, -1], uv: [24, 16], anim: 'head' },
        { name: 'branquia_d1', size: [1, 3, 1], pivot: [0, 4, -5], origin: [3, -0.5, -4], uv: [24, 16], anim: 'head' },
        { name: 'branquia_d2', size: [1, 3, 1], pivot: [0, 4, -5], origin: [3, -0.5, -2.5], uv: [24, 16], anim: 'head' },
        { name: 'branquia_d3', size: [1, 3, 1], pivot: [0, 4, -5], origin: [3, -0.5, -1], uv: [24, 16], anim: 'head' },
        // cola aplanada: ondula en horizontal (legY0) al nadar
        { name: 'cola', size: [1, 3, 6], pivot: [0, 4, 5], origin: [-0.5, -1.5, 0], uv: [32, 0], anim: 'legY0' },
        // patitas: los pies tocan el suelo (pivot.y + origin.y = 0)
        { name: 'pata_di', size: [1, 2, 1], pivot: [-2, 2, -4], origin: [-0.5, -2, -0.5], uv: [30, 16], anim: 'leg0' },
        { name: 'pata_dd', size: [1, 2, 1], pivot: [2, 2, -4], origin: [-0.5, -2, -0.5], uv: [30, 16], anim: 'leg1' },
        { name: 'pata_ti', size: [1, 2, 1], pivot: [-2, 2, 3], origin: [-0.5, -2, -0.5], uv: [30, 16], anim: 'leg1' },
        { name: 'pata_td', size: [1, 2, 1], pivot: [2, 2, 3], origin: [-0.5, -2, -0.5], uv: [30, 16], anim: 'leg0' },
    ],

    /** Voz: pips agudos de seno, muy cortos (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 800, b: 1.1, d: 0.08, w: 'sine', v: 0.16 }],
        hurt: [{ f: 1000, b: 0.75, d: 0.1, w: 'sine', v: 0.26 }],
        death: [
            { f: 820, b: 0.6, d: 0.15, w: 'sine', v: 0.24 },
            { f: 560, b: 0.35, d: 0.35, w: 'sine', v: 0.2, at: 0.16 },
        ],
    },

    // say: el prefijo idle absorbe también idle_air (chillidos en seco al
    // quedar varado), mezcla intencionada para un mob anfibio.
    sonidos: {
        say: ['mob/axolotl/idle'],
        hurt: ['mob/axolotl/hurt'],
        death: ['mob/axolotl/death'],
    },
};

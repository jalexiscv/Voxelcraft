/**
 * Lepisma: alimaña hostil de las cuevas, veloz y rastrera (el pececillo de
 * plata). Persigue al jugador en grupo y brinca al morder (behavior.lunge).
 * Sigue el contrato de definición de mobs (ver model.js para el formato de
 * las partes y el desplegado UV; mobs.js/hostileAI para el comportamiento).
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 3×3×3   → 12×6
 *   (14,0)  tórax 3×3×4    → 14×7
 *   (30,0)  abdomen 2×2×4  → 12×6
 *   (0,8)   antena 1×1×2   → 6×3 (ambas antenas comparten desplegado)
 *   (8,8)   cerda 1×1×2    → 6×3 (las tres cerdas comparten desplegado)
 *
 * Modelo: tres segmentos en fila sobre el suelo — cabeza alzada delante
 * (−Z, y ∈ [1,4]), tórax en medio (y ∈ [0,3]) y abdomen estrecho detrás
 * (y ∈ [0,2]). Las antenas comparten el pivote de la cabeza (como el hocico
 * del cerdo) y se abren con rot Y ±0.22 y rot X +0.3 (el frente es −Z: alzar
 * una parte delantera exige rot X POSITIVA). Atrás, tres cerdas en abanico
 * pivotan en la punta del abdomen: las laterales con legY0/legY1 culebrean
 * al andar y la central queda alzada (rot X −0.35, apunta hacia ATRÁS, donde
 * el signo se invierte). Altura del modelo: 4 px frente a un AABB de 0.35
 * bloques (5.6 px), dentro de la tolerancia del validador.
 */

const PLATA = [180, 185, 190];         // quitina plateada
const PLATA_OSCURA = [140, 146, 154];  // surcos entre segmentos
const BRILLO = [212, 216, 222];        // reflejo metálico
const OJO = [28, 30, 38];              // ojillos oscuros

export default {
    id: 'lepisma',
    name: 'Lepisma',
    hostile: true,
    aabb: { w: 0.5, h: 0.35 },
    hp: 8,
    speed: 3.0,
    spawn: { cap: 4, group: 3, cave: true },

    /** Acoso rápido en enjambre: mordisco débil con brinco y poco respiro. */
    behavior: { aggro: 12, attackRange: 1.2, damage: 1, cooldown: 0.9, lunge: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 12, 6, PLATA, 7);          // cabeza
        skin.fill(14, 0, 14, 7, PLATA, 7);         // tórax
        skin.fill(30, 0, 12, 6, PLATA, 7);         // abdomen
        skin.fill(0, 8, 6, 3, PLATA_OSCURA, 5);    // antena (compartida)
        skin.fill(8, 8, 6, 3, PLATA_OSCURA, 5);    // cerda (compartida)

        // surcos de segmentación: anillos en el lomo y los costados
        skin.fill(18, 1, 3, 1, PLATA_OSCURA);      // tórax, cara superior (18,0) 3×4
        skin.fill(18, 3, 3, 1, PLATA_OSCURA);
        skin.fill(15, 4, 1, 3, PLATA_OSCURA);      // tórax, costado +X (14,4) 4×3
        skin.fill(17, 4, 1, 3, PLATA_OSCURA);
        skin.fill(22, 4, 1, 3, PLATA_OSCURA);      // tórax, costado −X (21,4) 4×3
        skin.fill(24, 4, 1, 3, PLATA_OSCURA);
        skin.fill(34, 1, 2, 1, PLATA_OSCURA);      // abdomen, cara superior (34,0) 2×4
        skin.fill(34, 3, 2, 1, PLATA_OSCURA);
        skin.fill(31, 4, 1, 2, PLATA_OSCURA);      // abdomen, costado +X (30,4) 4×2
        skin.fill(33, 4, 1, 2, PLATA_OSCURA);
        skin.fill(37, 4, 1, 2, PLATA_OSCURA);      // abdomen, costado −X (36,4) 4×2
        skin.fill(39, 4, 1, 2, PLATA_OSCURA);

        // reflejos metálicos repartidos por el cuerpo
        skin.speckle(0, 0, 12, 6, 8, BRILLO);      // cabeza
        skin.speckle(14, 0, 14, 7, 12, BRILLO);    // tórax
        skin.speckle(30, 0, 12, 6, 9, BRILLO);     // abdomen

        // cara frontal de la cabeza: rect (3,3)..(6,6) — ojillos y mandíbula
        skin.px(3, 4, OJO);                        // ojillo izquierdo
        skin.px(5, 4, OJO);                        // ojillo derecho
        skin.px(4, 5, [118, 124, 132]);            // mandíbula tenue
    },

    parts: [
        { name: 'torax', size: [3, 3, 4], pivot: [0, 0, 0], origin: [-1.5, 0, -3], uv: [14, 0] },
        { name: 'abdomen', size: [2, 2, 4], pivot: [0, 0, 1], origin: [-1, 0, 0], uv: [30, 0] },
        { name: 'cabeza', size: [3, 3, 3], pivot: [0, 2, -3], origin: [-1.5, -1, -3], uv: [0, 0], anim: 'head' },
        // antenas: comparten pivote (y desplegado) y siguen a la cabeza
        { name: 'antena_i', size: [1, 1, 2], pivot: [0, 2, -3], origin: [-1.5, 1, -5], uv: [0, 8], rot: [0.3, 0.22, 0], anim: 'head' },
        { name: 'antena_d', size: [1, 1, 2], pivot: [0, 2, -3], origin: [0.5, 1, -5], uv: [0, 8], rot: [0.3, -0.22, 0], anim: 'head' },
        // cerdas caudales (+Z): laterales en abanico que culebrean al andar
        // y filamento central alzado
        { name: 'cerda_i', size: [1, 1, 2], pivot: [0, 1.5, 5], origin: [-1, -0.5, 0], uv: [8, 8], rot: [-0.2, -0.35, 0], anim: 'legY0' },
        { name: 'cerda_d', size: [1, 1, 2], pivot: [0, 1.5, 5], origin: [0, -0.5, 0], uv: [8, 8], rot: [-0.2, 0.35, 0], anim: 'legY1' },
        { name: 'cerda_c', size: [1, 1, 2], pivot: [0, 1.5, 5], origin: [-0.5, -0.5, 0], uv: [8, 8], rot: [-0.35, 0, 0] },
    ],

    /** Voz: chirridos de insecto con ruido filtrado (ver SoundEngine.mobSay). */
    voice: {
        say: [
            { noise: true, f: 3000, q: 2, d: 0.06, v: 0.16 },
            { noise: true, f: 3000, q: 2, d: 0.06, v: 0.16, at: 0.09 },
        ],
        hurt: [
            { noise: true, f: 3600, q: 2, d: 0.08, v: 0.2 },
        ],
        death: [
            { noise: true, f: 3000, q: 2, d: 0.12, v: 0.18 },
            { noise: true, f: 1500, q: 1.5, d: 0.2, v: 0.13, at: 0.1 },
        ],
    },
};

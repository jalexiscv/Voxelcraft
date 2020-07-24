/**
 * Saqueador: mob hostil ballestero. Humanoide nocturno de piel gris cetrina
 * y ropa oscura con correas que mantiene la distancia y dispara virotes
 * (behavior.projectile, ver hostileAI en mobs.js). El brazo derecho va
 * extendido al frente sosteniendo la ballesta: una caja horizontal cruzada
 * ante la mano que comparte pivote, pose y animación con el brazo.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cabeza 8×8×8    → 32×16
 *   (32,0)  nariz 2×4×2     → 8×6
 *   (0,16)  torso 8×12×4    → 24×16
 *   (24,16) brazo 4×12×4    → 16×16 (ambos brazos comparten desplegado)
 *   (40,16) pierna 4×12×4   → 16×16 (ambas piernas comparten desplegado)
 *   (0,32)  ballesta 6×1×2  → 16×3
 *
 * Altura del modelo: 32 px (cabeza en 24..32) frente a un AABB de 1.9
 * bloques (30.4 px), dentro de la tolerancia del validador.
 */

const PIEL = [150, 150, 140];          // gris cetrino
const PIEL_OSCURA = [118, 118, 106];   // sombras del rostro
const ROPA = [60, 55, 50];             // túnica parda oscura
const ROPA_OSCURA = [44, 40, 36];      // pantalón y costuras
const BOTA = [38, 34, 30];
const CORREA = [96, 72, 46];           // cuero de las correas
const CEJA = [40, 38, 34];
const OJO_BLANCO = [232, 230, 222];
const PUPILA = [38, 42, 38];
const MADERA = [110, 80, 50];          // ballesta
const HIERRO = [148, 148, 152];
const CUERDA = [206, 200, 186];

export default {
    id: 'saqueador',
    name: 'Saqueador',
    hostile: true,
    aabb: { w: 0.6, h: 1.9 },
    hp: 24,
    speed: 1.8,
    spawn: { cap: 2, group: 2, night: true },

    /** Ballestero: hostiga a distancia con virotes lentos pero dolorosos. */
    behavior: { aggro: 16, projectile: true, damage: 3, cooldown: 2.4 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, PIEL, 8);           // cabeza
        skin.fill(32, 0, 8, 6, PIEL, 6);            // nariz
        skin.fill(0, 16, 24, 16, ROPA, 6);          // torso (túnica)
        skin.fill(24, 16, 16, 16, ROPA, 6);         // brazo (manga)
        skin.fill(40, 16, 16, 16, ROPA_OSCURA, 5);  // pierna (pantalón)
        skin.fill(0, 32, 16, 3, MADERA, 7);         // ballesta

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        // ceja única fruncida: extremos altos y centro hundido sobre los ojos
        skin.fill(8, 9, 2, 1, CEJA);
        skin.fill(14, 9, 2, 1, CEJA);
        skin.fill(10, 10, 4, 1, CEJA);
        // ojos entornados bajo el ceño
        skin.px(9, 11, OJO_BLANCO);                 // ojo izquierdo
        skin.px(10, 11, PUPILA);
        skin.px(13, 11, PUPILA);                    // ojo derecho
        skin.px(14, 11, OJO_BLANCO);
        // mueca torcida
        skin.px(9, 13, PIEL_OSCURA);
        skin.fill(10, 14, 4, 1, PIEL_OSCURA);
        // fosas en la cara frontal de la nariz: rect (34,2)..(36,6)
        skin.px(34, 5, PIEL_OSCURA);
        skin.px(35, 5, PIEL_OSCURA);

        // correas: bandolera al pecho (4,20) y a la espalda (16,20)
        skin.fill(9, 20, 2, 12, CORREA, 4);
        skin.fill(18, 20, 2, 12, CORREA, 4);
        // cinturón que rodea el torso (frente, espalda y ambos costados)
        skin.fill(0, 29, 24, 2, CORREA, 4);
        skin.px(7, 29, HIERRO);                     // hebilla
        skin.px(8, 29, HIERRO);

        // brazos: costura del hombro, puños de piel y palma de la mano
        skin.fill(24, 20, 16, 1, ROPA_OSCURA, 3);
        skin.fill(24, 30, 16, 2, PIEL, 6);
        skin.fill(32, 16, 4, 4, PIEL, 6);
        // botas y suela
        skin.fill(40, 29, 16, 3, BOTA, 4);
        skin.fill(48, 16, 4, 4, BOTA, 4);

        // ballesta: cuerda tensada en la cara superior (mira al saqueador
        // tras la rotación del brazo) y mecanismo de hierro al frente
        skin.fill(2, 32, 6, 1, CUERDA, 3);
        skin.px(4, 34, HIERRO);
        skin.px(5, 34, HIERRO);

        // ropa raída y piel curtida
        skin.speckle(0, 16, 24, 13, 14, ROPA_OSCURA);
        skin.speckle(0, 0, 32, 9, 12, PIEL_OSCURA);
    },

    parts: [
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [0, 16] },
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'nariz', size: [2, 4, 2], pivot: [0, 24, 0], origin: [-1, 1, -6], uv: [32, 0], anim: 'head' },
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [24, 16], anim: 'arm1' },
        // brazo derecho extendido al frente apuntando la ballesta; en este
        // motor (Y arriba, frente −Z) rot X POSITIVA lleva la mano al frente
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [24, 16], rot: [1.5, 0, 0], anim: 'arm0' },
        // ballesta cruzada horizontalmente ante la mano: mismo pivote, pose
        // y animación que el brazo derecho para que giren solidarios
        { name: 'ballesta', size: [6, 1, 2], pivot: [6, 22, 0], origin: [-3, -11, -1], uv: [0, 32], rot: [1.5, 0, 0], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [40, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [40, 16], anim: 'leg1' },
    ],

    /** Voz: gruñido despectivo "hmpf" (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 200, b: 0.7, d: 0.25, w: 'sawtooth', v: 0.22 }],
        hurt: [{ f: 270, b: 0.85, d: 0.14, w: 'sawtooth', v: 0.28 }],
        death: [{ f: 150, b: 0.4, d: 0.55, w: 'sawtooth', v: 0.28 }],
    },
};

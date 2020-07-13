/**
 * Fantasma: mob hostil volador nocturno. Ave espectral plana que patrulla el
 * cielo sin gravedad (flying) con un aleteo continuo de alas enormes
 * (flapL/flapR) y cae en picado sobre el jugador (lunge). Ver model.js para
 * el formato de las partes y el desplegado UV; cerdo.js es el ejemplo
 * canónico del contrato y abeja.js el volador de referencia.
 *
 * Distribución de la piel 64×64:
 *   (0,0)   cuerpo 5×3×9  → 28×12
 *   (0,16)  ala 12×1×6    → 36×7 (las dos alas comparten desplegado)
 *   (0,26)  cola 3×2×6    → 18×8
 *
 * El modelo mide 8 px de alto (borde superior de las alas), igual que el
 * AABB (0.5 bloques): cuerpo en y 4.5..7.5 y bisagras alares en y 7.
 */

const AZUL = [70, 80, 140];
const AZUL_OSCURO = [48, 55, 102];
const MEMBRANA = [58, 66, 118];
const GRIS_VIENTRE = [150, 152, 165];
const OJO = [120, 230, 120];
const OJO_BRILLO = [190, 255, 190];

export default {
    id: 'fantasma',
    name: 'Fantasma',
    hostile: true,
    aabb: { w: 0.9, h: 0.5 },
    hp: 20,
    speed: 3.4,
    flying: true,
    behavior: { aggro: 24, attackRange: 1.6, damage: 3, cooldown: 1.5, lunge: true },
    spawn: { cap: 2, group: 2, night: true },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 28, 12, AZUL, 7);          // cuerpo (desplegado completo)
        skin.fill(0, 16, 36, 7, MEMBRANA, 6);      // ala
        skin.fill(0, 26, 18, 8, AZUL, 7);          // cola

        // vientre gris: cara inferior del cuerpo (14,0)..(19,9) y fila baja
        // de las caras frontal y laterales (v 11, la más cercana al vientre)
        skin.fill(14, 0, 5, 9, GRIS_VIENTRE, 6);
        skin.fill(0, 11, 9, 1, GRIS_VIENTRE, 5);   // costado +X
        skin.fill(9, 11, 5, 1, GRIS_VIENTRE, 5);   // frente
        skin.fill(14, 11, 9, 1, GRIS_VIENTRE, 5);  // costado −X
        // cresta dorsal oscura: columna central de la cara superior (9,0)..(14,9)
        skin.fill(11, 0, 1, 9, AZUL_OSCURO, 4);
        skin.speckle(9, 0, 5, 9, 6, AZUL_OSCURO);  // lomo espectral moteado

        // ojos verdes brillantes: cara frontal del cuerpo (9,9)..(14,12), fila
        // central; el texel exterior de cada ojo lleva un brillo más claro
        skin.fill(9, 10, 2, 1, OJO);               // ojo izquierdo
        skin.fill(12, 10, 2, 1, OJO);              // ojo derecho
        skin.px(9, 10, OJO_BRILLO);
        skin.px(13, 10, OJO_BRILLO);
        // el ojo asoma por el borde delantero de cada costado (u crece hacia
        // el frente en las caras laterales)
        skin.px(8, 10, OJO);                       // costado +X
        skin.px(22, 10, OJO);                      // costado −X

        // ala: borde de ataque (frente) huesudo y oscuro en sus tres caras
        skin.fill(6, 16, 12, 1, AZUL_OSCURO, 4);   // cara superior, fila frontal
        skin.fill(18, 21, 12, 1, AZUL_OSCURO, 4);  // cara inferior, fila frontal
        skin.fill(6, 22, 12, 1, AZUL_OSCURO, 4);   // cara frontal (−Z)
        skin.speckle(6, 17, 12, 5, 10, AZUL);      // venas de la membrana

        // cola: punta trasera oscurecida en todas sus caras
        skin.fill(6, 30, 3, 2, AZUL_OSCURO, 4);    // cara superior (v crece hacia atrás)
        skin.fill(9, 26, 3, 2, AZUL_OSCURO, 4);    // cara inferior (v crece hacia el frente)
        skin.fill(0, 32, 2, 2, AZUL_OSCURO, 4);    // costado +X (u crece hacia el frente)
        skin.fill(9, 32, 2, 2, AZUL_OSCURO, 4);    // costado −X
        skin.fill(15, 32, 3, 2, AZUL_OSCURO, 4);   // cara trasera (la punta misma)
    },

    parts: [
        { name: 'cuerpo', size: [5, 3, 9], pivot: [0, 6, 0], origin: [-2.5, -1.5, -4.5], uv: [0, 0] },
        // alas enormes con bisagra en el flanco superior del cuerpo
        { name: 'ala_i', size: [12, 1, 6], pivot: [-2.5, 7, 0], origin: [-12, 0, -3], uv: [0, 16], anim: 'flapL' },
        { name: 'ala_d', size: [12, 1, 6], pivot: [2.5, 7, 0], origin: [0, 0, -3], uv: [0, 16], anim: 'flapR' },
        { name: 'cola', size: [3, 2, 6], pivot: [0, 6, 4.5], origin: [-1.5, -1, 0], uv: [0, 26] },
    ],

    /** Voz: chillido espectral de sierra que cae en picado (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 800, b: 0.5, d: 0.4, w: 'sawtooth', v: 0.2 }],
        hurt: [{ f: 950, b: 0.65, d: 0.16, w: 'sawtooth', v: 0.3 }],
        death: [{ f: 720, b: 0.3, d: 0.7, w: 'sawtooth', v: 0.26 }],
    },
};

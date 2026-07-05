/**
 * Fantasma feliz: mob pasivo volador de gran tamaño (a escala reducida). Un
 * cubo blanco de 38×38×38 px con cara sonriente y nueve tentáculos cortos
 * colgando debajo, que se mecen con leg0/leg1 (ver model.js para el formato
 * de las partes y el desplegado UV; pig.js es el ejemplo canónico).
 *
 * El cubo se modela en DOS mitades de 38×38×19 que comparten desplegado: el
 * desplegado de un cubo de 38 mide 152 px de ancho (4×38) y no cabe en una
 * piel de 128; el de cada mitad mide 114×57 y sí. Las caras interiores (+Z
 * de la frontal, −Z de la trasera) quedan ocultas entre ambas mitades.
 * El AABB usa w:2 (tope del contrato) aunque el cuerpo mida 2.375 bloques.
 *
 * Distribución de la piel 128×128:
 *   (0,0)   mitad del cuerpo 38×38×19 → 114×57 (ambas mitades lo comparten)
 *   (0,60)  tentáculo 4×8×4 → 16×12 (los nueve lo comparten)
 */
import { ITEMS } from '../items.js';

const BLANCO = [240, 240, 245];
const BLANCO_SOMBRA = [220, 220, 230];
const GRIS_OSCURO = [70, 70, 82];
const ROSA_MEJILLA = [235, 168, 178];

export default {
    id: 'happy_ghast',
    name: 'Fantasma feliz',
    hostile: false,
    aabb: { w: 2, h: 2.4 },
    hp: 20,
    speed: 1.6,
    fleeSpeed: 2.6,
    flying: true,
    spawn: { cap: 1, group: 1, block: 'ANY' },
    // Botín: membrana 0-1 — su cuerpo etéreo deja el mismo tejido que el fantasma.
    drops: [{ id: ITEMS.MEMBRANA, min: 0, max: 1 }],

    skin: { w: 128, h: 128 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        // mitad del cuerpo: tapa/base (19,0)..(95,19) y franja lateral (0,19)..(114,57)
        skin.fill(19, 0, 76, 19, BLANCO, 4);
        skin.fill(0, 19, 114, 38, BLANCO, 4);
        // tentáculo: tapa/base (4,60)..(12,64) y franja lateral (0,64)..(16,72)
        skin.fill(4, 60, 8, 4, BLANCO, 4);
        skin.fill(0, 64, 16, 8, BLANCO, 4);
        skin.fill(0, 70, 16, 2, BLANCO_SOMBRA, 4); // puntas algo sombreadas

        // cara feliz sobre el rect frontal de la mitad delantera: (19,19)..(57,57);
        // `rect` trabaja en coordenadas locales de esa cara de 38×38
        const rect = (x, y, w, h, c) => skin.fill(19 + x, 19 + y, w, h, c);
        // ojos cerrados y curvos en ∪ (trazo de 2 texels)
        rect(5, 10, 2, 4, GRIS_OSCURO);            // ojo izquierdo
        rect(12, 10, 2, 4, GRIS_OSCURO);
        rect(6, 13, 7, 2, GRIS_OSCURO);
        rect(24, 10, 2, 4, GRIS_OSCURO);           // ojo derecho
        rect(31, 10, 2, 4, GRIS_OSCURO);
        rect(25, 13, 7, 2, GRIS_OSCURO);
        // mejillas rosadas a los lados, bajo los ojos
        rect(2, 16, 4, 3, ROSA_MEJILLA);
        rect(32, 16, 4, 3, ROSA_MEJILLA);
        // sonrisa amplia: arco escalonado de 26 texels de ancho
        rect(6, 20, 2, 3, GRIS_OSCURO);            // comisura izquierda
        rect(8, 23, 2, 2, GRIS_OSCURO);
        rect(10, 25, 18, 2, GRIS_OSCURO);          // labio inferior
        rect(28, 23, 2, 2, GRIS_OSCURO);
        rect(30, 20, 2, 3, GRIS_OSCURO);           // comisura derecha
    },

    parts: [
        // cubo en dos mitades (frontal −Z y trasera +Z) con desplegado compartido
        { name: 'cuerpo_frontal', size: [38, 38, 19], pivot: [0, 8, 0], origin: [-19, 0, -19], uv: [0, 0] },
        { name: 'cuerpo_trasero', size: [38, 38, 19], pivot: [0, 8, 0], origin: [-19, 0, 0], uv: [0, 0] },
        // nueve tentáculos en rejilla 3×3 bajo el cuerpo, alternando leg0/leg1
        // en damero; cuelgan del borde inferior del cubo (y=8) hasta el suelo
        { name: 'tentaculo_fi', size: [4, 8, 4], pivot: [-12, 8, -12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg0' },
        { name: 'tentaculo_fc', size: [4, 8, 4], pivot: [0, 8, -12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg1' },
        { name: 'tentaculo_fd', size: [4, 8, 4], pivot: [12, 8, -12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg0' },
        { name: 'tentaculo_ci', size: [4, 8, 4], pivot: [-12, 8, 0], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg1' },
        { name: 'tentaculo_cc', size: [4, 8, 4], pivot: [0, 8, 0], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg0' },
        { name: 'tentaculo_cd', size: [4, 8, 4], pivot: [12, 8, 0], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg1' },
        { name: 'tentaculo_ti', size: [4, 8, 4], pivot: [-12, 8, 12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg0' },
        { name: 'tentaculo_tc', size: [4, 8, 4], pivot: [0, 8, 12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg1' },
        { name: 'tentaculo_td', size: [4, 8, 4], pivot: [12, 8, 12], origin: [-2, -8, -2], uv: [0, 60], anim: 'leg0' },
    ],

    /** Voz: arrullo senoidal suave que asciende (ver SoundEngine.mobSay). */
    voice: {
        say: [{ f: 400, b: 1.25, d: 0.5, w: 'sine', v: 0.15 }],
        hurt: [{ f: 520, b: 0.8, d: 0.22, w: 'sine', v: 0.24 }],
        death: [{ f: 440, b: 0.45, d: 0.9, w: 'sine', v: 0.2 }],
    },

    // Voces reales del pack local (mob/happy_ghast): ambient1-14, hurt1-6 y death.
    sonidos: {
        say: ['mob/happy_ghast/ambient'],
        hurt: ['mob/happy_ghast/hurt'],
        death: ['mob/happy_ghast/death'],
    },
};

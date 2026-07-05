/**
 * Océano: el bioma de las columnas sumergidas del Overworld. Selecciona por
 * clase de terreno (h+1 <= SEA_LEVEL, ver BiomeMap en map.js), sin ventana
 * climática ni banda de rareza (documents/03-biomas.md, fila 3 de la tabla).
 *
 * Lo distingue que NO aporta superficie propia: el lecho marino lo pintan
 * los ruidos globales sandN/gravelN del generador, que ignora `surface` en
 * columnas sumergidas (se declara SAND/DIRT solo para cumplir el contrato).
 * Tampoco tiene árboles, cactus ni flora: toda su vida es acuática.
 *
 * Sus mobs viven íntegros en `mobs.water`: los cardúmenes (bacalao, salmón,
 * pez tropical, pez globo), los calamares (común y brillante), el delfín y
 * el nautilus como fauna de mar abierto, y los hostiles acuáticos que hacen
 * peligroso bucear de noche o en profundidad: ahogado, nautilus zombi y
 * guardián. Las listas de tierra (day/night) quedan vacías: nadie camina
 * por el fondo del mar.
 */

export default {
    id: 'oceano',
    name: 'Océano',

    // --- Selección: clase de terreno sumergido (sin clima ni rareza) ---
    terrain: 'oceano',
    clima: null,
    rare: null,

    // --- Terreno: el lecho real lo deciden los ruidos globales del generador ---
    surface: { top: 'SAND', under: 'DIRT' },
    congelado: false,

    // --- Vegetación: ninguna (todo queda bajo el agua) ---
    trees: null,
    cactus: null,
    flora: [],

    // --- Habitantes (fila «oceano» de la tabla del plan) ---
    mobs: {
        day: [],
        night: [],
        water: [
            'cod', 'salmon', 'tropical_fish', 'pufferfish', 'squid',
            'glow_squid', 'dolphin', 'nautilus', 'drowned',
            'zombie_nautilus', 'guardian',
        ],
    },
};

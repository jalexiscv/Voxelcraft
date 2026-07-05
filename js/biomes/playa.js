/**
 * Playa: la franja de arena que bordea el agua. Es un bioma de CLASE DE
 * TERRENO, no de clima: BiomeMap lo asigna a toda columna emergida con
 * h <= SEA_LEVEL+1 (ver map.js), justo por encima del océano, así que
 * aparece sin costuras alrededor de mares y lagos con cualquier clima.
 *
 * Lo distingue su desnudez: arena sobre arena (SAND/SAND) y NADA de
 * vegetación — ni árboles, ni cactus, ni flora — como la franja costera
 * del generador v0.4.x, pero ahora con habitantes propios. De día es
 * terreno de cría: tortugas que anidan en la arena y conejos de duna.
 * De noche la costa se vuelve hostil con los clásicos zombi/esqueleto,
 * el ahogado que emerge del agua a la orilla y el fantasma. En sus aguas
 * someras nadan bancos costeros: bacalao, pez tropical, delfín y pez globo.
 */

export default {
    id: 'playa',
    name: 'Playa',

    // --- Selección: clase de terreno 'playa' (h <= SEA_LEVEL+1; sin clima) ---
    terrain: 'playa',
    clima: null,
    rare: null,

    // --- Terreno: arena hasta donde alcanza la vista ---
    surface: { top: 'SAND', under: 'SAND' },
    congelado: false,

    // --- Vegetación: ninguna (arena desnuda) ---
    trees: null,
    cactus: null,
    flora: [],

    // --- Habitantes (fila «playa» de la tabla del plan) ---
    mobs: {
        day: ['turtle', 'rabbit'],
        night: ['zombie', 'skeleton', 'drowned', 'ghast'],
        water: ['cod', 'tropical_fish', 'dolphin', 'pufferfish'],
    },
};

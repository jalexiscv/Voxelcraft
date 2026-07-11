/**
 * Huerto: bancal de cultivo de los aldeanos constructores.
 *
 * Dos hileras de tierra labrada con cultivos REALES (G es el rol
 * posicional CULTIVO, como en la granja) a ambos lados de un canal
 * central de agua que recorre todo el fondo y riega cada celda: ninguna
 * queda a más de 2 bloques del agua (js/farming.js exige ≤ 4). Cuatro
 * troncos rematan las esquinas y uno sostiene la antorcha del huerto.
 * Es exclusivo de los aldeanos constructores (ver PLANOS_ALDEANOS en
 * registry.js) y queda FUERA de test/validate-plano.mjs por diseño: un
 * bancal a cielo abierto no tiene puerta, y el validador exige
 * DOOR_CLOSED en fachada.
 * Diseño original de VoxelCraft.
 */
export const PLANO = {
    id: 'huerto',
    tam: [5, 3, 7],
    clave: {
        D: 'FARMLAND', W: 'WATER', L: 'LOG', G: 'CULTIVO', T: 'TORCH',
    },
    capas: [
        [ // y0: bancales labrados, canal central a lo largo y troncos de esquina
            'LDWDL',
            'DDWDD',
            'DDWDD',
            'DDWDD',
            'DDWDD',
            'DDWDD',
            'LDWDL',
        ],
        [ // y1: cultivos sobre cada tierra labrada y antorcha sobre un tronco
            'TG.G.',
            'GG.GG',
            'GG.GG',
            'GG.GG',
            'GG.GG',
            'GG.GG',
            '.G.G.',
        ],
        [ // y2: cielo abierto (los cultivos necesitan sol para crecer)
            '.....',
            '.....',
            '.....',
            '.....',
            '.....',
            '.....',
            '.....',
        ],
    ],
};

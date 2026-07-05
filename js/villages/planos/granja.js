/**
 * Granja: parcela de cultivo a cielo abierto (documents/05-aldeas.md).
 *
 * Dos bancales 3×5 de tierra labrada con cultivos REALES (trigo, zanahoria
 * y patata en etapas variadas: G es el rol posicional CULTIVO, que el
 * materializador resuelve por columna) separados por un canal de agua
 * central que además riega los bancales, cerca baja con portillo a −Z,
 * andenes de acceso y cofre de cosecha con poste de luz.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'granja',
    tam: [9, 3, 9],
    clave: {
        S: 'SUELO', C: 'CAMINO', D: 'FARMLAND', W: 'WATER', E: 'ESQUINA',
        F: 'FENCE', P: 'DOOR_CLOSED', G: 'CULTIVO', H: 'CHEST', T: 'TORCH',
    },
    capas: [
        [ // y0: marco, andenes, bancales labrados y canal central
            'SSSSSSSSS',
            'SCCCCCCCS',
            'SDDDWDDDS',
            'SDDDWDDDS',
            'SDDDWDDDS',
            'SDDDWDDDS',
            'SDDDWDDDS',
            'SCCCCCCCS',
            'SSSSSSSSS',
        ],
        [ // y1: cerca con portillo (fachada −Z), cultivos y cofre
            'EFFFPFFFE',
            'F.......F',
            'FGGG.GGGF',
            'FGGG.GGGF',
            'FGGG.GGGF',
            'FGGG.GGGF',
            'FGGG.GGGF',
            'FF.....HF',
            'EFFFFFFFE',
        ],
        [ // y2: antorchas de entrada y poste de luz trasero
            'T.......T',
            '.........',
            '.........',
            '.........',
            '.........',
            '.........',
            '.........',
            '.T.......',
            '.........',
        ],
    ],
};

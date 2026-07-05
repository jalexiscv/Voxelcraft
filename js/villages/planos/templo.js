/**
 * Templo: nave ceremonial de la aldea (documents/05-aldeas.md).
 *
 * Planta alargada con altar al fondo (tarima de adoquín, bloque de oro y
 * antorchas), librerías con las escrituras, cofre de ofrendas y ventanas
 * solo en la franja alta (luz cenital). Tejado a dos aguas escalonado con
 * hastiales; el edificio más alto salvo la atalaya. Puerta a −Z.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'templo',
    tam: [7, 8, 9],
    clave: {
        S: 'SUELO', E: 'ESQUINA', '#': 'MURO', T: 'TECHO',
        D: 'DOOR_CLOSED', W: 'WINDOW', t: 'TORCH',
        G: 'GOLD_BLOCK', P: 'COBBLE', B: 'BOOKSHELF', H: 'CHEST',
    },
    capas: [
        [ // y0: solera
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
            'SSSSSSS',
        ],
        [ // y1: nave con antorchas de entrada, librerías, cofre y tarima
            'E##D##E',
            '#t...t#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#B...B#',
            '#HPPP.#',
            'E#####E',
        ],
        [ // y2: vano de la puerta y altar (oro flanqueado por antorchas)
            'E##.##E',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.tGt.#',
            'E#####E',
        ],
        [ // y3: fuste de muros
            'E#####E',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            'E#####E',
        ],
        [ // y4: franja alta de ventanas (luz cenital)
            'E##W##E',
            '#.....#',
            'W.....W',
            '#.....#',
            'W.....W',
            '#.....#',
            'W.....W',
            '#.....#',
            'E##W##E',
        ],
        [ // y5: coronación de muros
            'E#####E',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            '#.....#',
            'E#####E',
        ],
        [ // y6: aleros del tejado y hastiales
            'TT###TT',
            'TT...TT',
            'TT...TT',
            'TT...TT',
            'TT...TT',
            'TT...TT',
            'TT...TT',
            'TT...TT',
            'TT###TT',
        ],
        [ // y7: caballete
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
            '..TTT..',
        ],
    ],
};

/**
 * Casa grande: vivienda familiar en L (documents/05-aldeas.md).
 *
 * Salón al frente con mesa de crafteo, horno y librería; ala-dormitorio al
 * fondo con dos camas y cofre. Puerta centrada a −Z apilada en dos alturas
 * y techo plano escalonado que remarca la silueta en L.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'casa_grande',
    tam: [11, 6, 9],
    clave: {
        S: 'SUELO', E: 'ESQUINA', M: 'MURO', T: 'TECHO',
        D: 'DOOR_CLOSED', V: 'WINDOW', t: 'TORCH', B: 'BED',
        C: 'CHEST', K: 'CRAFTING_TABLE', F: 'FURNACE', L: 'BOOKSHELF',
    },
    capas: [
        [ // y0: solera en L
            'SSSSSSSSSSS',
            'SSSSSSSSSSS',
            'SSSSSSSSSSS',
            'SSSSSSSSSSS',
            'SSSSSSSSSSS',
            '.....SSSSSS',
            '.....SSSSSS',
            '.....SSSSSS',
            '.....SSSSSS',
        ],
        [ // y1: salón (crafteo/horno/librería) y dormitorio (camas/cofre)
            'EMMMMDMMMME',
            'Mt.......LM',
            'M.........M',
            'MKF.......M',
            'EMMME.....M',
            '.....M...CM',
            '.....M....M',
            '.....MBtB.M',
            '.....EMMMME',
        ],
        [ // y2: segunda altura de la puerta y ventanas
            'EMVMMDMMVME',
            'M.........M',
            'V.........V',
            'M.........M',
            'EMVME.....M',
            '.....M....M',
            '.....V....V',
            '.....M....M',
            '.....EMVMME',
        ],
        [ // y3: coronación de muros
            'EMMMMMMMMME',
            'M.........M',
            'M.........M',
            'M.........M',
            'EMMME.....M',
            '.....M....M',
            '.....M....M',
            '.....M....M',
            '.....EMMMME',
        ],
        [ // y4: losa completa del techo
            'TTTTTTTTTTT',
            'TTTTTTTTTTT',
            'TTTTTTTTTTT',
            'TTTTTTTTTTT',
            'TTTTTTTTTTT',
            '.....TTTTTT',
            '.....TTTTTT',
            '.....TTTTTT',
            '.....TTTTTT',
        ],
        [ // y5: tapa retranqueada 1 bloque
            '...........',
            '.TTTTTTTTT.',
            '.TTTTTTTTT.',
            '.TTTTTTTTT.',
            '.....TTTTT.',
            '......TTTT.',
            '......TTTT.',
            '......TTTT.',
            '...........',
        ],
    ],
};

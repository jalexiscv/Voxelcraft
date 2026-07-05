/**
 * Biblioteca: sala de lectura de la aldea (documents/05-aldeas.md).
 *
 * Muros forrados de librerías por dentro, escritorio (mesa de crafteo) y
 * archivo (cofre) junto a los ventanales de la fachada, clerestorio de
 * ventanas en la franja alta y techo a dos aguas escalonado. Puerta de
 * doble altura a −Z.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'biblioteca',
    tam: [9, 6, 8],
    clave: {
        S: 'SUELO', E: 'ESQUINA', M: 'MURO', T: 'TECHO',
        P: 'DOOR_CLOSED', V: 'WINDOW', B: 'BOOKSHELF',
        C: 'CRAFTING_TABLE', H: 'CHEST', t: 'TORCH',
    },
    capas: [
        [ // y0: solera
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
            'SSSSSSSSS',
        ],
        [ // y1: ventanales, escritorio, archivo y librerías perimetrales
            'EMVVPVVME',
            'MB.C.H.BM',
            'MB.....BM',
            'MB.....BM',
            'MB.....BM',
            'MB.....BM',
            'MBBBBBBBM',
            'EMMMMMMME',
        ],
        [ // y2: segunda altura de puerta, ventanales y librerías
            'EMVVPVVME',
            'MB.....BM',
            'MB.....BM',
            'MB.....BM',
            'MB.....BM',
            'MB.....BM',
            'MBBBBBBBM',
            'EMMMMMMME',
        ],
        [ // y3: clerestorio lateral y antorchas sobre las librerías
            'EMVVMVVME',
            'Mt.....tM',
            'V.......V',
            'V.......V',
            'V.......V',
            'V.......V',
            'Mt.....tM',
            'EMMMMMMME',
        ],
        [ // y4: aleros y hastiales del tejado a dos aguas
            'TTMMMMMTT',
            'TT.....TT',
            'TT.....TT',
            'TT.....TT',
            'TT.....TT',
            'TT.....TT',
            'TT.....TT',
            'TTMMMMMTT',
        ],
        [ // y5: cumbrera
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
            '..TTTTT..',
        ],
    ],
};

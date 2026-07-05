/**
 * Pozo: el punto de reunión que ancla la aldea (documents/05-aldeas.md).
 *
 * Plaza pavimentada 7×7 con brocal 3×3 (agua sobre fondo estanco), valla
 * perimetral con portillo a −Z y tejadillo sobre postes coronado por la
 * antorcha-faro que hace de «campana» del asentamiento.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'pozo',
    tam: [7, 6, 7],
    clave: {
        C: 'CAMINO', S: 'SUELO', F: 'FENCE', D: 'DOOR_CLOSED',
        E: 'ESQUINA', M: 'MURO', W: 'WATER', T: 'TORCH', R: 'TECHO',
    },
    capas: [
        [ // y0: pavimento de la plaza y fondo estanco del pozo
            'CCCCCCC',
            'CCCCCCC',
            'CCSSSCC',
            'CCSSSCC',
            'CCSSSCC',
            'CCCCCCC',
            'CCCCCCC',
        ],
        [ // y1: valla con portillo (fachada −Z) y brocal con agua
            'FFFDFFF',
            'F.....F',
            'F.EME.F',
            'F.MWM.F',
            'F.EME.F',
            'F.....F',
            'FFFFFFF',
        ],
        [ // y2: antorchas de esquina y postes del tejadillo
            'T.....T',
            '.......',
            '..F.F..',
            '..T.T..',
            '..F.F..',
            '.......',
            'T.....T',
        ],
        [ // y3: fuste de los postes
            '.......',
            '.......',
            '..F.F..',
            '.......',
            '..F.F..',
            '.......',
            '.......',
        ],
        [ // y4: tejadillo plano 3×3
            '.......',
            '.......',
            '..RRR..',
            '..RRR..',
            '..RRR..',
            '.......',
            '.......',
        ],
        [ // y5: antorcha-faro cimera
            '.......',
            '.......',
            '.......',
            '...T...',
            '.......',
            '.......',
            '.......',
        ],
    ],
};

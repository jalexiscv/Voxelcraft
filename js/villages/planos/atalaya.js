/**
 * Atalaya: torre de vigilancia de la aldea (documents/05-aldeas.md).
 *
 * Garita baja 5×5 con cofre de suministros, fuste 3×3 con troneras y
 * chimenea interior de 1×1 para subir apilando bloques (no hay escaleras),
 * plataforma en voladizo con parapeto de vallas, cuatro antorchas-faro y
 * techo plano. Puerta a −Z.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'atalaya',
    tam: [5, 10, 5],
    clave: {
        S: 'SUELO', M: 'MURO', E: 'ESQUINA', T: 'TECHO',
        D: 'DOOR_CLOSED', V: 'WINDOW', A: 'TORCH', H: 'CHEST', F: 'FENCE',
    },
    capas: [
        [ // y0: solera
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
        ],
        [ // y1: garita con puerta, antorcha y cofre
            'EMDME',
            'M...M',
            'M...M',
            'MA.HM',
            'EMMME',
        ],
        [ // y2: vano de la puerta y ventanas de la garita
            'EM.ME',
            'M...M',
            'V...V',
            'M...M',
            'EMVME',
        ],
        [ // y3: forjado con hueco central de subida
            'TTTTT',
            'TTTTT',
            'TT.TT',
            'TTTTT',
            'TTTTT',
        ],
        [ // y4: fuste 3×3
            '.....',
            '.EME.',
            '.M.M.',
            '.EME.',
            '.....',
        ],
        [ // y5: fuste con tronera al frente
            '.....',
            '.EVE.',
            '.M.M.',
            '.EME.',
            '.....',
        ],
        [ // y6: plataforma en voladizo con hueco de subida
            'SSSSS',
            'SSSSS',
            'SS.SS',
            'SSSSS',
            'SSSSS',
        ],
        [ // y7: parapeto de vallas
            'EFFFE',
            'F...F',
            'F...F',
            'F...F',
            'EFFFE',
        ],
        [ // y8: antorchas-faro en las cuatro direcciones
            'E.A.E',
            '.....',
            'A...A',
            '.....',
            'E.A.E',
        ],
        [ // y9: techo plano sobre los postes de esquina
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
        ],
    ],
};

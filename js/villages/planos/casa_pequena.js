/**
 * Casa pequeña: vivienda mínima de un aldeano (documents/05-aldeas.md).
 *
 * Una habitación 3×3 con cama, cofre y antorcha; puerta a −Z con vano de
 * 2 de alto y tejado a cuatro aguas escalonado en dos niveles.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'casa_pequena',
    tam: [5, 5, 5],
    clave: {
        S: 'SUELO', E: 'ESQUINA', M: 'MURO', T: 'TECHO',
        D: 'DOOR_CLOSED', V: 'WINDOW', B: 'BED', C: 'CHEST', A: 'TORCH',
    },
    capas: [
        [ // y0: solera
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
        ],
        [ // y1: muros, puerta centrada, cama y cofre al fondo
            'EMDME',
            'M...M',
            'M...M',
            'MC.BM',
            'EMMME',
        ],
        [ // y2: ventanas a la altura de los ojos y antorcha interior
            'EV.VE',
            'M...M',
            'M...M',
            'MA..M',
            'EMVME',
        ],
        [ // y3: losa del tejado
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
        ],
        [ // y4: remate 3×3 centrado
            '.....',
            '.TTT.',
            '.TTT.',
            '.TTT.',
            '.....',
        ],
    ],
};

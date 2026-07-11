/**
 * Choza: refugio rústico de los aldeanos constructores.
 *
 * Un solo ambiente 3×3 sin mobiliario: cuatro esquinas, muros lisos con
 * puerta centrada a −Z de vano doble, ventanas de fachada, antorcha
 * interior y techo plano de una losa. Es el plano más humilde del juego:
 * no entra en el pool del worldgen ni en el catálogo de /construir
 * (ver PLANOS_ALDEANOS en registry.js), pero cumple el contrato completo
 * de test/validate-plano.mjs.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'choza',
    tam: [5, 4, 5],
    clave: {
        S: 'SUELO', E: 'ESQUINA', M: 'MURO', T: 'TECHO',
        D: 'DOOR_CLOSED', V: 'WINDOW', A: 'TORCH',
    },
    capas: [
        [ // y0: solera
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
            'SSSSS',
        ],
        [ // y1: muros con puerta centrada en la fachada −Z
            'EMDME',
            'M...M',
            'M...M',
            'M...M',
            'EMMME',
        ],
        [ // y2: vano de la puerta, ventanas de fachada y antorcha interior
            'EV.VE',
            'M...M',
            'M...M',
            'MA..M',
            'EMMME',
        ],
        [ // y3: techo plano
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
            'TTTTT',
        ],
    ],
};

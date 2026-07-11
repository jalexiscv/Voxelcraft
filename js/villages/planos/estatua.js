/**
 * Estatua: monumento conmemorativo de los aldeanos constructores.
 *
 * Pedestal 3×3 de piedra con segunda grada en cruz de adoquín flanqueada
 * por dos antorchas votivas, figura humanoide de adoquín (piernas, torso
 * y hombros extendidos) coronada por una cabeza de oro con llama perpetua.
 * Es exclusivo de los aldeanos constructores (ver PLANOS_ALDEANOS en
 * registry.js) y queda FUERA de test/validate-plano.mjs por diseño: un
 * monumento no tiene puerta, y el validador exige DOOR_CLOSED en fachada.
 * Diseño original de VoxelCraft; solo usa bloques literales de B.
 */
export const PLANO = {
    id: 'estatua',
    tam: [3, 7, 3],
    clave: {
        P: 'STONE', C: 'COBBLE', O: 'GOLD_BLOCK', T: 'TORCH',
    },
    capas: [
        [ // y0: pedestal macizo de piedra
            'PPP',
            'PPP',
            'PPP',
        ],
        [ // y1: grada en cruz de adoquín con antorchas votivas al frente
            'TCT',
            'CCC',
            '.C.',
        ],
        [ // y2: piernas
            '...',
            '.C.',
            '...',
        ],
        [ // y3: torso
            '...',
            '.C.',
            '...',
        ],
        [ // y4: hombros extendidos a los lados del cuerpo
            '...',
            'CCC',
            '...',
        ],
        [ // y5: cabeza de oro
            '...',
            '.O.',
            '...',
        ],
        [ // y6: llama perpetua sobre la cabeza
            '...',
            '.T.',
            '...',
        ],
    ],
};

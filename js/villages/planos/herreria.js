/**
 * Herrería: taller de fundición con porche de trabajo (documents/05-aldeas.md).
 *
 * Sala cerrada con mesa de crafteo y cofre, porche lateral abierto con
 * suelo de adoquín, doble horno empotrado al fondo y chimenea de adoquín
 * que asoma sobre el techo plano. Puerta a −Z.
 * Diseño original de VoxelCraft; los roles los resuelve la paleta del bioma.
 */
export const PLANO = {
    id: 'herreria',
    tam: [9, 5, 7],
    clave: {
        E: 'ESQUINA', '#': 'MURO', T: 'TECHO', S: 'SUELO', c: 'COBBLE',
        D: 'DOOR_CLOSED', V: 'WINDOW', P: 'FENCE', t: 'TORCH',
        F: 'FURNACE', M: 'CRAFTING_TABLE', C: 'CHEST',
    },
    capas: [
        [ // y0: suelo interior (rol) y fragua de adoquín
            'SSSSScccc',
            'SSSSScccc',
            'SSSSScccc',
            'SSSSScccc',
            'SSSSScccc',
            'SSSSScccc',
            'SSSSScccc',
        ],
        [ // y1: sala con mesa/cofre, postes del porche y doble horno
            'E#D#E...P',
            '#t..#t...',
            '#...#....',
            '#...#...P',
            '#...#....',
            '#M.C#....',
            'E###E#FFE',
        ],
        [ // y2: ventanas y segunda altura del porche
            'EV.VE...P',
            '#...#....',
            '#...#....',
            'V...V...P',
            '#...#....',
            '#...#....',
            'E#V#E###E',
        ],
        [ // y3: techo plano corrido sobre sala y porche
            'TTTTTTTTT',
            'TTTTTTTTT',
            'TTTTTTTTT',
            'TTTTTTTTT',
            'TTTTTTTTT',
            'TTTTTTTTT',
            'TTTTTTTTT',
        ],
        [ // y4: chimenea de adoquín sobre los hornos
            '.........',
            '.........',
            '.........',
            '.........',
            '.........',
            '.........',
            '......cc.',
        ],
    ],
};

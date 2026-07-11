/**
 * Registro de planos de aldea: la lista canónica de arquetipos.
 *
 * Cada plano es un módulo de datos puro (documents/05-aldeas.md define el
 * contrato tam/clave/capas). Añadir un edificio = añadir su archivo aquí.
 */
import { PLANO as pozo } from './pozo.js';
import { PLANO as casa_pequena } from './casa_pequena.js';
import { PLANO as casa_grande } from './casa_grande.js';
import { PLANO as granja } from './granja.js';
import { PLANO as herreria } from './herreria.js';
import { PLANO as biblioteca } from './biblioteca.js';
import { PLANO as templo } from './templo.js';
import { PLANO as atalaya } from './atalaya.js';
import { PLANO as choza } from './choza.js';
import { PLANO as estatua } from './estatua.js';
import { PLANO as huerto } from './huerto.js';
import { PLANO as torres } from './torres.js';

/** Planos por id. */
export const PLANOS = {
    pozo, casa_pequena, casa_grande, granja,
    herreria, biblioteca, templo, atalaya,
};

/** Lista en orden estable (pozo primero: es el ancla). */
export const LISTA_PLANOS = [
    pozo, casa_pequena, casa_grande, granja,
    herreria, biblioteca, templo, atalaya,
];

/**
 * Ids de los planos exclusivos de los aldeanos constructores: NO entran
 * en LISTA_PLANOS (ni por tanto en el pool del worldgen ni en el catálogo
 * de /construir), pero PLANOS[id] los resuelve para quien los pida por
 * nombre. Se registran como propiedades no enumerables para que ninguna
 * enumeración de PLANOS (Object.keys/entries) los vea: la estatua y el
 * huerto no tienen puerta y quedan fuera del contrato de validate-plano.
 */
export const PLANOS_ALDEANOS = ['choza', 'estatua', 'huerto'];
for (const plano of [choza, estatua, huerto]) {
    Object.defineProperty(PLANOS, plano.id, { value: plano });
}

/**
 * Planos exclusivos de la CONSOLA (/construir los ofrece; el worldgen y los
 * aldeanos no los ven): también no enumerables, porque su tamaño desborda
 * el contrato 3..12 de validate-plano, pensado para caseríos de aldea.
 */
export const PLANOS_CONSOLA = ['torres'];
Object.defineProperty(PLANOS, torres.id, { value: torres });

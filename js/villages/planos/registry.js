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

/**
 * Contrato de definición de PLANO de aldea (ver documents/05-aldeas.md para
 * el plan completo: algoritmo por celdas, trazado de caminos, pool de
 * edificios y paleta de roles por bioma).
 *
 * Cada plano es un archivo de SOLO DATOS en js/villages/planos/<id>.js
 * (importable en Node, sin DOM), con esta forma (casa_pequena.js es el
 * ejemplo canónico):
 *
 *   export const PLANO = {
 *     id: 'casa_pequena',     // = nombre de archivo
 *     tam: [5, 5, 5],         // [ancho(X), alto(Y), fondo(Z)] en bloques
 *
 *     clave: {                // carácter de las capas → qué bloque poner:
 *       S: 'SUELO',           //   rol de ROLES (lo resuelve la paleta del
 *       D: 'DOOR_CLOSED',     //   bioma), rol posicional de
 *       G: 'CULTIVO',         //   ROLES_POSICIONALES (lo resuelve build.js
 *     },                      //   por columna) o nombre literal de B
 *
 *     capas: [                // alto capas, de suelo a techo; cada capa es
 *       [ 'SSSSS', ... ],     //   un array de fondo filas de ancho
 *     ],                      //   caracteres; '.' = aire (no va en clave)
 *   };
 *
 * Convenciones espaciales:
 *  - La capa 0 se estampa A NIVEL DEL SUELO: es el cimiento/solera que el
 *    aplanado por parcela apoya sobre el terreno nivelado.
 *  - La fachada mira a −Z (fila 0 de cada capa); la puerta va ahí y el
 *    generador rota el plano entero hacia el camino.
 *
 * Reglas (las hace cumplir test/validate-plano.mjs):
 *  - id obligatorio (string) = nombre de archivo.
 *  - tam: 3 enteros; ancho y fondo en 3..12 y alto en 3..12.
 *  - capas.length === alto; cada capa con fondo filas; cada fila un string
 *    de exactamente ancho caracteres.
 *  - Todo carácter usado en las capas está declarado en clave (salvo '.').
 *  - Todo valor de clave es un rol de ROLES, un rol de ROLES_POSICIONALES
 *    o un nombre existente en B.
 *  - Al menos una DOOR_CLOSED en la fila de fachada (z = 0) de la capa 1;
 *    se permite otra apilada en la capa 2 para el vano de doble altura.
 *  - Al menos una TORCH en el plano (la variante abandonada las quitará).
 *  - La capa 0 (cimiento) con ≥ 60 % de celdas no vacías.
 *
 * El registro canónico vive en js/villages/planos/registry.js (PLANOS y
 * LISTA_PLANOS); el pozo es el ancla del trazado y por eso NO entra en el
 * pool de parcelas.
 */
import { B } from '../blocks.js';

/** Roles de paleta que el generador resuelve por bioma. */
export const ROLES = ['ESQUINA', 'MURO', 'TECHO', 'SUELO', 'CAMINO'];

/**
 * Roles POSICIONALES: no los resuelve la paleta del bioma sino el
 * materializador (build.js) por la posición de mundo de cada columna.
 * CULTIVO es el sembrado de las granjas: familia (trigo/zanahoria/patata)
 * y etapa 0..3 salen de un hash determinista de (semilla, x, z), así que
 * el bancal se ve variado pero idéntico se genere el chunk que se genere.
 */
export const ROLES_POSICIONALES = ['CULTIVO'];

/**
 * Biomas donde puede anclar una aldea (ids del catálogo generado del pack,
 * los mismos pueblos del MC real: llanura, sabana, desierto, taiga y nieve);
 * el bioma del centro decide el estilo arquitectónico completo.
 */
export const BIOMAS_ALDEA = ['plains', 'sunflower_plains', 'savanna', 'desert', 'taiga', 'cold_taiga', 'ice_plains'];

/**
 * Paleta de bloques (nombres de B) por bioma, según la tabla del plan.
 * plains es el comodín: los bosques comparten su estilo y cualquier bioma
 * sin paleta propia cae en ella. Sin arenisca en el registro, el desierto
 * construye con arena (no hay física de caída: es estable).
 */
export const PALETAS = {
    plains:           { ESQUINA: 'LOG',        MURO: 'PLANKS', TECHO: 'PLANKS',     SUELO: 'COBBLE', CAMINO: 'DIRT' },
    sunflower_plains: { ESQUINA: 'LOG',        MURO: 'PLANKS', TECHO: 'PLANKS',     SUELO: 'COBBLE', CAMINO: 'DIRT' },
    savanna:          { ESQUINA: 'ACACIA_LOG', MURO: 'PLANKS', TECHO: 'PLANKS',     SUELO: 'COBBLE', CAMINO: 'DIRT' },
    desert:           { ESQUINA: 'LOG',        MURO: 'SAND',   TECHO: 'SAND',       SUELO: 'SAND',   CAMINO: 'SAND' },
    taiga:            { ESQUINA: 'SPRUCE_LOG', MURO: 'PLANKS', TECHO: 'SPRUCE_LOG', SUELO: 'COBBLE', CAMINO: 'DIRT' },
    cold_taiga:       { ESQUINA: 'SPRUCE_LOG', MURO: 'PLANKS', TECHO: 'SNOW',       SUELO: 'PLANKS', CAMINO: 'SNOW' },
    ice_plains:       { ESQUINA: 'SPRUCE_LOG', MURO: 'PLANKS', TECHO: 'SNOW',       SUELO: 'PLANKS', CAMINO: 'SNOW' },
};

/**
 * Pool de edificios por parcela con sus pesos de sorteo (documents/05-aldeas.md).
 * El pozo NO está en el pool: es el ancla que funda la aldea.
 */
export const POOL = {
    casa_pequena: 4,
    granja: 3,
    casa_grande: 2,
    herreria: 1,
    biblioteca: 1,
    templo: 1,
    atalaya: 1,
};

/** Edificios de oficio singulares: máximo uno de cada por aldea. */
export const UNICOS = ['herreria', 'biblioteca', 'templo', 'atalaya'];

/**
 * Resuelve un rol de paleta al NOMBRE de bloque de B para el bioma dado;
 * los biomas sin paleta propia (bosques, junglas…) usan la de plains.
 */
export function resolverRol(rol, biomaId) {
    const paleta = PALETAS[biomaId] || PALETAS.plains;
    return paleta[rol];
}

/**
 * Resuelve un valor de clave (rol de paleta o nombre literal de bloque) al
 * id numérico de B para el bioma dado; undefined si el nombre no existe.
 * Los roles de ROLES_POSICIONALES devuelven null: no tienen bloque fijo,
 * los resuelve el materializador por la posición de cada columna.
 */
export function resolverBloque(valor, biomaId) {
    if (ROLES_POSICIONALES.includes(valor)) return null; // se resuelve por posición
    const nombre = ROLES.includes(valor) ? resolverRol(valor, biomaId) : valor;
    return B[nombre];
}

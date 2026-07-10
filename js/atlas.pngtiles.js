/**
 * Registro de téselas del atlas que se cargan desde PNG del paquete de
 * texturas real (textures/blocks/*.png) en vez de pintarse proceduralmente.
 *
 * Es la contraparte de `painters` de atlas.js: `painters[idx]` pinta la tésela
 * `idx` con Canvas 2D; `PNG_TILES[idx]` la rellena con la imagen de ese PNG.
 * Una tésela debe estar en UNO de los dos, no en ambos. buildAtlasAsync()
 * carga primero los PNG y encima aplica los painters, así que si por error una
 * tésela estuviera en ambos, ganaría el painter.
 *
 * Cada valor es la ruta relativa del PNG (sin extensión ni carpeta: el
 * cargador antepone BLOCKS_DIR y añade .png). Las imágenes deben ser de
 * TILE_PX×TILE_PX (16×16); si no, el cargador las escala al vuelo.
 *
 * Este archivo es el que crecerá al añadir los materiales del juego: cada
 * bloque nuevo con textura real es una línea aquí + su índice en TILE + su
 * entrada de bloque en blocks.js.
 */
import { TILE } from './atlas.js';
import { MAT_PNG_TILES } from './materiales.js';

/** Carpeta raíz de los PNG de bloque del paquete. */
export const BLOCKS_DIR = 'textures/blocks/';

/**
 * índice de tésela → nombre de archivo PNG (sin carpeta ni extensión).
 * Une las téselas piloto declaradas a mano con las de los materiales generados
 * (js/materiales.js asigna sus índices de tésela a partir de MAT_TILE_BASE, muy
 * por encima de estas, así que no colisionan).
 */
export const PNG_TILES = {
    [TILE.STONE_GRANITE]:  'stone_granite',
    [TILE.STONE_DIORITE]:  'stone_diorite',
    [TILE.STONE_ANDESITE]: 'stone_andesite',
    ...MAT_PNG_TILES,
};

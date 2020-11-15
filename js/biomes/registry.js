/**
 * Registro de biomas: la única fuente de verdad de qué biomas existen y de
 * su ORDEN de selección. Añadir un bioma nuevo = crear su definición en
 * js/biomes/ (contrato en model.js, ejemplo canónico en llanura.js),
 * validarla con `node test/validate-biome.mjs <id>` e importarla aquí EN SU
 * POSICIÓN de la tabla de documents/03-biomas.md: BiomeMap recorre ORDER y
 * el primero que casa gana, con llanura como comodín final.
 */
import setas from './setas.js';
import palido from './palido.js';
import oceano from './oceano.js';
import playa from './playa.js';
import montanas from './montanas.js';
import desierto from './desierto.js';
import sabana from './sabana.js';
import jungla from './jungla.js';
import nevado from './nevado.js';
import taiga from './taiga.js';
import cerezos from './cerezos.js';
import pantano from './pantano.js';
import bosque from './bosque.js';
import llanura from './llanura.js';

/** Definiciones indexadas por id. */
export const BIOMES = {
    setas, palido, oceano, playa, montanas, desierto, sabana, jungla,
    nevado, taiga, cerezos, pantano, bosque, llanura,
};

/**
 * Orden de selección (el de la tabla del plan). En los comentarios,
 * t = temperatura, h = humedad y w = rareza, todos en [-1, 1]; ventanas
 * calibradas con la distribución real de los ruidos (ver 03-biomas.md).
 */
export const ORDER = [
    setas,     // 1.  tierra, rare w > 0.45
    palido,    // 2.  tierra, rare w < -0.45
    oceano,    // 3.  sumergido: altura+1 <= SEA_LEVEL
    playa,     // 4.  altura <= SEA_LEVEL+1 y con agua en el anillo
    montanas,  // 5.  altura >= MOUNTAIN_H (42)
    desierto,  // 6.  t 0.15..1, h -1..-0.05
    sabana,    // 7.  t 0.15..1, h -0.05..0.10
    jungla,    // 8.  t 0.15..1, h 0.10..1
    nevado,    // 9.  t -1..-0.30
    taiga,     // 10. t -0.30..-0.10, h 0..1
    cerezos,   // 11. t -0.30..-0.10, h -1..0
    pantano,   // 12. t 0..0.15, h 0.20..1 (roba la franja húmeda del bosque)
    bosque,    // 13. t -0.10..0.15, h 0.02..1
    llanura,   // 14. comodín final (tierra sin clima)
];

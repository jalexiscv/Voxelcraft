/**
 * Dimensiones verticales del mundo — fuente ÚNICA de verdad (antes había
 * copias literales en worldgen, world, biomas, aldeas y templo).
 *
 * Rango vertical al estilo del Minecraft moderno (1.18+): 384 bloques
 * totales. Internamente la y va de 0..383 (los arrays de chunk no admiten
 * índices negativos); la coordenada MOSTRADA al jugador resta Y_BASE, de
 * modo que el lecho de roca queda en −64 y el techo de construcción en 320,
 * como en el juego real:
 *
 *   interna    mostrada      Minecraft real
 *   0          −64           −64  (suelo de bedrock)
 *   SEA_LEVEL  64            62-63 (nivel del mar)
 *   383        319           319  (último bloque colocable)
 *
 * Con el mar interno en 128 quedan 128 bloques de subsuelo bajo el mar
 * (MC: 126) y 256 de cielo por encima (MC: 258).
 *
 * Módulo puro sin dependencias: lo importan por igual el hilo principal
 * (world, renderer, main) y el worker de generación (worldgen, biomas,
 * aldeas, templo).
 */

export const CHUNK = 16;         // lado del chunk en bloques
export const WORLD_HEIGHT = 384; // altura total interna (y 0..383)
export const Y_BASE = 64;        // resta para mostrar la y estilo Minecraft

export const SEA_LEVEL = 128;    // nivel del mar interno (mostrado: 64)
/**
 * Altura desde la que una columna cuenta como montaña. Mantiene la
 * distancia calibrada sobre el mar (+10) de la versión de 64 bloques:
 * los picos más altos del relieve (~0,2 % de las columnas).
 */
export const MOUNTAIN_H = SEA_LEVEL + 10;

/** Altura del plano de nubes (mostrada 192, como el MC real). */
export const CLOUD_Y = Y_BASE + 192;

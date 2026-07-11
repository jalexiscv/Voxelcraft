# Superficie continua de los líquidos: alturas por esquina (sin rendijas)

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Render > Mesher

## Descripción

Tras estrenar la fluidez (changelog 152), la superficie del agua se veía
fragmentada: franjas del fondo asomaban entre celdas de distinto nivel.

**Causa raíz:** cada celda líquida dibujaba su tapa PLANA a la altura de su
propio nivel y las caras verticales entre celdas de la misma familia se
ocultan (`hideSame`); entre dos niveles vecinos el escalón quedaba sin
contrahuella — una rendija abierta por la que se veía el fondo, sobre todo en
ángulos rasantes.

**Corrección (donde se rompe el invariante):** la tapa del líquido deja de
ser plana. Cada una de sus 4 esquinas toma el **promedio de las alturas de
las hasta 4 celdas de su familia que comparten esa esquina**, y sube a tope
(1) si alguna de ellas continúa en columna hacia arriba o es el cubo lleno de
una fuente de lava. Dos celdas vecinas comparten esquinas con el MISMO
vecindario de muestreo, así que obtienen alturas idénticas: la superficie
sale continua e inclinada hacia los niveles menores, como en el clásico, y
las rendijas desaparecen por construcción (también en las costuras entre
chunks, porque el muestreo usa `world.get` global). De paso queda cerrada la
franja que se declaró como deuda en el changelog 152 entre la fuente de lava
(cubo lleno) y su flujo.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mesher.js`
- `emitFace` acepta la altura de tapa como número (cubos, comportamiento
  intacto) o como matriz 2×2 por esquina (líquidos).
- `meshChunk` calcula las 4 esquinas de cada celda líquida expuesta con el
  promedio del vecindario 2×2 de su familia (regla de columna y de fuente de
  lava incluidas).

### [MODIFICADO] `test/fluidos.mjs`
- Prueba nueva: dos flujos vecinos de niveles 7 y 5 comparten una única
  altura en la arista común (0.65625 = promedio exacto), es decir, sin
  rendija.

## Impacto

- Puramente visual: la simulación, los ids y el guardado no cambian.
- Verificación: `node test/fluidos.mjs` (11 ✓, incluida la de continuidad) y
  `test/smoke.mjs` (318 ✓); E2E sobre el juego real repetido con captura
  cenital (las franjas del fondo ya no aparecen) y captura rasante nueva
  (lámina continua inclinada hacia los bordes, silueta cerrada).

# Reaparición siempre en la superficie (a veces se aparecía bajo el suelo)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Jugador

## Descripción

El usuario reportó que a veces, al reaparecer tras morir, el personaje
aparecía bajo el suelo. Causa: `Player.spawn()` busca una columna válida
solo en anillos alrededor del **origen (0,0)** y, cuando esa zona no está
generada — `unloadFar()` descarga los chunks no modificados al viajar
lejos, y las partidas guardadas arrancan donde se guardó, no en el
origen —, ninguna columna pasaba el filtro y el fallback plantaba al
jugador en `y ≈ 1`: enterrado bajo la barrera de chunks sin generar.
Además, si el área del origen era pleno océano, el fallback lo dejaba en
el fondo marino.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/player.js`
- `spawn()` encadena tres redes que garantizan superficie: (1) columna
  generada, seca y sobre el nivel del mar en anillos alrededor del
  **origen** (el comportamiento de siempre); (2) la misma búsqueda
  alrededor de la **posición actual** — el terreno donde se acaba de
  morir siempre está cargado; (3) la **cima de la columna actual**
  (bloque no-aire más alto, agua incluida): en pleno océano se flota en
  la superficie en vez de aparecer en el fondo, y sin ningún chunk
  cargado se cae desde el techo del mundo sobre la barrera, jamás bajo
  ella.
- Las búsquedas saltan columnas de chunks sin generar con `hasChunk`
  (antes escaneaban su columna entera de aire para descartarlas).
- Beneficia también a la tecla R (reaparición manual) y a la red de
  seguridad de caída al vacío (`y < −20`), que usan el mismo `spawn()`.

### [MODIFICADO] `test/smoke.mjs`, `documents/02-mobs.md`
- 3 comprobaciones nuevas (reaparición lejos del origen con sus chunks
  descargados, en pleno océano flotando en el agua, y sin ningún chunk
  cargado): suite 252 → **255**. Documento 02 al día.

## Impacto

- Morir lejos del origen (o en partidas cargadas lejos de él) reaparece
  sobre el terreno de la zona de la muerte en vez de enterrado en el
  lecho del mundo; el spawn inicial en mundos de puro océano flota en la
  superficie del agua.
- Suites en verde: smoke 255, mobs 124, biomas 42, aldeas 62.

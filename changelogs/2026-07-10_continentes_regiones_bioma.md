# Continentes de verdad: regiones de bioma que se viven al caminar

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Mundo > Generación

## Descripción

Caminando no se apreciaba diversidad de biomas. El diagnóstico (medido)
encontró la causa raíz en el relieve, no en el catálogo: la continentalidad
a escala /120 con una spline de −12..+9 cruzaba el nivel del mar cada ~50
bloques — un archipiélago de islotes donde el 41 % del mundo era mar, el
55 % de la tierra era cota de playa y la isla media (52 bloques) era menor
que la parcela de bioma (192): cada islote mostraba un solo bioma y el
paseo real era playa → mar → playa.

**Corrección:**

- `worldgen.js`: continentalidad a escala **/640** con spline remodelada
  (océano profundo −24 … altiplano +12) cuya banda de cruce del mar es
  estrecha (playas finas) y cuyo interior queda despegado (+5..+12), de
  modo que el relieve local no lo hunde.
- `js/biomes/map.js`: escalas climáticas acompasadas — ruido de temperatura
  a escala regional (**/700**) y parcela Voronoi de **384** bloques.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/worldgen.js`
- `BASE_SPLINE` remodelada y escala del ruido `continents` /120 → /640.

### [MODIFICADO] `js/biomes/map.js`
- `ESC_TEMP = 700` (antes 180) y `CELDA = 384` (antes 192).

### [MODIFICADO] `test/mobs.mjs`, `test/biomes.mjs`
- Las pruebas de aparición fijan el bioma del arnés a `plains` (el contrato
  del test no debe depender de la calibración del mapa real) y la búsqueda
  de flora exige chunks con flores Y hierba alta en un radio mayor.

## Impacto

- **Antes → después** (línea de 40 000 bloques, 3 semillas): tramo de tierra
  continua medio 52 → 298–412 bloques (máximos 1 848–2 328); playa 55 % →
  9–12 % de la tierra; sumergido 41 % → 37–45 %. El transecto de 6 000
  bloques pasa de 172 tramos inconexos a regiones coherentes (cinturón
  jungla→desierto con colinas, tundra con montañas de hielo, sabanas
  abiertas con acacias).
- **Los mundos cambian por completo**: a diferencia del cambio de biomas
  (solo «vestido»), aquí cambia la ALTURA del terreno — los chunks
  regenerables de los guardados existentes no encajarán con los editados
  (costuras verticales). Semillas nuevas recomendadas; afecta también al
  mundo global del servidor en zonas sin editar.
- Riesgo menor declarado: con océanos grandes, una semilla cuyo origen caiga
  en mar abierto deja la aparición inicial sobre agua (igual que antes, pero
  algo más probable).
- Verificación: 12 suites en verde (mobs 186, biomas 38, humo 318…); mapa de
  biomas de 6×6 km antes/después (confeti → continentes con regiones); E2E
  en el juego real con semilla fija: 6 biomas verificados sobre tierra firme
  a < 900 bloques del origen (antes hasta 1 800), con capturas.

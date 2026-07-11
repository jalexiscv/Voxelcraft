# El juego se pegaba cuando los aldeanos construían: remallado con presupuesto de tiempo

**Fecha:** 2026-07-11
**Módulo:** VoxelCraft > Mundo > Remallado (main.js)

## Descripción

Al empezar una obra de aldeano constructor (changelog 158) el juego sufría
congelaciones sostenidas: tirones de 100–340 ms unas dos veces por segundo
durante los minutos que dura la construcción.

### Causa raíz

La conducta del aldeano no tiene la culpa: expuso un cuello preexistente del
pipeline de remallado. La cadena causal completa, demostrada con mediciones:

1. El aldeano coloca un bloque cada 0,5 s vía `world.set` (y el canal del
   huerto añade ediciones en cascada mientras el agua se esparce, a 4 Hz).
2. Cada edición ensucia 1–3 chunks (los vecinos, si la celda toca un borde);
   colocar la **antorcha** de la choza ensucia hasta **9** (los vecinos
   alcanzables por su luz se remallan para recibir el brillo).
3. `processDirty(6)` remallaba hasta **6 chunks en un mismo fotograma**, y
   un chunk poblado del mundo real cuesta **20–35 ms** de `meshChunk` (JS
   puro, medido con el `Generator` real): hasta ~200 ms de mallado dentro de
   un solo frame, dos veces por segundo, mientras dure la obra.

Una edición puntual del jugador rara vez ensuciaba tantos chunks seguidos;
el constructor convierte ese caso raro en un flujo continuo.

### Corrección

`processDirty` pasa de presupuesto por **cantidad** (6 chunks) a presupuesto
por **tiempo** (milisegundos por fotograma, incluida la subida de la malla a
la GPU), garantizando siempre al menos un chunk por frame para que la cola
avance. En juego se remalla hasta agotar ~6 ms; en la carga inicial (donde
no hay juego que congelar) el paso es de 40 ms.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- `processDirty(budget)` → `processDirty(budgetMs)`: corta por
  `performance.now()` en vez de por conteo, con mínimo de 1 chunk por
  llamada; docblock con el porqué.
- Los dos únicos llamadores actualizados a la nueva unidad: el bucle de
  juego (`processDirty(6)` ≈ un tercio del frame de 60 fps) y el mallado
  inicial con barra de progreso (`processDirty(40)`).

## Verificación

- A/B en Node sobre el mundo real (semilla del E2E, choza y huerto
  colocados a la cadencia real del aldeano, fluidos activos, política vieja
  contra nueva — `ab-politicas.mjs` del scratchpad):
  - Choza: antes 30 frames >100 ms (máx 339 ms); después **0** (máx 99 ms).
  - Huerto: antes 39 frames >100 ms (máx 243 ms); después **0** (máx 88 ms).
  - p99 del frame: de ~120 ms a ~40 ms en ambas obras.
- E2E en el juego real (Edge headless, semilla fija): un aldeano aparecido
  con `spawnAt` emprendió choza y huerto y los construyó con el cambio
  aplicado; la carga inicial con pasos de 40 ms llegó a `playing` sin
  errores de página.
- 13 suites en verde (721+ comprobaciones: aldeanos 15, mobs 186, humo 318,
  fluidos 11…); sintaxis de main.js con `node --check`.

## Impacto

- Construir (aldeanos, `/construir`, ediciones en ráfaga del jugador o del
  multijugador) ya no congela: el remallado se reparte entre fotogramas.
- Límite declarado: un único chunk muy poblado sigue costando 20–35 ms
  (hasta ~99 ms observado con agua) y el mallado de UN chunk es indivisible
  sin un mesher incremental o en worker — el peor fotograma queda en ese
  orden, un tirón puntual en vez de una congelación sostenida.
- Decisión: se descartó bajar la cadencia del aldeano (parche de síntoma:
  `/construir` y el multijugador congelarían igual) y el mesher en worker
  (cambio de arquitectura desproporcionado para esta orden).

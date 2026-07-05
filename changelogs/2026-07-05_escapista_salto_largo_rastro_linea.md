# Dron escapista: saltos 10× más largos y rastro en línea que se disipa

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs / Efectos

## Descripción

El usuario pidió que los saltos evasivos del escapista sean 10 veces más
largos y que el rastro de partículas trace una línea que se disipa
rápidamente (en vez de la nube de puntos en el punto de despegue).

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- `evadeHop`: la distancia del salto se multiplica por `hopReach`. El
  rastro pasa de una ráfaga única al arrancar a una emisión CONTINUA cada
  `trailInterval` s mientras dura el salto, así traza una línea a lo largo
  de toda la trayectoria. Nuevo `Mob.trailT` (reloj entre emisiones).

### [MODIFICADO] `js/mobs/dron_escapista.js`
- `behavior`: `hopReach 10` (saltos ~10× más largos, ~31 bloques contra un
  dron), `trailInterval 0.03`, y `alertRadius` sube de 26 a 48 para no
  perder al cazador durante el salto largo.

### [MODIFICADO] `particles/vc_evade_trail.json`
- Rediseñado como estela LINEAL: partículas quietas (`initial_speed 0`,
  offset mínimo) de vida muy corta (0.18–0.3 s) que se encogen y se apagan,
  así el rastro dibuja la trayectoria reciente y se disipa deprisa. Color
  magenta más saturado.

### [MODIFICADO] `test/mobs.mjs`, `documents/*`
- Pruebas del salto actualizadas a la distancia larga (× `hopReach`) y la
  del escalado por velocidad reescrita para medir la distancia objetivo
  (robusta ante saltos que sacan al cazador del rango): 179 comprobaciones.

## Verificación

- Suites en verde: smoke 286, mobs 179, biomas 42, aldeas 62.
- Traza: contra un dron el salto mide ~32 bloques (10× los ~3.1 previos) y
  emite ~70 partículas de rastro por salto. En simulación, las partículas
  quedan fijas formando una línea recta (x 0→29, z≈0) y se disipan en
  ~0.3 s.
- Render en WebGL real (puppeteer + Edge): la estela magenta traza una
  línea a lo largo del recorrido del salto, con la punta brillante y la
  cola apagándose, como estela de cometa. Sin errores de consola.

## Impacto

- La evasión del escapista es mucho más espectacular: brincos largos con
  una estela luminosa que marca por dónde pasó. Le da una ventaja evasiva
  contundente contra sus cazadores.

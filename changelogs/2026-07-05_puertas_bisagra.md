# Puertas: cierre fiable, bisagra real y sin emparedamientos

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Motor / Juego

## Descripción

El usuario reportó puertas «pésimamente construidas»: no se podían volver
a cerrar, se quedaban atascadas o abrían por el centro del vano. Tres
causas reales, tres correcciones.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/player.js` — el atasco
- El raycast solo golpeaba bloques sólidos o plantas: la hoja ABIERTA
  (panel no sólido) era intocable — una vez abierta, el clic la
  atravesaba y **la puerta no podía cerrarse jamás**. Los paneles son
  ahora objetivo del rayo (clic y rotura funcionan sobre la hoja abierta).

### [MODIFICADO] `js/mesher.js` — «abría por el centro»
- Los paneles no tenían orientación: hoja siempre centrada en el bloque.
  Ahora la ORIENTACIÓN sale de las jambas vecinas: la hoja cerrada (y la
  ventana) se alinean con el muro que las enmarca — también en muros a lo
  largo de z, antes siempre quedaba atravesada — y la hoja abierta gira
  90° y **se pega a la jamba de su bisagra** en vez de flotar en el
  centro del vano. Sin jambas claras, comportamiento clásico. Sin estado
  nuevo: se deriva de los vecinos en el mallado.

### [MODIFICADO] `js/main.js` — el emparedamiento
- Cerrar una puerta contigo dentro del vano te encerraba en un bloque
  sólido (la hoja cerrada colisiona como bloque entero). El clic de
  cierre se ignora si el jugador ocupa el vano.

### [MODIFICADO] `test/smoke.mjs`, `documents/04-items.md`
- 4 comprobaciones nuevas y 1 actualizada (raycast golpea la hoja
  abierta, orientación por jambas en ambos ejes, bisagra en x±):
  suite 217 → **220**. Tabla de bloques funcionales al día.

## Impacto

- Las puertas abren, cierran, giran sobre su bisagra y ya no fabrican
  trampas; las ventanas se orientan solas en cualquier fachada.
- Suites en verde: smoke 220, mobs 124, biomas 42, aldeas 62.

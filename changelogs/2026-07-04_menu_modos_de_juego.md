# Menú reorganizado: modos de juego y opciones antes de generar el mundo

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz / Juego

## Descripción

La interfaz adopta el flujo clásico del género: pantalla de título →
**«Crear un mundo nuevo»** con todas las opciones elegidas **antes** de
generar — nombre del mundo, **modo de juego** (Supervivencia/Creativo),
**dificultad** (Normal/Pacífica), semilla y distancia de render — y solo
entonces la generación y la partida. Los modos tienen efectos reales de
jugabilidad y se persisten con el guardado.

## Tipo de Cambio

- `Agregado` / `Cambiado`

## Archivos Afectados

### [MODIFICADO] `index.html`
- Pantalla «Crear un mundo nuevo» con nombre, modo, dificultad, semilla y
  distancia; botones del título renombrados («Volver al juego», «Crear un
  mundo nuevo»); ayuda actualizada (F = vuelo solo en Creativo) y versión
  0.5.0 en pantalla.

### [MODIFICADO] `js/main.js`
- Estado del juego con `worldName`, `mode` y `difficulty`; el formulario los
  fija antes de `startWorld`.
- **Supervivencia**: sin vuelo (F desactivada), salud y daño como siempre.
- **Creativo**: vuelo libre con F, sin daño (`damagePlayer` lo ignora),
  corazones ocultos.
- **Pacífica**: bandera `peaceful` al sistema de mobs.
- Guardado/carga: el meta persiste nombre, modo y dificultad; los guardados
  antiguos cargan como Supervivencia/Normal, y el vuelo guardado solo se
  restaura en Creativo.

### [MODIFICADO] `js/mobs.js`
- `ctx.creative`: los hostiles ignoran al jugador y deambulan como pasivos
  (sin persecución, sin mecha del creeper, sin flechas).
- `ctx.peaceful`: el filtro de aparición excluye a los hostiles.

### [MODIFICADO] `test/mobs.mjs`
- Tres comprobaciones nuevas: en creativo el hostil ni ataca ni persigue; en
  pacífica no aparece ningún hostil de noche (suite: 118 → 121).

### [MODIFICADO] `documents/01-voxelcraft.md`, `documents/02-mobs.md`
- Fila de funcionalidad de modos/dificultad y recuentos actualizados.

## Impacto

- El flujo replica el patrón clásico (opciones → generar → jugar) con estilo
  visual propio del proyecto; ninguna opción se decide ya «a mitad de
  partida».
- **Corrección de la misma sesión**: al terminar la generación se entra
  DIRECTAMENTE al juego (antes reaparecía el menú y había que pulsar «Volver
  al juego»). Se intenta capturar el puntero al instante y, si el navegador
  rechaza la captura por haber caducado el gesto, el primer clic en el
  lienzo la recupera (comportamiento ya existente).
- Compatibilidad: los guardados previos siguen cargando (modo Supervivencia
  por defecto). Suites en verde: mobs 121, smoke 52, biomas 42.

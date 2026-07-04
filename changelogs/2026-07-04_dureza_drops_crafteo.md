# Dureza de bloques, drops flotantes y mesa de crafteo

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Juego / Interfaz

## Descripción

El bucle de supervivencia se completa con tres sistemas encadenados:
**dureza** (cada bloque exige uno o varios golpes según su material),
**drops** (el bloque roto queda flotando como un cubito 3D que gira y se
recoge al acercarse) y **crafteo** (fusionar materiales en la mesa —tecla
E— para fabricar herramientas que aceleran el picado del material que les
corresponde). En Creativo la rotura sigue siendo instantánea y sin drops.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/blocks.js`
- Cada definición gana `hardness` (golpes a mano) y `tool` (herramienta que
  lo acelera), derivados de la familia del material con sobrescrituras
  puntuales (obsidiana 12, menas 6, cristal/plantas 1).

### [NUEVO] `js/items.js`
- Items no colocables (palo y picos/hachas/palas de madera y piedra) con su
  herramienta y factor (madera ×2, piedra ×3), y el recetario: tronco →
  tablones → palos → herramientas; la roca picada suelta adoquín para el
  salto a piedra. `craftable`/`craft` puros y probados.

### [NUEVO] `js/drops.js`
- `DropSystem` puro: gravedad, reposo sobre el suelo, imán hacia el jugador,
  recogida por cercanía, tope de 64 y desvanecimiento a los 60 s.

### [MODIFICADO] `js/renderer.js`
- `drawDrops`: cubitos de 0,28 con las téselas de su bloque, girando y
  flotando (búfer dinámico por fotograma, mismo estado que los chunks).
- El cubo de selección enrojece con el progreso de picado.

### [MODIFICADO] `js/atlas.js`
- Siete téselas nuevas de herramientas (sprites pixelados con fondo
  transparente, fábricas pico/hacha/pala por material).

### [MODIFICADO] `js/hud.js`, `index.html`, `css/style.css`
- Mesa de crafteo (overlay con recetas, coste con existencias y botón
  Fabricar); iconos planos para items en hotbar y selector; el selector de
  supervivencia también lista las herramientas fabricadas.

### [MODIFICADO] `js/main.js`
- Picado con progreso por bloque (se reinicia al cambiar de objetivo o
  soltar), factor de la herramienta en mano, drops al romper (roca→adoquín,
  suelos vegetales→tierra), recogida hacia el inventario, tecla E (mesa en
  supervivencia; en creativo sigue abriendo el selector) y pausa de la
  simulación con la mesa abierta.

### [MODIFICADO] `test/smoke.mjs`
- Nueve comprobaciones nuevas (dureza, recetario, cadena de crafteo, caída/
  recogida/desvanecimiento de drops): suite 57 → 66.

## Impacto

- La supervivencia gana progresión: recolectar → fabricar → picar más
  rápido. Sin cambios en Creativo (rotura instantánea, sin drops).
- Suites en verde: smoke 66, mobs 121, biomas 42.

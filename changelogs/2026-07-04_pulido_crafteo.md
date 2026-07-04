# Pulido de la pantalla de crafteo: disposición clásica, casillas y menú contextual

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz

## Descripción

Cuatro ajustes de la misma sesión que rematan la pantalla de crafteo por
cuadrícula tras su primera versión, guiados por capturas del usuario:
la disposición clásica del panel, la legibilidad de los textos, el
comportamiento de las casillas y el bloqueo del menú del navegador.

## Tipo de Cambio

- `Cambiado` / `Corregido`

## Archivos Afectados

### [MODIFICADO] `index.html`, `js/hud.js`, `css/style.css` — disposición clásica
- Etiqueta «Fabricación» sobre la cuadrícula, con el **botón del recetario**
  al costado (panel lateral conmutable con icono de librería); flecha y
  ranura de resultado con la cantidad dentro.
- «Inventario» como **rejilla fija de ranuras** (las vacías, visibles; 3+
  filas de 9) y la hotbar separada debajo.
- **Tooltip flotante** con el nombre del item bajo el puntero (sustituye al
  title del navegador).
- Estética de banco de trabajo con paleta propia: panel claro, ranuras
  hundidas con bisel y texto oscuro.

### [MODIFICADO] `css/style.css` — textos «desfasados»
- La sombra de texto global (2 px, del tema oscuro) se heredaba en el panel
  claro y duplicaba el contorno de todas las etiquetas; se anula en el
  ámbito del panel, conservándola en las cantidades y el tooltip.

### [MODIFICADO] `js/hud.js`, `js/inventory.js`, `css/style.css` — casillas
- El icono queda **siempre centrado** (la cantidad no era absoluta y lo
  empujaba); el número pasa a ser pequeño y a la **esquina superior
  derecha** (también en hotbar y selector).
- Existencias mostradas como **pilas clásicas de hasta 64 unidades por
  casilla** (`Inventory.stacks()`, puro y probado): un material con más
  unidades ocupa varias casillas.

### [MODIFICADO] `js/main.js` — menú contextual
- El clic derecho solo estaba bloqueado sobre el lienzo: en las pantallas
  superpuestas desplegaba el menú del navegador. Se bloquea en todo el
  documento, salvo campos de texto (útil para pegar la semilla).

### [MODIFICADO] `test/smoke.mjs`
- Comprobación de las pilas de 64 (suite: 74 → 75).

## Impacto

- La pantalla replica la disposición y sensaciones del método clásico con
  estilos y arte 100 % propios, y el navegador deja de interferir.
- Suites en verde: smoke 75, mobs 121, biomas 42.

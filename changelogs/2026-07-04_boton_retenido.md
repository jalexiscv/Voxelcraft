# Corrección de entrada: botones retenidos al abrir pantallas superpuestas

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz / Entrada

## Descripción

Investigación por reporte del usuario («el recetario y el crafteo dejaron
de funcionar»): dos arneses headless (flujo 3×3 con recetario y fabricación
en cadena, y flujo 2×2 con colocación manual celda a celda) ejecutan toda
la lógica del crafteo sin una sola excepción — la lógica está sana. La
causa real hallada está en la entrada del navegador: al abrir la mesa con
clic derecho, el `mouseup` cae sobre el panel y no sobre el lienzo, así que
el botón queda **retenido** en `game.buttons`; al cerrar la pantalla, la
acción se repite sola cada 0,25 s (reabre la mesa con el estado limpio o
coloca bloques fantasma), lo que se percibe como un crafteo roto.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- Al soltarse el puntero (`pointerlockchange`), el estado de entrada se
  limpia SIEMPRE (`game.buttons` y `keys`), no solo cuando se muestra el
  menú: ningún botón ni tecla puede quedar retenido al entrar en el
  crafteo, el selector o el menú.

## Impacto

- Cerrar la mesa ya no la reabre sola ni dispara acciones fantasma; el
  recetario y la fabricación se comportan como en los arneses.
- Suites en verde: smoke 75, mobs 122. Arneses del crafteo (3×3 y 2×2) en
  verde.

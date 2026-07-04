# Inventario de supervivencia y acceso total en creativo

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz / Juego

## Descripción

Los materiales dejan de ser infinitos en Supervivencia: el selector y la
hotbar solo ofrecen **lo que el jugador ha recolectado y en las cantidades
recolectadas** — romper un bloque lo recoge, colocarlo lo consume. En modo
**Creativo** el selector mantiene el acceso a todos los materiales sin
cantidades, como hasta ahora.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/inventory.js`
- Clase `Inventory` pura (sin DOM, probada en Node): `add`, `take` (no
  consume si no alcanza), `count`, `ids` ordenados para el selector y
  `toJSON` para el guardado.

### [MODIFICADO] `js/hud.js`
- `setInventory(inv|null)`: con inventario (supervivencia) el selector (B)
  lista solo los materiales con existencias y su cantidad, y la hotbar
  muestra la cuenta por ranura atenuando las agotadas; con `null`
  (creativo) se comporta como siempre (todos los materiales, sin cuenta).
- El selector se reconstruye al abrirse (las existencias cambian al jugar).

### [MODIFICADO] `js/main.js`
- Romper un bloque recolectable lo suma al inventario; colocar lo consume y
  bloquea la acción sin existencias; el clic central (copiar) solo elige
  materiales que se poseen.
- El inventario se persiste en el guardado y se repone al cargar; los
  guardados antiguos cargan con inventario vacío.

### [MODIFICADO] `css/style.css`
- Insignias de cantidad en hotbar y selector; ranura agotada atenuada.

### [MODIFICADO] `test/smoke.mjs`
- Cinco comprobaciones nuevas del inventario (suite: 52 → 57).

## Impacto

- La supervivencia gana su bucle clásico de recolección; el creativo
  conserva la libertad total. Guardados antiguos compatibles.
- Suites en verde: smoke 57, mobs 121, biomas 42.

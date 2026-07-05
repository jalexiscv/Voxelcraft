# Creativo: catálogo completo (herramientas, espadas…) y huevos de aparición de mobs

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > HUD / Mobs

## Descripción

El usuario reportó que el selector del modo creativo solo mostraba los
bloques colocables: faltaba todo lo crafteable (espadas, picos, hachas,
palas, azadas, comida, materiales) y pidió además poder «colocar» mobs.
El selector ahora ofrece el catálogo completo en tres grupos: bloques,
todos los items y un **huevo de aparición por cada uno de los 68 mobs**
del registro, al estilo de los spawn eggs del juego original.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/eggs.js`
- Catálogo de huevos: un id numérico estable por mob (desde `EGG_BASE`
  300, por encima de los items, en el orden del registro), con
  `esHuevo`/`mobDeHuevo`/`nombreHuevo` («Huevo de Vaca») y
  `coloresHuevo`: el cascarón hereda la paleta procedural del propio mob
  (base = color medio de su piel pintada; motas = media de sus texels
  oscuros). Módulo puro, probable en Node.

### [MODIFICADO] `js/mobs.js`
- `MobSystem.spawnAt(id, x, y, z)`: aparición forzada de un tipo en una
  celda — sin sorteo de hábitat ni topes por tipo, con la tonalidad
  sorteada como en la aparición natural (fija del bioma si la define) y
  la voz de saludo del mob. Tope duro nuevo `EGG_CAP = 128` que protege
  al render; la aparición natural sigue en `GLOBAL_CAP = 32`.

### [MODIFICADO] `js/hud.js`
- El selector del creativo lista bloques + todos los items + huevos
  (supervivencia sigue mostrando solo lo recolectado).
- `drawIcon` pinta el cascarón moteado con los colores del mob y
  `nombreDe` resuelve el nombre del huevo (tooltip).

### [MODIFICADO] `js/main.js`
- Clic derecho con un huevo en mano (solo creativo): hace aparecer su mob
  en la celda adyacente a la cara pulsada, con el golpe de mano del
  viewmodel. En supervivencia el huevo no hace nada (nunca se ofrece).

### [MODIFICADO] `test/smoke.mjs`, `test/mobs.mjs`, `documents/01-voxelcraft.md`, `documents/02-mobs.md`
- 4 comprobaciones nuevas en smoke (ids estables sin choque con items,
  huevo↔mob, nombres y paleta del cascarón): 256 → **260**. 4 en mobs
  (`spawnAt` en la celda pedida con saludo, tonalidad válida, tipos
  desconocidos y tope de 128): 124 → **128**. Documentos 01 y 02 al día.

## Impacto

- En creativo se puede equipar cualquier herramienta o espada (los picos
  ya aceleran en supervivencia; la espada golpea con su daño en ambos
  modos) y poblar el mundo con cualquier mob al instante.
- Los ids de huevo (300..367) jamás se escriben en el mundo ni entran al
  inventario de supervivencia; un guardado con un huevo en la hotbar
  apunta al mismo mob en cualquier sesión (orden estable del registro).
- Suites en verde: smoke 260, mobs 128, biomas 42, aldeas 62.

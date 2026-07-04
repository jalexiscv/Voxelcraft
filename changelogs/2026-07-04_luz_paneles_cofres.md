# Motor: luz real de bloques, paneles finos y cofres persistentes

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Motor

## Descripción

Dos agentes en fases secuenciales (workflow «pendientes-motor») resuelven
los pendientes de motor del plan de items.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/world.js`, `js/mesher.js`, `js/renderer.js`, `js/mobrender.js`
- **Luz de bloques**: campo 0..15 por chunk con BFS desde las fuentes
  (antorcha 14, lava 15), recálculo perezoso (`lightDirty`) y API
  `blockLightAt`. El atributo de vértice codifica sol (fracción ≤0.96) y
  bloque (parte entera); el shader toma el máximo — la luz de bloque no
  depende del día. Los mobs junto a una antorcha se iluminan.
- **Paneles finos**: puerta y ventana se mallan como caja fina centrada
  (z∈[0.40,0.60]) con cantos; colisión intacta.

### [MODIFICADO] `js/world.js`, `js/storage.js`, `js/blocks.js`, `js/atlas.js`, `js/items.js`
- **Cofres (motor)**: `world.blockData` (Map posición → objeto plano)
  persistido en el guardado (compatible con guardados antiguos); bloque
  cofre (id 70) con herrajes procedurales y receta de anillo de tablones;
  el contenido usa el formato `Inventory.toJSON`. Romper el bloque limpia
  su estado.

### [MODIFICADO] `test/smoke.mjs`
- 23 comprobaciones nuevas (decaimiento y corte de la luz, cruce de bordes
  de chunk, decodificación del atributo, paneles, blockData y su
  persistencia): suite 80 → 103.

## Impacto

- Antorchas útiles en cuevas, puertas/ventanas con silueta creíble y
  almacenamiento persistente listo para su interfaz.
- Suites en verde: smoke 103, mobs 122, biomas 42.

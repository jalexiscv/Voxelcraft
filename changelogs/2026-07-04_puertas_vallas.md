# Puertas de dos bloques con giro real y vallas 3D conectadas

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Motor / Arte

## Descripción

Rediseño completo de puertas y vallas (workflow de 3 agentes: arte y
geometría → mecánica → verificación) tras detectar que la puerta de un
bloque con tésela plana y la valla en cruz no estaban a la altura del
lenguaje del género. Pixel art 100 % original: marco con montantes,
paneles rehundidos con bisel, vidriera con cuarterones, bisagras y pomo.

## Tipo de Cambio

- `Agregado` / `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/blocks.js`, `js/atlas.js`, `js/mesher.js`
- **Puerta de DOS bloques**: ids nuevos `DOOR_TOP_CLOSED` 84 y
  `DOOR_TOP_OPEN` 85 (86 tipos en total). Hoja inferior (tésela 102
  repintada: dos paneles biselados, travesaños, pomo dorado y bisagras con
  remaches) + hoja superior nueva (tésela 132: vidriera translúcida de 2×2
  cuarterones con parteluces); canto de madera compartido (103).
- **Giro real**: el flag `panel` acepta eje z (cerrada) o eje x (abierta) —
  la puerta abierta es la misma hoja girada 90°, no otra textura.
- **Valla 3D**: adiós al `cross`; `emitFence` malla poste central y dos
  travesaños hacia cada vecino conectable (otra valla o un muro sólido
  opaco), con tésela de madera envejecida. La colisión no cambia.

### [AGREGADO] `js/doors.js` · [MODIFICADO] `js/main.js`, `js/villages/build.js`
- Mecánica del par (módulo puro): colocar exige vano de 2 con suelo y
  escribe ambas hojas; el clic derecho sobre cualquier hoja gira el par
  entero; romper cualquier hoja limpia ambas y suelta 1 puerta (la receta
  no cambia). Las aldeas estampan la hoja superior automáticamente
  (incluidas las puertas apiladas de casa grande y biblioteca).

### [MODIFICADO] `test/smoke.mjs`, `documents/01-voxelcraft.md`, `documents/04-items.md`
- Tanda «Puertas y vallas» (24 comprobaciones: flags, par completo sobre
  mundo headless, giro z→x, conectividad de la valla, translucidez de la
  vidriera): suite 143 → 167. Tablas y árbol de la documentación al día.

## Impacto

- Las puertas llenan su vano, parecen puertas y giran; las vallas forman
  cercas continuas de verdad (las granjas de las aldeas lo agradecen).
- Suites en verde: smoke 167, mobs 122, biomas 42, aldeas 62.

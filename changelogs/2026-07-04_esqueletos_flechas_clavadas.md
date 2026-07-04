# Rediseño de la familia de esqueletos y flechas clavadas

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Mobs

## Descripción

Los cuatro arqueros (esqueleto, stray, bogged, parched) adoptan la silueta
clásica del arquetipo: más altos, con **ambos brazos en pose de tiro** y un
**arco alargado con la cuerda como pieza propia**. Las flechas que fallan ya
no desaparecen al impactar: quedan **clavadas en el bloque** conservando su
ángulo y se desvanecen pasado un rato. Todo con pintado procedural propio
(el proyecto no reproduce assets de terceros).

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs/esqueleto.js`, `stray.js`, `bogged.js`, `parched.js`
- AABB 1,8 → 1,95 de alto; brazo izquierdo también extendido al frente
  (`rot [1.4, 0, 0]`), arco de 10 px con palas curvadas pintadas y nueva
  pieza `cuerda` (1×8×1) tras la madera, solidaria al brazo del arco.
- `esqueleto` y `stray` suben a 20 pv (paridad con el juego clásico); el
  esqueleto además gana paleta ósea neutra, ceño hundido, línea de
  mandíbula, costillas de mayor contraste y banda pélvica.

### [MODIFICADO] `js/mobs.js`
- `updateArrows`: al tocar un bloque sólido la flecha retrocede medio paso
  (para que asome la vara), queda inerte con `stuckT = 30 s` conservando su
  velocidad como orientación para el render, y se desvanece al agotarse.
  Las que aciertan al jugador o a un mob se consumen como antes.

### [MODIFICADO] `test/mobs.mjs`
- Dos comprobaciones nuevas: la flecha fallada queda clavada y se desvanece
  pasado el tiempo (suite: 116 → 118).

### [MODIFICADO] `documents/01-voxelcraft.md`, `documents/02-mobs.md`
- Recuentos y adaptaciones actualizados (flechas clavadas ~30 s).

## Impacto

- Combate a distancia más legible y fiel: arqueros con arco tensado visible
  y suelo sembrado de flechas tras un tiroteo, sin cambios en el daño ni en
  la IA. Suites en verde: mobs 118, smoke 52, biomas 42.

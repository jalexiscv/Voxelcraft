# Corrección de modelos geo: orejas del burro despegadas de la cabeza al mirar

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó (con captura) que las orejas del burro aparecían
despegadas de la cabeza. Causa: `mobrender.partMatrix` SUMABA la mirada
(yaw/pitch de `anim: 'head'`) al Euler compartido `Rz·Ry·Rx` de la
parte. Con eso, el `Rz ±15°` horneado de las orejas de mula (su abanico,
con el pivote en la base del cuello y ~15 px de brazo de palanca) se
aplicaba en el marco del MUNDO en vez del marco de la cabeza ya girada:
en cuanto el burro miraba al jugador (yaw hasta ±1.2 rad), cada oreja se
desplazaba varios píxeles respecto de la cabeza. En reposo coincidían —
por eso «a veces». Las orejas del caballo (`Rz ±5°`) sufrían lo mismo a
menor escala.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mobrender.js`
- `partMatrix` compone la mirada ANTES de la pose estática, como giro del
  grupo rígido cabeza+hocico+orejas alrededor del pivote común:
  `M = base · T(pivot) · Ry(yaw) · Rx(pitch) · Rz·Ry·Rx(pose)`. Para
  partes con `rot` solo en X (la cabeza del caballo, el cuello, la nariz
  del aldeano) o sin `rot` es matemáticamente idéntico a lo anterior; las
  demás animaciones (patas, brazos, alas) no cambian.

### [MODIFICADO] `test/smoke.mjs`, `documents/07-modelos.md`
- 1 comprobación nueva de rigidez: el punto de contacto entre una oreja
  con `rot` z horneada y la cabeza sigue coincidiendo con la mirada a
  yaw 1.1 y pitch 0.5 (antes se separaba varios píxeles): suite 255 →
  **256**. Documento 07 al día.

## Impacto

- Las orejas de la mula/burro (y las del caballo) giran en bloque con la
  cabeza al mirar al jugador, sin despegarse; beneficia a cualquier parte
  con rot y/z horneada que siga a la cabeza (bruja/aldeano con sombrero,
  geos con orejas o crines inclinadas).
- Suites en verde: smoke 256, mobs 124, biomas 42, aldeas 62.

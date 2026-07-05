# Corrección de modelos geo: enderman deforme (traslados de pose por hueso)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó el enderman deforme con el pack local. El geo legacy
(`enderman.geo.json`, formato 1.8) trae la cabeza **incrustada en el
torso** (y 24-32, con la capucha flotando arriba en su sitio real) y las
piernas **empezando 4 px bajo el suelo** — el renderer original del juego
recolocaba esos huesos por código, algo que el archivo no trae.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/modelpack.js`
- La capa de pose por especie (`POSE_MOB`/`aplicarPose`, estrenada con la
  araña) admite ahora también **`mov`: traslados por hueso en px** — el
  pivote se desplaza y la caja, relativa a él, viaja entera; la animación
  gira alrededor del pivote nuevo. Entrada del enderman: cabeza +14 en y
  (38-46, sobre el torso y dentro de su capucha) y piernas +4 (pies a
  ras). Las entradas de la araña migran al formato `{ rot }`.

### [MODIFICADO] `test/smoke.mjs`
- Check del traslado (pivotes recolocados, sin rotación añadida, origin
  intacto): suite 216 → **217**. Verificado además el pipeline completo
  sobre el archivo real: silueta de 46 px con brazos y piernas de 30
  colgando donde deben.

## Impacto

- Enderman con su silueta esbelta clásica. La capa de pose cubre ya los
  dos vacíos del formato (rotaciones de animación y recolocaciones por
  código) con datos por especie, sin tocar el motor.
- Suites en verde: smoke 217, mobs 124, biomas 42, aldeas 62.

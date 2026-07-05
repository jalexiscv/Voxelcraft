# Corrección de modelos geo: tortuga descuadrada (bind_pose no se hereda)

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó tortugas desmontadas «en tótem» tras la corrección del
burro. Regresión mía: el horneado de rotaciones ancestrales trataba igual
los dos campos de rotación del formato geo, y sus semánticas difieren —
`bind_pose_rotation` (legacy 1.8: la vaca o la tortuga tumban su cuerpo
90°) posa **solo al propio hueso**, con los hijos ya en coordenadas
finales; `rotation` (moderna: el cuello del caballo) **sí se hereda**. Al
heredar también el bind_pose, cabeza y aletas de la tortuga giraban 90°
alrededor del pivote del caparazón.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/geo.js`
- La cadena de ancestros acumula únicamente `rotation`; el
  `bind_pose_rotation` queda como pose del propio hueso, como antes del
  horneado. Verificado sobre los geo reales: tortuga y vaca se rearman y
  el burro conserva su corrección (cabeza siguiendo el cuello a −30°).

### [MODIFICADO] `test/smoke.mjs`
- Check nuevo que fija la distinción con un geo legacy sintético (el hijo
  de un hueso con bind_pose queda sin rot y con su propio pivote):
  suite 194 → **195**.

## Impacto

- Tortuga y vaca correctas de nuevo; burro y caballo intactos. La
  distinción queda blindada en la suite para no repetir la regresión.
- Suites en verde: smoke 195, mobs 124, biomas 42, aldeas 62.

# Modelos geo: lobo tumbado y rasgos que viajan a la auto-piel

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó lobos deformes, arañas sin ojos y brujas sin cara. Dos
causas: el geo del lobo trae cuerpo y pecho como cajas VERTICALES que el
renderer original tumbaba 90° por código (ni siquiera como bind_pose), y
la auto-piel pintaba cada parte con un color plano muestreado — los
rasgos pintados (ojos, caras, manchas) se disolvían en la media.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/modelpack.js`
- **Pose del lobo**: entrada en `POSE_MOB` que acuesta cuerpo (6×9×6) y
  pecho (8×6×7) con la misma rotación final que el cuerpo de la vaca
  (trigonometría verificada a mano: tronco en z 0..9, pecho entre cabeza
  y tronco).
- **Proyección cara a cara en la auto-piel**: donde hay parte propia
  emparejada (misma heurística de sinónimos que el color), cada una de
  las 6 caras del geo se rellena reproyectando los texels de la cara
  equivalente de la piel procedural propia (reescalado por vecino más
  próximo, color medio como base para no dejar huecos). Los ojos de la
  araña, la cara de la bruja y las vetas de cualquier piel viajan ahora
  al modelo del pack. Sin pareja: color medio con moteado, como antes.

### [MODIFICADO] `test/smoke.mjs`
- 2 comprobaciones (un marcador pintado en la cara frontal propia aparece
  reescalado en el rect frontal del geo y solo ahí; cuerpo y pecho del
  lobo a −90°): suite 220 → **222**.

## Impacto

- Lobos con silueta correcta; arañas con ojos, brujas con cara, y en
  general TODAS las pieles del override recuperan sus rasgos pintados —
  con arte 100 % procedural propio, cero texels de terceros.
- Suites en verde: smoke 222, mobs 124, biomas 42, aldeas 62.

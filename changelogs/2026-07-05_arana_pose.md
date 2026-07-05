# Corrección de modelos geo: araña deforme (pose de abanico horneada)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó arañas deformes con el pack local de modelos. Causa
distinta a las anteriores: el geo de la araña trae las 8 patas como cajas
rectas de 16×2×2 hacia ±x, apiladas a la misma altura — el abanico
clásico no está en el archivo, lo pone la animación Molang de runtime del
juego original (que Bedrock guarda aparte y el pack no incluye). Nuestro
render la mostraba en esa pose de reposo cruda: dos «tablones» laterales.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/modelpack.js`
- Capa nueva de **pose por especie** (`POSE_MOB` + `aplicarPose`):
  rotaciones estáticas adicionales por hueso que se suman a la conversión
  — cubre lo que el formato deja a la animación de runtime. Para
  spider/cave_spider: abanico de patas (traseras hacia atrás ±40°,
  medias ±15°, delanteras hacia delante ∓40°) con las puntas caídas
  (±12-15° en z) para plantarlas en el suelo. La capa es genérica: si
  otro geo llega «sin posar», se añade su entrada de datos.

### [MODIFICADO] `test/smoke.mjs`
- 2 comprobaciones (abanico con rotaciones distintas por lado y posición,
  simetría delantera/trasera, y no-op para el resto de especies):
  suite 214 → **216**.

## Impacto

- Arañas y arañas de cueva con su silueta clásica de patas desplegadas;
  el balanceo de marcha existente les da el pataleo al caminar.
- Suites en verde: smoke 216, mobs 124, biomas 42, aldeas 62.

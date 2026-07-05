# Camellos: cara de perfil y orejas

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario reportó camellos sin cara ni orejas. Esta vez el defecto era
de nuestro arte procedural (los camellos no usan el pack de modelos): la
cara estaba pintada **solo en la punta del hocico** — la cabeza es una
caja alargada 6×6×10 y su cara frontal es la punta de la nariz, así que
de perfil (la vista habitual) quedaba lisa — y el camello común no tenía
orejas como partes (el husk sí las tenía).

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mobs/camel.js`
- **Orejas nuevas** (2 partes 2×3×2 sobre el cráneo, desplegado
  compartido en (48,36) con pabellón interior pardo) que giran con la
  cabeza (`anim head`).
- **Cara de perfil**: en las caras laterales de la cabeza (la U crece
  del cráneo al morro: el ojo va junto al borde izquierdo del rect) —
  ojo grande 2×2 con brillo, ceja/párpado, línea de boca y ollar de
  perfil, en ambos lados. La punta del hocico conserva ollares y boca.

### [MODIFICADO] `js/mobs/camel_husk.js`
- Misma cara de perfil con su estética de no-muerto: ojo apagado sin
  brillo, ceja huesuda, ojera hundida y boca reseca.

## Impacto

- Los camellos tienen rostro desde cualquier ángulo y orejas que
  acompañan a la cabeza. Validador de contrato en verde para ambos
  (UVs sin solapes); suites: smoke 247, mobs 124, biomas 42, aldeas 62.

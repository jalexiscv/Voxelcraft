# Modelos de mob más complejos: hasta 64 partes y pieles de 256×256

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario quiere poder aplicar diseños 3D más elaborados a los mobs
(modelos más complejos). El motor ya lo permitía; solo el validador
restringía el número de cajas y las resoluciones de piel. Se amplían esos
dos límites, que eran artificiales.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `test/validate-mob.mjs`
- Partes por mob: de máx **24 → 64** (modelos con más cajas: anillos
  completos, apéndices, detalle).
- Resoluciones de piel: se añade **256×256** a la lista permitida
  (`32/64/128/256`), para más detalle pintado.

### [MODIFICADO] `js/mobs/dron_escapista.js`
- Aprovecha el nuevo tope: el anillo pasa de 10 a **16 segmentos**, con la
  corona notablemente más redonda (29 partes en total, bajo el tope de 64).

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- 4 comprobaciones nuevas del contrato ampliado (acepta 256×256, acepta 64
  partes, rechaza 65 partes, rechaza tamaños de piel no soportados): 179 →
  **183**. Documento 02 al día.

## Verificación

- `node test/validate-mob.mjs dron_escapista` → OK (16 segmentos).
- Render del escapista con puppeteer + Edge: el anillo de 16 segmentos se
  ve como una corona circular limpia, más redonda que la de 10.
- Suites en verde: smoke 286, mobs 183, biomas 42, aldeas 62.

## Impacto

- Los mobs propios pueden ahora tener modelos mucho más detallados (hasta
  64 cajas) y pieles de 256×256. El motor (`buildModel`, `mobrender`) y el
  pack de modelos local ya soportaban ambas cosas; no había que tocarlos.
- Nota de diseño: el coste real de un modelo complejo es colocar cada caja
  a mano (pivote, origen, desplegado UV sin solapes), no el render — 64
  cajas × 12 triángulos es trivial para WebGL2.

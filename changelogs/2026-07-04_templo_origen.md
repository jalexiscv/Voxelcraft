# Templo del origen: pirámide monumental en el punto de inicio

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Generación

## Descripción

A petición del usuario (con una maqueta como referencia visual), todos los
mundos levantan ahora un **templo monumental en el punto de inicio del
jugador**: pirámide escalonada brutalista de diseño voxel 100 % original —
plataforma en gradas, cuerpo en terrazas con columnatas en relieve, cuatro
contrafuertes diagonales en las esquinas, torres gemelas flanqueando la
entrada sur y cima con parapeto y claraboya de cristal sobre la cámara
interior con el kit de inicio.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [AGREGADO] `js/templo.js` · [MODIFICADO] `js/worldgen.js`
- Función de columna 100 % pura (`bloqueTemplo` con reglas priorizadas)
  anclada al origen del mundo: cada chunk escribe solo su porción y el
  resultado es byte a byte idéntico en cualquier orden de generación; el
  templo gana a las aldeas por orden de pasos (paso 7). Base 31×31,
  ~4 080 bloques sobre la rasante + relleno de cimentación; techo
  garantizado bajo y=62.
- Cámara 9×9×5 bajo la claraboya con mesa de crafteo, horno, cofre vacío,
  cama y antorchas; corredor de entrada 3×4 con senda y escalones. El
  jugador nace sobre la cima (la claraboya a ras hace de suelo) con
  refugio y herramientas desde el primer segundo.

### [MODIFICADO] `test/smoke.mjs`, `documents/01-voxelcraft.md`
- Tanda «Templo del origen» (16 comprobaciones: dos órdenes byte a byte,
  claraboya de 25 cristales, kit exacto 1/1/1/1, cámara hueca, corredor,
  torres, parapeto, contrafuertes, nada sobre y=62, chunk lejano limpio):
  suite 198 → **214**. Documento 01 al día.

## Impacto

- Inicio de partida con hito visual y refugio funcional en todos los
  mundos, sin coste fuera de los 4 chunks del origen.
- Suites en verde: smoke 214, mobs 124, biomas 42, aldeas 62.

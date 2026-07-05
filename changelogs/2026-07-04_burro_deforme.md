# Corrección de modelos geo: burro deforme (atrezo y rotación del cuello)

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó burros deformes con el pack local de modelos. El
diagnóstico sobre `horse_v3.geo.json` (los avisos del propio parser lo
señalaban) reveló dos defectos combinados: el render dibujaba **todo el
atrezo** del geo (silla, bridas, bocado, riendas a −35°, alforjas giradas
90° y los dos juegos de orejas a la vez), y los hijos de un hueso rotado
no heredaban su rotación (cuello a −30° con la cabeza, hocico, crin y
orejas plantados sin inclinar).

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/geo.js`
- **Horneado de rotaciones ancestrales** al aplanar: la parte hija recibe
  la rotación acumulada de sus ancestros y el pivote del ancestro rotado
  más cercano — la pose estática de Bedrock queda exacta (cadenas con
  varias rotaciones o pivotes en conflicto se suman por eje y se anotan
  como aproximación en `avisos`).

### [MODIFICADO] `js/modelpack.js`
- `filtrarAtrezo(partes, mobId)`: los huesos de equipamiento
  (silla/bridas/bocado/riendas/alforjas/arneses/armaduras/alfombras) se
  descartan siempre, y `OCULTOS_MOB` resuelve variantes por especie: el
  burro conserva `MuleEar*` y descarta `Ear*`; el caballo, lo contrario.

### [MODIFICADO] `test/smoke.mjs`, `documents/07-modelos.md`
- 3 comprobaciones nuevas (horneado con geo sintético de 3 niveles,
  filtro de atrezo y orejas por especie): suite 191 → **194**. Documento
  07 al día.

## Impacto

- Burro y caballo pasan de 23 partes con atrezo y cabeza descolgada a
  **12 partes limpias** con el cuello y la cabeza inclinados como deben;
  la corrección beneficia a cualquier otro geo con jerarquía rotada o
  equipamiento (lobo con armadura, llama con alfombra…).
- Suites en verde: smoke 194, mobs 124, biomas 42, aldeas 62.

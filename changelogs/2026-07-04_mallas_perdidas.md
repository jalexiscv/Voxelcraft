# Corrección de render: chunks invisibles (mallas perdidas) al volver a una zona

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Motor / Streaming

## Descripción

Reporte del usuario: zonas «vacías» entre el punto de vista y el terreno
lejano, con mobs caminando sobre el hueco. La pista de los mobs delataba la
causa: esos chunks tenían DATOS (la física funciona) pero no MALLA.

Ciclo de vida del bug: al alejarse, `unloadFar` libera las mallas más allá
de `renderDist+1` pero conserva los datos hasta `KEEP_MARGIN`; al volver,
`pumpGeneration` no re-pide chunks cuyos datos existen, así que
`onChunkArrived` —el único punto que encolaba remallados— jamás se dispara
para ellos: quedaban con vecindario completo, datos y **sin malla para
siempre** (suelo invisible).

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- Nuevo barrido `ensureMeshes()` en el ciclo de streaming (cada 0,5 s):
  encola en `dirty` todo chunk dentro del radio de mallas que tenga datos,
  sea mallable y carezca de malla en el renderer; `processDirty` los
  reconstruye con el presupuesto por fotograma de siempre.
- Coste: ≤ (2·(renderDist+1)+1)² consultas a mapas cada 0,5 s (~361 en
  distancia larga), despreciable.

## Impacto

- Desaparecen los agujeros de mundo persistentes al regresar a zonas ya
  visitadas; los mobs vuelven a caminar sobre suelo visible.
- Suites en verde: smoke 75, mobs 122, biomas 42 (la lógica tocada vive en
  main.js; verificación jugable en el navegador).

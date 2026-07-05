# Dron guardián: dos radios de detección e inspección de voladores

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario pidió que el dron guardián distinga enemigos terrestres de
voladores con **dos radios de detección**: al volador lo detecta hasta el
**triple de distancia** que al terrestre. Además, cuando detecta un mob
que vuela debe **inspeccionarlo** (ir, darle unas vueltas observándolo) y
regresar al perímetro cercano al jugador; solo lo agrede si el volador es
agresivo (pacífico → vuelve sin tocarlo).

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- `guardianAI` reestructurado con dos radios: `guardRadius` para agresores
  terrestres y `guardRadius × airRadiusMul` (triple) para voladores. Busca
  por separado el agresor terrestre, el volador agresivo y el volador
  cualquiera más cercanos, y prioriza: terrestre → inspección de volador →
  volador agresivo ya inspeccionado.
- Nuevo `chaseTarget(m, ctx, objetivo)`: persecución+ataque en 3D extraída
  para reutilizar entre terrestres y voladores agresivos.
- Nuevo `inspectFlyer(m, dt, ctx)`: el dron rodea de cerca al volador
  mientras corre `inspectT`; al terminar, si es agresivo lo ataca y si es
  pacífico vuelve al perímetro sin agredirlo (con `inspectCooldown` para
  no repetir la inspección de inmediato).
- `Mob`: nuevos `inspectTarget`, `inspectT`, `inspectCd`.

### [MODIFICADO] `js/mobs/dron.js`
- `behavior`: `airRadiusMul: 3`, `inspectTime: 4`, `inspectCooldown: 8`.

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- 6 comprobaciones nuevas (agresor terrestre lejos se ignora, volador
  agresivo a triple distancia sí se detecta, inspección de volador
  pacífico sin agredir, regreso al perímetro tras inspeccionar, ataque al
  volador agresivo tras inspección): 139 → **145**. Documento 02 al día.

## Verificación

- Trayectoria trazada con puppeteer-core + Edge headless: el dron patrulla
  al jugador, se lanza a inspeccionar un pájaro pacífico que aparece lejos
  y alto (lo rodea a ~2.2 bloques, 480 fotogramas de observación, sin
  tocarle un HP) y regresa al perímetro del jugador (3.5 bloques) — luego
  retoma la patrulla.
- Suites en verde: smoke 260, mobs 145, biomas 42, aldeas 62.

## Impacto

- El dron reacciona antes a las amenazas aéreas (radio triple) que a las
  terrestres, e investiga los voladores desconocidos sin agredir a los
  inofensivos — comportamiento de vigía más creíble.

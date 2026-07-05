# Dron escapista: patrulla de largo alcance (aleja ×6, sube ×6 y regresa)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario pidió que el escapista recorra distancias grandes —hasta 6×
más de lo que se alejan los drones normales— y suba hasta 6× más alto,
que luego regrese hacia el usuario «probando el perímetro» y vuelva a
alejarse, así en ciclo. Se añade una patrulla de largo alcance sobre el
vuelo errático de mosquito que ya tenía.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- `Mob`: estado de patrulla (`roamPhase` 'out'/'in', `roamRadius`,
  `roamCeil`).
- `evasiveAI`: además del zigzag, mantiene una fase de largo alcance. En
  `out` se aleja del jugador hasta `roamRadius` subiendo hacia `roamCeil`;
  al llegar pasa a `in` y regresa hasta `nearRadius` (probar el perímetro
  cercano); entonces vuelve a `out` con un radio/techo nuevos. El rumbo
  base del zigzag sigue la fase (fuera o hacia el jugador); un cazador
  cercano tiene prioridad (huida). Nuevo helper `nuevoRoam` sortea el
  radio y el techo de cada salida (55–100 % y 40–100 % del máximo).

### [MODIFICADO] `js/mobs/dron_escapista.js`
- `behavior`: `roamRadius 42`, `roamCeil 30`, `nearRadius 6`,
  `roamSpread 1.0`. (La órbita de un dron llega a ~7 bloques y ~3.8 de
  altura; el escapista alcanza ~45 y ~24, unas 6×.)

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- 4 comprobaciones nuevas (se aleja mucho más que un dron, sube mucho más
  alto, regresa al perímetro cercano, repite el ciclo): 166 → **170**.

## Verificación

- Trayectoria trazada con puppeteer-core + Edge: en planta, las salidas
  (naranja) llegan al perímetro lejano y los regresos (cian) cruzan cerca
  del jugador, muy por fuera de la órbita del dron; en altura, los picos
  suben a ~27 bloques frente a los 3.8 del dron. Máximos medidos: 48.6
  bloques de distancia y 27.2 de altura (≈6.5×).
- Suites en verde: smoke 284, mobs 170, biomas 42, aldeas 62.

## Impacto

- El escapista deja de merodear cerca: patrulla un rango amplio en ciclos
  de alejarse/regresar, más creíble como blanco de práctica y más difícil
  de cazar (los perseguidores lo siguen por todo el perímetro).

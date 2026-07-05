# Desatasco por ascenso: los voladores atascados en el suelo se elevan

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario reportó que algunos drones se quedaban atascados en el piso
cuando no podían avanzar en ninguna dirección; pidió que en ese caso
simplemente se eleven y retomen la trayectoria. La maniobra se llama
**desatasco por ascenso** (unstuck climb / pop-up).

Causa: el salto automático al chocar de frente estaba reservado a los
mobs terrestres («los voladores no lo necesitan»), pero un dron volador
que persigue un objetivo a ras del suelo y choca contra una pared, rincón
o valle se quedaba empujando contra el bloque sin subir, porque su altura
objetivo (`targetY`) seguía baja y no tenía salto.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- `Mob`: contadores `stuckT` (tiempo atascado) y `unstickT` (ascenso en
  curso).
- `stepPhysics`: mide el avance horizontal REAL frente al esperado; si un
  volador quiere moverse pero apenas avanza y choca de pared/toca suelo,
  acumula `stuckT`. Pasado el umbral (0.35 s) dispara el desatasco: un
  impulso vertical y una elevación de la altura objetivo (`pos + 2.5`)
  durante ~0.9 s, que lo suben para superar el obstáculo. Al recuperar
  avance, `stuckT` se relaja. Cubre a todo volador (`flying` o `airborne`:
  dron guardián, antidron lanzado, escapista).

### [MODIFICADO] `test/mobs.mjs`, `js/mobs.js` (docblock)
- 2 comprobaciones nuevas: un volador que empuja contra una pared de 4
  bloques a ras del suelo se eleva por encima de ella y luego la cruza
  (retoma la trayectoria): 170 → **172**.

## Verificación

- Suites en verde: smoke 284, mobs 172, biomas 42, aldeas 62.
- Traza de depuración: un dron guardián empujando contra una pared de
  altura 14 se atasca en x=2.45, dispara el ascenso, sube de y=11 a y=15
  y una vez arriba avanza en X (x=3.6 → 6.6) cruzando por encima.

## Impacto

- Los drones (guardián, antidron, escapista) y cualquier volador dejan de
  quedarse pegados al suelo ante un obstáculo: se elevan y siguen su
  camino. No afecta a terrestres ni acuáticos.

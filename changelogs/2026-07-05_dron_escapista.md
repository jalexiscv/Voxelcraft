# Dron escapista: presa de práctica veloz con vuelo errático de mosquito

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs / Render

## Descripción

El usuario pidió un tercer dron propio, el «Dron Escapista»: un dron de
prácticas hasta 3× más rápido que drones y antidrones, que evade con
trayectorias antinaturales de mosquito (ángulos imposibles sin perder
velocidad). Los demás drones y antidrones deben perseguirlo de inmediato.
El modelo sigue la imagen de referencia (nave anular).

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/mobs/dron_escapista.js`
- Definición del escapista: nave anular con anillo hueco central (corona
  de 10 segmentos), casco beige de manta raya (proa, flancos, popa), dos
  alas en delta con filo de fuga magenta, líneas de energía, góndolas y
  cuatro antenas. `flySpeed 15` (≈3× dron), `snapTurn`, `climbAccel 90`.
  `behavior.evasive` + `quarry` (presa de práctica). Solo por invocación.

### [MODIFICADO] `js/mobs.js`
- `Mob`: estado del escapista (`dartT`, `dartYaw`, `dartY`).
- `evasiveAI`: vuela siempre a `flySpeed` con quiebres bruscos de rumbo y
  altura cada `dartFast`/`dartSlow` s; huye del cazador más cercano
  (dron/antidron) en dirección opuesta con un abanico ancho.
- `stepPhysics`: con `snapTurn` la velocidad horizontal SALTA al rumbo
  nuevo (giro instantáneo sin perder rapidez — los «ángulos imposibles»).
- `guardianAI`: prioridad ABSOLUTA a la presa `quarry` — el dron la
  persigue de inmediato sin inspección.
- `antidronAI`: su objetivo es un `guardian` **o** un `quarry`, así el
  antidron también caza al escapista.

### [MODIFICADO] `js/mobs/registry.js`
- Registrado tras el antidron; su huevo de aparición aparece solo.

### [MODIFICADO] `test/mobs.mjs`, `documents/*`
- 10 comprobaciones nuevas (velocidad 3×, vuelo errático con quiebres,
  velocidad mantenida en el giro, persecución inmediata de drones y
  antidrones, no agrede, no aparece natural) + contrato: 156 → **166**.

## Verificación

- `node test/validate-mob.mjs dron_escapista` → OK.
- Render del modelo con puppeteer-core + Edge: el anillo hueco central se
  lee claramente, con el casco beige alrededor, alas en delta con filo
  magenta y las líneas de energía — fiel al plano.
- Suites en verde: smoke 284, mobs 166, biomas 42, aldeas 62.

## Impacto

- Tercer mob propio de la casa: cierra el trío dron / antidron / escapista.
  En el creativo se puede montar una persecución (soltar un escapista y
  varios drones/antidrones que lo cacen). El giro instantáneo `snapTurn` y
  la presa `quarry` quedan disponibles para futuros mobs.

# Dron guardián: patrulla orbital del perímetro en vez de flotar quieto detrás

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario pidió que el dron guardián, cuando no hay amenazas, no se quede
flotando quieto detrás del jugador, sino que **sobrevuele el perímetro en
una trayectoria semicircular no fija con variaciones**, como si revisara
el terreno. El modo escolta (plantarse a ~2 bloques y frenar) se sustituye
por una **patrulla orbital**.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- Nuevo `Mob.patrolAngle` / `patrolT` / `orbitDir`: ángulo de órbita
  alrededor del jugador, reloj propio para las oscilaciones y sentido de
  giro. La fase inicial la fija el yaw (varios drones reparten la órbita).
- Nuevo método `patrolAround(m, dt, ctx)`: el dron persigue un PUNTO que
  gira a su alrededor. El radio (media `patrolRadius`) y la altura oscilan
  como suma de senos de periodo incomensurable — trayectoria semicircular
  no fija que sube y baja — y el sentido de giro se invierte a rachas
  (idas y venidas por el perímetro, no un círculo perfecto). Vuela
  siempre hacia el punto móvil (nunca queda inmóvil) y su mirada barre
  hacia FUERA del jugador, vigilando el perímetro.
- `guardianAI` llama a `patrolAround` cuando no hay agresor cerca (antes
  hacía la escolta estática). La rama de ataque no cambia.

### [MODIFICADO] `js/mobs/dron.js`
- `behavior.patrolRadius: 5` y `patrolSpeed: 0.7` (rad/s) rigen la ronda.

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- Las 2 comprobaciones de escolta estática se reemplazan por 5 de
  patrulla orbital (no cae, radio acotado del perímetro, recorre buena
  parte del círculo, radio/altura variables, nunca se queda plantado):
  136 → **139**. Documento 02 al día.

## Verificación

- Trayectoria en planta trazada con puppeteer-core + Edge headless sobre
  un arnés que corre `MobSystem` real 24 s con el jugador desplazándose:
  la ruta del dron orbita al jugador con espirales solapadas (radio 2.5–
  6.0 bloques, altura 11.9–14.5), confirmando la ronda no fija con
  variaciones de radio y altura.
- Suites en verde: smoke 260, mobs 139, biomas 42, aldeas 62.

## Impacto

- El dron patrulla activamente alrededor del jugador como un vigía, en vez
  de escoltarlo pegado y quieto; al detectar una amenaza abandona la ronda
  y ataca (sin cambios en el combate).

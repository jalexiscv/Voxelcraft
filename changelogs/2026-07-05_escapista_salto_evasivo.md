# Dron escapista: salto evasivo con pausa (distancia = 2× el recorrido del cazador)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

El usuario pidió que, al ser atacado, el escapista se aleje en sus saltos
una «distancia prudente»: el DOBLE de lo que el enemigo puede recorrer
durante la breve pausa del salto, para una ventaja evasiva realista.

Antes, al ser perseguido el escapista solo aceleraba el zigzag continuo.
Ahora, cuando un cazador entra en su radio de alerta, cambia a un salto
evasivo discreto con pausa.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- `Mob`: estado del salto evasivo (`hopEvadePhase` idle/leap/pause,
  `hopEvadeT`, `hopStartX/Z`, `hopDist`).
- `evasiveAI`: al detectar un cazador delega en `evadeHop` (antes hacía el
  zigzag acelerado); sin cazador, sigue la patrulla de largo alcance.
- Nuevo `evadeHop(m, dt, ctx, caza)`: máquina de dos fases. En **leap**
  vuela a máxima velocidad en rumbo de huida hasta recorrer la distancia
  del salto; en **pause** se detiene por completo (`speed 0`) durante
  `hopPause`. La distancia del salto = `2 × velCaza × hopPause` (el doble
  de lo que el cazador avanza en la pausa), medida con la velocidad real
  del perseguidor, así escala con lo rápido que sea.

### [MODIFICADO] `js/mobs/dron_escapista.js`
- `behavior`: `hopPause 0.35`; se retira `dartFast` (la evasión ya no es
  por quiebre rápido sino por salto).

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- 5 comprobaciones nuevas (entra en modo salto, distancia ≈ 2× el
  recorrido del cazador en la pausa, se detiene en la pausa, el salto
  escala con la velocidad del cazador, gana distancia neta sobre el dron):
  172 → **177**.

## Verificación

- Suites en verde: smoke 284, mobs 177, biomas 42, aldeas 62.
- Traza de depuración: contra un dron (vel 4.5, pausa 0.35 s) el salto
  mide ~3.1 bloques (= 2 × 4.5 × 0.35) con pausa inmóvil de 0.35 s; gana
  distancia neta (1.0 → 3.3 bloques en 5 s). El salto crece contra
  cazadores más rápidos (antidron).

## Impacto

- La evasión del escapista es más legible y estratégica: da un brinco,
  se para un instante y vuelve a brincar, siempre alejándose lo justo para
  mantener ventaja sobre quien lo persigue.

# Dron escapista: rastro de partículas al saltar durante la evasión

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs / Efectos

## Descripción

El usuario pidió que el dron escapista deje un rastro de partículas al
saltar durante la evasión. Se añade una estela magenta que se emite en el
punto de despegue de cada salto evasivo.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `particles/vc_evade_trail.json`
- Efecto de estela (formato Bedrock): 10 partículas de humo teñidas de
  magenta (los acentos del escapista), que salen en la dirección de la
  huida (`variable.direction`), se encogen y se disipan en 0.3–0.6 s.

### [MODIFICADO] `js/mobs.js`
- `evadeHop`: al arrancar cada salto llama al hook opcional
  `hooks.particles('evade_trail', m, { x, z })` con el rumbo del salto.

### [MODIFICADO] `js/main.js`
- Hook `particles(evento, mob, vars)`: efecto genérico que un mob pide en
  su propia posición; delega en `disparar`.

### [MODIFICADO] `js/particlepack.js`
- `EFECTOS.evade_trail = ['vc_evade_trail']`.

### [MODIFICADO] `test/mobs.mjs`, `test/smoke.mjs`, `documents/*`
- `silentHooks` captura las llamadas a `particles`. 4 comprobaciones
  nuevas: el escapista deja rastro en cada salto con la dirección de la
  estela (mobs 177 → **179**); el efecto parsea y su estela es magenta
  (smoke 284 → **286**).

## Verificación

- Suites en verde: smoke 286, mobs 179, biomas 42, aldeas 62.
- Render en WebGL real (puppeteer + Edge): al saltar en zigzag, la estela
  magenta traza el camino de la huida — los puntos recientes brillan y los
  antiguos se apagan, dibujando la trayectoria del escape. Sin errores de
  consola.

## Impacto

- La maniobra evasiva del escapista gana lectura visual: cada brinco deja
  su marca luminosa. El hook `particles` queda disponible para que otros
  mobs pidan efectos en su posición (motores, estelas, auras…).

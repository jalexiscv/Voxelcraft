# Partículas: intérprete de efectos Bedrock y explosiones más realistas

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Efectos

## Descripción

El usuario pidió explosiones más realistas asociando las partículas que
había diseñado en `particles/` (efectos en formato Bedrock). Se implementa
un intérprete Molang en runtime que ejecuta esos ficheros y los dibuja como
billboards, y se asocian a explosiones, muerte/golpe de mobs y rotura de
bloques.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/molang.js`
- Evaluador de un subconjunto de Molang (el lenguaje de expresiones de
  Bedrock): compila cada expresión a `(ctx)=>número` una vez. Cubre
  aritmética con precedencia, sufijo `f`, comparaciones y ternario,
  `Math.random`/`Math.Random` contra un PRNG inyectable, funciones math y
  variables `variable.*`/`particle_*`. Puro y testeable.

### [NUEVO] `js/particles.js`
- `parseEffect`: monta un descriptor con las expresiones compiladas desde
  un `particle_effect` (emisor, apariencia, tinte, movimiento; formas
  point/custom/sphere; flipbook o UV estática).
- `ParticleSystem`: emite y simula (aceleración, arrastre lineal, vida) y
  produce *snapshots* {pos, size, uv, color} para el render. Puro.

### [NUEVO] `js/particlepack.js`
- `EFECTOS`: evento del juego → ficheros de `particles/`. `cargarEfectos`
  los sondea al arrancar (silencioso ante 404).

### [NUEVO] `particles/vc_explosion_{fireball,smoke,sparks}.json`
- Composición propia de la explosión (formato Bedrock) pensada para lucir:
  bola de fuego que se expande y apaga a humo, humo gris ascendente y
  chispas doradas que salen disparadas y caen.

### [MODIFICADO] `js/atlas.js`
- `buildParticleAtlas()`: textura de partículas 128×128 generada en código
  (bolas de humo, llama coloreada, chispa, bola de fuego), en las UV que
  los ficheros esperan. `pxUV()` auxiliar.

### [MODIFICADO] `js/renderer.js`
- Pipeline de partículas (shader billboard con color RGBA por vértice y
  niebla) y `drawParticles()`, entre las entidades y las transparencias.

### [MODIFICADO] `js/main.js`
- Crea el `ParticleSystem`, carga los efectos y `disparar(evento,...)`.
  Hooks: explosión (posición), muerte y golpe de mob (por el hook `sound`,
  con el aabb del mob) y rotura de bloque (`particulasRotura`, teñida con
  el color medio de la tésela del bloque).

### [MODIFICADO] `test/smoke.mjs`, `documents/*`
- 24 comprobaciones nuevas (11 Molang, 13 partículas): 260 → **284**. Nuevo
  `documents/08-particulas.md`; documento 01 al día.

## Verificación

- Suites en verde: smoke 284, mobs 156, biomas 42, aldeas 62.
- Render en WebGL real (puppeteer + Edge): la explosión muestra bola de
  fuego naranja, chispas y humo que se expanden y disipan; el juego arranca
  sin errores de consola.

## Impacto

- Las explosiones (creeper, antidron), la muerte y el daño de mobs y la
  rotura de bloques ganan efecto visual. El intérprete admite cualquier
  otro efecto de `particles/` que use el subconjunto cubierto, así que
  asociar nuevos eventos es añadir una entrada a `EFECTOS`.

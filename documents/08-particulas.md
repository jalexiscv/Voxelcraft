# Partículas: efectos de explosión, combate y rotura

## Descripción

Sistema de partículas que **interpreta en runtime** los ficheros de efectos
del formato Bedrock (`particles/*.json`) y los billboardea en WebGL. A
diferencia de `sounds/` y `models/` (overrides locales gitignored), los
`particles/*.json` **viven en el repo**: son datos JSON propios, no
binarios de terceros. La textura de las partículas se genera **en código**
(100 % procedural, como el atlas de bloques): nada de PNG externos.

## Cómo funciona

1.  Un efecto es un `particle_effect` Bedrock (emisor + apariencia +
    movimiento) con expresiones **Molang**. `js/molang.js` compila cada
    expresión a una función `(ctx)=>número` una sola vez; `js/particles.js`
    (`parseEffect`) monta el descriptor y `ParticleSystem` simula y produce
    los *snapshots* que dibuja `renderer.js` (`drawParticles`, quads
    billboard con tinte RGBA y niebla).
2.  `js/particlepack.js` mapea cada **evento del juego** a los ficheros que
    lo componen (`EFECTOS`) y los carga al arrancar (sondeo silencioso: si
    un fichero falta, ese evento simplemente no pinta). `main.js` dispara
    los eventos y les inyecta las `variable.*` de contexto.
3.  La textura procedural la genera `buildParticleAtlas()` de `js/atlas.js`
    (128×128, mismas coordenadas UV que los ficheros esperan): bolas de
    humo/explosión, llama coloreada, chispa y bola de fuego grande.

## Eventos y sus efectos (`EFECTOS` de `js/particlepack.js`)

| Evento | Disparo | Ficheros |
|---|---|---|
| `explosion` | creeper, antidron kamikaze, cualquier `explode()` | `vc_explosion_fireball` + `vc_explosion_smoke` + `vc_explosion_sparks` |
| `mob_death` | un mob muere | `explosion_death` |
| `mob_hurt` | un mob recibe daño | `basic_crit` |
| `block_break` | romper un bloque (creativo o picado) | `block_destruct` (teñido con el color del bloque) |

Los tres `vc_explosion_*` son **composición propia** (formato Bedrock)
pensada para lucir: bola de fuego naranja que se expande y apaga a humo,
nube de humo gris que sube, y chispas doradas que salen disparadas y caen.
El resto reutiliza los efectos Bedrock del directorio.

## Subconjunto Molang cubierto (`js/molang.js`)

Aritmética con precedencia y unario, sufijo `f`, comparaciones y ternario;
`Math.random`/`Math.Random(a,b)` (alias) contra un PRNG **inyectable**
(tests deterministas) y `abs/floor/ceil/sqrt/sin/cos/pow/min/max/mod/clamp/
lerp`; variables `variable.<n>` y `variable.<n>.<campo>` (x/y/z, r/g/b/a,
u/v), `particle_age`, `particle_lifetime`, `particle_random_1..4`. Lo que
un fichero use fuera de esto cae a un valor fijo (`compileSafe`) sin romper.

## Componentes de efecto soportados (`parseEffect`)

`emitter_rate_instant {num_particles}` · `emitter_shape_point/custom
{offset, direction}` · `emitter_shape_sphere {radius, direction:"outwards"}`
· `particle_initial_speed` (escalar o `[x,y,z]`) · `particle_lifetime_
expression {max_lifetime}` · `particle_appearance_billboard {size,
uv{flipbook|estático}}` · `particle_appearance_tinting {gradient,
interpolant}` · `particle_motion_dynamic {linear_acceleration,
linear_drag_coefficient}`. La textura `atlas.terrain` usa el atlas de
bloques (rotura); el resto, el atlas de partículas.

## Variables de contexto que inyecta `main.js`

- **block_break**: `variable.color` (medio del bloque, muestreado del
  atlas), `emitter_intensity/radius`, `velocity_scalar`,
  `emitter_texture_coordinate/size` (la tésela del bloque).
- **mob_death**: `variable.aabb` (medio ancho/alto del mob) para la forma.
- **mob_hurt**: `variable.direction`.

## Verificación

*   `node test/smoke.mjs` — tandas «Molang» (aritmética, variables, randoms,
    ternario, `compileSafe`) y «Partículas» (parseo de efectos reales,
    emisión, física del humo, flipbook, expiración por vida, ráfaga de
    explosión, fragmentos de bloque con su color). Sin depender de red: los
    ficheros se leen del propio `particles/` del repo.
*   Render verificado en WebGL real (puppeteer + Edge): la explosión muestra
    bola de fuego naranja, chispas y humo que evolucionan y se disipan; el
    juego arranca sin errores de consola.

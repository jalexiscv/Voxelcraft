# Lata de Red Bull: bloque dinámico explosivo con mecha de 10 s

**Fecha:** 2026-07-06
**Módulo:** VoxelCraft > Motor / Bloques

## Descripción

Item colocable nuevo a petición del usuario: una **lata de Red Bull**
(id 87), emulación en pixel art procedural propio de la lata clásica de la
bebida energética. Segundo bloque dinámico del motor tras la cámara de
vigilancia: sin malla estática en el chunk, se dibuja cada frame como
entidad de partes-caja con el pipeline de los mobs.

La lata no es un adorno: al colocarla **arma una mecha de 10 segundos** y
al agotarse **estalla con radio 4** — un cráter circular de área
π·4² ≈ **50 bloques cuadrados** — con un espectáculo de partículas en
capas. De paso, el rastreo de bloques dinámicos en chunks (que la cámara
llevaba dentro) se extrae a un registro genérico reutilizable, y la
explosión del creeper se generaliza a un `explodeAt` invocable desde fuera.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [AGREGADO] `js/latas.js`
- Modelo de **4 partes** con silueta de lata «sleek»: base cónica 3×1×3,
  cuerpo esbelto 4×8×4, hombro cónico con la boca troquelada y anilla
  2×1×1 sobre la tapa (≈0,69 bloques de alto). Piel 32×32 procedural:
  **rombos diagonales azul/plata** de período 8 que envuelven las 16
  columnas de la pared **sin costura**, emblema frontal (sol amarillo
  flanqueado por los dos toros rojos y rótulo azul), tapas de aluminio y
  fondo cóncavo en sombra. Cada lata mira a una de **8 orientaciones
  determinista** por hash de su celda (`yawDeLata`).
- **Mecha** (`MECHA_S = 10`, puro y testeable): por celda, arranca al
  colocar y se DESACTIVA al romper la lata a tiempo. `update(dt)` devuelve
  las celdas que chisporrotean (burbujas cada 0,5 s → 0,25 s → 0,12 s:
  se acelera), silban (una vez al entrar en los últimos `AVISO_S = 3` s,
  cuando además se enciende el parpadeo blanco de mecha que mobrender ya
  aplica a `fuseT ≥ 0`) y estallan (`RADIO_EXPLOSION = 4`). La descarga
  del chunk olvida la mecha; al recargarlo la lata arranca de nuevo en
  10 s (sin estado por bloque que la persista: adaptación documentada).

### [AGREGADO] `js/dinamicos.js`
- `RegistroDinamico`: registro genérico de bloques dinámicos extraído de
  `CamaraSystem`, parametrizado por id de bloque y fábrica de entidades
  (sync por chunk, alta/baja puntual en onSet, reconstrucción barata).

### [AGREGADO] `particles/vc_lata_fizz.json`, `vc_lata_boom_fireball.json`, `vc_lata_boom_humo.json`, `vc_lata_boom_alas.json`
- Efectos Bedrock propios: burbujas de gas blanco-azuladas de la mecha, y
  las tres capas EXTRA del estallido — bola de fuego doble (40 partículas,
  flipbook), hongo de humo ascendente (26, vida hasta 2,6 s) y el chorro
  de energía azul→blanco «te da alas» (30, a 5-13 m/s con empuje +Y).

### [MODIFICADO] `js/mobs.js`
- `explode(m, ctx)` se parte en dos: la esfera de destrucción, el daño
  decreciente (jugador y mobs a < 2r) y el hook pasan al genérico
  **`explodeAt(pos, r, playerPos, skip)`**; el creeper y el kamikaze lo
  llaman igual que antes y la lata lo invoca desde main.js con radio 4.
  `hooks.explosion` gana el radio como 2.º argumento.

### [MODIFICADO] `js/camaras.js`
- `CamaraSystem` pasa a extender `RegistroDinamico`; conserva su `update`
  (barrido + LED). Comportamiento idéntico, ~60 líneas menos.

### [MODIFICADO] `js/blocks.js`, `js/atlas.js`, `js/items.js`, `js/particlepack.js`, `js/main.js`
- `B.REDBULL = 87`: dinámico, sin colisión, dureza 1 a mano (aluminio
  fino), suelta su bloque al romperla a tiempo. Tésela 134 nueva solo para
  el icono del HUD/selector. Receta **sin forma**: lingote de hierro +
  trigo → 1 lata. Eventos de partículas `lata_fuse` y `lata_explosion`
  (capas extra sobre el evento `explosion` base). En main.js: cableado en
  paralelo a la cámara (buildType, sync, onSet, reset), tick de mechas en
  el bucle (burbujas → silbido → `explodeAt` + capas extra) y
  `limpiarDinamicos`: TODA explosión reconcilia ahora los registros de
  cámaras y latas del cubo afectado (antes una cámara volada por un
  creeper quedaba de entidad fantasma).

### [MODIFICADO] `test/smoke.mjs`, `test/mobs.mjs`, `documents/01-voxelcraft.md`, `documents/04-items.md`
- Tanda «Lata de Red Bull» en smoke (31 comprobaciones: flags e id fijo,
  sin malla estática, raycast, partes y UVs, cobertura del paint, rombos
  fieles a la diagonal y sin costura, emblema exacto, yaw determinista,
  registro alta/baja/descarga, receta, constantes de mecha y área ≈ 50
  bloques², ciclo completo armado→aviso→estallido, desactivado al romper,
  reinicio al recargar el chunk y las 4 capas de partículas parseando y
  emitiendo su ráfaga): suite 285 → **316**. En mobs, tanda de
  `explodeAt` (semiesfera exacta de 152 celdas, bedrock sobrevive, daño
  por distancia): 183 → **186**. Recuentos a 88 tipos y 2 dinámicos.

## Impacto

- El registro genérico deja el tercer bloque dinámico a un paso; el
  `explodeAt` genérico abre las explosiones a cualquier mecánica futura
  (TNT, impactos…). Corregido de rebote el fantasma de bloques dinámicos
  destruidos por explosiones de mobs.
- Verificación visual en WebGL real (arnés + puppeteer/Edge): modelo,
  icono, burbujeo, parpadeo de aviso y las tres fases del estallido
  (bola de fuego → fuego + alas azules → hongo de humo); la página real
  arranca sin errores JS.
- Suites en verde: smoke 316, mobs 186, biomas 42, aldeas 62, viewmodel 20.

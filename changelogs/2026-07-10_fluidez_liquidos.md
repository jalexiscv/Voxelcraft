# Fluidez de líquidos: el agua y la lava fluyen como en el clásico

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Mundo > Fluidos

## Descripción

Hasta ahora el agua y la lava eran bloques estáticos: romper el borde de un
lago dejaba una pared de agua suspendida. Este cambio añade la simulación de
fluidos: los líquidos caen, se esparcen por niveles decrecientes con el
alcance del clásico (agua 7 bloques, lava 3), se secan al perder su fuente,
rellenan los agujeros del océano (fuente infinita) y reaccionan entre sí
(agua + lava → obsidiana o adoquín).

### Diseño (alternativas consideradas)

- **El nivel es el id de bloque** (`B.WATER_FLOW1..+8` = 91..98, `B.LAVA_FLOW1..+8`
  = 99..106; la fuente vale 8 y el flujo de nivel 8 es la columna que cae): el
  mismo patrón que los cultivos («la etapa es el id»), de modo que el nivel se
  persiste gratis con el RLE de 16 bits y respeta la paletización por
  secciones. Se descartó un mapa de metadatos aparte (tipo `world.blockData`)
  porque rompería la paleta, el guardado y el patrón establecido.
- **Cola dirigida por eventos, no muestreo aleatorio**: `world.set` despierta a
  los líquidos vecinos de cada edición (gancho opcional `world.fluidos`, del
  mismo estilo que `onSet`), y `tickFluidos` procesa la cola con la cadencia de
  cada fluido (agua 0,25 s; lava 1,5 s, como los 5/30 ticks del clásico). Un
  océano en calma cuesta cero. Se descartó el muestreo aleatorio tipo cultivos
  porque no reacciona a romper un dique.
- **En el mundo global simula solo el servidor** (como el clima): el cliente en
  línea no activa fluidos y recibe las ediciones por red; en los mundos locales
  simula `main.js`.

### Reglas (y adaptaciones declaradas)

- Caer tiene prioridad absoluta; la columna que cae va llena (nivel 8) y al
  aterrizar se esparce con nivel 7 (agua) o 6 (lava).
- Fuente infinita solo del agua: un flujo con ≥2 fuentes vecinas sobre suelo
  firme se consolida como fuente.
- Agua + lava: la celda de LAVA se petrifica — fuente → obsidiana, flujo →
  adoquín. *Adaptación:* sin distinguir el lado del contacto como el clásico.
- El líquido arrasa las plantas (bloques `cross`: flores, cultivos, antorchas)
  sin botín. *Adaptación:* se esparce a las 4 direcciones a la vez, sin buscar
  el hueco más cercano a 4 bloques.
- *Límite conocido:* el flujo se detiene en el borde de los chunks no
  generados y no se reanuda solo al generarse (hace falta una edición cercana
  que lo despierte, como los block updates del clásico).
- *Deuda declarada (menor):* la esponja no absorbe agua y la cara lateral de
  una fuente de lava contra su propio flujo deja una franja sin dibujar (el
  mismo tipo de artefacto que los escalones del agua entre niveles).

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/fluidos.js`
- Simulación completa: `activarFluidos(world)` (colas + gancho `tocar`) y
  `tickFluidos(world, dt)` (paso por fluido con su cadencia; sostén, caída,
  esparcido, fuente infinita y petrificación).

### [MODIFICADO] `js/blocks.js`
- Ids 91..106 (`WATER_FLOW1`, `LAVA_FLOW1` + 8 niveles cada uno) con defs de
  líquido no colocable/no picable; la lava en flujo no es opaca (altura parcial).
- Helpers de familia: `esAgua`, `esLava`, `esLiquido`, `nivelDe`.

### [MODIFICADO] `js/world.js`
- `set()` despierta a los fluidos del entorno (gancho opcional `world.fluidos`).
- `EMIT`: toda la familia de la lava emite luz 15 (antes solo la fuente).

### [MODIFICADO] `js/mesher.js`
- Altura de la superficie según el nivel del id (fuente 0,875; flujo n/8 de
  eso); el culling `hideSame` opera por familia líquida; el flujo de agua entra
  en la malla translúcida de agua. La fuente de lava sigue siendo cubo opaco.

### [MODIFICADO] `js/player.js`, `js/farming.js`, `js/mobs.js`
- Todos los contrastes `=== B.WATER` pasan a `esAgua(...)`: nado y ojos
  sumergidos, riego de cultivos, física/aparición de mobs y explosiones.

### [MODIFICADO] `js/main.js`
- `activarFluidos` al crear mundos locales y `tickFluidos` en el bucle (no-op
  en el mundo global).

### [MODIFICADO] `server/multijugador.mjs`
- `activarFluidos(mundo)` al arrancar y `tickFluidos` en el tick de 20 Hz; las
  ediciones de fluidos salen a los clientes por el gancho `onSet` existente.

### [NUEVO] `test/fluidos.mjs`
- Suite de 10 pruebas: no-op sin activar, esparcido por niveles y alcance 7,
  prioridad de caída, secado sin fuente, fuente infinita, alcance 3 y cadencia
  de la lava, petrificación, plantas arrasadas vs muro, luz 15 del flujo de
  lava + altura de malla, y flags/niveles de los 16 ids.

### [MODIFICADO] `test/smoke.mjs`, `js/materiales.js`
- El contrato del rango de bloques manuales pasa de 0..90 a 0..106.

## Impacto

- Romper el borde de un lago u océano inunda el hueco; los cráteres de las
  explosiones submarinas se rellenan; la lava de las cuevas fluye al minarla.
- Compatibilidad: los guardados viejos cargan igual (solo contienen fuentes);
  los ids nuevos persisten con el RLE de 16 bits sin tocar el formato.
- Verificación: `node test/fluidos.mjs` (10 ✓) y las 11 suites existentes en
  verde (318 + 186 + 62 + …); sintaxis de `main.js` y del servidor con
  `node --check`; E2E sobre el juego real (Edge headless, `?debug`): fila de
  ids desde la fuente `8 97 96 95 94 93 92 91 0`, 113 celdas (bola Manhattan
  de radio 7 exacta), secado total al retirar la fuente y captura visual del
  rombo con alturas decrecientes.

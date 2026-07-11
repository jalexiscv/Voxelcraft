# Aldeanos constructores: acarrean, construyen y defienden sus obras

**Fecha:** 2026-07-11
**Módulo:** VoxelCraft > Mobs > Aldeanos

## Descripción

Los aldeanos dejan de ser paseantes pasivos: ahora emprenden **proyectos de
construcción** —chozas, huertos y estatuas—, van a por materiales, los
acarrean a la obra, la levantan bloque a bloque de abajo arriba y la
**defienden** de los hostiles. Los huertos son cultivos de verdad (tierra
labrada + canal de riego + siembra): crecen solos con `tickCultivos`.

Cierre de la trilogía iniciada en los changelogs 156 (planos exclusivos) y
157 (lógica pura js/aldeanos.js): esta entrada integra la conducta en la IA
de mobs. El desarrollo se repartió entre **múltiples agentes** (tres de
exploración en paralelo sobre IA/aldeas/multijugador y dos de implementación
sobre archivos disjuntos), como pidió la orden.

### Cómo funciona (js/mobs.js, conducta `behavior.builder`)

- Rama nueva en el despachador de conductas, con `builderAI` como método del
  MobSystem (el molde de la casa: evasive/antidron/guardian).
- **Ciclo del oficio**: descanso → sorteo del proyecto (choza 3 / huerto 3 /
  estatua 1) → búsqueda de solar llano, seco y natural a 8..24 bloques
  (js/aldeanos.js) → viaje al punto de acopio (6..12 bloques) y recogida →
  acarreo al puesto de obra (junto al borde de la huella, nunca dentro) →
  colocación de un bloque cada 0,5 s, con un viaje de recarga cada 12
  bloques → celebración con su voz y descanso (~150 s) hasta el siguiente.
- **Defensa**: sondeo cada 0,5 s del hostil terrestre más cercano a la obra
  o a sí mismo (radio 10); persecución y golpe cuerpo a cuerpo (daño 3,
  cadencia 1,2 s) con el molde `chaseTarget` del guardián — la primera
  conducta mob-contra-mob de un pacífico. Malherido (≤6 hp) no pelea, y si
  lo golpean manda la huida clásica.
- **Antiatasco**: sin pathfinding, un risco o un tronco pueden dejarlo
  empujando en vano; si apenas avanza durante 8 s abandona la obra (los
  bloques ya puestos quedan) y sortea otra en un solar alcanzable.
- Primer mob que COLOCA bloques: cada colocación pasa por `world.set` (con
  guarda de chunk generado), así hereda gratis remallado, persistencia del
  chunk y difusión multijugador; el azar usa el PRNG sembrado del sistema.

### Multijugador y persistencia (sin cambios de protocolo)

- En el mundo global la conducta corre en los MobSystem del SERVIDOR y sus
  `mundo.set` viajan a todos los clientes como ediciones normales; el
  cliente ve al aldeano por la fachada de mobs remotos sin cambios.
- Los bloques colocados persisten con el chunk. El proyecto en curso NO
  persiste (patrón de la mecha de la lata): al recargar, la obra a medias
  queda como ruina encantadora y el aldeano emprende otra.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- Import de js/aldeanos.js; `this.seed` en el MobSystem; campos de tarea en
  el Mob (`obra`, `obraCd`, `scanCd`, `trabajoT`, `defensa`); rama
  `behavior.builder` en el despachador y método `builderAI` (fases, defensa,
  antiatasco, colocación con cadencia).

### [MODIFICADO] `js/mobs/villager.js`
- `behavior: { builder, aggro 10, attackRange 1.7, damage 3, cooldown 1.2,
  fleeHp 6 }` — todo aldeano es constructor.

### [MODIFICADO] `test/aldeanos.mjs`
- Dos pruebas de integración con el MobSystem y el World reales: el ciclo
  completo de la obra (todas las celdas del plan colocadas, fases acopio/
  acarreo/obra recorridas, descanso final) y la defensa (el zombi junto a la
  obra acaba herido). A 20 Hz: la física de mobs no es barrida y con pasos
  grandes tunela el suelo (hallazgo del arnés, documentado en el test).

## Impacto

- Verificación: 13 suites en verde (721 comprobaciones; aldeanos 15, mobs
  186, humo 318…); sintaxis de main.js y servidor. E2E en el juego real
  (Edge headless, semilla fija, sabana): un aldeano aparecido con `spawnAt`
  eligió un huerto, viajó al acopio, acarreó y lo construyó COMPLETO — 24
  bancales de FARMLAND, canal de 7 aguas, 4 troncos, antorcha y 24 cultivos
  sembrados en etapas variadas — verificado por conteo de bloques en la caja
  y captura visual; sin errores de página.
- Límites declarados: sin pathfinding (el antiatasco abandona y reintenta);
  el acarreo no muestra el material en las manos (viajes visibles, carga
  abstracta); las obras no consultan el trazado de la aldea (los aldeanos
  colonizan donde viven); en pantalla el constructor del mundo global se ve
  caminar e idle entre bloques que aparecen (sin animación de colocar).

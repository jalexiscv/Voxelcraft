# Aldeanos constructores

Los aldeanos (`villager`) emprenden **proyectos de construcción** por su
cuenta: eligen un solar cerca de donde viven, van a por materiales, los
acarrean, levantan la obra bloque a bloque y la defienden de los hostiles.
Tres piezas cooperan:

| Pieza | Archivo | Qué resuelve |
|---|---|---|
| Planos exclusivos | [js/villages/planos/](../js/villages/planos/) `choza.js`, `estatua.js`, `huerto.js` | La geometría de las obras (contrato de plano de aldea; registrados solo por id: fuera del pool del worldgen y de `/construir`) |
| Lógica pura | [js/aldeanos.js](../js/aldeanos.js) | Sorteo ponderado del proyecto, búsqueda del solar, plan de obra y cadencias |
| Conducta | [js/mobs.js](../js/mobs.js) `builderAI` (`behavior.builder` del def) | La máquina de estados del oficio sobre la IA de mobs |

## El ciclo del oficio

1. **Descanso** (~150 s tras cada obra; sortea reintentos si no hay solar).
2. **Proyecto**: choza (peso 3), huerto (3) o estatua (1).
3. **Solar**: hasta 12 intentos a 8..24 bloques — huella completa en chunks
   generados, terreno llano (±1), seco (sobre la cota de playa), suelo
   natural y sin nada construido ni árboles encima.
4. **Acopio**: camina a un punto a 6..12 bloques de la obra y «recoge»
   material (~1,2 s).
5. **Acarreo**: lo lleva al puesto de obra, junto al borde de la huella (el
   aldeano nunca queda emparedado en su propio edificio).
6. **Obra**: coloca un bloque cada 0,5 s, de abajo arriba (el plan viene de
   `estampar` con un callback recolector: hereda relleno, corte, paleta por
   bioma, puertas de dos hojas y cultivos posicionales). Cada 12 bloques,
   otro viaje de acopio. Al rematar, celebra con su voz.
7. **Defensa** (prioritaria en todo el ciclo): si un hostil terrestre se
   acerca a menos de 10 bloques de la obra o del aldeano, lo persigue y
   golpea (daño 3 cada 1,2 s; molde `chaseTarget` del guardián). Malherido
   (≤6 hp) no pelea; si lo golpean, manda la huida clásica del pasivo.

Los **huertos son cultivos reales**: bancales de FARMLAND con canal de agua
central y siembra determinista (trigo/zanahoria/patata por columna), así que
crecen solos con el `tickCultivos` de [js/farming.js](../js/farming.js).

## Robustez y límites declarados

- **Antiatasco**: no hay pathfinding; si el aldeano apenas avanza durante
  8 s camino del acopio o de la obra, la abandona (los bloques ya puestos
  quedan) y sortea otra en un solar alcanzable.
- El progreso de la obra vive en el mob y **no persiste**: al guardar/cargar
  quedan los bloques colocados (viajan con el chunk) y la obra a medias se
  abandona — el mismo patrón que la mecha de la lata de Red Bull.
- El acarreo es abstracto (viajes visibles, sin material en las manos) y no
  hay animación de colocar bloque.
- Las obras no consultan el trazado de la aldea: los aldeanos colonizan
  cerca de donde viven (que, por sus biomas de aparición, suele ser el
  entorno de las aldeas).

## Multijugador

En el mundo global la conducta corre en los `MobSystem` del **servidor**
(que ya simula los mobs por dominios): cada bloque colocado pasa por
`mundo.set`, se difunde a todos los clientes como una edición normal y se
persiste con el autoguardado. El cliente ve al aldeano por la fachada de
mobs remotos sin ningún cambio de protocolo.

## Verificación

- `node test/aldeanos.mjs` — 15 pruebas: la lógica pura (sorteo, solar,
  plan, acopio, determinismo) y la integración con el MobSystem real (ciclo
  completo de la obra con todas las celdas colocadas; defensa efectiva).
  Nota del arnés: simular a 20 Hz — la física de mobs no es barrida y con
  pasos de tiempo grandes tunela el suelo.
- E2E sobre el juego real (`?debug`): aparición con `spawnAt`, aceleración
  de cadencia desde el gancho, y verificación por conteo de bloques + captura
  (changelog 158).

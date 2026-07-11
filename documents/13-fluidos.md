# Fluidos

Simulación de la fluidez del agua y la lava: los líquidos caen, se esparcen
por niveles decrecientes, se secan al perder su fuente y reaccionan entre sí,
con las reglas y cadencias del Minecraft clásico. Vive en
[js/fluidos.js](../js/fluidos.js) (módulo puro, probable en Node) y se apoya
en los helpers de familia de [js/blocks.js](../js/blocks.js).

## Modelo de datos: el nivel es el id

Cada celda del mundo sigue siendo un único id de 16 bits; el estado del
líquido se codifica en el id, igual que la etapa de los cultivos:

| Id | Bloque | Significado |
|---|---|---|
| 8 (`B.WATER`) | Agua (fuente) | Nivel 8; permanente salvo que algo la reemplace |
| 9 (`B.LAVA`) | Lava (fuente) | Nivel 8; cubo opaco lleno (render intacto) |
| 91..98 (`B.WATER_FLOW1..+8`) | Agua (flujo) | Nivel 1..8; el 8 es la columna que cae |
| 99..106 (`B.LAVA_FLOW1..+8`) | Lava (flujo) | Nivel 1..8; emite luz 15 como la fuente |

Helpers en blocks.js: `esAgua(id)`, `esLava(id)`, `esLiquido(id)` y
`nivelDe(id)` (fuente = 8; no líquido = 0). Los flujos no son colocables ni
picables ni aparecen en el selector; el raycast los atraviesa. Con ids
ordinarios, el nivel persiste gratis en el RLE del guardado y respeta la
paletización por secciones.

## Motor: cola dirigida por eventos

- `activarFluidos(world)` crea las colas y publica el gancho opcional
  `world.fluidos`; `world.set` llama a `world.fluidos.tocar(x, y, z)` tras
  cada edición, que encola las celdas **líquidas** del entorno (la propia y
  sus 6 vecinas). Un mundo en calma no encola nada y no cuesta nada.
- `tickFluidos(world, dt)` da un paso por fluido al vencer su periodo:
  **agua cada 0,25 s** y **lava cada 1,5 s** (los 5/30 ticks del clásico).
  Cada paso procesa una instantánea de la cola (máximo 1024 celdas; lo que
  las escrituras encolen durante el paso espera al siguiente), así el frente
  avanza un bloque por periodo.

### Reglas por celda procesada

1. **Contacto agua↔lava**: la celda de LAVA se petrifica — fuente →
   obsidiana, flujo → adoquín (adaptación: sin distinguir el lado del
   contacto).
2. **Sostén (solo flujos)**: con líquido de su familia encima le corresponde
   nivel 8 (columna); si no, el máximo de sus 4 vecinas horizontales menos el
   decaimiento (agua 1, lava 2). Sin soporte suficiente decae hasta secarse.
   **Fuente infinita** (solo agua): con ≥2 fuentes vecinas y suelo firme se
   consolida como fuente (los agujeros del océano se rellenan).
3. **Esparcido**: caer tiene prioridad absoluta (a aire o planta, con nivel
   8); sobre suelo sólido se esparce a las 4 direcciones con
   `nivel − decaimiento` (adaptación: sin buscar el hueco más cercano). El
   agua alcanza 7 bloques desde la fuente y la lava 3. El líquido arrasa los
   bloques `cross` (flores, cultivos, antorchas…) sin botín.

## Quién simula

| Mundo | Simulador |
|---|---|
| Local (un jugador) | `main.js`: `activarFluidos` al crear el mundo y `tickFluidos` en el bucle |
| Global (multijugador) | `server/multijugador.mjs` a 20 Hz; las ediciones salen por `onSet` y el cliente en línea NO activa fluidos (como el clima) |

## Render

En [js/mesher.js](../js/mesher.js): la superficie del líquido se hunde según
el nivel (`0.875 · nivel / 8`) y es **continua por esquinas**: cada esquina de
la tapa promedia la altura de las hasta 4 celdas de su familia que la
comparten, y sube a tope si alguna continúa en columna hacia arriba o es el
cubo lleno de una fuente de lava. Como dos celdas vecinas muestrean el mismo
vecindario para su esquina común, obtienen alturas idénticas: la lámina se
inclina hacia los niveles menores sin rendijas entre escalones ni costuras
entre chunks (el muestreo usa `world.get` global). El culling `hideSame`
opera por familia (sin caras internas entre niveles distintos) y todo flujo
de agua entra en la malla translúcida de agua. La fuente de lava sigue siendo
el cubo opaco lleno de siempre; la lava en flujo no es opaca y emite luz 15
(tabla `EMIT` de [js/world.js](../js/world.js)).

## Interacciones con el resto del juego

- Nado y ojos sumergidos ([js/player.js](../js/player.js)), riego de cultivos
  ([js/farming.js](../js/farming.js)) y física/aparición de mobs
  ([js/mobs.js](../js/mobs.js)) reconocen toda la familia con `esAgua`.
- Las explosiones respetan el agua (como antes) y sus cráteres submarinos se
  rellenan solos por la regla de la fuente infinita.

## Límites conocidos

- El flujo se detiene en el borde de los chunks no generados y no se reanuda
  solo al generarse: hace falta una edición cercana que lo despierte (los
  «block updates» del clásico se comportan igual).
- La esponja no absorbe agua (pendiente si algún día se necesita).

## Verificación

- `node test/fluidos.mjs`: 10 pruebas sobre el `World` real (esparcido y
  alcances, caída, secado, fuente infinita, petrificación, plantas, luz y
  malla, flags de los 16 ids).
- E2E sobre el juego real (Edge headless, `?debug` expone `window.__vc`):
  colocar una fuente sobre una bandeja de ladrillo produce la bola Manhattan
  de radio 7 exacta (113 celdas, ids `8 97 96 95 94 93 92 91 0` en fila) y
  retirar la fuente la seca por completo.

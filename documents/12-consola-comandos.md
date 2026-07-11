# Consola de comandos

El chat del juego —disponible en **todos** los mundos, no solo en el
global— dobla como consola: toda línea que empieza por `/` se interpreta
como comando, se ejecuta en el cliente y sus respuestas se pintan solo en
el log local (nunca viajan por la red). Las líneas sin `/` siguen siendo
chat: en el mundo global se difunden por el servidor y en los mundos
locales se muestran como eco propio.

## Uso

| Tecla | Efecto |
|---|---|
| `T` | Abre el campo del chat |
| `/` | Abre el campo con la barra ya puesta (directo a la consola) |
| `Enter` | Envía (o ejecuta, si empieza por `/`) y cierra |
| `Esc` | Cierra sin enviar |

La tecla `/` se detecta por `e.key` (no por código físico), de modo que en
el teclado español funciona con Shift+7.

## Comandos

| Comando | Uso | Efecto |
|---|---|---|
| `/ayuda` | `/ayuda [comando]` | Lista los comandos o explica uno |
| `/tp` | `/tp <x> <y> <z>` | Teletransporta; admite `~` y `~±n` relativos |
| `/hora` | `/hora <nombre\|0..24>` | Fija la hora del día |
| `/clima` | `/clima <despejado\|lluvia\|tormenta>` | Fuerza el estado del clima |
| `/dar` | `/dar <nombre> [cantidad]` | Añade bloques o items al inventario (supervivencia) |
| `/modo` | `/modo <supervivencia\|creativo>` | Cambia el modo de juego en caliente |
| `/dificultad` | `/dificultad <normal\|pacifica>` | Cambia la dificultad |
| `/curar` | `/curar` | Repone salud y hambre |
| `/matar` | `/matar` | Acaba con el jugador (pantalla de muerte) |
| `/aparecer` | `/aparecer <mob> [cantidad]` | Hace aparecer criaturas frente al jugador (tope 10) |
| `/construir` | `/construir [nombre]` | Levanta una construcción prediseñada frente al jugador |
| `/semilla` | `/semilla` | Muestra la semilla del mundo |

Convenciones:

- **Coordenadas de `/tp`**: la Y es la «mostrada» al estilo Minecraft
  (interna − `Y_BASE`), la misma que enseña F3 (lecho de roca −64, mar 64,
  techo 320). `~` es la coordenada actual y `~±n` un desplazamiento.
- **Hora**: nombres `amanecer`, `dia`, `mediodia`, `atardecer`, `noche`,
  `medianoche`, o un número 0..24 con la convención de F3 (0 = mediodía);
  «amanecer» coincide con el instante al que lleva dormir en la cama.
- **Nombres en español, sin ceremonia**: la búsqueda pliega mayúsculas y
  acentos (`adoquin` encuentra «Adoquín»), resuelve por coincidencia
  exacta, prefijo único o subcadena única, y ante ambigüedad sugiere hasta
  cinco candidatos. Los mobs también responden a su clave del registro
  (`pig`, `zombie`…).
- **Modos**: `/dar` se niega en creativo (el selector ya ofrece todo el
  catálogo con la tecla B); `/curar` y `/matar` se niegan en creativo
  (no hay salud que gestionar).

## Construcciones prediseñadas (`/construir`)

El catálogo son los 8 planos reales del sistema de aldeas
([05-aldeas.md](05-aldeas.md)): **Pozo, Casa pequeña, Casa grande, Granja,
Herrería, Biblioteca, Templo y Atalaya**, más las construcciones
**exclusivas de la consola** (`PLANOS_CONSOLA` del registro, fuera del
worldgen): las **Torres**, un complejo monumental de tres rascacielos
curvados de 56×220×56 —costillas de diorita y andesita, ventanales de
cristal, doble corona escalonada y podio-lente acristalado— cuya torre
central roza el techo del mundo. `/construir` sin argumento los lista; con
nombre (o con el id del plano, p. ej. `casa_pequena`) estampa el edificio:

- **a 2 bloques por delante** del jugador, centrado lateralmente, con la
  fachada —y su puerta— mirando hacia él (rotación por el cardinal
  dominante de la mirada);
- **a la cota del bloque que pisa** (la capa 0 del plano es el cimiento),
  con relleno de tierra debajo y corte de aire encima, como al generar una
  aldea;
- **con la paleta del bioma local** (madera en llanura, arena en el
  desierto, abeto en la taiga, nieve en el techo del bioma nevado…); la
  granja siembra cultivos posicionales deterministas.

Si el terreno de la huella aún no está generado (p. ej. justo tras un
`/tp` lejano), el comando avisa en vez de construir a medias. Un plano
nuevo que entre al registro de aldeas aparece automáticamente en el
catálogo de la consola.

La lógica vive en [js/construcciones.js](../js/construcciones.js) (módulo
puro: colocación y estampado vía callback), que reutiliza los planos, la
caja rotada y la tabla de rotación del sistema de aldeas
(`js/villages/`). Suite: `node test/construcciones.mjs`.

## En el mundo global

Los comandos que fuerzan estado que dicta el servidor se rechazan con
aviso, porque el siguiente mensaje de estado (10 Hz) revertiría el cambio
local: `/hora`, `/clima`, `/modo`, `/dificultad` y `/aparecer`. Los
personales (`/tp`, `/dar`, `/curar`, `/matar`, `/semilla`, `/ayuda`,
`/construir` — los bloques son edición del cliente y viajan por el canal
normal) siguen disponibles. Las líneas `/…` jamás se envían como chat.

## Detalle técnico

- [js/comandos.js](../js/comandos.js) — módulo puro (sin DOM, probable en
  Node): parseo de la línea, catálogos por nombre (bloques colocables +
  items para `/dar`; mobs para `/aparecer`), validación y mensajes. Expone
  `ejecutarComando(linea, ctx) → string[]`, que nunca lanza: todo error de
  uso vuelve como mensaje.
- El **contexto** (`ctx`) es un objeto de funciones que main.js implementa
  (contrato documentado en el docblock del módulo): posición y
  teletransporte, hora, clima, inventario, cambio de modo y dificultad,
  curación, muerte, aparición de mobs y semilla. El cambio de modo replica
  las reglas de interfaz de `startWorld` (selector según el modo, barras
  solo en supervivencia, sin vuelo al volver a supervivencia).
- La integración vive en la sección «Chat y consola de comandos» de
  [js/main.js](../js/main.js): apertura con `T` o `/`, despacho en el
  Enter y `ctxComandos`.
- Suite: `node test/comandos.mjs` (13 pruebas con un contexto de mentira
  que registra las llamadas).

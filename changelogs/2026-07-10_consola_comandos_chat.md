# Consola de comandos en el chat

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Chat > Consola de comandos

## Descripción

El chat, que hasta ahora solo existía en el mundo global, pasa a estar
disponible en todos los mundos y gana una consola de comandos al estilo
clásico: toda línea que empiece por `/` se interpreta como comando y se
ejecuta localmente (sus respuestas jamás viajan por la red). La tecla `T`
abre el chat y la tecla `/` lo abre con la barra ya puesta.

Comandos disponibles: `/ayuda`, `/tp`, `/hora`, `/clima`, `/dar`, `/modo`,
`/dificultad`, `/curar`, `/matar`, `/aparecer` y `/semilla`. Los nombres de
bloques, items y mobs se buscan en español plegando mayúsculas y acentos
(`/dar adoquin 32` encuentra «Adoquín»; `/aparecer cerdo 3` encuentra al
Cerdo, también por su clave `pig` del registro), con resolución por prefijo
o subcadena única y sugerencias ante ambigüedad.

En el mundo global los comandos que tocan estado que dicta el servidor
(`/hora`, `/clima`, `/modo`, `/dificultad`, `/aparecer`) se rechazan con
aviso; los personales (`/tp`, `/dar`, `/curar`, `/semilla`…) siguen
disponibles.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/comandos.js`
- Módulo puro (sin DOM, probable en Node) con el parseo, los catálogos por
  nombre (bloques colocables + items para `/dar`; mobs por nombre español y
  clave para `/aparecer`), la validación de argumentos y los mensajes.
- Ejecuta contra un **contexto inyectado** (`ctx`): un objeto de funciones
  que main.js implementa (posición, teletransporte, hora, clima, inventario,
  modo, dificultad, curación, muerte, aparición y semilla). El contrato está
  documentado en el docblock del módulo.
- `/tp` admite coordenadas relativas (`~` y `~±n`) y habla en la Y
  «mostrada» (interna − Y_BASE), la misma que enseña F3.
- `/hora` acepta nombres (`amanecer`, `dia`, `mediodia`, `atardecer`,
  `noche`, `medianoche`) o un número 0..24 con la convención de F3
  (0 = mediodía); «amanecer» es el mismo instante al que lleva la cama.

### [MODIFICADO] `js/main.js`
- El contenedor del chat se muestra en todos los mundos (antes solo con
  multijugador); la tecla `T` deja de exigir `red.activo` y la tecla `/`
  (por `e.key`, que en el teclado español es Shift+7) abre el chat con la
  barra prefijada.
- `abrirChat(prefijo)` acepta el prefijo opcional.
- El Enter del chat despacha: línea con `/` → `ejecutarComando` y sus
  respuestas al log local; sin `/` → `red.enviarChat` en el mundo global o
  eco local `<alias>` en mundos locales.
- `ctxComandos`: implementación del contexto de la consola. El cambio de
  modo en caliente replica las reglas de interfaz de `startWorld`
  (inventario/selector según el modo, barras de salud y hambre solo en
  supervivencia, sin vuelo al volver a supervivencia).

### [MODIFICADO] `index.html`
- Tabla de controles: filas de `T` (chat y consola) y `/` (consola);
  comentario del bloque del chat actualizado.

### [NUEVO] `test/comandos.mjs`
- Suite de Node del módulo puro (13 pruebas): parseo, plegado de acentos,
  cantidades y topes, ambigüedad, comandos por modo de juego y bloqueo de
  los comandos de servidor en el mundo global, contra un contexto de
  mentira que registra las llamadas.

## Decisiones de diseño

- **Módulo puro con contexto inyectado** en vez de lógica inline en
  main.js: consistente con el patrón del proyecto (clima.js, items.js,
  inventory.js son módulos puros probables en Node) y permite la suite sin
  navegador. main.js solo integra.
- **Comandos en español**, coherentes con la terminología del juego y de su
  interfaz; las claves inglesas del registro de mobs se aceptan como
  sinónimo porque son el id real.
- **`/dar` se niega en creativo** (el selector ya ofrece todo el catálogo)
  y **los comandos de estado del servidor se bloquean en línea**: forzarlos
  localmente produciría un estado que el siguiente mensaje del servidor
  revierte (hora y clima llegan a 10 Hz).

## Verificación

- `node --check` en verde sobre `js/comandos.js` y `js/main.js`.
- `node test/comandos.mjs`: 13/13 en verde; las suites existentes no se
  alteran (smoke 318, mobs 186, villages 62, biomas 42, viewmodel 20,
  secciones 16, clima 13, shatter 10, carve 8 — todas OK).
- E2E con Edge headless sobre el juego real (mundo de supervivencia): 19/19
  comprobaciones — chat visible en mundo local, apertura con `T` y con `/`,
  Escape cierra sin abrir el menú, eco local, y efectos reales de
  `/semilla`, `/hora`, `/clima`, `/dar` (32 adoquines en el inventario),
  `/tp`, `/aparecer` (2 cerdos), `/modo` (barras del HUD), `/ayuda`,
  comando desconocido y `/matar` (pantalla de muerte), sin errores de
  página.

## Impacto

- Los mundos locales ganan el chat como superficie de consola; el flujo del
  chat multijugador no cambia (los mensajes sin `/` se envían igual).
- Sin cambios de formato de guardado ni de protocolo de red: las líneas
  `/…` nunca se envían al servidor.

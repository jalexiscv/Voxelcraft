# Multijugador: mundo global compartido con servidor Node autoritativo

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador

## Descripción

Modo multijugador a petición del usuario, con las decisiones que eligió
entre las opciones presentadas: transporte **Node + WebSocket**, **un único
mundo global** y alcance completo (núcleo + **chat + hora/clima
sincronizados + mobs sincronizados**). Se apoya en el sistema de cuentas de
la entrada 139: solo entra quien tiene sesión iniciada.

Decisión de diseño central (registrada según `Decisions.md`): el servidor
**ejecuta la lógica real del juego** importando los mismos módulos ES del
navegador (`worldgen`, `world`, `mobs`, `clima`) en Node — viabilidad
demostrada por las suites de `test/`, que ya los corrían allí. La
alternativa (reimplementar una simulación paralela en el servidor) se
descartó por duplicar lógica destinada a divergir. Para los mobs con varios
jugadores se eligió **un dominio de simulación por jugador** (MobSystem
real e intacto por cada conectado, mundo compartido) frente a modificar la
IA para múltiples objetivos: cero cambios en mobs.js a costa de que la
densidad escale con los jugadores (documentado).

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `server/multijugador.mjs`, `server/package.json`
- Servidor autoritativo (dependencia nueva aprobada: `ws`): tick a 20 Hz,
  difusión a 10 Hz, generación bajo demanda alrededor de cada jugador (con
  presupuesto), hora/día/clima del mundo, un `MobSystem` por jugador con
  botín al autor del último golpe, validación de todo lo que llega
  (coordenadas, ids contra `DEFS`, alcances, tasas anti-abuso) y
  persistencia atómica en `<xampp>/saves/voxelcraft/mundo-global.json.gz`
  (RLE del formato de storage.js; autoguardado por minuto y en Ctrl+C).
- Tokens HMAC verificados con el secreto compartido, en tiempo constante.

### [NUEVO] `js/red.js`
- Cliente WS: `RedCliente` (conexión, protocolo, buffers de ediciones para
  chunks aún no generados, limpieza al caer) y `MobsRemotos`, fachada con
  la API de `MobSystem` que usa el bucle (`update/raycastMob/hurt/count/
  mobs/arrows`) sobre entidades-sombra interpoladas.

### [NUEVO] `js/avatar.js`
- `JUGADOR_DEF`: humanoide con la geometría del zombi (proporciones Steve),
  pose de brazos caídos y piel propia (camiseta cian, vaqueros, pelo
  castaño); `JugadorRemoto` con interpolación, giro por el camino corto y
  balanceo de piernas según la velocidad observada.

### [NUEVO] `api/token.php` · [MODIFICADO] `api/config.php`, `js/cuenta.js`
- Token `id.alias.exp.firma` (HMAC-SHA256, 5 min) firmado con
  `secreto_compartido()` (archivo autogenerado fuera del docroot); el
  cliente lo pide con `cuenta.token()`.

### [MODIFICADO] `js/world.js`, `js/storage.js`
- Gancho opcional `World.onSet(x,y,z,id,viejo)` al final de `set()` (mismo
  espíritu que el registro de dinámicos): una sola costura difunde las
  ediciones sin tocar los ~10 puntos de edición dispersos. `base64AU16` se
  exporta para decodificar los chunks de la bienvenida.

### [MODIFICADO] `js/main.js`, `index.html`, `css/style.css`
- Botón «Mundo global (multijugador)» (deshabilitado sin sesión) que pide
  el token, conecta y arranca `startWorld(semilla, null, bienvenida)`:
  chunks editados importados en RLE, posición del servidor, hora/clima
  remotos, `game.mobs = red.mobs` y `world.onSet` → red.
- Bucle: interpolación de remotos + posición propia a 10 Hz; hora del
  servidor; transiciones de clima congeladas (manda `forzar` por red).
- Chat (T abre, Enter envía, Escape cierra — integrado en la máquina
  Escape/pointer-lock existente: el cierre por pérdida de captura no abre
  el menú) y etiquetas de alias proyectadas por fotograma con la matriz
  proyección·vista. Guardado manual oculto en el mundo global (persiste el
  servidor). Los eventos de mobs (voz, daño, muerte, explosión) reproducen
  el mismo tratamiento audiovisual que los hooks locales.

### [MODIFICADO] `.gitignore`
- `/server/node_modules/`.

### [MODIFICADO] `README.md`, `documents/10-multijugador.md` (nuevo)
- Documento 10 con arquitectura, protocolo, arranque, límites y
  verificación; árbol de directorios del README con `api/` y `server/` y
  fila 10 en el índice.

## Impacto

- Verificado en tres niveles, todo en verde: **protocolo** 13/13 (clientes
  ws puros: tokens rechazados, difusión sin rebote al autor, instantánea a
  clientes tardíos, validaciones, hora), **E2E** 9/9 con dos navegadores
  incógnito sobre el juego real (verse con alias, edición compartida, chat,
  hora idéntica, mismos ids de mobs, captura visual del avatar) y
  **persistencia** (autoguardado y recarga con la misma semilla y chunks).
  Suites previas intactas: smoke 318 y mobs 186. Un defecto encontrado y
  corregido en la revisión E2E: las entidades-sombra no implementaban
  `dying()` y el renderer lo consulta.
- Límites deliberados de v1 (documentados en el doc 10): inventario del
  mundo global no persistido, cofres y drops de suelo no sincronizados,
  explosiones de cliente sin daño a mobs remotos, sin PvP.
- El servidor se arranca aparte (`cd server && npm install && npm start`)
  junto a XAMPP; sin él, el juego local y las cuentas siguen funcionando
  igual.

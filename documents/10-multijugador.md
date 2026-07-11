# Multijugador: mundo global compartido

## Descripción

Modo multijugador de mundo único global: todos los jugadores con cuenta
entran al mismo mundo persistente, se ven entre sí (avatar humanoide con el
alias sobre la cabeza), comparten las ediciones de bloques, chatean (tecla
T) y viven bajo la misma hora del día, el mismo clima y los mismos mobs,
dictados por el servidor.

La pieza clave del diseño: el servidor **ejecuta la lógica real del juego**.
`server/multijugador.mjs` importa los mismos módulos ES que corren en el
navegador (`worldgen.js`, `world.js`, `mobs.js`, `clima.js`) — viabilidad que
las suites de `test/` ya demostraban al ejercitarlos en Node. No hay dos
implementaciones que mantener sincronizadas.

## Cómo se arranca

```bash
# 1. XAMPP: Apache (o el servidor PHP embebido) y MySQL — cuentas y token
# 2. El servidor del mundo global:
cd server
npm install        # solo la primera vez (dependencia: ws)
npm start          # ws://localhost:7777
```

Variables opcionales: `VC_PUERTO` (7777), `VC_SEMILLA` (solo cuenta al
crear el mundo por primera vez) y `VC_DATOS` (carpeta de datos; por defecto
`<raíz>/saves/voxelcraft`, tres niveles sobre `server/` — el esquema de
XAMPP). El mundo vive en `<datos>/mundo-global.json.gz` (chunks editados en
RLE, hora, día y clima), se guarda cada minuto si hay cambios y al pulsar
Ctrl+C.

En un hosting Linux (p. ej. el sitio en `/www/wwwroot/<sitio>`) la ruta por
defecto cae fuera de lo escribible (`/www/saves/...`): fija `VC_DATOS` a una
carpeta escribible **fuera del docroot** y configura la **misma** variable
para PHP (en el pool de PHP-FPM: `env[VC_DATOS] = /ruta`), porque la API y
el servidor comparten `secreto.clave` para los tokens. Si el panel usa
`open_basedir`, la carpeta debe estar entre sus rutas permitidas.

### Sitio servido por HTTPS (wss)

En HTTPS el navegador prohíbe abrir `ws://` (contenido mixto: «la operación
es insegura»), así que el cliente conecta por `wss://` a la URL fijada en
`main.js` (hoy `wss://voxelcraftanode.cöm.co`, el dominio propio de la app
Node en el hosting: su proxy termina el TLS y reenvía al 7777 local). En
HTTP (el XAMPP local) el cliente sigue conectando directo a
`ws://<host>:7777`, sin proxy.

Requisitos del proxy del dominio Node (aaPanel los trae en su plantilla;
verificar si falla): reenviar el upgrade de WebSocket
(`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection
"upgrade";`) y un `proxy_read_timeout` largo (la partida mantiene la
conexión abierta). El servidor Node acepta el upgrade en cualquier ruta.

**Crítico:** la app Node y la API PHP deben compartir la MISMA carpeta de
datos (`VC_DATOS`) en la máquina, porque el token que firma PHP se verifica
con el `secreto.clave` de esa carpeta; con carpetas distintas cada uno
genera su propio secreto y el servidor rechaza a todos los jugadores.

En el juego: **inicia sesión** y pulsa «Mundo global (multijugador)» en el
menú. El botón queda deshabilitado sin sesión.

## Identidad (token firmado)

El WebSocket no comparte la sesión PHP; el puente es `api/token.php`: con la
sesión iniciada devuelve `id.alias.exp.firma` (HMAC-SHA256, caducidad 5
minutos) firmado con el secreto de `<xampp>/saves/voxelcraft/secreto.clave`.
El servidor Node verifica la firma leyendo el mismo archivo — sin tocar
MySQL ni compartir estado con PHP. El apretón de manos es el primer mensaje
(`hola {token}`); sin token válido la conexión se corta.

## Protocolo (JSON sobre WebSocket)

| Mensaje | Sentido | Contenido |
|---|---|---|
| `hola` | C→S | token de `api/token.php` |
| `bienvenida` | S→C | cid, semilla, hora/día, clima, posición inicial, jugadores, chunks editados (RLE base64), mobs |
| `pos` | C→S (10 Hz) | posición, yaw, pitch |
| `bloque` | C→S | edición local (x, y, z, id) |
| `bloques` | S→C (10 Hz) | ediciones ajenas acumuladas `[[x,y,z,id]…]` |
| `chat` / `golpe` | C→S | texto (≤200) / ataque a un mob (id, dmg, dir) |
| `estado` | S→C (10 Hz) | hora, jugadores `[cid,x,y,z,yaw,pitch]`, mobs `[id,x,y,z,yaw,headYaw,animSpeed,herido,fuse]`, flechas |
| `entra`/`sale` | S→C | altas y bajas de jugadores |
| `mob+`/`mob-`/`mobevt` | S→C | altas, bajas y eventos audiovisuales (say/hurt/death/fuse/shoot) |
| `dano`/`botin`/`explosion`/`clima` | S→C | daño al jugador, botín de un mob, estampido, cambio de clima |

Validación en el servidor: coordenadas y id de bloque contra `DEFS`,
alcance de edición ≤64 bloques del jugador, daño de golpe acotado 1–8 a ≤8
bloques, y presupuestos por segundo para bloques y chat (anti-abuso).

## Arquitectura

- **Servidor** ([server/multijugador.mjs](../server/multijugador.mjs)):
  mundo autoritativo con `World` + `Generator` reales (genera bajo demanda
  un anillo de 2 chunks alrededor de cada jugador, con presupuesto por
  tick). Tick de simulación a 20 Hz; difusión de estado a 10 Hz. Un
  `MobSystem` real **por jugador conectado** (su «dominio»): cada uno
  aparece y persigue alrededor de su jugador con la IA de verdad, sobre el
  mundo compartido; el botín va al autor del último golpe. La densidad de
  mobs escala con los jugadores (como el tope por región del MC real).
- **Cliente** ([js/red.js](../js/red.js)): entidades-sombra interpoladas
  (~12 Hz de convergencia) para jugadores y mobs remotos, con la forma
  mínima que `mobrender` espera (`def/pos/yaw/animPhase/animSpeed/hurtT/
  fuseT/dying()`). `MobsRemotos` replica la parte de la API de `MobSystem`
  que usa el bucle (`update/raycastMob/hurt/count/mobs/arrows`), así main.js
  no distingue entre mobs locales y remotos. El avatar
  ([js/avatar.js](../js/avatar.js)) reutiliza la geometría humanoide del
  zombi con piel propia, por el mismo `buildType` que la cámara y la lata.
- **Bloques**: gancho opcional `world.onSet` (nuevo en
  [js/world.js](../js/world.js)); las ediciones locales viajan al servidor
  y las remotas llegan aplicadas con un guardián anti-eco. Las ediciones
  sobre chunks aún no generados por el cliente quedan **pendientes** y se
  vuelcan cuando el worker entrega el chunk. Al entrar, los chunks ya
  editados del mundo llegan completos en RLE (mismo formato del guardado).
- **Hora y clima**: el servidor los avanza; el cliente fija `timeOfDay` con
  el valor recibido y congela las transiciones locales del clima (las
  cambia solo `clima.forzar` al recibir el mensaje).
- **Etiquetas**: divs proyectados por fotograma con la matriz
  proyección·vista (fuera del pipeline WebGL), ocultos tras la cámara o a
  más de 48 bloques.

## Límites conocidos (v1, deliberados)

- El inventario en el mundo global es de la sesión (no se persiste en el
  servidor); los cofres (`blockData`) no se sincronizan entre jugadores.
- Los drops en el suelo son locales; el botín de un mob viaja solo al
  jugador que lo mató.
- Las explosiones iniciadas por un cliente (latas) rompen terreno
  sincronizado pero no dañan a los mobs del servidor.
- Escape con el chat abierto pierde la captura del puntero sin abrir el
  menú (clic para recuperarla); Enter es el cierre natural.
- No hay PvP: los jugadores no pueden dañarse entre sí.

## Verificación

- Protocolo (13 comprobaciones, clientes `ws` puros en Node): tokens
  inválido/caducado rechazados, bienvenida, edición difundida sin rebote al
  autor, posición en el estado, chat, hora que avanza, ediciones inválidas
  ignoradas, instantánea a un cliente tardío y aviso de salida.
- E2E con el juego real (2 navegadores incógnito = 2 máquinas): registro →
  mundo global → verse mutuamente → edición compartida → chat con T → hora
  idéntica → los mismos ids de mobs en ambos → etiqueta del alias visible
  sobre el avatar (captura) → aviso de salida. 9/9 sin errores de consola.
- Persistencia: autoguardado por minuto y recarga tras reinicio (misma
  semilla y chunks editados).

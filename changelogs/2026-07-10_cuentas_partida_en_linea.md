# Cuentas de jugador y partida en línea (PHP + MySQL)

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Cuentas / Guardado

## Descripción

Registro simple de usuario a petición del usuario: al entrar, el juego pide
**alias, email y contraseña** («Identifícate»); con la cuenta creada el
sistema reconoce al jugador en cualquier navegador (sesión PHP por cookie) y
sus partidas se guardan **en línea** en MySQL además de en el IndexedDB
local. Primera pieza de servidor del proyecto: hasta ahora todo era estático.

El guardado en línea reutiliza la instantánea local tal cual: al guardar con
sesión, la misma foto (meta + blockData + chunks RLE) sube comprimida con
gzip al servidor; al cargar, si la copia en línea es más reciente que la
local — o no hay local, como en otro ordenador — se vuelca a IndexedDB y la
carga sigue el camino de siempre. Sin API alcanzable (MySQL apagado,
servidor estático) el juego funciona como antes, solo con guardado local.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [AGREGADO] `api/config.php`
- Base común: PDO hacia el MySQL de XAMPP (root sin clave), **creación
  automática** de la base `voxelcraft` y de las tablas `usuarios` (alias y
  email únicos, `password_hash`) y `partidas` (un slot por usuario,
  `MEDIUMBLOB`, FK con `ON DELETE CASCADE`) en la primera petición: cero
  pasos manuales. Sesión `VOXELSESION` con cookie `HttpOnly` +
  `SameSite=Lax`; helpers `responder/fallar/cuerpo_json/exigir_sesion` y
  `abrir_sesion` con `session_regenerate_id` (antifijación).

### [AGREGADO] `api/registro.php`, `api/login.php`, `api/logout.php`, `api/sesion.php`
- Registro con validación (alias 3-16 `[A-Za-z0-9_]`, email, clave ≥ 6) y
  mensajes concretos para duplicados (409); login por **alias o email** con
  mensaje único ante credenciales malas (no revela cuál falló); logout que
  destruye cookie y sesión; `sesion.php` devuelve quién está conectado y el
  sello de su partida en línea (para habilitar «Cargar partida»).

### [AGREGADO] `api/partida.php`
- Slot único por usuario. POST guarda el cuerpo crudo **sin descomprimir**
  (el navegador ya lo manda en gzip; `X-Comprimido: no` admite JSON plano
  de navegadores sin `CompressionStream`) con límite de 16 MB; GET lo
  devuelve byte a byte con `X-Comprimido` y `X-Guardado-En`. Guardar los
  bytes tal cual esquiva el `max_allowed_packet` de MariaDB y ahorra CPU.

### [AGREGADO] `js/cuenta.js`
- Cliente de la API: `sesionActual`, `registrar`, `entrar`, `salir`,
  `subirPartida`, `bajarPartida`. Errores como `Error` con mensaje en
  español apto para el menú; gzip/gunzip con
  `CompressionStream`/`DecompressionStream` y detección de soporte.

### [MODIFICADO] `js/storage.js`
- Nuevas `exportSave()`/`importSave()`: instantánea completa del guardado
  (meta + blockData + chunks) ⇄ objeto JSON con el RLE `Uint16Array` en
  **base64** (helpers con `fromCharCode` troceado). Importar reemplaza el
  guardado local — así la carga desde la nube reusa el camino local de
  siempre (`loadMeta` + `loadChunksInto`) sin tocar el formato en disco.

### [MODIFICADO] `index.html`, `css/style.css`
- Sección `#menu-cuenta` («Identifícate») con los tres campos y botones
  **Entrar** (email o alias + contraseña), **Crear cuenta** (los tres) y
  **Jugar sin cuenta**; línea `#cuenta-estado` en el menú principal y botón
  `#btn-cuenta` (inicia sesión / cierra sesión). Estilos: inputs de
  contraseña como los de texto, estado en verde/gris y errores en rojo.

### [MODIFICADO] `js/main.js`
- Estado `usuario`/`nubeGuardadoEn` y cableado del formulario. Al arrancar
  consulta `sesion.php`: con sesión va directo al menú («Sesión: alias»);
  sin ella muestra el formulario; sin API, el catch deja el modo
  solo-local. **Guardar**: tras `saveWorld` local, con sesión sube
  `exportSave()` y el botón informa «Guardado ✓ (N chunks editados · en
  línea ✓/✗)». **Cargar**: con sesión y copia en línea más reciente (o sin
  local) baja e importa antes del `loadMeta` habitual; `btn-load` se
  habilita también solo con partida en la nube.

## Impacto

- El jugador se registra una vez y su partida le sigue entre navegadores y
  máquinas; el juego sigue siendo 100 % jugable sin cuenta y sin servidor.
- Verificado de extremo a extremo: batería `curl` (registro, duplicados,
  validaciones, login por alias y email, logout, subida/bajada gzip con
  `diff` byte a byte, slot único que se sobreescribe, 401 sin sesión) y E2E
  en el juego real con Edge headless: registro desde el formulario → mundo
  → bloque editado → «en línea ✓» → **contexto incógnito limpio** (sin
  IndexedDB ni cookies, simula otro PC) → login → cargar → el bloque
  reaparece. 8/8 comprobaciones, sin errores de consola.
- Requiere Apache y MySQL de XAMPP encendidos para las funciones en línea
  (la base se crea sola en el primer uso).

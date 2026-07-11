# Menú de identificación sin ambigüedad y recuperación de contraseña

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Cuentas / Menú

## Descripción

El panel «Identifícate» mezclaba en una sola vista los campos de entrar y de
registrarse, con etiquetas condicionales («Alias (solo para crear cuenta)»,
«Email (o alias, para entrar)») que obligaban a adivinar qué rellenar. Se
reestructura como **puerta de identificación** con tres vistas excluyentes:

- **Iniciar sesión** (por defecto): solo correo y contraseña, más los
  accesos «¿Olvidaste tu contraseña?», «Registrarse» y «Jugar sin cuenta».
- **Crear cuenta**: alias, correo, contraseña y **confirmación de la
  contraseña** (la confirmación se comprueba en el cliente; el servidor
  revalida el resto como siempre).
- **Recuperar contraseña**: flujo nuevo en dos pasos — se pide un código de
  un solo uso al correo y con él se establece la contraseña nueva.

Además, la puerta pasa a ser **obligatoria**: el juego arranca en ella y el
menú principal (crear mundos, cargar, mundo global) solo se alcanza con
sesión abierta o eligiendo «Jugar sin cuenta», que se conserva tal cual
(guardado solo local). Cerrar sesión sin un mundo en marcha devuelve a la
puerta; sin API alcanzable la puerta avisa («Sin conexión con el servidor:
puedes jugar sin cuenta») y la opción de invitado sigue siendo la salida.

## Tipo de Cambio

- `Cambiado` (menú de identificación y arranque)
- `Agregado` (recuperación de contraseña)

## Archivos Afectados

### [MODIFICADO] `index.html`
- `#menu-cuenta` reestructurado en `#cuenta-entrar`, `#cuenta-registro` y
  `#cuenta-recuperar`, cada uno con campos propios y `autocomplete`
  correcto (`current-password`, `new-password`, `one-time-code`). Aviso
  verde `#cuenta-aviso` junto al error `#cuenta-error`.

### [MODIFICADO] `css/style.css`
- `input[type=email]` se suma al estilo de los inputs; `.cuenta-aviso`
  (verde) y `.btn-enlace` (botón con aspecto de enlace para «¿Olvidaste tu
  contraseña?»).

### [MODIFICADO] `js/main.js`
- `showCuenta(vista)` alterna las tres vistas; `avisoCuenta()` complementa a
  `errorCuenta()`. El registro exige que las contraseñas coincidan antes de
  llamar a la API. Flujo de recuperación con feedback «Enviando…» en el
  botón (el envío del correo puede tardar unos segundos). El arranque
  muestra la puerta mientras se comprueba la sesión y solo salta al menú
  principal si hay usuario; el fallo de red deja la puerta con el aviso de
  sin conexión. Cerrar sesión sin mundo cargado vuelve a la puerta.

### [MODIFICADO] `js/cuenta.js`
- `solicitarCodigo(email)` y `restablecerClave(email, codigo, clave)` contra
  `api/recuperacion.php`.

### [MODIFICADO] `api/config.php`
- Tabla nueva `recuperaciones` (un código activo por usuario: `hash_codigo`,
  `caduca_en`, `intentos`, FK `ON DELETE CASCADE`). Helper `carpeta_datos()`
  extraído: el guard de `mkdir` sobre `PARTIDAS_DIR` ya se repetía en
  `ruta_partida()` y `secreto_compartido()` y lo necesitaba un tercer uso
  (regla de tres).

### [AGREGADO] `api/recuperacion.php`
- POST `{accion:'solicitar', email}`: genera un código de 8 caracteres (sin
  0/O/1/I/L), guarda **solo su hash** con caducidad de 15 min y lo envía por
  `mail()`; sin correo operativo (XAMPP local) el código queda en
  `recuperaciones.log` junto a las partidas, **fuera del docroot**, para que
  el administrador lo facilite. La respuesta es idéntica exista o no la
  cuenta, y con un código vigente de menos de 60 s no se genera otro
  (acota el ritmo sin delatar cuentas).
- POST `{accion:'restablecer', email, codigo, clave}`: máximo 5 intentos por
  código, mensaje de rechazo único (no distingue inexistente / caducado /
  agotado / incorrecto), código insensible a mayúsculas y de un solo uso.
  No abre sesión: el jugador entra después por `login.php` (los únicos
  endpoints que crean sesión siguen siendo login y registro).

## Decisiones y deuda declarada

- **Login solo con correo en la interfaz**: `login.php` sigue aceptando
  alias o email (compatibilidad), pero el formulario solo pide el correo,
  como estipuló el usuario.
- **Oráculo de tiempo**: la solicitud con cuenta real tarda ~2,5 s (intento
  SMTP de `mail()`) frente a ~0,04 s sin cuenta, así que un observador
  podría inferir si un correo tiene cuenta midiendo la latencia. Se acepta
  para este despliegue local; la salida sería encolar el envío.
- **Códigos en claro en `recuperaciones.log`**: necesario porque el XAMPP
  local no tiene correo; el archivo vive fuera del docroot (mismo régimen
  que `secreto.clave` y las partidas) y los códigos caducan en 15 min.

## Impacto

- El arranque cambia: la primera pantalla es la puerta de identificación,
  no el menú principal (con sesión ya abierta se salta sola al menú).
- Ninguna migración: la tabla `recuperaciones` se crea sola en la primera
  petición, como el resto del esquema.

## Verificación

- `php -l` sobre `config.php` y `recuperacion.php`; `node --check` sobre
  `main.js` y `cuenta.js` (copias `.mjs`).
- Batería `curl` contra `php -S` + MySQL real: registro → logout → login;
  solicitud de código (respuesta genérica idéntica con cuenta inexistente y
  sin código generado para ella); rechazo de código incorrecto, clave corta,
  código reutilizado, quemado por 5 intentos y caducado; restablecimiento en
  minúsculas y login con la clave nueva (la antigua rechazada).
- E2E con puppeteer + Edge headless (24 comprobaciones): puerta obligatoria
  al arrancar, vistas correctas, confirmación de contraseña, registro,
  cierre de sesión que devuelve a la puerta, recuperación completa desde la
  interfaz, invitado con mundo global deshabilitado; más 5 comprobaciones
  del arranque sin API (aviso y «Jugar sin cuenta» operativos).

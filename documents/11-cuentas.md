# Cuentas e identificación

Sistema de cuentas de jugador: registro, inicio de sesión, recuperación de
contraseña, partida en línea y la **puerta de identificación** del menú.
La parte de servidor es la API PHP de [api/](../api/) (MySQL de XAMPP, con
creación automática del esquema en la primera petición); el cliente es
[js/cuenta.js](../js/cuenta.js) y el flujo del menú vive en
[js/main.js](../js/main.js).

## La puerta de identificación

El juego arranca en la puerta (`#menu-cuenta` de `index.html`): el menú
principal — crear mundos, cargar partida, mundo global — solo se alcanza de
una de estas dos formas:

- **Sesión abierta** (al iniciar sesión, registrarse, o porque la cookie de
  sesión ya reconoce al jugador al arrancar).
- **«Jugar sin cuenta»** (invitado): se salta la puerta; la partida solo se
  guarda en el IndexedDB del navegador y el mundo global queda
  deshabilitado.

Cerrar sesión sin un mundo en marcha devuelve a la puerta. Sin API
alcanzable (servidor estático, MySQL apagado) la puerta avisa de la falta de
conexión y el modo invitado sigue operativo: el juego nunca se bloquea por
falta de servidor.

La puerta tiene **tres vistas excluyentes** (`showCuenta(vista)` en
`main.js`):

| Vista | Campos | Notas |
|---|---|---|
| Iniciar sesión (defecto) | correo, contraseña | accesos a las otras dos vistas y a «Jugar sin cuenta» |
| Crear cuenta | alias, correo, contraseña, confirmación | la confirmación se comprueba en el cliente; el resto lo revalida el servidor |
| Recuperar contraseña | correo → código, contraseña nueva, confirmación | código de un solo uso pedido al correo |

## API (`api/*.php`)

Todas las respuestas son JSON (`{error}` con código HTTP en los fallos); la
sesión es una cookie PHP `VOXELSESION` (`HttpOnly`, `SameSite=Lax`).

| Endpoint | Método | Qué hace |
|---|---|---|
| `registro.php` | POST `{alias, email, clave}` | crea la cuenta (alias 3-16 `[A-Za-z0-9_]`, email único, clave ≥ 6) y abre sesión |
| `login.php` | POST `{usuario, clave}` | abre sesión; `usuario` admite alias o email (la interfaz solo pide el correo) |
| `logout.php` | POST | cierra la sesión |
| `sesion.php` | GET | `{usuario, partida}` de la sesión activa (`usuario: null` si no hay) |
| `recuperacion.php` | POST `{accion:'solicitar', email}` | genera un código de un solo uso y lo envía al correo (ver abajo) |
| `recuperacion.php` | POST `{accion:'restablecer', email, codigo, clave}` | verifica el código y cambia la contraseña; no abre sesión |
| `token.php` | GET | token firmado para el servidor multijugador (ver [10-multijugador.md](10-multijugador.md)) |
| `partida.php` | GET / POST | partida en línea del usuario (gzip tal cual; archivo fuera del docroot) |

## Recuperación de contraseña

Flujo en dos pasos sobre la tabla `recuperaciones` (un código activo por
usuario):

1. **Solicitar**: si el correo tiene cuenta se genera un código de 8
   caracteres (alfabeto sin 0/O/1/I/L), se guarda **solo su hash**
   (`password_hash`) con caducidad de 15 minutos y se envía con `mail()`.
   La respuesta es siempre la misma, exista o no la cuenta, y con un código
   vigente de menos de 60 segundos no se genera otro.
2. **Restablecer**: el código admite mayúsculas o minúsculas, tolera como
   máximo **5 intentos fallidos** y es de un solo uso; el rechazo usa un
   mensaje único que no distingue el motivo. Con el código bueno se cambia
   `hash_clave` y el jugador entra después por `login.php`.

**Entrega local sin correo:** el XAMPP local no suele tener SMTP; cuando
`mail()` falla, el código queda en `recuperaciones.log` dentro de la carpeta
de datos fuera del docroot (`c:\xampp\saves\voxelcraft\` por defecto, o la
que fije la variable de entorno `VC_DATOS`; la misma de las partidas y
`secreto.clave`) para que el administrador pueda facilitarlo.
Limitación conocida: la latencia de la solicitud delata si la cuenta existe
(el intento SMTP tarda ~2,5 s); se aceptó para el despliegue local.

## Esquema de datos

| Tabla | Campos | Notas |
|---|---|---|
| `usuarios` | `id`, `alias` (único), `email` (único), `hash_clave`, `creado_en` | `password_hash()` / `password_verify()` |
| `partidas` | `usuario_id` (PK/FK), `comprimido`, `bytes`, `guardado_en`, `actualizado_en` | solo metadatos; el binario va en `<id>.sav.gz` fuera del docroot |
| `recuperaciones` | `usuario_id` (PK/FK), `hash_codigo`, `caduca_en`, `intentos` | un código activo por usuario; `ON DELETE CASCADE` |

## Partida en línea

Con sesión, «Guardar partida» sube la misma instantánea del guardado local
(gzip con `CompressionStream`) a `partida.php`, y «Cargar partida» prefiere
la copia en línea cuando es más reciente que la local o no hay copia local
(otro ordenador): se vuelca a IndexedDB y la carga sigue el camino local de
siempre. Un slot por usuario. Detalles de la decisión archivo-vs-BLOB en el
changelog [140](../changelogs/2026-07-10_partidas_en_archivos.md).

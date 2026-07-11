# Despliegue en hosting HTTPS: wss por proxy y JSON limpio bajo open_basedir

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador / API de cuentas

## Descripción

Dos obstáculos aparecidos al desplegar en un hosting real (nginx + HTTPS +
`open_basedir`), continuación del cambio 146:

1. Con el sitio servido por **HTTPS**, el navegador prohíbe abrir `ws://`
   (contenido mixto: «la operación es insegura»), así que «Mundo global» no
   conectaba. El cliente ahora elige el esquema según la página: en HTTPS
   usa `wss://<dominio>/ws` (que el proxy inverso del hosting reenvía al
   puerto local 7777); en HTTP (XAMPP) sigue conectando directo a
   `ws://<host>:7777`.
2. Bajo **`open_basedir`** con `display_errors` activo, los warnings de
   `is_dir()`/`mkdir()` se colaban como HTML delante del JSON de la API y
   revelaban rutas absolutas del servidor.

## Tipo de Cambio

- `Corregido` (conexión al mundo global en HTTPS)
- `Seguridad` (rutas del servidor filtradas en las respuestas)

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- El botón «Mundo global» construye la URL según `location.protocol`:
  `wss://<host>/ws` en HTTPS, `ws://<hostname>:7777` en HTTP.

### [MODIFICADO] `api/config.php`
- `carpeta_datos()` silencia con `@` los avisos de `is_dir()`/`mkdir()`;
  el fallo ya tiene su respuesta JSON propia
  (`{"error":"No se pudo crear la carpeta de partidas."}`, HTTP 500).

### [MODIFICADO] `documents/10-multijugador.md`
- Sección nueva «Sitio servido por HTTPS (wss)» con el bloque nginx del
  proxy (`location /ws` con las cabeceras de upgrade) y nota sobre
  `open_basedir` para la carpeta de datos.

## Impacto

- En XAMPP local nada cambia (HTTP → conexión directa de siempre).
- En hosting HTTPS hace falta el bloque de proxy nginx documentado; el
  servidor Node no cambia (acepta el upgrade en cualquier ruta).

## Verificación

- `node --check` y `php -l` limpios.
- Regresión E2E en HTTP (puppeteer + Edge, servidores reales): el cliente
  entra al mundo global y el WebSocket capturado por CDP va a
  `ws://127.0.0.1:7777/`.
- `open_basedir` reproducido en local (`php -S -d open_basedir=…` con
  `display_errors=1`): `token.php` responde solo el JSON de error, sin
  warnings HTML.
- La rama `wss` está verificada por inspección y con la regresión anterior;
  la prueba definitiva requiere el hosting real con el proxy configurado.

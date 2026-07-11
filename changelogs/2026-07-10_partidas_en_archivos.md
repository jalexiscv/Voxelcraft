# Partidas en línea: del BLOB en MySQL a archivos referenciados

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Cuentas / Guardado

## Descripción

A propuesta del usuario: con miles de usuarios, guardar el binario de cada
partida en un `MEDIUMBLOB` encarece los backups (`mysqldump` arrastra los
blobs), la replicación y cada subida (protocolo de MySQL,
`max_allowed_packet`). El guardado pasa al patrón estándar **metadatos en
la BD, binario en el filesystem**: un archivo `<usuario_id>.sav.gz` por
usuario en `c:\xampp\saves\voxelcraft\` — deliberadamente **fuera del
docroot**, para que Apache jamás pueda servirlo directo: solo se descarga a
través de `partida.php` con la sesión validada.

El cliente no cambia en absoluto: la API conserva el mismo contrato
(POST/GET con `X-Comprimido` y `X-Guardado-En`), así que `cuenta.js`,
`storage.js` y `main.js` quedan intactos.

## Tipo de Cambio

- `Mejorado`

## Archivos Afectados

### [MODIFICADO] `api/config.php`
- `PARTIDAS_DIR` derivado de la posición del proyecto (`<raíz XAMPP>/saves/
  voxelcraft`) y helper `ruta_partida(id)` que crea la carpeta al vuelo.
- Tabla `partidas` sin la columna `datos`: solo `comprimido`, `bytes`,
  `guardado_en` y `actualizado_en`.
- **Migración automática con datos**: si la tabla vieja aún tiene `datos`,
  cada blob se vuelca a su archivo antes de retirar la columna y añadir
  `bytes` — verificada con una partida real guardada con el esquema v1.

### [MODIFICADO] `api/partida.php`
- POST: **escritura atómica** (temporal + `rename`, con reintento en
  Windows que puede negarse a pisar el destino) y después el upsert de
  metadatos — si la BD fallara quedaría un archivo más nuevo que su sello,
  nunca un sello apuntando a datos inexistentes.
- GET: sirve el archivo con `readfile()` (+ `Content-Length`); si la fila
  existe pero el archivo no (borrado a mano), **resincroniza** retirando la
  fila y responde 404, que el cliente ya trata como «sin partida».

## Impacto

- La BD queda ligera (decenas de bytes por usuario) sin importar el tamaño
  de los guardados; los archivos se respaldan/inspeccionan con el
  filesystem. El borrado de un usuario cascada la fila; su archivo queda
  huérfano hasta que exista un flujo de baja de cuentas (no hay hoy).
- Verificado: batería curl (subida → archivo en disco + solo metadatos en
  la BD → bajada `diff` byte a byte → borrado manual del archivo → 404 +
  fila retirada → resubida limpia) y el E2E completo de navegador (8/8:
  registro → mundo → bloque → «en línea ✓» → contexto incógnito → login →
  cargar → bloque restaurado), sin errores de consola.
- Incidencia durante las pruebas, corregida sobre la marcha: un paso del
  arnés borró por error el archivo de la partida real del usuario 1
  (migrada del esquema v1); su fila huérfana se retiró para que el juego
  caiga a la copia local de IndexedDB, que la resube al volver a guardar.

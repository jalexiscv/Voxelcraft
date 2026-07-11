# Carpeta de datos configurable (VC_DATOS) para despliegues fuera de XAMPP

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador / API de cuentas

## Descripción

El servidor multijugador y la API PHP colocaban su carpeta de datos
(partidas, `secreto.clave`, `mundo-global.json.gz`, `recuperaciones.log`)
**tres niveles por encima** del proyecto: en XAMPP eso es `c:\xampp\saves\
voxelcraft`, pero en un hosting Linux con el sitio en
`/www/wwwroot/<sitio>` resulta `/www/saves/voxelcraft`, donde el proceso no
puede escribir. Al desplegar, el servidor moría al arrancar con:

```
Error: EACCES: permission denied, mkdir '/www/saves/voxelcraft'
    at file:///www/wwwroot/<sitio>/server/multijugador.mjs:57:1
```

La carpeta pasa a ser configurable con la variable de entorno **`VC_DATOS`**
en las dos puntas (deben apuntar a la **misma** ruta, porque comparten el
secreto de los tokens). Sin la variable, la ruta por defecto sigue siendo la
de XAMPP: los despliegues existentes no cambian.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `server/multijugador.mjs`
- `CARPETA` respeta `process.env.VC_DATOS`; comentario de cabecera con la
  variable nueva.
- Si la carpeta no puede crearse, el arranque termina con un mensaje que da
  la receta (crear la carpeta con permisos o usar `VC_DATOS`) en lugar del
  stack trace de `mkdirSync`.

### [MODIFICADO] `api/config.php`
- `PARTIDAS_DIR` respeta `getenv('VC_DATOS')`.

### [MODIFICADO] `documents/10-multijugador.md`, `documents/11-cuentas.md`
- Variable documentada, con la receta para hosting Linux (carpeta escribible
  fuera del docroot y `env[VC_DATOS]` en el pool de PHP-FPM).

## Impacto

- Ninguno en XAMPP (misma ruta por defecto). En hosting Linux, arrancar con
  `VC_DATOS=/ruta/escribible node multijugador.mjs` y fijar la misma
  variable para PHP-FPM.

## Verificación

- `node --check` y `php -l` limpios.
- Con `VC_DATOS` a una carpeta vacía: Node la crea, escribe `secreto.clave`
  y arranca en el 7777; la API PHP en el mismo entorno **reutiliza** ese
  `secreto.clave` (md5 idéntico tras firmar un token) y deja
  `recuperaciones.log` en la carpeta nueva.
- Sin `VC_DATOS`: `PARTIDAS_DIR` sigue siendo `C:\xampp\saves\voxelcraft`
  (impreso desde el `config.php` real).
- Con `VC_DATOS` apuntando a una ruta imposible (bajo un archivo): el
  servidor imprime la receta y sale con código 1, sin stack trace.

# Puerto del servidor multijugador: del 8081 al 7777

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador

## Descripción

El mundo global pasa a escuchar en el puerto **7777** (antes 8081), a
petición del usuario. El puerto por defecto vive en el servidor
(`VC_PUERTO`, que sigue permitiendo cambiarlo por entorno) y está escrito
en duro en el cliente, así que el cambio toca las dos puntas a la vez para
que sigan de acuerdo.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `server/multijugador.mjs`
- `VC_PUERTO` por defecto `7777` (constante `PUERTO`) y el comentario de
  cabecera que lo documenta.

### [MODIFICADO] `js/main.js`
- El botón «Mundo global (multijugador)» conecta a
  `ws://${location.hostname}:7777`.

### [MODIFICADO] `documents/10-multijugador.md`
- Instrucciones de arranque y variables de entorno con el puerto nuevo.

## Impacto

- Quien tenga el servidor arrancado con el binario anterior en el 8081 debe
  reiniciarlo (o exportar `VC_PUERTO=8081` y revertir el cliente); no hay
  negociación de puerto en el protocolo.

## Verificación

- `node --check` sobre `main.js` y `multijugador.mjs`; búsqueda de `8081`
  en `js/`, `server/`, `api/`, `documents/`, `changelogs/`, `css/` y
  `test/` sin resultados.
- E2E real con puppeteer + Edge: registro, clic en «Mundo global», el
  cliente llega a `state: 'playing'` y el único WebSocket abierto va a
  `ws://127.0.0.1:7777/` (capturado por CDP); el log del servidor registra
  la entrada del jugador. Durante la prueba se descubrió que `config.php`
  usa ahora credenciales MySQL propias (usuario `voxelcraft`): hubo que
  crear ese usuario en el MariaDB local con permisos sobre la base
  `voxelcraft` (cambio de entorno, no de código).

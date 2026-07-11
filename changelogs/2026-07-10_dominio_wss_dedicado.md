# Mundo global en HTTPS: conexión al dominio dedicado de la app Node

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador

## Descripción

La app Node del hosting quedó publicada con dominio y certificado propios
(`voxelcraftnode.cöm.co`), en lugar del esquema «mismo dominio + `/ws`» que
introdujo el cambio 147. La rama HTTPS del cliente pasa de deducir la URL
(`wss://<host>/ws`) a usar esa URL fija; la rama HTTP (XAMPP local) no
cambia: `ws://<host>:7777` directo.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- En HTTPS, «Mundo global» conecta a `wss://voxelcraftnode.xn--cm-fka.co`
  (punycode de `voxelcraftnode.cöm.co`).

### [MODIFICADO] `documents/10-multijugador.md`
- La sección «Sitio servido por HTTPS (wss)» describe el dominio dedicado,
  los requisitos del proxy (cabeceras de upgrade, timeout largo) y la
  advertencia crítica: app Node y API PHP deben compartir `VC_DATOS`
  (mismo `secreto.clave`) o todos los tokens serán rechazados.

## Impacto

- El despliegue HTTPS ya no necesita el bloque `location /ws` en el nginx
  del sitio del juego; basta el proxy del dominio Node.
- Si el dominio de la app Node cambia, hay que actualizar la URL en
  `js/main.js` (no hay configuración en tiempo de ejecución; deuda
  deliberada mientras solo exista un despliegue).

## Verificación

- `node --check` limpio.
- Regresión E2E en HTTP (puppeteer + Edge con los servidores reales): el
  cliente entra al mundo global por `ws://127.0.0.1:7777/`, sin cambios.
- La rama `wss` al dominio dedicado solo puede probarse en el hosting real
  (aquí no hay TLS): verificada por inspección.

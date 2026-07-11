# Corrección del dominio wss: faltaba una letra (voxelcraftanode)

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Multijugador

## Descripción

El cambio 148 fijó en el cliente la URL del dominio dedicado de la app Node,
pero se escribió `voxelcraftnode.cöm.co` cuando el dominio real del hosting es
`voxelcraftanode.cöm.co` (con «a» entre «voxelcraft» y «node»). El dominio sin
la «a» ni siquiera resuelve en DNS, así que «Mundo global» en HTTPS fallaba al
abrir el WebSocket. Se corrige la URL (y sus menciones en la documentación) al
dominio real, verificado en vivo: responde `426 Upgrade Required` a un GET
normal, la respuesta esperada del servidor `ws` ante una petición que no es un
handshake de WebSocket.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/main.js`
- La rama HTTPS conecta a `wss://voxelcraftanode.xn--cm-fka.co` (punycode de
  `voxelcraftanode.cöm.co`); comentario actualizado.

### [MODIFICADO] `documents/10-multijugador.md`
- La sección «Sitio servido por HTTPS (wss)» cita el dominio correcto.

## Impacto

- «Mundo global» vuelve a ser conectable desde el despliegue HTTPS; la rama
  HTTP local (`ws://<host>:7777`) no cambia.
- El changelog 148 conserva el dominio erróneo como registro histórico de lo
  que se hizo entonces; este cambio documenta la corrección.

## Verificación

- `curl https://voxelcraftanode.xn--cm-fka.co/` → HTTP 426 (la app Node está
  ahí); el dominio sin la «a» no resuelve (confirmación del diagnóstico).
- `node --check` limpio sobre `main.js`.
- `grep voxelcraftnode` solo devuelve el changelog histórico 148.

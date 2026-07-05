# Dron guardián: los drones del mismo tipo no se auto-vigilan

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs

## Descripción

Al añadir la inspección de voladores, un dron consideraba a OTROS drones
como voladores a inspeccionar (los drones vuelan y no son agresivos, así
que entraban por la rama de «volador cualquiera»). El usuario aclaró que
los drones son aliados del mismo bando: no deben vigilarse entre sí, solo
inspeccionar a voladores ajenos (pájaros, abejas…).

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mobs.js`
- La selección de objetivos de `guardianAI` ignora a los mobs del **mismo
  tipo** que el guardián (`otro.def.id === m.def.id`), además de a sí
  mismo. Así dos drones nunca se inspeccionan mutuamente, pero sí siguen
  detectando y vigilando cualquier otro volador.

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`, `js/mobs/dron.js`
- 2 comprobaciones nuevas: dos drones juntos patrullan sin entrar nunca en
  inspección, y en cuanto aparece un pájaro ajeno sí lo inspeccionan (no
  es que se ignoren todo): 145 → **147**. Documento 02 y docblock al día.

## Impacto

- Varios drones guardián pueden escoltar al jugador a la vez sin quedar
  atrapados vigilándose entre ellos; su atención va a los voladores ajenos.
- Suites en verde: smoke 260, mobs 147, biomas 42, aldeas 62.

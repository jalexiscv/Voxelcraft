# Distribución de las definiciones de mobs en directorios por categoría oficial

**Fecha:** 2021-03-15
**Módulo:** VoxelCraft > Mobs

## Descripción

Las 68 definiciones de mobs vivían en un único directorio plano `js/mobs/`.
Se distribuyen en un directorio por **categoría oficial de Minecraft**, con los
nombres oficiales en inglés: `passive/` (32), `neutral/` (11) y `hostile/` (25).
Así la estructura de archivos refleja la misma clasificación que ya usaba el
registro, y la categoría de un mob se conoce por su ruta sin abrir el archivo.
Cada mob se clasifica por su comportamiento implementado (`hostile`,
`behavior.neutral`); no hay ningún cambio de comportamiento.

Los movimientos se hicieron con `git mv` (renombrados al 100 %), por lo que el
historial por archivo se conserva.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MODIFICADO] `js/mobs/passive/*.js`, `js/mobs/neutral/*.js`, `js/mobs/hostile/*.js`
- Las 68 definiciones movidas desde `js/mobs/` al directorio de su categoría:
  32 pasivos, 11 neutrales y 25 hostiles (sin cambios de contenido). En la raíz
  de `js/mobs/` quedan solo los módulos compartidos: `model.js`, `skin.js` y
  `registry.js`.

### [MODIFICADO] `js/mobs/registry.js`
- Las 68 importaciones apuntan a las rutas nuevas (`./passive/cerdo.js`, …).
- El docblock documenta la estructura de directorios y sus tamaños.

### [MODIFICADO] `test/mobs.mjs`
- La lista del contrato pasa de un arreglo plano a un mapa categoría → ids del
  que se derivan las rutas, de modo que la suite también verifica que cada mob
  está en el directorio de su categoría.

### [MODIFICADO] `test/validate-mob.mjs`
- El CLI se usa igual (`node test/validate-mob.mjs <id>`) pero localiza el id
  buscando en los tres directorios, con error claro si no existe en ninguno.

### [MODIFICADO] `documents/02-mobs.md`
- Árbol de arquitectura e instrucciones de «Añadir un mob» actualizados a la
  estructura `js/mobs/<categoría>/<id>.js`.

### [MODIFICADO] `changelogs/CHANGELOG.md`
- Entrada 79 del índice con enlace a este detalle.

## Impacto

- Sin impacto funcional: solo cambian rutas de archivos e importaciones.
  Verificado con `test/mobs.mjs` (115 OK), `test/smoke.mjs` (49 OK), el
  validador CLI sobre mobs de las tres categorías y una carga del registro en
  Node (68 tipos resueltos).
- Añadir un mob ahora exige elegir su directorio de categoría; las
  instrucciones actualizadas están en `documents/02-mobs.md`.

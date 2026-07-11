# Raíz limpia: ANALISIS.md pasa a documents/ y se indexa el huérfano de partículas

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Documentación

## Descripción

Cierre de la observación de la entrada 141: `Documentations.md` §2 estipula
que la raíz del módulo solo contenga `README.md`, `CLAUDE.md` y los
directorios, pero `ANALISIS.md` (la radiografía completa del proyecto,
2026-07-04) vivía en la raíz y además fuera del índice de documentación.

Al ejecutar la mudanza se descubrió un segundo incumplimiento del mismo
protocolo: `documents/08-particulas.md` existía sin estar enlazado desde la
tabla «Documentación» del README — exactamente el «archivo huérfano» que el
§2 define como error de documentación. Se indexó también.

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [MOVIDO] `ANALISIS.md` → `documents/09-analisis.md`
- Movimiento sin ediciones de contenido. El número 09 es el siguiente
  correlativo real (el 08 ya estaba tomado por el documento de partículas).
  Sus enlaces internos son solo anclas (`#sección`), así que ninguno se
  rompe con el cambio de carpeta; las menciones externas a `ANALISIS.md`
  están solo en changelogs históricos, que se conservan tal cual (describen
  la transición de su momento).

### [MODIFICADO] `README.md`
- Tabla «Documentación»: filas nuevas **08** (Partículas, el huérfano
  preexistente) y **09** (Análisis del proyecto).

## Impacto

- La raíz del repositorio cumple la estructura oficial del protocolo
  (`README.md` + `CLAUDE.md` + directorios) y `documents/` queda sin
  huérfanos: sus 9 documentos están enlazados desde el índice maestro.

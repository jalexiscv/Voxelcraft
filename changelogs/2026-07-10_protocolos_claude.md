# Protocolos estipulados en la configuración de la IA (CLAUDE.md)

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Configuración del repositorio

## Descripción

Revisión de los protocolos de `documents/Protocols/` contra lo declarado en
`.claude/`, a petición del usuario. Se encontraron dos huecos: no existía el
`CLAUDE.md` que `Documentations.md` §2 estipula como el archivo que «importa
los protocolos» para la IA (los protocolos solo regían si alguien invocaba
`/protocols` a mano), y el comando `/protocols` pedía listar la carpeta sin
estipular recursividad — con la subcarpeta nueva `Fable/` (6 protocolos:
Execution, Continuity, Debugging, Decisions, Review, Security), un listado
plano se saltaría 6 de los 10 protocolos vigentes.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `CLAUDE.md`
- Importa los protocolos como obligatorios en toda sesión: descubrimiento
  **recursivo** de `documents/Protocols/` (la carpeta es la fuente de
  verdad, sin lista fija), con tabla de referencia rápida de los 10
  protocolos actuales.
- Sección de **adaptación al repositorio**: el «módulo» es el repo entero;
  `Changelogs/` → `changelogs/`, `Documents/` → `documents/` (índice en la
  tabla «Documentación» del README); las convenciones PHP aplican solo a
  `api/` y el JS del juego sigue el estilo del código circundante; comandos
  de verificación del proyecto (`node --check`, `php -l`, `test/*.mjs`,
  puppeteer en el scratchpad).
- Deja constancia de las referencias pendientes (`Boundaries.md`,
  `Caching.md`, `Repositories.md`) citadas por los protocolos de `Fable/`
  pero aún inexistentes, con la instrucción de no crearlas por iniciativa
  propia.

### [MODIFICADO] `.claude/commands/protocols.md`
- El procedimiento estipula ahora el listado **recursivo** («incluidas sus
  subcarpetas, p. ej. `Fable/`») y advierte que pueden aparecer subcarpetas
  nuevas, para que ningún protocolo quede fuera del descubrimiento.

## Impacto

- Los 10 protocolos rigen en toda sesión de IA desde el arranque (Claude
  Code carga `CLAUDE.md` automáticamente), no solo bajo `/protocols`, y el
  comando ya no puede saltarse los de `Fable/`.
- Cumple la estructura oficial de `Documentations.md` §2 (raíz con
  `README.md` + `CLAUDE.md`). Observación pendiente de decisión del
  usuario: `ANALISIS.md` sigue en la raíz, que el protocolo pide mantener
  limpia; movería su contenido a `documents/` con entrada en el índice.

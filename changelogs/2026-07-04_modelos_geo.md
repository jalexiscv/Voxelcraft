# Modelos geo: parser de geometrías .geo.json y override local con auto-piel

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

Tras el análisis del formato de geometrías de la edición Bedrock (114
archivos `.geo.json` colocados por el usuario en `models/`, con copyright:
gitignored como `sounds/`), un workflow de 3 agentes construyó el cargador
local opcional: el motor los parsea en runtime y los usa como override del
modelo procedural propio — que sigue siendo el respaldo permanente y lo
único que distribuye el repo.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [AGREGADO] `js/geo.js` · [MODIFICADO] `js/mobs/model.js`
- Parser puro del formato 1.8 (y 1.12): claves `geometry.*` → nuestro
  contrato de partes (origin absoluto → relativo al pivote,
  `bind_pose_rotation` → `rot`, bones de varios cubes, `neverRender`
  fuera, herencia entre archivos) con mapeo de animaciones por nombre de
  hueso (cabeza, marcha diagonal de cuadrúpedos, brazos, alas).
- `buildPartMesh` soporta `mirror` (espejo UV al estilo Bedrock); sin el
  flag, byte a byte idéntico a antes.

### [AGREGADO] `js/modelpack.js` · [MODIFICADO] `js/mobrender.js`
- Cargador perezoso con caché (patrón de `soundpack`): tablas
  `ARCHIVO_MOB`/`CLAVE_MOB` de alias (bruja hereda del aldeano, caballo
  vía `horse_v3`, allay/bogged/parched desde vex/skeleton, gólem de
  hierro desde `models/mobs.json`…).
- Override en el render con **auto-piel procedural**: sin
  `textures/entity/<alias>.png`, cada parte del geo se pinta con los
  colores muestreados de la piel procedural PROPIA del mob (cero texels
  copiados); con PNG local, se usa tal cual. Cadena de respaldo:
  geo+PNG → geo+auto-piel → modelo procedural del repo.
- Cobertura medida contra `models/` real: **53/68 mobs** con geometría
  local; los 15 restantes (sin archivo razonable en el pack) siguen con
  su modelo propio por diseño.

### [MODIFICADO] `test/smoke.mjs` · [AGREGADO] `documents/07-modelos.md`
- Tanda «Modelos geo» (11 comprobaciones con geo sintético construido en
  el test, sin depender del pack real): suite 180 → **191**. Documento 07
  de referencia (alias, auto-piel, cadena de respaldo, nota legal) y
  fila 07 del README.

## Impacto

- Con el pack local, 53 criaturas adoptan su geometría clásica vestida
  con nuestra paleta original; sin pack, nada cambia. El repo sigue
  100 % procedural y sin material de terceros.
- Suites en verde: smoke 191, mobs 124, biomas 42, aldeas 62.

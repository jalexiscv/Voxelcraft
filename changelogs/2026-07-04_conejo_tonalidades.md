# Rediseño estructural del conejo y tonalidades por individuo

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Mobs

## Descripción

El conejo adopta la silueta agazapada clásica — cuerpo bajo y largo, ancas
traseras plegadas como placas con pies largos a ras de suelo, orejas altas y
colita — y estrena el mecanismo genérico de **tonalidades por individuo**:
un def puede declarar varias pieles (`variants`) y cada mob aparece con la
suya, con sesgo por bioma (`variantBiome`). Todo pintado procedural propio.

## Tipo de Cambio

- `Cambiado` / `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/mobs/conejo.js`
- Modelo nuevo de 11 partes: cuerpo 4×4×7, cabeza frontal con nariz rosada,
  orejas altas de 5 px separadas con hueco central, patas delanteras finas, **ancas plegadas** (placas
  verticales que rotan con el brinco), **pies largos** (2×1×4) a ras de
  suelo y colita clara; AABB 0,55 de alto.
- **6 tonalidades**: pardo, blanco (ojos rojizos), negro, blanco y negro a
  manchas, dorado y sal y pimienta (moteado fino). `variantBiome`: blanco en
  la nieve, dorado en desierto y playa; en el resto, al azar.

### [MODIFICADO] `js/mobrender.js`
- `buildType` pinta una textura por variante (semilla propia por variante) y
  el render liga la piel del individuo (`m.variant`).

### [MODIFICADO] `js/mobs.js`
- `Mob.variant` y asignación al aparecer: fija si el bioma la define,
  sorteada en el resto.

### [MODIFICADO] `test/validate-mob.mjs`
- Valida `variants` (entero 2..8) y `variantBiome` (índices en rango), y
  comprueba determinismo y cobertura de UV **por cada variante**.

### [MODIFICADO] `test/mobs.mjs`, `documents/01-voxelcraft.md`, `documents/02-mobs.md`
- Prueba de asignación de tonalidad al aparecer (suite 121 → 122) y contrato
  documentado (`variants`/`variantBiome`).

## Impacto

- Mecanismo reutilizable para dar variedad a cualquier mob (gatos, lobos,
  caballos…): basta declarar `variants` y pintar por variante.
- Suites en verde: mobs 122, smoke 75, biomas 42; `validate-mob conejo` OK
  con las seis pieles.

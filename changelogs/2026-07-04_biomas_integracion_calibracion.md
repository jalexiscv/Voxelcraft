# Integración y calibración del sistema de biomas

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Biomas

## Descripción

Tras el aterrizaje del sistema de 14 biomas (infraestructura + definiciones),
esta integración lo deja **funcionando de punta a punta y calibrado con
datos**: registro completo en orden de selección, generación por bioma en el
worldgen, aparición de mobs filtrada por bioma, y umbrales climáticos
ajustados a la distribución real de los ruidos (medida sobre varias
semillas), sin la cual la mitad de los biomas eran inalcanzables.

## Tipo de Cambio

- `Agregado` / `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/biomes/registry.js`
- Cableado de las 14 definiciones en el ORDEN de selección de la tabla del
  plan (antes solo registraba llanura).

### [MODIFICADO] `js/biomes/map.js`
- `MOUNTAIN_H` 48 → 42: con 48 no existía ninguna montaña (altura máxima
  observada del relieve ≈ 47).
- La playa exige **agua de verdad**: una candidata sin columnas sumergidas en
  su anillo (radio 3) se trata como tierra. Antes un tercio del mundo (llanos
  a nivel del mar) salía como playa.

### [MODIFICADO] `js/biomes/*.js` (10 definiciones)
- Ventanas climáticas recalibradas (el fbm concentra la masa cerca de 0):
  cálidos t>0.15 (antes 0.35), nevado t<−0.30 (antes −0.45), banda fría
  templada −0.30..−0.10, y rarezas |w|>0.45 (antes 0.75, valor que el ruido
  jamás alcanzaba: setas y pálido eran imposibles).
- `pantano` recupera al slime nocturno (adaptación prevista en el plan).

### [MODIFICADO] `js/mobs.js`
- Los pasivos diurnos sin `spawn.block` aparecen sobre el **suelo natural de
  su bioma** (hierba, arena, micelio, podzol…) en lugar de exigir siempre
  hierba — sin esto la mooshroom era inspawneable (hallazgo de la revisión
  adversaria).
- Un mob de cueva puede pisar la superficie si el bioma lo lista de noche
  (slime en el pantano).

### [MODIFICADO] `js/worldgen.js`
- Pasa `heightAt` al mapa de biomas para el anillo de la playa.

### [MODIFICADO] `test/validate-biome.mjs`, `js/biomes/model.js`
- Regla del contrato relajada: mobs de cueva admitidos SOLO en listas night.

### [MODIFICADO] `test/biomes.mjs`
- Prueba de solapes sustituida por **alcanzabilidad** de cada ventana (los
  solapes son legales: el orden resuelve) y nuevas pruebas de **cobertura del
  elenco**: los 68 mobs tienen bioma o cueva donde aparecer.

## Impacto

- Los 14 biomas aparecen en toda semilla probada (distribución: océano 39 %,
  playa 12 %, llanura 11 %, bosque 7 %, resto 0,2-6 %).
- Suites en verde: smoke 52, biomas 42, mobs 116 (en su fecha). Generación de
  chunks determinista verificada.

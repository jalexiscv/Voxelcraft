# Corrección de aparición: conejo y armadillo sobre el suelo de su bioma

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Mobs

## Descripción

Investigación por reporte del usuario («no aparece ni un solo conejo»):
la simulación de 10 minutos reales demostró que la aparición funciona en
biomas de hierba (el conejo sale a los ~5 s y es de las especies más
comunes), pero destapó un bug de cobertura: el `spawn.block` explícito
anula la regla del «suelo natural del bioma», así que el conejo
(`block: 'GRASS'`) **jamás podía aparecer en desierto, playa ni nieve** —
justo donde viven sus tonalidades dorada y blanca — y el armadillo
(`block: 'SAND'`) no podía aparecer en la sabana.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/mobs/conejo.js`, `js/mobs/armadillo.js`
- Se elimina el `block` explícito: la elegibilidad pasa a la regla del
  suelo natural del bioma (hierba en llanura/bosque/cerezos, arena en
  desierto/playa, hierba nevada en la tundra, hierba en la sabana).
- El resto de usos explícitos se auditó y es correcto: camello/camello
  husk/husk/parched anclados a la arena, tortuga a la playa y gólems con
  `ANY`.

## Impacto

- El conejo aparece ya en sus 8 biomas con la tonalidad correspondiente
  (verificado: elegible en desierto con la dorada y en la nieve con la
  blanca; armadillo elegible en sabana). Suites en verde: mobs 122,
  smoke 75, biomas 42.
- Nota de la investigación: dos experimentos previos daban falsos
  negativos (pasos de física de 2,1 s que hacían atravesar el suelo a
  los terrestres, y semillas distintas entre generador y sistema de
  mobs); el flujo real del juego no compartía esos defectos.

# Corrección de modelos geo: caballo y comerciante deformes (herencia de animación y brazos plegados)

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Render / Mobs

## Descripción

El usuario reportó caballos y comerciante errante deformes con el pack
local de modelos. El diagnóstico sobre `horse_v3.geo.json` y
`villager_v2.geo.json` reveló tres defectos combinados:

1. **La animación de la mirada no se heredaba**: solo el hueso llamado
   `head` seguía al jugador, así que el cráneo del caballo giraba
   alrededor de la base del cuello mientras hocico, orejas y crin se
   quedaban clavados (la cara se desmontaba cada vez que miraba); al
   comerciante le pasaba lo mismo con la nariz y la capucha.
2. **Los brazos del comerciante venían sin plegar**: el geo trae el hueso
   `arms` vertical (el giro de −0.75 rad lo ponía el código de runtime
   del juego original, que no viene en los archivos), con las manos
   cruzadas emparedadas dentro de la túnica y los brazos como muñones.
3. **Marcha en ambladura**: los nombres compactos `LegFL`/`LegBL`… del
   caballo no se reconocían como delantera/trasera y las patas del mismo
   lado iban en fase, en vez de en pares diagonales.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/geo.js`
- **Herencia de animación** al aplanar: un hueso sin animación propia
  adopta la del ancestro animado más cercano y, para girar rígido en
  bloque, comparte su pivote (si la parte no está rotada, el pivote se
  re-ancla sin mover la pose estática; una parte rotada con pivote
  distinto queda rígida y anotada en `avisos`).
- `animForBone`: `neck` sigue la mirada (el conjunto cuello+cabeza gira
  entero, como el caballo procedural) y los nombres compactos
  `LegFL`/`LegBR` ↔ `LegFR`/`LegBL` caen en la misma diagonal que los
  nombres largos.

### [MODIFICADO] `js/modelpack.js`
- `POSE_MOB.wandering_trader`: el hueso `arms` se cruza sobre el pecho
  (+43°, la rotación que el renderer original aplicaba por código, la
  misma de los brazos del modelo procedural propio).
- `aplicarPose`: las partes de un hueso multi-cubo (`arms_0`, `arms_1`…)
  resuelven la clave de su hueso.
- `OCULTOS_MOB.wandering_trader`: se descarta el ala de sombrero `brim`
  del geo del aldeano (su textura la deja transparente; la auto-piel la
  pintaría como un platillo opaco de 16×16 sobre la cabeza).

### [MODIFICADO] `test/smoke.mjs`, `documents/07-modelos.md`
- 5 comprobaciones nuevas (herencia de animación con pivote común,
  re-anclaje de pivote sin rotación, cuello y nombres compactos en
  `animForBone`, brazos cruzados en partes multi-cubo y filtro del
  `brim`): suite 247 → **252**. Documento 07 al día.

## Impacto

- El caballo (y el burro, mismo geo) mira al jugador con el conjunto
  cuello-cabeza-hocico-orejas-crin girando en bloque alrededor de un
  pivote común, y camina con marcha diagonal; el comerciante errante
  cruza los brazos sobre la túnica y su nariz y capucha acompañan a la
  cabeza. La herencia de animación beneficia a cualquier otro geo con
  jerarquía (la nariz del aldeano y la bruja, las puntas de ala del
  murciélago…).
- Suites en verde: smoke 252, mobs 124, biomas 42, aldeas 62.

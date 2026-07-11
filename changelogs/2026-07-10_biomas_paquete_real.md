# Biomas del paquete real: fuente única en assets/biomes con ids en inglés

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Mundo > Biomas

## Descripción

Los biomas estaban definidos en dos lugares que divergían: 14 definiciones
artesanales en español en `js/biomes/` (las que jugaba el juego) y los 71
`.biome.json` Bedrock de `assets/biomes/` (los que describía el análisis
añadido a `documents/03-biomas.md`, con características sin implementar).
Este cambio elimina la redundancia: **la fuente única de verdad pasa a ser
`assets/biomes/`** y el juego la consume traducida, con los ids y nombres en
inglés del pack.

### Diseño (alternativas consideradas)

- **Generador → data file** (el patrón ya establecido por
  `tools/gen-materiales.mjs` → `js/materiales.data.js`): `tools/gen-biomas.mjs`
  traduce los 71 JSON a `js/biomes/biomes.data.js` (generado, no editable)
  conservando la MISMA forma de definición que ya consumían worldgen, mobs,
  clima y aldeas — así el radio de la onda expansiva queda contenido. Se
  descartó leer los JSON en runtime (fetch): rompería las suites de Node y el
  servidor, y no es el patrón de la casa.
- **Colocación con el sistema legado real del pack** (zonas
  `generate_for_climates` con pesos + transformaciones `hills`/`mutate` +
  etiquetas): es lo que estos `.biome.json` describen de verdad. Se descartó
  implementar `multinoise_generation_rules` porque en este pack es vestigial
  (solo 12 biomas lo declaran; la mayoría con peso 0).
- **Curación por familias de etiquetas**: los `features` y `spawn_rules` del
  pack no están archivados, así que la vegetación y los mobs se curan en el
  generador por familia de tags (trasladando la curación de los 14 biomas
  reemplazados) y quedan horneados en el data file.

### Qué cambia en el juego

- 41 biomas de tierra alcanzables (llanuras, bosques, abedulares, junglas,
  taigas y megataigas, pantanos, sabanas, desiertos, mesetas de mesa, tundras
  y sus variantes de colinas y mutadas), más océanos por zona térmica con
  variantes profundas, playas frías/cálidas, montañas con ice_mountains en
  zona helada y la isla de setas con su orilla.
- El abedul y la mesa usan materiales del paquete real (MAT_BIRCH_LOG,
  MAT_HARDENED_CLAY, MAT_TERRACOTTA_WHITE).
- La precipitación por bioma sale del clima Bedrock del pack (nieve con
  T < 0.15, seco con downfall 0) en vez de ventanas de ruido propias.
- Las aldeas anclan en los pueblos del MC real (plains, sunflower_plains,
  savanna, desert, taiga, cold_taiga, ice_plains) con sus paletas.
- Las variantes del conejo usan los ids con tags
  `spawns_white_rabbits`/`spawns_gold_rabbits` del pack.

### Adaptaciones y consecuencias declaradas

- **Los mundos existentes cambian de vestido**: la selección de biomas es
  distinta, así que los chunks aún no generados (o regenerables de la
  semilla) tendrán superficies/vegetación diferentes a las de antes. La
  altura del terreno NO cambia (el relieve usa los mismos ruidos).
- Cerezos y jardín pálido no existen en el pack: dejan de generarse (sus
  bloques siguen); el creaking se muda al bosque oscuro (`roofed_forest`).
- `red_sand`/`netherrack` → SAND/STONE; hojas de abedul con follaje verde
  estándar (las del pack son grises: se tiñen por bioma y el atlas aún no
  tiñe).
- Catalogados sin colocar: ríos, edges, bamboo_jungle, legacy, nether y end
  (tabla y motivos en documents/03-biomas.md).

## Tipo de Cambio

- `Cambiado`

## Archivos Afectados

### [NUEVO] `tools/gen-biomas.mjs`
- Generador: traduce los 71 `.biome.json` (materiales del surface_builder y
  sus adjustments, clima, zonas, transformaciones, tags) y hornea la
  curación de vegetación/mobs por familia de etiquetas.

### [NUEVO] `js/biomes/biomes.data.js`
- Catálogo generado de los 71 biomas (NO editar a mano).

### [MODIFICADO] `js/biomes/map.js`
- BiomeMap data-driven: zonas climáticas con candidatos y pesos del pack,
  parcelas Voronoi jitterizadas para la tierra, océanos por zona y
  profundidad, playas frías/cálidas, montañas por zona y transformaciones
  hills/mutate encadenables; banda rara → isla de setas.

### [MODIFICADO] `js/biomes/model.js`
- El contrato documenta la forma GENERADA (zonas, transformaciones, clima
  Bedrock, precipitación, tags).

### [ELIMINADO] `js/biomes/registry.js` y los 14 biomas artesanales
- `bosque, cerezos, desierto, jungla, llanura, montanas, nevado, oceano,
  palido, pantano, playa, sabana, setas, taiga` — la redundancia que motivó
  este cambio.

### [MODIFICADO] `js/villages/model.js`, `js/mobs/rabbit.js`, `js/clima.js`
- Ids ingleses en BIOMAS_ALDEA/PALETAS (comodín plains), variantes del
  conejo por ids del catálogo y precipitación leída del bioma.

### [MODIFICADO] `test/biomes.mjs`, `test/validate-biome.mjs`,
### `test/villages.mjs`, `test/clima.mjs`, `test/construcciones.mjs`
- Suites adaptadas al catálogo generado (contrato de las 71 definiciones,
  colocación por zonas, ids ingleses en paletas y sondas).

### [MODIFICADO] `documents/03-biomas.md`, `documents/05-aldeas.md`,
### `documents/01-voxelcraft.md`, `README.md`
- 03 reescrito para describir el sistema implementado (incluye lo que el
  análisis previo describía sin implementar, ahora con su estado real);
  aldeas e índices actualizados a los ids del pack.

## Impacto

- Verificación: `node tools/gen-biomas.mjs` determinista; 12 suites en verde
  (318 + 186 + 64 + 38 + 16 + 14 + 13 + 11 + 10 + 8 + 8 + 20); distribución
  muestreada (58 081 columnas: plains 28 %, forest 16 %, … isla de setas
  0,1 %); E2E en el juego real con semilla fija: teletransporte a desert,
  ice_plains, birch_forest, mesa_plateau y mega_taiga con superficie
  correcta (arena 25/25, hierba nevada 25/25, podzol presente) y capturas.
- Deuda declarada: el atlas no tiñe texturas en escala de grises (hojas de
  abedul verdes estándar); los biomas «edge», ríos y bamboo_jungle esperan
  su mecánica de colocación.

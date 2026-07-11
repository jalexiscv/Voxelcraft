# Sistema de Biomas de VoxelCraft

## Descripción

Biomas al estilo Minecraft para el Overworld: regiones climáticas
deterministas que definen los **materiales** de la superficie, la
**vegetación** y **qué mobs habitan** cada una.

La **fuente única de verdad** del catálogo son los 71 `.biome.json` de
[assets/biomes/](../assets/biomes/) (formato Bedrock 1.21, parte del paquete
real archivado). No hay definiciones de bioma escritas a mano en el código:
`node tools/gen-biomas.mjs` los traduce a
[js/biomes/biomes.data.js](../js/biomes/biomes.data.js) (**generado, no
editar**), con los ids y nombres **en inglés** tal como los declara el pack
(`plains`, `desert`, `birch_forest`…). Es el mismo patrón del paquete de
materiales (`tools/gen-materiales.mjs` → `js/materiales.data.js`).

## Qué se toma del pack y qué se cura

De cada `.biome.json` el generador toma **tal cual**:

| Componente Bedrock | A qué se traduce |
|---|---|
| `description.identifier` | `id` (sin `minecraft:`) y `name` (Title Case) |
| `minecraft:climate` (temperature, downfall) | `congelado` (T ≤ 0 o builder `frozen_ocean`), `precipitacion` (`nieve` si T < 0.15, `null` si downfall 0, si no `lluvia`) y `clima` crudo |
| `minecraft:surface_builder` | `surface.top/under` mapeados a bloques de B (`grass_block`→GRASS —nevada si T ≤ 0—, `sand`→SAND, `hardened_clay`→MAT_HARDENED_CLAY…) |
| `minecraft:surface_material_adjustments` | `surface.topAlt/altChance` (el ajuste de rango más ancho cuyo material aporte variante visible: piedra en `extreme_hills`, podzol en `mega_taiga`, grava en `stone_beach`) |
| `minecraft:overworld_generation_rules` | `zonas` (`generate_for_climates`, con pesos) y las transformaciones `hills`/`mutate` |
| `minecraft:tags` | clase de terreno (`tierra`/`oceano`/`playa`/`montana`), familia de contenido y datos como las variantes del conejo |

Lo que el pack **no archiva** (sus `features` y `spawn_rules` no están en
assets/) se **cura por familia de etiquetas** dentro del generador y queda
horneado en el data file: árboles/cactus/flora y las listas de mobs
day/night/water. La curación traslada la de los 14 biomas artesanales que
este sistema reemplaza (p. ej. familia `taiga` → coníferas + lobos/zorros;
`desert` → cactus/arbusto seco + camellos/husk; `mooshroom_island` →
mooshroom sin hostiles). El contrato completo de la definición generada está
en [js/biomes/model.js](../js/biomes/model.js) y lo hace cumplir
`test/validate-biome.mjs` sobre todo el catálogo.

## Colocación (BiomeMap, js/biomes/map.js)

El bioma es una **función global pura** de (semilla, x, z, altura): el
Generator (worker) y MobSystem (hilo principal) ven el mismo mapa sin
costuras. La selección adapta el sistema legado de los `.biome.json`:

1. **Clase de terreno por altura**: `oceano` (sumergido), `playa` (cota del
   mar con agua en el anillo de radio 3), `montana` (h ≥ MOUNTAIN_H) o
   `tierra`.
2. **Zona climática** por el ruido de temperatura a escala regional (~700
   bloques) —`frozen`, `cold`, `medium`, `lukewarm`, `warm`— con los
   candidatos y pesos de `generate_for_climates` (p. ej. `plains` pesa 3 en
   medium; `desert` 3 en warm; `ice_plains` 3 en frozen). La tierra de
   `lukewarm` usa los candidatos de `medium` (el pack solo declara océanos
   ahí).
3. **Tierra**: parcelas Voronoi jitterizadas de ~384 bloques; cada parcela
   sortea su bioma base entre los candidatos de la zona de su sitio. Las
   escalas van acompasadas con la continentalidad del relieve (~640, ver
   [01-voxelcraft.md](01-voxelcraft.md)): masas de tierra de cientos a miles
   de bloques donde caben regiones de bioma completas.
4. **Océano**: la variante de la zona (fría/templada/cálida/helada), y la
   `deep_*` bajo SEA_LEVEL − 20. **Playa**: `cold_beach` en zonas frías,
   `beach` en las demás. **Montaña**: `ice_mountains` en zona helada,
   `extreme_hills` en el resto.
5. **Transformaciones del pack** sobre tierra y montaña: la banda alta del
   ruido de cerros aplica `hills_transformation` (colinas: `forest_hills`,
   `desert_hills`… y en `plains` también bosques intercalados) y la banda
   rara del ruido de mutación aplica `mutate_transformation`
   (`sunflower_plains`, `flower_forest`, `ice_plains_spikes`…), encadenables.
6. **Isla de setas**: banda rara del ruido weird → `mushroom_island` (y
   `mushroom_island_shore` en su costa).

### Catalogados pero sin colocar

Todo el catálogo existe y valida, pero el motor no coloca (todavía): `river`
y `frozen_river` (no hay trazado de ríos), `jungle_edge`/`extreme_hills_edge`
y demás `edge` (sin detección de borde), `bamboo_jungle` (nada lo referencia
en el pack), `legacy_frozen_ocean` (legado), y `hell`/`the_end` (otra
dimensión). Si algún día se colocan, la definición ya está generada.

### Adaptaciones declaradas

* `red_sand` y `netherrack` no existen como bloque: caen a SAND y STONE.
* El abedul usa el tronco real del pack (MAT_BIRCH_LOG) con follaje verde
  estándar: la textura de hojas del pack es en escala de grises (el MC real
  la tiñe por bioma y este atlas aún no tiñe).
* Los cerezos y el jardín pálido no existen en este pack: sus bloques
  (CHERRY_*/PALE_*) siguen en el juego pero ya no se generan de forma
  natural, y el creaking se muda al bosque oscuro (`roofed_forest`).
* El `multinoise_generation_rules` del pack es vestigial (solo 12 biomas lo
  traen): la colocación implementada es la del sistema de zonas legado.
* La lava del fondo de las cuevas y la arena/grava del lecho marino siguen
  siendo globales del generador (no por bioma).

## Habitantes

Los mobs de **cueva** siguen siendo globales por `spawn.cave` (murciélago,
slime, warden…). **Cobertura**: la unión de las listas de los 71 biomas + los
de cueva/invocación cubre los 71 mobs del registro (prueba automática). Las
variantes por bioma (conejo blanco en nieve, dorado en desierto) usan los ids
del catálogo con las tags `spawns_white_rabbits`/`spawns_gold_rabbits`.

## Arquitectura

```
assets/biomes/*.biome.json      ← FUENTE DE VERDAD (71 biomas, Bedrock)
        │  node tools/gen-biomas.mjs
        ▼
js/biomes/biomes.data.js        ← catálogo generado (NO editar a mano)
js/biomes/map.js                ← BiomeMap: selección determinista
js/biomes/model.js              ← contrato de la definición generada
        │
        ├─ js/worldgen.js       ← superficie, árboles, cactus, flora, hielo
        ├─ js/mobs.js           ← eligibleAt: listas day/night/water
        ├─ js/clima.js          ← precipitación por bioma (lluvia/nieve/seco)
        └─ js/villages/model.js ← BIOMAS_ALDEA y paletas (plains, desert…)
```

## Verificación

*   `node tools/gen-biomas.mjs` — regenera el catálogo (determinista).
*   `node test/biomes.mjs` — determinismo, cobertura de la selección,
    contrato de las 71 definiciones, colocación por zonas (los biomas base
    aparecen; los no colocables no se cuelan) y cobertura de los mobs.
*   `node test/validate-biome.mjs <id>` — validador por definición (p. ej.
    `plains`, `mesa`, `ice_plains`).
*   `node test/mobs.mjs`, `node test/villages.mjs`, `node test/clima.mjs`,
    `node test/smoke.mjs` — consumidores en verde.

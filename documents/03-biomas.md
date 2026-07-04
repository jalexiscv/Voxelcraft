# Sistema de Biomas de VoxelCraft

## Descripción

Plan e implementación de **biomas al estilo Minecraft** para el Overworld de
VoxelCraft: regiones climáticas deterministas que definen los **materiales** de
la superficie, la **vegetación**, y **qué mobs habitan** cada una. Como todo en
VoxelCraft, 100 % procedural y sin assets externos.

## Biomas existentes antes de este plan

El generador (v0.4.x) no tenía biomas reales; solo aproximaciones implícitas:

| Aproximación | Cómo se producía |
|---|---|
| Pradera | Todo terreno sobre el nivel del mar: hierba, robles, flores y setas |
| Playa / desierto | Franja de arena junto al agua por ruido `sandN` (sin cactus ni mobs propios) |
| Océano / lagos | Todo hueco bajo `SEA=32` se llena de agua; lecho por ruidos `sandN`/`gravelN` |
| Cuevas | Gusanos tallados bajo la superficie (hábitat de aparición `cave`) |

Los mobs aparecían por hábitat (`land`/`water`/`cave`) y hora, **sin noción de
bioma**: un oso polar podía salir junto a un camello.

## Los 14 biomas del plan

Clasificación por **clase de terreno** (derivada de la altura, sin costuras) y
**clima** (temperatura/humedad/rareza, ruidos deterministas de la semilla).
`t`/`h`/`w` ∈ [−1, 1]. El orden de la tabla es el **orden de selección** del
registro (el primero que casa gana; llanura es el comodín final).

| # | Bioma (id) | Selección | Superficie | Árboles/vegetación | Mobs día | Mobs noche | Mobs agua |
|---|---|---|---|---|---|---|---|
| 1 | `setas` | tierra, w>0.45 | MYCELIUM/DIRT | setas gigantes no; setas y hierba alta | mooshroom | — (sin hostiles) | calamar, calamar_brillante |
| 2 | `palido` | tierra, w<−0.45 | GRASS/DIRT | roble pálido (PALE_LOG/PALE_LEAVES) denso; sin flores | — | creaking (solo aquí) | — |
| 3 | `oceano` | sumergido (h+1≤SEA) | lecho por ruidos (global) | — | — | — | bacalao, salmon, pez_tropical, pez_globo, calamar, calamar_brillante, delfin, nautilus, ahogado, nautilus_zombi, guardian |
| 4 | `playa` | h≤SEA+1, agua en el anillo | SAND/SAND | — | tortuga, conejo | zombi, esqueleto, ahogado, fantasma | bacalao, pez_tropical, delfin, pez_globo |
| 5 | `montanas` | h≥42 | GRASS; SNOWY_GRASS si t<−0.3 | conífera rala | cabra, llama, oveja, fantasma_feliz | stray, esqueleto, zombi, creeper, arana, fantasma | — |
| 6 | `desierto` | t∈[0.15,1], h∈[−1,−0.05] | SAND/SAND | cactus, arbusto seco; sin árboles | camello, armadillo, conejo, comerciante, aldeano | husk, parched, esqueleto, arana, camello_husk, enderman, fantasma, zombi_aldeano | — |
| 7 | `sabana` | t∈[0.15,1], h∈[−0.05,0.10] | GRASS/DIRT | acacia rala + hierba alta | caballo, burro, vaca, gallina, armadillo, llama, aldeano | zombi, esqueleto, creeper, arana, saqueador, ravager, enderman, fantasma | bacalao |
| 8 | `jungla` | t∈[0.15,1], h∈[0.10,1] | GRASS/DIRT | jungla alta densa + setas | loro, ocelote, panda, gallina, rana, sniffer, abeja | zombi, esqueleto, creeper, arana, bruja, fantasma | pez_tropical, ajolote, calamar |
| 9 | `nevado` | t∈[−1,−0.30] | SNOWY_GRASS/DIRT, hielo | conífera muy rala | oso_polar, zorro, conejo, golem_nieve, aldeano | stray, zombi, creeper, arana, fantasma | salmon |
| 10 | `taiga` | t∈[−0.30,−0.10], h∈[0,1] | PODZOL⇄GRASS/DIRT | conífera densa + setas | lobo, zorro, conejo, gallina, aldeano | zombi, esqueleto, creeper, arana, saqueador, fantasma | salmon |
| 11 | `cerezos` | t∈[−0.30,−0.10], h∈[−1,0] | GRASS/DIRT | cerezos (copa rosa) + flores | abeja, oveja, cerdo, conejo, caballo | zombi, esqueleto, creeper, arana, fantasma | salmon, ajolote |
| 12 | `pantano` | t∈[0,0.15], h∈[0.20,1] | GRASS/DIRT | roble bajo + setas; sin flores amarillas | rana, conejo, gallina, gato | slime, bruja, bogged, zombi, ahogado, enderman, fantasma | calamar, pez_globo, ahogado |
| 13 | `bosque` | t∈[−0.10,0.15], h∈[0.02,1] | GRASS/DIRT | roble denso + flores | gallina, conejo, zorro, abeja, allay | zombi, esqueleto, creeper, arana, vindicador, evocador, vex, zombi_aldeano, fantasma | salmon, calamar |
| 14 | `llanura` | comodín (tierra) | GRASS/DIRT | roble ralo + flores + hierba alta | cerdo, oveja, vaca, gallina, caballo, burro, conejo, aldeano, comerciante, abeja, gato, golem_hierro, golem_cobre, fantasma_feliz, sniffer | zombi, esqueleto, creeper, arana, bruja, zombi_aldeano, saqueador, ravager, enderman, fantasma | bacalao, salmon, calamar, ajolote |

Los mobs de **cueva** no dependen del bioma (siguen siendo globales por
`spawn.cave`): murciélago, cubo de azufre, slime, lepisma, araña de cueva,
warden, breeze. **Cobertura**: la unión de las listas de biomas + los de cueva
debe cubrir los 68 mobs (prueba automática).

## Bloques y téselas nuevos

`ATLAS_GRID` pasa de 8 a 16 (64→256 huecos; los consumidores derivan todo de la
constante). Ids de bloque y téselas **fijos** (contrato entre agentes):

| Bloque (B.) | id | Téselas (TILE.) | Notas |
|---|---|---|---|
| SNOW | 44 | SNOW:45 | sonido cloth |
| SNOWY_GRASS | 45 | top SNOW, side GRASS_SNOW_SIDE:46, bottom DIRT | |
| ICE | 46 | ICE:47 | translúcido (opaque:false, hideSame) |
| SPRUCE_LOG | 47 | side SPRUCE_LOG_SIDE:48, top LOG_TOP | sonido wood |
| SPRUCE_LEAVES | 48 | SPRUCE_LEAVES:49 | opaque:false, huecos alfa |
| JUNGLE_LOG | 49 | side JUNGLE_LOG_SIDE:50, top LOG_TOP | |
| JUNGLE_LEAVES | 50 | JUNGLE_LEAVES:51 | |
| ACACIA_LOG | 51 | side ACACIA_LOG_SIDE:52, top LOG_TOP | |
| ACACIA_LEAVES | 52 | ACACIA_LEAVES:53 | |
| CHERRY_LOG | 53 | side CHERRY_LOG_SIDE:54, top LOG_TOP | |
| CHERRY_LEAVES | 54 | CHERRY_LEAVES:55 | rosa |
| PALE_LOG | 55 | side PALE_LOG_SIDE:56, top LOG_TOP | desaturado |
| PALE_LEAVES | 56 | PALE_LEAVES:57 | gris verdoso |
| CACTUS | 57 | side CACTUS_SIDE:58, top CACTUS_TOP:59 | sonido cloth |
| MYCELIUM | 58 | top MYCELIUM_TOP:60, side MYCELIUM_SIDE:61, bottom DIRT | |
| PODZOL | 59 | top PODZOL_TOP:62, side PODZOL_SIDE:63, bottom DIRT | |
| DEAD_BUSH | 60 | DEAD_BUSH:64 | planta cross |
| TALL_GRASS | 61 | TALL_GRASS:65 | planta cross |

## Arquitectura

```
js/
├── worldgen.js          <-- consume BiomeMap: superficie, árboles por tipo,
│                            cactus, hielo y flora según el bioma de la columna
├── mobs.js              <-- eligibleAt() filtra por las listas del bioma
└── biomes/
    ├── model.js         <-- Contrato de definición de bioma (documentación)
    ├── map.js           <-- BiomeMap(seed): clima determinista + selección
    ├── registry.js      <-- Registro y ORDEN de selección (fuente de verdad)
    └── <bioma>.js × 14  <-- Una definición por bioma (llanura.js es el canónico)
```

*   **`BiomeMap(seed)`** (puro): tres ruidos `Fractal2D` de baja frecuencia —
    temperatura (esc. 1/180), humedad (1/180), rareza (1/300) — con valores
    `clamp(v·0.7, −1, 1)`. `at(x, z, h, heightAt?)` decide: clase de terreno
    por altura (`oceano`/`playa`/`montana`/`tierra`), rarezas (`w`), y si no,
    la primera ventana climática que case en el orden del registro; comodín
    `llanura`. Una candidata a playa sin columnas sumergidas en su anillo
    (radio 3) se trata como tierra: playa solo junto al agua de verdad.
    Exporta `SEA_LEVEL=32` y `MOUNTAIN_H=42` (una prueba los compara con
    worldgen para impedir divergencias).
*   **Calibración con datos**: las ventanas de la tabla están ajustadas a la
    distribución real de los ruidos (medida sobre varias semillas): el fbm
    concentra la masa cerca de 0, así que los umbrales «extremos» son más
    suaves de lo que sugeriría el rango teórico [−1, 1]. Distribución
    resultante (semilla 2026): océano 39 %, playa 12 %, llanura 11 %, bosque
    7 %, taiga/cerezos/desierto/nevado/jungla 3-6 %, sabana/pantano 2-3 %,
    setas/palido ~0,6 % y montañas 0,2 %. Los 14 aparecen en toda semilla
    probada.
*   **El mismo `BiomeMap`** se instancia en el `Generator` (worker) y en
    `MobSystem` (hilo principal) con la misma semilla: ambos ven el mismo mapa.
*   **Aparición de mobs**: el hábitat `land` exige que el id esté en
    `mobs.day`/`mobs.night` del bioma del punto; `water`, en `mobs.water`;
    `cave` no cambia. Las demás reglas (hora, bloque, topes) se mantienen.
*   **Árboles por tipo** (`roble`, `conifera`, `acacia`, `jungla`, `cerezo`)
    con bloques parametrizados; misma disciplina de RNG con secuencia fija
    para que crucen bordes de chunk sin costuras.

## El contrato de definición

Cada bioma es un archivo de **solo datos** (importable en Node) — formato
completo en el docblock de [model.js](../js/biomes/model.js):
`id`, `name`, `terrain` (`tierra`|`oceano`|`playa`|`montana`),
`clima {temp:[a,b], humid:[a,b]}`, `rare {weird:[a,b]}`,
`surface {top, under, topAlt?, altChance?, topFrio?}`, `congelado`,
`trees {kind, log, leaves, chance, max}`, `cactus {chance}`,
`flora [{block, weight}]`, `mobs {day, night, water}`.

**Añadir un bioma**: crear `js/biomes/<id>.js` imitando `llanura.js`, validar
con `node test/validate-biome.mjs <id>` e importarlo en `registry.js` (¡en la
posición correcta del orden de selección!).

## Consideraciones adicionales

*   **Sin costuras**: el bioma es función pura de (semilla, x, z, altura); la
    altura sigue siendo global (continentalidad), así que no hay saltos en
    bordes de chunk. Los biomas no modifican el relieve en esta fase.
*   **Compatibilidad de guardado**: los chunks editados guardados conservan sus
    bloques (ids nuevos no chocan: 44..61 estaban libres). Un mundo guardado
    con la versión anterior regenera los chunks NO editados con biomas.
*   **Fuera de alcance (documentado)**: variantes de océano por temperatura,
    ríos, tintado de hierba/agua por bioma, nieve en capas, badlands/tierras
    baldías, bioma exclusivo de lush caves, y estructuras (aldeas, templos).
*   **Adaptaciones**: el gato vive en llanura/pantano (sin aldeas ni cabañas);
    el allay en bosque (sin mansiones); vindicador/evocador/vex son nocturnos
    del bosque (sin mansión); saqueador/ravager nocturnos de llanura/sabana/
    taiga (sin patrullas); el slime es nocturno del pantano además de cueva.

## Fases del plan (una por commit)

1. **Contrato y plan** (este documento + `js/biomes/model.js`).
2. **Infraestructura** (agentes en paralelo sobre archivos disjuntos):
   I1 bloques+atlas · I2 núcleo de biomas (map/registry/llanura/validador/
   suite base) · I3 integración worldgen + mobs + adaptación de pruebas.
3. **Fan-out**: 13 agentes en paralelo, uno por bioma restante, cada uno
   construye su `js/biomes/<id>.js` contra el validador.
4. **Integración**: cableado del registro en orden, prueba de cobertura de los
   68 mobs, suites completas en verde.
5. **Documentación y changelog** según protocolos.

## Verificación

*   `node test/biomes.mjs` — determinismo del mapa, cobertura climática (toda
    coordenada tiene bioma), constantes sincronizadas con worldgen, contrato de
    las 14 definiciones y cobertura de los 68 mobs.
*   `node test/validate-biome.mjs <id>` — validador por definición.
*   `node test/mobs.mjs` y `node test/smoke.mjs` — siguen en verde.

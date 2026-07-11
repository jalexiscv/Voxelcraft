# Análisis del Proyecto: VoxelCraft

> **Versión:** v0.5.0  
> **Repositorio:** `github.com/jalexiscv/Voxelcraft`  
> **Autor:** Jose Alexis Correa Valencia  
> **Fecha del análisis:** 2026-07-04  
> **Lenguaje:** JavaScript (ES Modules, vanilla)  
> **Total de líneas:** ~12 166 (JS), 1174 (tests), 128 (CSS), 115 (README), 102 (HTML)

---

## Índice

1. [Identificación del Proyecto](#1-identificación-del-proyecto)
2. [Estructura de Directorios](#2-estructura-de-directorios)
3. [Tecnologías y Dependencias](#3-tecnologías-y-dependencias)
4. [Arquitectura General](#4-arquitectura-general)
5. [Módulos del Motor](#5-módulos-del-motor)
6. [Sistema de Mobs](#6-sistema-de-mobs)
7. [Sistema de Biomas](#7-sistema-de-biomas)
8. [Sistema Gráfico (WebGL2)](#8-sistema-gráfico-webgl2)
9. [Sistema de Audio](#9-sistema-de-audio)
10. [Persistencia y Guardado](#10-persistencia-y-guardado)
11. [Sistema de Pruebas](#11-sistema-de-pruebas)
12. [Estadísticas del Código](#12-estadísticas-del-código)
13. [Observaciones Técnicas](#13-observaciones-técnicas)
14. [Diagrama de Arquitectura](#14-diagrama-de-arquitectura)
15. [Guía para Desarrolladores](#15-guía-para-desarrolladores)
16. [Conclusiones](#16-conclusiones)

---

## 1. Identificación del Proyecto

| Atributo | Valor |
|---|---|
| **Nombre** | VoxelCraft |
| **Versión** | 0.5.0 |
| **Tipo** | Videojuego de vóxeles 3D, mundo infinito |
| **Lenguaje** | JavaScript (ES Modules nativos, sin transpilación) |
| **Entorno de ejecución** | Navegador con WebGL 2 (frontend) + Node.js (tests) |
| **Servidor** | XAMPP / servidor HTTP estático cualquiera |
| **Framework gráfico** | WebGL2 directo (ningún engine, ningún wrapper) |
| **Build system** | Ninguno — módulos ES servidos tal cual |
| **Licencia** | MIT |
| **Repositorio** | 101 commits (desde 2019-07-11) |

---

## 2. Estructura de Directorios

```
Minecraft/                         ← Raíz del proyecto (vhost: minecraft.local)
├── index.html                     ← Punto de entrada: shell HTML + overlays del HUD
├── README.md                      ← Documentación principal del proyecto
├── css/
│   └── style.css                  ← Estilos del HUD (128 líneas)
├── js/                            ← Motor completo (~12 166 líneas)
│   ├── main.js                    ← Integración, orquestación, bucle de juego (592 L)
│   ├── math.js                    ← Matrices 4×4, vectores, lookDir (86 L)
│   ├── noise.js                   ← PRNG Park–Miller, Perlin 2D, fractal, distorsión (132 L)
│   ├── blocks.js                  ← Registro de 62 tipos de bloque (118 L)
│   ├── atlas.js                   ← Atlas de texturas procedurales Canvas 2D (463 L)
│   ├── world.js                   ← Mundo infinito: mapa disperso de chunks (138 L)
│   ├── worldgen.js                ← Generador procedural de terreno (puro, 395 L)
│   ├── worldgen.worker.js         ← Web Worker wrapper (24 L)
│   ├── mesher.js                  ← Chunk → triángulos (culling, AO, luz) (137 L)
│   ├── renderer.js                ← WebGL2: shaders, niebla, ciclo día/noche (388 L)
│   ├── sky.js                     ← Sol y luna: arco celeste, fases, crepúsculos (158 L)
│   ├── player.js                  ← Física AABB, natación, vuelo, raycast DDA (231 L)
│   ├── audio.js                   ← WebAudio: sonidos, voces, música generativa (201 L)
│   ├── hud.js                     ← Interfaz: hotbar, selector, salud, debug (179 L)
│   ├── mobs.js                    ← Sistema de mobs: IA, física, aparición (655 L)
│   ├── mobrender.js               ← Render WebGL de mobs (partes-caja) (210 L)
│   ├── storage.js                 ← Persistencia IndexedDB (80 L)
│   ├── biomes/                    ← Sistema de 14 biomas (17 archivos)
│   │   ├── model.js               ← Contrato de definición de bioma (76 L)
│   │   ├── map.js                 ← BiomeMap: clima determinista + selección (113 L)
│   │   ├── registry.js            ← Registro y orden de selección (50 L)
│   │   ├── llanura.js             ← Bioma comodín (48 L)
│   │   ├── bosque.js / taiga.js / jungla.js / sabana.js / desierto.js
│   │   ├── montanas.js / nevado.js / playa.js / oceano.js
│   │   ├── pantano.js / cerezos.js / palido.js / setas.js
│   └── mobs/                      ← Sistema de 68 mobs (73 archivos)
│       ├── model.js               ← Geometría partes-caja + desplegado UV (112 L)
│       ├── skin.js                ← Pieles procedurales PRNG (66 L)
│       ├── registry.js            ← Registro de tipos (105 L)
│       ├── cerdo.js (canónico)    ← Definición de mob individual (64 L)
│       └── <mob>.js × 68          ← Una definición por mob (~64–143 L c/u)
├── test/                          ← Suites de prueba (5 archivos, 1174 L total)
│   ├── smoke.mjs                  ← Pruebas de humo del motor (254 L, 52 checks)
│   ├── mobs.mjs                   ← Suite de mobs (436 L, 118 checks)
│   ├── biomes.mjs                 ← Suite de biomas (175 L, 42 checks)
│   ├── validate-mob.mjs           ← Validador individual de definición de mob (157 L)
│   └── validate-biome.mjs         ← Validador individual de definición de bioma (152 L)
├── documents/                     ← Documentación técnica profunda
│   ├── 01-voxelcraft.md           ← Arquitectura del motor y decisiones técnicas
│   ├── 02-mobs.md                 ← Sistema de 68 mobs: contrato, IA, hábitats
│   └── 03-biomas.md               ← 14 biomas: clima, materiales, vegetación
├── changelogs/                    ← Historial de cambios detallado
│   ├── CHANGELOG.md               ← 81 entradas (desde 2019-07-11)
│   └── 2026-07-04_*.md            ← Changelogs específicos de la última versión
├── assets/                        ← Material archivado de terceros (referencia)
└── .claude/                       ← Configuración Claude Code
```

---

## 3. Tecnologías y Dependencias

VoxelCraft tiene **cero dependencias externas**. Todo es código propio.

| Componente | Tecnología | Detalle |
|---|---|---|
| **Lenguaje** | JavaScript ES Module | `type="module"` en HTML; imports/exports nativos |
| **Renderizado** | WebGL 2.0 | Shaders GLSL 300 es, VAO, UBO, blending |
| **Audio** | WebAudio API | Ruido blanco filtrado + osciladores; AudioContext lazy |
| **Persistencia** | IndexedDB | Almacenamiento de chunks editados comprimidos con RLE |
| **Canvas** | Canvas 2D API | Atlas de texturas, texturas de sol/luna/nubes |
| **Web Workers** | `Worker` | Generación de chunks en segundo plano |
| **Matemáticas** | Implementación propia | Matrices 4×4 column-major, raycast DDA (Amanatides & Woo) |
| **Ruido procedural** | Implementación propia | PRNG Park–Miller, Perlin 2D, FBM, hash posicional |
| **Tests** | Node.js (`node --experimental-vm-modules`) | Importa módulos ES puros (sin DOM) |

---

## 4. Arquitectura General

### Principios de diseño

1. **Sin build, sin dependencias**: los módulos ES se sirven tal cual. El "framework" gráfico es WebGL2 directo (~388 líneas en `renderer.js`).
2. **Assets 100 % procedurales**: texturas 16×16 pintadas píxel a píxel con PRNG determinista. Sonidos sintetizados con WebAudio. Cero archivos binarios, cero material con copyright.
3. **Determinismo por semilla**: el mismo mundo se genera idénticamente con la misma semilla, independientemente del orden de generación (las features usan `hashSeed(seed, cx, cz, salt)` en lugar de RNG secuencial).
4. **Mundo infinito por chunks**: chunks de 16×16×64, coordenadas ilimitadas (signo incluido), generados bajo demanda alrededor del jugador y descargados al alejarse.
5. **Módulos puros separados del DOM**: `math.js`, `noise.js`, `blocks.js`, `world.js`, `worldgen.js`, `mesher.js`, `player.js`, `mobs.js` son funcionales sin navegador y se prueban en Node.

### Flujo de arranque

```
index.html
  └── <script type="module" src="./js/main.js">
        └── function boot()
              ├── buildAtlas()          ← atlas.js (Canvas 2D)
              ├── new Renderer()        ← renderer.js (WebGL2)
              ├── new MobRenderer()     ← mobrender.js
              ├── new HUD()             ← hud.js
              ├── new SoundEngine()     ← audio.js
              ├── new Player()          ← player.js
              ├── new World()           ← world.js
              ├── new MobSystem()       ← mobs.js
              ├── new Worker()          ← worldgen.worker.js
              ├── pumpGeneration()      ← pide chunks al worker
              ├── onInitialArea()       ← genera geometría
              └── requestAnimationFrame(frame)  ← bucle principal
                    ├── simulate(dt)    ← física, entrada, mobs, streaming
                    └── draw()          ← render, cielo, niebla
```

### Flujo de datos

```
Semilla
  └── biomeMap (BiomeMap) ──→ generator.generateChunk(cx, cz)
                                  └── Uint8Array blocks
                                       └── world.addChunk()
                                            └── meshChunk()
                                                 └── triángulos →
                                                      renderer.updateChunk()
                                                           └── WebGL2 draw
```

### Sistema de streaming

El render mantiene un área de chunks generados = `renderDist + GEN_MARGIN`, y una malla por chunk que requiere el vecindario 3×3 completo. Los chunks lejanos se descargan:

- **Mallas**: se liberan al exceder `renderDist + 1`.
- **Datos**: se descartan al exceder `renderDist + KEEP_MARGIN` (a menos que estén modificados).
- **Modificados**: se conservan y persisten (los chunks editados por el jugador nunca se descartan).
- **Worker**: máximo `MAX_INFLIGHT = 2` peticiones simultáneas; el worker genera en ~2–11 ms por chunk.

---

## 5. Módulos del Motor

### 5.1 `math.js` (86 líneas)
Matemáticas 3D mínimas para WebGL. Funciones puras sobre `Float32Array(16)`:

- `mat4Identity`, `mat4Perspective`, `mat4View`, `mat4Multiply`
- `mat4Translate`, `mat4RotateX/Y/Z`
- `lookDir(yaw, pitch)` → vector dirección
- `clamp`, `smoothstep`

### 5.2 `noise.js` (132 líneas)
Sistema de ruido procedural determinista:

- **`PRNG`**: Park–Miller (minstd) — `seed * 16807 % 2147483647`. Produce `next()` (entero) y `float()` (flotante).
- **`hashSeed(...nums)`**: FNV-1a-like. Combina semilla, coordenadas y sal en una semilla PRNG válida. Es el mecanismo de Minecraft real para features deterministas por posición.
- **`Perlin2D`**: ruido de gradiente con interpolación suave, 16 puntos de permutación.
- **`Fractal2D`**: suma de octavas con `gain=0.5`, `lacunarity=2.0`. Hasta 8 octavas.

### 5.3 `blocks.js` (118 líneas)
Registro central de 62 tipos de bloque (ids 0–61). Define:

- `B`: constantes de id (AIR=0 ... TALL_GRASS=61)
- `DEFS`: definiciones indexadas por id — cada una con: `name`, `top/side/bottom` (téselas del atlas), `solid`, `opaque`, `liquid`, `cross` (plantas), `hideSame`, `bright`, `sound`, `breakable`, `placeable`
- `PLACEABLE`: lista de bloques disponibles en el selector del jugador

### 5.4 `worldgen.js` (395 líneas)
Generador procedural de mundo. **Módulo puro** (sin DOM, testeable en Node):

- **Modelo paramétrico 1.18**: continentalidad → spline → altura base.
- **Componentes del relieve**: 6 ruidos fractales (`continents`, `relief`, `detail`, `warpX`, `warpZ`, `soil`, `sandN`, `gravelN`).
- **Generación por columnas**: altura de superficie → bloque superficial por bioma → cuevas (gusanos 3D) → vetas de menas → árboles y flora.
- **Features**: cuevas con radio 4 chunks, vetas/árboles con radio 1 chunk. Las features que cruzan bordes se re-simulan desde los chunks vecinos, escribiendo solo la porción local.
- **Agua**: llenado local por columna hasta `SEA=32` (sin flood fill global).
- **Método público**: `generateChunk(cx, cz)` → `Uint8Array` de 16×64×16 bytes.

### 5.5 `world.js` (138 líneas)
Mundo infinito: mapa disperso `Map<"cx,cz", {blocks, heights, modified}>`.

- `CHUNK = 16`, `WORLD_HEIGHT = 64`
- `get(x, y, z)` — chunks no generados devuelven `AIR`
- `solidAt(x, y, z)` — chunks no generados son **sólidos** (barrera física)
- `set(x, y, z, id)` — marca `modified = true` y pone el chunk como `dirty` para remallar
- `rleEncode/rleDecode` — compresión Run-Length Encoding para persistencia
- `meshable(cx, cz)` — requiere el vecindario 3×3 completo

### 5.6 `mesher.js` (137 líneas)
Convierte un chunk en triángulos WebGL:

- **Culling de caras**: solo se emiten caras contra vecinos no opacos.
- **Iluminación por vértice**: sombreado por cara (`shade: 0.5/0.6/0.8/1.0`) × luz solar de columna × oclusión ambiental (AO, 3 vecinos por esquina).
- **Dos mallas por chunk**: sólida (con recorte alfa para hojas/cristal/plantas) y de agua (translúcida, dibujada después con blending).
- **Formato de vértice**: 6 floats: `[x, y, z, u, v, light]`

### 5.7 `player.js` (231 líneas)
Jugador en primera persona:

- **AABB**: 0.6 ancho × 1.8 alto, ojos a 1.62.
- **Física**: gravedad (28), salto (8.6 ≈ 1.3 bloques), natación (`WATER_GRAVITY=7`), vuelo (`FLY_SPEED=13`), sprint.
- **Resolución de colisiones**: por ejes separados (X, Y, Z).
- **Raycast**: algoritmo DDA de Amanatides & Woo — alcance 5 bloques.
- **Spawn**: búsqueda en anillos crecientes de la primera columna generada, seca y sobre el nivel del mar.
- **Modos**: `flying` (sin gravedad), `inWater` (física reducida, nado vertical con `SWIM_UP`).

### 5.8 `atlas.js` (463 líneas)
Atlas de texturas procedurales (el archivo más grande del motor):

- **Rejilla**: 16×16 téselas de 16×16 píxeles = 256×256 píxeles en total.
- **65 téselas pintadas**: `GRASS_TOP(0)` a `TALL_GRASS(65)`.
- **Painters**: cada tésela se pinta con un `Tile` que usa `PRNG` determinista. Implementa: roca, hierba, madera, hojas, agua, lava, flores, cactus, micelio, podzol, nieve, etc.
- **Utilidades**: `tileUV(tile)` → `[u0, v0, u1, v1]`, `buildAtlas()` → `HTMLCanvasElement`.
- **Nubes**: `buildCloudTexture()` — tésela procedural de nubes con Perlin 2D.

---

## 6. Sistema de Mobs

### Arquitectura

```
js/mobs.js           ← Núcleo: IA por estados, física, aparición, flechas, explosiones (655 L)
js/mobrender.js      ← Render WebGL2: partes-caja animadas, piel, efectos (210 L)
js/mobs/model.js     ← Contrato de partes-caja + desplegado UV (112 L)
js/mobs/skin.js      ← Pieles procedurales RGBA con PRNG (66 L)
js/mobs/registry.js  ← Registro de 68 tipos (105 L)
js/mobs/<mob>.js ×68 ← Una definición por mob (~64–143 L c/u)
```

### Elenco (68 mobs del Overworld)

- **Pasivos (32)**: cerdo, oveja, vaca, gallina, armadillo, camello, camello_husk, gato, ocelote, zorro, caballo, burro, mooshroom, sniffer, golem_cobre, golem_nieve, tortuga, aldeano, comerciante_errante, rana, cubo_azufre, allay, murciélago, loro, happy_ghast, bacalao, salmón, pez_tropical, calamar, calamar_brillante, ajolote, conejo
- **Neutrales (11)**: lobo, cabra, panda, oso_polar, golem_hierro, llama, enderman, abeja, pez_globo, delfín, nautilus
- **Hostiles (25)**: zombi, esqueleto, creeper, araña, araña_cueva, ahogado, nautilus_zombi, husk, stray, parched, bogged, zombi_aldeano, bruja, saqueador, vindicador, evocador, ravager, slime, lepisma, phantom, vex, creaking, breeze, warden, guardián

### Contrato de definición

Cada archivo `<mob>.js` exporta un objeto con:

| Campo | Descripción |
|---|---|
| `id` | Identificador único (string) |
| `aabb` | Caja de colisión `{w, h}` |
| `hp` | Puntos de vida |
| `speed` | Velocidad de desplazamiento |
| `flying/aquatic/hop/glide/timid/hideOnHurt/noBurn/glow` | Banderas de locomoción y rasgos |
| `skin` | Tamaño de piel (`64x64`, `128x64` o `128x128`) |
| `paint(skin)` | Función que pinta la piel píxel a píxel con PRNG |
| `parts` | Array de partes-caja del modelo visual |
| `voice` | Tonos sintetizados para decir/herir/morir |
| `behavior` | Opcional: `neutral/aggro/attackRange/damage/cooldown/projectile/fuse+radius/lunge/teleport/freezeWhenSeen/stingOnce` |
| `spawn` | Reglas: `cap/group/block/night/water/cave` |

### IA por estados

| Estado | Comportamiento |
|---|---|
| `idle` | Quieto, mira al azar |
| `wander` | Deambula, esquiva obstáculos |
| `flee` | Huye del jugador (timid/asustadizo) |
| `chase` | Persigue al jugador (hostil o neutral enfadado) |
| `fuse` | Mecha del creeper encendida |
| `hide` | Escondido (armadillo en bola, creaking congelado) |

### Hábitats de aparición

- **Superficie (día)**: pasivos del bioma sobre su suelo natural
- **Superficie (noche)**: hostiles de la lista nocturna del bioma
- **Agua**: acuáticos que el bioma lista
- **Cueva**: global (sin bioma) — murciélago, cubo de azufre, slime, lepisma, araña_cueva, warden, breeze

### Salud del jugador

- 20 medios corazones (10 puntos)
- Daño por mobs con retroceso y viñeta roja
- Regeneración: ½ corazón cada 4s tras 8s sin daño
- Muerte: pantalla "Has muerto", reaparición sin perder la partida

---

## 7. Sistema de Biomas

### Arquitectura

```
js/biomes/model.js     ← Contrato de definición (76 L)
js/biomes/map.js       ← BiomeMap(seed): clima determinista (113 L)
js/biomes/registry.js  ← Registro y orden de selección (50 L)
js/biomes/<bioma>.js ×14 ← Definiciones (~40–50 L c/u)
```

### Los 14 biomas

| # | Bioma | Terreno | Superficie | Rareza |
|---|---|---|---|---|
| 1 | Setas | Tierra | MYCELIUM/DIRT | 0.6% |
| 2 | Pálido | Tierra | GRASS/DIRT + roble pálido | ~0.6% |
| 3 | Océano | Sumergido | Lecho por ruidos | 39% |
| 4 | Playa | Costero | SAND/SAND | 12% |
| 5 | Montañas | Altura≥42 | GRASS/SNOWY_GRASS | 0.2% |
| 6 | Desierto | Tierra | SAND/SAND | 3-6% |
| 7 | Sabana | Tierra | GRASS/DIRT | 2-3% |
| 8 | Jungla | Tierra | GRASS/DIRT | 3-6% |
| 9 | Nevado | Tierra | SNOWY_GRASS/DIRT | 3-6% |
| 10 | Taiga | Tierra | PODZOL⇄GRASS/DIRT | 3-6% |
| 11 | Cerezos | Tierra | GRASS/DIRT | 3-6% |
| 12 | Pantano | Tierra | GRASS/DIRT | 2-3% |
| 13 | Bosque | Tierra | GRASS/DIRT | 7% |
| 14 | Llanura | Tierra (comodín) | GRASS/DIRT | 11% |

### Selección de bioma

`BiomeMap.at(x, z, h)` sigue este orden:

1. **Clase de terreno** por altura: `oceano` (sumergido) → `playa` (h≤SEA+1, verifica anillo de agua radio 3) → `montana` (h≥42) → `tierra`
2. En `tierra`: primero las bandas de **rareza** (`weird > 0.45` produce `setas` o `palido`), luego la primera ventana **temp × humid** que case en el orden del registro
3. **Comodín**: `llanura` (si ninguna ventana casa)

### Bloques nuevos por biomas

Se añadieron 18 bloques nuevos (ids 44–61): SNOW, SNOWY_GRASS, ICE, 4 tipos de madera (SPRUCE, JUNGLE, ACACIA, CHERRY, PALE) con sus logs y leaves, CACTUS, MYCELIUM, PODZOL, DEAD_BUSH, TALL_GRASS.

---

## 8. Sistema Gráfico (WebGL2)

### Shaders

- **Vertex sólido/agua**: `aPos + aUV + aLight` → `uPV` → gl_Position. VS comparte GLSL 300 es.
- **Fragment sólido/agua**: textura con recorte alfa, iluminación (`vLight * uDay`), niebla por distancia.
- **Line** (selección/cubo): línea blanca 1px alrededor del bloque apuntado.
- **Astros** (sol/luna): quad billboard que se expande con ejes de cámara. Sin niebla ni factor día.
- **Mob render**: mismo pipeline pero con `uModel` (matriz de parte) y `uTint` (efectos de daño/mecha/muerte).

### Características visuales

| Característica | Implementación |
|---|---|
| Iluminación | Sombreado por cara × luz solar × AO por vértice (precalculado en mesh) |
| Niebla | Color del cielo, `fogNear = fogFar * 0.55`, suaviza el borde de generación |
| Ciclo día/noche | `cos(t·2π)` → dayFactor 0.22..1; sol y luna en órbita |
| Crepúsculo | `sunGlow(t)` mezcla cielo hacia naranja al amanecer/atardecer |
| Nubes | Textura procedural, desplazamiento lento (0.003/t), billboard horizontal |
| Fases lunares | 4 fases en tira de textura, `game.dayCount % MOON_PHASES` |
| Selección | Cubo de líneas 1px sobre el bloque apuntado por el raycast |

---

## 9. Sistema de Audio

**WebAudio puro, sin archivos de sonido.** `SoundEngine` crea perezosamente el `AudioContext` en el primer gesto del usuario.

### Efectos de sonido

- **Pasos/rotura/colocación**: ráfaga de ruido blanco filtrado (BPF). Parámetros por material:

  | Material | Frecuencia | Q | Vol | Duración |
  |---|---|---|---|---|
  | grass | 700 Hz | 0.8 | 0.14 | 0.09 s |
  | stone | 1500 Hz | 1.2 | 0.16 | 0.07 s |
  | wood | 380 Hz | 1.5 | 0.16 | 0.10 s |
  | gravel | 900 Hz | 0.6 | 0.16 | 0.12 s |
  | sand | 1800 Hz | 0.5 | 0.10 | 0.08 s |
  | cloth | 500 Hz | 0.7 | 0.10 | 0.10 s |

- **Salpicadura de agua**: ruido filtrado más grave + modulación.
- **Explosión**: ruido + oscilador bajo.
- **Daño al jugador**: tono descendente.
- **Voces de mobs**: oscilador con envolvente o ruido filtrado, parametrizado por la definición del mob (`voice: {say, hurt, die}` con frecuencia/curva/tipo).

### Música generativa

- Escala pentatónica mayor de Do: `[261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]` Hz.
- Acordes aleatorios suaves, cada 4–6 segundos.

---

## 10. Persistencia y Guardado

### Almacenamiento: IndexedDB

Base de datos: `voxelcraft` (versión 1), dos object stores:

| Store | Clave | Valor |
|---|---|---|
| `meta` | `'default'` | Semilla, estado del jugador, hora del mundo, distancia de render |
| `chunks` | `"cx,cz"` | Bloques del chunk comprimidos con RLE |

### Política

- **Solo chunks editados**: los bloques que el jugador ha roto/colocado se guardan. El resto del mundo se regenera de la semilla al explorar.
- **RLE**: compresión Run-Length Encoding sobre el `Uint8Array` de 16×64×16 bytes (~4% del tamaño bruto típicamente).
- **Instantánea completa**: `saveWorld()` limpia y reescribe ambos stores.
- **Carga**: `loadChunksInto(world)` restaura los chunks editados en el mundo, marcándolos como `modified = true`.
- **Carga automática**: el menú detecta si hay partida guardada (`hasSave()`) y habilita el botón "Cargar".

---

## 11. Sistema de Pruebas

5 suites ejecutables con Node.js (`node --experimental-vm-modules`):

| Suite | Archivo | Checks | Cobertura |
|---|---|---|---|
| **Humo** | `test/smoke.mjs` | 52 | PRNG, hash, ruido, bloques, atlas, generación de chunks, determinismo, independencia de orden, coordenadas negativas, distribución de bloques, costuras entre chunks, mallado, raycast, física, RLE |
| **Mobs** | `test/mobs.mjs` | 118 | Geometría y UV, física por modos, IA pasiva/neutral/hostil, mecha/explosión, flechas, teletransporte, congelación al mirar, aparición por hábitats/biomas, contrato de 68 definiciones |
| **Biomas** | `test/biomes.mjs` | 42 | Determinismo del mapa, cobertura climática, constantes sincronizadas con worldgen, contrato de 14 definiciones, cobertura de los 68 mobs |
| **Validador mob** | `test/validate-mob.mjs` | — | Validación individual por definición: campos, UV sin solapes, pintado determinista, pies al suelo |
| **Validador bioma** | `test/validate-biome.mjs` | — | Validación individual por definición de bioma |

**Total: 212 comprobaciones automatizadas** (todas en verde en el último reporte).

---

## 12. Estadísticas del Código

### Por tipo de archivo

| Tipo | Archivos | Líneas |
|---|---|---|
| JavaScript (motor) | 16 núcleo + 68 mobs + 14 biomas = 98 JS | ~12 166 |
| CSS | 1 | 128 |
| HTML | 1 | 102 |
| Markdown (docs) | 6 | ~474 |
| Tests (mjs) | 5 | 1 174 |

### Módulos más grandes

| Archivo | Líneas | Función |
|---|---|---|
| `js/mobs.js` | 655 | Núcleo del sistema de mobs (el más grande) |
| `js/main.js` | 592 | Orquestación y bucle de juego |
| `js/atlas.js` | 463 | Texturas procedurales |
| `js/worldgen.js` | 395 | Generación procedural de terreno |
| `js/renderer.js` | 388 | WebGL2 render |
| `js/player.js` | 231 | Física y raycast del jugador |
| `js/mobrender.js` | 210 | Render WebGL de mobs |
| `js/audio.js` | 201 | WebAudio procedural |
| `js/hud.js` | 179 | Interfaz de usuario |
| `js/sky.js` | 158 | Cielo, sol, luna |

### Distribución del elenco de mobs

- Pasivos: 32 (47%)
- Neutrales: 11 (16%)
- Hostiles: 25 (37%)
- Voladores: 8 (allay, murciélago, loro, happy_ghast, phantom, vex, breeze, abeja)
- Acuáticos: 10 (bacalao, salmón, pez_tropical, pez_globo, delfín, nautilus, calamar, calamar_brillante, ahogado, nautilus_zombi, guardián)
- A saltos: 4 (conejo, rana, slime, breeze)

### Historial git

- **101 commits** (desde 2019-07-11)
- 68 commits de mobs individuales (3–10 días entre cada uno, Sep 2019 – Nov 2020)
- Commits recientes: biomas, cielo, esqueletos (Jul 2026)
- Convención de mensajes: `feat()`, `docs()`, `fix()` con descripciones en español

---

## 13. Observaciones Técnicas

### Aciertos de diseño

1. **Modularidad pura**: los módulos sin DOM (`math.js`, `noise.js`, `worldgen.js`, `blocks.js`, `world.js`, `mesher.js`, `player.js`, `mobs.js`) se prueban en Node sin mocking. Esto es una decisión excelente que rara vez se ve en juegos JS, donde el código tiende a acoplarse al navegador.

2. **Determinismo independiente del orden**: el uso de `hashSeed(semilla, cx, cz, sal)` en lugar de un RNG secuencial garantiza que las features (cuevas, árboles, vetas) sean idénticas independientemente de cuándo se genere un chunk. Esto permite streaming asíncrono sin preocuparse por el estado global.

3. **Chunks no generados como barrera física**: `solidAt()` devuelve `true` para chunks vacíos, evitando que el jugador se adelante a la generación y caiga al vacío. Técnica del Minecraft real.

4. **Vecindario 3×3 para mallado**: `meshable(cx, cz)` requiere que los 8 vecinos también estén generados. Esto permite la oclusión ambiental y el culling de caras en bordes de chunk, eliminando costuras visuales.

5. **Agua local**: llenado por columna hasta el nivel del mar, sin flood fill global. Es la solución correcta para mundos infinitos (no hay bordes desde los que inundar).

6. **Assets procedurales**: cero dependencias de terceros, cero preocupaciones de copyright. El PRNG determinista asegura que las texturas se vean idénticas en cada carga.

7. **Ciclo de vida de mobs completo**: aparición por hábitats + biomas, IA por estados, daño, muerte, desaparición y flechas que se clavan. 68 mobs con comportamientos distintivos es un logro significativo para un motor propio.

8. **Calibración de biomas con datos reales**: los umbrales de temperatura/humedad se ajustaron midiendo la distribución real de los ruidos fractales, no usando rangos teóricos. Esto evita biomas que nunca aparecen.

### Áreas de mejora potencial

1. **Física de fluidos**: el agua y la lava no fluyen ni se propagan (relleno estático al generar). Para un comportamiento dinámico, se necesitaría propagación por chunks con BFS/DFS, similar a la de Minecraft.

2. **Multijugador**: documentado como futuro, con WebRTC + servidor de señalización. Sería el salto más grande en complejidad.

3. **Ranuras múltiples de guardado**: actualmente solo hay una partida (`META_KEY = 'default'`). Múltiples ranuras requerirían cambios en el esquema de IndexedDB.

4. **Internacionalización**: la interfaz está en español estático. La documentación menciona traducciones como área que necesita ayuda.

5. **Render de agua/lava**: el agua y lava se renderizan, pero sin animación de ondas ni fluencia visual. El shader de agua es el mismo que el sólido con blending.

6. **Sombreado dinámico**: la luz es precalculada en el mallado (sombras de columna + AO). Minecraft real tiene iluminación que se propaga dinámicamente al colocar/romper bloques.

7. **Partículas**: el juego carece de sistema de partículas (rotura de bloques, explosiones, etc.). Solo se muestra una viñeta roja al recibir daño.

---

## 14. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     index.html                           │
│              (Shell HTML + overlays HUD)                 │
└────────────────────┬────────────────────────────────────┘
                     │ <script type="module">
                     ▼
┌──────────────────────────────────────────────────────────┐
│                     main.js                              │
│           (Orquestación + bucle de juego)                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   frame(now) → simulate(dt) + draw()                │ │
│  │   streaming: pumpGeneration + unloadFar             │ │
│  │   input: teclado, ratón, pointerlock                │ │
│  │   hooks: damagePlayer, mobHooks                     │ │
│  └─────────────────────────────────────────────────────┘ │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│player│ │world│ │mobs│ │hud │ │audio│ │sky │ │atlas│ │math│
│  JS │ │ JS │ │ JS │ │ JS │ │ JS │ │ JS │ │ JS │ │ JS │
│ │   │ │ │ │ │ │   │ │   │ │   │ │   │ │ │   │ │   │
│física│ │chunks│ │IA  │ │ HUD│ │WebA│ │sol/│ │texs│ │mat │
│rayca │ │RLE  │ │spaw│ │hotb│ │udio│ │luna│ │proc│ │4x4 │
└──────┘ │ │   │ │   │ └────┘ └────┘ └────┘ └────┘ └────┘
         │ │   │ │   │
         ▼ ▼   ▼ ▼   ▼
    ┌────────┐ ┌──────────┐ ┌──────────┐
    │mesher  │ │worldgen  │ │storage   │
    │  JS   │ │   JS     │ │   JS     │
    │culling │ │generador │ │IndexedDB │
    │AO, luz │ │features  │ │RLE       │
    └────────┘ └────┬─────┘ └──────────┘
                    │ Worker (bg)
                    ▼
           ┌────────────────┐
           │ worldgen.worker│
           │      .js      │
           └────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────────┐
    │              renderer.js                  │
    │          (WebGL2 + shaders)               │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
    │  │ malla    │ │ niebla   │ │ astros   │  │
    │  │ chunks   │ │ día/noche│ │ billboard│  │
    │  └──────────┘ └──────────┘ └──────────┘  │
    └──────────────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────────┐
    │            mobrender.js                   │
    │  (partes-caja + piel + animaciones)       │
    └──────────────────────────────────────────┘
```

### Dependencias entre módulos (acíclicas)

```
main.js
 ├── math.js
 ├── noise.js
 ├── atlas.js ← noise.js
 ├── blocks.js ← atlas.js
 ├── world.js ← blocks.js
 ├── mesher.js ← blocks.js, world.js, atlas.js
 ├── worldgen.js ← noise.js, blocks.js, biomes/map.js
 ├── worldgen.worker.js ← worldgen.js
 ├── renderer.js ← sky.js
 ├── sky.js ← noise.js, math.js
 ├── player.js ← blocks.js, math.js
 ├── mobs.js ← blocks.js, player.js, noise.js, math.js, biomes/map.js
 ├── mobrender.js ← mobs/model.js, mobs/skin.js, math.js
 ├── hud.js ← atlas.js
 ├── audio.js
 └── storage.js ← world.js
```

---

## 15. Guía para Desarrolladores

### Cómo ejecutar

1. Servir con cualquier HTTP estático (XAMPP, Python HTTP server, etc.)
2. Abrir en navegador con WebGL 2 (Chrome, Firefox, Edge)
3. En XAMPP: apuntar el vhost a `C:\xampp\htdocs\Minecraft`

### Cómo ejecutar tests

```bash
cd /ruta/a/Minecraft
node --experimental-vm-modules test/smoke.mjs
node --experimental-vm-modules test/mobs.mjs
node --experimental-vm-modules test/biomes.mjs
```

### Cómo añadir un mob

1. Crear `js/mobs/<id>.js` siguiendo el contrato de `model.js` (ejemplo canónico: `cerdo.js`)
2. Validar con `node --experimental-vm-modules test/validate-mob.mjs <id>`
3. Importar e incluir en `js/mobs/registry.js`
4. Ejecutar `node --experimental-vm-modules test/mobs.mjs` para verificar que la suite completa sigue en verde

### Cómo añadir un bioma

1. Crear `js/biomes/<id>.js` siguiendo el contrato de `model.js` (ejemplo canónico: `llanura.js`)
2. Validar con `node --experimental-vm-modules test/validate-biome.mjs <id>`
3. Incluir en `js/biomes/registry.js` en la posición correcta del orden de selección
4. Ejecutar `node --experimental-vm-modules test/biomes.mjs`

### Convenciones del proyecto

- **Idioma**: documentación y código en español (nombres de variables, funciones, comentarios)
- **Commits**: `feat(scope): descripción` o `docs(scope): descripción` o `fix(scope): descripción`
- **Documentación**: .md, nunca .txt
- **Módulos ES**: export/import nativos, sin transpilación
- **Tests**: los módulos puros se importan en Node; los que necesitan DOM se validan por importación
- **Assets**: cero archivos binarios — todo es procedural

### Áreas que necesitan ayuda (del README)

- Tests unitarios y de integración para mobs
- Reportes de bugs en la IA de los mobs
- Mejoras en documentación técnica
- Traducciones de la interfaz
- Nuevas texturas procedurales

---

## 16. Conclusiones

VoxelCraft es un proyecto de ingeniería de software notable por varias razones:

1. **Independencia total**: sin librerías, sin frameworks, sin engines, sin assets externos. Es código 100% original desde el PRNG hasta el shader GLSL. Esto es extremadamente raro en el desarrollo de juegos moderno y demuestra un profundo dominio técnico.

2. **Madurez del motor**: el sistema de chunks, el mallado con AO, la iluminación precalculada, el streaming asíncrono con Web Worker, la compresión RLE para guardado, y el sistema de IA por estados son características que muchos prototipos de vóxeles nunca llegan a implementar.

3. **Escala**: 68 mobs con comportamientos distintivos, 14 biomas climáticos, 62 tipos de bloque, 5 suites de prueba con 212 comprobaciones automatizadas — todo funcionando en un navegador sin backend.

4. **Arquitectura limpia**: la separación entre módulos puros (testeables en Node) y módulos de render (que necesitan DOM) es ejemplar. El flujo de datos es unidireccional y acíclico.

5. **Profesionalismo**: pruebas automatizadas, documentación técnica detallada, changelog histórico, convenciones de commit, y un README con secciones de contribución y licencia.

No es "otro clon de Minecraft más" — es un motor de vóxeles original con personalidad propia, construido con principios de ingeniería sólidos y un nivel de calidad que lo diferencia de la mayoría de proyectos indie de su tipo.

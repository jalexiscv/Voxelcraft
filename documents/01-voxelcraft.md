# VoxelCraft: Juego Propio

## Descripción

**VoxelCraft** (raíz del proyecto, servido en `http://minecraft.local/`, v0.5.0) es un juego de vóxeles de **mundo infinito escrito desde cero**: **código propio, modular y reutilizable** — ~10 700 líneas en 87 módulos ES sin build ni dependencias externas — con **assets 100 % procedurales** (texturas y pieles generadas píxel a píxel, sonido y voces sintetizados con WebAudio), por lo que no contiene ningún material de terceros.

## Arquitectura

```
Minecraft/ (raíz del proyecto)
├── index.html               <-- Shell + overlays del HUD (menú, selector, progreso)
├── css/style.css            <-- Estilos del HUD
├── test/                    <-- Suites en Node (ver «Verificación»)
└── js/
    ├── main.js              <-- Integración y bucle de juego (rAF)
    ├── math.js              <-- Matrices 4×4 y utilidades (column-major, WebGL)
    ├── noise.js             <-- PRNG Park–Miller, Perlin 2D, fractal, distorsión
    ├── blocks.js            <-- Registro de 63 tipos de bloque (fuente de verdad)
    ├── atlas.js             <-- Atlas de texturas procedural (Canvas 2D) + nubes
    ├── world.js             <-- Mundo infinito: mapa disperso de chunks + alturas de luz
    ├── worldgen.js          <-- Generator por chunk (módulo puro, testeable)
    ├── worldgen.worker.js   <-- Web Worker: sirve chunks bajo demanda
    ├── storage.js           <-- IndexedDB: persiste solo los chunks editados
    ├── mesher.js            <-- Chunk → triángulos (culling, AO, luz por vértice)
    ├── renderer.js          <-- WebGL2: shaders, niebla, día/noche, nubes, selección
    ├── sky.js               <-- Sol y luna: arco celeste, fases y crepúsculos
    ├── player.js            <-- Física AABB, natación, vuelo y raycast DDA
    ├── audio.js             <-- Sonido, voces de mobs y música generativa (WebAudio)
    ├── inventory.js         <-- Inventario de supervivencia (puro, testeable)
    ├── items.js             <-- Herramientas y recetas de crafteo (puro)
    ├── drops.js             <-- Drops: cubitos flotantes de bloques rotos (puro)
    ├── hud.js               <-- Hotbar, selector, corazones de salud, depuración
    ├── mobs.js              <-- Mobs: IA, física, aparición, flechas y explosiones
    ├── mobrender.js         <-- Render WebGL de mobs (partes-caja animadas)
    ├── mobs/                <-- Contrato (model/skin/registry) + 68 definiciones
    └── biomes/              <-- Contrato (model/map/registry) + 14 biomas
```

Dependencias entre módulos (siempre acíclicas): `main` orquesta; `blocks` ← `atlas` ← `noise`; `mesher` ← `blocks`/`world`; `worldgen` ← `noise`/`blocks`. `worldgen.js`, `noise.js`, `world.js`, `mesher.js`, `player.js` y `math.js` son puros (sin DOM) y se prueban en Node.

## Decisiones técnicas

*   **Sin build ni dependencias**: módulos ES nativos servidos tal cual; el "framework" de render es WebGL2 directo (~300 líneas).
*   **Mundo infinito por chunks**: mapa disperso de chunks de 16×16×64 generados bajo demanda alrededor del jugador (distancia de render 4/6/8 + 1 de margen), mallados cuando su vecindario 3×3 está completo, y descargados al alejarse (las mallas primero; los datos no editados después — se regeneran de la semilla). Los chunks no generados actúan como barrera física y la niebla oculta el borde de generación. Coordenadas ilimitadas, negativos incluidos (`x >> 4`, `x & 15`).
*   **Determinismo independiente del orden**: el terreno es una función global pura de (semilla, x, z) y las features usan RNG sembrado por posición (`hashSeed(semilla, cx, cz, sal)`); las cuevas y árboles que cruzan bordes se re-simulan desde los chunks vecinos escribiendo solo la porción local — el mismo chunk es idéntico se genere cuando se genere (verificado en la suite).
*   **Iluminación**: sombreado por cara + sombra de columna (luz solar) + **oclusión ambiental por vértice** — todo precalculado en el mallado, sin coste por fotograma.
*   **Assets procedurales**: cada tésela de 16×16 se pinta píxel a píxel con el PRNG determinista; los pasos y la música (acordes pentatónicos suaves) se sintetizan con WebAudio. Cero archivos binarios.
*   **Generación en Web Worker** (~2–11 ms por chunk). El mapa de alturas usa el modelo paramétrico del Minecraft moderno (1.18): un ruido de **continentalidad** (~120 bloques) decide el tipo de terreno mediante una spline (océano → playa → llanura → altiplano) y regula la amplitud del relieve (montañas solo tierra adentro), con distorsión de dominio en bloques (±6). Las features clásicas del género — cuevas por gusanos, vetas, playas, flora y árboles — se generan por chunk con RNG sembrado por posición; el agua se llena por columna hasta el nivel del mar (un mundo infinito no tiene bordes desde los que inundar). Criterios de calidad en la suite: Δh medio < 0,6 y sin costuras entre chunks.
*   **Persistencia en IndexedDB**: solo se guardan los chunks editados por el jugador (RLE ~4 % del bruto) más los metadatos; el resto del mundo se regenera de la semilla al volver a explorar.

## Funcionalidad

| Función | Estado |
|---|---|
| Mundo ♾️ **infinito**: se genera al explorar | ✅ |
| Generación procedural con progreso, semilla y distancia de render elegibles | ✅ |
| Romper/colocar bloques, selector, hotbar, rueda del ratón, clic central para copiar | ✅ |
| Física, salto, natación, sprint y vuelo | ✅ |
| Agua/lava, cuevas, menas, árboles, flores | ✅ |
| Sonidos de pasos/bloques y música generativa (sintetizados, sin archivos) | ✅ |
| Guardar/cargar mundo (IndexedDB, solo chunks editados) | ✅ |
| Ciclo día/noche, niebla, nubes, oclusión ambiental | ✅ |
| Sol y luna con fases y resplandor crepuscular | ✅ |
| 14 biomas climáticos (materiales, vegetación y mobs por bioma) | ✅ (ver [03-biomas.md](03-biomas.md)) |
| Modos de juego (Supervivencia/Creativo) y dificultad (Normal/Pacífica) elegidos al crear el mundo | ✅ |
| Inventario de supervivencia (romper recolecta, colocar consume) y acceso total en Creativo | ✅ |
| Dureza por material: los bloques exigen uno o varios golpes (instantáneo en Creativo) | ✅ |
| Drops: los bloques rotos flotan como cubitos 3D y se recogen al acercarse | ✅ |
| Crafteo clásico por cuadrícula: inventario 2×2 (E), mesa de crafteo colocable 3×3, recetas con forma y recetario con autocolocado | ✅ |
| Depuración (F3), reaparición (R) | ✅ |
| Mobs (68 criaturas con IA), salud y combate | ✅ (ver [02-mobs.md](02-mobs.md)) |
| Multijugador | ❌ (ver «Futuro») |

## Verificación

Tres suites en Node desde la raíz del proyecto: `node test/smoke.mjs` (motor), `node test/mobs.mjs` (mobs, 121 comprobaciones; ver [02-mobs.md](02-mobs.md)) y `node test/biomes.mjs` (biomas, 42 comprobaciones; ver [03-biomas.md](03-biomas.md)). La de humo (74 comprobaciones, todas en verde el 2026-07-04) cubre: determinismo por chunk e **independencia del orden de generación**, coordenadas negativas, distribución de bloques (hierba/agua/menas/árboles/cuevas), coherencia del terreno **a través de bordes de chunk** (sin costuras), barrera física de chunks no generados, invariantes del mallado, raycast, física (aterrizaje, salto 1–1,5 bloques) y RLE por chunk. Los módulos con dependencia de navegador se validan por importación. La experiencia visual/jugable se prueba manualmente en `http://minecraft.local/`.

## Futuro

*   Multijugador WebRTC con servidor de señalización propio (p. ej. PHP/WebSocket en XAMPP).
*   Agua/lava con propagación, físicas de arena/grava al caer.
*   Ranuras múltiples de guardado y exportación a archivo.

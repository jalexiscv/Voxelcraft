# Mano en primera persona: brazo, objeto en mano y animaciones de golpe

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Jugador > Render

## Descripción

El usuario reportó que las manos del personaje sosteniendo o golpeando
objetos no eran visibles, y pidió que se vieran como en el Minecraft
original. No existía ningún «viewmodel»: el juego jamás dibujaba nada en
primera persona. Se crea el módulo completo, calcado del aspecto y las
curvas de animación del ItemRenderer clásico (1.8):

- **Mano vacía**: el brazo del jugador (caja 4×12 px con piel procedural
  determinista) cruza en diagonal desde la esquina inferior derecha.
- **Bloque en mano**: el cubo con sus téselas top/side/bottom girado 45°,
  abajo a la derecha (se ven dos caras y un asomo de la superior).
- **Ítem en mano** (herramientas, comida, materiales) y bloques-plano
  (flores, antorcha, hierba alta, puerta): el sprite de 16×16 **extruido a
  3D píxel a píxel** desde el alfa del atlas (caras frontal/trasera con
  recorte alfa + una pared por borde píxel↔transparente con el color del
  propio píxel), sostenido en diagonal — la técnica del MC original.
- **Animaciones**: golpe con las curvas clásicas `f = sin(p²·π)` y
  `f1 = sin(√p·π)` (traslación de uso + rotaciones Y/Z/X, el «hachazo»);
  cambio de ítem (la mano baja 0,6 u, intercambia y sube); balanceo
  pendular al caminar ligado a la velocidad; el clic izquierdo siempre
  sacude el brazo y el derecho solo al lograr una acción (comer, colocar,
  labrar, sembrar, puerta, cama), como en el MC real.
- **Luz local**: la mano se oscurece en cuevas y de noche y se ilumina
  junto a antorchas, con el mismo muestreo que usan los mobs
  (`sunlit`/`blockLightAt` en la posición del ojo).
- Se dibuja tras el fotograma del mundo limpiando solo el búfer de
  profundidad: nunca se incrusta en las paredes.

## Tipo de Cambio

- `Agregado` (viewmodel) / `Corregido` (crash al cerrar puertas)

## Archivos Afectados

### [NUEVO] `js/viewmodel.js`
- Geometría pura y probable en Node: `blockMesh` (cubo con sombreado por
  cara), `spriteMesh` (extrusión píxel a píxel de una tésela del atlas),
  `armMesh`/`armTexture` (brazo con piel procedural) y `handMatrix`
  (cadena de pose/animación por tipo: `arm`/`block`/`sprite`).
- Clase `ViewModel`: programa GL propio (sin niebla; luz = sombreado por
  cara × luz local), caché de mallas por id, estado de golpe/equipado/
  balanceo y render sobre el fotograma con limpieza de profundidad.

### [MODIFICADO] `js/main.js`
- Instancia el `ViewModel` con los píxeles del atlas (para extrusiones).
- `doAction`: sacudida del brazo en el clic izquierdo (siempre) y en las
  acciones de uso que prosperan; `enManoActual()` resuelve el id efectivo
  (en supervivencia una ranura sin existencias es mano vacía).
- `simulate` avanza las animaciones; `draw` dibuja la mano con la luz
  local del jugador (misma técnica que el brillo de los mobs).
- **Corregido de paso**: `game.player.pos` → `player.pos` al cerrar una
  puerta (`game` no tiene propiedad `player`: cerrar una puerta lanzaba
  un `TypeError` y el clic se perdía).

### [MODIFICADO] `js/math.js`
- `mat4Scale` (faltaba; lo usa la cadena de pose del viewmodel).

### [NUEVO] `test/viewmodel.mjs`
- 20 pruebas puras: contadores/límites de la geometría, extrusión con
  atlas sintético (tésela llena y de un píxel), piel determinista y pose
  proyectada a NDC (bloque/puño en el cuadrante inferior derecho, golpe
  que desplaza, equip que hunde la mano, hombro fuera de pantalla).

### [NUEVO] `test/viewmodel-gl.html`
- Verificación WebGL real (headless): compila los shaders, dibuja los
  cinco casos (brazo, bloque, ítem, planta, puerta) y comprueba píxeles
  pintados y `gl.getError()`; `?solo=` y `?golpe=` para inspección visual.

## Impacto

- La primera persona por fin «tiene cuerpo»: se ve el brazo al ir a
  puños, el bloque o la herramienta en mano, y cada acción golpea con el
  arco clásico. Verificado en headless (Edge + SwiftShader): capturas de
  brazo, bloque de hierba, pico de hierro, flor y golpe a medio arco.
- Cerrar puertas vuelve a funcionar (crash preexistente corregido).
- Suites: smoke 247, mobs 124, biomas 42, aldeas 62 y viewmodel 20, en verde.

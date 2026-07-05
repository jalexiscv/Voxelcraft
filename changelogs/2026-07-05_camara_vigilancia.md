# Cámara de vigilancia: bloque dinámico animado con barrido y LED

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Motor / Bloques

## Descripción

Bloque nuevo a petición del usuario: una **cámara de vigilancia** (id 86)
detallada que barre el perímetro y parpadea. Estrena la categoría de
**bloques dinámicos**: el bloque no emite malla estática en el chunk —
se dibuja cada frame como entidad de partes-caja con el pipeline de los
mobs, anclada a su celda.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [AGREGADO] `js/camaras.js`
- Modelo de **13 partes** en pixel art procedural propio: placa base con
  4 tornillos, poste y brazo con cable pintado, rótula, cabezal 5×5×8 con
  visera en voladizo, aro + lente concéntricos (azul noche con destello),
  rejillas laterales y LED. Piel 64×64 sin solapes UV con **2 variantes**
  idénticas salvo el rect del LED (apagado/encendido).
- **Barrido**: seno de período 8 s con sobremarcha recortada → ±70°
  exactos con pausa natural en los extremos, más cabeceo fijo de 15°;
  va por el `headYaw` de la anim `head` existente (cero cambios al
  sistema de animación). **LED**: encendido 0,15 s cada 1,2 s eligiendo
  variante por tiempo (el parpadeo es un cambio de textura).
- `CamaraSystem`: rastreo barato (escaneo al llegar cada chunk, baja al
  descargarse, alta/baja puntual en romper/colocar), render como
  entidades falsas junto a los mobs (`buildType` + `render` de siempre).

### [MODIFICADO] `js/blocks.js`, `js/atlas.js`, `js/mesher.js`, `js/player.js`, `js/main.js`, `js/hud.js`, `js/items.js`
- Flag nuevo `dinamico`: el mesher lo salta y el raycast lo golpea (se
  puede apuntar y picar; no colisiona, como la antorcha). Tésela 133 solo
  para el icono del HUD/selector. Receta en mesa 3×3: 5 lingotes de
  hierro en marco, cristal al centro y palo como poste → 1 cámara.
  Se pica a piedra (dureza 3, pico) y suelta su bloque.

### [MODIFICADO] `test/smoke.mjs`, `documents/01-voxelcraft.md`, `documents/04-items.md`
- Tanda «Cámara de vigilancia» (25 comprobaciones: flags, sin malla
  estática, raycast la golpea, 13 partes válidas sin solapes UV,
  variantes que difieren solo en el LED, barrido puro y periódico con
  extremos ±70°, receta): suite 222 → **247**. Recuentos a 87 tipos.

## Impacto

- Primer bloque dinámico del motor: la infraestructura (flag + rastreo +
  render por entidades) queda lista para futuros bloques animados.
- Suites en verde: smoke 247, mobs 124, biomas 42, aldeas 62.

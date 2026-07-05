# Agricultura: labranza, cultivos con etapas, cosecha y cocina

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Juego

## Descripción

Sistema completo de agricultura construido por un workflow de 5 agentes en
4 fases (bloques/atlas → items/recetas → mecánica + botín → verificación),
según el diseño registrado en `documents/04-items.md`.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/blocks.js`, `js/atlas.js`
- 13 bloques nuevos (71-83): tierra labrada (sólida, top de surcos húmedos,
  solo la crea la azada) y las etapas 0-3 de trigo, zanahoria y patata como
  bloques en cruz — **la etapa es el id**, así que la persistencia con el
  guardado de chunks sale gratis. 22 téselas de pixel art procedural nuevas
  (110-131), incluida la factoría `azadaTile` al estilo de las demás
  herramientas.

### [MODIFICADO] `js/items.js`
- Items 231-239: semillas de trigo, trigo, pan (alimento 5), zanahoria
  (3, plantable), patata (1, plantable), patata asada (5) y azadas de
  madera/piedra/hierro. Recetas: pan = 3 trigos en fila; azadas con el
  patrón clásico (2 material + 2 palos, con espejo). Fundición nueva:
  patata → patata asada.

### [AGREGADO] `js/farming.js` · [MODIFICADO] `js/main.js`
- Lógica pura: `esCultivo/etapaDe/maduro/siguienteEtapa/plantaDe/cosechaDe`
  y `tickCultivos` (muestreo aleatorio por chunk cargado cada ~3 s;
  probabilidad ~1/12 por muestreo, **×2 con agua a ≤4 bloques** — riego).
- Integración en el juego: labrar con azada (clic derecho), sembrar sobre
  tierra labrada con **prioridad de plantar sobre comer** (zanahoria y
  patata son ambas cosas), cosecha como drops (maduro = botín completo;
  inmaduro = la unidad replantable), la hierba alta suelta semillas (40 %).

### [MODIFICADO] `js/mobs/zombi.js`, `js/mobs/husk.js`, `js/mobs/ahogado.js`
- Botín raro (5 %) de zanahoria y patata: la fuente inicial de esos
  cultivos fuera de las aldeas.

### [MODIFICADO] `test/smoke.mjs`
- Tanda «Cultivos» con 33 comprobaciones (ids y flags exactos, lógica de
  farming, crecimiento real sobre un mundo de prueba, receta del pan,
  fundición y azadas): suite 103 → 136.

## Impacto

- La comida gana una fuente renovable y el ciclo clásico
  labrar→sembrar→regar→cosechar→cocinar queda completo.
- Suites en verde: smoke 136, mobs 122, biomas 42.

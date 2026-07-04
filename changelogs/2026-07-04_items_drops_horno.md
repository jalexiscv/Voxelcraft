# Ecosistema de items: botín de mobs, horno con fundición y armas

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Juego / Items

## Descripción

Plan en `documents/04-items.md` (subconjunto propio de ~30 items adaptado a
los sistemas de VoxelCraft) e implementación por olas: infraestructura del
orquestador + fan-out de 9 agentes en paralelo (8 lotes de mobs y la
interfaz del horno).

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/items.js`, `js/atlas.js`
- 24 items nuevos con sprites procedurales propios: materiales de mobs
  (cuero, pluma, carnes, hueso, hilo, pólvora, perla, bola de slime, tinta,
  peces, escama, membrana), carbón, lingotes, herramientas de hierro (×4) y
  espadas de 3 niveles (daño 5/6/8; el puñetazo queda en 4).
- `FUNDICIONES` (7 recetas de horno), `COMBUSTIBLES` (usos por unidad) y
  `fundir()` puro; recetas de crafteo nuevas (horno en anillo, espadas,
  nivel de hierro) y valores `food` en la comida.

### [MODIFICADO] `js/mobs.js`, `js/mobs/*.js` (53 defs), `test/validate-mob.mjs`
- Al morir, el mob suelta su tabla `drops` (validada: ids existentes,
  rangos 0..8, chance en (0,1]); solo en supervivencia (hook en main).

### [MODIFICADO] `js/renderer.js`, `js/drops.js`, `js/main.js`
- Los items caen como sprites planos en X girando; la mena de carbón suelta
  carbón; la espada en mano aplica su daño al golpear mobs.

### [MODIFICADO] `js/blocks.js`, `js/hud.js`, `index.html`, `css/style.css`
- Bloques funcionales: horno (interfaz de fundición por sesión con entrada,
  combustible con usos y salida), puerta con dos estados (clic derecho),
  valla, ventana, antorcha y cama que salta la noche.

## Impacto

- El bucle recolectar → fabricar → fundir → combatir queda completo.
- Suites en verde tras la ola: smoke 80, mobs 122, biomas 42.

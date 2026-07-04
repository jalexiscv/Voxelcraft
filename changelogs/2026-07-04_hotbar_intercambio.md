# Corrección de la hotbar del crafteo: intercambio real y punteros únicos

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz

## Descripción

Reporte del usuario: al hacer clic en una ranura de la hotbar (dentro de la
pantalla de crafteo) con un material en mano, el contenido se REEMPLAZABA en
lugar de intercambiarse, y varias ranuras terminaban «clonadas» con el mismo
material. Causa: las ranuras de la hotbar son punteros a un material (las
cantidades viven en el inventario), y el clic sobrescribía el puntero sin
intercambiar ni comprobar duplicados: nueve ranuras podían apuntar a la
misma flor, mostrando todas la misma cantidad.

## Tipo de Cambio

- `Corregido`

## Archivos Afectados

### [MODIFICADO] `js/hud.js`
- Nuevo `assignSlot(i, id)` como única vía de asignación (usado por la
  hotbar del crafteo, el selector B y el clic central): mantiene ÚNICOS los
  punteros de la barra — si otra ranura ya tenía ese material, ambas
  **intercambian lugar**; nunca hay dos ranuras con el mismo material.
- Clic con material en mano: **intercambio clásico** — la ranura recibe el
  material y la mano toma el desplazado (si hay existencias); si el material
  ya estaba en la barra, las dos ranuras se intercambian y la mano se vacía.

## Impacto

- El manejo de la hotbar se comporta como el intercambio clásico esperado y
  desaparecen los «clones». Sin cambios en inventario ni cantidades (nunca
  se duplicaron unidades: era duplicación de punteros).
- Suites en verde: smoke 75, mobs 122; verificación jugable en el navegador.

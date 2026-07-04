# Crafteo clásico por cuadrícula: inventario 2×2, mesa 3×3 y recetas con forma

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Interfaz / Juego

## Descripción

La mesa de crafteo deja de ser una lista con botones y adopta el **método
clásico por cuadrícula**: la tecla E abre la pantalla de inventario con una
cuadrícula personal de **2×2**, y la nueva **mesa de crafteo** (bloque
colocable) abre la de **3×3** al usarla con el clic derecho. Las recetas de
herramientas exigen **colocar los ingredientes con su forma** (la T del
pico, admitiendo el espejo), y el manejo de items pasa a ser directo: se
toma un material «en mano» (icono que sigue al puntero), se coloca celda a
celda, y el producto aparece en la ranura de resultado.

## Tipo de Cambio

- `Cambiado` / `Agregado`

## Archivos Afectados

### [MODIFICADO] `js/items.js`
- Recetas **con forma** (`pattern` + `keys`): mesa (2×2 de tablones), picos
  (fila superior + mango), hachas (esquina + mango, con espejo válido) y
  palas (columna); tablones, palos, cristal y librería siguen sin forma
  (solo cantidades). `in` se deriva del patrón automáticamente.
- `matchGrid(cells, w)`: normaliza la cuadrícula a su caja mínima y la
  compara con cada receta (patrón, su espejo, o multiconjunto de
  cantidades). `autoColocar(recipe, w, inv)`: coloca la receta si cabe y
  las existencias alcanzan (motor del recetario).

### [MODIFICADO] `js/blocks.js`, `js/atlas.js`
- Bloque 62 `CRAFTING_TABLE` con téselas propias (tapa con cuadrícula
  marcada, costado de tablones con herramientas colgadas).

### [MODIFICADO] `js/hud.js`, `index.html`, `css/style.css`
- Pantalla de inventario/mesa: cuadrícula de crafteo, ranura de resultado
  (se ilumina cuando la disposición casa y fabrica al clic, con
  fabricación en cadena si alcanzan los materiales), existencias con
  cantidades, fila de hotbar (asignar con el material en mano) y
  **recetario** lateral que autocoloca los ingredientes al clic (indica
  cuándo una receta necesita la mesa).
- Material «en mano» como icono flotante que sigue al puntero; al cerrar
  la pantalla, lo colocado en la cuadrícula vuelve al inventario.

### [MODIFICADO] `js/main.js`
- E abre el inventario 2×2 (supervivencia); clic derecho sobre una mesa de
  crafteo colocada abre la 3×3 en lugar de colocar bloque (adaptación:
  para construir contra la mesa, apunta a otra cara).

### [MODIFICADO] `test/smoke.mjs`
- Ocho comprobaciones nuevas del matcher (forma, espejo, mala disposición,
  sin forma, autocolocado, límite 2×2) y recuento de bloques 62 → 63.
  Suite: 66 → 74.

## Ajuste de la misma sesión: disposición clásica del panel

Tras la primera versión, la pantalla se reorganizó a la disposición clásica
del género: etiqueta «Fabricación» sobre la cuadrícula con el **botón del
recetario** al costado (panel lateral conmutable), flecha y ranura de
resultado; «Inventario» como **rejilla fija de ranuras** (las vacías,
visibles; 3+ filas de 9) con la hotbar separada debajo; **tooltip flotante**
con el nombre del item bajo el puntero; y estética de banco de trabajo con
paleta propia (panel claro, ranuras hundidas con bisel, cantidades dentro de
la ranura). Todo con estilos y arte procedural del proyecto.

## Impacto

- El crafteo se siente como el método clásico del género: arrastrar
  materiales a la cuadrícula, ver aparecer el resultado y fabricar en
  cadena, con el recetario como atajo. La progresión ahora pasa por
  fabricar la mesa (4 tablones) antes de las herramientas (3×3).
- Suites en verde: smoke 74, mobs 121, biomas 42.

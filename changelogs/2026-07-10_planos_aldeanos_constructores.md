# Tres planos exclusivos de los aldeanos constructores (choza, estatua, huerto)

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Aldeas > Planos

## Descripción

Se añaden tres planos de construcción reservados a los futuros aldeanos
constructores: una choza rústica, una estatua conmemorativa y un huerto
regado. Se registran de modo que `PLANOS[id]` los resuelva por nombre pero
sin entrar en `LISTA_PLANOS`: ni el pool del worldgen ni el catálogo de
`/construir` los ven, y las invariantes existentes del registro (8
arquetipos, contrato con puerta) siguen intactas. La estatua y el huerto
quedan fuera de `test/validate-plano.mjs` por diseño (no tienen puerta);
la choza sí cumple el contrato completo.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/villages/planos/choza.js`
- Choza rústica 5×4×5 por roles de paleta: solera completa, muros con
  esquinas, puerta a −Z con vano doble, ventanas, antorcha interior y
  techo plano. Pasa `node test/validate-plano.mjs choza`.

### [NUEVO] `js/villages/planos/estatua.js`
- Estatua 3×7×3 en bloques literales: pedestal de `STONE`, grada en cruz
  de `COBBLE` con antorchas votivas, cuerpo y hombros de `COBBLE`, cabeza
  de `GOLD_BLOCK` y antorcha de remate. Sin puerta (fuera del validador).

### [NUEVO] `js/villages/planos/huerto.js`
- Huerto 5×3×7: bancales `FARMLAND` con canal central de `WATER` a lo
  largo, troncos de esquina, rol posicional `CULTIVO` sobre cada bancal y
  antorcha sobre un tronco. Toda celda de cultivo queda a ≤ 2 bloques del
  agua (el riego de `js/farming.js` exige ≤ 4). Sin puerta (fuera del
  validador).

### [MODIFICADO] `js/villages/planos/registry.js`
- Nuevo export `PLANOS_ALDEANOS = ['choza', 'estatua', 'huerto']` y
  registro de los tres como propiedades **no enumerables** de `PLANOS`:
  resuelven por id, pero `Object.keys/entries` (y con ellos el pool, el
  catálogo de `/construir` y la validación de conjunto de
  `test/villages.mjs`) siguen viendo solo los 8 arquetipos.

## Impacto

- Sin cambio funcional visible aún: los tres planos quedan a la espera de
  la IA de aldeanos constructores, que los pedirá por id.
- `test/villages.mjs` (64 OK) y `test/construcciones.mjs` (8 en verde)
  siguen al 100 % sin tocar `LISTA_PLANOS` ni las suites.

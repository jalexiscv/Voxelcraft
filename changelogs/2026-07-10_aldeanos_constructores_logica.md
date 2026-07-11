# Lógica pura de los proyectos de los aldeanos constructores

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Mobs > Aldeanos constructores

## Descripción

Nace `js/aldeanos.js`, el módulo puro con la lógica de los proyectos de los
aldeanos constructores: qué construir (sorteo ponderado entre choza, huerto
y estatua), dónde (búsqueda de solar llano, seco, natural y sin
construcciones ni árboles), en qué orden (plan de obra deduplicado que se
levanta de abajo arriba) y a qué ritmo (cadencia del oficio y punto de
acopio de materiales). Quien conduce al aldeano (mobs/main) queda para una
integración posterior: este módulo no toca ni el DOM ni el mundo — lee el
mundo por su API pública y el plan es una lista de celdas que otro aplica.

Reutiliza las piezas reales del juego: los planos del registro (incluido el
export `PLANOS_ALDEANOS` de los tres planos exclusivos), la caja rotada
(`cajaDePieza` de layout.js) y el estampado de la consola (`estampar` de
construcciones.js), usado aquí con un `set` recolector en vez de escritor.
El azar siempre llega inyectado como `rng` (PRNG de noise.js): misma
semilla ⇒ mismo proyecto, mismo solar y mismo plan.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/aldeanos.js`
- `PROYECTOS` (pesos 3/3/1) y `elegirProyecto(rng)`: sorteo ponderado con
  un solo `rng.float()`, acotado a lo que `PLANOS_ALDEANOS` declara.
- `buscarSolar(world, x0, z0, idPlano, rng, intentos = 12)`: candidatos a
  8..24 bloques con rotación sorteada y consumo de rng fijo por intento;
  valida la huella completa (chunk generado, superficie a ±1 de la cota,
  por encima de `SEA_LEVEL + 1`, suelo natural y solo aire o plantas hasta
  `y + alto`). Devuelve `{ pieza, caja }` o `null`.
- `planDeObra(pieza, biomaId, semilla)`: recolecta las escrituras de
  `estampar`, deduplica por celda (gana la última escritura) y ordena por
  y ascendente (a igual cota, por x y luego z); conserva el corte de aire.
- `RITMO` (cadencia de colocación, carga por viaje, descanso entre
  proyectos y radio de acopio) y `puntoDeAcopio(pieza, rng)`.

### [NUEVO] `test/aldeanos.mjs`
- 13 pruebas sobre el `World` real (3×3 chunks planos con la hierba en
  y = 139): pesos del sorteo (cortes exactos y frecuencias con el PRNG),
  solar hallado en terreno llano y negado en damero ±3, en la playa, y
  con bloques construidos (rejilla de adoquín); las plantas no vetan;
  plan ordenado, sin duplicados, dentro de la caja y con puerta, antorcha
  y corte de aire; punto de acopio a 6..12 bloques (holgura √2/2 del
  redondeo); determinismo; y los tres planos de los aldeanos (choza con
  solar, huerto con tierra labrada/agua/cultivo, estatua con oro).

## Decisiones de diseño

- **Reutilizar `estampar` como recolector** en vez de duplicar el bucle de
  estampado: el plan de obra hereda gratis las reglas reales (relleno,
  corte, paleta por bioma, puertas de dos hojas y cultivos posicionales).
- **Los solares solo se fundan sobre suelo virgen**: cualquier bloque que
  no sea aire ni planta (def.cross) por encima de la superficie veta la
  huella — troncos y hojas incluidos, más simple y no pisa nada construido.
- **Las celdas de aire permanecen en el plan**: son las que despejan la
  hierba y la vegetación del solar al ejecutarse la obra.

## Verificación

- `node --check` en verde (módulo copiado a .mjs en el scratchpad y test).
- `node test/aldeanos.mjs`: 13/13 en verde.
- `node test/construcciones.mjs`: 8/8 — la zona compartida sigue intacta.

## Impacto

- Sin cambios de comportamiento en el juego: módulo nuevo aún sin
  consumidores (la integración en el aldeano llega en un cambio aparte).
- No toca formato de guardado ni red.

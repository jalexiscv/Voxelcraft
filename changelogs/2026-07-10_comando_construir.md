# Comando /construir: construcciones prediseñadas desde la consola

**Fecha:** 2026-07-10
**Módulo:** VoxelCraft > Consola de comandos > Construcciones

## Descripción

La consola del chat gana el comando `/construir`: levanta frente al jugador
cualquiera de las construcciones prediseñadas del juego, materializándola
al instante en el mundo vivo. Sin argumento lista el catálogo; con nombre
(`/construir casa pequeña`, también sin acentos o por el id `casa_pequena`)
estampa el edificio a 2 bloques por delante, con la fachada —y su puerta—
mirando hacia el jugador, a la cota del suelo que pisa y con la paleta de
materiales del bioma en el que está (madera en llanura, arena en el
desierto, abeto en la taiga…).

El catálogo son los 8 planos reales del sistema de aldeas: Pozo, Casa
pequeña, Casa grande, Granja, Herrería, Biblioteca, Templo y Atalaya. No
hay planos duplicados: `/construir` reutiliza el registro
(`js/villages/planos/`), la caja rotada (`cajaDePieza`), la tabla de
rotación (`localDe`) y el cultivo posicional (`bloqueCultivo`) del sistema
de aldeas, así que un plano nuevo que entre al registro aparece solo en el
catálogo de la consola.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/construcciones.js`
- Módulo puro con el catálogo (`CONSTRUCCIONES`, nombres visibles en
  español sobre `LISTA_PLANOS`), la colocación (`colocacionDe`: rotación
  con la fachada opuesta a la mirada, huella centrada lateralmente y borde
  a 2 bloques) y el estampado vivo (`estampar`: relleno de DIRT, corte de
  aire, capas rotadas con la paleta del bioma, puertas de dos hojas y
  cultivos posicionales — las mismas reglas que `villages/build.js`).
- El estampado escribe por un callback `set(x, y, z, id)`: el módulo no
  conoce el mundo ni el DOM y es probable en Node.

### [MODIFICADO] `js/villages/build.js`
- `localDe` y `RELLENO` pasan a exportarse (sin cambio de comportamiento):
  una sola tabla de rotación y una sola profundidad de relleno para las
  aldeas y la consola.

### [MODIFICADO] `js/comandos.js`
- Comando `/construir [nombre]` con la misma búsqueda plegada
  (acentos/mayúsculas, prefijo o subcadena única, sugerencias ante
  ambigüedad) que `/dar` y `/aparecer`; el contexto gana
  `construir(idPlano) → {caja, alto} | null`.

### [MODIFICADO] `js/main.js`
- `ctxComandos.construir`: cardinal dominante de la mirada, cota del bloque
  que el jugador pisa, estilo por `game.biomas` en su posición, guardia de
  chunks generados (las 4 esquinas de la caja) y estampado con un `set` que
  descarta ediciones de no-op y reconcilia los bloques dinámicos
  (cámaras/latas) arrasados por el corte.

### [NUEVO] `test/construcciones.mjs`
- 8 pruebas del módulo puro: catálogo completo, rotación de fachada en los
  4 cardinales, caja delante sin pisar al jugador, puerta de dos hojas en
  el borde cercano, paleta por bioma, relleno/corte dentro de los límites,
  cultivos deterministas de la granja y estampado de los 8 planos.

### [MODIFICADO] `test/comandos.mjs`
- Prueba nueva de `/construir` (lista, nombre con acentos, id, ambigüedad,
  desconocido, terreno sin generar) y `/construir` añadido al contrato de
  `/ayuda`.

## Decisiones de diseño

- **Reutilizar los planos de aldea** en vez de crear planos propios de la
  consola: correcto (ya validados por `validate-plano` y la suite de
  aldeas), consistente (una sola fuente de arquetipos) y de diff mínimo.
- **El bucle de estampado se duplica deliberadamente** respecto a
  `estamparEdificio` (build.js): aquel escribe por índice local en el
  buffer de un chunk en generación con costura orden-independiente; este
  escribe por coordenadas de mundo en el mundo vivo. La geometría delicada
  (rotación y caja) sí se comparte vía exports. Deuda declarada: si
  apareciera un tercer materializador, tocaría extraer un núcleo común.
- **Disponible también en el mundo global**: los bloques ya son edición del
  cliente (viajan uno a uno por `world.onSet`, como el picado manual); el
  `set` descarta no-ops para acotar la ráfaga de mensajes.

## Verificación

- `node --check` en verde sobre los 4 JS tocados.
- `node test/construcciones.mjs`: 8/8; `node test/comandos.mjs`: 14/14;
  suites de la zona intactas (villages 62, smoke 318, biomas 42 — OK).
- E2E con Edge headless sobre el juego real: 8/8 — la lista del catálogo,
  el mensaje «Casa pequeña construida (5×5×5) frente a ti.», puerta de dos
  hojas en el borde cercano al jugador, antorcha, cama y cofre presentes en
  el mundo, y una Atalaya levantada con otro rumbo (mirada al este) tras
  girar el yaw; captura visual con ambas construcciones en pie y sin
  errores de página.

## Impacto

- Nueva capacidad de la consola sin cambios de formato de guardado (los
  bloques colocados marcan sus chunks como editados y persisten como
  cualquier edición del jugador).
- En el mundo global una construcción emite una ráfaga de ediciones de
  bloque (una por celda realmente cambiada) por el canal normal.

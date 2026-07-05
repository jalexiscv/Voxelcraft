# Aldeas: estudio y plan de generación procedural

## Descripción

Estudio del mecanismo de generación de aldeas del género y diseño del
sistema propio de VoxelCraft: **8 arquetipos de construcción** (estudiados y
diseñados por agentes en paralelo, uno por edificio, con planos 100 %
originales) y un algoritmo de trazado determinista compatible con nuestro
motor de chunks. Como todo en el proyecto, sin copiar estructuras ni datos
del juego original: se estudia el comportamiento documentado y se diseña de
cero.

## Cómo genera aldeas el juego que nos inspira (mecánica documentada)

*   Aparecen en biomas concretos (llanura, desierto, sabana, taiga, nevado);
    el bioma del **centro** decide el estilo arquitectónico completo.
*   La generación se ancla a un **punto de reunión** y crece por **piezas
    modulares conectables** (sistema de encaje): cada pieza ofrece puntos de
    conexión donde pueden acoplarse caminos y edificios compatibles.
*   Los **caminos** se extienden sobre el terreno reemplazando el suelo
    (tierra apisonada o arena según bioma), siguen la elevación y puentean
    agua con tablones.
*   Categorías funcionales: **viviendas**, **granjas**, **talleres de
    oficio** (herrería, biblioteca…), y el **punto de reunión** central.
*   Con la aldea aparecen sus habitantes (ligados a las camas), un gólem de
    hierro junto al punto de reunión, y un pequeño porcentaje de aldeas
    generan abandonadas (con zombis aldeanos).

## Nuestro algoritmo (diseño propio, determinista por celda)

El reto respecto a árboles/cuevas: una aldea (~60×60 bloques) excede el
radio de re-simulación por chunk vecino (radio 1). Solución: la aldea se
decide **por celda**, no por chunk de origen.

1.  **Celdas de aldea**: el mundo se divide en celdas de 8×8 chunks
    (128×128 bloques). `hashSeed(semilla, celdaX, celdaZ, SAL_ALDEA)`
    decide de forma pura: si hay aldea (~12 %), su chunk ancla dentro de la
    celda, el número de caminos (2-4) y la semilla local del trazado.
2.  **Requisitos del ancla**: bioma ∈ {llanura, sabana, desierto, taiga,
    nevado} en el centro, sobre el nivel del mar y con desnivel < 4 en el
    área del pozo. Si no se cumplen, la celda queda sin aldea (sin
    reintentos: determinismo).
3.  **Trazado**: el **pozo** en el ancla; caminos rectos en cruz (12-28
    bloques) cuyo suelo se reemplaza por el bloque de CAMINO del bioma;
    **parcelas** alternas a ambos lados cada 8-12 bloques; cada parcela
    sortea un edificio del pool con pesos (casa pequeña 4 · granja 3 ·
    casa grande 2 · herrería 1 · biblioteca 1 · templo 1 · atalaya 1; máximo
    uno de herrería/biblioteca/templo/atalaya por aldea) y una fachada
    orientada al camino.
4.  **Materialización multi-chunk**: al generar un chunk, se consulta su
    celda y las 8 adyacentes; toda aldea cuyo rectángulo lo toque se
    re-traza (barato: posiciones + planos) y se escriben SOLO los bloques
    que caen dentro del chunk — el mismo principio de costura que cuevas y
    árboles.
5.  **Aplanado por parcela**: cada edificio nivela su parcela a la altura de
    su ancla (relleno de tierra por debajo, corte por encima) antes de
    estampar el plano.
6.  **Habitantes**: los biomas de aldea ya listan `villager` e
    `iron_golem` en sus tablas diurnas; fase 2: sesgo de aparición hacia
    el pozo más cercano y variante abandonada (2 %: zombis aldeanos, sin
    antorchas).

## Formato de plano (contrato para los edificios)

```js
{ id, tam: [ancho, alto, fondo],
  clave: { 'M': 'MURO', 'P': 'DOOR_CLOSED', 'A': 'TORCH', ... },
  capas: [ /* alto capas, de suelo a techo; cada capa: fondo filas de
             ancho caracteres; '.' = aire */ ] }
```

Los valores de `clave` son **roles de paleta** (los resuelve el generador
por bioma), **roles posicionales** (`CULTIVO`: lo resuelve el materializador
por posición — familia y etapa deterministas por columna) o nombres
literales de bloque de `B`. La puerta mira siempre a −Z; el generador rota
el plano hacia el camino.

## Paleta de roles por bioma

| Rol | llanura/bosque | sabana | desierto | taiga | nevado |
|---|---|---|---|---|---|
| ESQUINA | LOG | ACACIA_LOG | LOG | SPRUCE_LOG | SPRUCE_LOG |
| MURO | PLANKS | PLANKS | SAND | PLANKS | PLANKS |
| TECHO | PLANKS | PLANKS | SAND | SPRUCE_LOG | SNOW |
| SUELO | COBBLE | COBBLE | SAND | COBBLE | PLANKS |
| CAMINO | DIRT | DIRT | SAND | DIRT | SNOW |

(Adaptación: sin arenisca, el desierto construye con arena — no hay física
de caída de bloques, así que es estable.)

## Los 8 arquetipos (estudio y planos de los agentes)

Cada arquetipo fue estudiado y diseñado por un agente dedicado. Los planos
completos (capas ASCII) viven como módulos de datos en
`js/villages/planos/*.js`; aquí, la función de cada edificio y las
decisiones de diseño.

### Pozo — punto de reunión (7×6×7)

El ancla social de la aldea: de él radian los caminos y a su alrededor se
colocan el resto de edificios. Lo identifican el agua accesible, el brocal
que la contiene y una luz elevada que marca el centro de noche. Diseño:
plaza pavimentada con valla perimetral y portillo a −Z, brocal 3×3
(esquinas/muros de paleta) con agua sobre fondo estanco, tejadillo sobre
cuatro postes de valla y **antorcha-faro cimera** que hace de «campana».

### Casa pequeña — vivienda mínima (5×5×5)

La célula básica: repetida, define la escala del asentamiento. Habitación
3×3 con cama (el «hogar»), cofre y antorcha; puerta centrada con vano de 2
de alto (el jugador mide 1,8), dos ventanas en fachada y una trasera para
luz cruzada; tejado a cuatro aguas escalonado (losa 5×5 + remate 3×3).

### Casa grande — vivienda familiar (11×6×9)

Su rasgo definitorio son las camas múltiples: eleva la «población» que la
aldea sostiene. Planta en L: salón al frente (mesa de crafteo, horno,
librería) y ala-dormitorio al fondo (dos camas, cofre). Puerta apilada en
dos alturas y techo plano escalonado que remarca la silueta en L.

### Granja — parcela de cultivo (9×3×9)

Infraestructura de alimento: parcela abierta, no edificio techado. Dos
bancales 3×5 de **tierra labrada con cultivos reales** — trigo, zanahoria y
patata en etapas variadas, resueltos por el rol posicional `CULTIVO`
(determinista por columna: la misma granja sale igual siempre) — y canal de
agua central que además los **riega** (acelera `tickCultivos`); cerca baja
con portillo, andenes interiores para no pisar los bancales, cofre de
cosecha y antorchas de entrada. (El diseño original aproximaba los
sembrados con hierba alta; al aterrizar la agricultura de
[04-items.md](04-items.md) pasaron a cultivos de verdad.)

### Herrería — taller de fundición (9×5×7)

El taller productivo: fuego, piedra y trabajo de cara a la calle. Sin lava
colocable, la fragua clásica se sustituye por **doble horno empotrado** en
el muro trasero del porche con chimenea de adoquín sobre el techo; porche
lateral abierto con suelo de adoquín literal (resiste al bioma), sala
cerrada con mesa de crafteo (hace de yunque) y cofre.

### Biblioteca — sala de lectura (9×6×8)

El edificio del saber. Muros forrados de librerías por dentro (BOOKSHELF
literal: es la seña del arquetipo), escritorio (mesa de crafteo) y archivo
(cofre) junto a los ventanales «para leer con luz», clerestorio de ventanas
altas en los laterales y antorchas apoyadas sobre el remate de las
estanterías. Tejado a dos aguas con hastiales.

### Templo — nave ceremonial (7×8×9)

No produce recursos: es hito visual y foco de la sala. Nave alargada con
luz cenital (ventanas solo en la franja alta), altar al fondo sobre tarima
de adoquín con **bloque de oro flanqueado por antorchas** (no hay soporte
de pociones), librerías con las escrituras y cofre de ofrendas. Con 8 de
alto es el edificio más alto salvo la atalaya.

### Atalaya — torre de vigilancia (5×10×5)

El hito vertical: desde su plataforma el vigía domina el perímetro. Garita
baja con cofre de suministros, fuste 3×3 con troneras y **chimenea interior
de 1×1** para subir apilando bloques (no existen escaleras), plataforma en
voladizo con parapeto de vallas, cuatro antorchas-faro y techo plano sobre
postes de esquina.

## Plan de implementación (fases)

1.  ✅ `js/villages/` — contrato (`model.js`: roles, paletas, pool con
    pesos y únicos), planos (`planos/*.js`, uno por arquetipo, validados
    por `test/validate-plano.mjs`) y trazador (`layout.js`: celda → pozo,
    caminos en cruz y parcelas sin solape; puro, sondas inyectadas).
2.  ✅ Integración en el generador — `js/villages/build.js`
    (materialización por chunk: celda propia + 8 vecinas, caché por celda,
    aplanado de parcela con relleno de 4 y corte de aire, caminos que
    siguen `surfaceHeight` y saltan agua, roles resueltos con el bioma del
    ancla) + 2 líneas en `worldgen.js` (paso 6). Coste: ~1,5 ms/chunk con
    aldea (trazado cacheado), ~4 ms en la primera pasada de la celda.
3.  ✅ Suite `test/villages.mjs`: contrato y paletas, determinismo del
    trazador (densidad medida 14 % sobre 600 celdas), edificio íntegro a
    través de bordes de chunk **byte a byte en ambos órdenes de
    generación**, mundo sin aldea = generador previo intacto, y granja con
    cultivos reales sobre tierra labrada.
4.  ⬜ Habitantes: sesgo de aparición hacia el pozo y aldea abandonada
    (2 %: zombis aldeanos, sin antorchas).

## Verificación

`node test/villages.mjs` — **62 comprobaciones** (2026-07-04, todas en
verde): paletas y pool (roles resueltos en los 5 biomas, únicos, pozo
fuera del pool), contrato de los 8 planos (`test/validate-plano.mjs`,
también como CLI), trazador (determinismo, densidad 14 % sobre 600 celdas,
requisitos del ancla, un pozo por aldea, parcelas sin solape, toda aldea
cabe en celda + 1 chunk), integración con el generador real (caminos con
2 de aire, puertas y antorchas materializadas, **edificio que cruza un
borde de chunk íntegro y byte a byte idéntico en los dos órdenes de
generación**, celda sin aldea = no-op exacto; chunk con aldea ≈ 4,6 ms,
sin aldea ≈ 2 ms) y granja real (30 bancales labrados con reparto medido
trigo/zanahoria/patata 10/10/10, etapas variadas con mayoría crecida,
todo cultivo sobre su tierra labrada).

## Decisiones de implementación (registradas por los agentes)

*   `SAL_ALDEA = 55` sigue la numeración de sales del generador (11/22/33/
    44); un único PRNG por celda se consume en secuencia fija, de modo que
    descartar una parcela por solape no altera los sorteos posteriores.
*   El (x, z) de cada pieza es el **centro de su huella rotada**;
    `DIRECCIONES = [−Z, +X, +Z, −X]` es la tabla de fachadas (rot `r` ⇒ la
    fachada mira a `DIRECCIONES[r]`). El pozo reserva una plaza de 9×9.
*   `MARGEN = 24` garantiza que el radio máximo de aldea (~37 bloques)
    cabe en celda + 1 chunk, así el vecindario 3×3 de celdas basta.
*   El aplanado rellena con tierra 4 bloques por debajo (una cueva nunca
    deja un edificio flotando) y corta el aire hasta alto + 1.

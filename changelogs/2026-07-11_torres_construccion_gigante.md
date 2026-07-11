# Torres: complejo monumental de tres rascacielos curvados para /construir

**Fecha:** 2026-07-11
**Módulo:** VoxelCraft > Consola > Construcciones

## Descripción

Nueva construcción gigante para el comando `/construir`: **Torres**, un
complejo de tres rascacielos curvados de estilo paramétrico moderno —base
acampanada que se funde con el suelo, fuste cilíndrico de 24 costillas
verticales (diorita blanca y andesita gris alternas con franjas de
ventanal de cristal), doble corona escalonada con el filo en diagonal— y
un podio-lente acristalado a los pies. Huella de 56×56 y **220 bloques de
altura**: la torre central roza el techo del mundo (tope estampado a
y=356 de los 384 del índice vertical). Cada torre tiene su vano de
entrada con puerta (las laterales abren hacia fuera del conjunto: las
faldas casi se tocan) y balizas de antorcha sobre el filo del núcleo; al
podio se entra por su puerta frontal y de él se pasa a la torre central.

A diferencia del resto de planos (matrices dibujadas a mano), las capas
se **generan proceduralmente al cargar el módulo** con la geometría
paramétrica (radios acampanados, sectores angulares, filos por coseno),
pero el resultado cumple el mismo contrato `tam/clave/capas` de
`villages/model.js`: `estampar`, `cajaDePieza` y `localDe` lo tratan como
a cualquier otro plano, sin tocar el motor.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/villages/planos/torres.js`
- Generador paramétrico del plano (torres, coronas, puertas, balizas y
  podio) exportado como `PLANO` con el contrato estándar.

### [MODIFICADO] `js/villages/planos/registry.js`
- Registro **no enumerable** de `torres` (fuera de `LISTA_PLANOS`: ni el
  worldgen de aldeas ni los aldeanos ni `validate-plano` lo ven — su
  tamaño desborda el contrato 3..12 pensado para caseríos) y export nuevo
  `PLANOS_CONSOLA` con los planos exclusivos de la consola.

### [MODIFICADO] `js/construcciones.js`
- El catálogo `CONSTRUCCIONES` suma los planos de `PLANOS_CONSOLA` a los
  de aldea, con su nombre visible («Torres»).

### [MODIFICADO] `js/main.js`
- La comprobación de terreno de `construir` pasa de las 4 esquinas de la
  caja a **todos los chunks que la caja toca**: con huellas ≤12 las
  esquinas bastaban, con 56×56 un chunk intermedio sin generar habría
  dejado agujeros silenciosos.

### [MODIFICADO] `test/construcciones.mjs`
- Catálogo a 9 con «Torres»; bloque nuevo: fuera del worldgen y de los
  aldeanos, contrato tam/clave/capas del plano generado, estampado con
  materiales/4 puertas de dos hojas/balizas/altura >200, y recorte en el
  techo del mundo con base alta.

### [MODIFICADO] `documents/12-consola-comandos.md`
- El catálogo de `/construir` documenta las construcciones exclusivas de
  la consola.

## Verificación

- 13 suites en verde (725 comprobaciones; construcciones 12, comandos 14,
  aldeas 64, humo 318…); sintaxis de los 4 archivos JS con `node --check`.
- E2E en el juego real (Edge headless, semilla fija): `/construir torres`
  por el chat respondió «Torres construida (56×220×56) frente a ti»; el
  conteo en el mundo dio 22 267 dioritas y 5 983 cristales con tope a
  y=356; capturas aérea y frontal verificadas visualmente — silueta de
  las tres torres acampanadas con costillas, coronas escalonadas y las
  cimas difuminadas por la niebla del cielo, fiel a la referencia.

## Impacto

- `/construir` (sin argumento) ahora lista también «Torres»; los planos
  de aldea y el worldgen no cambian (suite de aldeas intacta).
- Límites declarados: el estampado del comando es un **tirón único de
  ~1,3–4,8 s** (≈45 000 `world.set` síncronos; un modo por lotes de
  `world.set` queda como deuda declarada); el remallado posterior ya se
  reparte entre fotogramas gracias al presupuesto de tiempo (changelog
  159). La huella exige el terreno generado (el aviso existente guía al
  jugador) y el corte de aire despeja la vegetación de los 56×56, como
  en cualquier plano.

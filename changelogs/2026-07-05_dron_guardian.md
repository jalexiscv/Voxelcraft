# Dron guardián: mob volador aliado con hélices que giran

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs / Render

## Descripción

El usuario pidió un mob dron que vuele, proteja al jugador atacando a los
mobs agresivos cercanos y cuyas hélices roten, siguiendo un diseño de
cuadricóptero (chasis gris, capó y sensor oscuros, acentos naranja y
morado, cuatro rotores en X). Es el primer mob PROPIO de la casa (no
vanilla): no aparece de forma natural, solo por el huevo de aparición del
modo creativo.

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/mobs/dron.js`
- Definición del dron: cuadricóptero de 21 partes (cuerpo, capó, sensor,
  cuatro brazos en X, cuatro bujes y ocho palas), piel procedural con la
  paleta del brief y voz de bips electrónicos. Vuela (`flying`), sostiene
  su altitud incluso planeando quieto (`hover`), es guardián
  (`behavior.guardian`) y solo nace por invocación (`spawn.summonOnly`).
  Las hélices usan la animación nueva `rotor`.

### [MODIFICADO] `js/mobs/model.js`, `js/mobrender.js`
- Anim `rotor` (giro CONTINUO en Y): `mobrender` calcula el ángulo del
  fotograma (~7 vueltas/s) y lo pasa a `partMatrix`, que lo suma al giro
  Y de las palas.

### [MODIFICADO] `js/mobs.js`
- `guardianAI`: escolta al jugador (banda muerta para no tiritar al
  orbitar) y, si un agresor —hostil o neutral enfadado— ronda al jugador
  dentro de `guardRadius`, lo persigue en 3D y lo golpea; funciona igual
  en creativo.
- `stepPhysics`: los voladores con `hover` ajustan su altitud objetivo
  también con velocidad 0 (antes solo al desplazarse).
- `eligibleAt`: los `summonOnly` nunca aparecen de forma natural.

### [MODIFICADO] `js/mobs/registry.js`
- Registrado el dron tras el elenco vanilla; el huevo de aparición
  aparece solo (EGG_IDS deriva de MOBS).

### [MODIFICADO] `test/mobs.mjs`, `test/biomes.mjs`, `documents/*`
- 8 comprobaciones nuevas en mobs (escolta, hover, ataque al agresor,
  persecución en 3D, no agrede pasivos, no aparece natural, contrato
  propio válido, usa `rotor`): 128 → **136**. Cobertura de biomas admite
  `summonOnly`. Documentos 01 y 02 al día.

## Verificación

- `node test/validate-mob.mjs dron` → OK (contrato válido).
- Render real conducido con puppeteer-core + Edge headless sobre un arnés
  que usa el pipeline `Renderer`/`MobRenderer`: tres capturas separadas
  en el tiempo confirman el modelo (silueta del cuadricóptero del brief)
  y las hélices girando (palas en fases distintas frame a frame).
- Suites en verde: smoke 260, mobs 136, biomas 42, aldeas 62.

## Impacto

- Primer mob propio de la casa. El jugador puede invocar drones guardianes
  con su huevo del creativo para que patrullen a su alrededor y neutralicen
  amenazas. La anim `rotor` queda disponible para cualquier pieza giratoria
  futura (aspas, turbinas, engranajes).

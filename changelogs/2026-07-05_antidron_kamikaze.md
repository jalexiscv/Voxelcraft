# Antidron básico: interceptor kamikaze que reposa, despega y embiste a los drones

**Fecha:** 2026-07-05
**Módulo:** VoxelCraft > Mobs / Render

## Descripción

El usuario pidió un «antidron básico»: permanece quieto en el suelo hasta
detectar un dron; entonces despega alcanzando hasta el doble de la altura
del dron, sigue una trayectoria tambaleante de alta velocidad, arremete
contra el dron y explota al tocarlo, destruyéndose ambos a la vez. El
modelo debía seguir la foto de referencia (dron interceptor vertical).

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `js/mobs/antidron.js`
- Definición del antidron: chasis vertical alargado con gimbal de cámara
  colgando, LEDs de batería, cuatro rotores hacia arriba-fuera (dos palas
  claras y dos oscuras, como en la foto) que giran con `rotor`. Reposa
  como mob terrestre; `behavior.antidron` con `detectRadius`, `hitRange`,
  `wobble` y `radius` de explosión pequeño. Solo por invocación
  (`summonOnly`).

### [MODIFICADO] `js/mobs.js`
- `Mob`: estado del antidron (`airborne`, `strikeTarget`, `cruiseY`,
  `swooping`, `jitter*`).
- `antidronAI`: reposa quieto hasta detectar un dron (cualquier mob
  `behavior.guardian`); al fijarlo congela el techo de ascenso en el
  doble de la altura del dron sobre el suelo. Despega, sube al techo y
  luego cae en picado (flag `swooping`) sobre el dron, con rumbo
  tambaleante que se atenúa al acercarse. Al tocarlo, mata al dron y se
  hace explotar (`explode`) — ambos mueren a la vez.
- `stepPhysics`: vuelo por-instancia `airborne` (un mob terrestre vuela
  bajo su IA), con `climbAccel`/`flySpeed` verticales y `dashAccel`
  horizontal para cerrar sobre el dron pese al zigzag.

### [MODIFICADO] `js/mobs/registry.js`
- Registrado el antidron tras el dron; su huevo de aparición aparece solo.

### [MODIFICADO] `test/mobs.mjs`, `documents/02-mobs.md`
- 8 comprobaciones nuevas (reposa quieto, despega al detectar, techo =
  doble de la altura, gana altura, impacta y explota, destruye a ambos,
  tambalea, no aparece natural) + contrato del antidron: 147 → **156**.

## Verificación

- `node test/validate-mob.mjs antidron` → OK.
- Render del modelo con puppeteer-core + Edge: chasis vertical, gimbal,
  cuatro rotores claros/oscuros, fiel a la foto.
- Trayectoria del ataque en perfil (mismo arnés): reposo en suelo →
  ascenso diagonal → picado ondulante sobre el dron → explosión (techo
  y=25 = doble de la altura del dron a y=18; impacto a 3.6 s).
- Suites en verde: smoke 260, mobs 156, biomas 42, aldeas 62.

## Impacto

- Segundo mob propio de la casa y contrapeso del dron guardián: en el
  creativo se pueden enfrentar drones y antidrones. La anim `rotor` y el
  vuelo por-instancia `airborne` quedan disponibles para más mobs.

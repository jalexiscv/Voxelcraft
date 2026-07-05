# Mobs con ids en inglés y sonidos del árbol Bedrock: manifest y voz por criatura

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Audio / Mobs

## Descripción

Tres operativos de agentes encadenados: (1) renombrado de los 68 mobs a
ids ingleses (identificadores de código «como corresponde» y en
correspondencia con el árbol local de sonidos), (2) resolución de audio
por el árbol estilo Bedrock del pack local vía `sounds/manifest.json`, y
(3) **un agente por mob (68 en paralelo)** definiendo el mapeo preciso de
su voz contra los archivos reales de su carpeta.

## Tipo de Cambio

- `Cambiado` / `Agregado`

## Archivos Afectados

### [RENOMBRADO] `js/mobs/*.js` (68) · [MODIFICADO] registro, biomas, tests y docs
- Ids y archivos en inglés (`zombi→zombie`, `esqueleto→skeleton`,
  `aldeano→villager`…); los nombres visibles siguen en español. Listas de
  aparición de los 14 biomas, suites y documentos al día. Los mobs no se
  persisten en guardados: sin migración.

### [MODIFICADO] `js/soundpack.js` · [LOCAL] `.hermes/tools/generar-manifest.mjs`
- `sounds/manifest.json` (local, gitignored) lista las 4 649 rutas del
  árbol; la resolución pasa de sondeos a ciegas a **búsqueda exacta**:
  `resolverArbol`, `variantesArbol` (variante al azar por prefijo),
  `CARPETA_MOB` (alias `enderman→endermen`, `evoker→evocation_illager`,
  peces→`fish`…) y `resolverVozMob` con tabla genérica de candidatos por
  tipo de voz.

### [MODIFICADO] los 68 `js/mobs/*.js` — campo `sonidos` (agente por mob)
- `sonidos: { say, hurt, death }` con prefijos del árbol elegidos con
  criterio de especie (gato `meow/purr` + `hitt`; conejo con
  `bunnymurder` como muerte; ghast `moan`/`scream`; guardián
  `guardian_hit/guardian_death`; lepisma `hit/kill`; slime con chapoteos
  `big/small`; mooshroom reutiliza la voz de la vaca…). **Prioridad**:
  `def.sonidos` → tabla genérica → convención plana → sintetizador.
- Cobertura verificada contra el manifest real: 68/68 defs, **203/203
  prefijos con rutas existentes**, 6 omisiones legítimas documentadas.

### [MODIFICADO] `js/audio.js`, `js/main.js`, `js/hud.js`
- Pasos `step/<material>`, romper/colocar `dig/<material>`, eventos de
  `random/` (arco, explosiones, puertas, cofres, comer, splash…), evento
  nuevo de cristal y flecha clavada, y ambientales sutiles de cueva y
  subacuáticos con enfriamiento.

### [MODIFICADO] `test/smoke.mjs`, `test/mobs.mjs`, `test/validate-mob.mjs`
- Tandas nuevas (árbol con manifest simulado, prioridad de `def.sonidos`,
  formato de los 203 prefijos): humo 175 → **180**, mobs 122 → **124**.

## Impacto

- Cada criatura y cada acción suenan con su archivo correspondiente del
  pack local del usuario, con el sintetizador 100 % original como
  respaldo permanente. El repo sigue sin distribuir ni un asset ajeno.
- Suites en verde: smoke 180, mobs 124, biomas 42, aldeas 62.

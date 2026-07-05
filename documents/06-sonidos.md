# Sonidos: catálogo de eventos y pack local opcional

## Descripción

Referencia práctica del sistema de audio declarativo: **qué nombre exacto
debe tener cada archivo** para que el juego lo use, y dónde está definido
cada listado en el código. El repo distribuye solo el sintetizador 100 %
procedural (WebAudio); el directorio `sounds/` es un **override personal
local** (está en `.gitignore` y jamás se distribuye).

## Cómo funciona

1.  Colocas tus mp3 en `sounds/` (raíz del proyecto) con los nombres de
    abajo.
2.  El motor sondea cada id **una sola vez** al necesitarlo: si el archivo
    existe, suena tu mp3; si no (o aún se está descargando), suena la
    síntesis procedural. Nunca hay silencio ni latencia.
3.  Fuentes de verdad en código: convención en el docblock de
    `js/soundpack.js` · catálogo de eventos en `EVENTOS` de `js/audio.js` ·
    ids de mobs en `js/mobs/registry.js`.

## Familias de material (pasos, romper y colocar)

Cuatro variantes por familia (el juego elige una al azar); pasos, romper y
colocar **comparten** los mismos archivos con distinto volumen:

```
grass1.mp3  grass2.mp3  grass3.mp3  grass4.mp3    (hierba, tierra, hojas…)
stone1.mp3  stone2.mp3  stone3.mp3  stone4.mp3    (piedra, menas, adoquín…)
wood1.mp3   wood2.mp3   wood3.mp3   wood4.mp3     (troncos, tablones, mesa…)
gravel1.mp3 gravel2.mp3 gravel3.mp3 gravel4.mp3   (grava)
sand1.mp3   sand2.mp3   sand3.mp3   sand4.mp3     (arena)
cloth1.mp3  cloth2.mp3  cloth3.mp3  cloth4.mp3    (lana, cama)
```

La familia de cada bloque es su campo `sound` en `js/blocks.js`.

## Música de fondo

```
calm1.mp3  calm2.mp3  calm3.mp3  calm4.mp3
```

Si existe al menos una, sustituye a la música generativa: pistas al azar
con pausas largas entre ellas. La tecla `M` sigue silenciándola.

## Eventos (`evento.<nombre>.mp3`)

| Archivo | Suena cuando |
|---|---|
| `evento.splash.mp3` | el jugador entra al agua |
| `evento.fuse.mp3` | un creeper enciende la mecha |
| `evento.explosion.mp3` | una explosión |
| `evento.arrow.mp3` | un esqueleto dispara una flecha |
| `evento.player_hurt.mp3` | el jugador recibe daño |
| `evento.click.mp3` | clic en menús e interfaz |
| `evento.comer.mp3` | se consume un alimento |
| `evento.puerta_abrir.mp3` | se abre una puerta |
| `evento.puerta_cerrar.mp3` | se cierra una puerta |
| `evento.cofre_abrir.mp3` | se abre un cofre |
| `evento.cofre_cerrar.mp3` | se cierra la pantalla del cofre |
| `evento.fundir.mp3` | el horno completa una fundición |
| `evento.labrar.mp3` | la azada crea tierra labrada |
| `evento.sembrar.mp3` | se planta un cultivo |
| `evento.cosechar.mp3` | se rompe un cultivo maduro |
| `evento.campana.mp3` | reservado: la campana del pozo de las aldeas |

## Voces de mobs (`mob.<id>.<tipo>.mp3`)

Tres tipos por criatura — `idle` (sonido ambiente; equivale al `say` del
contrato `voice`), `hurt` (al recibir daño) y `death` (al morir) — con
variante única o numerada 1..4:

```
mob.zombie.idle.mp3            (o mob.zombie.idle1.mp3 .. mob.zombie.idle4.mp3)
mob.zombie.hurt.mp3
mob.zombie.death.mp3
```

Los 68 ids válidos (los de `js/mobs/registry.js`):

**Pasivos**: pig · sheep · cow · chicken · armadillo · camel ·
camel_husk · cat · ocelot · fox · horse · donkey · mooshroom ·
rabbit · sniffer · copper_golem · snow_golem · turtle · villager ·
wandering_trader · frog · sulfur_cube · allay · bat · parrot ·
happy_ghast · cod · salmon · tropical_fish · squid ·
glow_squid · axolotl

**Neutrales**: wolf · goat · panda · polar_bear · iron_golem · llama ·
enderman · bee · pufferfish · dolphin · nautilus

**Hostiles**: zombie · skeleton · creeper · spider · cave_spider · drowned ·
zombie_nautilus · husk · stray · parched · bogged · zombie_villager · witch ·
pillager · vindicator · evoker · ravager · slime · silverfish · ghast ·
vex · creaking · breeze · warden · guardian

## Árbol Bedrock y manifest

Además de la convención plana de arriba, el motor entiende un pack con
**árbol de carpetas estilo Bedrock** (`mob/zombie/say1.mp3`,
`step/grass2.mp3`, `dig/stone3.mp3`…). Como el navegador no puede listar
directorios, el árbol se describe en `sounds/manifest.json`: un array JSON
de rutas relativas a `sounds/` (separador `/`, con extensión). Se genera
con la herramienta local:

```
node .hermes/tools/generar-manifest.mjs
```

Ejecútala cada vez que añadas o quites archivos del pack (el manifest,
como todo `sounds/`, es local y jamás entra al repo). Si el manifest no
existe (404), el motor sigue en modo clásico sin árbol.

**Orden de resolución** de un sonido: manifest → árbol Bedrock →
convención plana → sintetizador procedural. Nunca hay silencio: cada
eslabón que falta cae al siguiente.

API del árbol en `js/soundpack.js` (la API plana sigue intacta):

*   `resolverArbol(ruta)` — ruta exacta del manifest a `AudioBuffer`
    (mp3 y **ogg** con `decodeAudioData` nativo, fsb con el parser propio).
*   `variantesArbol(prefijo)` — elige al azar entre las rutas que empiezan
    por el prefijo (`mob/zombie/say`, `step/grass`); absorbe numeraciones
    con y sin guion bajo (`say1`, `idle_1`). Sondeo perezoso con la misma
    caché que la convención plana.
*   `resolverVozMob(id, kind, prefijos?)` — voz de mob del árbol con esta
    **prioridad**: primero los `prefijos` del campo `sonidos` de la def
    (en orden estricto, variante al azar dentro de cada prefijo) y después
    la tabla genérica de candidatos `VOCES` bajo `mob/<carpeta>/`, por
    tipo y en orden: `say` → say, idle, ambient, meow, bark, haggle,
    agitated · `hurt` → hurt, hit, hitt · `death` → death. Devuelve el
    primer buffer disponible o `null` (y el llamante cae a la convención
    plana o al sintetizador).

**Alias de carpeta** (`CARPETA_MOB`): cuando el id del mob no coincide con
la carpeta del árbol (verificados contra el manifest real):

| id | carpeta del árbol |
|---|---|
| `enderman` | `mob/endermen` |
| `iron_golem` | `mob/irongolem` |
| `snow_golem` | `mob/snowgolem` |
| `polar_bear` | `mob/polarbear` |
| `vindicator` | `mob/vindication_illager` |
| `evoker` | `mob/evocation_illager` |
| `ocelot` | `mob/cat/ocelot` |
| `donkey` | `mob/horse/donkey` |
| `cod` · `salmon` · `tropical_fish` · `pufferfish` | `mob/fish` (genérica) |
| `cave_spider` | `mob/spider` (reutilizada) |

`ghast` y `wandering_trader` se comprobaron y su carpeta coincide con el
id: no necesitan alias. Los 68 ids del registro tienen carpeta en el árbol
(con estos alias), aunque no todas traen los tres tipos de voz; lo que
falte lo cubre el siguiente eslabón de la cadena.

## El campo `sonidos` de cada def

Las 68 definiciones de `js/mobs/` traen un campo opcional `sonidos` (tras
`voice`, contrato en [02-mobs.md](02-mobs.md)) que fija sus voces del
árbol sin depender de la tabla genérica:

```js
sonidos: { say: ['mob/cat/meow', 'mob/cat/purr'], hurt: ['mob/cat/hitt'] }
```

*   Cada prefijo es una ruta bajo `sounds/` **sin extensión ni número de
    variante**; la resolución elige al azar entre las rutas del manifest
    que empiezan por él. Varios prefijos se prueban **en orden**.
*   Una clave se **omite** si la carpeta no trae un evento razonable —
    en el elenco actual: `chicken` y `cat` sin `death`; `snow_golem`,
    `iron_golem`, `salmon` y `tropical_fish` sin `say` — mejor caer al
    siguiente eslabón que mapear algo que suene mal.
*   Puede apuntar a la carpeta de **otra especie** cuando es lo canónico
    del género (el mooshroom usa las voces de `cow`; los cuatro peces,
    la genérica `mob/fish`).

**Prioridad de una voz de mob** (cada eslabón que falta cae al
siguiente, nunca hay silencio):

1.  `def.sonidos` — prefijos propios del mob, en orden.
2.  Tabla genérica `VOCES` bajo `mob/<carpeta>/` (alias de arriba).
3.  Convención plana `mob.<id>.<tipo>.mp3`.
4.  Sintetizador procedural (`def.voice`).

La suite lo verifica: `node test/mobs.mjs` valida el formato de los 203
prefijos y `node test/smoke.mjs` comprueba con un manifest simulado que
`def.sonidos` gana a la tabla genérica y que un prefijo sin rutas cae a
ella.

## Notas

*   Formatos: **mp3** y **fsb** (bancos FMOD FSB5). Cada id sondea primero
    `<id>.mp3` y después `<id>.fsb`. De los FSB se reproducen los códecs
    PCM (8/16/24/32/float, envueltos en WAV), MPEG (frames mp3 crudos) y
    **FADPCM** (el ADPCM de FMOD, decodificado en JS puro tomando como
    referencia el algoritmo de vgmstream); los bancos VORBIS avisan una
    vez en consola y ese sonido lo cubre el sintetizador. Parser propio en
    `js/fsb5.js` (aportado por el usuario, probado en la suite muestra a
    muestra).
*   Conversión opcional a mp3: `node .hermes/tools/fsb-a-mp3.mjs` (local,
    fuera del repo) decodifica cada `.fsb` con el parser del motor y
    codifica con el ffmpeg del sistema, conservando el nombre base. Al
    sondearse `.mp3` primero, los convertidos tienen prioridad.
*   Un archivo mal nombrado simplemente no se encuentra: no hay error, el
    sintetizador cubre ese sonido.
*   El sondeo se cachea (incluidos los que no existen): si añades archivos
    con el juego abierto, recarga la página.
*   Al añadir un mob o un evento nuevo al juego, su id entra en estas
    listas automáticamente (registro de mobs / catálogo `EVENTOS`).

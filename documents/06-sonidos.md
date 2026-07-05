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
mob.zombi.idle.mp3            (o mob.zombi.idle1.mp3 .. mob.zombi.idle4.mp3)
mob.zombi.hurt.mp3
mob.zombi.death.mp3
```

Los 68 ids válidos (los de `js/mobs/registry.js`):

**Pasivos**: cerdo · oveja · vaca · gallina · armadillo · camello ·
camello_husk · gato · ocelote · zorro · caballo · burro · mooshroom ·
conejo · sniffer · golem_cobre · golem_nieve · tortuga · aldeano ·
comerciante · rana · cubo_azufre · allay · murcielago · loro ·
fantasma_feliz · bacalao · salmon · pez_tropical · calamar ·
calamar_brillante · ajolote

**Neutrales**: lobo · cabra · panda · oso_polar · golem_hierro · llama ·
enderman · abeja · pez_globo · delfin · nautilus

**Hostiles**: zombi · esqueleto · creeper · arana · arana_cueva · ahogado ·
nautilus_zombi · husk · stray · parched · bogged · zombi_aldeano · bruja ·
saqueador · vindicador · evocador · ravager · slime · lepisma · fantasma ·
vex · creaking · breeze · warden · guardian

## Notas

*   Formatos: **mp3** y **fsb** (bancos FMOD FSB5). Cada id sondea primero
    `<id>.mp3` y después `<id>.fsb`. De los FSB se reproducen los códecs
    PCM (8/16/24/32/float, envueltos en WAV) y MPEG (frames mp3 crudos);
    los bancos VORBIS/ADPCM no son decodificables con WebAudio: avisan una
    vez en consola y ese sonido lo cubre el sintetizador. Parser propio en
    `js/fsb5.js` (aportado por el usuario, probado en la suite).
*   Un archivo mal nombrado simplemente no se encuentra: no hay error, el
    sintetizador cubre ese sonido.
*   El sondeo se cachea (incluidos los que no existen): si añades archivos
    con el juego abierto, recarga la página.
*   Al añadir un mob o un evento nuevo al juego, su id entra en estas
    listas automáticamente (registro de mobs / catálogo `EVENTOS`).

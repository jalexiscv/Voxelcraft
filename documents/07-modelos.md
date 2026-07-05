# Modelos: geometrías locales y pack de modelos opcional

## Descripción

Referencia práctica del override de modelos de mobs: **qué nombre exacto
debe tener cada archivo** para que el juego lo use, y dónde está definido
cada listado en el código. El repo distribuye solo los **modelos
procedurales propios** de `js/mobs/*.js` (partes-caja pintadas píxel a
píxel); los directorios `models/` y `textures/` de la raíz son un
**override personal local** — están en `.gitignore` junto a `sounds/` y
**jamás se distribuyen ni se copian al repo** (ni siquiera convertidos a
otro formato). Es el mismo patrón que el pack de audio de
[06-sonidos.md](06-sonidos.md).

## Cómo funciona

1.  Colocas tus geometrías `.geo.json` (formato Bedrock) en `models/` con
    los nombres de abajo, y opcionalmente sus PNG en `textures/entity/`.
2.  La primera vez que un tipo de mob entra en pantalla, el motor sondea
    su geometría **una sola vez** en segundo plano: si existe, la malla
    del tipo se sustituye por la del geo; si no (404) o mientras resuelve,
    se dibuja el modelo procedural de siempre. **Nunca hay mobs
    invisibles ni errores en consola.**
3.  Fuentes de verdad en código: parser en `js/geo.js` (`parseGeo`) ·
    sondeo, alias y auto-piel en `js/modelpack.js` · sustitución en
    caliente en `js/mobrender.js` (`applyPack`).

## Cadena de respaldo

Cada eslabón que falta cae al siguiente, por mob y en este orden:

1.  **geo + PNG** — geometría de `models/` texturizada con su PNG de
    `textures/entity/`.
2.  **geo + auto-piel** — geometría de `models/` texturizada con la
    **paleta procedural propia** proyectada a su desplegado UV (ver
    abajo).
3.  **Modelo procedural propio** — las partes-caja y la piel de
    `js/mobs/<id>.js`, el respaldo permanente que vive en el repo.

## Nombres de archivo esperados

```
models/entity/<alias>.geo.json    (una geometría por mob, formato 1.8;
                                   también se acepta 1.12 con uv de caja)
models/mobs.json                  (geometrías humanoides/legacy sueltas:
                                   se buscan geometry.<id> y geometry.<id
                                   sin guiones bajos>, p. ej. irongolem)
textures/entity/<alias>.png       (textura opcional; sin ella, auto-piel)
```

Por defecto el alias de geometría es el propio id del mob
(`pig.geo.json`, `cow.geo.json`…; siempre el archivo **sin** sufijo
`_v1.0`). Un archivo mal nombrado simplemente no se encuentra: no hay
error y el modelo procedural cubre ese mob.

## Alias de geometría (`ARCHIVO_MOB` de `js/modelpack.js`)

Cuando el id del mob no coincide con el archivo de `models/entity/`
(inventariado contra el pack real); incluye los mobs propios de la casa
que son variantes claras de un modelo vanilla:

| id | archivo de `models/entity/` |
|---|---|
| `horse` · `donkey` | `horse_v3.geo.json` |
| `wandering_trader` | `villager_v2.geo.json` |
| `cave_spider` | `spider.geo.json` |
| `glow_squid` | `squid.geo.json` |
| `happy_ghast` | `ghast.geo.json` |
| `allay` | `vex.geo.json` |
| `bogged` · `parched` | `skeleton.geo.json` |

Los mobs sin correspondencia razonable (armadillo, camel, sniffer,
warden…) no figuran: su sondeo da un 404 limpio y conservan su modelo
procedural.

En archivos con **varias geometrías**, `CLAVE_MOB` fija la clave
`geometry.*` preferida (oveja y bruja usan la versión con herencia —
lana y sombrero —, el pez globo la talla grande, etc.). La herencia
`geometry.hijo:geometry.padre` se resuelve añadiendo los bones del hijo
a los del padre; `PADRE_EXTERNO` cubre el único caso con el padre en
otro archivo (la bruja hereda del aldeano).

## Texturas del pack (`TEXTURA_MOB`)

Por defecto se sondea `textures/entity/<id>.png` (cubre bat, dolphin,
guardian, witch, squid, iron_golem…). Alias cuando la ruta difiere:

| id | ruta bajo `textures/entity/` |
|---|---|
| `cow` / `mooshroom` | `cow/cow` · `cow/mooshroom` |
| `pig` · `sheep` · `creeper` · `enderman` · `fox` · `ghast` · `llama` · `panda` · `slime` · `spider` · `vex` · `villager` · `wolf` | `<id>/<id>` |
| `parrot` | `parrot/parrot_red_blue` |
| `rabbit` | `rabbit/brown` |
| `cave_spider` | `spider/cave_spider` |
| `zombie` / `husk` / `drowned` | `zombie/zombie` · `zombie/husk` · `zombie/drowned` |
| `zombie_villager` | `zombie_villager/zombie_villager` |
| `cat` / `ocelot` | `cat/tabby` · `cat/ocelot` |
| `cod` / `salmon` / `pufferfish` / `tropical_fish` | `fish/cod` · `fish/salmon` · `fish/pufferfish` · `fish/tropical_a` |
| `horse` / `donkey` | `horse2/horse_brown` · `horse2/donkey` |
| `skeleton` / `stray` | `skeleton/skeleton` · `skeleton/stray` |
| `evoker` / `ravager` | `illager/evoker` · `illager/ravager` |
| `polar_bear` | `polarbear` |
| `turtle` | `sea_turtle` |

Los mobs que **toman prestada** la geometría de otro (`allay`→vex,
`bogged`/`parched`→esqueleto, `glow_squid`→calamar,
`happy_ghast`→ghast) **no sondean textura** (valor `null`): la textura
vanilla no casaría con su identidad y la auto-piel es la que conserva su
paleta de color.

## Auto-piel (geo sin textura)

Cuando hay geometría pero no PNG, `autoPiel(def, modelo, variante)`
pinta un lienzo del tamaño del geo proyectando la **paleta procedural
propia** del mob a su desplegado UV: se pinta la piel de siempre con
`def.paint()`, se toma el color medio de la parte propia con nombre más
parecido (tabla de sinónimos inglés→español: head→cabeza, wool→lana,
leg→pata…; un `inflate` alto prueba antes la capa exterior — lana,
caparazón) y cada rect UV del geo se rellena con ese color más el
moteado sutil de la casa. **Cero texels copiados** del juego original, y
las **variantes** de tonalidad siguen funcionando (misma semilla por
variante que el render).

## Conversión geo → partes (`js/geo.js`)

*   El `origin` de cada cube (absoluto, en px desde el suelo) se vuelve
    **relativo al pivote** del bone, que es lo que espera el contrato de
    `js/mobs/model.js`; `size` y `uv` pasan tal cual.
*   `bind_pose_rotation` (grados) → `rot` en radianes con signo
    `[−x, −y, +z]` (la convención de giro de Bedrock invierte X e Y
    respecto a la casa; verificado con el cuerpo de la vaca).
*   `inflate` y `mirror` se propagan (del cube si lo trae, si no del
    bone); `mirror` refleja solo la U del desplegado, la geometría no
    cambia.
*   Bones con `neverRender` o sin cubes se saltan; un bone con varios
    cubes produce partes `nombre_0`, `nombre_1`… que comparten
    pivote/rot/animación.
*   La **animación** se deduce del nombre del hueso: `head`/`hat` siguen
    la mirada; patas de cuadrúpedo en pares diagonales
    (`leg0`/`leg3` ↔ `leg1`/`leg2`, o `front`/`back` + `left`/`right`);
    `leftarm`/`rightarm` en contrafase; alas a `flapL`/`flapR`; el resto
    queda rígido.
*   Limitación: jerarquías de 2+ niveles (puntas de ala del murciélago…)
    se posan bien pero no heredan la animación del padre (queda anotado
    en `avisos`).

## Notas

*   El lienzo de la textura crece en potencias de 2 si el desplegado real
    no cabe en el `texturewidth`/`textureheight` declarado (muchos geos
    1.8 no lo declaran y el 64×32 por defecto se queda corto).
*   El sondeo se cachea (incluidos los 404): si añades archivos con el
    juego abierto, recarga la página.
*   La suite lo verifica **sin depender de `models/`**: la tanda
    «Modelos geo» de `node test/smoke.mjs` construye un geo sintético y
    comprueba la conversión origin/pivote, los signos de la rotación, el
    mapeo de animaciones, el espejado, la auto-piel y que sin pack el
    render conserva el modelo procedural.
*   Recordatorio legal: los `.geo.json` y PNG del resource pack oficial
    tienen copyright. Viven solo en tu copia local (`.gitignore`) y no
    deben subirse al repo ni redistribuirse en ninguna forma.

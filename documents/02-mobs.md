# Sistema de Mobs de VoxelCraft

## Descripción

Desde la v0.4.0 VoxelCraft recrea el **elenco oficial de mobs de Minecraft** (Java Edition 26.2, fuente: minecraft.wiki, consultada el 2026-07-04): de los **88 mobs oficiales**, los **68 del Overworld** están recreados; los 20 restantes (Nether, End, jefes y variantes de montura) quedan fuera de alcance documentado. Como todo en VoxelCraft, son **100 % procedurales**: modelos de partes-caja, pieles pintadas píxel a píxel con PRNG determinista y voces sintetizadas con WebAudio — ni un archivo binario ni material de terceros. Con la primera hornada (v0.3.0) llegó también la **salud del jugador** (10 corazones, regeneración, pantalla de muerte).

## Elenco recreado (68 de 88)

Agrupado por las **categorías oficiales de Minecraft** (pasivos, neutrales y hostiles, como en minecraft.wiki); los rasgos de locomoción (volador, acuático) se indican por mob.

**Pasivos (32)** — nunca atacan. Los terrestres aparecen de día (los nocturnos, marcados); los acuáticos, dentro del agua (aletean si quedan varados):
cerdo · oveja · vaca · gallina (planea al caer) · armadillo (se hace bola al ser golpeado) · camello · camello husk (arena, nocturno) · gato · ocelote y zorro (asustadizos: huyen si te acercas) · caballo · burro · mooshroom · conejo (a saltos; 6 tonalidades, blanca en la nieve y dorada en el desierto) · sniffer · golem de cobre · golem de nieve · tortuga (arena) · aldeano · comerciante errante · rana (a saltos) · cubo de azufre (cuevas, brilla) · allay (volador, brilla) · murciélago (volador, cuevas) · loro (volador) · happy ghast (volador, a escala reducida) · bacalao · salmón · pez tropical · calamar · calamar brillante (brilla) · ajolote.

**Neutrales (11)** — pacíficos hasta que los hieres (20 s de enfado):
lobo · cabra (embiste) · panda · oso polar · golem de hierro · llama (escupe a distancia) · enderman (nocturno; se teletransporta al ser herido) · abeja (voladora; pica una vez y se calma) · pez globo · delfín · nautilus (los tres últimos, acuáticos).

**Hostiles (25)** — de noche en superficie o en cuevas; arden al amanecer salvo los marcados:
zombi · esqueleto · creeper (explota) · araña · araña de cueva · ahogado (aparece en el agua) · nautilus zombi (acuático) · husk (arena, no arde) · stray · parched (arena, no arde, flechas lentas) · bogged · zombi aldeano · bruja · saqueador · vindicador · evocador · ravager · slime (cuevas, a saltos) · lepisma (cuevas) · phantom (vuela en picado) · vex (vuela) · creaking (solo avanza cuando no lo miras) · breeze (brinca y dispara) · warden (cuevas, no arde, el más letal) · guardián (acuático, dispara).

## Fuera de alcance (20 de 88)

| Grupo | Mobs | Motivo |
|---|---|---|
| Nether (10) | Blaze, Ghast, Hoglin, Magma Cube, Piglin, Piglin Brute, Strider, Wither Skeleton, Zoglin, Zombified Piglin | VoxelCraft no tiene dimensión del Nether |
| End (3) | Shulker, Endermite, Ender Dragon | No hay dimensión del End (el enderman sí, porque aparece en el Overworld) |
| Jefes (1) | Wither | Se construye con bloques que no existen; sin combate de jefes |
| Variantes (6) | Skeleton Horse, Zombie Horse, Mule, Trader Llama, Elder Guardian, Tadpole | Variantes de montura/cría de mobs ya recreados; no hay monturas ni crías |

## Arquitectura

```
js/
├── mobs.js              <-- Núcleo (puro, sin DOM): IA por estados, física AABB
│                            por modos (terrestre/volador/acuático/a saltos),
│                            aparición por hábitats, flechas, explosión
├── mobrender.js         <-- Render WebGL2: matriz por parte, animaciones, tintes
│                            (daño, mecha, agonía), luz de cueva, brillo propio
└── mobs/
    ├── model.js         <-- Contrato de partes-caja + desplegado UV estándar (puro)
    ├── skin.js          <-- Pieles procedurales: búfer RGBA con PRNG (puro)
    ├── registry.js      <-- Registro de tipos (la fuente de verdad del elenco)
    └── <mob>.js × 68    <-- Una definición por mob (cerdo.js es el ejemplo canónico)
```

Integración: `main.js` crea un `MobSystem` por mundo y le inyecta *hooks* (sonido, daño al jugador, explosión); cada fotograma llama a `mobs.update()` y el render principal invoca `drawEntities` entre la geometría sólida y las transparencias. El clic izquierdo golpea primero al mob apuntado (`raycastMob`) y solo si no hay mob rompe el bloque.

## El contrato de definición

Cada mob es un archivo de **solo datos** (importable en Node) con: `aabb`, `hp`, `speed`, `skin` (64×64; grandes 128×64/128×128), `paint(skin)` determinista, `parts` (cajas con `size/pivot/origin/uv/rot/anim`), `voice` (tonos con curva o ruido para decir/herir/morir) y:

*   **Locomoción y rasgos**: `flying`, `aquatic`, `hop` (a saltos), `glide`, `timid`, `hideOnHurt`, `noBurn`, `glow`.
*   **Tonalidades**: `variants` (2..8 pieles; `paint(skin, v)` pinta cada variante con la misma semilla por variante) y `variantBiome` opcional (`{ <bioma>: <variante> }`: tonalidad fija en ese bioma; en el resto se sortea al aparecer). El conejo es el ejemplo canónico.
*   **behavior** (obligatorio en hostiles, opcional en neutrales): `neutral`, `aggro`, `attackRange`, `damage`, `cooldown`, `projectile`, `fuse`+`radius` (creeper), `lunge`, `teleport` (enderman), `freezeWhenSeen` (creaking), `stingOnce` (abeja).
*   **spawn**: `cap`, `group`, `block` (`GRASS`|`SAND`|`ANY`), `night`, `water`, `cave`.
*   **drops** (opcional): botín al morir — `[{ id, min, max, chance }]` con ids de item o bloque (tabla completa en [04-items.md](04-items.md)); solo cae en supervivencia.

El formato completo está en el docblock de [model.js](../js/mobs/model.js). **Añadir un mob**: crear `js/mobs/<id>.js` imitando `cerdo.js`, validar con `node test/validate-mob.mjs <id>` e importarlo en `registry.js`.

## Hábitats de aparición

Cada tanda sortea un hábitat: **superficie** (de día los pasivos del bioma sobre su suelo natural —hierba, arena, micelio…— o el bloque de su `spawn.block`; de noche los hostiles de la lista nocturna del bioma), **agua** (columna sobre el lecho, a media profundidad; solo los acuáticos que el bioma lista) o **cueva** (hueco sin luz solar bajo tierra; global, sin bioma — salvo los que un bioma saca a la superficie de noche, como el slime en el pantano). Qué mobs habitan cada bioma está en [03-biomas.md](03-biomas.md). En **dificultad pacífica** no aparecen hostiles, y en **modo creativo** los hostiles ignoran al jugador (deambulan como pasivos). Topes: 1-4 por tipo y 32 en total; nunca a menos de 24 bloques del jugador; desaparición a >80. Las explosiones marcan los chunks como editados, así que los cráteres **se guardan**.

## Adaptaciones respecto al juego oficial

Sin sistema de objetos, domesticación, monturas, crías ni comercio, algunos mobs se adaptan: todos los proyectiles son la misma flecha con el daño del tirador (escupitajo de llama, poción de bruja, ráfaga del breeze, láser del guardián), y las flechas que fallan quedan clavadas en el bloque unos 30 s antes de desvanecerse; cada mob habita los biomas de su tabla en [03-biomas.md](03-biomas.md); el warden y el creaking son mortales pero no invulnerables; el happy ghast está a escala reducida (2,4 bloques); el ahogado camina además de nadar. En la clasificación, cinco mobs difieren de la categoría oficial del wiki porque no existen los mecanismos que la condicionan: la araña y la araña de cueva (neutrales con luz), el ahogado (pasivo de día fuera del agua) y el nautilus zombi (neutral sin domar) son aquí hostiles siempre, y el zorro (neutral oficial) es aquí pasivo y asustadizo.

## Salud del jugador

20 medios corazones sobre la hotbar. Daño por mobs y flechas con retroceso y viñeta roja; regeneración de ½ corazón cada 4 s tras 8 s sin daño; al llegar a 0, pantalla «Has muerto» con reaparición (la partida no se pierde).

## Verificación

*   `node test/mobs.mjs` — **122 comprobaciones** (geometría y UV, física por modos con mundos simulados, IA pasiva/neutral/hostil, mecha y explosión, flechas con daño por tirador que quedan clavadas al fallar, teletransporte, congelación al mirar, aparición por hábitats y biomas, y contrato de las 68 definiciones). Todas en verde el 2026-07-04.
*   `node test/validate-mob.mjs <id>` — validador por definición (campos, UV sin solapes ni texels invisibles, pintado determinista, pies al suelo, orientación de partes frontales).
*   `node test/smoke.mjs` — la suite del motor sigue en verde (103 OK).
*   Los 68 mobs fueron construidos por **agentes en paralelo** contra el contrato validable y revisados de forma adversaria por agentes independientes (por mob en la primera hornada, por lotes de 5 en la segunda).

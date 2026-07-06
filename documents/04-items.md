# Items, drops de mobs, horno y bloques funcionales

## Descripción

Plan e implementación del **ecosistema de items** de VoxelCraft: materiales
que sueltan los mobs al morir, fundición en el horno, herramientas y armas
por niveles, y bloques funcionales (puerta, valla, ventana, antorcha, cama).
El juego que nos inspira ronda el millar largo de objetos; VoxelCraft
implementa un **subconjunto propio (~30 items + 7 bloques nuevos)** adaptado
a sus sistemas (sin hambre, encantamientos ni redstone), con datos y arte
procedural 100 % propios.

## Items (ids desde 200; los 200-206 ya existían)

| Id | Item | Tésela | Origen |
|---|---|---|---|
| 207 | Cuero | 75 | vaca, caballo, burro, camellos, llama |
| 208 | Pluma | 76 | gallina, loro |
| 209 | Carne cruda | 77 | cerdo, vaca, caballo, oveja, conejo |
| 210 | Carne asada | 78 | fundir carne cruda |
| 211 | Hueso | 79 | esqueleto, stray, bogged, parched |
| 212 | Hilo | 80 | arañas |
| 213 | Pólvora | 81 | creeper, bruja |
| 214 | Carne podrida | 82 | zombis, husk, ahogado, zombi aldeano |
| 215 | Perla | 83 | enderman (50 %) |
| 216 | Bola de slime | 84 | slime |
| 217 | Tinta | 85 | calamares |
| 218 | Pez crudo | 86 | bacalao, salmón, peces |
| 219 | Pez asado | 87 | fundir pez crudo |
| 220 | Escama | 88 | guardián, nautilus, pez globo |
| 221 | Membrana | 89 | fantasma, vex |
| 222 | Carbón | 90 | romper mena de carbón; fundir tronco (vegetal) |
| 223 | Lingote de hierro | 91 | fundir mena de hierro; gólem de hierro |
| 224 | Lingote de oro | 92 | fundir mena de oro |
| 225 | Pico de hierro | 93 | crafteo (factor ×4 en piedra) |
| 226 | Hacha de hierro | 94 | crafteo (×4 madera) |
| 227 | Pala de hierro | 95 | crafteo (×4 tierras) |
| 228 | Espada de madera | 96 | crafteo (daño 5 al golpear mobs) |
| 229 | Espada de piedra | 97 | crafteo (daño 6) |
| 230 | Espada de hierro | 98 | crafteo (daño 8) |

El puñetazo sin espada sigue haciendo daño 4. La lana de la oveja es el
bloque `WOOL0` (blanca). La mena de carbón deja de soltarse a sí misma:
suelta el item Carbón.

## Tabla de drops por mob (al morir, solo en supervivencia)

Formato en la definición del mob: `drops: [{ id, min, max, chance }]`
(`chance` opcional, 1 por defecto; los ids de item van por nombre desde
`ITEMS`, los de bloque desde `B`). Reparto del fan-out (8 lotes):

**Lote 1** — pig: carne 1-2 · sheep: WOOL0 1 + carne 0-1 · cow: carne 1-2
+ cuero 0-1 · chicken: pluma 0-2 + carne 0-1 · armadillo: escama 0-1 ·
camel: cuero 0-1 · camel_husk: cuero 0-1 + carne_podrida 0-1 ·
cat: hilo 0-1 · ocelot: nada.

**Lote 2** — fox: nada · horse: cuero 0-1 + carne 0-1 · donkey: cuero
0-1 · mooshroom: carne 1-2 + MUSHROOM_RED 1 · rabbit: carne 0-1 + cuero 0-1
· sniffer: nada · copper_golem: nada · snow_golem: SNOW 1-2 ·
turtle: escama 0-1.

**Lote 3** — villager: nada · wandering_trader: nada · frog: bola_slime 0-1 ·
sulfur_cube: pólvora 0-2 · allay: nada · bat: nada · parrot: pluma 1-2
· bee: nada · happy_ghast: membrana 0-1.

**Lote 4** — cod: pez 1 · salmon: pez 1 · tropical_fish: pez 1 ·
pufferfish: escama 0-1 · squid: tinta 1-2 · glow_squid: tinta 1-2 ·
axolotl: nada · dolphin: pez 0-1 · nautilus: escama 1.

**Lote 5** — zombie_nautilus: escama 0-1 + carne_podrida 0-1 · wolf: nada ·
goat: cuero 0-1 · panda: nada · polar_bear: pez 0-1 + carne 0-1 ·
iron_golem: lingote_hierro 1-2 · llama: cuero 0-1 · enderman: perla 0-1
(50 %) · zombie: carne_podrida 0-2 + zanahoria 1 (5 %) + patata 1 (5 %).

**Lote 6** — skeleton: hueso 0-2 · creeper: pólvora 0-2 · spider: hilo 0-2
· cave_spider: hilo 0-2 · drowned: carne_podrida 0-2 + zanahoria 1 (5 %) +
patata 1 (5 %) · husk: carne_podrida 0-2 + zanahoria 1 (5 %) + patata 1
(5 %) · stray: hueso 0-2 · parched: hueso 0-2 · bogged: hueso 0-2.

**Lote 7** — zombie_villager: carne_podrida 0-2 · witch: pólvora 0-2 + PALO
0-2 · pillager: nada · vindicator: nada · evoker: perla 0-1 (25 %) ·
ravager: cuero 1-2 · slime: bola_slime 0-2 · silverfish: nada ·
ghast: membrana 0-1.

**Lote 8** — vex: membrana 0-1 · creaking: PALE_LOG 0-1 · breeze: pólvora
0-2 · warden: perla 0-1 · guardian: escama 0-2 + pez 0-1.

## Horno y fundición

*   **Bloque horno** (id 63): se craftea con 8 adoquines en anillo (3×3 con
    el centro vacío). Clic derecho abre su interfaz (entrada + combustible
    → salida). **Adaptación**: la fundición es por sesión de interfaz, sin
    estado por bloque (fundir consume al instante entrada y combustible).
*   **Fundiciones** (`FUNDICIONES` en items.js): mena de hierro → lingote de
    hierro · mena de oro → lingote de oro · arena → cristal · adoquín →
    roca · tronco → carbón · carne cruda → carne asada · pez crudo → pez
    asado · patata → patata asada.
*   **Combustibles** (`COMBUSTIBLES`, usos por unidad): carbón ×4 ·
    tronco ×2 · tablones ×1 · palo ×1.

## Bloques funcionales (ids 63-69, 84-86, téselas 99-107 y 132-133)

| Id | Bloque | Téselas | Función |
|---|---|---|---|
| 63 | Horno | side 99, frente 100, top 101 | interfaz de fundición (clic der) |
| 64 | Puerta, hoja inferior (cerrada) | 102 (paneles y bisagras), canto 103 | clic derecho abre el PAR; colisiona; se alinea con el muro que la enmarca |
| 65 | Puerta, hoja inferior (abierta) | 102 girada 90°, canto 103 | clic derecho cierra el par; se atraviesa; gira PEGADA a su jamba (bisagra) |
| 66 | Valla | 104 | 3D: poste + travesaños hacia vallas y muros vecinos; colisiona |
| 67 | Ventana | 105 | cristal con marco de madera |
| 68 | Antorcha | 106 (cross) | brilla con luz propia (decorativa) |
| 69 | Cama | top 107, side PLANKS | clic derecho de noche → amanece |
| 84 | Puerta, hoja superior (cerrada) | 132 (vidriera translúcida), canto 103 | la coloca la mecánica del par |
| 85 | Puerta, hoja superior (abierta) | 132 girada (panel en x), canto 103 | gira junto a la inferior; se atraviesa |
| 86 | Cámara de vigilancia | 133 (solo icono del HUD) | bloque **dinámico** (`js/camaras.js`): sin malla estática, se dibuja como entidad de 13 partes-caja con el pipeline de mobs — el cabezal barre ±70° cada 8 s (con pausa en los extremos y cabeceo de 15°) y su LED rojo parpadea (0,15 s cada 1,2 s); no colisiona pero el raycast la golpea; se pica a piedra (dureza 3, pico) y suelta su bloque |
| 87 | Lata de Red Bull | 134 (solo icono del HUD) | bloque **dinámico** explosivo (`js/latas.js`): lata de bebida energética de 4 partes-caja (base cónica, cuerpo esbelto 4×8, hombro y anilla) con rombos diagonales azul/plata que envuelven sin costura y emblema de los dos toros rojos frente al sol amarillo; cada lata mira a una de 8 orientaciones elegida DETERMINISTA por su celda; al colocarla arma una **mecha de 10 s** — burbujea cada vez más deprisa, y en los últimos 3 s silba y parpadea en blanco — y **estalla con radio 4** (cráter circular de área π·4² ≈ 50 bloques cuadrados, daño decreciente a jugador y mobs hasta 8 m, capas extra de partículas: doble bola de fuego, hongo de humo y chorro de energía azul); romperla a tiempo (cede a un golpe) la desactiva y suelta su bloque |

**Puerta de DOS bloques** (`js/doors.js`, puro y testeado en Node): colocar
exige un vano de 2 de alto con suelo sólido y escribe las dos hojas de una
vez; el clic derecho sobre CUALQUIER hoja gira el par entero (las hojas
abiertas son las mismas téselas malladas como panel en el eje x); romper
cualquier hoja limpia el par y suelta **1 puerta** (la receta no cambia:
sigue dando 1). La valla se malla en 3D: poste central y dos travesaños
por cada vecino conectable (otra valla o un bloque sólido opaco).

**Recetas nuevas**: horno (anillo de 8 adoquines) · puerta (2×3 de
tablones) · valla (3×2 alternando palo/tablón: `SPS`/`SPS`) · ventana (2×2
de cristal → 2) · antorcha (carbón sobre palo → 4) · cama (lana sobre
tablones: `WWW`/`PPP`) · espadas (material ×2 sobre palo, en columna) ·
picos/hachas/palas de hierro (como las de piedra con lingotes) · cámara de
vigilancia (mesa 3×3: fila de 3 lingotes de hierro, fila lingote-cristal-
lingote y palo centrado abajo como poste → 1) · lata de Red Bull (sin
forma: lingote de hierro + trigo → 1).

## Agricultura (bloques 71-83, items 231-239, téselas 110-131)

Sistema completo de cultivo construido por un workflow de 5 agentes en 4
fases (bloques/atlas → items/recetas → mecánica + botín → verificación).

### Bloques (la etapa es el id: la persistencia sale gratis)

| Id | Bloque | Nota |
|---|---|---|
| 71 | Tierra labrada (`FARMLAND`) | sólida, top con surcos húmedos (tésela 110); solo la crea la azada |
| 72-75 | Trigo etapas 0-3 | cross, brotes verdes → espigas doradas (téselas 111-114) |
| 76-79 | Zanahoria etapas 0-3 | cross, hojas con puntas naranjas asomando (115-118) |
| 80-83 | Patata etapas 0-3 | cross, matas que amarillean al madurar (119-122) |

### Items

| Id | Item | Tésela | Nota |
|---|---|---|---|
| 231 | Semillas de trigo | 123 | de la hierba alta (40 %) y de cosechar |
| 232 | Trigo | 124 | cosecha madura |
| 233 | Pan | 125 | alimento 5 · receta: 3 trigos en fila |
| 234 | Zanahoria | 126 | alimento 3 **y** plantable |
| 235 | Patata | 127 | alimento 1 **y** plantable |
| 236 | Patata asada | 128 | alimento 5 · horno |
| 237-239 | Azadas (madera/piedra/hierro) | 129-131 | labran; receta clásica (2 material + 2 palos) |

### Mecánica (`js/farming.js` + integración en `main.js`)

*   **Labrar**: clic derecho con azada sobre hierba/tierra con aire encima
    → tierra labrada (sin durabilidad: las herramientas no se gastan).
*   **Sembrar**: clic derecho con semillas/zanahoria/patata sobre tierra
    labrada → etapa 0 (consume 1). Zanahoria y patata son comida y semilla:
    **plantar tiene prioridad sobre comer** cuando se apunta a un bancal.
*   **Crecer** (`tickCultivos`): cada ~3 s se muestrean columnas al azar por
    chunk cargado; un cultivo sobre tierra labrada avanza de etapa con
    probabilidad ~1/12 por muestreo, **×2 con agua a ≤4 bloques** (riego).
    Sin tierra labrada debajo no crece.
*   **Cosechar**: romper maduro → botín completo (trigo 1 + semillas 1-2 ·
    zanahorias 2-3 · patatas 1-3); inmaduro → solo la unidad replantable.
    Romper tierra labrada suelta tierra.
*   **Fuentes iniciales**: la hierba alta suelta semillas de trigo (40 %);
    zanahoria y patata salen del botín raro de zombie/husk/drowned (5 %) y
    de las granjas de las aldeas (ver [05-aldeas.md](05-aldeas.md)).

## Pendientes del análisis — estado

*   **Cofres** — ✅ implementado: estado persistente por posición
    (`world.blockData`, guardado junto a los chunks), bloque cofre (id 70,
    receta de anillo de tablones) e interfaz de transferencia.
*   **Hambre** — ✅ implementado: barra de raciones (espejo de los
    corazones), drenaje por tiempo/sprint/reaparición, comer con clic
    derecho (valores `food` de los items), regeneración condicionada al
    hambre e inanición que debilita sin bajar de 1 corazón.
*   **Luz real de la antorcha** — ✅ implementado: campo de luz de bloque
    0..15 con propagación BFS; el shader combina luz solar (afectada por el
    día) y luz de bloque (constante). Antorcha 14, lava 15.
*   **Paneles finos** — ✅ implementado: ventana como caja fina en z y
    puerta de DOS bloques (hojas 64/65 abajo y 84/85 arriba) cuyas hojas
    giran al abrirse (el mismo panel mallado con el grosor en x); la valla
    dejó el cross plano y es 3D conectada. Trampillas y cristaleras quedan
    como futuro.

## Verificación

*   `node test/smoke.mjs` — fundiciones/combustibles/recetas nuevas,
    contrato de items, tanda «Cultivos» (33 comprobaciones: ids y flags,
    lógica de farming.js, crecimiento real sobre un mundo de prueba,
    receta del pan, fundición de la patata y azadas) y tanda «Puertas y
    vallas» (24 comprobaciones: ids/flags de las cuatro hojas, téselas
    pintables, mecánica del par sobre un World headless, giro del panel
    al eje x en el mesher, valla con travesaños solo hacia vecinos
    conectables y alfa de la vidriera vs. hoja inferior opaca).
*   `node test/mobs.mjs` — drops al morir (roll determinista con el PRNG del
    sistema) y contrato `drops` de las 68 definiciones (validador).

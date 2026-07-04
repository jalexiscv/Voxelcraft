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

**Lote 1** — cerdo: carne 1-2 · oveja: WOOL0 1 + carne 0-1 · vaca: carne 1-2
+ cuero 0-1 · gallina: pluma 0-2 + carne 0-1 · armadillo: escama 0-1 ·
camello: cuero 0-1 · camello_husk: cuero 0-1 + carne_podrida 0-1 ·
gato: hilo 0-1 · ocelote: nada.

**Lote 2** — zorro: nada · caballo: cuero 0-1 + carne 0-1 · burro: cuero
0-1 · mooshroom: carne 1-2 + MUSHROOM_RED 1 · conejo: carne 0-1 + cuero 0-1
· sniffer: nada · golem_cobre: nada · golem_nieve: SNOW 1-2 ·
tortuga: escama 0-1.

**Lote 3** — aldeano: nada · comerciante: nada · rana: bola_slime 0-1 ·
cubo_azufre: pólvora 0-2 · allay: nada · murcielago: nada · loro: pluma 1-2
· abeja: nada · fantasma_feliz: membrana 0-1.

**Lote 4** — bacalao: pez 1 · salmon: pez 1 · pez_tropical: pez 1 ·
pez_globo: escama 0-1 · calamar: tinta 1-2 · calamar_brillante: tinta 1-2 ·
ajolote: nada · delfin: pez 0-1 · nautilus: escama 1.

**Lote 5** — nautilus_zombi: escama 0-1 + carne_podrida 0-1 · lobo: nada ·
cabra: cuero 0-1 · panda: nada · oso_polar: pez 0-1 + carne 0-1 ·
golem_hierro: lingote_hierro 1-2 · llama: cuero 0-1 · enderman: perla 0-1
(50 %) · zombi: carne_podrida 0-2.

**Lote 6** — esqueleto: hueso 0-2 · creeper: pólvora 0-2 · arana: hilo 0-2
· arana_cueva: hilo 0-2 · ahogado: carne_podrida 0-2 · husk: carne_podrida
0-2 · stray: hueso 0-2 · parched: hueso 0-2 · bogged: hueso 0-2.

**Lote 7** — zombi_aldeano: carne_podrida 0-2 · bruja: pólvora 0-2 + PALO
0-2 · saqueador: nada · vindicador: nada · evocador: perla 0-1 (25 %) ·
ravager: cuero 1-2 · slime: bola_slime 0-2 · lepisma: nada ·
fantasma: membrana 0-1.

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
    asado.
*   **Combustibles** (`COMBUSTIBLES`, usos por unidad): carbón ×4 ·
    tronco ×2 · tablones ×1 · palo ×1.

## Bloques funcionales (ids 63-69, téselas 99-107)

| Id | Bloque | Téselas | Función |
|---|---|---|---|
| 63 | Horno | side 99, frente 100, top 101 | interfaz de fundición (clic der) |
| 64 | Puerta (cerrada) | 102 | clic derecho la abre; colisiona |
| 65 | Puerta (abierta) | 103 | clic derecho la cierra; se atraviesa |
| 66 | Valla | 104 (cross) | colisiona; decorativa |
| 67 | Ventana | 105 | cristal con marco de madera |
| 68 | Antorcha | 106 (cross) | brilla con luz propia (decorativa) |
| 69 | Cama | top 107, side PLANKS | clic derecho de noche → amanece |

**Recetas nuevas**: horno (anillo de 8 adoquines) · puerta (2×3 de
tablones) · valla (3×2 alternando palo/tablón: `SPS`/`SPS`) · ventana (2×2
de cristal → 2) · antorcha (carbón sobre palo → 4) · cama (lana sobre
tablones: `WWW`/`PPP`) · espadas (material ×2 sobre palo, en columna) ·
picos/hachas/palas de hierro (como las de piedra con lingotes).

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
*   **Paneles finos** — ✅ implementado para puerta y ventana (caja fina
    centrada, sin orientación); trampillas y cristaleras quedan como futuro.

## Verificación

*   `node test/smoke.mjs` — fundiciones/combustibles/recetas nuevas y
    contrato de items.
*   `node test/mobs.mjs` — drops al morir (roll determinista con el PRNG del
    sistema) y contrato `drops` de las 68 definiciones (validador).

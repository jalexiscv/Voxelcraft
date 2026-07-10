/**
 * Generador de materiales: produce js/materiales.data.js a partir de una tabla
 * curada de familias (nombres de PNG ya verificados contra textures/blocks/ +
 * flags de material correctos que el terrain_texture.json no conoce: dureza,
 * herramienta, opacidad).
 *
 * Cada material se declara como { key, name, tex, flags }:
 *   - key: sufijo estable para el id en B y la tésela en TILE (MAT_<KEY>)
 *   - tex: 'archivo'  (una textura para todas las caras)
 *          {top,side,bottom} (caras distintas; bottom cae a top si falta)
 *   - flags: se pasan tal cual a def() en blocks.js
 *
 * El generador NO asigna números de id/tésela: eso lo hace la integración en
 * runtime a partir de una base, para no chocar con los ids existentes.
 */
import { writeFileSync, existsSync } from 'node:fs';

const ROOT = 'c:/xampp/htdocs/Minecraft';
const BLOCKS = ROOT + '/textures/blocks/';

// ---- Colores tintados en ORDEN BEDROCK (data value 0..15) ----
const TINTES = [
  ['WHITE', 'blanco', 'white'], ['ORANGE', 'naranja', 'orange'],
  ['MAGENTA', 'magenta', 'magenta'], ['LIGHT_BLUE', 'azul claro', 'light_blue'],
  ['YELLOW', 'amarillo', 'yellow'], ['LIME', 'lima', 'lime'],
  ['PINK', 'rosa', 'pink'], ['GRAY', 'gris', 'gray'],
  ['SILVER', 'gris claro', 'silver'], ['CYAN', 'cian', 'cyan'],
  ['PURPLE', 'púrpura', 'purple'], ['BLUE', 'azul', 'blue'],
  ['BROWN', 'marrón', 'brown'], ['GREEN', 'verde', 'green'],
  ['RED', 'rojo', 'red'], ['BLACK', 'negro', 'black'],
];

const mats = [];
const add = (key, name, tex, flags = {}) => mats.push({ key, name, tex, flags });

/* ===================== PIEDRAS Y DERIVADOS ===================== */
// (granito/diorita/andesita ya existen como GRANITE/DIORITE/ANDESITE en blocks.js;
//  aquí van los pulidos y el resto de la familia pétrea)
add('POLISHED_GRANITE', 'Granito pulido', 'stone_granite_smooth');
add('POLISHED_DIORITE', 'Diorita pulida', 'stone_diorite_smooth');
add('POLISHED_ANDESITE', 'Andesita pulida', 'stone_andesite_smooth');
add('SMOOTH_STONE', 'Piedra lisa', 'stone_slab_top');
add('MOSSY_STONE_BRICKS', 'Ladrillos de piedra musgosos', 'stonebrick_mossy');
add('CRACKED_STONE_BRICKS', 'Ladrillos de piedra agrietados', 'stonebrick_cracked');
add('CHISELED_STONE_BRICKS', 'Ladrillos de piedra cincelados', 'stonebrick_carved');
add('STONE_BRICKS', 'Ladrillos de piedra', 'stonebrick');
add('SANDSTONE', 'Arenisca', { top: 'sandstone_top', side: 'sandstone_normal', bottom: 'sandstone_bottom' });
add('SMOOTH_SANDSTONE', 'Arenisca lisa', 'sandstone_smooth');
add('CHISELED_SANDSTONE', 'Arenisca cincelada', { top: 'sandstone_top', side: 'sandstone_carved', bottom: 'sandstone_bottom' });
add('QUARTZ_BLOCK', 'Bloque de cuarzo', { top: 'quartz_block_top', side: 'quartz_block_side', bottom: 'quartz_block_bottom' });
add('CHISELED_QUARTZ', 'Cuarzo cincelado', 'quartz_block_chiseled');
add('QUARTZ_PILLAR', 'Cuarzo con vetas', { top: 'quartz_block_top', side: 'quartz_block_lines' });
add('PRISMARINE', 'Prismarina', 'prismarine_rough');
add('DARK_PRISMARINE', 'Prismarina oscura', 'prismarine_dark');
add('PRISMARINE_BRICKS', 'Ladrillos de prismarina', 'prismarine_bricks');
add('NETHERRACK', 'Netherrack', 'netherrack', { hardness: 2 });
add('NETHER_BRICKS', 'Ladrillos del Nether', 'nether_brick');
add('END_STONE', 'Piedra del End', 'end_stone', { hardness: 9 });
add('END_STONE_BRICKS', 'Ladrillos de piedra del End', 'end_bricks', { hardness: 9 });
add('HARDENED_CLAY', 'Arcilla endurecida', 'hardened_clay');
add('PACKED_ICE', 'Hielo compacto', 'ice_packed', { opaque: false, hideSame: true, hardness: 2 });
add('BLUE_ICE', 'Hielo azul', 'blue_ice', { hardness: 2 });
add('GLOWSTONE', 'Piedra luminosa', 'glowstone', { bright: true, hardness: 1, tool: null });
add('SEA_LANTERN', 'Farol marino', 'sea_lantern', { bright: true, hardness: 1, tool: null });

/* ===================== MADERAS COMPLETAS ===================== */
// 6 tipos: roble, abeto, abedul, jungla, acacia, roble oscuro (big_oak).
// Cada tipo: tronco (top/side), tablones, hojas (no opacas). El roble base ya
// existe (LOG/PLANKS/LEAVES), así que aquí van los otros 5 + variantes de roble.
const MADERAS = [
  ['SPRUCE', 'abeto', 'spruce'], ['BIRCH', 'abedul', 'birch'],
  ['JUNGLE', 'jungla', 'jungle'], ['ACACIA', 'acacia', 'acacia'],
  ['DARK_OAK', 'roble oscuro', 'big_oak'],
];
for (const [KEY, nom, png] of MADERAS) {
  add(`${KEY}_LOG`, `Tronco de ${nom}`, { top: `log_${png}_top`, side: `log_${png}` }, { sound: 'wood' });
  add(`${KEY}_PLANKS`, `Tablones de ${nom}`, `planks_${png === 'big_oak' ? 'big_oak' : png}`, { sound: 'wood' });
  add(`${KEY}_LEAVES`, `Hojas de ${nom}`, `leaves_${png === 'big_oak' ? 'big_oak' : png}_opaque`, { opaque: false, sound: 'grass', hardness: 1, tool: null });
}

/* ===================== MINERALES Y METALES ===================== */
const MENAS = [
  ['COAL', 'carbón', 'coal_ore', 'coal_block', 5],
  ['IRON', 'hierro', 'iron_ore', 'iron_block', 6],
  ['GOLD', 'oro', 'gold_ore', 'gold_block', 6],
  ['DIAMOND', 'diamante', 'diamond_ore', 'diamond_block', 8],
  ['EMERALD', 'esmeralda', 'emerald_ore', 'emerald_block', 8],
  ['LAPIS', 'lapislázuli', 'lapis_ore', 'lapis_block', 6],
  ['REDSTONE', 'redstone', 'redstone_ore', 'redstone_block', 6],
];
for (const [KEY, nom, ore, block, dur] of MENAS) {
  // las menas de oro/hierro/carbón base ya existen; añadimos solo las que faltan
  if (!['COAL', 'IRON', 'GOLD'].includes(KEY)) add(`${KEY}_ORE`, `Mena de ${nom}`, ore, { hardness: dur });
  add(`${KEY}_BLOCK`, `Bloque de ${nom}`, block, { hardness: dur });
}
add('QUARTZ_ORE', 'Mena de cuarzo del Nether', 'quartz_ore', { hardness: 5 });

/* ===================== DECORATIVOS Y COLOR ===================== */
for (const [KEY, nom, png] of TINTES) {
  add(`CONCRETE_${KEY}`, `Hormigón ${nom}`, `concrete_${png}`, { hardness: 4 });
  add(`CONCRETE_POWDER_${KEY}`, `Hormigón en polvo ${nom}`, `concrete_powder_${png}`, { sound: 'sand', hardness: 2, tool: 'pala' });
  add(`TERRACOTTA_${KEY}`, `Terracota ${nom}`, `hardened_clay_stained_${png}`, { hardness: 5 });
  add(`STAINED_GLASS_${KEY}`, `Cristal tintado ${nom}`, `glass_${png}`, { opaque: false, hideSame: true, hardness: 1, tool: null });
}

/* ===================== TRONCOS PELADOS (stripped) ===================== */
// los 6 tipos, incluido el roble (aquí sí, porque no existe stripped base en blocks.js)
const PELADOS = [
  ['OAK', 'roble', 'oak'], ['SPRUCE', 'abeto', 'spruce'], ['BIRCH', 'abedul', 'birch'],
  ['JUNGLE', 'jungla', 'jungle'], ['ACACIA', 'acacia', 'acacia'], ['DARK_OAK', 'roble oscuro', 'dark_oak'],
];
for (const [KEY, nom, png] of PELADOS) {
  add(`STRIPPED_${KEY}_LOG`, `Tronco pelado de ${nom}`,
    { top: `stripped_${png}_log_top`, side: `stripped_${png}_log` }, { sound: 'wood' });
}

/* ===================== NETHER Y END EXTRA ===================== */
add('SOUL_SAND', 'Arena de almas', 'soul_sand', { sound: 'sand', hardness: 2, tool: 'pala' });
add('MAGMA_BLOCK', 'Bloque de magma', 'magma', { bright: true, hardness: 2 });
add('RED_NETHER_BRICKS', 'Ladrillos rojos del Nether', 'red_nether_brick');
add('NETHER_WART_BLOCK', 'Bloque de verruga del Nether', 'nether_wart_block', { sound: 'grass', hardness: 1, tool: null });
add('PURPUR_BLOCK', 'Bloque de púrpura', 'purpur_block');
add('PURPUR_PILLAR', 'Columna de púrpura', { top: 'purpur_pillar_top', side: 'purpur_pillar' });

/* ===================== NATURALES Y GRANJA ===================== */
add('COARSE_DIRT', 'Tierra estéril', 'coarse_dirt', { sound: 'grass', hardness: 1, tool: 'pala' });
add('CLAY', 'Bloque de arcilla', 'clay', { sound: 'gravel', hardness: 1, tool: 'pala' });
add('SLIME_BLOCK', 'Bloque de slime', 'slime', { opaque: false, hideSame: true, hardness: 1, tool: null });
add('BONE_BLOCK', 'Bloque de huesos', { top: 'bone_block_top', side: 'bone_block_side' });
add('HAY_BLOCK', 'Bloque de heno', { top: 'hay_block_top', side: 'hay_block_side' }, { sound: 'grass', hardness: 1, tool: null });
add('MELON', 'Sandía', { top: 'melon_top', side: 'melon_side' }, { sound: 'wood', hardness: 1, tool: 'hacha' });
add('PUMPKIN', 'Calabaza', { top: 'pumpkin_top', side: 'pumpkin_side' }, { sound: 'wood', hardness: 1, tool: 'hacha' });
add('ICE', 'Hielo del paquete', 'ice', { opaque: false, hideSame: true, hardness: 1, tool: null });
add('SNOW_BLOCK', 'Bloque de nieve', 'snow', { sound: 'cloth', hardness: 1, tool: 'pala' });

/* ===================== TERRACOTA GLASEADA (16 colores) ===================== */
for (const [KEY, nom, png] of TINTES) {
  add(`GLAZED_TERRACOTTA_${KEY}`, `Terracota glaseada ${nom}`, `glazed_terracotta_${png}`, { hardness: 5 });
}

/* ===================== VALIDACIÓN Y ESCRITURA ===================== */
const rutas = new Set();
const faltan = [];
for (const m of mats) {
  const caras = typeof m.tex === 'string' ? [m.tex] : Object.values(m.tex);
  for (const c of caras) { rutas.add(c); if (!existsSync(BLOCKS + c + '.png')) faltan.push(`${m.key}: ${c}.png`); }
}
if (faltan.length) {
  console.error('FALTAN PNG:\n' + faltan.join('\n'));
  process.exit(1);
}

// claves duplicadas
const keys = mats.map(m => m.key);
const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dup.length) { console.error('CLAVES DUPLICADAS:', dup); process.exit(1); }

const cabecera = `/**
 * Materiales del juego GENERADOS desde el paquete de texturas real.
 * NO editar a mano: regenerar con scratchpad/gen-materiales.mjs.
 *
 * Cada material se registra en runtime (js/materiales.js) asignándole un id de
 * bloque y una tésela de atlas correlativos a partir de una base, más su PNG
 * en el atlas. tex es 'archivo' (todas las caras) o {top,side,bottom}.
 *
 * ${mats.length} materiales · ${rutas.size} téselas PNG únicas · generado sin fecha (determinista)
 */
export const MATERIALES = `;

writeFileSync(ROOT + '/js/materiales.data.js', cabecera + JSON.stringify(mats, null, 2) + ';\n');
console.log(`OK: ${mats.length} materiales, ${rutas.size} téselas PNG únicas → js/materiales.data.js`);
console.log('Por familia:');
console.log('  piedras:', mats.filter(m => /GRANITE|DIORITE|ANDESITE|STONE|SAND|QUARTZ|PRISMARINE|NETHER|END|CLAY|ICE|GLOWSTONE|SEA_LANTERN/.test(m.key) && !m.key.includes('ORE') && !m.key.includes('BLOCK')).length);
console.log('  maderas:', mats.filter(m => /_LOG|_PLANKS|_LEAVES/.test(m.key)).length);
console.log('  minerales:', mats.filter(m => /_ORE|_BLOCK/.test(m.key)).length);
console.log('  color:', mats.filter(m => /CONCRETE|TERRACOTTA|STAINED_GLASS/.test(m.key)).length);

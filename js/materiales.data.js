/**
 * Materiales del juego GENERADOS desde el paquete de texturas real.
 * NO editar a mano: regenerar con scratchpad/gen-materiales.mjs.
 *
 * Cada material se registra en runtime (js/materiales.js) asignándole un id de
 * bloque y una tésela de atlas correlativos a partir de una base, más su PNG
 * en el atlas. tex es 'archivo' (todas las caras) o {top,side,bottom}.
 *
 * 154 materiales · 174 téselas PNG únicas · generado sin fecha (determinista)
 */
export const MATERIALES = [
  {
    "key": "POLISHED_GRANITE",
    "name": "Granito pulido",
    "tex": "stone_granite_smooth",
    "flags": {}
  },
  {
    "key": "POLISHED_DIORITE",
    "name": "Diorita pulida",
    "tex": "stone_diorite_smooth",
    "flags": {}
  },
  {
    "key": "POLISHED_ANDESITE",
    "name": "Andesita pulida",
    "tex": "stone_andesite_smooth",
    "flags": {}
  },
  {
    "key": "SMOOTH_STONE",
    "name": "Piedra lisa",
    "tex": "stone_slab_top",
    "flags": {}
  },
  {
    "key": "MOSSY_STONE_BRICKS",
    "name": "Ladrillos de piedra musgosos",
    "tex": "stonebrick_mossy",
    "flags": {}
  },
  {
    "key": "CRACKED_STONE_BRICKS",
    "name": "Ladrillos de piedra agrietados",
    "tex": "stonebrick_cracked",
    "flags": {}
  },
  {
    "key": "CHISELED_STONE_BRICKS",
    "name": "Ladrillos de piedra cincelados",
    "tex": "stonebrick_carved",
    "flags": {}
  },
  {
    "key": "STONE_BRICKS",
    "name": "Ladrillos de piedra",
    "tex": "stonebrick",
    "flags": {}
  },
  {
    "key": "SANDSTONE",
    "name": "Arenisca",
    "tex": {
      "top": "sandstone_top",
      "side": "sandstone_normal",
      "bottom": "sandstone_bottom"
    },
    "flags": {}
  },
  {
    "key": "SMOOTH_SANDSTONE",
    "name": "Arenisca lisa",
    "tex": "sandstone_smooth",
    "flags": {}
  },
  {
    "key": "CHISELED_SANDSTONE",
    "name": "Arenisca cincelada",
    "tex": {
      "top": "sandstone_top",
      "side": "sandstone_carved",
      "bottom": "sandstone_bottom"
    },
    "flags": {}
  },
  {
    "key": "QUARTZ_BLOCK",
    "name": "Bloque de cuarzo",
    "tex": {
      "top": "quartz_block_top",
      "side": "quartz_block_side",
      "bottom": "quartz_block_bottom"
    },
    "flags": {}
  },
  {
    "key": "CHISELED_QUARTZ",
    "name": "Cuarzo cincelado",
    "tex": "quartz_block_chiseled",
    "flags": {}
  },
  {
    "key": "QUARTZ_PILLAR",
    "name": "Cuarzo con vetas",
    "tex": {
      "top": "quartz_block_top",
      "side": "quartz_block_lines"
    },
    "flags": {}
  },
  {
    "key": "PRISMARINE",
    "name": "Prismarina",
    "tex": "prismarine_rough",
    "flags": {}
  },
  {
    "key": "DARK_PRISMARINE",
    "name": "Prismarina oscura",
    "tex": "prismarine_dark",
    "flags": {}
  },
  {
    "key": "PRISMARINE_BRICKS",
    "name": "Ladrillos de prismarina",
    "tex": "prismarine_bricks",
    "flags": {}
  },
  {
    "key": "NETHERRACK",
    "name": "Netherrack",
    "tex": "netherrack",
    "flags": {
      "hardness": 2
    }
  },
  {
    "key": "NETHER_BRICKS",
    "name": "Ladrillos del Nether",
    "tex": "nether_brick",
    "flags": {}
  },
  {
    "key": "END_STONE",
    "name": "Piedra del End",
    "tex": "end_stone",
    "flags": {
      "hardness": 9
    }
  },
  {
    "key": "END_STONE_BRICKS",
    "name": "Ladrillos de piedra del End",
    "tex": "end_bricks",
    "flags": {
      "hardness": 9
    }
  },
  {
    "key": "HARDENED_CLAY",
    "name": "Arcilla endurecida",
    "tex": "hardened_clay",
    "flags": {}
  },
  {
    "key": "PACKED_ICE",
    "name": "Hielo compacto",
    "tex": "ice_packed",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 2
    }
  },
  {
    "key": "BLUE_ICE",
    "name": "Hielo azul",
    "tex": "blue_ice",
    "flags": {
      "hardness": 2
    }
  },
  {
    "key": "GLOWSTONE",
    "name": "Piedra luminosa",
    "tex": "glowstone",
    "flags": {
      "bright": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "SEA_LANTERN",
    "name": "Farol marino",
    "tex": "sea_lantern",
    "flags": {
      "bright": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "SPRUCE_LOG",
    "name": "Tronco de abeto",
    "tex": {
      "top": "log_spruce_top",
      "side": "log_spruce"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "SPRUCE_PLANKS",
    "name": "Tablones de abeto",
    "tex": "planks_spruce",
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "SPRUCE_LEAVES",
    "name": "Hojas de abeto",
    "tex": "leaves_spruce_opaque",
    "flags": {
      "opaque": false,
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "BIRCH_LOG",
    "name": "Tronco de abedul",
    "tex": {
      "top": "log_birch_top",
      "side": "log_birch"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "BIRCH_PLANKS",
    "name": "Tablones de abedul",
    "tex": "planks_birch",
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "BIRCH_LEAVES",
    "name": "Hojas de abedul",
    "tex": "leaves_birch_opaque",
    "flags": {
      "opaque": false,
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "JUNGLE_LOG",
    "name": "Tronco de jungla",
    "tex": {
      "top": "log_jungle_top",
      "side": "log_jungle"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "JUNGLE_PLANKS",
    "name": "Tablones de jungla",
    "tex": "planks_jungle",
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "JUNGLE_LEAVES",
    "name": "Hojas de jungla",
    "tex": "leaves_jungle_opaque",
    "flags": {
      "opaque": false,
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "ACACIA_LOG",
    "name": "Tronco de acacia",
    "tex": {
      "top": "log_acacia_top",
      "side": "log_acacia"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "ACACIA_PLANKS",
    "name": "Tablones de acacia",
    "tex": "planks_acacia",
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "ACACIA_LEAVES",
    "name": "Hojas de acacia",
    "tex": "leaves_acacia_opaque",
    "flags": {
      "opaque": false,
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "DARK_OAK_LOG",
    "name": "Tronco de roble oscuro",
    "tex": {
      "top": "log_big_oak_top",
      "side": "log_big_oak"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "DARK_OAK_PLANKS",
    "name": "Tablones de roble oscuro",
    "tex": "planks_big_oak",
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "DARK_OAK_LEAVES",
    "name": "Hojas de roble oscuro",
    "tex": "leaves_big_oak_opaque",
    "flags": {
      "opaque": false,
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "COAL_BLOCK",
    "name": "Bloque de carbón",
    "tex": "coal_block",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "IRON_BLOCK",
    "name": "Bloque de hierro",
    "tex": "iron_block",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "GOLD_BLOCK",
    "name": "Bloque de oro",
    "tex": "gold_block",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "DIAMOND_ORE",
    "name": "Mena de diamante",
    "tex": "diamond_ore",
    "flags": {
      "hardness": 8
    }
  },
  {
    "key": "DIAMOND_BLOCK",
    "name": "Bloque de diamante",
    "tex": "diamond_block",
    "flags": {
      "hardness": 8
    }
  },
  {
    "key": "EMERALD_ORE",
    "name": "Mena de esmeralda",
    "tex": "emerald_ore",
    "flags": {
      "hardness": 8
    }
  },
  {
    "key": "EMERALD_BLOCK",
    "name": "Bloque de esmeralda",
    "tex": "emerald_block",
    "flags": {
      "hardness": 8
    }
  },
  {
    "key": "LAPIS_ORE",
    "name": "Mena de lapislázuli",
    "tex": "lapis_ore",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "LAPIS_BLOCK",
    "name": "Bloque de lapislázuli",
    "tex": "lapis_block",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "REDSTONE_ORE",
    "name": "Mena de redstone",
    "tex": "redstone_ore",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "REDSTONE_BLOCK",
    "name": "Bloque de redstone",
    "tex": "redstone_block",
    "flags": {
      "hardness": 6
    }
  },
  {
    "key": "QUARTZ_ORE",
    "name": "Mena de cuarzo del Nether",
    "tex": "quartz_ore",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "CONCRETE_WHITE",
    "name": "Hormigón blanco",
    "tex": "concrete_white",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_WHITE",
    "name": "Hormigón en polvo blanco",
    "tex": "concrete_powder_white",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_WHITE",
    "name": "Terracota blanco",
    "tex": "hardened_clay_stained_white",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_WHITE",
    "name": "Cristal tintado blanco",
    "tex": "glass_white",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_ORANGE",
    "name": "Hormigón naranja",
    "tex": "concrete_orange",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_ORANGE",
    "name": "Hormigón en polvo naranja",
    "tex": "concrete_powder_orange",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_ORANGE",
    "name": "Terracota naranja",
    "tex": "hardened_clay_stained_orange",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_ORANGE",
    "name": "Cristal tintado naranja",
    "tex": "glass_orange",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_MAGENTA",
    "name": "Hormigón magenta",
    "tex": "concrete_magenta",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_MAGENTA",
    "name": "Hormigón en polvo magenta",
    "tex": "concrete_powder_magenta",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_MAGENTA",
    "name": "Terracota magenta",
    "tex": "hardened_clay_stained_magenta",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_MAGENTA",
    "name": "Cristal tintado magenta",
    "tex": "glass_magenta",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_LIGHT_BLUE",
    "name": "Hormigón azul claro",
    "tex": "concrete_light_blue",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_LIGHT_BLUE",
    "name": "Hormigón en polvo azul claro",
    "tex": "concrete_powder_light_blue",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_LIGHT_BLUE",
    "name": "Terracota azul claro",
    "tex": "hardened_clay_stained_light_blue",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_LIGHT_BLUE",
    "name": "Cristal tintado azul claro",
    "tex": "glass_light_blue",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_YELLOW",
    "name": "Hormigón amarillo",
    "tex": "concrete_yellow",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_YELLOW",
    "name": "Hormigón en polvo amarillo",
    "tex": "concrete_powder_yellow",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_YELLOW",
    "name": "Terracota amarillo",
    "tex": "hardened_clay_stained_yellow",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_YELLOW",
    "name": "Cristal tintado amarillo",
    "tex": "glass_yellow",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_LIME",
    "name": "Hormigón lima",
    "tex": "concrete_lime",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_LIME",
    "name": "Hormigón en polvo lima",
    "tex": "concrete_powder_lime",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_LIME",
    "name": "Terracota lima",
    "tex": "hardened_clay_stained_lime",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_LIME",
    "name": "Cristal tintado lima",
    "tex": "glass_lime",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_PINK",
    "name": "Hormigón rosa",
    "tex": "concrete_pink",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_PINK",
    "name": "Hormigón en polvo rosa",
    "tex": "concrete_powder_pink",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_PINK",
    "name": "Terracota rosa",
    "tex": "hardened_clay_stained_pink",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_PINK",
    "name": "Cristal tintado rosa",
    "tex": "glass_pink",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_GRAY",
    "name": "Hormigón gris",
    "tex": "concrete_gray",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_GRAY",
    "name": "Hormigón en polvo gris",
    "tex": "concrete_powder_gray",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_GRAY",
    "name": "Terracota gris",
    "tex": "hardened_clay_stained_gray",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_GRAY",
    "name": "Cristal tintado gris",
    "tex": "glass_gray",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_SILVER",
    "name": "Hormigón gris claro",
    "tex": "concrete_silver",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_SILVER",
    "name": "Hormigón en polvo gris claro",
    "tex": "concrete_powder_silver",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_SILVER",
    "name": "Terracota gris claro",
    "tex": "hardened_clay_stained_silver",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_SILVER",
    "name": "Cristal tintado gris claro",
    "tex": "glass_silver",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_CYAN",
    "name": "Hormigón cian",
    "tex": "concrete_cyan",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_CYAN",
    "name": "Hormigón en polvo cian",
    "tex": "concrete_powder_cyan",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_CYAN",
    "name": "Terracota cian",
    "tex": "hardened_clay_stained_cyan",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_CYAN",
    "name": "Cristal tintado cian",
    "tex": "glass_cyan",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_PURPLE",
    "name": "Hormigón púrpura",
    "tex": "concrete_purple",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_PURPLE",
    "name": "Hormigón en polvo púrpura",
    "tex": "concrete_powder_purple",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_PURPLE",
    "name": "Terracota púrpura",
    "tex": "hardened_clay_stained_purple",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_PURPLE",
    "name": "Cristal tintado púrpura",
    "tex": "glass_purple",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_BLUE",
    "name": "Hormigón azul",
    "tex": "concrete_blue",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_BLUE",
    "name": "Hormigón en polvo azul",
    "tex": "concrete_powder_blue",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_BLUE",
    "name": "Terracota azul",
    "tex": "hardened_clay_stained_blue",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_BLUE",
    "name": "Cristal tintado azul",
    "tex": "glass_blue",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_BROWN",
    "name": "Hormigón marrón",
    "tex": "concrete_brown",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_BROWN",
    "name": "Hormigón en polvo marrón",
    "tex": "concrete_powder_brown",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_BROWN",
    "name": "Terracota marrón",
    "tex": "hardened_clay_stained_brown",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_BROWN",
    "name": "Cristal tintado marrón",
    "tex": "glass_brown",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_GREEN",
    "name": "Hormigón verde",
    "tex": "concrete_green",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_GREEN",
    "name": "Hormigón en polvo verde",
    "tex": "concrete_powder_green",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_GREEN",
    "name": "Terracota verde",
    "tex": "hardened_clay_stained_green",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_GREEN",
    "name": "Cristal tintado verde",
    "tex": "glass_green",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_RED",
    "name": "Hormigón rojo",
    "tex": "concrete_red",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_RED",
    "name": "Hormigón en polvo rojo",
    "tex": "concrete_powder_red",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_RED",
    "name": "Terracota rojo",
    "tex": "hardened_clay_stained_red",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_RED",
    "name": "Cristal tintado rojo",
    "tex": "glass_red",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "CONCRETE_BLACK",
    "name": "Hormigón negro",
    "tex": "concrete_black",
    "flags": {
      "hardness": 4
    }
  },
  {
    "key": "CONCRETE_POWDER_BLACK",
    "name": "Hormigón en polvo negro",
    "tex": "concrete_powder_black",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "TERRACOTTA_BLACK",
    "name": "Terracota negro",
    "tex": "hardened_clay_stained_black",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "STAINED_GLASS_BLACK",
    "name": "Cristal tintado negro",
    "tex": "glass_black",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "STRIPPED_OAK_LOG",
    "name": "Tronco pelado de roble",
    "tex": {
      "top": "stripped_oak_log_top",
      "side": "stripped_oak_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "STRIPPED_SPRUCE_LOG",
    "name": "Tronco pelado de abeto",
    "tex": {
      "top": "stripped_spruce_log_top",
      "side": "stripped_spruce_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "STRIPPED_BIRCH_LOG",
    "name": "Tronco pelado de abedul",
    "tex": {
      "top": "stripped_birch_log_top",
      "side": "stripped_birch_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "STRIPPED_JUNGLE_LOG",
    "name": "Tronco pelado de jungla",
    "tex": {
      "top": "stripped_jungle_log_top",
      "side": "stripped_jungle_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "STRIPPED_ACACIA_LOG",
    "name": "Tronco pelado de acacia",
    "tex": {
      "top": "stripped_acacia_log_top",
      "side": "stripped_acacia_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "STRIPPED_DARK_OAK_LOG",
    "name": "Tronco pelado de roble oscuro",
    "tex": {
      "top": "stripped_dark_oak_log_top",
      "side": "stripped_dark_oak_log"
    },
    "flags": {
      "sound": "wood"
    }
  },
  {
    "key": "SOUL_SAND",
    "name": "Arena de almas",
    "tex": "soul_sand",
    "flags": {
      "sound": "sand",
      "hardness": 2,
      "tool": "pala"
    }
  },
  {
    "key": "MAGMA_BLOCK",
    "name": "Bloque de magma",
    "tex": "magma",
    "flags": {
      "bright": true,
      "hardness": 2
    }
  },
  {
    "key": "RED_NETHER_BRICKS",
    "name": "Ladrillos rojos del Nether",
    "tex": "red_nether_brick",
    "flags": {}
  },
  {
    "key": "NETHER_WART_BLOCK",
    "name": "Bloque de verruga del Nether",
    "tex": "nether_wart_block",
    "flags": {
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "PURPUR_BLOCK",
    "name": "Bloque de púrpura",
    "tex": "purpur_block",
    "flags": {}
  },
  {
    "key": "PURPUR_PILLAR",
    "name": "Columna de púrpura",
    "tex": {
      "top": "purpur_pillar_top",
      "side": "purpur_pillar"
    },
    "flags": {}
  },
  {
    "key": "COARSE_DIRT",
    "name": "Tierra estéril",
    "tex": "coarse_dirt",
    "flags": {
      "sound": "grass",
      "hardness": 1,
      "tool": "pala"
    }
  },
  {
    "key": "CLAY",
    "name": "Bloque de arcilla",
    "tex": "clay",
    "flags": {
      "sound": "gravel",
      "hardness": 1,
      "tool": "pala"
    }
  },
  {
    "key": "SLIME_BLOCK",
    "name": "Bloque de slime",
    "tex": "slime",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "BONE_BLOCK",
    "name": "Bloque de huesos",
    "tex": {
      "top": "bone_block_top",
      "side": "bone_block_side"
    },
    "flags": {}
  },
  {
    "key": "HAY_BLOCK",
    "name": "Bloque de heno",
    "tex": {
      "top": "hay_block_top",
      "side": "hay_block_side"
    },
    "flags": {
      "sound": "grass",
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "MELON",
    "name": "Sandía",
    "tex": {
      "top": "melon_top",
      "side": "melon_side"
    },
    "flags": {
      "sound": "wood",
      "hardness": 1,
      "tool": "hacha"
    }
  },
  {
    "key": "PUMPKIN",
    "name": "Calabaza",
    "tex": {
      "top": "pumpkin_top",
      "side": "pumpkin_side"
    },
    "flags": {
      "sound": "wood",
      "hardness": 1,
      "tool": "hacha"
    }
  },
  {
    "key": "ICE",
    "name": "Hielo del paquete",
    "tex": "ice",
    "flags": {
      "opaque": false,
      "hideSame": true,
      "hardness": 1,
      "tool": null
    }
  },
  {
    "key": "SNOW_BLOCK",
    "name": "Bloque de nieve",
    "tex": "snow",
    "flags": {
      "sound": "cloth",
      "hardness": 1,
      "tool": "pala"
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_WHITE",
    "name": "Terracota glaseada blanco",
    "tex": "glazed_terracotta_white",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_ORANGE",
    "name": "Terracota glaseada naranja",
    "tex": "glazed_terracotta_orange",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_MAGENTA",
    "name": "Terracota glaseada magenta",
    "tex": "glazed_terracotta_magenta",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_LIGHT_BLUE",
    "name": "Terracota glaseada azul claro",
    "tex": "glazed_terracotta_light_blue",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_YELLOW",
    "name": "Terracota glaseada amarillo",
    "tex": "glazed_terracotta_yellow",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_LIME",
    "name": "Terracota glaseada lima",
    "tex": "glazed_terracotta_lime",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_PINK",
    "name": "Terracota glaseada rosa",
    "tex": "glazed_terracotta_pink",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_GRAY",
    "name": "Terracota glaseada gris",
    "tex": "glazed_terracotta_gray",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_SILVER",
    "name": "Terracota glaseada gris claro",
    "tex": "glazed_terracotta_silver",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_CYAN",
    "name": "Terracota glaseada cian",
    "tex": "glazed_terracotta_cyan",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_PURPLE",
    "name": "Terracota glaseada púrpura",
    "tex": "glazed_terracotta_purple",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_BLUE",
    "name": "Terracota glaseada azul",
    "tex": "glazed_terracotta_blue",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_BROWN",
    "name": "Terracota glaseada marrón",
    "tex": "glazed_terracotta_brown",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_GREEN",
    "name": "Terracota glaseada verde",
    "tex": "glazed_terracotta_green",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_RED",
    "name": "Terracota glaseada rojo",
    "tex": "glazed_terracotta_red",
    "flags": {
      "hardness": 5
    }
  },
  {
    "key": "GLAZED_TERRACOTTA_BLACK",
    "name": "Terracota glaseada negro",
    "tex": "glazed_terracotta_black",
    "flags": {
      "hardness": 5
    }
  }
];

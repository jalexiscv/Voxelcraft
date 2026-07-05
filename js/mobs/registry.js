/**
 * Registro de mobs: la única fuente de verdad de qué tipos existen.
 * Añadir un mob nuevo = crear su definición en js/mobs/ (contrato en
 * model.js, ejemplo canónico en pig.js) e importarla aquí.
 *
 * El elenco recrea los 68 mobs del Overworld de la lista oficial de
 * Minecraft Java Edition 26.2 (ver documents/02-mobs.md), agrupado por
 * las categorías oficiales del juego: pasivos, neutrales y hostiles
 * (la locomoción — terrestre/volador/acuático — es el subgrupo). Tras el
 * elenco oficial van los mobs PROPIOS de la casa (el dron guardián), que
 * no aparecen de forma natural: se invocan con su huevo del creativo.
 */
// Pasivos — terrestres
import pig from './pig.js';
import sheep from './sheep.js';
import cow from './cow.js';
import chicken from './chicken.js';
import armadillo from './armadillo.js';
import camel from './camel.js';
import camel_husk from './camel_husk.js';
import cat from './cat.js';
import ocelot from './ocelot.js';
import fox from './fox.js';
import horse from './horse.js';
import donkey from './donkey.js';
import mooshroom from './mooshroom.js';
import rabbit from './rabbit.js';
import sniffer from './sniffer.js';
import copper_golem from './copper_golem.js';
import snow_golem from './snow_golem.js';
import turtle from './turtle.js';
import villager from './villager.js';
import wandering_trader from './wandering_trader.js';
import frog from './frog.js';
import sulfur_cube from './sulfur_cube.js';
// Pasivos — voladores
import allay from './allay.js';
import bat from './bat.js';
import parrot from './parrot.js';
import happy_ghast from './happy_ghast.js';
// Pasivos — acuáticos
import cod from './cod.js';
import salmon from './salmon.js';
import tropical_fish from './tropical_fish.js';
import squid from './squid.js';
import glow_squid from './glow_squid.js';
import axolotl from './axolotl.js';
// Neutrales — terrestres
import wolf from './wolf.js';
import goat from './goat.js';
import panda from './panda.js';
import polar_bear from './polar_bear.js';
import iron_golem from './iron_golem.js';
import llama from './llama.js';
import enderman from './enderman.js';
// Neutrales — voladores y acuáticos
import bee from './bee.js';
import pufferfish from './pufferfish.js';
import dolphin from './dolphin.js';
import nautilus from './nautilus.js';
// Hostiles
import zombie from './zombie.js';
import skeleton from './skeleton.js';
import creeper from './creeper.js';
import spider from './spider.js';
import cave_spider from './cave_spider.js';
import drowned from './drowned.js';
import zombie_nautilus from './zombie_nautilus.js';
import husk from './husk.js';
import stray from './stray.js';
import parched from './parched.js';
import bogged from './bogged.js';
import zombie_villager from './zombie_villager.js';
import witch from './witch.js';
import pillager from './pillager.js';
import vindicator from './vindicator.js';
import evoker from './evoker.js';
import ravager from './ravager.js';
import slime from './slime.js';
import silverfish from './silverfish.js';
import ghast from './ghast.js';
import vex from './vex.js';
import creaking from './creaking.js';
import breeze from './breeze.js';
import warden from './warden.js';
import guardian from './guardian.js';
// Propios de la casa (no vanilla): solo por huevo de aparición
import dron from './dron.js';

/** Tipos indexados por id, agrupados por las categorías oficiales del juego. */
export const MOBS = {
    // pasivos — terrestres
    pig, sheep, cow, chicken, armadillo, camel, camel_husk, cat,
    ocelot, fox, horse, donkey, mooshroom, rabbit, sniffer, copper_golem,
    snow_golem, turtle, villager, wandering_trader, frog, sulfur_cube,
    // pasivos — voladores
    allay, bat, parrot, happy_ghast,
    // pasivos — acuáticos
    cod, salmon, tropical_fish, squid, glow_squid, axolotl,
    // neutrales — terrestres
    wolf, goat, panda, polar_bear, iron_golem, llama, enderman,
    // neutrales — voladores y acuáticos
    bee, pufferfish, dolphin, nautilus,
    // hostiles
    zombie, skeleton, creeper, spider, cave_spider, drowned, zombie_nautilus,
    husk, stray, parched, bogged, zombie_villager, witch, pillager, vindicator,
    evoker, ravager, slime, silverfish, ghast, vex, creaking, breeze,
    warden, guardian,
    // propios de la casa
    dron,
};

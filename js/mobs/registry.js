/**
 * Registro de mobs: la única fuente de verdad de qué tipos existen.
 * Añadir un mob nuevo = crear su definición en js/mobs/ (contrato en
 * model.js, ejemplo canónico en cerdo.js) e importarla aquí.
 *
 * El elenco recrea los 68 mobs del Overworld de la lista oficial de
 * Minecraft Java Edition 26.2 (ver documents/02-mobs.md), agrupado por
 * las categorías oficiales del juego: pasivos, neutrales y hostiles
 * (la locomoción — terrestre/volador/acuático — es el subgrupo).
 */
// Pasivos — terrestres
import cerdo from './cerdo.js';
import oveja from './oveja.js';
import vaca from './vaca.js';
import gallina from './gallina.js';
import armadillo from './armadillo.js';
import camello from './camello.js';
import camello_husk from './camello_husk.js';
import gato from './gato.js';
import ocelote from './ocelote.js';
import zorro from './zorro.js';
import caballo from './caballo.js';
import burro from './burro.js';
import mooshroom from './mooshroom.js';
import conejo from './conejo.js';
import sniffer from './sniffer.js';
import golem_cobre from './golem_cobre.js';
import golem_nieve from './golem_nieve.js';
import tortuga from './tortuga.js';
import aldeano from './aldeano.js';
import comerciante from './comerciante.js';
import rana from './rana.js';
import cubo_azufre from './cubo_azufre.js';
// Pasivos — voladores
import allay from './allay.js';
import murcielago from './murcielago.js';
import loro from './loro.js';
import fantasma_feliz from './fantasma_feliz.js';
// Pasivos — acuáticos
import bacalao from './bacalao.js';
import salmon from './salmon.js';
import pez_tropical from './pez_tropical.js';
import calamar from './calamar.js';
import calamar_brillante from './calamar_brillante.js';
import ajolote from './ajolote.js';
// Neutrales — terrestres
import lobo from './lobo.js';
import cabra from './cabra.js';
import panda from './panda.js';
import oso_polar from './oso_polar.js';
import golem_hierro from './golem_hierro.js';
import llama from './llama.js';
import enderman from './enderman.js';
// Neutrales — voladores y acuáticos
import abeja from './abeja.js';
import pez_globo from './pez_globo.js';
import delfin from './delfin.js';
import nautilus from './nautilus.js';
// Hostiles
import zombi from './zombi.js';
import esqueleto from './esqueleto.js';
import creeper from './creeper.js';
import arana from './arana.js';
import arana_cueva from './arana_cueva.js';
import ahogado from './ahogado.js';
import nautilus_zombi from './nautilus_zombi.js';
import husk from './husk.js';
import stray from './stray.js';
import parched from './parched.js';
import bogged from './bogged.js';
import zombi_aldeano from './zombi_aldeano.js';
import bruja from './bruja.js';
import saqueador from './saqueador.js';
import vindicador from './vindicador.js';
import evocador from './evocador.js';
import ravager from './ravager.js';
import slime from './slime.js';
import lepisma from './lepisma.js';
import fantasma from './fantasma.js';
import vex from './vex.js';
import creaking from './creaking.js';
import breeze from './breeze.js';
import warden from './warden.js';
import guardian from './guardian.js';

/** Tipos indexados por id, agrupados por las categorías oficiales del juego. */
export const MOBS = {
    // pasivos — terrestres
    cerdo, oveja, vaca, gallina, armadillo, camello, camello_husk, gato,
    ocelote, zorro, caballo, burro, mooshroom, conejo, sniffer, golem_cobre,
    golem_nieve, tortuga, aldeano, comerciante, rana, cubo_azufre,
    // pasivos — voladores
    allay, murcielago, loro, fantasma_feliz,
    // pasivos — acuáticos
    bacalao, salmon, pez_tropical, calamar, calamar_brillante, ajolote,
    // neutrales — terrestres
    lobo, cabra, panda, oso_polar, golem_hierro, llama, enderman,
    // neutrales — voladores y acuáticos
    abeja, pez_globo, delfin, nautilus,
    // hostiles
    zombi, esqueleto, creeper, arana, arana_cueva, ahogado, nautilus_zombi,
    husk, stray, parched, bogged, zombi_aldeano, bruja, saqueador, vindicador,
    evocador, ravager, slime, lepisma, fantasma, vex, creaking, breeze,
    warden, guardian,
};

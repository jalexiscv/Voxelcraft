/**
 * Paquete de modelos local OPCIONAL (modelpack), gemelo de js/soundpack.js.
 *
 * VoxelCraft es 100 % procedural y el repo NO distribuye geometrías ni
 * texturas del juego original: este módulo solo sondea en tiempo de ejecución
 * los directorios `models/` y `textures/` de la raíz por si el usuario ha
 * colocado ahí el resource pack oficial como override personal. Ambos
 * directorios viven únicamente en la copia local (están en .gitignore) y
 * jamás forman parte del repo; si un archivo no existe (404), el motor sigue
 * dibujando los modelos procedurales de js/mobs/*.js como siempre.
 *
 * Fuentes sondeadas, por id de mob y en este orden:
 *   1. models/entity/<archivo>.geo.json — un geo por mob; ARCHIVO_MOB
 *      traduce los ids cuyo nombre difiere del archivo (horse → horse_v3,
 *      cave_spider → spider…). Siempre se prefiere el archivo sin sufijo
 *      _v1.0 (pig.geo.json, no pig_v1.0.geo.json).
 *   2. models/mobs.json — geometrías humanoides/legacy sueltas; se buscan
 *      las claves `geometry.<id>` y `geometry.<id sin _>` (iron_golem →
 *      geometry.irongolem, la única de nuestros mobs que vive ahí).
 *
 * La conversión geo → partes es de js/geo.js (parseGeo). Aquí se resuelve
 * además la herencia «geometry.hijo:geometry.padre» que parseGeo solo
 * registra: en Bedrock los bones del hijo se AÑADEN a los del padre (la lana
 * de la oveja sobre el cuerpo esquilado, el sombrero de la bruja sobre el
 * aldeano), así que el modelo final es padre + hijo. PADRE_EXTERNO cubre el
 * único caso en que el padre vive en OTRO archivo (bruja → aldeano).
 *
 * API (sin DOM en el nivel superior; todo el trabajo de red es perezoso y
 * silencioso ante 404, con un único sondeo cacheado por id):
 *   modeloDe(mobId)   Promise<{texW, texH, partes}|null> — partes en el
 *                     contrato de js/mobs/model.js, listas para buildModel.
 *   texturaDe(mobId)  Promise<ImageBitmap|null> — textures/entity/<alias>.png
 *                     si existe en el pack local (opcional, quizá vacío).
 *   autoPiel(def, modelo, variante) — piel procedural PROPIA proyectada al
 *                     desplegado del geo (ver abajo): cero texels copiados.
 */

import { parseGeo } from './geo.js';
import { partUVRects } from './mobs/model.js';
import { Skin } from './mobs/skin.js';
import { toSeed } from './noise.js';

const BASE = 'models/';
const BASE_TEXTURAS = 'textures/entity/';

/**
 * Alias id de mob → archivo de models/entity/ (sin .geo.json) cuando el
 * nombre difiere, inventariado contra el pack real. Incluye los mobs propios
 * de la casa que son variantes claras de un modelo vanilla disponible
 * (bogged/parched son arqueros con esqueleto de esqueleto, allay es el
 * gemelo del vex…); los mobs sin correspondencia razonable (armadillo,
 * camel, sniffer, warden…) no figuran y su sondeo directo dará 404 limpio.
 */
export const ARCHIVO_MOB = {
    horse: 'horse_v3',
    donkey: 'horse_v3',
    wandering_trader: 'villager_v2',
    cave_spider: 'spider',
    glow_squid: 'squid',
    happy_ghast: 'ghast',
    allay: 'vex',
    bogged: 'skeleton',
    parched: 'skeleton',
};

/**
 * Huesos de ATREZO: equipamiento que el juego original muestra u oculta por
 * estado (silla, bridas, bocado, riendas, alforjas, armaduras, alfombras…).
 * Nuestro render dibuja todas las partes, así que se filtran siempre — un
 * burro salvaje no lleva silla. Se compara contra el nombre de la parte
 * (que conserva el del hueso, con sufijo _n en huesos multi-cubo).
 */
export const ATREZO = /^(saddle|bridle|bit[lr]?|rein|bag[lr]?|harness|rope|leash|armor|carpet|decor)/i;

/**
 * Huesos ocultos POR ESPECIE: el geo del caballo trae los dos juegos de
 * orejas (caballo y mula) y cada variante enseña el suyo; el comerciante
 * errante descarta el ala de sombrero de paja del geo del aldeano (su
 * textura la deja transparente y la auto-piel la pintaría como un
 * platillo opaco de 16×16 sobre la cabeza).
 */
export const OCULTOS_MOB = {
    horse: /^muleear/i,
    donkey: /^ear/i, // conserva MuleEar*: /^ear/ no casa «muleear»
    wandering_trader: /^brim$/i,
};

/** Filtra el atrezo (y los ocultos de la especie) de una lista de partes. */
export function filtrarAtrezo(partes, mobId) {
    const propio = OCULTOS_MOB[mobId];
    return partes.filter((p) => !ATREZO.test(p.name) && !(propio && propio.test(p.name)));
}

const G = Math.PI / 180;

/**
 * POSE por especie: ajustes estáticos por hueso que se SUMAN a la
 * conversión — `rot` en grados [x, y, z] y/o `mov` en px [x, y, z]
 * (traslada el pivote; la caja, relativa a él, viaja entera y la
 * animación gira alrededor del pivote nuevo). Cubre lo que el formato geo
 * deja al código/animación de runtime del juego original (que no viene en
 * los archivos):
 * - La araña trae las 8 patas como cajas rectas apiladas hacia ±x y el
 *   abanico clásico lo pone Molang: pares = lado −x, impares = +x;
 *   traseras (leg0/1) hacia atrás, delanteras (leg6/7) hacia delante,
 *   puntas caídas al suelo.
 * - El enderman legacy trae la cabeza incrustada en el torso (y 24-32,
 *   con la capucha flotando en su sitio real) y las piernas 4 px bajo el
 *   suelo: el renderer original las recolocaba por código.
 */
const ABANICO_ARANA = {
    leg0: { rot: [0, 40, 15] }, leg1: { rot: [0, -40, -15] },
    leg2: { rot: [0, 15, 12] }, leg3: { rot: [0, -15, -12] },
    leg4: { rot: [0, -15, 12] }, leg5: { rot: [0, 15, -12] },
    leg6: { rot: [0, -40, 15] }, leg7: { rot: [0, 40, -15] },
};
export const POSE_MOB = {
    spider: ABANICO_ARANA,
    cave_spider: ABANICO_ARANA,
    enderman: {
        head: { mov: [0, 14, 0] },     // 24..32 → 38..46, sobre el torso
        rightleg: { mov: [0, 4, 0] },  // −4..26 → 0..30: pies a ras
        leftleg: { mov: [0, 4, 0] },
    },
    wolf: {
        // el geo trae cuerpo y pecho como cajas VERTICALES (6×9×6 y 8×6×7):
        // el renderer original los tumbaba 90° por código, sin declararlo
        // ni como bind_pose (misma rotación final que el cuerpo de la vaca)
        body: { rot: [-90, 0, 0] },
        upperbody: { rot: [-90, 0, 0] },
    },
    wandering_trader: {
        // el geo del aldeano trae el hueso `arms` en vertical, pegado al
        // torso y con las manos cruzadas EMPAREDADAS dentro de la túnica:
        // el renderer original lo giraba −0.75 rad por código; +43° en el
        // convenio de la casa cruza los antebrazos sobre el pecho (misma
        // rotación que los brazos del modelo procedural propio)
        arms: { rot: [43, 0, 0] },
    },
};

/** Aplica la pose de la especie (si la hay) a las partes convertidas. */
export function aplicarPose(partes, mobId) {
    const pose = POSE_MOB[mobId];
    if (!pose) return partes;
    return partes.map((p) => {
        // las partes de un hueso multi-cubo (arms_0, arms_1…) resuelven la
        // clave de su hueso: la pose gira todos sus cubos en bloque
        const nombre = String(p.name).toLowerCase();
        const extra = pose[nombre] || pose[nombre.replace(/_\d+$/, '')];
        if (!extra) return p;
        const ajustada = { ...p };
        if (extra.rot) {
            const rot = p.rot || [0, 0, 0];
            ajustada.rot = [rot[0] + extra.rot[0] * G, rot[1] + extra.rot[1] * G, rot[2] + extra.rot[2] * G];
        }
        if (extra.mov) {
            ajustada.pivot = [p.pivot[0] + extra.mov[0], p.pivot[1] + extra.mov[1], p.pivot[2] + extra.mov[2]];
        }
        return ajustada;
    });
}

/**
 * Clave geometry.* preferida en archivos con varias geometrías (si no está,
 * se elige la primera con partes). La oveja y la bruja son las versiones con
 * herencia (lana / sombrero); el pez globo, la talla grande clásica.
 */
export const CLAVE_MOB = {
    sheep: 'geometry.sheep.v1.8',
    creeper: 'geometry.creeper.v1.8',
    pufferfish: 'geometry.pufferfish.large.v1.8',
    tropical_fish: 'geometry.tropicalfish_a',
    witch: 'geometry.villager.witch.v1.8',
};

/** Padres de herencia que viven en OTRO archivo de models/entity/. */
const PADRE_EXTERNO = {
    'geometry.villager.v1.8': 'villager', // la bruja hereda del aldeano
};

/**
 * Alias id de mob → ruta bajo textures/entity/ (sin .png) cuando difiere del
 * propio id (por defecto se sondea `<id>.png`, que ya cubre bat, dolphin,
 * guardian, witch, squid, iron_golem…). Un valor null significa «no sondear»:
 * son mobs que toman prestada la geometría de otro (allay→vex, bogged→
 * esqueleto…) y cuya textura vanilla, si existiera, no casaría con ese
 * desplegado — además la auto-piel es la que conserva su identidad de color.
 */
export const TEXTURA_MOB = {
    cow: 'cow/cow',
    mooshroom: 'cow/mooshroom',
    pig: 'pig/pig',
    sheep: 'sheep/sheep',
    creeper: 'creeper/creeper',
    enderman: 'enderman/enderman',
    fox: 'fox/fox',
    ghast: 'ghast/ghast',
    llama: 'llama/llama',
    panda: 'panda/panda',
    parrot: 'parrot/parrot_red_blue',
    rabbit: 'rabbit/brown',
    slime: 'slime/slime',
    spider: 'spider/spider',
    cave_spider: 'spider/cave_spider',
    vex: 'vex/vex',
    villager: 'villager/villager',
    wolf: 'wolf/wolf',
    zombie: 'zombie/zombie',
    husk: 'zombie/husk',
    drowned: 'zombie/drowned',
    zombie_villager: 'zombie_villager/zombie_villager',
    cat: 'cat/tabby',
    ocelot: 'cat/ocelot',
    cod: 'fish/cod',
    salmon: 'fish/salmon',
    pufferfish: 'fish/pufferfish',
    tropical_fish: 'fish/tropical_a',
    horse: 'horse2/horse_brown',
    donkey: 'horse2/donkey',
    skeleton: 'skeleton/skeleton',
    stray: 'skeleton/stray',
    evoker: 'illager/evoker',
    ravager: 'illager/ravager',
    polar_bear: 'polarbear',
    turtle: 'sea_turtle',
    glow_squid: null,
    happy_ghast: null,
    allay: null,
    bogged: null,
    parched: null,
};

/** ruta relativa a models/ → Promise<{geos, herencias}|null> (sondeo único). */
const cacheArchivos = new Map();

/** id de mob → modelo|null definitivo, y sondeos en vuelo. */
const cacheModelos = new Map();
const pendModelos = new Map();

/** id de mob → ImageBitmap|null definitivo, y sondeos en vuelo. */
const cacheTexturas = new Map();
const pendTexturas = new Map();

/**
 * Sondea y parsea UNA vez un archivo de geometrías (ruta relativa a
 * models/). Devuelve el mapa de parseGeo más la tabla de herencias
 * «geometry.hijo → geometry.padre» que las claves 1.8 declaran con «:».
 * 404, red caída o JSON inválido → null silencioso, cacheado para siempre.
 */
function cargarArchivo(ruta) {
    if (cacheArchivos.has(ruta)) return cacheArchivos.get(ruta);
    const p = (async () => {
        try {
            const res = await fetch(BASE + ruta);
            if (!res.ok) return null;
            const json = await res.json();
            const geos = parseGeo(json);
            const herencias = {};
            for (const clave of Object.keys(json)) {
                const corte = clave.indexOf(':');
                if (clave.startsWith('geometry.') && corte > 0) {
                    herencias[clave.slice(0, corte)] = clave.slice(corte + 1);
                }
            }
            return { geos, herencias };
        } catch {
            return null; // sin pack local: los modelos propios siguen
        }
    })();
    cacheArchivos.set(ruta, p);
    return p;
}

/** Clave geometry.* a usar para un mob dentro de un archivo ya parseado. */
function elegirClave(arch, mobId) {
    const preferida = CLAVE_MOB[mobId];
    if (preferida && arch.geos[preferida]) return preferida;
    const claves = Object.keys(arch.geos).filter((c) => arch.geos[c].partes.length);
    const exacta = claves.find((c) => c === `geometry.${mobId}` || c.startsWith(`geometry.${mobId}.`));
    return exacta || claves[0] || null;
}

/**
 * Resuelve una geometría de un archivo parseado: aplica la herencia (los
 * bones del hijo se añaden a los del padre, buscándolo en el mismo archivo
 * o en PADRE_EXTERNO) y ajusta el lienzo al desplegado real, porque muchos
 * geos 1.8 no declaran texturewidth/height y el 64×32 por defecto se queda
 * corto (oveja con lana, aldeano con ropa): se crece en potencias de 2.
 */
async function resolverGeometria(arch, clave) {
    const geo = clave && arch.geos[clave];
    if (!geo) return null;
    let partes = geo.partes;
    let texW = geo.texW, texH = geo.texH;

    const padre = arch.herencias[clave];
    if (padre) {
        let geoPadre = arch.geos[padre] || null;
        if (!geoPadre && PADRE_EXTERNO[padre]) {
            const otro = await cargarArchivo(`entity/${PADRE_EXTERNO[padre]}.geo.json`);
            geoPadre = (otro && otro.geos[padre]) || null;
        }
        if (geoPadre) {
            partes = geoPadre.partes.concat(partes);
            texW = Math.max(texW, geoPadre.texW);
            texH = Math.max(texH, geoPadre.texH);
        }
    }
    if (!partes.length) return null;

    for (const parte of partes) {
        for (const r of partUVRects(parte)) {
            while (texW < r.x + r.w && texW < 1024) texW *= 2;
            while (texH < r.y + r.h && texH < 1024) texH *= 2;
        }
    }
    return { texW, texH, partes };
}

/**
 * Modelo del pack local para un mob: Promise<{texW, texH, partes}|null> con
 * las partes ya en el contrato de js/mobs/model.js. Un único sondeo por id
 * (404 → null cacheado, sin ruido): primero su archivo de models/entity/
 * (con alias), después las claves legacy de models/mobs.json.
 */
export function modeloDe(mobId) {
    if (cacheModelos.has(mobId)) return Promise.resolve(cacheModelos.get(mobId));
    if (pendModelos.has(mobId)) return pendModelos.get(mobId);

    const p = (async () => {
        const archivo = ARCHIVO_MOB[mobId] || mobId;
        const arch = await cargarArchivo(`entity/${archivo}.geo.json`);
        if (arch) {
            const modelo = await resolverGeometria(arch, elegirClave(arch, mobId));
            if (modelo) return modelo;
        }
        const legacy = await cargarArchivo('mobs.json');
        if (legacy) {
            for (const clave of [`geometry.${mobId}`, `geometry.${mobId.replace(/_/g, '')}`]) {
                const modelo = await resolverGeometria(legacy, clave);
                if (modelo) return modelo;
            }
        }
        return null;
    })().then((bruto) => {
        // sin el atrezo la lista puede quedar vacía: entonces no hay modelo
        const modelo = bruto && (() => {
            const partes = filtrarAtrezo(bruto.partes, mobId);
            return partes.length ? { ...bruto, partes: aplicarPose(partes, mobId) } : null;
        })();
        cacheModelos.set(mobId, modelo || null);
        pendModelos.delete(mobId);
        return modelo || null;
    });
    pendModelos.set(mobId, p);
    return p;
}

/**
 * Textura del pack local para un mob: Promise<ImageBitmap|null> del PNG de
 * textures/entity/ (alias en TEXTURA_MOB; por defecto `<id>.png`). Solo
 * tiene sentido junto a modeloDe: los UV de un geo vanilla no casan con las
 * pieles procedurales propias. 404 o sin createImageBitmap → null cacheado.
 */
export function texturaDe(mobId) {
    if (cacheTexturas.has(mobId)) return Promise.resolve(cacheTexturas.get(mobId));
    if (pendTexturas.has(mobId)) return pendTexturas.get(mobId);

    const ruta = Object.prototype.hasOwnProperty.call(TEXTURA_MOB, mobId)
        ? TEXTURA_MOB[mobId] : mobId;

    const p = (async () => {
        if (!ruta || typeof createImageBitmap !== 'function') return null;
        try {
            const res = await fetch(BASE_TEXTURAS + ruta + '.png');
            if (!res.ok) return null;
            return await createImageBitmap(await res.blob());
        } catch {
            return null;
        }
    })().then((img) => {
        cacheTexturas.set(mobId, img || null);
        pendTexturas.delete(mobId);
        return img || null;
    });
    pendTexturas.set(mobId, p);
    return p;
}

/* ==========================================================================
 * Auto-piel: proyecta la paleta procedural PROPIA del mob al desplegado UV
 * del geo local. No se copia ni un texel del juego original: se pinta la def
 * con su paint() en su lienzo de siempre, se toma el color medio de la
 * región de la parte propia con nombre más parecido (head→cabeza,
 * leg*→pata…) y cada rect UV del geo se rellena con ese color más el
 * moteado sutil de la casa (fill con spread + speckle, ver mobs/skin.js).
 * ========================================================================== */

/**
 * Tabla de emparejamiento nombre de hueso Bedrock (inglés) → raíces de los
 * nombres de parte propios (español), en orden de prueba. El orden de las
 * filas importa: lo específico (hat, sleeve) antes que lo genérico (body).
 */
const SINONIMOS = [
    [/sombrero|hat/, ['sombrero', 'cabeza']],
    [/head|skull|face/, ['cabeza']],
    [/nose|snout|beak|bill|mouth/, ['nariz', 'hocico', 'pico', 'mandibula', 'cabeza']],
    [/jaw/, ['mandibula', 'cabeza']],
    [/ear/, ['oreja', 'cabeza']],
    [/horn|antler|antenna/, ['cuerno', 'antena']],
    [/sleeve/, ['brazo']],
    [/pants|sock|boot/, ['pierna', 'pata']],
    [/jacket|coat/, ['torso', 'cuerpo']],
    [/wool|fur/, ['lana', 'cuerpo']],
    [/wing/, ['ala']],
    [/arm|hand|paw/, ['brazo', 'ala', 'pata']],
    [/leg|foot|feet|flipper/, ['pata', 'pierna', 'anca', 'pie', 'aleta', 'tent']],
    [/tail/, ['cola', 'colita']],
    [/fin/, ['aleta', 'cola']],
    [/tentacle/, ['tent']],
    [/neck|mane/, ['cuello', 'crin', 'cuerpo']],
    [/shell|saddle|bag|chest\d/, ['caparazon', 'concha', 'joroba']],
    [/body|torso|belly|stomach|hump|trunk/,
        ['cuerpo', 'torso', 'abdomen', 'manto', 'torax', 'cubo', 'concha', 'base']],
];

/** Color medio [r,g,b] de los texels opacos de unos rects, o null si no hay. */
function mediaRects(skin, rects) {
    let r = 0, g = 0, b = 0, n = 0;
    for (const rect of rects) {
        const x0 = Math.max(0, Math.floor(rect.x));
        const y0 = Math.max(0, Math.floor(rect.y));
        const x1 = Math.min(skin.w, Math.ceil(rect.x + rect.w));
        const y1 = Math.min(skin.h, Math.ceil(rect.y + rect.h));
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * skin.w + x) * 4;
                if (!skin.data[i + 3]) continue;
                r += skin.data[i]; g += skin.data[i + 1]; b += skin.data[i + 2];
                n++;
            }
        }
    }
    return n ? [(r / n) | 0, (g / n) | 0, (b / n) | 0] : null;
}

/** Media de una lista de colores [r,g,b] (todas las partes emparejadas). */
function mediaColores(colores) {
    let r = 0, g = 0, b = 0;
    for (const c of colores) { r += c[0]; g += c[1]; b += c[2]; }
    const n = colores.length;
    return [(r / n) | 0, (g / n) | 0, (b / n) | 0];
}

/**
 * Color para una parte del geo: raíces candidatas de SINONIMOS según su
 * nombre (las partes con inflate alto prueban antes la capa exterior propia
 * —lana, caparazón—, que es lo que un inflate grande significa en vanilla)
 * y media de las partes propias que contengan la raíz; sin pareja, el color
 * medio global de la piel propia.
 */
function colorDeParte(parte, colores, colorGlobal) {
    const nombre = String(parte.name).toLowerCase();
    const candidatas = [];
    if ((parte.inflate || 0) >= 0.4) candidatas.push(['lana', 'caparazon']);
    for (const [re, raices] of SINONIMOS) {
        if (re.test(nombre)) { candidatas.push(raices); break; }
    }
    for (const raices of candidatas) {
        for (const raiz of raices) {
            const emparejados = [];
            for (const [propio, color] of colores) {
                if (color && propio.toLowerCase().includes(raiz)) emparejados.push(color);
            }
            if (emparejados.length) return mediaColores(emparejados);
        }
    }
    return colorGlobal;
}

/**
 * Primera parte PROPIA emparejada con la del geo (misma heurística de
 * sinónimos que el color): es la fuente de la proyección cara a cara.
 */
function parteEmparejada(parte, def) {
    const nombre = String(parte.name).toLowerCase();
    const candidatas = [];
    if ((parte.inflate || 0) >= 0.4) candidatas.push(['lana', 'caparazon']);
    for (const [re, raices] of SINONIMOS) {
        if (re.test(nombre)) { candidatas.push(raices); break; }
    }
    for (const raices of candidatas) {
        for (const raiz of raices) {
            const propia = def.parts.find((p) => String(p.name).toLowerCase().includes(raiz));
            if (propia) return propia;
        }
    }
    return null;
}

/**
 * Piel procedural para un modelo del pack: lienzo texW×texH del geo donde
 * cada parte pinta sus 6 rects UV con el color de la parte propia más
 * parecida (misma semilla por variante que mobrender.buildType, así cada
 * tonalidad conserva su paleta). Devuelve una Skin lista para texImage2D.
 *
 * @param {object} def — def del mob (paint, parts, skin, id)
 * @param {object} modelo — resultado de modeloDe (texW, texH, partes)
 * @param {number} variante — índice de variante de piel (def.variants)
 */
export function autoPiel(def, modelo, variante = 0) {
    // 1) pintar la piel propia de siempre y medir su paleta por parte
    const propia = new Skin(def.skin.w, def.skin.h, toSeed(def.id) + variante * 131);
    def.paint(propia, variante);
    const colores = new Map();
    for (const parte of def.parts) {
        colores.set(parte.name, mediaRects(propia, partUVRects(parte)));
    }
    const colorGlobal = mediaRects(propia, [{ x: 0, y: 0, w: propia.w, h: propia.h }])
        || [128, 128, 128];

    // 2) proyectar la piel propia al desplegado del geo. Donde hay parte
    // propia emparejada, la proyección es CARA A CARA con reescalado
    // (vecino más próximo): los rasgos pintados — ojos, cara, manchas —
    // viajan al modelo del pack. Sin pareja: color medio con moteado.
    const lienzo = new Skin(modelo.texW, modelo.texH, toSeed(def.id) + variante * 131 + 977);
    for (const parte of modelo.partes) {
        const color = colorDeParte(parte, colores, colorGlobal);
        const mota = [(color[0] * 0.8) | 0, (color[1] * 0.8) | 0, (color[2] * 0.8) | 0];
        const pareja = parteEmparejada(parte, def);
        const rectsPropios = pareja ? partUVRects(pareja) : null;
        partUVRects(parte).forEach((r, cara) => {
            const x = Math.floor(r.x), y = Math.floor(r.y);
            const w = Math.ceil(r.x + r.w) - x, h = Math.ceil(r.y + r.h) - y;
            if (w <= 0 || h <= 0) return; // caras planas (sz o sx 0)
            lienzo.fill(x, y, w, h, color, 9); // base: nunca quedan huecos
            const rs = rectsPropios && rectsPropios[cara];
            if (rs && rs.w >= 1 && rs.h >= 1) {
                for (let py = 0; py < h; py++) {
                    for (let px = 0; px < w; px++) {
                        const sx = Math.min(propia.w - 1, Math.floor(rs.x + ((px + 0.5) / w) * rs.w));
                        const sy = Math.min(propia.h - 1, Math.floor(rs.y + ((py + 0.5) / h) * rs.h));
                        const i = (sy * propia.w + sx) * 4;
                        if (!propia.data[i + 3]) continue; // texel vacío: queda la base
                        lienzo.px(x + px, y + py, [propia.data[i], propia.data[i + 1], propia.data[i + 2]]);
                    }
                }
            } else {
                lienzo.speckle(x, y, w, h, Math.max(2, (w * h / 7) | 0), mota);
            }
        });
    }
    return lienzo;
}

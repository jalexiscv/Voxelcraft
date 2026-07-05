/**
 * Punto de entrada: integra el streaming de chunks del mundo infinito con
 * render, física, HUD, audio y guardado, y ejecuta el bucle de juego.
 *
 * Streaming (como el Minecraft real): alrededor del jugador se mantiene un
 * área de GEN_MARGIN chunks generada (el worker produce los que falten, por
 * orden de cercanía) y se mallan los que tienen su vecindario completo
 * dentro de la distancia de render. Al alejarse, las mallas lejanas se
 * liberan y los datos no modificados se descartan (se regeneran de la
 * semilla si se vuelve).
 */
import { mat4Perspective, mat4View, mat4Multiply, lookDir, clamp } from './math.js';
import { toSeed } from './noise.js';
import { buildAtlas, buildCloudTexture } from './atlas.js';
import { sunDirection, skyColor, sunGlow, buildSunTexture, buildMoonTexture, MOON_PHASES } from './sky.js';
import { B, DEFS } from './blocks.js';
import { World, CHUNK, WORLD_HEIGHT, chunkKey } from './world.js';
import { meshChunk } from './mesher.js';
import { Renderer } from './renderer.js';
import { Player, raycast } from './player.js';
import { MobSystem } from './mobs.js';
import { Inventory } from './inventory.js';
import { DropSystem } from './drops.js';
import { ITEM_DEFS, ITEMS, isItem } from './items.js';
import { esCultivo, cosechaDe, plantaDe, maduro, tickCultivos } from './farming.js';
import { MOBS } from './mobs/registry.js';
import { MobRenderer } from './mobrender.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { saveWorld, loadMeta, loadChunksInto, hasSave } from './storage.js';

const DAY_LENGTH = 600;       // segundos por ciclo día/noche
const REACH = 5;              // alcance de interacción en bloques
const ACTION_REPEAT = 0.25;   // s entre acciones al mantener el botón
const HUNGER_DRAIN = 40;      // s de juego por cada punto de hambre drenado
const SPRINT_DRAIN = 15;      // s de sprint por cada punto de hambre extra
const STARVE_PERIOD = 6;      // s entre golpes de inanición con el hambre a 0
const GEN_MARGIN = 1;         // anillo extra generado más allá del render
const KEEP_MARGIN = 6;        // anillo extra donde se conservan datos
const MAX_INFLIGHT = 2;       // peticiones simultáneas al worker

function boot() {
    const canvas = document.getElementById('game');
    const $ = (id) => document.getElementById(id);

    let renderer;
    const atlasCanvas = buildAtlas();
    try {
        renderer = new Renderer(canvas, atlasCanvas, buildCloudTexture(), buildSunTexture(), buildMoonTexture());
    } catch (e) {
        $('menu').classList.add('hidden');
        $('unsupported').classList.remove('hidden');
        return;
    }

    const mobRenderer = new MobRenderer(renderer, MOBS);
    const hud = new HUD(atlasCanvas);
    const sound = new SoundEngine();
    const player = new Player();

    const game = {
        world: null,
        seed: 0,
        state: 'menu',          // 'menu' | 'loading' | 'playing'
        renderDist: 6,          // chunks
        worldName: 'Mi mundo',
        mode: 'supervivencia',  // 'supervivencia' | 'creativo'
        difficulty: 'normal',   // 'normal' | 'pacifica'
        inventory: new Inventory(), // solo cuenta en supervivencia
        drops: new DropSystem(),    // cubitos flotando tras romper bloques
        breaking: null,             // {x, y, z, hits, need}: picado en curso
        breakingT: 0,               // s restantes antes de olvidar el picado
        time: 0,
        timeOfDay: 0,
        dayCount: 0,            // días completos: gobierna la fase lunar
        stepAccum: 0,
        actionCooldown: 0,
        buttons: new Set(),
        fps: 0,
        // jugador y mobs
        mobs: null,
        hp: 20,
        regenT: 0,
        hurtGraceT: 0,
        dead: false,
        hunger: 20,             // hambre en medias raciones (0..20); solo drena en supervivencia
        hungerT: 0,             // s acumulados hacia el próximo punto drenado
        sprintT: 0,             // s de sprint acumulados (drenaje extra)
        starveT: 0,             // s hacia el próximo golpe de inanición
        // streaming
        worker: null,
        requested: new Set(),   // chunks pedidos al worker
        inFlight: 0,
        onInitialArea: null,    // callback al completar el área inicial
        streamTimer: 0,
    };
    const keys = new Set();
    const proj = new Float32Array(16), view = new Float32Array(16), pv = new Float32Array(16);

    /* ---- Menú ---- */

    const showMenu = (visible) => {
        $('menu').classList.toggle('hidden', !visible);
        const inGame = game.world !== null;
        $('btn-resume').classList.toggle('hidden', !inGame);
        $('btn-save').classList.toggle('hidden', !inGame);
        hasSave().then((ok) => { $('btn-load').disabled = !ok; });
    };
    const showSection = (name) => {
        $('menu-main').classList.toggle('hidden', name !== 'main');
        $('menu-new').classList.toggle('hidden', name !== 'new');
        $('menu-help').classList.toggle('hidden', name !== 'help');
    };

    $('btn-new').addEventListener('click', () => { sound.ensure(); sound.click(); showSection('new'); });
    $('btn-help').addEventListener('click', () => { sound.ensure(); sound.click(); showSection('help'); });
    for (const b of document.querySelectorAll('.btn-back')) {
        b.addEventListener('click', () => { sound.click(); showSection('main'); });
    }
    $('btn-generate').addEventListener('click', () => {
        sound.ensure(); sound.click();
        const seedText = $('inp-seed').value.trim();
        const seed = seedText === '' ? Math.floor(Math.random() * 2147483646) + 1 : toSeed(seedText);
        // las opciones del mundo se eligen ANTES de generar (flujo clásico)
        game.worldName = $('inp-name').value.trim() || 'Mi mundo';
        game.mode = $('inp-mode').value;
        game.difficulty = $('inp-diff').value;
        game.renderDist = parseInt($('inp-dist').value, 10);
        startWorld(seed, null);
    });
    $('btn-resume').addEventListener('click', () => {
        sound.ensure(); sound.click();
        showMenu(false);
        canvas.requestPointerLock();
    });
    $('btn-save').addEventListener('click', async () => {
        sound.click();
        try {
            const n = await saveWorld(game.world, {
                seed: game.seed, player: playerState(), renderDist: game.renderDist,
                worldName: game.worldName, mode: game.mode, difficulty: game.difficulty,
                savedAt: Date.now(),
            });
            $('btn-save').textContent = `Guardado ✓ (${n} chunks editados)`;
        } catch (e) {
            $('btn-save').textContent = 'Error al guardar';
        }
        setTimeout(() => { $('btn-save').textContent = 'Guardar partida'; }, 1800);
        showMenu(true);
    });
    $('btn-load').addEventListener('click', async () => {
        sound.ensure(); sound.click();
        const meta = await loadMeta();
        if (!meta) return;
        game.renderDist = meta.renderDist || 6;
        game.worldName = meta.worldName || 'Mi mundo';
        game.mode = meta.mode || 'supervivencia';        // guardados antiguos
        game.difficulty = meta.difficulty || 'normal';
        startWorld(meta.seed, meta);
    });

    const playerState = () => ({
        x: player.pos[0], y: player.pos[1], z: player.pos[2],
        yaw: player.yaw, pitch: player.pitch, flying: player.flying,
        timeOfDay: game.timeOfDay,
        dayCount: game.dayCount,
        hunger: game.hunger,
        inventory: game.inventory.toJSON(),
    });
    const applyPlayerState = (p) => {
        player.pos = [p.x, p.y, p.z];
        player.vel = [0, 0, 0];
        player.yaw = p.yaw; player.pitch = p.pitch;
        player.flying = game.mode === 'creativo' ? !!p.flying : false; // el vuelo es del Creativo
        game.timeOfDay = p.timeOfDay || 0;
        game.dayCount = p.dayCount || 0;
        game.hunger = p.hunger ?? 20; // guardados antiguos: saciado
        game.inventory = new Inventory(p.inventory || {});
        hud.setInventory(game.mode === 'supervivencia' ? game.inventory : null);
        if (game.mode === 'supervivencia') hud.setHunger(game.hunger);
    };

    /* ---- Mobs y salud del jugador ---- */

    /** Factor de día 0.22..1 según la hora (misma curva que el cielo). */
    const dayFactor = () => {
        const raw = Math.cos(game.timeOfDay * Math.PI * 2);
        return clamp((raw + 0.7) / 1.4, 0.22, 1);
    };

    const mobHooks = {
        sound: (kind, m) => {
            const d = Math.hypot(m.pos[0] - player.pos[0], m.pos[1] - player.pos[1], m.pos[2] - player.pos[2]);
            const gain = clamp(1 - d / 26, 0, 1);
            if (kind === 'fuse') sound.fuse();
            else if (kind === 'shoot') sound.arrow();
            else sound.mobSay(m.def.voice[kind], gain, m.def.id, kind);
        },
        damagePlayer: (dmg, dir) => damagePlayer(dmg, dir),
        explosion: () => sound.explosion(),
        // botín al morir un mob: solo en supervivencia (en creativo no hay)
        drop: (id, x, y, z) => {
            if (game.mode !== 'supervivencia') return;
            game.drops.spawn(id, x - 0.5, y - 0.4, z - 0.5);
        },
    };

    function damagePlayer(dmg, dir) {
        if (game.mode === 'creativo') return; // en Creativo no se recibe daño
        if (game.dead || game.state !== 'playing' || dmg <= 0) return;
        game.hp = Math.max(0, game.hp - dmg);
        game.hurtGraceT = 8;
        hud.setHealth(game.hp);
        sound.playerHurt();
        if (dir) { // retroceso
            player.vel[0] += dir[0] * 6;
            player.vel[2] += dir[2] * 6;
            player.vel[1] = Math.max(player.vel[1], 4);
        }
        const el = $('damage');
        el.classList.add('hit');
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('hit')));
        if (game.hp <= 0) {
            game.dead = true;
            document.exitPointerLock();
            $('death').classList.remove('hidden');
        }
    }

    /** Drena `n` puntos de hambre y repinta la barra (solo en supervivencia). */
    function drenarHambre(n) {
        if (game.mode !== 'supervivencia' || n <= 0) return;
        game.hunger = Math.max(0, game.hunger - n);
        hud.setHunger(game.hunger);
    }

    $('btn-respawn').addEventListener('click', () => {
        sound.click();
        player.spawn(game.world);
        game.hp = 20;
        game.dead = false;
        hud.setHealth(game.hp);
        drenarHambre(1); // reaparecer también cansa: el hambre no se repone al morir
        $('death').classList.add('hidden');
        canvas.requestPointerLock();
    });

    /* ---- Streaming de chunks ---- */

    const playerChunk = () => [Math.floor(player.pos[0] / CHUNK), Math.floor(player.pos[2] / CHUNK)];

    function ensureWorker() {
        if (game.worker) return;
        game.worker = new Worker(new URL('./worldgen.worker.js', import.meta.url), { type: 'module' });
        game.worker.onmessage = (e) => {
            const { cx, cz, blocks } = e.data;
            game.inFlight--;
            game.world.addChunk(cx, cz, new Uint8Array(blocks));
            onChunkArrived(cx, cz);
            pumpGeneration();
        };
    }

    /** Pide al worker los chunks que falten alrededor del jugador, por cercanía. */
    function pumpGeneration() {
        if (game.inFlight >= MAX_INFLIGHT || !game.world) return;
        const [pcx, pcz] = playerChunk(); // en mundos nuevos el jugador parte de (0,0)
        const R = game.renderDist + GEN_MARGIN;
        const missing = [];
        for (let dx = -R; dx <= R; dx++) {
            for (let dz = -R; dz <= R; dz++) {
                const cx = pcx + dx, cz = pcz + dz;
                const key = chunkKey(cx, cz);
                if (game.world.chunks.has(key) || game.requested.has(key)) continue;
                missing.push([dx * dx + dz * dz, cx, cz, key]);
            }
        }
        if (missing.length === 0) {
            if (game.inFlight === 0 && game.onInitialArea) {
                const cb = game.onInitialArea;
                game.onInitialArea = null;
                cb();
            }
            return;
        }
        missing.sort((a, b) => a[0] - b[0]);
        while (game.inFlight < MAX_INFLIGHT && missing.length) {
            const [, cx, cz, key] = missing.shift();
            game.requested.add(key);
            game.inFlight++;
            game.worker.postMessage({ seed: game.seed, cx, cz });
        }
    }

    /** Un chunk llegó: encolar el mallado de los vecinos que ya estén completos. */
    function onChunkArrived(cx, cz) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = chunkKey(cx + dx, cz + dz);
                if (!renderer.chunks.has(key) && game.world.meshable(cx + dx, cz + dz)) {
                    game.world.dirty.add(key);
                }
            }
        }
        if (game.state === 'loading') {
            const R = game.renderDist + GEN_MARGIN;
            const total = (2 * R + 1) * (2 * R + 1);
            hud.progress('Generando el mundo cercano…', 100 * Math.min(1, game.world.chunks.size / total));
        }
    }

    /** Remalla chunks pendientes con presupuesto por fotograma. */
    function processDirty(budget) {
        let n = 0;
        for (const key of game.world.dirty) {
            game.world.dirty.delete(key);
            const [cx, cz] = key.split(',').map(Number);
            if (!game.world.meshable(cx, cz)) continue;
            renderer.updateChunk(key, meshChunk(game.world, cx, cz));
            if (++n >= budget) break;
        }
        return n;
    }

    /**
     * Sana mallas perdidas: un chunk puede conservar sus DATOS al alejarse
     * (KEEP_MARGIN) mientras su malla se libera; al volver, pumpGeneration no
     * lo re-pide (ya tiene datos) y onChunkArrived —único sitio que encolaba
     * remallados— jamás se dispara para él: quedaba suelo invisible con mobs
     * caminando encima. Este barrido encola todo chunk visible, mallable y
     * sin malla.
     */
    function ensureMeshes() {
        const [pcx, pcz] = playerChunk();
        const meshR = game.renderDist + 1;
        for (let dx = -meshR; dx <= meshR; dx++) {
            for (let dz = -meshR; dz <= meshR; dz++) {
                const cx = pcx + dx, cz = pcz + dz;
                const key = chunkKey(cx, cz);
                if (renderer.chunks.has(key) || game.world.dirty.has(key)) continue;
                if (game.world.chunks.has(key) && game.world.meshable(cx, cz)) {
                    game.world.dirty.add(key);
                }
            }
        }
    }

    /** Libera mallas lejanas y descarta datos no modificados aún más lejos. */
    function unloadFar() {
        const [pcx, pcz] = playerChunk();
        const meshR = game.renderDist + 1;
        for (const key of renderer.chunks.keys()) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > meshR) renderer.deleteChunk(key);
        }
        const keepR = game.renderDist + KEEP_MARGIN;
        for (const [key, chunk] of game.world.chunks) {
            if (chunk.modified) continue; // las ediciones del jugador nunca se descartan
            const [cx, cz] = key.split(',').map(Number);
            if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > keepR) {
                game.world.chunks.delete(key);
                game.requested.delete(key);
            }
        }
    }

    /* ---- Arranque de mundo (nuevo o cargado) ---- */

    async function startWorld(seed, savedMeta) {
        game.state = 'loading';
        game.seed = seed;
        game.world = new World(seed);
        game.mobs = new MobSystem(MOBS, game.world, mobHooks, seed);
        game.hp = 20;
        game.dead = false;
        game.hurtGraceT = 0;
        game.hunger = 20;
        game.hungerT = 0;
        game.sprintT = 0;
        game.starveT = 0;
        hud.setHealth(game.hp);
        hud.setHunger(game.hunger);
        // en Creativo no hay salud ni hambre que gestionar: ambas barras se ocultan
        $('hearts').classList.toggle('hidden', game.mode === 'creativo');
        $('hunger').classList.toggle('hidden', game.mode === 'creativo');
        // inventario: vacío en mundo nuevo (la carga lo repone después);
        // en creativo el HUD ofrece todos los materiales sin cantidades
        game.inventory = new Inventory();
        hud.setInventory(game.mode === 'supervivencia' ? game.inventory : null);
        game.drops = new DropSystem();
        game.breaking = null;
        $('death').classList.add('hidden');
        game.requested.clear();
        game.timeOfDay = 0;
        game.dayCount = 0;
        renderer.clearChunks();
        showMenu(false);
        hud.progress('Generando el mundo cercano…', 0);

        // reiniciar el worker: respuestas en vuelo del mundo anterior no deben mezclarse
        if (game.worker) { game.worker.terminate(); game.worker = null; }
        game.inFlight = 0;
        ensureWorker();

        if (savedMeta) {
            await loadChunksInto(game.world); // chunks editados del guardado
            applyPlayerState(savedMeta.player);
        } else {
            player.pos = [0.5, WORLD_HEIGHT, 0.5]; // centro provisional para el streaming
            player.vel = [0, 0, 0];
        }

        game.onInitialArea = () => {
            if (!savedMeta) player.spawn(game.world, (game.renderDist + GEN_MARGIN) * CHUNK);
            // mallado inicial con progreso
            const total = Math.max(1, game.world.dirty.size);
            const meshStep = () => {
                processDirty(8);
                if (game.world.dirty.size > 0) {
                    hud.progress('Construyendo geometría…', 100 * (1 - game.world.dirty.size / total));
                    setTimeout(meshStep, 0);
                } else {
                    hud.hideProgress();
                    game.state = 'playing';
                    // directo al juego, sin menú intermedio: si el navegador
                    // rechaza la captura (el gesto del botón caducó durante la
                    // generación), el primer clic en el lienzo la recupera
                    try { canvas.requestPointerLock()?.catch(() => {}); } catch (e) { /* clic manual */ }
                }
            };
            meshStep();
        };
        pumpGeneration();
    }

    /* ---- Entrada ---- */

    const paused = () => !$('menu').classList.contains('hidden');
    const locked = () => document.pointerLockElement === canvas;

    canvas.addEventListener('click', () => {
        if (game.state === 'playing' && !paused() && !hud.pickerOpen() && !locked()) {
            sound.ensure();
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        // al soltar el puntero, ningún botón/tecla puede quedar «retenido»:
        // el mouseup caerá en el overlay y la acción se repetiría sola al
        // volver (p. ej. reabrir la mesa de crafteo tras cerrarla)
        if (!locked()) { game.buttons.clear(); keys.clear(); }
        if (!locked() && game.state === 'playing' && !hud.pickerOpen() && !hud.craftOpen() && !game.dead) {
            showMenu(true);
            showSection('main');
            game.buttons.clear();
            keys.clear();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!locked()) return;
        const sens = 0.0024;
        player.yaw -= e.movementX * sens;
        player.pitch = clamp(player.pitch - e.movementY * sens, -1.55, 1.55);
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!locked()) return;
        e.preventDefault();
        game.buttons.add(e.button);
        doAction(e.button);
        game.actionCooldown = ACTION_REPEAT;
    });
    canvas.addEventListener('mouseup', (e) => game.buttons.delete(e.button));
    // el menú contextual del navegador rompe la experiencia en el juego y en
    // las pantallas superpuestas (crafteo, selector, menús): se bloquea en
    // todo el documento, salvo en los campos de texto (útil para pegar)
    document.addEventListener('contextmenu', (e) => {
        if (e.target && e.target.tagName === 'INPUT') return;
        e.preventDefault();
    });

    document.addEventListener('wheel', (e) => {
        if (game.state === 'playing' && locked()) hud.cycleActive(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });

    const KEYMAP = {
        KeyW: 'forward', KeyA: 'left', KeyS: 'back', KeyD: 'right',
        Space: 'jump', KeyC: 'down', ShiftLeft: 'sprint', ShiftRight: 'sprint',
    };

    document.addEventListener('keydown', (e) => {
        if (game.state !== 'playing') return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        if (e.code === 'Escape' && hud.pickerOpen()) { hud.closePicker(); canvas.requestPointerLock(); return; }
        if (e.code === 'Escape' && hud.craftOpen()) { hud.closeCraft(); canvas.requestPointerLock(); return; }
        if (e.code === 'F3') { e.preventDefault(); hud.toggleDebug(); return; }
        if (e.code === 'KeyB') {
            if (hud.pickerOpen()) { hud.closePicker(); canvas.requestPointerLock(); }
            else if (locked()) { document.exitPointerLock(); hud.openPicker(); }
            return;
        }
        if (e.code === 'KeyE') {
            // inventario con cuadrícula 2×2 en supervivencia; en creativo, selector
            if (game.mode !== 'supervivencia') {
                if (hud.pickerOpen()) { hud.closePicker(); canvas.requestPointerLock(); }
                else if (locked()) { document.exitPointerLock(); hud.openPicker(); }
                return;
            }
            if (hud.craftOpen()) { hud.closeCraft(); canvas.requestPointerLock(); }
            else if (locked()) {
                hud.openCraft(2);
                document.exitPointerLock();
            }
            return;
        }
        if (e.code === 'KeyM') { sound.ensure(); sound.toggleMusic(); return; }
        if (e.code === 'KeyF') { if (game.mode === 'creativo') player.flying = !player.flying; return; }
        if (e.code === 'KeyR') { player.spawn(game.world); drenarHambre(1); return; }
        if (e.code.startsWith('Digit')) {
            const n = Number(e.code.slice(5));
            if (n >= 1 && n <= 9) hud.setActive(n - 1);
            return;
        }
        if (KEYMAP[e.code]) { e.preventDefault(); keys.add(KEYMAP[e.code]); }
    });
    document.addEventListener('keyup', (e) => {
        if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]);
    });
    window.addEventListener('blur', () => { keys.clear(); game.buttons.clear(); });

    hud.onPick = () => canvas.requestPointerLock();
    hud.onCraftDone = () => sound.place('wood');
    hud.onSmelt = () => sound.evento('fundir');          // fundición exitosa en el horno
    hud.onChestClose = () => sound.evento('cofre_cerrar'); // la tapa al cerrar el overlay

    /* ---- Interacción con bloques ---- */

    function doAction(button) {
        // el puñetazo a un mob tiene prioridad sobre el bloque de detrás
        if (button === 0 && game.mobs) {
            const dir = lookDir(player.yaw, player.pitch);
            const mhit = game.mobs.raycastMob(player.eye(), dir, REACH);
            if (mhit) {
                // el puñetazo hace 4; una espada en mano, su propio daño
                const it = ITEM_DEFS[hud.activeBlock()];
                game.mobs.hurt(mhit.mob, (it && it.sword) || 4, dir);
                return;
            }
        }
        // el rayo se lanza ya aquí: sembrar necesita saber si se apunta a
        // tierra labrada ANTES de decidir si se come (ver la excepción abajo)
        const hit = raycast(game.world, player.eye(), lookDir(player.yaw, player.pitch), REACH);
        // comer: con un alimento en mano, «usar» lo consume ANTES de cualquier
        // intento de colocar (y sin exigir apuntar a un bloque: se puede comer
        // mirando al cielo); con el hambre llena no se gasta nada. EXCEPCIÓN:
        // zanahoria y patata son comida Y semilla — apuntando a tierra labrada
        // con hueco libre gana sembrar (el bloque de siembra de más abajo)
        if (button === 2 && game.mode === 'supervivencia') {
            const id = hud.activeBlock();
            const it = ITEM_DEFS[id];
            const sembrando = hit && hit.id === B.FARMLAND && plantaDe(id) !== null &&
                game.world.get(hit.x, hit.y + 1, hit.z) === B.AIR;
            if (!sembrando && it && it.food && game.hunger < 20 && game.inventory.count(id) > 0) {
                game.inventory.take(id, 1);
                game.hunger = Math.min(20, game.hunger + it.food);
                hud.setHunger(game.hunger);
                hud.refreshCounts();
                sound.evento('comer');
                return;
            }
        }
        if (!hit) return;
        const def = DEFS[hit.id];

        if (button === 0 && def.breakable) {           // picar (dureza en golpes)
            if (game.mode === 'creativo') {            // creativo: rotura instantánea
                game.world.set(hit.x, hit.y, hit.z, B.AIR);
                sound.dig(def.sound);
                return;
            }
            // cada golpe avanza el picado del MISMO bloque; cambiar de
            // objetivo (o soltar un rato) reinicia el progreso
            const b = game.breaking;
            if (!b || b.x !== hit.x || b.y !== hit.y || b.z !== hit.z) {
                game.breaking = { x: hit.x, y: hit.y, z: hit.z, hits: 0, need: def.hardness };
            }
            game.breakingT = 0.6;
            game.breaking.hits += fuerzaDeGolpe(def);
            sound.dig(def.sound);
            if (game.breaking.hits >= game.breaking.need) {
                // romper un cofre con contenido: su botín cae ANTES del set
                // a AIR (que limpia el estado del bloque). Tope de 64 drops
                // de golpe (la capacidad del sistema: los de más expulsarían
                // a los primeros); el resto va directo al inventario
                if (hit.id === B.CHEST) {
                    const botin = game.world.getBlockData(hit.x, hit.y, hit.z);
                    if (botin) {
                        let sueltos = 0;
                        for (const [id, n] of Object.entries(botin)) {
                            for (let k = 0; k < n; k++) {
                                if (sueltos < 64) { game.drops.spawn(Number(id), hit.x, hit.y, hit.z); sueltos++; }
                                else game.inventory.add(Number(id));
                            }
                        }
                        hud.refreshCounts();
                    }
                }
                game.world.set(hit.x, hit.y, hit.z, B.AIR);
                game.breaking = null;
                if (esCultivo(hit.id)) {
                    // cosechar: maduro suelta el botín completo; inmaduro,
                    // solo lo sembrado (las tablas viven en farming.js)
                    if (maduro(hit.id)) sound.evento('cosechar');
                    for (const { id, n } of cosechaDe(hit.id)) {
                        for (let k = 0; k < n; k++) game.drops.spawn(id, hit.x, hit.y, hit.z);
                    }
                } else if (hit.id === B.TALL_GRASS) {
                    // la hierba alta esconde semillas de trigo a veces
                    // (antes se soltaba a sí misma, sin utilidad alguna)
                    if (Math.random() < 0.4) game.drops.spawn(ITEMS.SEMILLAS_TRIGO, hit.x, hit.y, hit.z);
                } else if (def.placeable || hit.id === B.FARMLAND) {
                    // el bloque roto queda flotando como cubito (drop)
                    game.drops.spawn(dropDe(hit.id), hit.x, hit.y, hit.z);
                }
            }
        } else if (button === 1 && def.placeable) {    // copiar
            // en supervivencia solo se puede elegir lo que se tiene
            if (game.mode === 'supervivencia' && game.inventory.count(hit.id) === 0) return;
            hud.assign(hit.id);
        } else if (button === 2) {                     // usar / colocar
            // usar la mesa de crafteo abre su cuadrícula de 3×3
            if (hit.id === B.CRAFTING_TABLE && game.mode === 'supervivencia') {
                hud.openCraft(3);
                document.exitPointerLock();
                return;
            }
            // usar el horno abre la interfaz de fundición
            if (hit.id === B.FURNACE && game.mode === 'supervivencia' && hud.openFurnace) {
                hud.openFurnace();
                document.exitPointerLock();
                return;
            }
            // usar el cofre abre su interfaz: el acceso encapsula ESTE
            // bloque para que el HUD lea y persista su contenido al momento
            if (hit.id === B.CHEST && game.mode === 'supervivencia' && hud.openChest) {
                const [cx, cy, cz] = [hit.x, hit.y, hit.z];
                hud.openChest({
                    leer: () => game.world.getBlockData(cx, cy, cz),
                    escribir: (data) => { game.world.setBlockData(cx, cy, cz, data); },
                });
                sound.evento('cofre_abrir');
                document.exitPointerLock();
                return;
            }
            // la puerta alterna abierta/cerrada con el uso
            if (hit.id === B.DOOR_CLOSED || hit.id === B.DOOR_OPEN) {
                game.world.set(hit.x, hit.y, hit.z,
                    hit.id === B.DOOR_CLOSED ? B.DOOR_OPEN : B.DOOR_CLOSED);
                sound.evento(hit.id === B.DOOR_CLOSED ? 'puerta_abrir' : 'puerta_cerrar');
                return;
            }
            // la cama salta la noche: al usarla de noche, amanece
            if (hit.id === B.BED) {
                if (dayFactor() < 0.45) {
                    game.timeOfDay = 0.77; // justo tras el alba
                    sound.place('cloth');
                }
                return;
            }
            // la azada labra el suelo: tierra/hierba con aire encima pasa a
            // tierra labrada (no se gasta: aquí no existe la durabilidad)
            const enMano = ITEM_DEFS[hud.activeBlock()];
            if (enMano && enMano.tool && enMano.tool.tipo === 'azada' &&
                (hit.id === B.GRASS || hit.id === B.DIRT || hit.id === B.SNOWY_GRASS) &&
                game.world.get(hit.x, hit.y + 1, hit.z) === B.AIR) {
                game.world.set(hit.x, hit.y, hit.z, B.FARMLAND);
                sound.evento('labrar');
                return;
            }
            // sembrar: un ítem plantable sobre tierra labrada con hueco libre
            // coloca su etapa 0 y consume una unidad del inventario
            const brote = plantaDe(hud.activeBlock());
            if (brote !== null && hit.id === B.FARMLAND &&
                game.world.get(hit.x, hit.y + 1, hit.z) === B.AIR) {
                if (game.mode === 'supervivencia') {
                    if (!game.inventory.take(hud.activeBlock())) return; // sin existencias
                    hud.refreshCounts();
                }
                game.world.set(hit.x, hit.y + 1, hit.z, brote);
                sound.evento('sembrar');
                return;
            }
            const [tx, ty, tz] = [hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz];
            const target = game.world.get(tx, ty, tz);
            const replaceable = target === B.AIR || DEFS[target].liquid || DEFS[target].cross;
            if (!replaceable) return;
            const id = hud.activeBlock();
            if (isItem(id) || !DEFS[id]) return;       // las herramientas no se colocan
            if (DEFS[id].solid && player.intersectsBlock(tx, ty, tz)) return;
            if (game.mode === 'supervivencia') {
                if (!game.inventory.take(id)) return; // sin existencias
                hud.refreshCounts();
            }
            game.world.set(tx, ty, tz, id);
            sound.place(DEFS[id].sound);
        }
    }

    /** Golpes que aporta cada clic: 1 a mano, ×factor con la herramienta adecuada. */
    function fuerzaDeGolpe(def) {
        const it = ITEM_DEFS[hud.activeBlock()];
        return it && it.tool && it.tool.tipo === def.tool ? it.tool.factor : 1;
    }

    /** Qué suelta cada bloque: la roca, adoquín; los suelos, tierra; la mena de carbón, carbón. */
    function dropDe(id) {
        if (id === B.STONE) return B.COBBLE;
        if (id === B.GRASS || id === B.SNOWY_GRASS || id === B.MYCELIUM || id === B.PODZOL) return B.DIRT;
        if (id === B.FARMLAND) return B.DIRT; // la tierra labrada vuelve a ser tierra
        if (id === B.COAL_ORE) return ITEMS.CARBON;
        if (id === B.DOOR_OPEN) return B.DOOR_CLOSED; // la puerta se recoge cerrada
        return id;
    }


    /* ---- Bucle principal ---- */

    let last = performance.now();

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        game.fps = game.fps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;

        if (game.state === 'playing' && game.world) {
            if (!paused() && !hud.pickerOpen() && !hud.craftOpen() && !game.dead) simulate(dt);
            draw();
        }
        requestAnimationFrame(frame);
    }

    function simulate(dt) {
        const input = {
            forward: keys.has('forward'), back: keys.has('back'),
            left: keys.has('left'), right: keys.has('right'),
            jump: keys.has('jump'), down: keys.has('down'), sprint: keys.has('sprint'),
        };
        const result = player.update(dt, input, game.world);
        if (result.enteredWater) sound.splash();

        // pasos
        const hSpeed = Math.hypot(player.vel[0], player.vel[2]);
        if (player.onGround && hSpeed > 1) {
            game.stepAccum += hSpeed * dt;
            if (game.stepAccum > 2.1) {
                game.stepAccum = 0;
                sound.step(DEFS[player.groundBlock(game.world)].sound);
            }
        }

        // repetición de romper/colocar al mantener el botón
        if (game.buttons.size > 0) {
            game.actionCooldown -= dt;
            if (game.actionCooldown <= 0) {
                for (const b of game.buttons) doAction(b);
                game.actionCooldown = ACTION_REPEAT;
            }
        }

        game.time += dt;
        const prevTimeOfDay = game.timeOfDay;
        game.timeOfDay = (game.timeOfDay + dt / DAY_LENGTH) % 1;
        if (game.timeOfDay < prevTimeOfDay) game.dayCount++; // envolvió: nuevo día

        // mobs: IA, física, aparición y flechas
        game.mobs.update(dt, {
            pos: player.pos,
            eye: player.eye(),
            look: lookDir(player.yaw, player.pitch), // el creaking sabe si lo miras
            day: dayFactor(),
            creative: game.mode === 'creativo',      // los hostiles ignoran al jugador
            peaceful: game.difficulty === 'pacifica', // no aparecen hostiles
        });

        // drops: caen, giran y vuelan a la mano al acercarse
        game.drops.update(dt, player.pos, game.world, (id) => {
            game.inventory.add(id);
            hud.refreshCounts();
            sound.place('cloth');
        });

        // cultivos: crecimiento por muestreo aleatorio en los chunks cargados
        tickCultivos(game.world, dt);

        // el picado a medias se olvida si se deja de golpear un rato
        if (game.breaking) {
            game.breakingT -= dt;
            if (game.breakingT <= 0) game.breaking = null;
        }

        // regeneración lenta si no se ha recibido daño en un rato; exige ir
        // bien comido (hambre > 12) y cada medio corazón cuesta 1 de hambre
        game.hurtGraceT = Math.max(0, game.hurtGraceT - dt);
        if (game.hp > 0 && game.hp < 20 && game.hurtGraceT <= 0 && game.hunger > 12) {
            game.regenT += dt;
            if (game.regenT >= 4) {
                game.regenT = 0;
                game.hp++;
                hud.setHealth(game.hp);
                drenarHambre(1);
            }
        }

        // hambre: drena con el paso del tiempo y, aparte, al correr (Shift
        // manteniendo el movimiento); solo cuenta en supervivencia
        if (game.mode === 'supervivencia') {
            game.hungerT += dt;
            if (input.sprint && hSpeed > 1) game.sprintT += dt;
            let drenaje = 0;
            if (game.hungerT >= HUNGER_DRAIN) { game.hungerT = 0; drenaje++; }
            if (game.sprintT >= SPRINT_DRAIN) { game.sprintT = 0; drenaje++; }
            drenarHambre(drenaje);

            // inanición: con el hambre a 0 se pierde ½ corazón cada pocos
            // segundos, pero NUNCA por debajo de 1 corazón — adaptación
            // propia: aquí no abundan las fuentes de comida al empezar y
            // morir de hambre sería una espiral (reaparecer también drena),
            // así que la inanición debilita y castiga, pero no mata
            if (game.hunger <= 0) {
                game.starveT += dt;
                if (game.starveT >= STARVE_PERIOD) {
                    game.starveT = 0;
                    if (game.hp > 2) damagePlayer(1, null);
                }
            } else {
                game.starveT = 0;
            }
        }

        // streaming: generar cercano, sanar mallas, remallar, descargar lejano
        game.streamTimer -= dt;
        if (game.streamTimer <= 0) {
            game.streamTimer = 0.5;
            pumpGeneration();
            ensureMeshes();
            unloadFar();
        }
        processDirty(6);
    }

    function draw() {
        const eye = player.eye();
        const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
        mat4Perspective(proj, 70 * Math.PI / 180, aspect, 0.1, 1000);
        mat4View(view, eye[0], eye[1], eye[2], player.yaw, player.pitch);
        mat4Multiply(pv, proj, view);

        const day = dayFactor();
        // cielo y niebla comparten color; skyColor añade el tinte crepuscular
        const sky = skyColor(game.timeOfDay);

        // la niebla oculta el borde de generación (técnica del MC real)
        const fogFar = game.renderDist * CHUNK * 0.9;
        const hit = (paused() || hud.pickerOpen()) ? null
            : raycast(game.world, eye, lookDir(player.yaw, player.pitch), REACH);

        renderer.ensureClouds(eye[0], eye[2]);
        // ejes derecho/arriba de la cámara en mundo (columnas de Ry(yaw)·Rx(pitch),
        // la rotación inversa de la que construye mat4View) para los billboards
        const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
        const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
        const f = {
            pv,
            camPos: eye,
            sky,
            day,
            fogNear: fogFar * 0.55,
            fogFar,
            selection: hit ? [hit.x, hit.y, hit.z] : null,
            breakProgress: hit && game.breaking && game.breaking.x === hit.x &&
                game.breaking.y === hit.y && game.breaking.z === hit.z
                ? Math.min(1, game.breaking.hits / game.breaking.need) : 0,
            drops: game.drops.list,
            time: game.time,
            cloudOffset: game.time * 0.003,
            sunDir: sunDirection(game.timeOfDay),
            sunGlow: sunGlow(game.timeOfDay),
            moonPhase: game.dayCount % MOON_PHASES,
            camRight: [cy, 0, -sy],
            camUp: [sy * sp, cp, cy * sp],
        };
        f.drawEntities = () => mobRenderer.render(f, game.mobs.mobs, game.mobs.arrows, game.time, game.world);
        renderer.render(f);

        if (hud.debugVisible()) {
            const [pcx, pcz] = playerChunk();
            hud.debug(
                `FPS: ${game.fps.toFixed(0)}\n` +
                `XYZ: ${player.pos.map((v) => v.toFixed(1)).join(' / ')}\n` +
                `Chunk: ${pcx},${pcz}  Cargados: ${game.world.chunks.size}  Mallas: ${renderer.chunks.size}\n` +
                `Semilla: ${game.seed}  Hora: ${(game.timeOfDay * 24).toFixed(1)} h  Luz: ${day.toFixed(2)}  Día: ${game.dayCount}\n` +
                `Vuelo: ${player.flying ? 'sí' : 'no'}  Agua: ${player.inWater ? 'sí' : 'no'}\n` +
                `Mobs: ${game.mobs.count()}  Flechas: ${game.mobs.arrows.length}  Salud: ${game.hp}/20  Hambre: ${game.hunger}/20`
            );
        }
    }

    showMenu(true);
    showSection('main');
    requestAnimationFrame(frame);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    boot();
}

/**
 * HUD sobre DOM: hotbar de 9 ranuras con iconos isométricos pintados desde
 * el atlas, selector de bloques, barra de progreso y texto de depuración.
 */
import { DEFS, PLACEABLE, B } from './blocks.js';
import { TILE_PX, ATLAS_GRID } from './atlas.js';
import { ITEM_DEFS, isItem, RECIPES, matchGrid, autoColocar, FUNDICIONES, COMBUSTIBLES, fundir } from './items.js';
import { Inventory } from './inventory.js';

const ICON = 36;  // lado del canvas de icono
const K = 11;     // semiancho del rombo isométrico

export class HUD {
    /**
     * @param {HTMLCanvasElement} atlasCanvas — atlas ya construido
     * @param {(slot: number) => void} onSlotChange — notifica ranura activa
     */
    constructor(atlasCanvas, onSlotChange = () => {}) {
        this.atlas = atlasCanvas;
        this.onSlotChange = onSlotChange;
        this.slots = [1, 4, 3, 5, 15, 16, 10, 18, 28]; // ids por defecto (roca, adoquín, tierra…)
        this.active = 0;
        this.slotCanvases = [];
        this.inventory = null; // Inventory en supervivencia; null = creativo (todo, sin cuenta)

        this.els = {
            hotbar: document.getElementById('hotbar'),
            picker: document.getElementById('picker'),
            pickerGrid: document.getElementById('picker-grid'),
            craft: document.getElementById('craft'),
            craftTitle: document.getElementById('craft-title'),
            craftGrid: document.getElementById('craft-grid'),
            craftResult: document.getElementById('craft-result'),
            craftInv: document.getElementById('craft-inv'),
            craftHotbar: document.getElementById('craft-hotbar'),
            craftBook: document.getElementById('craft-book'),
            craftBookBtn: document.getElementById('craft-book-btn'),
            craftBookIcon: document.getElementById('craft-book-icon'),
            craftTooltip: document.getElementById('craft-tooltip'),
            craftCursor: document.getElementById('craft-cursor'),
            furnace: document.getElementById('furnace'),
            furnaceIn: document.getElementById('furnace-in'),
            furnaceFuel: document.getElementById('furnace-fuel'),
            furnaceOut: document.getElementById('furnace-out'),
            furnaceUsos: document.getElementById('furnace-usos'),
            furnaceBtn: document.getElementById('furnace-btn'),
            furnaceFlecha: document.getElementById('furnace-flecha'),
            chest: document.getElementById('chest'),
            chestGrid: document.getElementById('chest-grid'),
            chestInv: document.getElementById('chest-inv'),
            progress: document.getElementById('progress'),
            progressLabel: document.getElementById('progress-label'),
            progressFill: document.getElementById('progress-fill'),
            debug: document.getElementById('debug'),
            hearts: document.getElementById('hearts'),
            hunger: document.getElementById('hunger'),
        };

        this.buildHotbar();
        this.buildPicker();
        this.buildHearts();
        this.buildHunger();

        // el material «en mano» y el tooltip siguen al puntero en el crafteo
        // (el horno y el cofre comparten el manejador: su tooltip usa el
        // mismo elemento)
        this.craftState = null;
        this.furnaceState = null;
        this.chestState = null;
        this.bookOpen = false;
        const seguirPuntero = (e) => {
            this.els.craftCursor.style.left = `${e.clientX + 10}px`;
            this.els.craftCursor.style.top = `${e.clientY + 10}px`;
            this.els.craftTooltip.style.left = `${e.clientX + 14}px`;
            this.els.craftTooltip.style.top = `${e.clientY - 26}px`;
        };
        this.els.craft.addEventListener('mousemove', seguirPuntero);
        this.els.furnace.addEventListener('mousemove', seguirPuntero);
        this.els.chest.addEventListener('mousemove', seguirPuntero);
        this.drawIcon(this.els.craftBookIcon, B.BOOKSHELF); // icono del recetario
        this.els.craftBookBtn.addEventListener('click', () => {
            this.bookOpen = !this.bookOpen;
            this.renderCraft();
        });
        // fundir con el botón «Fundir» o con la flecha (misma acción)
        this.els.furnaceBtn.addEventListener('click', () => this.fundirUna());
        this.els.furnaceFlecha.addEventListener('click', () => this.fundirUna());
    }

    /** Tooltip flotante con el nombre del item bajo el puntero. */
    tooltip(texto) {
        const t = this.els.craftTooltip;
        if (!texto) { t.classList.add('hidden'); return; }
        t.textContent = texto;
        t.classList.remove('hidden');
    }

    /* ---- Salud y hambre ---- */

    buildHearts() {
        this.els.hearts.innerHTML = '';
        for (let i = 0; i < 10; i++) this.els.hearts.appendChild(document.createElement('span'));
    }

    /** Pinta la fila de corazones: `hp` en medios corazones (0..20). */
    setHealth(hp) {
        this.els.hearts.classList.remove('hidden');
        [...this.els.hearts.children].forEach((el, i) => {
            el.className = hp >= (i + 1) * 2 ? '' : (hp === i * 2 + 1 ? 'half' : 'empty');
        });
    }

    buildHunger() {
        this.els.hunger.innerHTML = '';
        for (let i = 0; i < 10; i++) this.els.hunger.appendChild(document.createElement('span'));
    }

    /**
     * Pinta la fila de raciones: `hunger` en medias raciones (0..20).
     * Misma cuenta que setHealth; el CSS invierte la fila (row-reverse)
     * para que, como espejo de los corazones, se llene desde la derecha.
     */
    setHunger(hunger) {
        this.els.hunger.classList.remove('hidden');
        [...this.els.hunger.children].forEach((el, i) => {
            el.className = hunger >= (i + 1) * 2 ? '' : (hunger === i * 2 + 1 ? 'half' : 'empty');
        });
    }

    /* ---- Iconos ---- */

    /** Copia de una tésela del atlas oscurecida por `factor` (0..1). */
    shadedTile(tile, factor) {
        const c = document.createElement('canvas');
        c.width = c.height = TILE_PX;
        const ctx = c.getContext('2d');
        const sx = (tile % ATLAS_GRID) * TILE_PX;
        const sy = Math.floor(tile / ATLAS_GRID) * TILE_PX;
        ctx.drawImage(this.atlas, sx, sy, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
        if (factor < 1) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = `rgba(0,0,0,${1 - factor})`;
            ctx.fillRect(0, 0, TILE_PX, TILE_PX);
        }
        return c;
    }

    /** Dibuja el icono de un bloque: cubo isométrico o sprite plano. */
    drawIcon(canvas, blockId) {
        canvas.width = canvas.height = ICON;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, ICON, ICON);
        if (isItem(blockId)) { // sprite plano del item (palos, herramientas)
            const it = ITEM_DEFS[blockId];
            if (it) ctx.drawImage(this.shadedTile(it.tile, 1), 2, 2, ICON - 4, ICON - 4);
            return;
        }
        const def = DEFS[blockId];
        if (!def) return;

        // plantas en X y bloques dinámicos (cámara): sprite plano, no cubo
        if (def.cross || def.dinamico) {
            ctx.drawImage(this.shadedTile(def.side, 1), 2, 2, ICON - 4, ICON - 4);
            return;
        }

        const C = K / TILE_PX, cx = ICON / 2, y0 = 3;
        // cara superior (rombo)
        ctx.setTransform(C, 0.5 * C, -C, 0.5 * C, cx, y0);
        ctx.drawImage(this.shadedTile(def.top, 1), 0, 0);
        // cara izquierda
        ctx.setTransform(C, 0.5 * C, 0, C, cx - K, y0 + K / 2);
        ctx.drawImage(this.shadedTile(def.side, 0.8), 0, 0);
        // cara derecha
        ctx.setTransform(C, -0.5 * C, 0, C, cx, y0 + K);
        ctx.drawImage(this.shadedTile(def.side, 0.6), 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /* ---- Hotbar ---- */

    buildHotbar() {
        this.els.hotbar.innerHTML = '';
        this.slotCanvases = [];
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot' + (i === this.active ? ' active' : '');
            const num = document.createElement('span');
            num.className = 'num';
            num.textContent = String(i + 1);
            const canvas = document.createElement('canvas');
            this.drawIcon(canvas, this.slots[i]);
            const count = document.createElement('span');
            count.className = 'count';
            slot.append(num, canvas, count);
            slot.addEventListener('click', () => this.setActive(i));
            this.els.hotbar.appendChild(slot);
            this.slotCanvases.push(canvas);
        }
        this.refreshCounts();
    }

    /**
     * Inventario activo: Inventory (supervivencia) o null (creativo).
     * Reconstruye el selector y las cantidades de la hotbar.
     */
    setInventory(inv) {
        this.inventory = inv;
        this.buildPicker();
        this.refreshCounts();
    }

    /** Repinta las cantidades de la hotbar (y atenúa las ranuras agotadas). */
    refreshCounts() {
        [...this.els.hotbar.children].forEach((el, i) => {
            const badge = el.querySelector('.count');
            if (!badge) return;
            const n = this.inventory ? this.inventory.count(this.slots[i]) : null;
            badge.textContent = n === null || n === 0 ? '' : String(n);
            el.classList.toggle('agotado', n === 0);
        });
    }

    setActive(i) {
        this.active = ((i % 9) + 9) % 9;
        [...this.els.hotbar.children].forEach((el, idx) => {
            el.classList.toggle('active', idx === this.active);
        });
        this.onSlotChange(this.active);
    }

    cycleActive(dir) { this.setActive(this.active + dir); }

    activeBlock() { return this.slots[this.active]; }

    /** Asigna un bloque a la ranura activa (selector o clic central). */
    assign(blockId) {
        this.assignSlot(this.active, blockId);
    }

    /**
     * Asigna un material a la ranura `i` manteniendo ÚNICOS los punteros de
     * la hotbar: si otra ranura ya tenía ese material, ambas INTERCAMBIAN
     * lugar (la otra recibe el material desplazado) — nunca aparecen dos
     * ranuras con el mismo material. Devuelve el material desplazado.
     */
    assignSlot(i, id) {
        const previo = this.slots[i];
        if (previo === id) return previo;
        const j = this.slots.indexOf(id);
        this.slots[i] = id;
        this.drawIcon(this.slotCanvases[i], id);
        if (j !== -1) {
            this.slots[j] = previo;
            this.drawIcon(this.slotCanvases[j], previo);
        }
        this.refreshCounts();
        return previo;
    }

    /* ---- Selector de bloques ---- */

    buildPicker() {
        this.els.pickerGrid.innerHTML = '';
        // creativo: todos los materiales; supervivencia: lo recolectado
        // (bloques colocables y herramientas fabricadas)
        const ids = this.inventory
            ? this.inventory.ids().filter((id) => isItem(id) || (DEFS[id] && DEFS[id].placeable))
            : PLACEABLE;
        if (ids.length === 0) {
            const vacio = document.createElement('p');
            vacio.className = 'hint';
            vacio.textContent = 'Aún no has recolectado materiales: rompe bloques para llenar el inventario.';
            this.els.pickerGrid.appendChild(vacio);
            return;
        }
        for (const id of ids) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.title = this.nombreDe(id);
            const canvas = document.createElement('canvas');
            this.drawIcon(canvas, id);
            cell.appendChild(canvas);
            if (this.inventory) {
                const count = document.createElement('span');
                count.className = 'count';
                count.textContent = String(this.inventory.count(id));
                cell.appendChild(count);
            }
            cell.addEventListener('click', () => {
                this.assign(id);
                this.closePicker();
                if (this.onPick) this.onPick(id);
            });
            this.els.pickerGrid.appendChild(cell);
        }
    }

    openPicker() {
        if (this.inventory) this.buildPicker(); // las existencias cambian al jugar
        this.els.picker.classList.remove('hidden');
    }

    /* ---- Pantalla de inventario y crafteo (cuadrícula clásica) ---- */

    /** Nombre legible de un id, sea bloque o item. */
    nombreDe(id) {
        return isItem(id) ? (ITEM_DEFS[id] ? ITEM_DEFS[id].name : '?') : DEFS[id].name;
    }

    /** Ranura genérica: icono del id (si lo hay), cantidad y tooltip. */
    ranura(id, n) {
        const cell = document.createElement('div');
        cell.className = 'cslot';
        if (id) {
            const canvas = document.createElement('canvas');
            this.drawIcon(canvas, id);
            cell.appendChild(canvas);
            if (n !== undefined) {
                const badge = document.createElement('span');
                badge.className = 'count';
                badge.textContent = n > 1 ? String(n) : '';
                cell.appendChild(badge);
            }
            cell.addEventListener('mouseenter', () => this.tooltip(this.nombreDe(id)));
            cell.addEventListener('mouseleave', () => this.tooltip(null));
        }
        return cell;
    }

    /**
     * Abre la pantalla clásica: cuadrícula personal (w=2) o mesa de crafteo
     * (w=3) con ranura de resultado, existencias, hotbar y recetario. El
     * estado (celdas y material en mano) vive aquí; las unidades colocadas
     * se descuentan del inventario y AL CERRAR las celdas se devuelven.
     */
    openCraft(w) {
        this.craftState = { w, cells: new Array(w * w).fill(0), mano: 0 };
        this.els.craft.classList.remove('hidden');
        this.renderCraft();
    }

    closeCraft() {
        // si lo abierto es el horno o el cofre, ciérralo: main.js llama a
        // closeCraft() con E/Esc, y así ambos se despiden por el mismo camino
        if (this.furnaceOpen()) { this.closeFurnace(); return; }
        if (this.chestOpen()) { this.closeChest(); return; }
        const st = this.craftState;
        if (st) for (const id of st.cells) if (id) this.inventory.add(id);
        this.craftState = null;
        this.setMano(0);
        this.tooltip(null);
        this.els.craft.classList.add('hidden');
        this.refreshCounts();
    }

    /**
     * ¿Hay pantalla de banco abierta? Cuenta TAMBIÉN el horno y el cofre:
     * main.js gobierna E/Esc, la pausa de la simulación y el menú del
     * pointer lock con craftOpen()/closeCraft(), y al englobar aquí las
     * tres pantallas todas se abren/cierran igual sin tocar main.js.
     */
    craftOpen() { return !this.els.craft.classList.contains('hidden') || this.furnaceOpen() || this.chestOpen(); }

    /** Material «en mano»: se muestra como icono flotante junto al puntero. */
    setMano(id) {
        if (this.craftState) this.craftState.mano = id;
        const cur = this.els.craftCursor;
        if (!id) { cur.classList.add('hidden'); return; }
        this.drawIcon(cur, id);
        cur.classList.remove('hidden');
    }

    /** Repinta toda la pantalla de crafteo (cuadrícula, stock, hotbar, libro). */
    renderCraft() {
        const st = this.craftState;
        if (!st) return;
        const inv = this.inventory;

        // cuadrícula de crafteo: colocar 1 unidad del material en mano,
        // o devolver la celda al inventario si la mano está vacía
        const grid = this.els.craftGrid;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${st.w}, 46px)`;
        st.cells.forEach((id, i) => {
            const cell = this.ranura(id);
            cell.addEventListener('click', () => {
                if (st.mano && inv.count(st.mano) > 0) {
                    if (st.cells[i]) inv.add(st.cells[i]); // desaloja lo que hubiera
                    st.cells[i] = st.mano;
                    inv.take(st.mano, 1);
                    if (inv.count(st.mano) === 0) this.setMano(0);
                } else if (st.cells[i]) {
                    inv.add(st.cells[i]);
                    st.cells[i] = 0;
                }
                this.renderCraft();
            });
            grid.appendChild(cell);
        });

        // resultado: aparece cuando la disposición casa con una receta
        const res = this.els.craftResult;
        res.innerHTML = '';
        const receta = matchGrid(st.cells, st.w);
        const out = this.ranura(receta ? receta.out.id : 0, receta ? receta.out.n : undefined);
        out.classList.add('resultado');
        if (receta) {
            out.classList.add('lista');
            out.addEventListener('click', () => {
                st.cells.fill(0); // las unidades ya salieron del inventario
                inv.add(receta.out.id, receta.out.n);
                if (this.onCraftDone) this.onCraftDone(receta);
                // fabricación en cadena: reponer la misma receta si alcanza
                const otraVez = autoColocar(receta, st.w, inv);
                if (otraVez) {
                    for (const id of otraVez) if (id) inv.take(id, 1);
                    st.cells = otraVez;
                }
                this.refreshCounts();
                this.renderCraft();
            });
        }
        res.appendChild(out);

        // existencias: rejilla fija de ranuras (las vacías, visibles) con
        // pilas de hasta 64 por casilla; clic toma el material en mano
        // (clic de nuevo, o en una casilla vacía, lo suelta)
        const stock = this.els.craftInv;
        stock.innerHTML = '';
        const pilas = inv.stacks();
        const total = Math.max(27, Math.ceil(pilas.length / 9) * 9); // 3+ filas de 9
        for (let k = 0; k < total; k++) {
            const pila = pilas[k];
            const cell = this.ranura(pila ? pila.id : 0, pila ? pila.n : undefined);
            if (pila && st.mano === pila.id) cell.classList.add('activo');
            cell.addEventListener('click', () => {
                this.setMano(pila && st.mano !== pila.id ? pila.id : 0);
                this.renderCraft();
            });
            stock.appendChild(cell);
        }

        // hotbar: con material en mano INTERCAMBIA con la ranura (y si otra
        // ranura ya lo tenía, esas dos intercambian lugar); sin mano, activa
        const barra = this.els.craftHotbar;
        barra.innerHTML = '';
        this.slots.forEach((slotId, i) => {
            const cell = this.ranura(slotId, inv.count(slotId));
            if (i === this.active) cell.classList.add('activo');
            cell.addEventListener('click', () => {
                if (st.mano) {
                    const yaEnBarra = this.slots.indexOf(st.mano) !== -1;
                    const previo = this.assignSlot(i, st.mano);
                    // intercambio clásico: la mano recibe lo desplazado (si
                    // tienes existencias); si el material ya estaba en la
                    // barra, las ranuras intercambiaron y la mano se vacía
                    this.setMano(!yaEnBarra && previo !== st.mano && inv.count(previo) > 0 ? previo : 0);
                } else {
                    this.setActive(i);
                }
                this.renderCraft();
            });
            barra.appendChild(cell);
        });

        // recetario: panel lateral conmutable; clic autocoloca los ingredientes
        const libro = this.els.craftBook;
        libro.classList.toggle('hidden', !this.bookOpen);
        this.els.craftBookBtn.classList.toggle('activo', this.bookOpen);
        libro.innerHTML = '<h3 class="craft-etiqueta">Recetario</h3>';
        if (!this.bookOpen) return;
        for (const r of RECIPES) {
            const colocable = autoColocar(r, st.w, inv) !== null;
            const grande = r.pattern && (r.pattern.length > st.w || r.pattern[0].length > st.w);
            const row = document.createElement('div');
            row.className = 'receta' + (colocable ? '' : ' falta');
            row.title = grande ? 'Necesita la mesa de crafteo (3×3)' : '';
            const canvas = document.createElement('canvas');
            this.drawIcon(canvas, r.out.id);
            const info = document.createElement('div');
            info.className = 'receta-info';
            const nombre = document.createElement('strong');
            nombre.textContent = r.out.n > 1 ? `${r.name} ×${r.out.n}` : r.name;
            const coste = document.createElement('span');
            coste.textContent = r.in.map((i) => `${i.n}× ${this.nombreDe(i.id)}`).join(' · ') +
                (r.pattern ? ' — con forma' : '');
            info.append(nombre, coste);
            row.append(canvas, info);
            if (colocable) {
                row.addEventListener('click', () => {
                    for (const id of st.cells) if (id) inv.add(id); // vacía lo anterior
                    const cells = autoColocar(r, st.w, inv);
                    if (!cells) { this.renderCraft(); return; }
                    for (const id of cells) if (id) inv.take(id, 1);
                    st.cells = cells;
                    this.renderCraft();
                });
            }
            libro.appendChild(row);
        }
    }
    closePicker() { this.els.picker.classList.add('hidden'); }
    pickerOpen() { return !this.els.picker.classList.contains('hidden'); }

    /* ---- Pantalla del horno (fundición por sesión) ---- */

    /**
     * Abre la interfaz del horno. La fundición es POR SESIÓN, sin estado
     * por bloque (adaptación documentada en el plan): la entrada y el
     * combustible elegidos, los usos que restan de la unidad ya quemada y
     * lo producido viven aquí y se descartan al cerrar (el producto ya fue
     * al inventario; los usos sobrantes se pierden, como el calor).
     */
    openFurnace() {
        if (!this.inventory) return; // solo supervivencia: en creativo no se funde
        this.furnaceState = { entrada: 0, comb: 0, usos: 0, salida: new Map() };
        this.els.furnace.classList.remove('hidden');
        this.renderFurnace();
    }

    closeFurnace() {
        this.furnaceState = null;
        this.tooltip(null);
        this.els.furnace.classList.add('hidden');
        this.refreshCounts();
    }

    furnaceOpen() { return !this.els.furnace.classList.contains('hidden'); }

    /** ¿Se puede fundir? Exige entrada con existencias y calor disponible. */
    puedeFundir() {
        const st = this.furnaceState, inv = this.inventory;
        if (!st || !inv) return false;
        const hayEntrada = st.entrada !== 0 && inv.count(st.entrada) > 0;
        const hayCalor = st.usos > 0 || (st.comb !== 0 && inv.count(st.comb) > 0);
        return hayEntrada && hayCalor;
    }

    /**
     * Funde 1 unidad de la entrada elegida: gasta un uso de combustible
     * (si no quedan, quema OTRA unidad del elegido con inv.take y repone
     * los usos) y llama a fundir(); el producto entra al inventario y se
     * anota en la SALIDA de la sesión.
     */
    fundirUna() {
        const st = this.furnaceState, inv = this.inventory;
        if (!this.puedeFundir()) return;
        if (st.usos === 0) { // quemar una unidad del combustible elegido
            inv.take(st.comb, 1);
            st.usos = COMBUSTIBLES[st.comb];
        }
        st.usos--;
        const out = fundir(inv, st.entrada);
        if (out) st.salida.set(out, (st.salida.get(out) || 0) + 1);
        if (out && this.onSmelt) this.onSmelt(out); // fundición exitosa: main.js pone el sonido
        if (inv.count(st.entrada) === 0) st.entrada = 0;          // entrada agotada
        if (st.comb && inv.count(st.comb) === 0) st.comb = 0;     // combustible agotado
        this.refreshCounts();
        this.renderFurnace();
    }

    /**
     * Rellena una zona del horno con una fila FIJA de ranuras (las vacías,
     * visibles, como el stock del crafteo): `pilas` = [{ id, n }], `sel`
     * marca la elegida (.activo), `alElegir` recibe el id pulsado y
     * `rotulo(id)` personaliza el tooltip (se impone al de ranura()).
     */
    zonaHorno(zona, pilas, sel, alElegir, rotulo) {
        zona.innerHTML = '';
        const total = Math.max(7, pilas.length);
        for (let k = 0; k < total; k++) {
            const pila = pilas[k];
            const cell = this.ranura(pila ? pila.id : 0, pila ? pila.n : undefined);
            if (!pila) { zona.appendChild(cell); continue; }
            if (sel === pila.id) cell.classList.add('activo');
            if (rotulo) cell.addEventListener('mouseenter', () => this.tooltip(rotulo(pila.id)));
            if (alElegir) cell.addEventListener('click', () => alElegir(pila.id));
            zona.appendChild(cell);
        }
    }

    /** Repinta la pantalla del horno: entrada, combustible, salida y botón. */
    renderFurnace() {
        const st = this.furnaceState;
        if (!st) return;
        const inv = this.inventory;

        // ENTRADA: existencias fundibles del jugador; clic elige (o suelta)
        const fundibles = FUNDICIONES.filter((f) => inv.count(f.in) > 0)
            .map((f) => ({ id: f.in, n: inv.count(f.in) }));
        this.zonaHorno(this.els.furnaceIn, fundibles, st.entrada, (id) => {
            st.entrada = st.entrada === id ? 0 : id;
            this.renderFurnace();
        });

        // COMBUSTIBLE: existencias de combustibles; el tooltip añade los
        // usos que aporta cada unidad y la etiqueta lleva la cuenta viva
        const combs = Object.keys(COMBUSTIBLES).map(Number)
            .filter((id) => inv.count(id) > 0)
            .map((id) => ({ id, n: inv.count(id) }));
        this.zonaHorno(this.els.furnaceFuel, combs, st.comb, (id) => {
            st.comb = st.comb === id ? 0 : id;
            this.renderFurnace();
        }, (id) => `${this.nombreDe(id)} — ×${COMBUSTIBLES[id]} usos`);
        this.els.furnaceUsos.textContent = st.usos > 0 ? `(usos restantes: ${st.usos})` : '';

        // SALIDA: lo fundido en esta sesión (ya está en el inventario)
        const salidas = [...st.salida].map(([id, n]) => ({ id, n }));
        this.zonaHorno(this.els.furnaceOut, salidas, 0, null);

        // botón y flecha solo con entrada y calor disponibles
        const listo = this.puedeFundir();
        this.els.furnaceBtn.disabled = !listo;
        this.els.furnaceFlecha.classList.toggle('inactiva', !listo);
    }

    /* ---- Pantalla del cofre (contenido por bloque en world.blockData) ---- */

    /**
     * Abre la interfaz del cofre. `acceso` encapsula el bloque concreto:
     * leer() devuelve su contenido (objeto plano id → cantidad, o null si
     * está vacío) y escribir(data) lo persiste. Cada transferencia guarda
     * AL MOMENTO, así cerrar por cualquier vía (E/Esc/menú) no pierde nada.
     */
    openChest(acceso) {
        if (!this.inventory) return; // solo supervivencia: en creativo no se guarda
        this.chestState = { acceso, inv: new Inventory(acceso.leer() || {}) };
        this.els.chest.classList.remove('hidden');
        this.renderChest();
    }

    closeChest() {
        this.chestState = null;
        this.tooltip(null);
        this.els.chest.classList.add('hidden');
        this.refreshCounts();
        if (this.onChestClose) this.onChestClose(); // main.js pone el sonido de la tapa
    }

    chestOpen() { return !this.els.chest.classList.contains('hidden'); }

    /** Persiste el contenido del cofre; vacío → null (el bloque queda limpio). */
    guardarCofre() {
        const st = this.chestState;
        const data = st.inv.toJSON();
        st.acceso.escribir(Object.keys(data).length > 0 ? data : null);
    }

    /** Repinta la pantalla del cofre: su rejilla y el inventario del jugador. */
    renderChest() {
        const st = this.chestState;
        if (!st) return;
        const inv = this.inventory;

        // rejilla del COFRE: 27 casillas fijas (3 filas de 9, como el cofre
        // clásico; crece por filas si llegara a haber más pilas) con pilas
        // de hasta 64; clic pasa TODA la pila al inventario
        const rejilla = this.els.chestGrid;
        rejilla.innerHTML = '';
        const pilasCofre = st.inv.stacks();
        const totalCofre = Math.max(27, Math.ceil(pilasCofre.length / 9) * 9);
        for (let k = 0; k < totalCofre; k++) {
            const pila = pilasCofre[k];
            const cell = this.ranura(pila ? pila.id : 0, pila ? pila.n : undefined);
            if (pila) {
                cell.addEventListener('click', () => {
                    st.inv.take(pila.id, pila.n);
                    inv.add(pila.id, pila.n);
                    this.guardarCofre();
                    this.refreshCounts();
                    this.renderChest();
                });
            }
            rejilla.appendChild(cell);
        }

        // INVENTARIO del jugador: rejilla fija de ranuras (las vacías,
        // visibles, como el stock del crafteo); clic guarda la pila
        // (hasta 64 unidades) en el cofre
        const stock = this.els.chestInv;
        stock.innerHTML = '';
        const pilas = inv.stacks();
        const total = Math.max(27, Math.ceil(pilas.length / 9) * 9); // 3+ filas de 9
        for (let k = 0; k < total; k++) {
            const pila = pilas[k];
            const cell = this.ranura(pila ? pila.id : 0, pila ? pila.n : undefined);
            if (pila) {
                cell.addEventListener('click', () => {
                    inv.take(pila.id, pila.n);
                    st.inv.add(pila.id, pila.n);
                    this.guardarCofre();
                    this.refreshCounts();
                    this.renderChest();
                });
            }
            stock.appendChild(cell);
        }
    }

    /* ---- Progreso y depuración ---- */

    progress(label, percent) {
        this.els.progress.classList.remove('hidden');
        this.els.progressLabel.textContent = label;
        this.els.progressFill.style.width = `${Math.round(percent)}%`;
    }

    hideProgress() { this.els.progress.classList.add('hidden'); }

    debug(text) { this.els.debug.textContent = text; }

    toggleDebug() {
        this.els.debug.classList.toggle('hidden');
        return !this.els.debug.classList.contains('hidden');
    }

    debugVisible() { return !this.els.debug.classList.contains('hidden'); }
}

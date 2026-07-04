/**
 * HUD sobre DOM: hotbar de 9 ranuras con iconos isométricos pintados desde
 * el atlas, selector de bloques, barra de progreso y texto de depuración.
 */
import { DEFS, PLACEABLE, B } from './blocks.js';
import { TILE_PX, ATLAS_GRID } from './atlas.js';
import { ITEM_DEFS, isItem, RECIPES, matchGrid, autoColocar } from './items.js';

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
            progress: document.getElementById('progress'),
            progressLabel: document.getElementById('progress-label'),
            progressFill: document.getElementById('progress-fill'),
            debug: document.getElementById('debug'),
            hearts: document.getElementById('hearts'),
        };

        this.buildHotbar();
        this.buildPicker();
        this.buildHearts();

        // el material «en mano» y el tooltip siguen al puntero en el crafteo
        this.craftState = null;
        this.bookOpen = false;
        this.els.craft.addEventListener('mousemove', (e) => {
            this.els.craftCursor.style.left = `${e.clientX + 10}px`;
            this.els.craftCursor.style.top = `${e.clientY + 10}px`;
            this.els.craftTooltip.style.left = `${e.clientX + 14}px`;
            this.els.craftTooltip.style.top = `${e.clientY - 26}px`;
        });
        this.drawIcon(this.els.craftBookIcon, B.BOOKSHELF); // icono del recetario
        this.els.craftBookBtn.addEventListener('click', () => {
            this.bookOpen = !this.bookOpen;
            this.renderCraft();
        });
    }

    /** Tooltip flotante con el nombre del item bajo el puntero. */
    tooltip(texto) {
        const t = this.els.craftTooltip;
        if (!texto) { t.classList.add('hidden'); return; }
        t.textContent = texto;
        t.classList.remove('hidden');
    }

    /* ---- Salud ---- */

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

        if (def.cross) {
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
        this.slots[this.active] = blockId;
        this.drawIcon(this.slotCanvases[this.active], blockId);
        this.refreshCounts();
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
        const st = this.craftState;
        if (st) for (const id of st.cells) if (id) this.inventory.add(id);
        this.craftState = null;
        this.setMano(0);
        this.tooltip(null);
        this.els.craft.classList.add('hidden');
        this.refreshCounts();
    }

    craftOpen() { return !this.els.craft.classList.contains('hidden'); }

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

        // existencias: rejilla fija de ranuras (las vacías, visibles); clic
        // toma el material en mano (clic de nuevo, o en una vacía, lo suelta)
        const stock = this.els.craftInv;
        stock.innerHTML = '';
        const ids = inv.ids();
        const total = Math.max(27, Math.ceil(ids.length / 9) * 9); // 3+ filas de 9
        for (let k = 0; k < total; k++) {
            const id = ids[k];
            const cell = this.ranura(id || 0, id ? inv.count(id) : undefined);
            if (id && st.mano === id) cell.classList.add('activo');
            cell.addEventListener('click', () => {
                this.setMano(id && st.mano !== id ? id : 0);
                this.renderCraft();
            });
            stock.appendChild(cell);
        }

        // hotbar: con material en mano lo asigna a la ranura; sin él, la activa
        const barra = this.els.craftHotbar;
        barra.innerHTML = '';
        this.slots.forEach((slotId, i) => {
            const cell = this.ranura(slotId, inv.count(slotId));
            if (i === this.active) cell.classList.add('activo');
            cell.addEventListener('click', () => {
                if (st.mano) {
                    this.slots[i] = st.mano;
                    this.drawIcon(this.slotCanvases[i], st.mano);
                } else {
                    this.setActive(i);
                }
                this.refreshCounts();
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

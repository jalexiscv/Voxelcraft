/**
 * HUD sobre DOM: hotbar de 9 ranuras con iconos isométricos pintados desde
 * el atlas, selector de bloques, barra de progreso y texto de depuración.
 */
import { DEFS, PLACEABLE } from './blocks.js';
import { TILE_PX, ATLAS_GRID } from './atlas.js';

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
            progress: document.getElementById('progress'),
            progressLabel: document.getElementById('progress-label'),
            progressFill: document.getElementById('progress-fill'),
            debug: document.getElementById('debug'),
            hearts: document.getElementById('hearts'),
        };

        this.buildHotbar();
        this.buildPicker();
        this.buildHearts();
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
        // creativo: todos los materiales; supervivencia: solo lo recolectado
        const ids = this.inventory ? this.inventory.ids().filter((id) => DEFS[id] && DEFS[id].placeable)
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
            cell.title = DEFS[id].name;
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

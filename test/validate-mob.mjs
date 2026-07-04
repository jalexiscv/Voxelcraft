/**
 * Validador del contrato de definición de mobs (ver js/mobs/model.js).
 * Uso: node test/validate-mob.mjs <id> [<id>...]   (p. ej. cerdo)
 *
 * Comprueba campos obligatorios, partes bien formadas, desplegados UV dentro
 * de la piel y sin solapes, y que paint() sea determinista y cubra de color
 * todos los texels que las UV referencian (un mob nunca debe ser invisible).
 */
import { pathToFileURL } from 'node:url';
import { partUVRects, partBox, ANIMS } from '../js/mobs/model.js';
import { Skin } from '../js/mobs/skin.js';
import { toSeed } from '../js/noise.js';

const SOUND_KINDS = ['say', 'hurt', 'death'];

/** Valida una definición; devuelve {errors, warnings} (vacíos si es válida). */
export function validate(def, expectedId) {
    const errors = [];
    const warnings = [];
    const err = (msg) => errors.push(msg);

    /* ---- Campos generales ---- */
    if (!def || typeof def !== 'object') return { errors: ['la exportación default no es un objeto'], warnings };
    if (def.id !== expectedId) err(`id "${def.id}" ≠ nombre de archivo "${expectedId}"`);
    if (!def.name) err('falta name');
    if (typeof def.hostile !== 'boolean') err('hostile debe ser booleano');
    if (!def.aabb || !(def.aabb.w > 0 && def.aabb.w <= 2) || !(def.aabb.h > 0 && def.aabb.h <= 2.5)) {
        err('aabb.w ∈ (0,2] y aabb.h ∈ (0,2.5] requeridos');
    }
    if (!(def.hp >= 1 && def.hp <= 40)) err('hp fuera de rango (1..40)');
    if (!(def.speed >= 0.2 && def.speed <= 8)) err('speed fuera de rango (0.2..8)');
    if (!def.skin || ![32, 64, 128].includes(def.skin.w) || ![32, 64, 128].includes(def.skin.h)) {
        err('skin.w/h deben ser 32, 64 o 128');
    }
    if (typeof def.paint !== 'function') err('falta paint(skin)');
    if (!Array.isArray(def.parts) || def.parts.length < 1 || def.parts.length > 24) {
        err('parts debe tener entre 1 y 24 partes');
    }
    if (def.hostile && !def.behavior) err('un hostil requiere behavior');

    if (!def.voice) err('falta voice');
    for (const kind of SOUND_KINDS) {
        const entries = def.voice && def.voice[kind];
        if (!Array.isArray(entries) || entries.length === 0) { err(`voice.${kind} debe ser un array no vacío`); continue; }
        for (const e of entries) {
            if (!(e.f > 0) || !(e.d > 0)) err(`voice.${kind}: cada entrada requiere f>0 y d>0`);
        }
    }
    if (errors.length) return { errors, warnings }; // sin base válida no seguimos

    /* ---- Partes y desplegado UV ---- */
    const rects = []; // {r, part} para el chequeo de solapes
    let maxTopPx = 0;
    for (const p of def.parts) {
        const tag = `parte "${p.name || '?'}"`;
        if (!p.name) err('toda parte requiere name');
        const triple = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n) && Math.abs(n) <= 48);
        if (!triple(p.size) || !p.size.every((n) => Number.isInteger(n) && n >= 1)) err(`${tag}: size inválido`);
        if (!triple(p.pivot)) err(`${tag}: pivot inválido`);
        if (!triple(p.origin)) err(`${tag}: origin inválido`);
        if (!Array.isArray(p.uv) || p.uv.length !== 2 || !p.uv.every((n) => Number.isInteger(n) && n >= 0)) err(`${tag}: uv inválido`);
        if (p.anim && !ANIMS.includes(p.anim)) err(`${tag}: anim "${p.anim}" desconocida (${ANIMS.join(', ')})`);
        if (p.rot && !triple(p.rot)) err(`${tag}: rot inválido`);
        if (errors.length) continue;

        for (const r of partUVRects(p)) {
            if (r.x < 0 || r.y < 0 || r.x + r.w > def.skin.w || r.y + r.h > def.skin.h) {
                err(`${tag}: desplegado UV fuera de la piel (${r.x},${r.y} ${r.w}×${r.h})`);
            }
            rects.push({ r, part: p.name });
        }
        maxTopPx = Math.max(maxTopPx, p.pivot[1] + partBox(p).max[1]);
    }

    // solapes: rectángulos idénticos (partes que comparten desplegado) se permiten
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].r, b = rects[j].r;
            if (a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h) continue;
            if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
                err(`solape UV entre "${rects[i].part}" y "${rects[j].part}"`);
            }
        }
    }

    // la altura del modelo debe parecerse a la del AABB
    const hPx = def.aabb.h * 16;
    if (maxTopPx > 0 && Math.abs(maxTopPx - hPx) / hPx > 0.45) {
        warnings.push(`altura del modelo ${maxTopPx}px vs AABB ${hPx}px: revisar proporciones`);
    }

    // geometría aprendida de la primera hornada de revisiones adversarias
    for (const p of def.parts) {
        if (['leg0', 'leg1'].includes(p.anim) && !p.rot && !def.flying && !def.aquatic) {
            const feet = p.pivot[1] + p.origin[1];
            if (Math.abs(feet) > 1.5) {
                warnings.push(`parte "${p.name}": los pies quedan a ${feet}px del suelo (pivot.y + origin.y ≈ 0)`);
            }
        }
        if (p.rot && p.rot[0] < -0.9) {
            warnings.push(`parte "${p.name}": rot X ${p.rot[0]} apunta hacia ATRÁS; en este motor el frente (−Z) exige rot X POSITIVA`);
        }
    }
    if (def.spawn && def.spawn.block && !['GRASS', 'SAND', 'ANY'].includes(def.spawn.block)) {
        err(`spawn.block "${def.spawn.block}" desconocido (GRASS|SAND|ANY)`);
    }

    /* ---- Variantes (tonalidades por individuo) ---- */
    if (def.variants !== undefined && (!Number.isInteger(def.variants) || def.variants < 2 || def.variants > 8)) {
        err('variants debe ser un entero 2..8');
    }
    if (def.variantBiome) {
        for (const [bioma, v] of Object.entries(def.variantBiome)) {
            if (!Number.isInteger(v) || v < 0 || v >= (def.variants || 1)) {
                err(`variantBiome.${bioma}: variante ${v} fuera de rango (0..${(def.variants || 1) - 1})`);
            }
        }
    }

    /* ---- Pintado: determinismo y cobertura (por cada variante) ---- */
    if (!errors.length) {
        for (let v = 0; v < (def.variants || 1); v++) {
            const seed = toSeed(def.id) + v * 131; // misma semilla que mobrender
            const a = new Skin(def.skin.w, def.skin.h, seed);
            const b = new Skin(def.skin.w, def.skin.h, seed);
            def.paint(a, v);
            def.paint(b, v);
            if (Buffer.compare(Buffer.from(a.data.buffer), Buffer.from(b.data.buffer)) !== 0) {
                err(`paint(v=${v}) no es determinista (¿usa Math.random en vez de skin.rng?)`);
                break;
            }
            let missing = 0;
            for (const { r } of rects) {
                for (let y = r.y; y < r.y + r.h; y++) {
                    for (let x = r.x; x < r.x + r.w; x++) {
                        if (a.data[(y * def.skin.w + x) * 4 + 3] === 0) missing++;
                    }
                }
            }
            if (missing > 0) { err(`variante ${v}: ${missing} texels referenciados por UV sin pintar`); break; }
        }
    }

    return { errors, warnings };
}

/* ---- CLI ---- */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const ids = process.argv.slice(2);
    if (ids.length === 0) {
        console.error('Uso: node test/validate-mob.mjs <id> [<id>...]');
        process.exit(2);
    }
    let failed = 0;
    for (const id of ids) {
        let result;
        try {
            const mod = await import(`../js/mobs/${id}.js`);
            result = validate(mod.default, id);
        } catch (e) {
            result = { errors: [`no se pudo importar js/mobs/${id}.js: ${e.message}`], warnings: [] };
        }
        for (const w of result.warnings) console.log(`  AVISO ${id}: ${w}`);
        if (result.errors.length === 0) {
            console.log(`  OK  ${id}`);
        } else {
            failed++;
            for (const e of result.errors) console.log(`  FALLA ${id}: ${e}`);
        }
    }
    process.exit(failed ? 1 : 0);
}

/**
 * Audio 100 % procedural con WebAudio: el repo no distribuye archivos de sonido.
 * - Efectos: ráfagas de ruido blanco filtrado, parametrizadas por material.
 * - Música: acordes generativos suaves sobre una escala pentatónica.
 * - Eventos: catálogo declarativo EVENTOS (id -> receta sintetizada) con
 *   `evento(nombre)` como punto de entrada único.
 * - Pack local opcional (js/soundpack.js): prioridad de resolución en cada
 *   punto con sonido: árbol del pack (sounds/manifest.json, rutas estilo
 *   Bedrock como step/grass3.mp3 o random/explode2.mp3) -> convención plana
 *   (grass1.mp3, evento.<nombre>.mp3) -> síntesis. La síntesis es el
 *   respaldo permanente: sin pack todo suena como siempre.
 *
 * El AudioContext se crea perezosamente en el primer gesto del usuario
 * (requisito de los navegadores).
 */

import * as pack from './soundpack.js';

/** Parámetros de filtro por material: frecuencia, Q, volumen y duración. */
const MATERIALS = {
    grass:  { freq: 700,  q: 0.8, vol: 0.14, dur: 0.09 },
    stone:  { freq: 1500, q: 1.2, vol: 0.16, dur: 0.07 },
    wood:   { freq: 380,  q: 1.5, vol: 0.16, dur: 0.10 },
    gravel: { freq: 900,  q: 0.6, vol: 0.16, dur: 0.12 },
    sand:   { freq: 1800, q: 0.5, vol: 0.10, dur: 0.08 },
    cloth:  { freq: 500,  q: 0.7, vol: 0.10, dur: 0.10 },
    none:   null,
};

/** Escala pentatónica mayor de Do para la música generativa. */
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

/**
 * Catálogo declarativo de eventos con sonido: id -> receta sintetizada.
 * Cada receta recibe el SoundEngine y compone con burst/tone/toneBend.
 * Antes de sintetizar, `evento(nombre)` consulta el pack local
 * (sounds/evento.<nombre>.mp3); la receta es siempre el fallback.
 * Se exporta para que las pruebas de humo verifiquen el catálogo.
 */
export const EVENTOS = {
    /* -- efectos clásicos del motor -- */
    splash: (s) => {
        s.burst(600, 0.4, 0.18, 0.35);
        s.burst(1400, 0.6, 0.10, 0.25, 0.05);
    },
    /** Siseo de la mecha del creeper. */
    fuse: (s) => {
        s.burst(2800, 0.7, 0.22, 1.4);
    },
    explosion: (s) => {
        s.burst(90, 0.3, 0.55, 0.8);
        s.burst(320, 0.5, 0.3, 0.5, 0.04);
        s.toneBend(70, 0.5, 0.7, 0.4, 'sine');
    },
    /** Chasquido de arco al disparar una flecha. */
    arrow: (s) => {
        s.burst(1300, 1.6, 0.16, 0.09);
        s.toneBend(500, 0.6, 0.1, 0.12, 'triangle');
    },
    player_hurt: (s) => {
        s.toneBend(240, 0.7, 0.16, 0.24, 'square');
        s.toneBend(170, 0.75, 0.2, 0.18, 'square', 0.09);
    },
    click: (s) => {
        s.tone(650, 0.04, 0.10, 'square');
    },

    /* -- acciones del jugador y del mundo -- */
    /** Comer: crujidos cortos descendentes. */
    comer: (s) => {
        s.burst(1100, 1.4, 0.16, 0.05);
        s.burst(850, 1.4, 0.14, 0.05, 0.09);
        s.burst(620, 1.2, 0.12, 0.06, 0.18);
    },
    /** Puerta de madera: chirrido de bisagra ascendente + golpe seco. */
    puerta_abrir: (s) => {
        s.toneBend(220, 1.6, 0.18, 0.10, 'sawtooth');
        s.burst(380, 1.5, 0.14, 0.08, 0.16);
    },
    /** Puerta de madera: chirrido descendente + portazo. */
    puerta_cerrar: (s) => {
        s.toneBend(340, 0.6, 0.16, 0.10, 'sawtooth');
        s.burst(300, 1.2, 0.18, 0.09, 0.12);
        s.tone(140, 0.07, 0.12, 'triangle', 0.12);
    },
    /** Cofre: bisagra lenta que sube + tapa al llegar arriba. */
    cofre_abrir: (s) => {
        s.toneBend(160, 2.2, 0.35, 0.09, 'sawtooth');
        s.burst(450, 1.3, 0.12, 0.10, 0.30);
    },
    /** Cofre: bisagra que baja + tapa que asienta. */
    cofre_cerrar: (s) => {
        s.toneBend(320, 0.5, 0.25, 0.09, 'sawtooth');
        s.burst(240, 1.0, 0.16, 0.10, 0.20);
        s.tone(120, 0.08, 0.12, 'triangle', 0.22);
    },
    /** Fundir: crepitar grave de fuego en ráfagas repetidas. */
    fundir: (s) => {
        for (let i = 0; i < 5; i++) {
            s.burst(280 + Math.random() * 260, 0.8, 0.10, 0.10,
                i * 0.12 + Math.random() * 0.04);
        }
    },
    /** Labrar la tierra con la azada: rasgado de grava. */
    labrar: (s) => {
        s.burst(900, 0.6, 0.16, 0.14);
        s.burst(650, 0.6, 0.13, 0.18, 0.06);
    },
    /** Sembrar: roce suave de hierba. */
    sembrar: (s) => {
        s.burst(700, 0.8, 0.10, 0.08);
        s.burst(950, 0.9, 0.07, 0.06, 0.05);
    },
    /** Cosechar: pop vegetal. */
    cosechar: (s) => {
        s.toneBend(500, 1.8, 0.07, 0.14, 'sine');
        s.burst(750, 0.9, 0.10, 0.07, 0.02);
    },
    /** Campana: golpe metálico con parciales inarmónicos y caída larga. */
    campana: (s) => {
        s.burst(2400, 2.0, 0.08, 0.05);
        s.tone(660, 2.2, 0.16, 'triangle');
        s.tone(1346, 1.6, 0.08, 'sine');
        s.tone(1960, 1.1, 0.05, 'sine');
    },
    /** Cristal que se hace añicos (romper GLASS o WINDOW). */
    cristal: (s) => {
        s.burst(3400, 0.7, 0.18, 0.16);
        s.burst(5200, 0.9, 0.12, 0.12, 0.03);
        s.burst(2300, 1.3, 0.09, 0.20, 0.06);
    },
    /** Flecha que se clava en un bloque: golpe seco de la punta. */
    flecha_clavada: (s) => {
        s.burst(2600, 1.8, 0.14, 0.05);
        s.tone(320, 0.08, 0.09, 'triangle', 0.01);
    },
};

/**
 * Evento del catálogo -> prefijo del árbol del pack (sounds/manifest.json).
 * variantesArbol(prefijo) elige entre las rutas que empiezan por él, así que
 * cada prefijo se eligió contra el manifest real para casar EXACTAMENTE la
 * familia deseada (p. ej. `random/bow.` con punto: sin él arrastraría
 * bowhit1..4). Los eventos sin entrada aquí (fundir, labrar, sembrar,
 * campana) no tienen archivo en el árbol y siguen 100 % sintetizados.
 * Se exporta para que la verificación contraste las rutas con el manifest.
 */
export const EVENTO_ARBOL = {
    click: 'random/click',               // random/click.mp3
    fuse: 'random/fuse',                 // random/fuse.mp3
    explosion: 'random/explode',         // random/explode1..4.mp3
    arrow: 'random/bow.',                // random/bow.mp3 (el punto excluye bowhit)
    splash: 'random/splash',             // random/splash.mp3
    comer: 'random/eat',                 // random/eat1..3.mp3
    puerta_abrir: 'random/door_open',    // random/door_open.mp3
    puerta_cerrar: 'random/door_close',  // random/door_close.mp3
    cofre_abrir: 'random/chestopen',     // random/chestopen.mp3
    cofre_cerrar: 'random/chestclosed',  // random/chestclosed.mp3
    // damage/hit1..3 gana a random/hurt: 3 variantes contra 1 y es la familia
    // que el propio pack Bedrock asigna al daño del jugador
    player_hurt: 'damage/hit',
    cosechar: 'random/pop',              // random/pop.mp3 y pop2.mp3
    cristal: 'random/glass',             // random/glass1..3.mp3
    flecha_clavada: 'random/bowhit',     // random/bowhit1..4.mp3
};

/**
 * Voz de mob desde el árbol SIN await (ruta caliente): mismo criterio que
 * pack.resolverVozMob — primero los `prefijos` del campo `sonidos` de la def
 * (en orden, se planta en el PRIMERO con rutas en el manifest), después
 * carpeta = alias de CARPETA_MOB o el propio id plantándose en el PRIMER
 * candidato de VOCES[kind] con rutas — pero síncrono: si ninguna variante
 * está cargada aún devuelve null (el sondeo queda lanzado) y el llamador cae
 * a la convención plana o sintetiza.
 */
function vozArbol(mobId, kind, prefijos = null) {
    // 1) prefijos propios del mob (def.sonidos), probados en orden
    if (Array.isArray(prefijos)) {
        for (const prefijo of prefijos) {
            if (pack.rutasArbol(prefijo).length) return pack.variantesArbol(prefijo);
        }
    }
    // 2) candidatos genéricos de la tabla VOCES bajo la carpeta del mob
    const carpeta = pack.CARPETA_MOB[mobId] || mobId;
    for (const candidato of pack.VOCES[kind] || [kind]) {
        const prefijo = `mob/${carpeta}/${candidato}`;
        if (pack.rutasArbol(prefijo).length) return pack.variantesArbol(prefijo);
    }
    return null;
}

/**
 * ¿El árbol del pack TIENE esta voz? true/false cuando el manifest ya
 * concluyó; null mientras carga. Con false la convención plana es el
 * respaldo legítimo; con true o null NO debe sondearse: o la servirá el
 * árbol o aún no se sabe, y sondear genera tormentas de 404 inútiles.
 * (Exportada para las pruebas de humo.)
 */
export function hayVozEnArbol(mobId, kind, prefijos = null) {
    if (!pack.arbolListo()) return null;
    if (Array.isArray(prefijos)) {
        for (const prefijo of prefijos) {
            if (pack.rutasArbol(prefijo).length) return true;
        }
    }
    const carpeta = pack.CARPETA_MOB[mobId] || mobId;
    for (const candidato of pack.VOCES[kind] || [kind]) {
        if (pack.rutasArbol(`mob/${carpeta}/${candidato}`).length) return true;
    }
    return false;
}

/** Igual que hayVozEnArbol pero para un prefijo suelto (step/dig/evento). */
export function hayEnArbol(prefijo) {
    if (!pack.arbolListo()) return null;
    return pack.rutasArbol(prefijo).length > 0;
}

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.noiseBuffer = null;
        this.musicOn = true;
        this.musicTimer = null;
        this.musicSource = null; // pista del pack en reproducción (si la hay)
    }

    /** Inicializa (o reanuda) el contexto; llamar desde un gesto del usuario. */
    ensure() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.6;
            this.master.connect(this.ctx.destination);

            // 1 s de ruido blanco reutilizable
            const len = this.ctx.sampleRate;
            this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

            // Pack local opcional: solo sondea sounds/ en tiempo de ejecución.
            pack.init(this.ctx);

            if (this.musicOn) this.scheduleMusic();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
    }

    /** Ráfaga de ruido filtrado con envolvente de decaimiento exponencial. */
    burst(freq, q, vol, dur, when = 0) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + when;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = q;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t, Math.random(), dur + 0.05);
    }

    tone(freq, dur, vol, wave = 'sine', when = 0) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        osc.type = wave;
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    /**
     * Reproduce un AudioBuffer del pack local por el bus maestro. Devuelve
     * la fuente (para poder detener pistas largas) o null si no hay contexto.
     */
    playBuffer(buffer, vol = 1, rate = 1, when = 0) {
        if (!this.ctx || !buffer) return null;
        const t = this.ctx.currentTime + when;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const gain = this.ctx.createGain();
        gain.gain.value = vol;
        src.connect(gain).connect(this.master);
        src.start(t);
        return src;
    }

    /**
     * Variante de la familia de material en el pack (grass1..4, stone1..4…).
     * Ruta caliente sin await: si aún no hay ninguna cargada devuelve null
     * (el sondeo queda lanzado) y el llamador sintetiza como siempre.
     */
    packMaterial(material) {
        return MATERIALS[material] ? pack.variantes(material, 4) : null;
    }

    step(material) {
        const m = MATERIALS[material];
        if (!m) return;
        // 1) árbol del pack: step/<material>1..n del manifest
        const arbol = pack.variantesArbol('step/' + material);
        if (arbol) { this.playBuffer(arbol, 0.45, 0.95 + Math.random() * 0.1); return; }
        // 2) convención plana, solo si el árbol concluyó sin esta familia
        if (hayEnArbol('step/' + material) === false) {
            const buf = this.packMaterial(material);
            if (buf) { this.playBuffer(buf, 0.45, 0.95 + Math.random() * 0.1); return; }
        }
        this.burst(m.freq * (0.9 + Math.random() * 0.2), m.q, m.vol * 0.7, m.dur);
    }

    dig(material) {
        const m = MATERIALS[material];
        if (!m) return;
        // 1) árbol del pack: dig/<material>1..n del manifest
        const arbol = pack.variantesArbol('dig/' + material);
        if (arbol) { this.playBuffer(arbol, 0.9, 0.9 + Math.random() * 0.2); return; }
        // 2) convención plana, solo si el árbol concluyó sin esta familia
        if (hayEnArbol('dig/' + material) === false) {
            const buf = this.packMaterial(material);
            if (buf) { this.playBuffer(buf, 0.9, 0.9 + Math.random() * 0.2); return; }
        }
        this.burst(m.freq * 0.7, m.q, m.vol, m.dur * 1.6);
        this.burst(m.freq * 0.5, m.q, m.vol * 0.8, m.dur * 2.2, 0.03);
    }

    /**
     * Crujido GRANULAR al desgranar un bloque (Fase 3 del shatter): en vez de
     * un solo golpe, una ráfaga de micro-bursts escalonados con la frecuencia
     * del material y jitter de tono/tiempo, como un puñado de esquirlas que se
     * derraman. Cae al `dig` clásico primero (mantiene el impacto seco) y le
     * suma la cola granular.
     */
    crunch(material) {
        const m = MATERIALS[material] || MATERIALS.stone;
        if (!m || !this.ctx) return;
        this.dig(material);                 // impacto seco inicial
        // 6 granos repartidos en ~0,22 s, tono y volumen decrecientes
        const N = 6;
        for (let i = 0; i < N; i++) {
            const k = i / N;
            const freq = m.freq * (0.55 + Math.random() * 0.7);
            const vol = m.vol * (0.7 - k * 0.5) * (0.7 + Math.random() * 0.6);
            const dur = m.dur * (0.5 + Math.random() * 0.6);
            this.burst(freq, m.q * 0.8, vol, dur, 0.02 + k * 0.2 + Math.random() * 0.03);
        }
    }

    place(material) {
        const fam = MATERIALS[material] ? material : 'stone';
        // 1) árbol del pack: colocar comparte la familia dig/<material>
        const arbol = pack.variantesArbol('dig/' + fam);
        if (arbol) { this.playBuffer(arbol, 0.75); return; }
        // 2) convención plana, solo si el árbol concluyó sin esta familia
        if (hayEnArbol('dig/' + fam) === false) {
            const buf = this.packMaterial(fam);
            if (buf) { this.playBuffer(buf, 0.75); return; }
        }
        const m = MATERIALS[fam];
        this.burst(m.freq, m.q, m.vol, m.dur);
        this.tone(180, 0.06, 0.08, 'triangle');
    }

    splash() {
        this.evento('splash');
    }

    /** Tono con curva de frecuencia: termina en freq·bend (voces de mobs). */
    toneBend(freq, bend, dur, vol, wave = 'sine', when = 0) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freq * bend, 20), t + dur);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    /**
     * Voz de un mob: lista de entradas de tono {f, b, d, v, w, at} o de ruido
     * {noise:true, f, q, d, v, at}. `gain` atenúa por distancia (0..1).
     * `mobId` y `kind` son opcionales: si llegan se intenta primero el árbol
     * del pack (mob/<carpeta>/<candidato>*, ver vozArbol), después la
     * convención plana mob.<id>.<kind> (el kind `say` del contrato equivale
     * a `idle` en el pack) y, si nada está disponible, se sintetizan las
     * entradas. `prefijos` (opcional, del campo `sonidos` de la def) se
     * propaga a la resolución del árbol y gana a los candidatos genéricos.
     */
    mobSay(entries, gain = 1, mobId = null, kind = null, prefijos = null) {
        if (!this.ctx) return;
        if (mobId && kind && gain > 0.002) {
            // 1) árbol del pack (manifest), con los prefijos del mob primero
            const arbol = vozArbol(mobId, kind, prefijos);
            if (arbol) { this.playBuffer(arbol, gain); return; }
            // 2) convención plana: SOLO si el árbol concluyó sin esta voz
            // (con rutas pendientes o manifest cargando, sondear el plano
            // sería una tormenta de 404 que el árbol cubrirá igualmente)
            if (hayVozEnArbol(mobId, kind, prefijos) === false) {
                const k = kind === 'say' ? 'idle' : kind;
                const base = `mob.${mobId}.${k}`;
                const buf = pack.obtener(base) || pack.variantes(base, 4);
                if (buf) { this.playBuffer(buf, gain); return; }
            }
        }
        if (!entries) return;
        for (const e of entries) {
            const v = (e.v || 0.2) * gain;
            if (v <= 0.002) continue;
            if (e.noise) this.burst(e.f, e.q || 1, v, e.d, e.at || 0);
            else this.toneBend(e.f, e.b || 1, e.d, v, e.w || 'sine', e.at || 0);
        }
    }

    /**
     * Punto de entrada único de los eventos del catálogo, por prioridad:
     * 1) árbol del pack (EVENTO_ARBOL[nombre] contra el manifest),
     * 2) convención plana sounds/evento.<nombre>.mp3,
     * 3) receta sintetizada de EVENTOS (respaldo permanente).
     * `vol` atenúa la reproducción del pack (p. ej. por distancia); la
     * síntesis conserva sus volúmenes de receta. Nunca hay await en esta
     * ruta: ni silencio ni latencia.
     */
    evento(nombre, vol = 1) {
        if (!this.ctx) return;
        const prefijo = EVENTO_ARBOL[nombre];
        if (prefijo) {
            const arbol = pack.variantesArbol(prefijo);
            if (arbol) { this.playBuffer(arbol, vol); return; }
        }
        // convención plana: solo sin ruta de árbol, o si este concluyó vacío
        if (!prefijo || hayEnArbol(prefijo) === false) {
            const buf = pack.obtener('evento.' + nombre);
            if (buf) { this.playBuffer(buf, vol); return; }
        }
        const receta = EVENTOS[nombre];
        if (receta) receta(this);
    }

    /* ---- Ambientales del pack (sin síntesis: sutiles y opcionales) ---- */

    /**
     * Susurro lejano de cueva (cave/cave1..23 del árbol). Solo suena si el
     * pack local lo trae: un ambiente que falta no se sintetiza (silencio).
     */
    ambienteCueva() {
        if (!this.ctx) return;
        const buf = pack.variantesArbol('cave/');
        if (buf) this.playBuffer(buf, 0.25);
    }

    /**
     * La cámara entra (o sale) del agua: ambient/underwater/enter1..3 y
     * exit1..3 del árbol, a volumen bajo (se suma al splash del chapuzón).
     */
    ambienteAgua(entra) {
        if (!this.ctx) return;
        const buf = pack.variantesArbol(entra
            ? 'ambient/underwater/enter' : 'ambient/underwater/exit');
        if (buf) this.playBuffer(buf, 0.3);
    }

    /* ---- Clima ---- */

    /**
     * Bucle de lluvia: el ruido blanco compartido en loop pasado por un
     * lowpass; el volumen sigue la intensidad del clima con una curva
     * cuadrática (susurro con llovizna, aguacero con tormenta). Se crea una
     * sola vez y después cada llamada solo mueve la ganancia (suavizada).
     */
    lluvia(intensidad) {
        if (!this.ctx) return;
        if (!this.lluviaNodo) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            src.loop = true;
            const filtro = this.ctx.createBiquadFilter();
            filtro.type = 'lowpass';
            filtro.frequency.value = 1100;
            filtro.Q.value = 0.4;
            const gain = this.ctx.createGain();
            gain.gain.value = 0;
            src.connect(filtro); filtro.connect(gain); gain.connect(this.master);
            src.start();
            this.lluviaNodo = { gain };
        }
        const v = 0.16 * intensidad * intensidad;
        this.lluviaNodo.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.6);
    }

    /**
     * Trueno tras `retardo` segundos (main lo escala con la distancia del
     * rayo): estruendo de ruido browniano —grave y rugoso— con el filtro
     * cayendo de 420 a 70 Hz y la ganancia extinguiéndose en ~2.4 s.
     */
    trueno(retardo = 0.4) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + retardo;
        const dur = 2.4, sr = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, dur * sr, sr);
        const d = buf.getChannelData(0);
        let acc = 0;
        for (let i = 0; i < d.length; i++) {
            acc = (acc + (Math.random() * 2 - 1) * 0.08) * 0.985;
            d[i] = acc * (1 - i / d.length);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.setValueAtTime(420, t);
        filtro.frequency.exponentialRampToValueAtTime(70, t + dur);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        src.connect(filtro); filtro.connect(gain); gain.connect(this.master);
        src.start(t);
    }

    /** Siseo de la mecha del creeper. */
    fuse() {
        this.evento('fuse');
    }

    explosion() {
        this.evento('explosion');
    }

    /** Chasquido de arco al disparar una flecha. */
    arrow() {
        this.evento('arrow');
    }

    playerHurt() {
        this.evento('player_hurt');
    }

    click() {
        this.evento('click');
    }

    /* ---- Música generativa ---- */

    scheduleMusic() {
        if (this.musicTimer) clearTimeout(this.musicTimer);
        const next = () => {
            let espera = 9000 + Math.random() * 9000;
            if (this.musicOn && this.ctx && this.ctx.state === 'running') {
                // Si el pack local trae pistas calm1..4, suenan en lugar de
                // los acordes generativos, con pausas largas entre pistas.
                const pista = pack.variantes('calm', 4);
                if (pista) {
                    this.musicSource = this.playBuffer(pista, 0.5);
                    espera = pista.duration * 1000 + 60000 + Math.random() * 120000;
                } else {
                    this.playChord();
                }
            }
            this.musicTimer = setTimeout(next, espera);
        };
        this.musicTimer = setTimeout(next, 2500);
    }

    /** Acorde suave de 3 notas de la escala, con ataque y liberación lentos. */
    playChord() {
        const root = Math.floor(Math.random() * 4);
        const notes = [SCALE[root], SCALE[root + 2], SCALE[root + 4]];
        if (Math.random() < 0.4) notes.push(SCALE[root] / 2); // bajo ocasional
        const t = this.ctx.currentTime;
        for (const freq of notes) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.002);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.045, t + 1.8);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
            osc.connect(gain).connect(this.master);
            osc.start(t);
            osc.stop(t + 7);
        }
    }

    toggleMusic() {
        this.musicOn = !this.musicOn;
        if (!this.musicOn && this.musicSource) {
            try { this.musicSource.stop(); } catch (e) { /* ya detenida */ }
            this.musicSource = null;
        }
        if (this.musicOn && this.ctx) this.scheduleMusic();
        return this.musicOn;
    }
}

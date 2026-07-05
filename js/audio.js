/**
 * Audio 100 % procedural con WebAudio: el repo no distribuye archivos de sonido.
 * - Efectos: ráfagas de ruido blanco filtrado, parametrizadas por material.
 * - Música: acordes generativos suaves sobre una escala pentatónica.
 * - Eventos: catálogo declarativo EVENTOS (id -> receta sintetizada) con
 *   `evento(nombre)` como punto de entrada único.
 * - Pack local opcional (js/soundpack.js): si el usuario coloca sus propios
 *   mp3 en sounds/ siguiendo la convención de nombres, se reproducen en
 *   lugar de la síntesis; si faltan, todo suena sintetizado como siempre.
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
};

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
        const buf = this.packMaterial(material);
        if (buf) { this.playBuffer(buf, 0.45, 0.95 + Math.random() * 0.1); return; }
        this.burst(m.freq * (0.9 + Math.random() * 0.2), m.q, m.vol * 0.7, m.dur);
    }

    dig(material) {
        const m = MATERIALS[material];
        if (!m) return;
        const buf = this.packMaterial(material);
        if (buf) { this.playBuffer(buf, 0.9, 0.9 + Math.random() * 0.2); return; }
        this.burst(m.freq * 0.7, m.q, m.vol, m.dur * 1.6);
        this.burst(m.freq * 0.5, m.q, m.vol * 0.8, m.dur * 2.2, 0.03);
    }

    place(material) {
        const fam = MATERIALS[material] ? material : 'stone';
        const buf = this.packMaterial(fam);
        if (buf) { this.playBuffer(buf, 0.75); return; }
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
     * `mobId` y `kind` son opcionales: si llegan y el pack local tiene
     * mob.<id>.<kind> (el kind `say` del contrato equivale a `idle` en el
     * pack), se reproduce ese archivo; si no, se sintetizan las entradas.
     */
    mobSay(entries, gain = 1, mobId = null, kind = null) {
        if (!this.ctx) return;
        if (mobId && kind && gain > 0.002) {
            const k = kind === 'say' ? 'idle' : kind;
            const base = `mob.${mobId}.${k}`;
            const buf = pack.obtener(base) || pack.variantes(base, 4);
            if (buf) { this.playBuffer(buf, gain); return; }
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
     * Punto de entrada único de los eventos del catálogo: intenta primero
     * sounds/evento.<nombre>.mp3 del pack local y, si no está disponible
     * (no existe o aún se está sondeando), sintetiza la receta de EVENTOS.
     * Nunca hay await en esta ruta: ni silencio ni latencia.
     */
    evento(nombre) {
        if (!this.ctx) return;
        const buf = pack.obtener('evento.' + nombre);
        if (buf) { this.playBuffer(buf); return; }
        const receta = EVENTOS[nombre];
        if (receta) receta(this);
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

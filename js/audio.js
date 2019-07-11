/**
 * Audio 100 % procedural con WebAudio: sin archivos de sonido.
 * - Efectos: ráfagas de ruido blanco filtrado, parametrizadas por material.
 * - Música: acordes generativos suaves sobre una escala pentatónica.
 *
 * El AudioContext se crea perezosamente en el primer gesto del usuario
 * (requisito de los navegadores).
 */

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

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.noiseBuffer = null;
        this.musicOn = true;
        this.musicTimer = null;
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

    step(material) {
        const m = MATERIALS[material];
        if (m) this.burst(m.freq * (0.9 + Math.random() * 0.2), m.q, m.vol * 0.7, m.dur);
    }

    dig(material) {
        const m = MATERIALS[material];
        if (!m) return;
        this.burst(m.freq * 0.7, m.q, m.vol, m.dur * 1.6);
        this.burst(m.freq * 0.5, m.q, m.vol * 0.8, m.dur * 2.2, 0.03);
    }

    place(material) {
        const m = MATERIALS[material] || MATERIALS.stone;
        this.burst(m.freq, m.q, m.vol, m.dur);
        this.tone(180, 0.06, 0.08, 'triangle');
    }

    splash() {
        this.burst(600, 0.4, 0.18, 0.35);
        this.burst(1400, 0.6, 0.10, 0.25, 0.05);
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
     */
    mobSay(entries, gain = 1) {
        if (!this.ctx || !entries) return;
        for (const e of entries) {
            const v = (e.v || 0.2) * gain;
            if (v <= 0.002) continue;
            if (e.noise) this.burst(e.f, e.q || 1, v, e.d, e.at || 0);
            else this.toneBend(e.f, e.b || 1, e.d, v, e.w || 'sine', e.at || 0);
        }
    }

    /** Siseo de la mecha del creeper. */
    fuse() {
        this.burst(2800, 0.7, 0.22, 1.4);
    }

    explosion() {
        this.burst(90, 0.3, 0.55, 0.8);
        this.burst(320, 0.5, 0.3, 0.5, 0.04);
        this.toneBend(70, 0.5, 0.7, 0.4, 'sine');
    }

    /** Chasquido de arco al disparar una flecha. */
    arrow() {
        this.burst(1300, 1.6, 0.16, 0.09);
        this.toneBend(500, 0.6, 0.1, 0.12, 'triangle');
    }

    playerHurt() {
        this.toneBend(240, 0.7, 0.16, 0.24, 'square');
        this.toneBend(170, 0.75, 0.2, 0.18, 'square', 0.09);
    }

    click() {
        this.tone(650, 0.04, 0.10, 'square');
    }

    /* ---- Música generativa ---- */

    scheduleMusic() {
        if (this.musicTimer) clearTimeout(this.musicTimer);
        const next = () => {
            if (this.musicOn && this.ctx && this.ctx.state === 'running') this.playChord();
            this.musicTimer = setTimeout(next, 9000 + Math.random() * 9000);
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
        if (this.musicOn && this.ctx) this.scheduleMusic();
        return this.musicOn;
    }
}

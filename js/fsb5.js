/**
 * fsb5.js — Parser de archivos FMOD Sound Bank v5 (FSB5) en JavaScript puro.
 * Funciona en Node.js y en el navegador (usa DataView, sin dependencias).
 *
 * Estructura del formato (little-endian):
 *   [Header 60/64 bytes] [Sample headers] [Name table] [Sample data]
 *
 * Basado en la ingeniería inversa del proyecto python-fsb5 (HearthSim).
 * Aportado por el usuario y adaptado a módulo ES; lo consume soundpack.js
 * para reproducir los .fsb del pack local (PCM* directo a WAV; MPEG como
 * frames mp3 crudos; otros códecs no están soportados).
 */

const CODECS = [
    'NONE', 'PCM8', 'PCM16', 'PCM24', 'PCM32', 'PCMFLOAT',
    'GCADPCM', 'IMAADPCM', 'VAG', 'HEVAG', 'XMA', 'MPEG',
    'CELT', 'AT9', 'XWMA', 'VORBIS', 'FADPCM',
];

const FREQUENCIES = {
    1: 8000, 2: 11000, 3: 11025, 4: 16000, 5: 22050,
    6: 24000, 7: 32000, 8: 44100, 9: 48000, 10: 96000,
};

const CHUNK_TYPES = {
    1: 'CHANNELS', 2: 'FREQUENCY', 3: 'LOOP', 6: 'XMASEEK',
    7: 'DSPCOEFF', 9: 'XWMADATA', 11: 'VORBISDATA',
};

/**
 * Parsea un FSB5 a partir de un ArrayBuffer o Uint8Array.
 * @returns {{ header: object, samples: Array }}
 */
export function parseFSB5(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // ---- 1. Cabecera principal ----
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'FSB5') {
        throw new Error(`No es un FSB5 (magic="${magic}"). ¿FSB antiguo o archivo cifrado?`);
    }

    const version           = view.getUint32(4, true);
    const numSamples        = view.getUint32(8, true);
    const sampleHeadersSize = view.getUint32(12, true);
    const nameTableSize     = view.getUint32(16, true);
    const dataSize          = view.getUint32(20, true);
    const mode              = view.getUint32(24, true);

    // La versión 0 tiene 4 bytes extra en la cabecera
    const headerSize = version === 0 ? 64 : 60;
    const codec = CODECS[mode] ?? `DESCONOCIDO(${mode})`;

    const header = { version, numSamples, codec, sampleHeadersSize, nameTableSize, dataSize };

    // ---- 2. Cabeceras de cada sample ----
    // Cada sample tiene un uint64 con campos empaquetados en bits:
    //   bit 0        -> hay chunks extra
    //   bits 1-4     -> índice de frecuencia
    //   bit 5        -> canales - 1
    //   bits 6-33    -> offset de datos (multiplicado por 16)
    //   bits 34-63   -> número de muestras de audio
    let pos = headerSize;
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const raw = view.getBigUint64(pos, true);
        pos += 8;

        let hasChunks   = Number(raw & 1n);
        const freqIndex = Number((raw >> 1n) & 0x0Fn);
        let channels    = Number((raw >> 5n) & 0x01n) + 1;
        const dataOffset = Number((raw >> 6n) & 0x0FFFFFFFn) * 16;
        const sampleCount = Number((raw >> 34n) & 0x3FFFFFFFn);

        let frequency = FREQUENCIES[freqIndex] ?? null;
        const chunks = [];

        // Chunks opcionales (loops, coeficientes, cabecera Vorbis, etc.)
        while (hasChunks) {
            const chunkRaw = view.getUint32(pos, true);
            pos += 4;
            hasChunks = chunkRaw & 1;
            const chunkSize = (chunkRaw >> 1) & 0xFFFFFF;
            const chunkType = (chunkRaw >> 25) & 0x7F;
            const chunkData = bytes.subarray(pos, pos + chunkSize);

            // Algunos chunks sobreescriben valores de la cabecera
            if (chunkType === 1) channels = chunkData[0];
            if (chunkType === 2) frequency = new DataView(chunkData.buffer, chunkData.byteOffset, 4).getUint32(0, true);

            chunks.push({ type: CHUNK_TYPES[chunkType] ?? chunkType, size: chunkSize, data: chunkData });
            pos += chunkSize;
        }

        samples.push({ name: `sample_${i}`, frequency, channels, dataOffset, sampleCount, chunks });
    }

    // ---- 3. Tabla de nombres ----
    const nameTableStart = headerSize + sampleHeadersSize;
    if (nameTableSize > 0) {
        for (let i = 0; i < numSamples; i++) {
            const nameOffset = view.getUint32(nameTableStart + i * 4, true);
            let p = nameTableStart + nameOffset, name = '';
            while (bytes[p] !== 0) name += String.fromCharCode(bytes[p++]);
            samples[i].name = name;
        }
    }

    // ---- 4. Datos de audio ----
    const dataStart = nameTableStart + nameTableSize;
    for (let i = 0; i < numSamples; i++) {
        const start = dataStart + samples[i].dataOffset;
        const end = (i + 1 < numSamples)
            ? dataStart + samples[i + 1].dataOffset
            : dataStart + dataSize;
        samples[i].data = bytes.subarray(start, end);
    }

    return { header, samples };
}

/** Especificación WAV por códec PCM: bits por muestra y etiqueta de formato. */
const PCM_WAV = {
    PCM8:     { bits: 8,  fmt: 1 },
    PCM16:    { bits: 16, fmt: 1 },
    PCM24:    { bits: 24, fmt: 1 },
    PCM32:    { bits: 32, fmt: 1 },
    PCMFLOAT: { bits: 32, fmt: 3 }, // IEEE float
};

/*
 * FADPCM: el ADPCM propietario de FMOD (XA/PSX retocado, coeficientes ya
 * multiplicados por 64). Algoritmo reimplementado tomando como referencia
 * el decodificador de vgmstream (fadpcm_decoder.c, depurado byte a byte
 * contra las DLL de FMOD por ese proyecto).
 *
 * Cada frame ocupa 0x8c bytes y produce 256 muestras mono; es
 * autocontenido: su cabecera de 0xc bytes trae los índices de coeficiente
 * y shift de sus 8 grupos de nibbles más la historia inicial (hist1/hist2).
 */
const FADPCM_COEFS = [
    [0, 0], [60, 0], [122, 60], [115, 52], [98, 55], [0, 0], [0, 0],
];
const FADPCM_FRAME = 0x8c;                       // bytes por frame y canal
const FADPCM_MUESTRAS = (FADPCM_FRAME - 0x0c) * 2; // 256 muestras por frame

/**
 * Decodifica un sample FADPCM a PCM16 entrelazado (Int16Array). Con más de
 * un canal, los frames van intercalados por canal (entrelazado externo).
 */
export function decodeFADPCM(sample) {
    const bytes = sample.data;
    const canales = sample.channels || 1;
    const framesPorCanal = Math.floor(bytes.length / (FADPCM_FRAME * canales));
    const total = Math.min(sample.sampleCount || Infinity, framesPorCanal * FADPCM_MUESTRAS);
    const pcm = new Int16Array(total * canales);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let c = 0; c < canales; c++) {
        let escritas = 0;
        for (let f = 0; f < framesPorCanal && escritas < total; f++) {
            const base = (f * canales + c) * FADPCM_FRAME;
            const coefs = v.getUint32(base + 0x00, true);
            const shifts = v.getUint32(base + 0x04, true);
            let hist1 = v.getInt16(base + 0x08, true);
            let hist2 = v.getInt16(base + 0x0a, true);

            for (let i = 0; i < 8; i++) {
                const idx = ((coefs >>> (i * 4)) & 0x0f) % 7;
                const shift = 22 - ((shifts >>> (i * 4)) & 0x0f);
                const [c1, c2] = FADPCM_COEFS[idx];

                for (let j = 0; j < 4; j++) {
                    const nibbles = v.getUint32(base + 0x0c + 0x10 * i + 0x04 * j, true);
                    for (let k = 0; k < 8; k++) {
                        let s = (nibbles >>> (k * 4)) & 0x0f;
                        s = (s << 28) >> shift;              // extensión de signo + escala
                        s = (s - hist2 * c2 + hist1 * c1) >> 6;
                        if (s > 32767) s = 32767; else if (s < -32768) s = -32768;
                        if (escritas < total) pcm[escritas * canales + c] = s;
                        escritas++;
                        hist2 = hist1;
                        hist1 = s;
                    }
                }
            }
        }
    }
    return pcm;
}

/**
 * Envuelve PCM16 ya decodificado (Int16Array entrelazado) en un WAV
 * canónico listo para decodeAudioData o para escribir a disco.
 */
export function pcm16AWav(pcm, frequency, channels) {
    const falso = { frequency, channels, data: new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength) };
    return sampleAWav(falso, 'PCM16');
}

/**
 * Convierte un sample PCM16 a un archivo WAV reproducible (Uint8Array).
 * Solo válido si header.codec === 'PCM16'.
 */
export function pcm16ToWav(sample) {
    return sampleAWav(sample, 'PCM16');
}

/**
 * Generalización: envuelve los datos crudos de cualquier códec PCM del
 * banco en una cabecera WAV canónica de 44 bytes, lista para
 * decodeAudioData. Devuelve null si el códec no es PCM o faltan datos.
 */
export function sampleAWav(sample, codec) {
    const spec = PCM_WAV[codec];
    if (!spec || !sample.frequency || !sample.channels || !sample.data.length) return null;

    const dataLen = sample.data.length;
    const bytesPorMuestra = spec.bits / 8;
    const buf = new ArrayBuffer(44 + dataLen);
    const v = new DataView(buf);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

    const blockAlign = sample.channels * bytesPorMuestra;
    const byteRate = sample.frequency * blockAlign;
    writeStr(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, spec.fmt, true);
    v.setUint16(22, sample.channels, true);
    v.setUint32(24, sample.frequency, true);
    v.setUint32(28, byteRate, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, spec.bits, true);
    writeStr(36, 'data'); v.setUint32(40, dataLen, true);
    new Uint8Array(buf, 44).set(sample.data);
    return new Uint8Array(buf);
}

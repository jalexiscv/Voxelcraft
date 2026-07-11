/**
 * Torres: complejo monumental de tres rascacielos curvados con podio, al
 * estilo de las torres paramétricas modernas — base acampanada que se funde
 * con el suelo, fuste cilíndrico estriado (24 costillas verticales con
 * franjas de ventanal), doble corona escalonada con el filo en diagonal y
 * un pabellón-lente acristalado a los pies. La torre central roza el techo
 * del mundo: 220 bloques desde el suelo.
 *
 * A diferencia del resto de planos (matrices dibujadas a mano), aquí las
 * capas se GENERAN al cargar el módulo con la geometría paramétrica de las
 * torres; el resultado cumple el mismo contrato tam/clave/capas de
 * villages/model.js, así que estampar/cajaDePieza/localDe lo tratan como a
 * cualquier otro. Es exclusivo de la consola (/construir): queda FUERA de
 * LISTA_PLANOS (no entra al pool del worldgen de aldeas) y FUERA de
 * test/validate-plano.mjs por diseño (su tamaño desborda el contrato 3..12
 * pensado para caseríos). Diseño original de VoxelCraft; solo bloques
 * literales de B.
 */

const ANCHO = 56, ALTO = 220, FONDO = 56;

/** Las tres torres: centro de la huella, altura y radio del fuste. La
 *  central es la más alta y cada una gira su muesca de corona (angV). */
const TORRES = [
    { cx: 14.5, cz: 40.5, h: 170, rF: 5.2, angV: 2.4 },
    { cx: 28.5, cz: 27.5, h: 219, rF: 6.4, angV: -0.6 },
    { cx: 42.0, cz: 35.5, h: 186, rF: 5.4, angV: 1.2 },
];

/** Podio-lente: elipse baja y acristalada al frente (la fachada es −Z). */
const PODIO = { cx: 28, cz: 12, sx: 24, sz: 8.5, alto: 6 };

const SECTORES = 24;      // costillas verticales del fuste
const FALDA = 0.30;       // tramo inferior acampanado (fracción de la altura)
const CAMPANA = 2.35;     // radio de la base respecto al fuste
const GROSOR = 1.7;       // espesor de la pared del anillo exterior

/** Char de la costilla en (ang): cristal cada 6 sectores, blanco/gris alternos. */
function costilla(ang, enFalda) {
    const s = ((ang / (2 * Math.PI) + 0.5) * SECTORES) | 0;
    if (s % 6 === 3) return enFalda ? 'G' : 'V'; // hendidura abajo, ventanal arriba
    return (s % 2) ? 'G' : 'B';
}

/** Radio exterior de la torre a la altura y (falda acampanada + fuste). */
function radioExt(t, y) {
    const hF = t.h * FALDA;
    if (y >= hF) return t.rF;
    return t.rF + (t.rF * (CAMPANA - 1)) * Math.pow(1 - y / hF, 2.4);
}

/**
 * Char de la torre `t` en la celda (lx, lz) de la capa `y`, o null si la
 * torre no pinta ahí. Anillo exterior hasta un tope que ondula con el
 * ángulo (el filo diagonal de la corona) y núcleo interior más esbelto que
 * remata más arriba con su propio filo — la doble corona de la silueta.
 */
function celdaTorre(t, lx, lz, y) {
    if (y >= t.h) return null;
    const dx = lx + 0.5 - t.cx, dz = lz + 0.5 - t.cz;
    const dist = Math.hypot(dx, dz);
    const rExt = radioExt(t, y);
    if (dist > rExt + 0.3) return null;
    const ang = Math.atan2(dz, dx);
    const ola = 0.5 + 0.5 * Math.cos(ang - t.angV);

    // anillo exterior: pared estriada hasta el filo diagonal de la corona
    if (dist > rExt - GROSOR) {
        if (y <= 1) return 'P'; // arranque macizo a ras de suelo
        if (y < t.h * (0.80 + 0.12 * ola)) return costilla(ang, y < t.h * FALDA);
        return null;
    }

    // núcleo interior (visible sobre la corona exterior, con su propio filo)
    const rInt = t.rF * 0.62;
    if (y >= t.h * 0.5 && dist > rInt - 1.4 && dist <= rInt) {
        if (y < t.h * (0.94 + 0.06 * (0.5 + 0.5 * Math.cos(ang - t.angV - 1.0)))) {
            return costilla(ang, false);
        }
    }
    return null;
}

/** Char del podio en (lx, lz, y), o null. Zócalo, cristalera y cubierta. */
function celdaPodio(lx, lz, y) {
    const ex = (lx + 0.5 - PODIO.cx) / PODIO.sx, ez = (lz + 0.5 - PODIO.cz) / PODIO.sz;
    const e = ex * ex + ez * ez;
    if (e > 1.05) return null;
    if (y === 0) return 'P';                        // losa
    if (y <= 4) return (e >= 0.72 && e <= 1)        // pared perimetral
        ? (y === 1 || y === 4 ? 'B' : 'V')          // zócalo y remate; cristalera
        : null;                                     // interior hueco
    if (y === 5) return e <= 0.88 ? 'G' : null;     // cubierta retranqueada
    return null;
}

/**
 * Talla el vano de entrada de la torre con rumbo [ux, uz] (cardinal hacia
 * FUERA del conjunto: las faldas vecinas casi se tocan y un vano hacia el
 * interior daría contra la pared de la torre de al lado): hueco de 3×3 a
 * través del grosor de la falda y puerta en la cara exterior.
 */
function abrirPuerta(capas, t, [ux, uz]) {
    const r = radioExt(t, 1);
    const px = Math.round(t.cx - 0.5 + ux * r), pz = Math.round(t.cz - 0.5 + uz * r);
    const fondoVano = Math.ceil(GROSOR) + 2; // atraviesa la pared de sobra
    for (let y = 1; y <= 3; y++) {
        for (let k = 0; k <= fondoVano; k++) {
            for (let dt = -1; dt <= 1; dt++) {
                const lx = px - ux * k + (uz ? dt : 0);
                const lz = pz - uz * k + (ux ? dt : 0);
                capas[y][lz][lx] = '.';
            }
        }
    }
    capas[1][pz][px] = 'D'; // estampar apila sola la hoja superior
}

function generar() {
    // capas[y][lz][lx] como arrays de chars; al final se unen en strings
    const capas = [];
    for (let y = 0; y < ALTO; y++) {
        const capa = [];
        for (let lz = 0; lz < FONDO; lz++) capa.push(new Array(ANCHO).fill('.'));
        capas.push(capa);
    }

    // podio primero; las faldas de las torres lo pisan al fundirse con él
    for (let y = 0; y < PODIO.alto; y++) {
        for (let lz = 0; lz < FONDO; lz++) {
            for (let lx = 0; lx < ANCHO; lx++) {
                const ch = celdaPodio(lx, lz, y);
                if (ch) capas[y][lz][lx] = ch;
            }
        }
    }

    for (const t of TORRES) {
        // losa de cimentación bajo la campana completa
        const rB = Math.ceil(t.rF * CAMPANA) + 1;
        for (let lz = Math.max(0, (t.cz | 0) - rB); lz <= Math.min(FONDO - 1, (t.cz | 0) + rB); lz++) {
            for (let lx = Math.max(0, (t.cx | 0) - rB); lx <= Math.min(ANCHO - 1, (t.cx | 0) + rB); lx++) {
                if (Math.hypot(lx + 0.5 - t.cx, lz + 0.5 - t.cz) <= radioExt(t, 0) + 0.3) {
                    capas[0][lz][lx] = 'P';
                }
                for (let y = 1; y < Math.min(ALTO, t.h); y++) {
                    const ch = celdaTorre(t, lx, lz, y);
                    if (ch) capas[y][lz][lx] = ch;
                }
            }
        }
        // balizas: cuatro antorchas cardinales sobre el filo del núcleo
        const rT = t.rF * 0.62 - 0.8;
        const yT = Math.min(ALTO - 1, Math.round(t.h * 0.94));
        for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const lx = Math.round(t.cx - 0.5 + ux * rT), lz = Math.round(t.cz - 0.5 + uz * rT);
            if (capas[yT - 1][lz][lx] !== '.') capas[yT][lz][lx] = 'T';
        }
    }

    // los vanos se tallan con las TRES torres ya pintadas: la falda de una
    // vecina puede invadir la entrada y tapiaría la puerta recién puesta;
    // cada torre abre hacia su lado despejado (oeste, frente y este)
    abrirPuerta(capas, TORRES[0], [-1, 0]);
    abrirPuerta(capas, TORRES[1], [0, -1]);
    abrirPuerta(capas, TORRES[2], [1, 0]);

    // puerta del podio: vano al frente, flanqueado por antorchas en la losa
    const lxP = PODIO.cx;
    let lzP = 0;
    while (lzP < FONDO && celdaPodio(lxP, lzP, 1) === null) lzP++;
    for (let y = 1; y <= 2; y++) {
        for (let dx = -1; dx <= 1; dx++) capas[y][lzP][lxP + dx] = '.';
    }
    capas[1][lzP][lxP] = 'D';
    capas[1][lzP - 1][lxP - 2] = 'T';
    capas[1][lzP - 1][lxP + 2] = 'T';

    return capas.map((capa) => capa.map((fila) => fila.join('')));
}

export const PLANO = {
    id: 'torres',
    tam: [ANCHO, ALTO, FONDO],
    clave: {
        P: 'STONE',    // cimentación y arranques macizos
        B: 'DIORITE',  // costillas blancas
        G: 'ANDESITE', // costillas grises y cubiertas
        V: 'GLASS',    // ventanales y cristalera del podio
        T: 'TORCH',
        D: 'DOOR_CLOSED',
    },
    capas: generar(),
};

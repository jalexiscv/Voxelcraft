/**
 * Geometría de mobs por partes-caja, al estilo de los modelos clásicos de
 * Minecraft. Sin DOM ni WebGL (probable en Node): produce arrays de vértices
 * con el layout estándar del motor [pos3, uv2, luz1].
 *
 * Unidades: PX (16 px = 1 bloque). El espacio de la entidad tiene el origen
 * en el centro de los pies, +Y arriba y el frente mirando a −Z (como la
 * cámara con yaw 0). Cada parte se define por:
 *
 *   { name, size:[sx,sy,sz], pivot:[x,y,z], origin:[ox,oy,oz], uv:[u,v],
 *     rot?:[rx,ry,rz], anim?:'none', inflate?:0 }
 *
 * - `pivot`: punto de rotación de la parte, en px del espacio de la entidad.
 * - `origin`: esquina mínima de la caja relativa al pivote, en px.
 * - `uv`: esquina superior-izquierda del desplegado en la piel (texels).
 * - `rot`: pose estática en radianes, aplicada antes de la animación.
 * - `anim`: animación aplicada por el render (ver ANIMS).
 * - `inflate`: engorda la caja n px por lado sin cambiar su desplegado UV
 *   (p. ej. la lana de la oveja sobre el cuerpo).
 *
 * Desplegado UV de una caja (sx,sy,sz) con esquina (u,v), v crece hacia abajo:
 *
 *            u     u+sz      u+sz+sx   u+sz+2sx  u+2sz+sx  u+2sz+2sx
 *   v        ·     [ARRIBA sx×sz][ABAJO sx×sz]
 *   v+sz     [+X sz×sy][−Z sx×sy][−X sz×sy]     [+Z sx×sy]
 *   v+sz+sy
 */

export const PX = 1 / 16;

/** Sombreado por cara, idéntico al del mesher de chunks. */
export const SHADE = { top: 1.0, bottom: 0.5, z: 0.8, x: 0.6 };

/** Animaciones que el render sabe aplicar a una parte. `rotor` es un giro
 *  CONTINUO alrededor de Y con el ángulo del fotograma (hélices del dron). */
export const ANIMS = ['none', 'leg0', 'leg1', 'arm0', 'arm1', 'legY0', 'legY1', 'head', 'flapL', 'flapR', 'rotor'];

const UV_INSET = 0.25; // texels hacia dentro: evita sangrado entre caras

/**
 * Rectángulos del desplegado UV de una parte (texels), en el orden
 * [arriba, abajo, +X, −Z, −X, +Z]. Los usa también el validador.
 */
export function partUVRects(part) {
    const [sx, sy, sz] = part.size;
    const [u, v] = part.uv;
    return [
        { x: u + sz, y: v, w: sx, h: sz },                    // arriba (+Y)
        { x: u + sz + sx, y: v, w: sx, h: sz },               // abajo (−Y)
        { x: u, y: v + sz, w: sz, h: sy },                    // +X
        { x: u + sz, y: v + sz, w: sx, h: sy },               // frente (−Z)
        { x: u + sz + sx, y: v + sz, w: sz, h: sy },          // −X
        { x: u + 2 * sz + sx, y: v + sz, w: sx, h: sy },      // espalda (+Z)
    ];
}

/** Caja alineada de la parte en px relativos al pivote (con inflado). */
export function partBox(part) {
    const inf = part.inflate || 0;
    const [ox, oy, oz] = part.origin;
    const [sx, sy, sz] = part.size;
    return {
        min: [ox - inf, oy - inf, oz - inf],
        max: [ox + sx + inf, oy + sy + inf, oz + sz + inf],
    };
}

/**
 * Construye la malla de una parte: Float32Array [pos3 (bloques, relativo al
 * pivote), uv2 (normalizadas), luz1]. 6 caras × 2 triángulos.
 *
 * `part.mirror` reproduce el espejado de texturas de Bedrock (bones con
 * `mirror: true`, p. ej. las patas derechas de la vaca vanilla): las caras
 * +X y −X intercambian sus rectángulos UV y todas las caras reflejan la U
 * dentro de su rectángulo. La geometría no cambia; sin mirror la salida es
 * idéntica byte a byte (los modelos propios no lo usan).
 */
export function buildPartMesh(part, skinW, skinH) {
    const { min: [x0, y0, z0], max: [x1, y1, z1] } = partBox(part);
    const [topR, botR, pxR, frontR, nxR, backR] = partUVRects(part);
    const mir = !!part.mirror;
    const out = [];

    /**
     * Emite una cara: `corners` son 4 posiciones (px) en el orden
     * arriba-izq, arriba-der, abajo-der, abajo-izq del rectángulo `r`.
     */
    const face = (corners, r, shade) => {
        const uA = r.x + UV_INSET, uB = r.x + r.w - UV_INSET;
        const us = mir ? [uB, uA, uA, uB] : [uA, uB, uB, uA];
        const vs = [r.y + UV_INSET, r.y + UV_INSET, r.y + r.h - UV_INSET, r.y + r.h - UV_INSET];
        for (const i of [0, 1, 2, 0, 2, 3]) {
            out.push(
                corners[i][0] * PX, corners[i][1] * PX, corners[i][2] * PX,
                us[i] / skinW, vs[i] / skinH, shade,
            );
        }
    };

    face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], topR, SHADE.top);      // +Y
    face([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], botR, SHADE.bottom);   // −Y
    face([[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], mir ? nxR : pxR, SHADE.x); // +X
    face([[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], frontR, SHADE.z);      // −Z
    face([[x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [x0, y0, z1]], mir ? pxR : nxR, SHADE.x); // −X
    face([[x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [x1, y0, z1]], backR, SHADE.z);       // +Z
    return new Float32Array(out);
}

/**
 * Construye el modelo completo de un mob: una entrada por parte con su malla
 * y los datos que el render necesita para animarla.
 */
export function buildModel(def) {
    return def.parts.map((p) => ({
        name: p.name,
        mesh: buildPartMesh(p, def.skin.w, def.skin.h),
        pivot: [p.pivot[0] * PX, p.pivot[1] * PX, p.pivot[2] * PX],
        rot: p.rot || null,
        anim: p.anim || 'none',
    }));
}

/**
 * Parser puro de geometrías Bedrock (.geo.json) al contrato de partes-caja
 * de js/mobs/model.js. Sin DOM, sin fetch, sin WebGL: recibe el objeto JSON
 * ya parseado y devuelve datos planos, por lo que es 100 % testeable en Node.
 *
 * IMPORTANTE (licencia): los .geo.json del resource pack oficial viven en
 * models/ y están en .gitignore; JAMÁS se copian al repo ni convertidos.
 * Este módulo solo transforma en runtime lo que exista en local como
 * override opcional (mismo patrón que sounds/ con js/soundpack.js). Los
 * modelos procedurales de js/mobs/*.js son el respaldo permanente.
 *
 * Formatos aceptados:
 * - 1.8 (el real en models/entity/ y models/mobs.json): claves
 *   `geometry.<nombre>` al nivel raíz, cada una con texturewidth /
 *   textureheight y bones[]. Una clave puede declarar herencia
 *   («geometry.hijo:geometry.padre»): se registra bajo el nombre del hijo
 *   y NO se resuelve la herencia (solo se convierten sus bones propios).
 * - 1.12: `minecraft:geometry` como array de { description, bones }. Solo
 *   se acepta el `uv` de caja ([u,v]); los cubes con uv por-cara (objeto)
 *   se saltan.
 *
 * Conversión bone → parte(s) de nuestro contrato:
 * - `origin` nuestro es RELATIVO al pivote: origin_geo − pivot_geo por eje
 *   (en el geo los cubes vienen ABSOLUTOS en px desde el suelo, ya en pose
 *   final). `pivot`, `size` y `uv` pasan tal cual.
 * - `bind_pose_rotation` (grados) → `rot` (radianes) con signo [−x, −y, +z]:
 *   la convención de giro de Bedrock invierte X e Y respecto a nuestras
 *   mat4RotateX/Y (verificado con el body de la vaca: [90,0,0] → −π/2 en X
 *   deja el cuerpo en y 12..22, igual que el modelo de la casa). El orden
 *   de aplicación Rz·Ry·Rx de mobrender.partMatrix coincide con Bedrock.
 * - `inflate` y `mirror` se propagan (del cube si lo trae, si no del bone).
 * - bones con `neverRender` o sin cubes se saltan; un bone con varios cubes
 *   produce varias partes (nombre_0, nombre_1…) que comparten
 *   pivot/rot/anim.
 *
 * LIMITACIÓN (jerarquía): asumimos la jerarquía vanilla de 1 nivel (body
 * raíz + miembros) con coordenadas ya en pose final, y `parent` se usa SOLO
 * para diagnosticar. En cadenas de 2+ niveles (p. ej. las puntas de ala del
 * murciélago colgando de las alas) la pose plana sigue siendo correcta,
 * pero la parte NO hereda la rotación ni la animación de su padre: esos
 * casos se anotan en `avisos` y se renderizan rígidos.
 *
 * Mapeo de animación por nombre de hueso (insensible a mayúsculas y
 * guiones bajos; convención de fases de la casa, ver js/mobs/cow.js y
 * js/mobs/zombie.js — «izquierda» de la casa = −X = «right» de Bedrock):
 *
 *   head, hat                     → head   (el hat sigue a la cabeza)
 *   leg0 / leg3 (cuadrúpedo)      → leg0   ─ pares diagonales: {trasera-izq,
 *   leg1 / leg2 (cuadrúpedo)      → leg1   ─ delantera-der} y {trasera-der,
 *                                            delantera-izq} (marcha diagonal,
 *                                            como la vaca de la casa)
 *   legN con N≥4 (araña…)         → leg0/leg1 por paridad de N
 *   *leg* con front/back + L/R    → diagonal: (front XOR left) → leg0
 *   leftleg (…+X)                 → leg1   ─ contrafase con el brazo del
 *   rightleg (…−X)                → leg0   ─ mismo lado, como el zombi
 *   leftarm (+X)                  → arm0
 *   rightarm (−X)                 → arm1
 *   rightwing, wing0 (−X)         → flapL  ─ como la gallina de la casa
 *   leftwing, wing1 (+X)          → flapR  ─ (ala_i en −X → flapL)
 *   body, tail y el resto         → none
 */

const DEG = Math.PI / 180;

/** Convierte grados Bedrock a radianes nuestros: [−x, −y, +z]. */
function convRot(gradosXYZ) {
    if (!Array.isArray(gradosXYZ)) return null;
    const [x, y, z] = gradosXYZ;
    if (!x && !y && !z) return null;
    // «|| 0» normaliza el −0 de invertir un cero (molesta en comparaciones)
    return [-x * DEG || 0, -y * DEG || 0, z * DEG || 0];
}

/**
 * Etiqueta de animación (catálogo ANIMS de model.js) para un nombre de
 * hueso Bedrock, según la tabla del docblock. Exportada para las pruebas.
 */
export function animForBone(nombre) {
    const n = String(nombre || '').toLowerCase().replace(/[_\s]/g, '');
    if (n === 'head' || n === 'hat') return 'head';

    // lado anatómico Bedrock: left = +X, right = −X («izq/der» de la casa
    // son del espectador, por eso right→*0/L y left→*1/R por posición)
    const lado = n.includes('left') ? 'l' : n.includes('right') ? 'r'
        : /(leg|arm|wing).*l$/.test(n) ? 'l' : /(leg|arm|wing).*r$/.test(n) ? 'r' : null;

    if (n.includes('wing')) {
        if (lado) return lado === 'r' ? 'flapL' : 'flapR';
        const m = /(\d+)$/.exec(n);
        return m && +m[1] % 2 ? 'flapR' : 'flapL'; // wing0 −X, wing1 +X
    }
    if (n.includes('arm')) {
        if (lado) return lado === 'l' ? 'arm0' : 'arm1';
        return 'none'; // brazo sin lado identificable: mejor rígido
    }
    if (n.includes('leg')) {
        const delante = n.includes('front');
        const detras = n.includes('back') || n.includes('hind') || n.includes('rear');
        if (lado && (delante || detras)) {
            // cuadrúpedo con nombres L/R: pares diagonales como la vaca
            return (delante !== (lado === 'l')) ? 'leg0' : 'leg1';
        }
        if (lado) return lado === 'r' ? 'leg0' : 'leg1'; // bípedo
        const m = /^leg(\d+)$/.exec(n);
        if (m) {
            const i = +m[1];
            if (i <= 3) return (i === 0 || i === 3) ? 'leg0' : 'leg1';
            return i % 2 ? 'leg1' : 'leg0'; // araña y demás multipatas
        }
    }
    return 'none';
}

/**
 * Convierte los bones de UNA geometría al contrato de model.js.
 * @returns {{texW:number, texH:number, partes:object[], avisos:string[]}}
 */
function convertirBones(bones, texW, texH) {
    const partes = [];
    const avisos = [];
    const porNombre = new Map();
    for (const b of bones || []) porNombre.set(String(b.name).toLowerCase(), b);

    for (const hueso of bones || []) {
        // Cadena de ancestros: en Bedrock un hijo hereda la rotación del
        // padre alrededor del pivote del padre (el cuello inclinado del
        // caballo arrastra cabeza, hocico y orejas). Al aplanar, esa
        // rotación se HORNEA en la parte: se acumulan las rotaciones
        // ancestrales y el pivote efectivo pasa a ser el del ancestro
        // rotado más cercano.
        let prof = 0, rotAncestral = null, pivotAncestral = null, ancestrosRotados = 0;
        for (let p = hueso; p && p.parent && prof < 8; prof++) {
            p = porNombre.get(String(p.parent).toLowerCase());
            const r = p && convRot(p.bind_pose_rotation || p.rotation);
            if (r) {
                ancestrosRotados++;
                if (!rotAncestral) {
                    rotAncestral = [r[0], r[1], r[2]];
                    pivotAncestral = p.pivot || [0, 0, 0];
                } else {
                    // varias rotaciones en la cadena: suma por eje (aprox.)
                    rotAncestral = rotAncestral.map((v, i) => v + r[i]);
                }
            }
        }
        if (hueso.neverRender || !Array.isArray(hueso.cubes) || !hueso.cubes.length) continue;
        if (prof >= 2 && !rotAncestral) {
            avisos.push(`hueso «${hueso.name}»: cadena de ${prof + 1} niveles; `
                + 'la pose plana es correcta pero no seguirá la animación del padre');
        }

        const pivotePropio = hueso.pivot || [0, 0, 0];
        const rotPropia = convRot(hueso.bind_pose_rotation || hueso.rotation);
        // pivote efectivo: el del ancestro rotado (si lo hay) para que la
        // rotación horneada gire la caja hacia su pose real
        const pivote = rotAncestral ? pivotAncestral : pivotePropio;
        let rot = rotPropia;
        if (rotAncestral) {
            rot = rotPropia ? rotPropia.map((v, i) => v + rotAncestral[i]) : rotAncestral;
            if (ancestrosRotados > 1 || (rotPropia
                && (pivotePropio[0] !== pivote[0] || pivotePropio[1] !== pivote[1] || pivotePropio[2] !== pivote[2]))) {
                avisos.push(`hueso «${hueso.name}»: rotaciones compuestas con pivotes `
                    + 'distintos; pose horneada aproximada (suma por eje)');
            }
        }
        const anim = animForBone(hueso.name);
        const varios = hueso.cubes.length > 1;

        hueso.cubes.forEach((cubo, i) => {
            if (!Array.isArray(cubo.origin) || !Array.isArray(cubo.size)) return;
            if (cubo.uv !== undefined && !Array.isArray(cubo.uv)) return; // uv por-cara (1.12): sin soporte
            const parte = {
                name: varios ? `${hueso.name}_${i}` : String(hueso.name),
                size: [cubo.size[0], cubo.size[1], cubo.size[2]],
                pivot: [pivote[0], pivote[1], pivote[2]],
                // el geo trae el origin ABSOLUTO (px desde el suelo); nuestro
                // contrato lo quiere relativo al pivote
                origin: [
                    cubo.origin[0] - pivote[0],
                    cubo.origin[1] - pivote[1],
                    cubo.origin[2] - pivote[2],
                ],
                uv: Array.isArray(cubo.uv) ? [cubo.uv[0], cubo.uv[1]] : [0, 0],
            };
            if (rot) parte.rot = rot;
            if (anim !== 'none') parte.anim = anim;
            const inf = cubo.inflate !== undefined ? cubo.inflate : hueso.inflate;
            if (inf) parte.inflate = inf;
            const esp = cubo.mirror !== undefined ? cubo.mirror : hueso.mirror;
            if (esp) parte.mirror = true;
            partes.push(parte);
        });
    }
    return { texW, texH, partes, avisos };
}

/**
 * Parsea el objeto de un .geo.json (una o varias geometrías) y devuelve un
 * mapa nombre → { texW, texH, partes, avisos }. El nombre es la clave del
 * geo tal cual («geometry.cow.v1.8»), sin el sufijo de herencia «:padre»;
 * en 1.12 es el description.identifier.
 */
export function parseGeo(json) {
    const geos = {};
    if (!json || typeof json !== 'object') return geos;

    // formato 1.8: claves geometry.<nombre> al nivel raíz
    for (const clave of Object.keys(json)) {
        if (!clave.startsWith('geometry.')) continue;
        const g = json[clave];
        if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
        const nombre = clave.split(':')[0]; // «hijo:padre» → hijo
        geos[nombre] = convertirBones(g.bones, g.texturewidth || 64, g.textureheight || 32);
    }

    // formato 1.12: minecraft:geometry = [{ description, bones }]
    const lista = json['minecraft:geometry'];
    if (Array.isArray(lista)) {
        for (const g of lista) {
            if (!g || typeof g !== 'object') continue;
            const d = g.description || {};
            geos[d.identifier || 'geometry'] =
                convertirBones(g.bones, d.texture_width || 64, d.texture_height || 32);
        }
    }
    return geos;
}

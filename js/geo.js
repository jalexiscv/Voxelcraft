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
 * Jerarquía: las coordenadas del geo vienen ABSOLUTAS y en pose final, y al
 * aplanar la parte hereda de sus ancestros dos cosas: (1) la `rotation` se
 * HORNEA (rot acumulada + pivote del ancestro rotado más cercano), y (2) un
 * hueso sin animación propia adopta la del ancestro animado más cercano —
 * el hocico, las orejas y la crin siguen a la cabeza del caballo — re-
 * anclando su pivote al de aquel cuando hace falta para girar rígido en
 * bloque. Solo queda rígida (con nota en `avisos`) la parte rotada cuyo
 * pivote no coincide con el del ancestro animado.
 *
 * Mapeo de animación por nombre de hueso (insensible a mayúsculas y
 * guiones bajos; convención de fases de la casa, ver js/mobs/cow.js y
 * js/mobs/zombie.js — «izquierda» de la casa = −X = «right» de Bedrock):
 *
 *   head, hat, neck               → head   (sombrero y cuello siguen la mirada)
 *   leg0 / leg3 (cuadrúpedo)      → leg0   ─ pares diagonales: {trasera-izq,
 *   leg1 / leg2 (cuadrúpedo)      → leg1   ─ delantera-der} y {trasera-der,
 *                                            delantera-izq} (marcha diagonal,
 *                                            como la vaca de la casa)
 *   legN con N≥4 (araña…)         → leg0/leg1 por paridad de N
 *   *leg* con front/back + L/R    → diagonal: (front XOR left) → leg0
 *   legFL/legBR ↔ legFR/legBL     → la misma diagonal con F/B compactos
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
    // el cuello acompaña la mirada: el conjunto cuello+cabeza gira en
    // bloque, como cuello/cabeza del caballo procedural de la casa
    if (n === 'head' || n === 'hat' || n === 'neck') return 'head';

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
        // nombres compactos de cuadrúpedo (LegFL, LegBR…): F/B + L/R en la
        // misma diagonal que los nombres largos — (front XOR left) → leg0
        const compacto = /^leg([fb])([lr])$/.exec(n);
        if (compacto) return ((compacto[1] === 'f') !== (compacto[2] === 'l')) ? 'leg0' : 'leg1';
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

    // pivote de una parte una vez horneada: el del ancestro con `rotation`
    // más cercano si lo hay (la rotación heredada gira alrededor de él), si
    // no el propio — es el pivote que un hijo debe compartir para heredar
    // la animación de ese hueso de forma rígida
    const pivoteHorneado = (hueso) => {
        let p = hueso;
        for (let i = 0; p && p.parent && i < 8; i++) {
            p = porNombre.get(String(p.parent).toLowerCase());
            if (p && convRot(p.rotation)) return p.pivot || [0, 0, 0];
        }
        return hueso.pivot || [0, 0, 0];
    };

    for (const hueso of bones || []) {
        // Cadena de ancestros: en Bedrock un hijo hereda la `rotation` del
        // padre alrededor del pivote del padre (el cuello inclinado del
        // caballo arrastra cabeza, hocico y orejas). Al aplanar, esa
        // rotación se HORNEA en la parte: se acumulan las rotaciones
        // ancestrales y el pivote efectivo pasa a ser el del ancestro
        // rotado más cercano. También se localiza el ancestro ANIMADO más
        // cercano para heredar su animación (ver abajo). OJO:
        // `bind_pose_rotation` (legacy 1.8, la vaca o la tortuga) NO se
        // hereda — solo posa el propio hueso; sus hijos ya traen las
        // coordenadas en pose final.
        let prof = 0, rotAncestral = null, pivotAncestral = null, ancestrosRotados = 0;
        let huesoAnimado = null, animHeredada = 'none';
        for (let p = hueso; p && p.parent && prof < 8; prof++) {
            p = porNombre.get(String(p.parent).toLowerCase());
            if (p && !huesoAnimado) {
                const a = animForBone(p.name);
                if (a !== 'none') { huesoAnimado = p; animHeredada = a; }
            }
            const r = p && convRot(p.rotation);
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

        const pivotePropio = hueso.pivot || [0, 0, 0];
        const rotPropia = convRot(hueso.bind_pose_rotation || hueso.rotation);
        // pivote efectivo: el del ancestro rotado (si lo hay) para que la
        // rotación horneada gire la caja hacia su pose real
        let pivote = rotAncestral ? pivotAncestral : pivotePropio;
        let rot = rotPropia;
        if (rotAncestral) {
            rot = rotPropia ? rotPropia.map((v, i) => v + rotAncestral[i]) : rotAncestral;
            if (ancestrosRotados > 1 || (rotPropia
                && (pivotePropio[0] !== pivote[0] || pivotePropio[1] !== pivote[1] || pivotePropio[2] !== pivote[2]))) {
                avisos.push(`hueso «${hueso.name}»: rotaciones compuestas con pivotes `
                    + 'distintos; pose horneada aproximada (suma por eje)');
            }
        }

        // Herencia de animación: un hueso sin animación propia acompaña al
        // ancestro animado más cercano (el hocico y las orejas siguen a la
        // cabeza; la punta de ala aletea con el ala). Para girar RÍGIDO en
        // bloque debe compartir el pivote de aquel: si ya coincide se hereda
        // tal cual, y si la parte no está rotada se re-ancla su pivote (la
        // pose estática no cambia: el origin es relativo al pivote). Solo
        // una parte rotada con pivote distinto queda rígida (aviso).
        let anim = animForBone(hueso.name);
        if (anim === 'none' && huesoAnimado) {
            const pivoteAnimado = pivoteHorneado(huesoAnimado);
            if (pivote[0] === pivoteAnimado[0] && pivote[1] === pivoteAnimado[1]
                && pivote[2] === pivoteAnimado[2]) {
                anim = animHeredada;
            } else if (!rot) {
                pivote = pivoteAnimado;
                anim = animHeredada;
            } else {
                avisos.push(`hueso «${hueso.name}»: rotado con pivote distinto al de `
                    + `«${huesoAnimado.name}»; no seguirá su animación (queda rígido)`);
            }
        }
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

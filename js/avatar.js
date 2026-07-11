/**
 * Avatar del jugador remoto (multijugador): humanoide clásico dibujado con
 * el pipeline de mobs (mobrender.buildType), igual que la cámara de
 * vigilancia y la lata. La geometría es la del zombi (proporciones Steve:
 * cabeza 8³, torso 8×12×4, extremidades 4×12×4) con pose de brazos caídos
 * y una piel propia: camiseta cian, vaqueros y pelo castaño.
 */

const PIEL = [224, 172, 132];        // tono de piel
const PIEL_OSCURA = [196, 144, 108]; // sombra bajo el pelo y nariz
const PELO = [54, 38, 26];           // castaño oscuro
const CAMISETA = [0, 148, 148];      // cian clásico
const CAMISETA_OSCURA = [0, 116, 116];
const PANTALON = [58, 66, 140];      // vaqueros
const ZAPATO = [88, 88, 88];         // gris
const OJO_BLANCO = [255, 255, 255];
const OJO_AZUL = [46, 60, 160];
const BOCA = [150, 96, 66];

export const JUGADOR_DEF = {
    id: 'jugador',
    name: 'Jugador',
    aabb: { w: 0.6, h: 1.8 },

    skin: { w: 64, h: 64 },

    /** Pinta la piel; solo importan los texels cubiertos por los UV. */
    paint(skin) {
        skin.fill(0, 0, 32, 16, PIEL, 9);             // cabeza
        skin.fill(8, 0, 8, 8, PELO, 8);               // tapa: pelo
        skin.fill(0, 8, 32, 3, PELO, 8);              // flequillo en las 4 caras
        skin.fill(0, 16, 16, 16, PANTALON, 8);        // pierna
        skin.fill(0, 29, 16, 3, ZAPATO, 7);           // zapatos
        skin.fill(16, 16, 24, 16, CAMISETA, 8);       // torso
        skin.fill(40, 16, 16, 16, PIEL, 9);           // brazo
        skin.fill(40, 20, 16, 2, CAMISETA, 8);        // manga corta

        // cara frontal de la cabeza: rect (8,8)..(16,16)
        skin.px(9, 11, OJO_BLANCO);
        skin.px(10, 11, OJO_AZUL);
        skin.px(13, 11, OJO_AZUL);
        skin.px(14, 11, OJO_BLANCO);
        skin.px(11, 12, PIEL_OSCURA);                 // nariz
        skin.px(12, 12, PIEL_OSCURA);
        skin.px(11, 14, BOCA);                        // boca
        skin.px(12, 14, BOCA);

        // arrugas de la camiseta
        skin.speckle(16, 16, 24, 16, 10, CAMISETA_OSCURA);
    },

    parts: [
        { name: 'cabeza', size: [8, 8, 8], pivot: [0, 24, 0], origin: [-4, 0, -4], uv: [0, 0], anim: 'head' },
        { name: 'torso', size: [8, 12, 4], pivot: [0, 12, 0], origin: [-4, 0, -2], uv: [16, 16] },
        // brazos caídos (sin la pose extendida del zombi): balancean al andar
        { name: 'brazo_i', size: [4, 12, 4], pivot: [-6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], anim: 'arm1' },
        { name: 'brazo_d', size: [4, 12, 4], pivot: [6, 22, 0], origin: [-2, -10, -2], uv: [40, 16], anim: 'arm0' },
        { name: 'pierna_i', size: [4, 12, 4], pivot: [-2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg0' },
        { name: 'pierna_d', size: [4, 12, 4], pivot: [2, 12, 0], origin: [-2, -12, -2], uv: [0, 16], anim: 'leg1' },
    ],
};

/**
 * Entidad-sombra de un jugador remoto con la forma mínima que mobrender
 * espera de un mob (def/pos/yaw/headYaw/animPhase/animSpeed/hurtT/fuseT).
 * La posición real llega por red a ~10 Hz; update() la interpola y anima
 * las piernas según la velocidad observada.
 */
export class JugadorRemoto {
    constructor(id, alias, pos, yaw) {
        this.id = id;
        this.alias = alias;
        this.def = JUGADOR_DEF;
        this.pos = [...pos];
        this.destino = [...pos];   // última posición recibida
        this.yaw = yaw || 0;
        this.destinoYaw = this.yaw;
        this.headYaw = this.yaw;
        this.pitch = 0;
        this.animPhase = 0;
        this.animSpeed = 0;
        this.hurtT = 0;
        this.fuseT = -1;
    }

    /** El renderer lo consulta en todo mob; un jugador remoto nunca «muere». */
    dying() { return false; }

    /** Nueva posición de red: se convierte en objetivo de interpolación. */
    fijar(p, yaw, pitch) {
        this.destino[0] = p[0]; this.destino[1] = p[1]; this.destino[2] = p[2];
        this.destinoYaw = yaw;
        this.pitch = pitch || 0;
    }

    update(dt) {
        // teletransporte (reaparición): saltos grandes no se interpolan
        const dx = this.destino[0] - this.pos[0];
        const dy = this.destino[1] - this.pos[1];
        const dz = this.destino[2] - this.pos[2];
        const d = Math.hypot(dx, dy, dz);
        if (d > 8) {
            this.pos = [...this.destino];
            this.animSpeed = 0;
        } else {
            const k = Math.min(1, dt * 12); // alcanza el objetivo en ~1/12 s
            this.pos[0] += dx * k; this.pos[1] += dy * k; this.pos[2] += dz * k;
            // velocidad observada → balanceo de piernas como los mobs
            this.animSpeed = Math.min(d * 10, 3);
        }
        this.animPhase += this.animSpeed * dt * 6;
        // el yaw gira por el camino corto (evita el latigazo en ±π)
        let dyaw = this.destinoYaw - this.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        this.yaw += dyaw * Math.min(1, dt * 12);
        this.headYaw = this.yaw;
        if (this.hurtT > 0) this.hurtT -= dt;
    }
}

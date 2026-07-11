<?php
/**
 * Recuperación de contraseña en dos pasos (tabla `recuperaciones`).
 *
 *  POST {accion:'solicitar', email}
 *      → genera un código de un solo uso (8 caracteres, caduca en 15 min),
 *        guarda su hash y lo envía al correo. La respuesta es SIEMPRE la
 *        misma exista o no la cuenta, para no revelar qué correos tienen
 *        cuenta. Sin correo configurado (XAMPP local) el código queda en
 *        `recuperaciones.log` fuera del docroot, junto a las partidas,
 *        para que el administrador pueda facilitarlo.
 *
 *  POST {accion:'restablecer', email, codigo, clave}
 *      → verifica el código (máximo 5 intentos) y cambia la contraseña.
 *        No abre sesión: el jugador entra después por login.php.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fallar('Usa POST.', 405);

/** Vida del código en segundos y pausa mínima entre solicitudes. */
const CODIGO_VIDA = 900;
const CODIGO_PAUSA = 60;
const CODIGO_INTENTOS_MAX = 5;

/** Código legible: sin 0/O ni 1/I/L, que se confunden al transcribirlo. */
function codigo_aleatorio(): string {
    $alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $codigo = '';
    for ($i = 0; $i < 8; $i++) {
        $codigo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    return $codigo;
}

/** Envía el código por correo; sin correo operativo lo deja en el log. */
function enviar_codigo(string $email, string $alias, string $codigo): void {
    $asunto = mb_encode_mimeheader('VoxelCraft: código de recuperación', 'UTF-8');
    $texto = "Hola $alias:\n\nTu código para restablecer la contraseña es: $codigo\n"
        . 'Caduca en ' . (CODIGO_VIDA / 60) . " minutos. Si no lo pediste, ignora este mensaje.\n";
    $cabeceras = "Content-Type: text/plain; charset=UTF-8\r\nFrom: VoxelCraft <no-responder@"
        . ($_SERVER['SERVER_NAME'] ?? 'localhost') . '>';
    if (@mail($email, $asunto, $texto, $cabeceras)) return;
    @file_put_contents(
        carpeta_datos() . DIRECTORY_SEPARATOR . 'recuperaciones.log',
        date('c') . " $email $codigo\n",
        FILE_APPEND
    );
}

$datos = cuerpo_json();
$accion = $datos['accion'] ?? '';
$email = strtolower(trim($datos['email'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    fallar('El email no es válido.');
}

$bd = bd();

if ($accion === 'solicitar') {
    $consulta = $bd->prepare('SELECT id, alias FROM usuarios WHERE email = ?');
    $consulta->execute([$email]);
    if ($usuario = $consulta->fetch()) {
        // con un código reciente aún vigente no se genera otro: acota el
        // ritmo de solicitudes sin delatar (por el mensaje) que la cuenta existe
        $vigente = $bd->prepare('SELECT caduca_en FROM recuperaciones WHERE usuario_id = ?');
        $vigente->execute([$usuario['id']]);
        $fila = $vigente->fetch();
        if (!$fila || (int)$fila['caduca_en'] - CODIGO_VIDA + CODIGO_PAUSA <= time()) {
            $codigo = codigo_aleatorio();
            $bd->prepare('REPLACE INTO recuperaciones (usuario_id, hash_codigo, caduca_en, intentos)
                VALUES (?, ?, ?, 0)')
                ->execute([$usuario['id'], password_hash($codigo, PASSWORD_DEFAULT), time() + CODIGO_VIDA]);
            enviar_codigo($email, $usuario['alias'], $codigo);
        }
    }
    responder(['mensaje' => 'Si el correo tiene cuenta, se le envió un código (caduca en 15 minutos).']);
}

if ($accion === 'restablecer') {
    $codigo = strtoupper(trim($datos['codigo'] ?? ''));
    $clave = (string)($datos['clave'] ?? '');
    if ($codigo === '') fallar('Falta el código.');
    if (strlen($clave) < 6) fallar('La contraseña debe tener al menos 6 caracteres.');

    $consulta = $bd->prepare('SELECT r.usuario_id, r.hash_codigo, r.caduca_en, r.intentos
        FROM recuperaciones r JOIN usuarios u ON u.id = r.usuario_id WHERE u.email = ?');
    $consulta->execute([$email]);
    $fila = $consulta->fetch();

    // mensaje único para todo fallo: no distinguir si el código no existe,
    // caducó, se agotó o simplemente no coincide
    $rechazo = 'Código incorrecto o caducado: pide uno nuevo.';
    if (!$fila || (int)$fila['caduca_en'] < time() || (int)$fila['intentos'] >= CODIGO_INTENTOS_MAX) {
        fallar($rechazo, 400);
    }
    if (!password_verify($codigo, $fila['hash_codigo'])) {
        $bd->prepare('UPDATE recuperaciones SET intentos = intentos + 1 WHERE usuario_id = ?')
            ->execute([$fila['usuario_id']]);
        fallar($rechazo, 400);
    }

    $bd->prepare('UPDATE usuarios SET hash_clave = ? WHERE id = ?')
        ->execute([password_hash($clave, PASSWORD_DEFAULT), $fila['usuario_id']]);
    $bd->prepare('DELETE FROM recuperaciones WHERE usuario_id = ?')->execute([$fila['usuario_id']]);
    responder(['mensaje' => 'Contraseña cambiada: ya puedes iniciar sesión.']);
}

fallar('Acción desconocida.');

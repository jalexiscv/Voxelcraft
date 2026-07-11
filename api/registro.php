<?php
/**
 * POST {alias, email, clave} → crea la cuenta e inicia sesión.
 * Respuesta: {usuario: {id, alias, email}}.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fallar('Usa POST.', 405);

$datos = cuerpo_json();
$alias = trim($datos['alias'] ?? '');
$email = strtolower(trim($datos['email'] ?? ''));
$clave = (string)($datos['clave'] ?? '');

if (!preg_match('/^[A-Za-z0-9_]{3,16}$/', $alias)) {
    fallar('El alias debe tener de 3 a 16 caracteres: letras, números o _.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    fallar('El email no es válido.');
}
if (strlen($clave) < 6) {
    fallar('La contraseña debe tener al menos 6 caracteres.');
}

$bd = bd();

// comprobación previa para dar un mensaje concreto (la restricción UNIQUE
// sigue siendo la garantía real contra duplicados simultáneos)
$consulta = $bd->prepare('SELECT alias, email FROM usuarios WHERE alias = ? OR email = ?');
$consulta->execute([$alias, $email]);
if ($existente = $consulta->fetch()) {
    fallar(strcasecmp($existente['alias'], $alias) === 0
        ? 'Ese alias ya está en uso.'
        : 'Ese email ya tiene una cuenta: inicia sesión.', 409);
}

try {
    $inserta = $bd->prepare('INSERT INTO usuarios (alias, email, hash_clave) VALUES (?, ?, ?)');
    $inserta->execute([$alias, $email, password_hash($clave, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    // carrera contra otro registro simultáneo con el mismo alias/email
    fallar('Ese alias o email ya está en uso.', 409);
}

$id = (int)$bd->lastInsertId();
abrir_sesion($id);
responder(['usuario' => ['id' => $id, 'alias' => $alias, 'email' => $email]], 201);

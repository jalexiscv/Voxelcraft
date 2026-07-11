<?php
/**
 * POST {usuario, clave} → inicia sesión. `usuario` admite alias o email.
 * Respuesta: {usuario: {id, alias, email}}.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fallar('Usa POST.', 405);

$datos = cuerpo_json();
$quien = trim($datos['usuario'] ?? '');
$clave = (string)($datos['clave'] ?? '');
if ($quien === '' || $clave === '') fallar('Faltan el usuario o la contraseña.');

$consulta = bd()->prepare(
    'SELECT id, alias, email, hash_clave FROM usuarios WHERE alias = ? OR email = ?'
);
$consulta->execute([$quien, strtolower($quien)]);
$usuario = $consulta->fetch();

if (!$usuario || !password_verify($clave, $usuario['hash_clave'])) {
    // mensaje único: no revelar si el fallo fue el usuario o la contraseña
    fallar('Usuario o contraseña incorrectos.', 401);
}

abrir_sesion((int)$usuario['id']);
responder(['usuario' => [
    'id' => (int)$usuario['id'],
    'alias' => $usuario['alias'],
    'email' => $usuario['email'],
]]);

<?php
/** POST → cierra la sesión actual. Respuesta: {ok: true}. */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fallar('Usa POST.', 405);

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', $p['secure'] ?? false, true);
}
session_destroy();
responder(['ok' => true]);

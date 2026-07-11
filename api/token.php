<?php
/**
 * GET → token de acceso al servidor multijugador (requiere sesión).
 *
 * Formato "id.alias.exp.firma" con firma HMAC-SHA256 sobre "id.alias.exp"
 * usando el secreto compartido: el servidor Node lo verifica leyendo el
 * mismo archivo, sin necesidad de consultar MySQL. Caduca en 5 minutos
 * (solo cubre el apretón de manos del WebSocket, no la partida entera).
 */
require __DIR__ . '/config.php';

$usuario = exigir_sesion();
$exp = time() + 300;
$carga = $usuario['id'] . '.' . $usuario['alias'] . '.' . $exp;
$firma = hash_hmac('sha256', $carga, secreto_compartido());
responder(['token' => $carga . '.' . $firma]);

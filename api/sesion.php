<?php
/**
 * GET → quién está conectado y si tiene partida guardada en línea.
 * Respuesta: {usuario: {...}|null, partida: {guardadoEn}|null}.
 */
require __DIR__ . '/config.php';

$usuario = usuario_actual();
$partida = null;
if ($usuario !== null) {
    $consulta = bd()->prepare('SELECT guardado_en FROM partidas WHERE usuario_id = ?');
    $consulta->execute([$usuario['id']]);
    if ($fila = $consulta->fetch()) {
        $partida = ['guardadoEn' => (int)$fila['guardado_en']];
    }
}
responder(['usuario' => $usuario, 'partida' => $partida]);

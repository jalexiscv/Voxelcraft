<?php
/**
 * Guardado en línea (un slot por usuario; requiere sesión).
 *
 * El binario vive en un archivo por usuario (PARTIDAS_DIR, fuera del
 * docroot); la tabla `partidas` solo guarda los metadatos. Nadie puede
 * descargar un guardado sin pasar por aquí con su sesión.
 *
 *  POST → escribe el cuerpo crudo tal cual llega (el navegador lo manda ya
 *         comprimido con gzip; con la cabecera 'X-Comprimido: no' se acepta
 *         JSON plano de navegadores sin CompressionStream) de forma atómica
 *         (temporal + rename). 'X-Guardado-En' trae el sello (ms).
 *  GET  → devuelve esos mismos bytes como application/octet-stream con
 *         'X-Comprimido' y 'X-Guardado-En'; 404 si no hay partida.
 */
require __DIR__ . '/config.php';

$usuario = exigir_sesion();
$bd = bd();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datos = file_get_contents('php://input');
    if ($datos === '' || $datos === false) fallar('La partida llegó vacía.');
    if (strlen($datos) > PARTIDA_MAX_BYTES) fallar('La partida supera los 16 MB.', 413);

    $comprimido = strtolower($_SERVER['HTTP_X_COMPRIMIDO'] ?? 'si') !== 'no';
    $guardadoEn = (int)($_SERVER['HTTP_X_GUARDADO_EN'] ?? 0);
    if ($guardadoEn <= 0) $guardadoEn = (int)(microtime(true) * 1000);

    // archivo primero, BD después: si la BD fallara quedaría un archivo más
    // nuevo que su sello, nunca un sello que apunte a datos inexistentes
    $destino = ruta_partida((int)$usuario['id']);
    $tmp = $destino . '.tmp';
    if (file_put_contents($tmp, $datos) !== strlen($datos)) {
        @unlink($tmp);
        fallar('No se pudo escribir el archivo de la partida.', 500);
    }
    // rename es atómico en el mismo volumen; en Windows puede negarse a
    // pisar el destino, de ahí el segundo intento tras retirarlo
    if (!@rename($tmp, $destino)) {
        @unlink($destino);
        if (!@rename($tmp, $destino)) {
            @unlink($tmp);
            fallar('No se pudo reemplazar el archivo de la partida.', 500);
        }
    }

    $guarda = $bd->prepare('INSERT INTO partidas (usuario_id, comprimido, bytes, guardado_en)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE comprimido = VALUES(comprimido), bytes = VALUES(bytes),
                                guardado_en = VALUES(guardado_en)');
    $guarda->execute([$usuario['id'], $comprimido ? 1 : 0, strlen($datos), $guardadoEn]);

    responder(['ok' => true, 'bytes' => strlen($datos), 'guardadoEn' => $guardadoEn]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $consulta = $bd->prepare('SELECT comprimido, guardado_en FROM partidas WHERE usuario_id = ?');
    $consulta->execute([$usuario['id']]);
    $fila = $consulta->fetch();
    $ruta = ruta_partida((int)$usuario['id']);
    if (!$fila || !is_file($ruta)) {
        // fila sin archivo (borrado a mano): se retira para volver a un
        // estado coherente y el cliente lo trata como «sin partida»
        if ($fila) $bd->prepare('DELETE FROM partidas WHERE usuario_id = ?')->execute([$usuario['id']]);
        fallar('No hay ninguna partida guardada.', 404);
    }

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($ruta));
    header('X-Comprimido: ' . ($fila['comprimido'] ? 'si' : 'no'));
    header('X-Guardado-En: ' . $fila['guardado_en']);
    readfile($ruta);
    exit;
}

fallar('Usa GET o POST.', 405);

<?php
// Endpoint para consultar la última posición GPS registrada
// Método: GET
// Retorna: JSON con la última ubicación almacenada

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Use GET.']);
    exit();
}

// Ruta del archivo de última posición
$archivo_ultima = '../data/ultima_posicion.json';

// Verificar si existe el archivo
if (!file_exists($archivo_ultima)) {
    http_response_code(404);
    echo json_encode([
        'error' => 'No hay datos de ubicación disponibles',
        'mensaje' => 'Aún no se ha recibido ninguna ubicación'
    ]);
    exit();
}

// Leer y retornar la última posición
$contenido = file_get_contents($archivo_ultima);
$ultima_posicion = json_decode($contenido, true);

// Verificar que el archivo contiene datos válidos
if ($ultima_posicion === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al leer datos de ubicación']);
    exit();
}

// Agregar información adicional
$respuesta = $ultima_posicion;
$respuesta['tiempo_transcurrido'] = time() - strtotime($ultima_posicion['timestamp_servidor']);
$respuesta['estado'] = $respuesta['tiempo_transcurrido'] < 300 ? 'activo' : 'inactivo'; // 5 minutos

// Retornar la última posición
http_response_code(200);
echo json_encode($respuesta, JSON_PRETTY_PRINT);
?>
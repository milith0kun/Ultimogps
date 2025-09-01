<?php
// Endpoint para recibir datos de ubicación GPS desde la app Android
// Método: POST
// Formato: JSON {"latitud": float, "longitud": float, "timestamp": string}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Use POST.']);
    exit();
}

// Obtener datos JSON del cuerpo de la petición
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validar que se recibieron datos JSON válidos
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido']);
    exit();
}

// Validar campos requeridos (compatibilidad con app Android)
if (!isset($data['lat']) || !isset($data['lon']) || !isset($data['timestamp'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Campos requeridos: lat, lon, timestamp']);
    exit();
}

// Validar tipos de datos
if (!is_numeric($data['lat']) || !is_numeric($data['lon'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Latitud y longitud deben ser números']);
    exit();
}

// Validar rangos de coordenadas
if ($data['lat'] < -90 || $data['lat'] > 90) {
    http_response_code(400);
    echo json_encode(['error' => 'Latitud debe estar entre -90 y 90']);
    exit();
}

if ($data['lon'] < -180 || $data['lon'] > 180) {
    http_response_code(400);
    echo json_encode(['error' => 'Longitud debe estar entre -180 y 180']);
    exit();
}

// Preparar datos para almacenar (incluyendo campos adicionales de Android)
$ubicacion = [
    'latitud' => floatval($data['lat']),
    'longitud' => floatval($data['lon']),
    'timestamp' => $data['timestamp'],
    'timestamp_servidor' => date('Y-m-d H:i:s'),
    'ip_origen' => $_SERVER['REMOTE_ADDR'] ?? 'desconocida',
    'accuracy' => isset($data['accuracy']) ? floatval($data['accuracy']) : null,
    'battery' => isset($data['battery']) ? intval($data['battery']) : null,
    'device_id' => isset($data['device_id']) ? $data['device_id'] : null,
    'speed' => isset($data['speed']) ? floatval($data['speed']) : null,
    'bearing' => isset($data['bearing']) ? floatval($data['bearing']) : null,
    'altitude' => isset($data['altitude']) ? floatval($data['altitude']) : null
];

// Ruta del archivo de datos
$archivo_datos = '../data/ubicaciones.json';
$archivo_ultima = '../data/ultima_posicion.json';

// Crear directorio data si no existe
if (!file_exists('../data')) {
    mkdir('../data', 0755, true);
}

// Leer ubicaciones existentes
$ubicaciones = [];
if (file_exists($archivo_datos)) {
    $contenido = file_get_contents($archivo_datos);
    $ubicaciones = json_decode($contenido, true) ?? [];
}

// Agregar nueva ubicación
$ubicaciones[] = $ubicacion;

// Mantener solo las últimas 1000 ubicaciones para evitar archivos muy grandes
if (count($ubicaciones) > 1000) {
    $ubicaciones = array_slice($ubicaciones, -1000);
}

// Guardar todas las ubicaciones
if (file_put_contents($archivo_datos, json_encode($ubicaciones, JSON_PRETTY_PRINT)) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar datos']);
    exit();
}

// Guardar última posición
if (file_put_contents($archivo_ultima, json_encode($ubicacion, JSON_PRETTY_PRINT)) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar última posición']);
    exit();
}

// Respuesta exitosa
http_response_code(200);
echo json_encode([
    'success' => true,
    'mensaje' => 'Ubicación recibida y almacenada correctamente',
    'timestamp_servidor' => $ubicacion['timestamp_servidor']
]);
?>
<?php
// Configuración del Sistema de Rastreo GPS
// Este archivo contiene las configuraciones principales del sistema

// Configuración de la base de datos (si se decide migrar a BD en el futuro)
define('DB_HOST', 'localhost');
define('DB_NAME', 'gps_tracker');
define('DB_USER', 'gps_user');
define('DB_PASS', 'secure_password');

// Configuración del sistema
define('MAX_UBICACIONES', 1000);           // Máximo número de ubicaciones a mantener
define('TIEMPO_INACTIVO', 300);            // Tiempo en segundos para considerar inactivo (5 min)
define('INTERVALO_LIMPIEZA', 86400);       // Intervalo de limpieza en segundos (24 horas)
define('DIAS_RETENCION', 30);              // Días de retención de datos históricos

// Configuración de seguridad
define('API_KEY_REQUIRED', false);         // Requerir API key para endpoints
define('ALLOWED_IPS', []);                 // IPs permitidas (vacío = todas)
define('RATE_LIMIT_REQUESTS', 100);        // Máximo requests por IP por hora
define('DEBUG_MODE', false);               // Modo debug (solo para desarrollo)

// Configuración de archivos
define('DATA_DIR', __DIR__ . '/data/');
define('LOG_DIR', __DIR__ . '/logs/');
define('UBICACIONES_FILE', DATA_DIR . 'ubicaciones.json');
define('ULTIMA_POSICION_FILE', DATA_DIR . 'ultima_posicion.json');
define('LOG_FILE', LOG_DIR . 'gps_tracker.log');

// Configuración de validación
define('MIN_LATITUD', -90.0);
define('MAX_LATITUD', 90.0);
define('MIN_LONGITUD', -180.0);
define('MAX_LONGITUD', 180.0);
define('PRECISION_COORDENADAS', 6);        // Decimales de precisión

// Configuración de respuestas HTTP
define('HTTP_SUCCESS', 200);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_UNAUTHORIZED', 401);
define('HTTP_NOT_FOUND', 404);
define('HTTP_METHOD_NOT_ALLOWED', 405);
define('HTTP_INTERNAL_ERROR', 500);

// Configuración de zona horaria
date_default_timezone_set('America/Bogota');

// Configuración de errores
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_FILE);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_FILE);
}

// Función para logging
function logMessage($level, $message) {
    if (!file_exists(LOG_DIR)) {
        mkdir(LOG_DIR, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

// Función para validar API key (si está habilitada)
function validateApiKey($apiKey) {
    if (!API_KEY_REQUIRED) {
        return true;
    }
    
    // Aquí implementar validación de API key
    // Por ejemplo, comparar con una lista de keys válidas
    $validKeys = [
        'gps_app_key_2025',
        'mobile_tracker_key'
    ];
    
    return in_array($apiKey, $validKeys);
}

// Función para validar IP
function validateIP($ip) {
    if (empty(ALLOWED_IPS)) {
        return true;
    }
    
    return in_array($ip, ALLOWED_IPS);
}

// Función para rate limiting básico
function checkRateLimit($ip) {
    $rateLimitFile = DATA_DIR . 'rate_limit.json';
    $currentTime = time();
    $hourAgo = $currentTime - 3600;
    
    // Leer datos de rate limit existentes
    $rateLimitData = [];
    if (file_exists($rateLimitFile)) {
        $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?? [];
    }
    
    // Limpiar entradas antiguas
    foreach ($rateLimitData as $checkIp => $requests) {
        $rateLimitData[$checkIp] = array_filter($requests, function($timestamp) use ($hourAgo) {
            return $timestamp > $hourAgo;
        });
        
        if (empty($rateLimitData[$checkIp])) {
            unset($rateLimitData[$checkIp]);
        }
    }
    
    // Verificar límite para la IP actual
    if (!isset($rateLimitData[$ip])) {
        $rateLimitData[$ip] = [];
    }
    
    if (count($rateLimitData[$ip]) >= RATE_LIMIT_REQUESTS) {
        return false;
    }
    
    // Agregar request actual
    $rateLimitData[$ip][] = $currentTime;
    
    // Guardar datos actualizados
    file_put_contents($rateLimitFile, json_encode($rateLimitData));
    
    return true;
}

// Función para limpiar datos antiguos
function cleanOldData() {
    $ubicacionesFile = UBICACIONES_FILE;
    
    if (!file_exists($ubicacionesFile)) {
        return;
    }
    
    $ubicaciones = json_decode(file_get_contents($ubicacionesFile), true) ?? [];
    $cutoffTime = time() - (DIAS_RETENCION * 24 * 3600);
    
    $ubicacionesFiltradas = array_filter($ubicaciones, function($ubicacion) use ($cutoffTime) {
        $timestamp = strtotime($ubicacion['timestamp_servidor']);
        return $timestamp > $cutoffTime;
    });
    
    // Mantener solo las últimas MAX_UBICACIONES
    if (count($ubicacionesFiltradas) > MAX_UBICACIONES) {
        $ubicacionesFiltradas = array_slice($ubicacionesFiltradas, -MAX_UBICACIONES);
    }
    
    file_put_contents($ubicacionesFile, json_encode($ubicacionesFiltradas, JSON_PRETTY_PRINT));
    
    logMessage('INFO', 'Limpieza de datos completada. Ubicaciones restantes: ' . count($ubicacionesFiltradas));
}

// Función para obtener información del sistema
function getSystemInfo() {
    return [
        'version' => '1.0.0',
        'php_version' => PHP_VERSION,
        'server_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get(),
        'debug_mode' => DEBUG_MODE,
        'max_ubicaciones' => MAX_UBICACIONES,
        'tiempo_inactivo' => TIEMPO_INACTIVO,
        'data_directory' => DATA_DIR,
        'log_directory' => LOG_DIR
    ];
}

// Inicialización
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

// Log de inicio del sistema
logMessage('INFO', 'Sistema GPS Tracker inicializado');

?>
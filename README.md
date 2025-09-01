# 🌍 Servidor Web GPS - Sistema de Rastreo en Tiempo Real

Sistema completo para rastrear ubicaciones GPS desde una aplicación Android y mostrarlas en tiempo real en una página web con Google Maps.

## 📋 Componentes del Sistema

### 1. **Backend PHP (Servidor Web)**
- **Endpoint de recepción**: `/api/posicion.php` - Recibe datos GPS via POST
- **Endpoint de consulta**: `/api/posicion_ultima.json.php` - Retorna última posición via GET
- **Almacenamiento**: Archivos JSON en carpeta `/data/`
- **Validaciones**: Coordenadas, tipos de datos, rangos geográficos

### 2. **Frontend Web**
- **Mapa interactivo**: Google Maps JavaScript API
- **Actualización automática**: Configurable (5s - 1min)
- **Interfaz responsive**: Compatible con móviles y escritorio
- **Panel de información**: Coordenadas, timestamps, estado de conexión

### 3. **Configuración Apache**
- **CORS habilitado**: Para comunicación cross-origin
- **Compresión**: Optimización de archivos estáticos
- **Seguridad**: Protección contra inyecciones
- **URLs amigables**: Redirecciones automáticas

## 🚀 Instalación y Configuración

### Requisitos del Servidor
- **SO**: Ubuntu 20.04 o superior
- **Servidor Web**: Apache 2.x
- **PHP**: 7.4+ o 8.x
- **Módulos Apache**: mod_rewrite, mod_headers, mod_deflate
- **SSL**: Certificado HTTPS (Let's Encrypt recomendado)

### Pasos de Instalación

1. **Subir archivos al servidor**
   ```bash
   # Copiar todos los archivos al directorio web
   sudo cp -r ServidorWebGps/* /var/www/html/
   ```

2. **Configurar permisos**
   ```bash
   # Dar permisos de escritura a la carpeta data
   sudo chown -R www-data:www-data /var/www/html/data/
   sudo chmod -R 755 /var/www/html/data/
   ```

3. **Habilitar módulos Apache**
   ```bash
   sudo a2enmod rewrite
   sudo a2enmod headers
   sudo a2enmod deflate
   sudo systemctl restart apache2
   ```

4. **Configurar Google Maps API**
   - Obtener clave API en [Google Cloud Console](https://console.cloud.google.com/)
   - Habilitar "Maps JavaScript API"
   - Reemplazar `YOUR_API_KEY` en `index.html`

5. **Configurar Firewall (AWS EC2)**
   ```bash
   # Abrir puertos HTTP y HTTPS
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## 📱 Integración con App Android

### Formato de Datos para Envío (POST)
```json
{
    "latitud": -34.6037,
    "longitud": -58.3816,
    "timestamp": "2025-01-09T15:30:00Z"
}
```

### Endpoint de Envío
```
POST https://tu-servidor.com/api/posicion.php
Content-Type: application/json
```

### Respuesta del Servidor
```json
{
    "success": true,
    "mensaje": "Ubicación recibida y almacenada correctamente",
    "timestamp_servidor": "2025-01-09 15:30:15"
}
```

## 🔍 API Endpoints

### 1. Recibir Ubicación GPS
- **URL**: `/api/posicion.php`
- **Método**: POST
- **Content-Type**: application/json
- **Parámetros**:
  - `latitud` (float): -90 a 90
  - `longitud` (float): -180 a 180
  - `timestamp` (string): ISO 8601 format

### 2. Consultar Última Posición
- **URL**: `/api/posicion_ultima.json.php` o `/api/posicion_ultima.json`
- **Método**: GET
- **Respuesta**:
```json
{
    "latitud": -34.6037,
    "longitud": -58.3816,
    "timestamp": "2025-01-09T15:30:00Z",
    "timestamp_servidor": "2025-01-09 15:30:15",
    "ip_origen": "192.168.1.100",
    "tiempo_transcurrido": 45,
    "estado": "activo"
}
```

## 🛡️ Seguridad

### Implementadas
- ✅ Validación de datos de entrada
- ✅ Protección contra inyección SQL
- ✅ Filtrado de caracteres especiales
- ✅ Límites de tamaño de archivos
- ✅ CORS configurado
- ✅ Headers de seguridad

### Recomendaciones Adicionales
- 🔐 Implementar autenticación API (tokens)
- 🔐 Usar HTTPS obligatorio
- 🔐 Configurar rate limiting
- 🔐 Monitorear logs de acceso
- 🔐 Backup automático de datos

## 📊 Estructura de Archivos

```
ServidorWebGps/
├── index.html              # Página principal
├── .htaccess              # Configuración Apache
├── README.md              # Documentación
├── api/
│   ├── posicion.php       # Endpoint recepción GPS
│   └── posicion_ultima.json.php  # Endpoint consulta
├── css/
│   └── styles.css         # Estilos de la interfaz
├── js/
│   └── app.js            # Lógica del frontend
└── data/                  # Almacenamiento (auto-creado)
    ├── ubicaciones.json   # Historial de ubicaciones
    └── ultima_posicion.json  # Última posición
```

## 🔧 Configuración Avanzada

### Variables de Entorno
Crear archivo `config.php` (opcional):
```php
<?php
// Configuración del sistema
define('MAX_UBICACIONES', 1000);
define('TIEMPO_INACTIVO', 300); // 5 minutos
define('DEBUG_MODE', false);
?>
```

### Personalización del Mapa
En `js/app.js`, modificar:
```javascript
// Ubicación por defecto
const defaultLocation = { lat: TU_LAT, lng: TU_LNG };

// Intervalo de actualización
this.updateInterval = 15000; // milisegundos
```

## 📈 Monitoreo y Mantenimiento

### Logs de Apache
```bash
# Ver logs de acceso
sudo tail -f /var/log/apache2/access.log

# Ver logs de errores
sudo tail -f /var/log/apache2/error.log
```

### Limpieza de Datos
```bash
# Script para limpiar datos antiguos (cron job)
#!/bin/bash
find /var/www/html/data/ -name "*.json" -mtime +30 -delete
```

### Backup Automático
```bash
# Backup diario de datos
0 2 * * * tar -czf /backup/gps-data-$(date +\%Y\%m\%d).tar.gz /var/www/html/data/
```

## 🐛 Solución de Problemas

### Error: "No hay datos de ubicación"
- Verificar que la app Android esté enviando datos
- Comprobar permisos de escritura en `/data/`
- Revisar logs de PHP para errores

### Error: Google Maps no carga
- Verificar clave API en `index.html`
- Comprobar que "Maps JavaScript API" esté habilitada
- Revisar restricciones de dominio en Google Cloud

### Error: CORS
- Verificar configuración en `.htaccess`
- Comprobar que `mod_headers` esté habilitado
- Revisar configuración de Apache

## 📞 Soporte

Para reportar problemas o solicitar funcionalidades:
1. Revisar logs del servidor
2. Verificar configuración de red
3. Comprobar permisos de archivos
4. Validar formato de datos enviados

---

**Desarrollado para sistemas embebidos y monitoreo GPS en tiempo real**

*Versión 1.0 - Enero 2025*
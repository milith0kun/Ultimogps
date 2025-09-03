const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

// Configuración del servidor
const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Servir archivos estáticos desde la raíz del proyecto

// Estructura para almacenar múltiples dispositivos y sus ubicaciones
let dispositivos = new Map(); // Map<deviceId, {info, ultimaUbicacion}>
let ultimaUbicacion = null; // Mantener compatibilidad con versión anterior

// Colores predefinidos para dispositivos
const coloresDispositivos = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

// Limpiar datos residuales al iniciar
console.log('ðŸ§¹ Limpiando datos residuales...');

// Crear servidor HTTP
const server = require('http').createServer(app);

// Configurar WebSocket Server
const wss = new WebSocket.Server({ server });

// Lista de clientes WebSocket conectados
const clientes = new Set();

// Manejar conexiones WebSocket
wss.on('connection', (ws) => {
    console.log('🔗 Nuevo cliente WebSocket conectado');
    clientes.add(ws);
    
    // Enviar la lista completa de dispositivos al cliente recién conectado
    if (dispositivos.size > 0) {
        ws.send(JSON.stringify({
            tipo: 'dispositivos',
            datos: Array.from(dispositivos.values())
        }));
    }
    
    // Enviar la última ubicación al cliente recién conectado (compatibilidad)
    if (ultimaUbicacion) {
        ws.send(JSON.stringify({
            tipo: 'ubicacion',
            datos: ultimaUbicacion
        }));
    }
    
    // Manejar desconexión
    ws.on('close', () => {
        console.log('❌ Cliente WebSocket desconectado');
        clientes.delete(ws);
    });
    
    // Manejar errores
    ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
        clientes.delete(ws);
    });
});

// Función para enviar datos a todos los clientes WebSocket
function enviarATodosLosClientes(datos, tipo = 'ubicacion') {
    const mensaje = JSON.stringify({
        tipo: tipo,
        datos: datos
    });
    
    clientes.forEach((cliente) => {
        if (cliente.readyState === WebSocket.OPEN) {
            cliente.send(mensaje);
        }
    });
}

// Función para obtener o crear un dispositivo
function obtenerOCrearDispositivo(deviceId, userAgent) {
    if (!dispositivos.has(deviceId)) {
        const nuevoDispositivo = {
            id: deviceId,
            nombre: `Dispositivo ${deviceId}`,
            color: coloresDispositivos[dispositivos.size % coloresDispositivos.length],
            userAgent: userAgent,
            creado: new Date().toISOString(),
            activo: true,
            ultimaUbicacion: null
        };
        dispositivos.set(deviceId, nuevoDispositivo);
        
        // Notificar a todos los clientes sobre el nuevo dispositivo
        enviarATodosLosClientes(Array.from(dispositivos.values()), 'dispositivos');
        
        console.log(`📱 Nuevo dispositivo registrado: ${deviceId}`);
    }
    return dispositivos.get(deviceId);
}

// ENDPOINTS DE LA API

// Endpoint para recibir ubicación desde la app Android
app.post('/api/ubicacion', (req, res) => {
    try {
        const { lat, lon, accuracy, timestamp, deviceId } = req.body;
        
        // InformaciÃ³n sobre el origen de la peticiÃ³n
        const clienteInfo = {
            ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
            userAgent: req.get('User-Agent') || 'No especificado',
            origen: req.get('Origin') || 'No especificado',
            referer: req.get('Referer') || 'No especificado'
        };
        
        // Filtrar peticiones que no sean de la aplicaciÃ³n Android
        if (!clienteInfo.userAgent.includes('okhttp') && 
            !clienteInfo.userAgent.includes('Android') && 
            clienteInfo.userAgent === 'No especificado') {
            console.log('ðŸš« PeticiÃ³n rechazada - No es de aplicaciÃ³n Android:', clienteInfo);
            return res.status(403).json({
                error: 'Solo se aceptan datos de la aplicaciÃ³n Android'
            });
        }
        
        // Validar datos recibidos
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            return res.status(400).json({
                error: 'Latitud y longitud deben ser nÃºmeros'
            });
        }
        
        // Obtener o crear dispositivo (usar IP como deviceId por defecto si no se proporciona)
        const dispositivoId = deviceId || clienteInfo.ip;
        const dispositivo = obtenerOCrearDispositivo(dispositivoId, clienteInfo.userAgent);
        
        // Crear objeto de ubicación
        const nuevaUbicacion = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            accuracy: parseFloat(accuracy) || 0,
            timestamp: timestamp || new Date().toISOString(),
            recibido: new Date().toISOString(),
            deviceId: dispositivoId
        };
        
        // Actualizar ubicación del dispositivo
        dispositivo.ultimaUbicacion = nuevaUbicacion;
        dispositivo.ultimaActividad = new Date().toISOString();
        
        // Mantener compatibilidad: guardar como última ubicación general
        ultimaUbicacion = nuevaUbicacion;
        
        // Enviar ubicación específica del dispositivo a todos los clientes
        enviarATodosLosClientes({
            deviceId: dispositivoId,
            ubicacion: nuevaUbicacion,
            dispositivo: {
                id: dispositivo.id,
                nombre: dispositivo.nombre,
                color: dispositivo.color
            }
        }, 'ubicacion_dispositivo');
        
        console.log('ðŸ“ Nueva ubicaciÃ³n recibida:', {
            lat: nuevaUbicacion.lat,
            lon: nuevaUbicacion.lon,
            accuracy: nuevaUbicacion.accuracy,
            clientes: clientes.size,
            cliente: clienteInfo
        });
        
        res.status(200).json({
            mensaje: 'UbicaciÃ³n recibida correctamente',
            ubicacion: nuevaUbicacion
        });
        
    } catch (error) {
        console.error('Error al procesar ubicaciÃ³n:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para obtener la Ãºltima ubicaciÃ³n
app.get('/api/ubicacion/ultima', (req, res) => {
    if (ultimaUbicacion) {
        res.status(200).json(ultimaUbicacion);
    } else {
        res.status(404).json({
            mensaje: 'No hay ubicaciones disponibles'
        });
    }
});

// Endpoint para obtener todos los dispositivos
app.get('/api/dispositivos', (req, res) => {
    const dispositivosArray = Array.from(dispositivos.values());
    res.json({
        dispositivos: dispositivosArray,
        total: dispositivosArray.length
    });
});

// Endpoint para obtener un dispositivo específico
app.get('/api/dispositivos/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const dispositivo = dispositivos.get(deviceId);
    
    if (dispositivo) {
        res.json(dispositivo);
    } else {
        res.status(404).json({
            error: 'Dispositivo no encontrado'
        });
    }
});

// Endpoint para actualizar información de un dispositivo
app.put('/api/dispositivos/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const { nombre, activo } = req.body;
    const dispositivo = dispositivos.get(deviceId);
    
    if (dispositivo) {
        if (nombre) dispositivo.nombre = nombre;
        if (typeof activo === 'boolean') dispositivo.activo = activo;
        
        // Notificar cambios a todos los clientes
        enviarATodosLosClientes(Array.from(dispositivos.values()), 'dispositivos');
        
        res.json(dispositivo);
    } else {
        res.status(404).json({
            error: 'Dispositivo no encontrado'
        });
    }
});

// Endpoint para obtener ubicaciones de todos los dispositivos activos
app.get('/api/ubicaciones', (req, res) => {
    const ubicaciones = [];
    
    dispositivos.forEach((dispositivo) => {
        if (dispositivo.activo && dispositivo.ultimaUbicacion) {
            ubicaciones.push({
                deviceId: dispositivo.id,
                nombre: dispositivo.nombre,
                color: dispositivo.color,
                ubicacion: dispositivo.ultimaUbicacion
            });
        }
    });
    
    res.json({
        ubicaciones: ubicaciones,
        total: ubicaciones.length
    });
});

// Endpoint para obtener estadÃ­sticas del servidor
app.get('/api/stats', (req, res) => {
    res.json({
        clientesConectados: clientes.size,
        totalDispositivos: dispositivos.size,
        dispositivosActivos: Array.from(dispositivos.values()).filter(d => d.activo).length,
        ultimaUbicacion: ultimaUbicacion ? {
            timestamp: ultimaUbicacion.timestamp,
            recibido: ultimaUbicacion.recibido,
            deviceId: ultimaUbicacion.deviceId
        } : null,
        servidor: {
            puerto: PORT,
            iniciado: new Date().toISOString()
        }
    });
});





// Servir la pÃ¡gina web principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado'
    });
});

// Iniciar el servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor GPS Tracking iniciado');
    console.log(`📡 Servidor HTTP en puerto ${PORT}`);
    console.log(`🌐 WebSocket Server activo en puerto ${PORT}`);
    console.log(`🔗 Accede a http://localhost${PORT === 80 ? '' : ':' + PORT} para ver el mapa`);
    console.log(`🔗 Accede a http://3.19.27.29${PORT === 80 ? '' : ':' + PORT} para acceso desde AWS EC2`);
    console.log('ðŸ“± Endpoint para Android: POST /api/ubicacion');
    console.log('ðŸ—ºï¸  Endpoint para web: GET /api/ubicacion/ultima');
    console.log('ðŸŒ IP PÃºblica AWS: 3.19.27.29');
});

// Manejar cierre graceful del servidor
process.on('SIGTERM', () => {
    console.log('ðŸ›‘ Cerrando servidor...');
    server.close(() => {
        console.log('âœ… Servidor cerrado correctamente');
    });
});
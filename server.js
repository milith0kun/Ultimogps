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

// Variable para almacenar la Ãºltima ubicaciÃ³n en memoria
let ultimaUbicacion = null;

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
    console.log('ðŸ”— Nuevo cliente WebSocket conectado');
    clientes.add(ws);
    
    // Enviar la Ãºltima ubicaciÃ³n al cliente reciÃ©n conectado
    if (ultimaUbicacion) {
        ws.send(JSON.stringify({
            tipo: 'ubicacion',
            datos: ultimaUbicacion
        }));
    }
    
    // Manejar desconexiÃ³n
    ws.on('close', () => {
        console.log('âŒ Cliente WebSocket desconectado');
        clientes.delete(ws);
    });
    
    // Manejar errores
    ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
        clientes.delete(ws);
    });
});

// FunciÃ³n para enviar datos a todos los clientes WebSocket
function enviarATodosLosClientes(datos) {
    const mensaje = JSON.stringify({
        tipo: 'ubicacion',
        datos: datos
    });
    
    clientes.forEach((cliente) => {
        if (cliente.readyState === WebSocket.OPEN) {
            cliente.send(mensaje);
        }
    });
}

// ENDPOINTS DE LA API

// Endpoint para recibir ubicaciÃ³n desde la app Android
app.post('/api/ubicacion', (req, res) => {
    try {
        const { lat, lon, accuracy, timestamp } = req.body;
        
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
        
        // Crear objeto de ubicaciÃ³n
        const nuevaUbicacion = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            accuracy: parseFloat(accuracy) || 0,
            timestamp: timestamp || new Date().toISOString(),
            recibido: new Date().toISOString()
        };
        
        // Guardar como Ãºltima ubicaciÃ³n
        ultimaUbicacion = nuevaUbicacion;
        
        // Enviar a todos los clientes WebSocket conectados
        enviarATodosLosClientes(nuevaUbicacion);
        
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

// Endpoint para obtener estadÃ­sticas del servidor
app.get('/api/stats', (req, res) => {
    res.json({
        clientesConectados: clientes.size,
        ultimaUbicacion: ultimaUbicacion ? {
            timestamp: ultimaUbicacion.timestamp,
            recibido: ultimaUbicacion.recibido
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
    console.log(`🔗 Accede a http://18.188.7.21${PORT === 80 ? '' : ':' + PORT} para acceso desde AWS EC2`);
    console.log('ðŸ“± Endpoint para Android: POST /api/ubicacion');
    console.log('ðŸ—ºï¸  Endpoint para web: GET /api/ubicacion/ultima');
    console.log('ðŸŒ IP PÃºblica AWS: 18.188.7.21');
});

// Manejar cierre graceful del servidor
process.on('SIGTERM', () => {
    console.log('ðŸ›‘ Cerrando servidor...');
    server.close(() => {
        console.log('âœ… Servidor cerrado correctamente');
    });
});
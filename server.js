const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(__dirname));

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para recibir datos de ubicación desde la app Android
app.post('/api/location', (req, res) => {
    try {
        const { latitude, longitude, timestamp, deviceId } = req.body;
        
        // Validar datos recibidos
        if (!latitude || !longitude || !timestamp || !deviceId) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos: latitude, longitude, timestamp, deviceId' 
            });
        }

        // Crear objeto de ubicación
        const locationData = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            timestamp: timestamp,
            deviceId: deviceId,
            receivedAt: new Date().toISOString()
        };

        // Guardar en archivo JSON (para desarrollo local)
        const dataFile = path.join(__dirname, 'api', 'posicion_ultima.json');
        
        // Crear directorio api si no existe
        const apiDir = path.join(__dirname, 'api');
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }

        // Escribir datos al archivo
        fs.writeFileSync(dataFile, JSON.stringify(locationData, null, 2));

        console.log('📍 Nueva ubicación recibida:', locationData);
        
        res.json({ 
            success: true, 
            message: 'Ubicación guardada correctamente',
            data: locationData
        });
        
    } catch (error) {
        console.error('❌ Error al procesar ubicación:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Endpoint para obtener la última ubicación
app.get('/api/location', (req, res) => {
    try {
        const dataFile = path.join(__dirname, 'api', 'posicion_ultima.json');
        
        if (fs.existsSync(dataFile)) {
            const data = fs.readFileSync(dataFile, 'utf8');
            const locationData = JSON.parse(data);
            res.json(locationData);
        } else {
            res.status(404).json({ 
                error: 'No hay datos de ubicación disponibles' 
            });
        }
    } catch (error) {
        console.error('❌ Error al obtener ubicación:', error);
        res.status(500).json({ 
            error: 'Error al leer datos de ubicación',
            details: error.message 
        });
    }
});

// Endpoint de salud del servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor GPS iniciado en http://localhost:${PORT}`);
    console.log(`📱 Endpoint para Android: http://localhost:${PORT}/api/location`);
    console.log(`🌐 Interfaz web: http://localhost:${PORT}`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});
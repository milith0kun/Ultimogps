/**
 * Configuración de entornos para el sistema GPS
 * Permite cambiar fácilmente entre configuración local y AWS
 */

const CONFIG = {
    // Configuración para desarrollo local
    LOCAL: {
        name: 'Local Development',
        serverUrl: 'http://localhost:8000',
        apiUrl: 'http://localhost:8000/api',
        websiteUrl: 'http://localhost:8000',
        androidApiUrl: 'http://10.0.2.2:8000/api/posicion.php', // Para emulador Android
        androidApiUrlDevice: 'http://192.168.1.100:8000/api/posicion.php', // Para dispositivo real (cambiar IP)
        description: 'Configuración para servidor local Node.js'
    },
    
    // Configuración para AWS EC2
    AWS: {
        name: 'AWS EC2 Production',
        serverUrl: 'http://3.131.110.151/ServidorWebGps',
        apiUrl: 'http://3.131.110.151/ServidorWebGps/api',
        websiteUrl: 'http://3.131.110.151/ServidorWebGps',
        androidApiUrl: 'http://3.131.110.151/ServidorWebGps/api/posicion.php',
        description: 'Configuración para servidor AWS EC2 en producción'
    }
};

// Configuración activa (cambiar entre 'LOCAL' o 'AWS')
const ACTIVE_CONFIG = 'LOCAL'; // Cambiar a 'AWS' para usar servidor en la nube

// Obtener configuración activa
function getActiveConfig() {
    return CONFIG[ACTIVE_CONFIG];
}

// Función para cambiar configuración dinámicamente
function setActiveConfig(environment) {
    if (CONFIG[environment]) {
        window.ACTIVE_CONFIG = environment;
        console.log(`Configuración cambiada a: ${CONFIG[environment].name}`);
        return CONFIG[environment];
    } else {
        console.error(`Configuración '${environment}' no encontrada`);
        return null;
    }
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getActiveConfig, setActiveConfig };
}

// Hacer disponible globalmente en el navegador
if (typeof window !== 'undefined') {
    window.GPS_CONFIG = CONFIG;
    window.getActiveConfig = getActiveConfig;
    window.setActiveConfig = setActiveConfig;
    window.ACTIVE_CONFIG = ACTIVE_CONFIG;
}

console.log('Configuración GPS cargada:', getActiveConfig());
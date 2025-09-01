// Aplicación de Rastreador GPS en Tiempo Real
// Maneja la interfaz de Google Maps y comunicación con el servidor

class GPSTracker {
    constructor() {
        this.map = null;
        this.marker = null;
        this.updateInterval = 15000; // 15 segundos por defecto
        this.autoUpdate = true;
        this.intervalId = null;
        this.lastPosition = null;
        this.config = null;
        
        this.loadConfiguration();
        this.initializeEventListeners();
    }
    
    // Cargar configuración de entorno
    loadConfiguration() {
        if (typeof getActiveConfig === 'function') {
            this.config = getActiveConfig();
            console.log('Configuración cargada:', this.config);
            
            // Mostrar configuración activa en la UI
            const activeConfigElement = document.getElementById('active-config');
            if (activeConfigElement) {
                activeConfigElement.textContent = this.config.name;
            }
        } else {
            console.warn('Configuración de entorno no disponible, usando valores por defecto');
            this.config = {
                name: 'Local Default',
                apiUrl: 'http://localhost/ServidorWebGps/api'
            };
        }
    }

    // Inicializar el mapa de Google Maps
    initMap() {
        // Configuración inicial del mapa (centrado en una ubicación por defecto)
        const defaultLocation = { lat: 4.6097, lng: -74.0817 }; // Bogotá, Colombia
        
        this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: defaultLocation,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    featureType: 'all',
                    elementType: 'geometry.fill',
                    stylers: [{ saturation: -40 }]
                },
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#3498db' }]
                }
            ]
        });

        // Crear marcador inicial
        this.marker = new google.maps.Marker({
            position: defaultLocation,
            map: this.map,
            title: 'Ubicación GPS',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                `),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 40)
            }
        });

        // Ventana de información
        this.infoWindow = new google.maps.InfoWindow();
        
        // Cargar última posición al inicializar
        this.fetchLastPosition();
        
        // Iniciar actualización automática
        this.startAutoUpdate();
    }

    // Configurar event listeners
    initializeEventListeners() {
        // Botón centrar
        document.getElementById('center-btn').addEventListener('click', () => {
            this.centerMapOnLastPosition();
        });

        // Botón actualizar
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.fetchLastPosition();
        });

        // Botón toggle auto-actualización
        document.getElementById('toggle-auto').addEventListener('click', () => {
            this.toggleAutoUpdate();
        });

        // Selector de intervalo
        document.getElementById('update-interval').addEventListener('change', (e) => {
            this.updateInterval = parseInt(e.target.value);
            if (this.autoUpdate) {
                this.restartAutoUpdate();
            }
        });
    }

    // Obtener última posición del servidor
    async fetchLastPosition() {
        try {
            this.showLoading(true);
            
            const apiUrl = this.config ? `${this.config.apiUrl}/posicion_ultima.json.php` : 'api/posicion_ultima.json.php';
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                this.updateStatus('offline', data.mensaje || data.error);
                return;
            }

            this.lastPosition = data;
            this.updateMap(data);
            this.updateUI(data);
            this.updateStatus('online', 'Conectado');
            
        } catch (error) {
            console.error('Error al obtener posición:', error);
            this.updateStatus('offline', 'Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    // Actualizar mapa con nueva posición
    updateMap(position) {
        if (!this.map || !this.marker) return;

        const location = {
            lat: parseFloat(position.lat),
            lng: parseFloat(position.lon)
        };

        // Actualizar posición del marcador
        this.marker.setPosition(location);
        
        // Centrar mapa en la nueva posición
        this.map.setCenter(location);

        // Actualizar ventana de información
        const infoContent = `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50;">📍 Ubicación Actual</h3>
                <p><strong>Coordenadas:</strong><br>
                   Lat: ${position.lat}<br>
                   Lng: ${position.lon}</p>
                <p><strong>Última actualización:</strong><br>
                   ${this.formatDateTime(position.timestamp)}</p>
                <p><strong>Estado:</strong> 
                   <span style="color: ${position.estado === 'activo' ? '#27ae60' : '#e74c3c'}">
                       ${position.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                   </span>
                </p>
            </div>
        `;
        
        this.infoWindow.setContent(infoContent);
        
        // Mostrar ventana de información al hacer clic en el marcador
        this.marker.addListener('click', () => {
            this.infoWindow.open(this.map, this.marker);
        });
    }

    // Actualizar interfaz de usuario
    updateUI(position) {
        // Actualizar coordenadas en la barra de estado
        document.getElementById('coordinates').textContent = 
            `${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`;
        
        // Actualizar última actualización
        document.getElementById('last-update').textContent = 
            this.formatDateTime(position.timestamp);

        // Actualizar panel de información
        document.getElementById('latitude').textContent = position.lat.toFixed(6);
        document.getElementById('longitude').textContent = position.lon.toFixed(6);
        document.getElementById('device-time').textContent = 
            this.formatDateTime(position.timestamp);
        document.getElementById('server-time').textContent = 
            this.formatDateTime(position.timestamp);
        document.getElementById('origin-ip').textContent = 
            position.device_id || 'No disponible';
        document.getElementById('elapsed-time').textContent = 
            this.formatElapsedTime(Math.floor(Date.now() / 1000) - position.timestamp);
    }

    // Actualizar estado de conexión
    updateStatus(status, message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status-value ${status}`;
    }

    // Centrar mapa en última posición
    centerMapOnLastPosition() {
        if (this.lastPosition && this.map) {
            const location = {
                lat: parseFloat(this.lastPosition.latitud),
                lng: parseFloat(this.lastPosition.longitud)
            };
            this.map.setCenter(location);
            this.map.setZoom(15);
        }
    }

    // Toggle actualización automática
    toggleAutoUpdate() {
        this.autoUpdate = !this.autoUpdate;
        const button = document.getElementById('toggle-auto');
        
        if (this.autoUpdate) {
            button.classList.add('active');
            button.textContent = '⏱️ Auto';
            this.startAutoUpdate();
        } else {
            button.classList.remove('active');
            button.textContent = '⏸️ Manual';
            this.stopAutoUpdate();
        }
    }

    // Iniciar actualización automática
    startAutoUpdate() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.intervalId = setInterval(() => {
            this.fetchLastPosition();
        }, this.updateInterval);
    }

    // Detener actualización automática
    stopAutoUpdate() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Reiniciar actualización automática
    restartAutoUpdate() {
        this.stopAutoUpdate();
        if (this.autoUpdate) {
            this.startAutoUpdate();
        }
    }

    // Mostrar/ocultar indicador de carga
    showLoading(show) {
        const refreshBtn = document.getElementById('refresh-btn');
        if (show) {
            refreshBtn.innerHTML = '<div class="loading"></div> Cargando...';
            refreshBtn.disabled = true;
        } else {
            refreshBtn.innerHTML = '🔄 Actualizar';
            refreshBtn.disabled = false;
        }
    }

    // Formatear fecha y hora
    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Formatear tiempo transcurrido
    formatElapsedTime(seconds) {
        if (seconds < 60) {
            return `${seconds} segundos`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} hora${hours !== 1 ? 's' : ''} ${minutes} min`;
        }
    }
}

// Instancia global del tracker
let gpsTracker;

// Función requerida por Google Maps API
function initMap() {
    gpsTracker = new GPSTracker();
    gpsTracker.initMap();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Si Google Maps ya está cargado, inicializar inmediatamente
    if (typeof google !== 'undefined' && google.maps) {
        initMap();
    }
    
    // Manejar errores de carga de Google Maps
    window.addEventListener('error', function(e) {
        if (e.message.includes('Google Maps')) {
            console.error('Error cargando Google Maps API');
            document.getElementById('map').innerHTML = 
                '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px;">' +
                '<div>' +
                '<h3>⚠️ Error al cargar Google Maps</h3>' +
                '<p>Por favor, verifica tu clave API de Google Maps</p>' +
                '<p>Reemplaza "YOUR_API_KEY" en index.html con tu clave válida</p>' +
                '</div>' +
                '</div>';
        }
    });
});

// Exportar para uso global
window.initMap = initMap;
window.gpsTracker = gpsTracker;
// Google Maps API Key Configuration
// Para obtener una API key gratuita:
// 1. Ve a: https://console.cloud.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Habilita la API de "Maps JavaScript API"
// 4. Ve a "Credenciales" y crea una API key
// 5. Restringe la key a tu dominio para mayor seguridad

export const GOOGLE_MAPS_API_KEY = 'AIzaSyBIwzALxUUNxYBdgGY7MoCNW_1DGdFhF-4'; // API key de desarrollo

// Configuración de Google Maps
export const MAP_CONFIG = {
  // Centro de República Dominicana
  center: { lat: 18.7357, lng: -70.1627 },
  zoom: 8,
  
  // Estilos del mapa (opcional)
  mapStyles: [
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }]
    }
  ],
  
  // Configuración de marcadores
  markerConfig: {
    defaultIcon: {
      path: 'M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2M12,6A3,3 0 0,1 15,9A3,3 0 0,1 12,12A3,3 0 0,1 9,9A3,3 0 0,1 12,6Z',
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 8
    }
  }
};

// Colores por tipo de intervención
export const INTERVENTION_COLORS = {
  'Bacheo': '#FF6B6B',
  'Asfaltado': '#4ECDC4',
  'Canalización': '#45B7D1',
  'Señalización': '#96CEB4',
  'Construcción': '#FFEAA7',
  'Reparación': '#DDA0DD',
  'Mantenimiento': '#98D8C8',
  'default': '#74B9FF'
};
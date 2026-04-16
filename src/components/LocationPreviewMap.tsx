import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { municipioCoordinates, RD_CENTER } from '../services/municipioCoordinates';

// Fix default icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface LocationPreviewMapProps {
  provincia?: string;
  municipio?: string;
  distrito?: string;
}

// Componente helper para actualizar el centro del mapa
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  
  return null;
};

const LocationPreviewMap: React.FC<LocationPreviewMapProps> = ({ provincia, municipio, distrito }) => {
  const [center, setCenter] = useState<[number, number]>([RD_CENTER.lat, RD_CENTER.lng]);
  const [zoom, setZoom] = useState(8);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    // Determinar qué ubicación mostrar (prioridad: distrito > municipio > provincia)
    let coords = null;
    let name = '';
    let zoomLevel = 8;

    if (distrito && municipioCoordinates[distrito]) {
      coords = municipioCoordinates[distrito];
      name = distrito;
      zoomLevel = 13;
    } else if (municipio && municipioCoordinates[municipio]) {
      coords = municipioCoordinates[municipio];
      name = municipio;
      zoomLevel = 11;
    } else if (provincia && municipioCoordinates[provincia]) {
      coords = municipioCoordinates[provincia];
      name = provincia;
      zoomLevel = 9;
    }

    if (coords) {
      setCenter([coords.lat, coords.lng]);
      setZoom(zoomLevel);
      setLocationName(name);
    } else {
      // Volver al centro de RD si no hay selección
      setCenter([RD_CENTER.lat, RD_CENTER.lng]);
      setZoom(8);
      setLocationName('');
    }
  }, [provincia, municipio, distrito]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      borderRadius: '12px', 
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '2px solid #FF7A00'
    }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} zoom={zoom} />
        
        {locationName && (
          <Marker position={center}>
            <Popup>
              <div style={{ 
                fontFamily: 'Arial, sans-serif', 
                padding: '8px',
                textAlign: 'center'
              }}>
                <strong style={{ fontSize: '14px', color: '#FF7A00' }}>
                  📍 {locationName}
                </strong>
                <br />
                <span style={{ fontSize: '11px', color: '#666' }}>
                  Vista previa de ubicación
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {!locationName && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px 30px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
            Seleccione una ubicación
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            El mapa se actualizará automáticamente
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPreviewMap;

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configurar iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Intervention {
  id: number;
  timestamp: string;
  region: string;
  provincia: string;
  distrito: string;
  municipio: string;
  sector: string;
  tipoIntervencion: string;
  usuario: string;
  latitud?: number;
  longitud?: number;
  [key: string]: any;
}

interface LeafletMapViewProps {
  user: any;
  onBack: () => void;
}

// Coordenadas de República Dominicana por municipios principales
const municipioCoordinates: Record<string, { lat: number; lng: number }> = {
  // Distrito Nacional
  'Santo Domingo': { lat: 18.4861, lng: -69.9312 },
  'Distrito Nacional': { lat: 18.4861, lng: -69.9312 },
  
  // Santiago
  'Santiago': { lat: 19.4517, lng: -70.6970 },
  'Santiago de los Caballeros': { lat: 19.4517, lng: -70.6970 },
  'Tamboril': { lat: 19.4833, lng: -70.6167 },
  'Villa González': { lat: 19.5333, lng: -70.7833 },
  'Licey al Medio': { lat: 19.4167, lng: -70.5833 },
  
  // La Vega
  'La Vega': { lat: 19.2167, lng: -70.5167 },
  'Constanza': { lat: 18.9167, lng: -70.7500 },
  'Jarabacoa': { lat: 19.1167, lng: -70.6333 },
  
  // Puerto Plata
  'Puerto Plata': { lat: 19.7833, lng: -70.6833 },
  'Altamira': { lat: 19.6833, lng: -70.8667 },
  'Luperón': { lat: 19.8833, lng: -70.9500 },
  
  // San Cristóbal
  'San Cristóbal': { lat: 18.4167, lng: -70.1000 },
  'Bajos de Haina': { lat: 18.4167, lng: -70.0333 },
  'Villa Altagracia': { lat: 18.6833, lng: -70.1667 },
  
  // La Romana
  'La Romana': { lat: 18.4270, lng: -68.9728 },
  'Villa Hermosa': { lat: 18.4833, lng: -69.0167 },
  'Guaymate': { lat: 18.3833, lng: -68.9167 },
  
  // San Pedro de Macorís
  'San Pedro de Macorís': { lat: 18.4539, lng: -69.3078 },
  'Los Llanos': { lat: 18.4833, lng: -69.2833 },
  'Ramón Santana': { lat: 18.4167, lng: -69.3667 },
  
  // Barahona
  'Barahona': { lat: 18.2086, lng: -71.1010 },
  'Cabral': { lat: 18.2667, lng: -71.2167 },
  'Enriquillo': { lat: 17.9333, lng: -71.2667 },
  
  // Azua
  'Azua': { lat: 18.4531, lng: -70.7347 },
  'Padre Las Casas': { lat: 18.7333, lng: -71.2000 },
  'Sabana Yegua': { lat: 18.6167, lng: -70.9333 },
  
  // Peravia
  'Baní': { lat: 18.2794, lng: -70.3314 },
  'Nizao': { lat: 18.2333, lng: -70.4333 },
  'Matanzas': { lat: 18.3000, lng: -70.2833 },
  
  // Monte Cristi
  'Monte Cristi': { lat: 19.8419, lng: -71.6454 },
  'Castañuelas': { lat: 19.6833, lng: -71.3333 },
  'Guayubín': { lat: 19.6167, lng: -71.3333 },
  
  // Valverde
  'Mao': { lat: 19.5531, lng: -71.0781 },
  'Esperanza': { lat: 19.6333, lng: -70.9833 },
  'Laguna Salada': { lat: 19.6833, lng: -71.1333 },
  
  // Dajabón
  'Dajabón': { lat: 19.5486, lng: -71.7083 },
  'Loma de Cabrera': { lat: 19.4333, lng: -71.5833 },
  'Partido': { lat: 19.5167, lng: -71.6833 },
  
  // Santiago Rodríguez
  'San Ignacio de Sabaneta': { lat: 19.3833, lng: -71.3500 },
  'Villa Los Almácigos': { lat: 19.4167, lng: -71.2833 },
  'Monción': { lat: 19.4667, lng: -71.1667 },
  
  // Elías Piña
  'Comendador': { lat: 18.8833, lng: -71.7000 },
  'Bánica': { lat: 18.9667, lng: -71.3500 },
  'Pedro Santana': { lat: 18.9333, lng: -71.4667 },
  
  // San Juan
  'San Juan de la Maguana': { lat: 18.8061, lng: -71.2297 },
  'Las Matas de Farfán': { lat: 18.8833, lng: -71.5167 },
  'Juan de Herrera': { lat: 18.7667, lng: -71.1833 },
  
  // Independencia
  'Jimaní': { lat: 18.5028, lng: -71.8597 },
  'Duvergé': { lat: 18.3667, lng: -71.5167 },
  'Postrer Río': { lat: 18.5667, lng: -71.7833 },
  
  // Baoruco
  'Neiba': { lat: 18.4822, lng: -71.4186 },
  'Galván': { lat: 18.5167, lng: -71.3333 },
  'Tamayo': { lat: 18.2833, lng: -71.1000 },
  
  // Pedernales
  'Pedernales': { lat: 18.0167, lng: -71.7333 },
  'Oviedo': { lat: 17.8000, lng: -71.4167 },
  
  // Espaillat
  'Moca': { lat: 19.3944, lng: -70.5256 },
  'San Francisco de Macorís': { lat: 19.3011, lng: -70.2525 },
  'Cayetano Germosén': { lat: 19.2333, lng: -70.3667 },
  
  // Duarte
  'Villa Francisca': { lat: 19.2833, lng: -70.2167 },
  'Arenoso': { lat: 19.1833, lng: -70.1833 },
  'Castillo': { lat: 19.2167, lng: -70.0833 },
  
  // Salcedo
  'Salcedo': { lat: 19.3775, lng: -70.4172 },
  'Tenares': { lat: 19.4167, lng: -70.3333 },
  'Villa Tapia': { lat: 19.3333, lng: -70.3667 },
  
  // Sánchez Ramírez
  'Cotuí': { lat: 19.0531, lng: -70.1492 },
  'Cevicos': { lat: 19.0000, lng: -70.0167 },
  'Fantino': { lat: 19.1167, lng: -70.3000 },
  
  // Monseñor Nouel
  'Bonao': { lat: 18.9369, lng: -70.4089 },
  'Maimón': { lat: 18.9167, lng: -70.3667 },
  'Piedra Blanca': { lat: 18.8833, lng: -70.3167 },
  
  // Monte Plata
  'Monte Plata': { lat: 18.8072, lng: -69.7844 },
  'Sabana Grande de Boyá': { lat: 18.9500, lng: -69.7833 },
  'Peralvillo': { lat: 18.6667, lng: -69.7167 },
  
  // Hato Mayor
  'Hato Mayor del Rey': { lat: 18.7667, lng: -69.2667 },
  'Sabana de la Mar': { lat: 19.0500, lng: -69.4167 },
  'El Valle': { lat: 18.7833, lng: -69.1833 },
  
  // El Seibo
  'El Seibo': { lat: 18.7644, lng: -69.0386 },
  'Miches': { lat: 18.9833, lng: -69.0500 },
  
  // María Trinidad Sánchez
  'Nagua': { lat: 19.3831, lng: -69.8478 },
  'Cabrera': { lat: 19.6333, lng: -69.9167 },
  'El Factor': { lat: 19.4167, lng: -69.9000 },
  
  // Samaná
  'Samaná': { lat: 19.2044, lng: -69.3364 },
  'Las Terrenas': { lat: 19.3167, lng: -69.5333 },
  'Sánchez': { lat: 19.2333, lng: -69.6000 },
  
  // San José de Ocoa
  'San José de Ocoa': { lat: 18.5469, lng: -70.5000 },
  'Sabana Larga': { lat: 18.6167, lng: -70.4833 },
  'Rancho Arriba': { lat: 18.6833, lng: -70.4167 }
};

// Colores por tipo de intervención
const INTERVENTION_COLORS = {
  'Bacheo': '#FF6B6B',
  'Asfaltado': '#4ECDC4',
  'Canalización': '#45B7D1',
  'Señalización': '#96CEB4',
  'Construcción': '#FFEAA7',
  'Reparación': '#DDA0DD',
  'Mantenimiento': '#98D8C8',
  'default': '#74B9FF'
};

const LeafletMapView: React.FC<LeafletMapViewProps> = ({ user, onBack }) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);

  useEffect(() => {
    // Cargar intervenciones desde localStorage
    const savedInterventions = JSON.parse(localStorage.getItem('mopc_intervenciones') || '[]');
    setInterventions(savedInterventions);

    // Obtener tipos únicos de intervenciones
    const typeSet = new Set();
    savedInterventions.forEach((i: Intervention) => typeSet.add(i.tipoIntervencion));
    const types = Array.from(typeSet) as string[];
    setAllTypes(types);
    setSelectedTypes(types); // Mostrar todos por defecto
  }, []);

  const filteredInterventions = interventions.filter(intervention => 
    selectedTypes.includes(intervention.tipoIntervencion)
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getTypeColor = (tipo: string) => {
    for (const [key, color] of Object.entries(INTERVENTION_COLORS)) {
      if (tipo.includes(key)) return color;
    }
    return INTERVENTION_COLORS.default;
  };

  // Crear iconos personalizados para cada tipo de intervención
  const createCustomIcon = (color: string) => {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  };

  // Centro de República Dominicana
  const center: [number, number] = [18.7357, -70.1627];

  return (
    <div style={{ padding: '20px', height: '100vh', backgroundColor: '#f8f9fa' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>
          🗺️ Mapa de Intervenciones MOPC (OpenStreetMap)
        </h1>
        <button 
          onClick={onBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Volver al Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
        {/* Panel de control */}
        <div style={{ 
          width: '300px', 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c3e50' }}>📊 Filtros</h3>
          
          {/* Búsqueda por Número de Reporte */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <img 
                src="/images/search-report-icon.svg" 
                alt="Buscar reporte" 
                style={{ width: '24px', height: '24px', marginRight: '8px' }}
              />
              <h4 style={{ color: '#495057', margin: 0, fontSize: '14px' }}>
                Buscar por Número de Reporte
              </h4>
            </div>
            <input
              type="text"
              placeholder="Ingrese # de reporte (ej: RPT-001)"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '8px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const reportNumber = (e.target as HTMLInputElement).value;
                  if (reportNumber.trim()) {
                    // Buscar intervención por número de reporte
                    const intervention = interventions.find(i => 
                      i.numeroReporte?.toLowerCase().includes(reportNumber.toLowerCase()) ||
                      i.id?.toString().includes(reportNumber)
                    );
                    if (intervention && intervention.municipio) {
                      // Centrar mapa en el municipio de la intervención encontrada
                      alert(`Reporte encontrado: ${intervention.numeroReporte || intervention.id} en ${intervention.municipio}`);
                      // Aquí podrías agregar lógica para centrar el mapa en las coordenadas del municipio
                    } else {
                      alert('No se encontró ningún reporte con ese número');
                    }
                  }
                }
              }}
            />
            <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>
              Presione Enter para buscar y ubicar en el mapa
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '10px 0', fontWeight: 'bold' }}>
              📈 Total: {filteredInterventions.length} intervenciones
            </p>
          </div>

          <h4 style={{ color: '#34495e', marginBottom: '15px' }}>Tipos de Intervención:</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => setSelectedTypes(allTypes)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px',
                fontSize: '12px'
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedTypes([])}
              style={{
                padding: '8px 12px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Ninguno
            </button>
          </div>

          {allTypes.map(type => {
            const count = interventions.filter(i => i.tipoIntervencion === type).length;
            return (
              <div key={type} style={{ marginBottom: '8px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: selectedTypes.includes(type) ? '#ecf0f1' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    style={{ marginRight: '8px' }}
                  />
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getTypeColor(type),
                    marginRight: '8px',
                    border: '1px solid #fff',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                  }}></div>
                  <span style={{ fontSize: '14px', flex: 1 }}>{type}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#7f8c8d',
                    backgroundColor: '#ecf0f1',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>
                    {count}
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {/* Mapa */}
        <div style={{ 
          flex: 1, 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <MapContainer 
            center={center} 
            zoom={8} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {filteredInterventions.map((intervention, index) => {
              let position: [number, number];

              // Usar coordenadas GPS si están disponibles
              if (intervention.latitud && intervention.longitud) {
                position = [intervention.latitud, intervention.longitud];
              } else {
                // Usar coordenadas del municipio
                const municipioCoords = municipioCoordinates[intervention.municipio];
                if (municipioCoords) {
                  position = [municipioCoords.lat, municipioCoords.lng];
                } else {
                  // Coordenadas por defecto (Santo Domingo)
                  position = [18.4861, -69.9312];
                }
              }

              const markerColor = getTypeColor(intervention.tipoIntervencion);
              const customIcon = createCustomIcon(markerColor);

              return (
                <Marker 
                  key={intervention.id} 
                  position={position}
                  icon={customIcon}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '300px' }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '16px' }}>
                        {intervention.tipoIntervencion}
                      </h3>
                      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        <p style={{ margin: '5px 0' }}><strong>📍 Ubicación:</strong></p>
                        <p style={{ margin: '2px 0 10px 20px', color: '#555' }}>
                          {intervention.region} → {intervention.provincia}<br />
                          {intervention.distrito} → {intervention.municipio}<br />
                          Sector: {intervention.sector}
                        </p>
                        <p style={{ margin: '5px 0' }}><strong>👤 Usuario:</strong> {intervention.usuario}</p>
                        <p style={{ margin: '5px 0' }}><strong>📅 Fecha:</strong> {new Date(intervention.timestamp).toLocaleDateString('es-DO')}</p>
                        {intervention.latitud && intervention.longitud ? 
                          <p style={{ margin: '5px 0' }}><strong>📌 GPS:</strong> {intervention.latitud.toFixed(6)}, {intervention.longitud.toFixed(6)}</p> : 
                          <p style={{ margin: '5px 0', color: '#e74c3c' }}><strong>📌 GPS:</strong> Ubicación aproximada</p>
                        }
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default LeafletMapView;
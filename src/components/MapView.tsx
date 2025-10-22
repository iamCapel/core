import React, { useState, useEffect } from 'react';

interface User {
  username: string;
  name: string;
}

interface MapViewProps {
  user: User;
  onBack: () => void;
}

// Coordenadas aproximadas de los municipios principales de República Dominicana
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
  'Puñal': { lat: 19.5167, lng: -70.6667 },
  'San José de las Matas': { lat: 19.3333, lng: -70.9333 },
  'Sabana Iglesia': { lat: 19.3833, lng: -70.8167 },
  'Jánico': { lat: 19.2667, lng: -70.7333 },
  'Villa Bisonó': { lat: 19.5667, lng: -70.8667 },
  'Bisonó (Navarrete)': { lat: 19.5667, lng: -70.8667 },
  'Baitoa': { lat: 19.5333, lng: -70.7333 },
  
  // La Vega
  'La Vega': { lat: 19.2167, lng: -70.5167 },
  'Constanza': { lat: 18.9167, lng: -70.7500 },
  'Jarabacoa': { lat: 19.1167, lng: -70.6333 },
  'Jima Abajo': { lat: 19.0500, lng: -70.4833 },
  
  // Puerto Plata
  'Puerto Plata': { lat: 19.7833, lng: -70.6833 },
  'Altamira': { lat: 19.6833, lng: -70.8667 },
  'Guananico': { lat: 19.6833, lng: -70.9167 },
  'Imbert': { lat: 19.7167, lng: -70.8333 },
  'Los Hidalgos': { lat: 19.7833, lng: -70.7333 },
  'Luperón': { lat: 19.8833, lng: -70.9500 },
  'Villa Isabela': { lat: 19.9167, lng: -71.0833 },
  'Villa Montellano': { lat: 19.6167, lng: -70.6167 },
  
  // San Cristóbal
  'San Cristóbal': { lat: 18.4167, lng: -70.1000 },
  'Villa Altagracia': { lat: 18.6833, lng: -70.1667 },
  'Bajos de Haina': { lat: 18.4167, lng: -70.0333 },
  'Haina': { lat: 18.4167, lng: -70.0333 },
  'Cambita Garabitos': { lat: 18.4500, lng: -70.2333 },
  'Los Cacaos': { lat: 18.3833, lng: -70.2167 },
  'Sabana Grande de Palenque': { lat: 18.2833, lng: -70.2500 },
  'San Gregorio de Nigua': { lat: 18.3667, lng: -70.0500 },
  'Nigua': { lat: 18.3667, lng: -70.0500 },
  'Yaguate': { lat: 18.3833, lng: -70.3167 },
  
  // Otras provincias importantes
  'Moca': { lat: 19.3833, lng: -70.5167 },
  'San Francisco de Macorís': { lat: 19.3000, lng: -70.2500 },
  'Nagua': { lat: 19.3833, lng: -69.8500 },
  'Bonao': { lat: 18.9333, lng: -70.4167 },
  'Cotuí': { lat: 19.0500, lng: -70.1500 },
  'Mao': { lat: 19.5500, lng: -71.0833 },
  'Monte Cristi': { lat: 19.8500, lng: -71.6500 },
  'Dajabón': { lat: 19.5500, lng: -71.7167 },
  'Sabaneta': { lat: 19.4833, lng: -71.3500 },
  'San Ignacio de Sabaneta': { lat: 19.4833, lng: -71.3500 },
  'Baní': { lat: 18.2833, lng: -70.3333 },
  'Azua': { lat: 18.4500, lng: -70.7333 },
  'Azua de Compostela': { lat: 18.4500, lng: -70.7333 },
  'San Juan': { lat: 18.8000, lng: -71.2333 },
  'San Juan de la Maguana': { lat: 18.8000, lng: -71.2333 },
  'Barahona': { lat: 18.2000, lng: -71.1000 },
  'Neiba': { lat: 18.4833, lng: -71.4167 },
  'Jimaní': { lat: 18.5000, lng: -71.8500 },
  'Comendador': { lat: 18.8833, lng: -71.7167 },
  'San Pedro de Macorís': { lat: 18.4667, lng: -69.3000 },
  'La Romana': { lat: 18.4167, lng: -68.9667 },
  'Higüey': { lat: 18.6167, lng: -68.7000 },
  'Hato Mayor': { lat: 18.7667, lng: -69.2667 },
  'Hato Mayor del Rey': { lat: 18.7667, lng: -69.2667 },
  'El Seibo': { lat: 18.7667, lng: -69.0333 },
  'Monte Plata': { lat: 18.8083, lng: -69.7833 },
  'Bayaguana': { lat: 18.7500, lng: -69.6167 },
  'Samaná': { lat: 19.2000, lng: -69.3333 },
  'Santa Bárbara de Samaná': { lat: 19.2000, lng: -69.3333 },
  'Las Terrenas': { lat: 19.3167, lng: -69.5333 },
  'Sánchez': { lat: 19.2333, lng: -69.6000 },
  
  // Agregando más municipios
  'Santo Domingo Este': { lat: 18.4889, lng: -69.8667 },
  'Santo Domingo Norte': { lat: 18.5167, lng: -69.9167 },
  'Santo Domingo Oeste': { lat: 18.5000, lng: -70.0000 },
  'Los Alcarrizos': { lat: 18.5167, lng: -70.0167 },
  'Pedro Brand': { lat: 18.6000, lng: -70.1167 },
  'Boca Chica': { lat: 18.4500, lng: -69.6000 },
  'San Antonio de Guerra': { lat: 18.5833, lng: -69.7500 }
};

const MapView: React.FC<MapViewProps> = ({ user, onBack }) => {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Cargar intervenciones del localStorage
    const storedInterventions = JSON.parse(localStorage.getItem('mopc_intervenciones') || '[]');
    setInterventions(storedInterventions);
  }, []);

  // Función para obtener las coordenadas de un municipio
  const getMunicipioCoordinates = (municipio: string) => {
    return municipioCoordinates[municipio] || { lat: 18.7357, lng: -70.1627 }; // Centro de RD por defecto
  };

  // Función para manejar clic en un punto del mapa
  const handlePointClick = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowModal(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedIntervention(null);
  };

  // Obtener estadísticas rápidas
  const totalInterventions = interventions.length;
  const uniqueProvinces = new Set(interventions.map(i => i.provincia)).size;
  const uniqueMunicipios = new Set(interventions.map(i => i.municipio)).size;

  return (
    <div className="dashboard">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="dashboard-logos">
            <img src="/mopc-logo.png" alt="MOPC Logo" className="dashboard-logo-left" />
            <img src="/logo-left.png?refresh=202510180002" alt="Logo Derecho" className="dashboard-logo-right" />
          </div>
        </div>

        <div className="topbar-logo" aria-hidden></div>

        <div className="topbar-right">
          <button 
            onClick={onBack}
            title="Volver al Dashboard" 
            className="btn topbar-btn"
          >
            ← Volver
          </button>

          <div className="user-badge topbar-user" title={user.name}>
            {user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()} &nbsp; {user.name}
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <header className="dashboard-header centered-subtitle">
          <div className="header-center">
            <h2 className="dashboard-subtitle">MAPA DE INTERVENCIONES - REPÚBLICA DOMINICANA</h2>
          </div>
        </header>

        {/* Estadísticas del mapa */}
        <div className="map-stats">
          <div className="map-stat-card">
            <span className="map-stat-number">{totalInterventions}</span>
            <span className="map-stat-label">Intervenciones Totales</span>
          </div>
          <div className="map-stat-card">
            <span className="map-stat-number">{uniqueProvinces}</span>
            <span className="map-stat-label">Provincias con Actividad</span>
          </div>
          <div className="map-stat-card">
            <span className="map-stat-number">{uniqueMunicipios}</span>
            <span className="map-stat-label">Municipios con Actividad</span>
          </div>
        </div>

        {/* Contenedor del mapa */}
        <div className="map-container">
          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-dot red"></div>
              <span>Intervención Registrada</span>
            </div>
          </div>

          {/* Mapa SVG de República Dominicana */}
          <div className="rd-map">
            <svg viewBox="0 0 800 400" className="map-svg">
              {/* Contorno simplificado de República Dominicana */}
              <path
                d="M 150 200 Q 200 150 300 160 Q 400 155 500 170 Q 600 180 650 200 Q 700 220 720 250 Q 730 280 720 300 Q 700 320 650 330 Q 600 340 500 335 Q 400 330 300 325 Q 200 320 150 300 Q 130 280 135 250 Q 140 220 150 200 Z"
                fill="#e8f4fd"
                stroke="#2196F3"
                strokeWidth="2"
                className="country-outline"
              />
              
              {/* Línea fronteriza con Haití */}
              <path
                d="M 150 200 Q 140 220 135 250 Q 130 280 150 300 Q 120 290 100 270 Q 90 250 100 230 Q 120 210 150 200"
                fill="#f0f0f0"
                stroke="#666"
                strokeWidth="1"
                strokeDasharray="5,5"
              />

              {/* Puntos rojos para cada intervención */}
              {interventions.map((intervention, index) => {
                const coords = getMunicipioCoordinates(intervention.municipio);
                // Convertir coordenadas geográficas a coordenadas del SVG
                const x = ((coords.lng + 72) / 4) * 800; // Ajuste aproximado para RD
                const y = ((20 - coords.lat) / 2) * 400; // Ajuste aproximado para RD
                
                return (
                  <circle
                    key={index}
                    cx={Math.max(50, Math.min(750, x))}
                    cy={Math.max(50, Math.min(350, y))}
                    r="6"
                    fill="#ff4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="intervention-point"
                    onClick={() => handlePointClick(intervention)}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${intervention.municipio}, ${intervention.provincia}`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>

          {/* Lista lateral de intervenciones */}
          <div className="interventions-sidebar">
            <h3>Intervenciones Registradas</h3>
            <div className="interventions-list">
              {interventions.length === 0 ? (
                <div className="no-interventions">
                  <p>No hay intervenciones registradas aún.</p>
                  <p>Ve a "Reportar" para agregar la primera intervención.</p>
                </div>
              ) : (
                interventions.map((intervention, index) => (
                  <div 
                    key={index} 
                    className="intervention-item"
                    onClick={() => handlePointClick(intervention)}
                  >
                    <div className="intervention-location">
                      <strong>{intervention.municipio}</strong>
                      <span>{intervention.provincia}</span>
                    </div>
                    <div className="intervention-type">
                      {intervention.tipoIntervencion}
                    </div>
                    <div className="intervention-date">
                      {new Date(intervention.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para mostrar detalles de la intervención */}
      {showModal && selectedIntervention && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles de la Intervención</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="intervention-detail">
                <strong>Ubicación:</strong>
                <p>{selectedIntervention.sector}, {selectedIntervention.municipio}, {selectedIntervention.provincia}</p>
              </div>
              <div className="intervention-detail">
                <strong>Región:</strong>
                <p>{selectedIntervention.region}</p>
              </div>
              <div className="intervention-detail">
                <strong>Tipo de Intervención:</strong>
                <p>{selectedIntervention.tipoIntervencion}</p>
              </div>
              <div className="intervention-detail">
                <strong>Usuario:</strong>
                <p>{selectedIntervention.usuario}</p>
              </div>
              <div className="intervention-detail">
                <strong>Fecha:</strong>
                <p>{new Date(selectedIntervention.timestamp).toLocaleString()}</p>
              </div>
              {selectedIntervention.punto_inicial && (
                <div className="intervention-detail">
                  <strong>Coordenadas Iniciales:</strong>
                  <p>{selectedIntervention.punto_inicial}</p>
                </div>
              )}
              {selectedIntervention.punto_alcanzado && (
                <div className="intervention-detail">
                  <strong>Coordenadas Finales:</strong>
                  <p>{selectedIntervention.punto_alcanzado}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
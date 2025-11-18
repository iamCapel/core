import React, { useState, useEffect } from 'react';
import { reportStorage } from '../services/reportStorage';
import './ReportsPage.css';

interface User {
  username: string;
  name: string;
}

interface ReportsPageProps {
  user: User;
  onBack: () => void;
}

type PageView = 'estadisticas' | 'detallado';
type StatsMode = 'intervenciones' | 'kilometraje';

interface RegionData {
  id: number;
  name: string;
  icon: string;
  color: string;
  total: number;
  completados: number;
  pendientes: number;
  enProgreso: number;
  kilometraje: number;
}

// Regiones de República Dominicana
const REGIONES_BASE = [
  { id: 1, name: 'Ozama o Metropolitana', icon: '🏛️', color: '#FF6B6B' },
  { id: 2, name: 'Cibao Norte', icon: '🌆', color: '#4ECDC4' },
  { id: 3, name: 'Cibao Sur', icon: '🌊', color: '#45B7D1' },
  { id: 4, name: 'Cibao Nordeste', icon: '🌾', color: '#96CEB4' },
  { id: 5, name: 'Cibao Noroeste', icon: '🏪', color: '#FFEAA7' },
  { id: 6, name: 'Valdesia', icon: '✈️', color: '#DFE6E9' },
  { id: 7, name: 'Enriquillo', icon: '🏖️', color: '#74B9FF' },
  { id: 8, name: 'El Valle', icon: '🏞️', color: '#A29BFE' },
  { id: 9, name: 'Yuma', icon: '🌴', color: '#FD79A8' },
  { id: 10, name: 'Higuamo', icon: '🌿', color: '#00B894' },
  { id: 11, name: 'Región Enriquillo', icon: '⛰️', color: '#FDCB6E' }
];

// Función para calcular distancia GPS (Haversine)
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onBack }) => {
  const [currentView, setCurrentView] = useState<PageView>('estadisticas');
  const [statsMode, setStatsMode] = useState<StatsMode>('intervenciones');
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [regionesData, setRegionesData] = useState<RegionData[]>([]);

  useEffect(() => {
    cargarDatosRegiones();
    const interval = setInterval(cargarDatosRegiones, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatosRegiones = () => {
    const stats = reportStorage.getStatistics();
    const allReports = reportStorage.getAllReports();

    const regiones = REGIONES_BASE.map(region => {
      const regionKey = region.name.toLowerCase();
      const regionStats = stats.porRegion[regionKey] || { 
        total: 0, 
        completados: 0, 
        pendientes: 0, 
        enProgreso: 0 
      };

      // Calcular kilometraje de la región
      const reportesRegion = allReports.filter(r => r.region?.toLowerCase() === regionKey);
      const kmTotal = reportesRegion.reduce((sum, report) => {
        if (report.gpsData?.start && report.gpsData?.end) {
          const km = calcularDistanciaKm(
            report.gpsData.start.latitude,
            report.gpsData.start.longitude,
            report.gpsData.end.latitude,
            report.gpsData.end.longitude
          );
          return sum + km;
        }
        return sum;
      }, 0);

      return {
        ...region,
        total: regionStats.total,
        completados: regionStats.completados,
        pendientes: regionStats.pendientes,
        enProgreso: regionStats.enProgreso,
        kilometraje: kmTotal
      };
    });

    setRegionesData(regiones);
  };

  return (
    <div className="reports-page">
      <div className="reports-container">
        <div className="reports-topbar">
          <button className="topbar-back-btn" onClick={onBack}>
            ← Volver al Dashboard
          </button>
        </div>
        
        <div className="reports-content">
          <div className="view-selector">
            <button 
              className={`view-btn ${currentView === 'estadisticas' ? 'active' : ''}`}
              onClick={() => setCurrentView('estadisticas')}
            >
              📊 Estadísticas
            </button>
            <button 
              className={`view-btn ${currentView === 'detallado' ? 'active' : ''}`}
              onClick={() => setCurrentView('detallado')}
            >
              📄 Informe Detallado
            </button>
          </div>

          {currentView === 'estadisticas' && (
            <div className="view-content">
              <h2 className="stats-title">Regiones de República Dominicana</h2>
              <p className="stats-subtitle">Selecciona una región para ver sus estadísticas detalladas</p>
              
              {/* Selector de modo de visualización */}
              <div className="stats-mode-selector">
                <button
                  className={`mode-toggle-btn ${statsMode === 'intervenciones' ? 'active' : ''}`}
                  onClick={() => setStatsMode('intervenciones')}
                >
                  <span className="mode-icon">📋</span>
                  <span className="mode-text">
                    <strong>Intervenciones</strong>
                    <small>Total de reportes por región</small>
                  </span>
                </button>
                <button
                  className={`mode-toggle-btn ${statsMode === 'kilometraje' ? 'active' : ''}`}
                  onClick={() => setStatsMode('kilometraje')}
                >
                  <span className="mode-icon">📏</span>
                  <span className="mode-text">
                    <strong>Kilometraje</strong>
                    <small>Distancia recorrida por región</small>
                  </span>
                </button>
              </div>

              <div className="regions-grid">
                {regionesData.map((region) => (
                  <div 
                    key={region.id}
                    className={`region-card ${selectedRegion === region.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRegion(region.id)}
                    style={{ 
                      '--region-color': region.color,
                      borderLeftColor: region.color 
                    } as React.CSSProperties}
                  >
                    <div className="region-icon">{region.icon}</div>
                    <div className="region-info">
                      <h3 className="region-name">{region.name}</h3>
                      
                      {statsMode === 'intervenciones' ? (
                        <div className="region-stats">
                          <div className="stat-item">
                            <span className="stat-label">Total</span>
                            <span className="stat-value">{region.total}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Completados</span>
                            <span className="stat-value" style={{ color: '#00C49F' }}>
                              {region.completados}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Pendientes</span>
                            <span className="stat-value" style={{ color: '#FFBB28' }}>
                              {region.pendientes}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">En Progreso</span>
                            <span className="stat-value" style={{ color: '#FF8042' }}>
                              {region.enProgreso}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="region-stats">
                          <div className="stat-item-km">
                            <span className="stat-label">Kilometraje Total</span>
                            <span className="stat-value-lg">{region.kilometraje.toFixed(2)} km</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Reportes</span>
                            <span className="stat-value">{region.total}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Promedio</span>
                            <span className="stat-value">
                              {region.total > 0 ? (region.kilometraje / region.total).toFixed(2) : '0'} km
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="region-arrow">→</div>
                  </div>
                ))}
              </div>

              {selectedRegion && (
                <div className="region-details-panel">
                  <div className="panel-header">
                    <h3>Detalles de {regionesData.find(r => r.id === selectedRegion)?.name}</h3>
                    <button className="close-btn" onClick={() => setSelectedRegion(null)}>✕</button>
                  </div>
                  <div className="panel-content">
                    <p>Aquí se mostrarán las estadísticas detalladas, provincias, municipios y más...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'detallado' && (
            <div className="view-content">
              <h2>Informe Detallado</h2>
              <p>Vista de informe detallado en desarrollo...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

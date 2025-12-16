import React, { useState, useEffect } from 'react';
import { reportStorage } from '../services/reportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import PendingReportsModal from './PendingReportsModal';
import DetailedReportView from './DetailedReportView';
import './ReportsPage.css';

interface User {
  username: string;
  name: string;
  role?: string;
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
  provincias: ProvinciaData[];
}

interface MunicipioData {
  nombre: string;
  total: number;
  kilometraje: number;
  completados: number;
  pendientes: number;
  enProgreso: number;
}

interface ProvinciaData {
  nombre: string;
  total: number;
  kilometraje: number;
  completados: number;
  pendientes: number;
  enProgreso: number;
  municipios: MunicipioData[];
  expanded?: boolean;
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
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedProvincias, setExpandedProvincias] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarDatosRegiones();
    const interval = setInterval(cargarDatosRegiones, 5000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar contador de pendientes
  const updatePendingCount = () => {
    const pendientes = pendingReportStorage.getPendingCount();
    setPendingCount(pendientes);
  };

  const getPendingReports = () => {
    const pendingReports = pendingReportStorage.getAllPendingReports();
    return pendingReports.map(report => ({
      id: report.id,
      reportNumber: `DCR-${report.id.split('_').pop()?.slice(-6) || '000000'}`,
      timestamp: report.timestamp,
      estado: 'pendiente',
      region: report.formData.region || 'N/A',
      provincia: report.formData.provincia || 'N/A',
      municipio: report.formData.municipio || 'N/A',
      tipoIntervencion: report.formData.tipoIntervencion || 'No especificado'
    }));
  };

  const handleContinuePendingReport = (reportId: string) => {
    alert('Función de continuar reporte desde ReportsPage - redirigir a formulario');
    setShowPendingModal(false);
  };

  const handleCancelPendingReport = (reportId: string) => {
    pendingReportStorage.deletePendingReport(reportId);
    updatePendingCount();
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatosRegiones = async () => {
    let allReports: any[] = [];
    let stats: any = { porRegion: {} };
    
    try {
      // Obtener reportes de Firebase
      allReports = await firebaseReportStorage.getAllReports();
      
      // Filtrar reportes para usuarios técnicos - solo ven sus propios reportes
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        allReports = allReports.filter(report => report.creadoPor === user.username);
      }
    } catch (error) {
      console.error('Error cargando reportes de Firebase:', error);
      // Fallback a localStorage si falla Firebase
      stats = reportStorage.getStatistics();
      allReports = reportStorage.getAllReports();
      
      // Filtrar reportes para usuarios técnicos - solo ven sus propios reportes
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        allReports = allReports.filter(report => report.creadoPor === user.username);
      }
    }

    const regiones = REGIONES_BASE.map(region => {
      const regionKey = region.name.toLowerCase();
      const regionStats = stats.porRegion[regionKey] || { 
        total: 0, 
        completados: 0, 
        pendientes: 0, 
        enProgreso: 0 
      };

      // Obtener reportes de la región
      const reportesRegion = allReports.filter(r => r.region?.toLowerCase() === regionKey);
      
      // Calcular kilometraje total de la región
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

      // Agrupar por provincia y luego por municipio
      const provinciaMap = new Map<string, {
        total: number;
        completados: number;
        pendientes: number;
        enProgreso: number;
        kilometraje: number;
        municipios: Map<string, {
          total: number;
          completados: number;
          pendientes: number;
          enProgreso: number;
          kilometraje: number;
        }>;
      }>();

      reportesRegion.forEach(report => {
        const provincia = report.provincia || 'Sin Provincia';
        const municipio = report.municipio || report.distrito || 'Sin Municipio';
        
        // Obtener o crear entrada de provincia
        const currentProv = provinciaMap.get(provincia) || {
          total: 0,
          completados: 0,
          pendientes: 0,
          enProgreso: 0,
          kilometraje: 0,
          municipios: new Map()
        };

        // Obtener o crear entrada de municipio
        const currentMun = currentProv.municipios.get(municipio) || {
          total: 0,
          completados: 0,
          pendientes: 0,
          enProgreso: 0,
          kilometraje: 0
        };

        // Actualizar contadores de provincia
        currentProv.total++;
        
        if (report.estado === 'completado' || report.estado === 'aprobado') {
          currentProv.completados++;
          currentMun.completados++;
        } else if (report.estado === 'pendiente') {
          currentProv.pendientes++;
          currentMun.pendientes++;
        } else {
          currentProv.enProgreso++;
          currentMun.enProgreso++;
        }

        // Actualizar contadores de municipio
        currentMun.total++;

        // Calcular kilometraje de este reporte
        if (report.gpsData?.start && report.gpsData?.end) {
          const km = calcularDistanciaKm(
            report.gpsData.start.latitude,
            report.gpsData.start.longitude,
            report.gpsData.end.latitude,
            report.gpsData.end.longitude
          );
          currentProv.kilometraje += km;
          currentMun.kilometraje += km;
        }

        currentProv.municipios.set(municipio, currentMun);
        provinciaMap.set(provincia, currentProv);
      });

      // Convertir mapa a array
      const provincias: ProvinciaData[] = Array.from(provinciaMap.entries()).map(([nombre, data]) => {
        // Convertir municipios a array
        const municipios: MunicipioData[] = Array.from(data.municipios.entries()).map(([nomMun, munData]) => ({
          nombre: nomMun,
          total: munData.total,
          kilometraje: munData.kilometraje,
          completados: munData.completados,
          pendientes: munData.pendientes,
          enProgreso: munData.enProgreso
        }));

        // Ordenar municipios por total descendente
        municipios.sort((a, b) => b.total - a.total);

        return {
          nombre,
          total: data.total,
          kilometraje: data.kilometraje,
          completados: data.completados,
          pendientes: data.pendientes,
          enProgreso: data.enProgreso,
          municipios,
          expanded: false
        };
      });

      // Ordenar provincias por total descendente
      provincias.sort((a, b) => b.total - a.total);

      return {
        ...region,
        total: regionStats.total,
        completados: regionStats.completados,
        pendientes: regionStats.pendientes,
        enProgreso: regionStats.enProgreso,
        kilometraje: kmTotal,
        provincias
      };
    });

    setRegionesData(regiones);
  };

  const toggleProvinciaExpansion = (regionId: number, provinciaNombre: string) => {
    const key = `${regionId}-${provinciaNombre}`;
    setExpandedProvincias(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <div className="reports-page">
      <div className="reports-container">
        {/* Topbar Reconstruido */}
        <div className="reports-topbar-modern">
          <div className="topbar-left-section">
            <button className="topbar-back-btn-modern" onClick={onBack}>
              <span className="back-arrow">←</span>
              <span className="back-text">Dashboard</span>
            </button>
            <div className="topbar-divider"></div>
            <div className="topbar-title-section">
              <h1 className="topbar-main-title">Informes y Estadísticas</h1>
              <p className="topbar-subtitle">Análisis de intervenciones por región</p>
            </div>
          </div>
          
          <div className="topbar-right-section">
            {/* Icono de notificaciones */}
            <div className="notification-container" style={{ position: 'relative', marginRight: '16px' }}>
              <img 
                src="/images/notification-bell-icon.svg" 
                alt="Notificaciones" 
                className="notification-icon"
                style={{
                  width: '24px', 
                  height: '24px',
                  filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
                }}
                onClick={() => setShowPendingModal(true)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.filter = 'drop-shadow(0 3px 6px rgba(255, 152, 0, 0.6))';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))';
                }}
              />
              {pendingCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: '2px solid white',
                    animation: 'badgeGlow 2s infinite'
                  }}
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>

            <div className="view-selector-topbar">
              <button 
                className={`view-btn-topbar ${currentView === 'estadisticas' ? 'active' : ''}`}
                onClick={() => setCurrentView('estadisticas')}
              >
                <span className="view-icon">📊</span>
                <span className="view-label">Estadísticas</span>
              </button>
              <button 
                className={`view-btn-topbar ${currentView === 'detallado' ? 'active' : ''}`}
                onClick={() => setCurrentView('detallado')}
              >
                <span className="view-icon">📄</span>
                <span className="view-label">Informe Detallado</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="reports-content">
          {currentView === 'estadisticas' && (
            <div className="view-content">
              <div className="stats-header-section">
                <div className="stats-header-left">
                  <div>
                    <h2 className="stats-title">Regiones de República Dominicana</h2>
                    <p className="stats-subtitle">Selecciona una región para ver sus estadísticas detalladas</p>
                  </div>
                </div>
                
                {/* Selector de modo compacto */}
                <div className="stats-mode-selector-compact">
                  <button
                    className={`mode-compact-btn ${statsMode === 'intervenciones' ? 'active' : ''}`}
                    onClick={() => setStatsMode('intervenciones')}
                    title="Ver intervenciones"
                  >
                    📋 Intervenciones
                  </button>
                  <button
                    className={`mode-compact-btn ${statsMode === 'kilometraje' ? 'active' : ''}`}
                    onClick={() => setStatsMode('kilometraje')}
                    title="Ver kilometraje"
                  >
                    📏 Kilometraje
                  </button>
                </div>
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
                    <h3>
                      {regionesData.find(r => r.id === selectedRegion)?.icon} {' '}
                      {regionesData.find(r => r.id === selectedRegion)?.name}
                    </h3>
                    <button className="close-btn" onClick={() => setSelectedRegion(null)}>✕</button>
                  </div>
                  <div className="panel-content">
                    {(() => {
                      const region = regionesData.find(r => r.id === selectedRegion);
                      if (!region || region.provincias.length === 0) {
                        return <p className="no-data">No hay provincias registradas en esta región.</p>;
                      }

                      return (
                        <>
                          <div className="provincias-summary">
                            <div className="summary-stat">
                              <span className="summary-label">Total Provincias</span>
                              <span className="summary-value">{region.provincias.length}</span>
                            </div>
                            <div className="summary-stat">
                              <span className="summary-label">Total Intervenciones</span>
                              <span className="summary-value">{region.total}</span>
                            </div>
                            <div className="summary-stat">
                              <span className="summary-label">Kilometraje Total</span>
                              <span className="summary-value">{region.kilometraje.toFixed(2)} km</span>
                            </div>
                          </div>

                          <div className="provincias-list">
                            <h4 className="list-title">Provincias de {region.name}</h4>
                            {region.provincias.map((provincia, index) => {
                              const provinciaKey = `${selectedRegion}-${provincia.nombre}`;
                              const isExpanded = expandedProvincias.has(provinciaKey);
                              
                              return (
                                <div key={index} className="provincia-card-expandable">
                                  <div 
                                    className="provincia-card clickable"
                                    onClick={() => toggleProvinciaExpansion(selectedRegion, provincia.nombre)}
                                  >
                                    <div className="provincia-header">
                                      <div className="provincia-header-left">
                                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                        <h5 className="provincia-nombre">{provincia.nombre}</h5>
                                      </div>
                                      <div className="provincia-badge">{provincia.total} reportes</div>
                                    </div>
                                    <div className="provincia-stats">
                                      <div className="provincia-stat">
                                        <span className="stat-icon">✅</span>
                                        <span className="stat-text">
                                          <strong>{provincia.completados}</strong> Completados
                                        </span>
                                      </div>
                                      <div className="provincia-stat">
                                        <span className="stat-icon">⏳</span>
                                        <span className="stat-text">
                                          <strong>{provincia.pendientes}</strong> Pendientes
                                        </span>
                                      </div>
                                      <div className="provincia-stat">
                                        <span className="stat-icon">🔄</span>
                                        <span className="stat-text">
                                          <strong>{provincia.enProgreso}</strong> En Progreso
                                        </span>
                                      </div>
                                      <div className="provincia-stat highlight">
                                        <span className="stat-icon">📏</span>
                                        <span className="stat-text">
                                          <strong>{provincia.kilometraje.toFixed(2)} km</strong> Recorridos
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lista de municipios expandible */}
                                  {isExpanded && provincia.municipios.length > 0 && (
                                    <div className="municipios-list">
                                      <div className="municipios-header">
                                        <h6 className="municipios-title">
                                          Municipios/Distritos en {provincia.nombre}
                                        </h6>
                                        <span className="municipios-count">
                                          {provincia.municipios.length} {provincia.municipios.length === 1 ? 'municipio' : 'municipios'}
                                        </span>
                                      </div>
                                      {provincia.municipios.map((municipio, munIndex) => (
                                        <div key={munIndex} className="municipio-item">
                                          <div className="municipio-header">
                                            <span className="municipio-icon">📍</span>
                                            <span className="municipio-nombre">{municipio.nombre}</span>
                                            <span className="municipio-total">{municipio.total} {municipio.total === 1 ? 'reporte' : 'reportes'}</span>
                                          </div>
                                          <div className="municipio-stats-grid">
                                            <div className="municipio-stat">
                                              <span className="municipio-stat-label">Completados</span>
                                              <span className="municipio-stat-value completados">{municipio.completados}</span>
                                            </div>
                                            <div className="municipio-stat">
                                              <span className="municipio-stat-label">Pendientes</span>
                                              <span className="municipio-stat-value pendientes">{municipio.pendientes}</span>
                                            </div>
                                            <div className="municipio-stat">
                                              <span className="municipio-stat-label">En Progreso</span>
                                              <span className="municipio-stat-value en-progreso">{municipio.enProgreso}</span>
                                            </div>
                                            <div className="municipio-stat">
                                              <span className="municipio-stat-label">Kilometraje</span>
                                              <span className="municipio-stat-value kilometraje">{municipio.kilometraje.toFixed(2)} km</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'detallado' && (
            <DetailedReportView user={user} />
          )}
        </div>
      </div>

      {/* Modal de notificaciones pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={getPendingReports()}
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />
    </div>
  );
};

export default ReportsPage;

import React, { useState, useEffect } from 'react';
import './RegionDetailModal.css';
import ClickableUsername from './ClickableUsername';

interface RegionDetailModalProps {
  regionName: string;
  regionIcon: string;
  totalKm: number;
  completed: number;
  pending: number;
  inProgress: number;
  onClose: () => void;
}

interface DistrictData {
  name: string;
  totalKm: number;
  reportCount: number;
}

interface SectorData {
  name: string;
  totalKm: number;
  reportCount: number;
}

interface ReportData {
  id: string;
  reportNumber: string;
  userName: string;
  userFullName: string;
  date: string;
  tipoIntervencion: string;
  sector: string;
  distrito: string;
  totalKm: number;
  plantilla: any;
}

const RegionDetailModal: React.FC<RegionDetailModalProps> = ({
  regionName,
  regionIcon,
  totalKm,
  completed,
  pending,
  inProgress,
  onClose
}) => {
  const [viewLevel, setViewLevel] = useState<'district' | 'sector' | 'report'>('district');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [districts, setDistricts] = useState<DistrictData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);

  // Función para calcular distancia entre coordenadas (ya no se usa para estadísticas)
  // NOTA: El cálculo de kilómetros intervenidos ahora usa el campo manual 'longitud_intervencion'
  const calcularDistanciaKm = (coord1: string, coord2: string): number => {
    try {
      const [lat1Str, lon1Str] = coord1.split(',').map(s => s.trim());
      const [lat2Str, lon2Str] = coord2.split(',').map(s => s.trim());
      
      const lat1 = parseFloat(lat1Str);
      const lon1 = parseFloat(lon1Str);
      const lat2 = parseFloat(lat2Str);
      const lon2 = parseFloat(lon2Str);
      
      if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        return 0;
      }
      
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    } catch (e) {
      return 0;
    }
  };

  // Cargar distritos de la región
  useEffect(() => {
    const districtStats: Record<string, { totalKm: number; reportCount: number }> = {};

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('intervencion_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (data.region === regionName) {
            const distrito = data.distrito || data.municipio || 'Sin distrito';
            
            if (!districtStats[distrito]) {
              districtStats[distrito] = { totalKm: 0, reportCount: 0 };
            }

            // Obtener kilometraje desde campo manual de la plantilla
            const longitudIntervencion = parseFloat(data.plantilla?.longitud_intervencion || '0');
            districtStats[distrito].totalKm += (longitudIntervencion || 0);
            
            districtStats[distrito].reportCount++;
          }
        } catch (e) {
          console.error('Error al leer reporte:', e);
        }
      }
    });

    const districtArray = Object.entries(districtStats).map(([name, stats]) => ({
      name,
      totalKm: stats.totalKm,
      reportCount: stats.reportCount
    })).sort((a, b) => b.totalKm - a.totalKm);

    setDistricts(districtArray);
  }, [regionName]);

  // Cargar sectores del distrito seleccionado
  useEffect(() => {
    if (!selectedDistrict) return;

    const sectorStats: Record<string, { totalKm: number; reportCount: number }> = {};

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('intervencion_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const distrito = data.distrito || data.municipio || 'Sin distrito';
          
          if (data.region === regionName && distrito === selectedDistrict) {
            const sector = data.sector || 'Sin sector';
            
            if (!sectorStats[sector]) {
              sectorStats[sector] = { totalKm: 0, reportCount: 0 };
            }

            // Obtener kilometraje desde campo manual de la plantilla
            const longitudIntervencion = parseFloat(data.plantilla?.longitud_intervencion || '0');
            sectorStats[sector].totalKm += (longitudIntervencion || 0);
            
            sectorStats[sector].reportCount++;
          }
        } catch (e) {
          console.error('Error al leer reporte:', e);
        }
      }
    });

    const sectorArray = Object.entries(sectorStats).map(([name, stats]) => ({
      name,
      totalKm: stats.totalKm,
      reportCount: stats.reportCount
    })).sort((a, b) => b.totalKm - a.totalKm);

    setSectors(sectorArray);
  }, [selectedDistrict, regionName]);

  // Cargar reportes del sector seleccionado
  useEffect(() => {
    if (!selectedSector) return;

    const reportArray: ReportData[] = [];

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('intervencion_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const distrito = data.distrito || data.municipio || 'Sin distrito';
          const sector = data.sector || 'Sin sector';
          
          if (data.region === regionName && 
              distrito === selectedDistrict && 
              sector === selectedSector) {
            
            // Obtener kilometraje desde campo manual de la plantilla
            const longitudIntervencion = parseFloat(data.plantilla?.longitud_intervencion || '0');
            const distanciaKm = longitudIntervencion || 0;

            reportArray.push({
              id: key,
              reportNumber: key.replace('intervencion_', ''),
              userName: data.usuario || 'Desconocido',
              userFullName: data.nombreCompleto || data.usuario || 'Usuario',
              date: data.fecha || 'Sin fecha',
              tipoIntervencion: data.tipoIntervencion || 'No especificado',
              sector: sector,
              distrito: distrito,
              totalKm: distanciaKm,
              plantilla: data.plantilla || {}
            });
          }
        } catch (e) {
          console.error('Error al leer reporte:', e);
        }
      }
    });

    reportArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setReports(reportArray);
  }, [selectedSector, selectedDistrict, regionName]);

  const handleDistrictClick = (districtName: string) => {
    setSelectedDistrict(districtName);
    setViewLevel('sector');
  };

  const handleSectorClick = (sectorName: string) => {
    setSelectedSector(sectorName);
    setViewLevel('report');
  };

  const handleReportClick = (report: ReportData) => {
    setSelectedReport(report);
  };

  const handleBack = () => {
    if (viewLevel === 'report' && !selectedReport) {
      setViewLevel('sector');
      setSelectedSector(null);
    } else if (viewLevel === 'sector') {
      setViewLevel('district');
      setSelectedDistrict(null);
    } else if (selectedReport) {
      setSelectedReport(null);
    }
  };

  const getMaxKm = (items: DistrictData[] | SectorData[]) => {
    return Math.max(...items.map(item => item.totalKm), 1);
  };

  return (
    <div className="region-modal-overlay" onClick={onClose}>
      <div className="region-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="region-modal-close" onClick={onClose}>✕</button>
        
        <div className="region-modal-header">
          <h2>{regionIcon} {regionName}</h2>
          <div className="region-modal-stats">
            <div className="stat-item">
              <span className="stat-label">Total Kilómetros</span>
              <span className="stat-value">{totalKm.toFixed(2)} km</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completados</span>
              <span className="stat-value" style={{ color: '#00C49F' }}>{completed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pendientes</span>
              <span className="stat-value" style={{ color: '#FFBB28' }}>{pending}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">En Progreso</span>
              <span className="stat-value" style={{ color: '#FF8042' }}>{inProgress}</span>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-nav">
          <span className="breadcrumb-item active">{regionName}</span>
          {selectedDistrict && (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item active">{selectedDistrict}</span>
            </>
          )}
          {selectedSector && (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item active">{selectedSector}</span>
            </>
          )}
          {selectedReport && (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item active">Reporte #{selectedReport.reportNumber}</span>
            </>
          )}
        </div>

        {(viewLevel !== 'district' || selectedReport) && (
          <button className="back-button" onClick={handleBack}>
            ← Volver
          </button>
        )}

        <div className="region-modal-body">
          {/* Vista de Reporte Completo */}
          {selectedReport ? (
            <div className="report-detail-view">
              <h3>📄 Reporte #{selectedReport.reportNumber}</h3>
              <div className="report-detail-info">
                <div className="report-info-row">
                  <span className="info-label">Usuario:</span>
                  <span className="info-value">
                    <ClickableUsername 
                      username={selectedReport.userName}
                      fullName={selectedReport.userFullName}
                    />
                  </span>
                </div>
                <div className="report-info-row">
                  <span className="info-label">Fecha:</span>
                  <span className="info-value">{selectedReport.date}</span>
                </div>
                <div className="report-info-row">
                  <span className="info-label">Tipo de Intervención:</span>
                  <span className="info-value">{selectedReport.tipoIntervencion}</span>
                </div>
                <div className="report-info-row">
                  <span className="info-label">Distrito:</span>
                  <span className="info-value">{selectedReport.distrito}</span>
                </div>
                <div className="report-info-row">
                  <span className="info-label">Sector:</span>
                  <span className="info-value">{selectedReport.sector}</span>
                </div>
                <div className="report-info-row highlight">
                  <span className="info-label">Kilómetros Intervenidos:</span>
                  <span className="info-value">{selectedReport.totalKm.toFixed(2)} km</span>
                </div>
              </div>

              <h4>Detalles de la Intervención</h4>
              <div className="report-plantilla-data">
                {Object.entries(selectedReport.plantilla).map(([key, value]) => (
                  <div key={key} className="plantilla-row">
                    <span className="plantilla-label">{key.replace(/_/g, ' ')}:</span>
                    <span className="plantilla-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : viewLevel === 'district' ? (
            /* Vista de Distritos */
            <div className="districts-list">
              <h3>📍 Distritos Municipales ({districts.length})</h3>
              {districts.length === 0 ? (
                <p className="no-data">No hay datos disponibles para esta región</p>
              ) : (
                districts.map((district, index) => {
                  const percentage = (district.totalKm / getMaxKm(districts)) * 100;
                  return (
                    <div 
                      key={index} 
                      className="district-item"
                      onClick={() => handleDistrictClick(district.name)}
                    >
                      <div className="district-header">
                        <span className="district-name">{district.name}</span>
                        <span className="district-reports">{district.reportCount} reportes</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="progress-bar-label">
                            {district.totalKm.toFixed(2)} km
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : viewLevel === 'sector' ? (
            /* Vista de Sectores */
            <div className="sectors-list">
              <h3>🏘️ Sectores de {selectedDistrict} ({sectors.length})</h3>
              {sectors.length === 0 ? (
                <p className="no-data">No hay datos disponibles para este distrito</p>
              ) : (
                sectors.map((sector, index) => {
                  const percentage = (sector.totalKm / getMaxKm(sectors)) * 100;
                  return (
                    <div 
                      key={index} 
                      className="sector-item"
                      onClick={() => handleSectorClick(sector.name)}
                    >
                      <div className="sector-header">
                        <span className="sector-name">{sector.name}</span>
                        <span className="sector-reports">{sector.reportCount} reportes</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="progress-bar-label">
                            {sector.totalKm.toFixed(2)} km
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Vista de Reportes */
            <div className="reports-list">
              <h3>📋 Reportes de {selectedSector} ({reports.length})</h3>
              {reports.length === 0 ? (
                <p className="no-data">No hay reportes disponibles para este sector</p>
              ) : (
                reports.map((report, index) => (
                  <div 
                    key={index} 
                    className="report-item"
                    onClick={() => handleReportClick(report)}
                  >
                    <div className="report-number">#{report.reportNumber}</div>
                    <div className="report-info">
                      <div className="report-user">
                        👤{' '}
                        <ClickableUsername 
                          username={report.userName}
                          fullName={report.userFullName}
                        />
                      </div>
                      <div className="report-date">📅 {report.date}</div>
                      <div className="report-type">{report.tipoIntervencion}</div>
                    </div>
                    <div className="report-km">{report.totalKm.toFixed(2)} km</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionDetailModal;

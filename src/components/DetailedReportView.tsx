import React, { useState, useEffect, useMemo } from 'react';
import { reportStorage } from '../services/reportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import './DetailedReportView.css';

interface Report {
  id: string;
  reportNumber: string;
  createdBy: string;
  date: string;
  district: string;
  province: string;
  region: string;
  municipio: string;
  sector: string;
  totalInterventions: number;
  tipoIntervencion: string;
  subTipoCanal?: string;
  // Datos métricos (plantilla)
  metricData: Record<string, string>;
  // Coordenadas GPS
  gpsData?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  // Imágenes
  images?: string[];
  // Otros campos
  observations?: string;
  fechaCreacion?: string;
  numeroReporte?: string;
  creadoPor?: string;
  estado?: string;
  kilometraje?: number;
}

interface District {
  name: string;
  interventions: number;
  reports: Report[];
}

interface Province {
  name: string;
  interventions: number;
  districts: District[];
}

interface Region {
  name: string;
  interventions: number;
  provinces: Province[];
}

interface DetailedReportViewProps {
  onClose?: (() => void) | null;
  onEditReport?: (report: Report) => void;
  user?: {
    username: string;
    name: string;
    role?: string;
  };
}

type ViewMode = 'hierarchy' | 'table' | 'stats';
type FilterPeriod = 'todos' | 'hoy' | 'semana' | 'mes' | 'trimestre' | 'año' | 'personalizado';
type SortField = 'reportNumber' | 'date' | 'tipo' | 'estado' | 'kilometraje';
type SortOrder = 'asc' | 'desc';

const DetailedReportView: React.FC<DetailedReportViewProps> = ({ onClose = null, onEditReport, user }) => {
  // Estados de vista
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  
  // Estados originales
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedProvinces, setExpandedProvinces] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  // Estados de filtros avanzados
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterProvincia, setFilterProvincia] = useState<string>('');
  const [filterUsuario, setFilterUsuario] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Estados de ordenamiento
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Cargar datos reales desde reportStorage
  const [regionsData, setRegionsData] = useState<Region[]>([]);
  const [allReportsFlat, setAllReportsFlat] = useState<Report[]>([]);

  // Función para eliminar reporte (solo administradores)
  const deleteReport = async (reportId: string, reportNumber: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const isConfirmed = window.confirm(
      `¿Está seguro que desea eliminar el reporte ${reportNumber}?\n\nEsta acción no se puede deshacer.`
    );

    if (isConfirmed) {
      try {
        // Eliminar de Firebase primero (fuente de verdad)
        await firebaseReportStorage.deleteReport(reportId);
        // También eliminar de localStorage para sincronización
        reportStorage.deleteReport(reportId);
        console.log(`✅ Reporte ${reportNumber} eliminado exitosamente de Firebase y localStorage`);
        // Forzar recarga del componente para reflejar cambios
        window.location.reload();
      } catch (error) {
        console.error('❌ Error al eliminar reporte:', error);
        alert('Error al eliminar el reporte. Por favor intente nuevamente.');
      }
    }
  };

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'Administrador' || user?.role === 'administrador' || user?.role === 'Admin' || user?.role === 'admin';

  useEffect(() => {
    // Cargar todos los reportes desde Firebase
    const loadReports = async () => {
      try {
        let allReports = await firebaseReportStorage.getAllReports();
        
        // Filtrar por rol si es técnico
        if (user?.role === 'Técnico' || user?.role === 'tecnico') {
          allReports = allReports.filter(report => report.creadoPor === user.username);
        }
        
        processReports(allReports);
      } catch (error) {
        console.error('Error cargando reportes de Firebase:', error);
        // Fallback a localStorage
        let allReports = reportStorage.getAllReports();
        
        // Filtrar por rol si es técnico
        if (user?.role === 'Técnico' || user?.role === 'tecnico') {
          allReports = allReports.filter(report => report.creadoPor === user.username);
        }
        
        processReports(allReports);
      }
    };
    
    loadReports();
  }, [user]);

  const processReports = (allReports: any[]) => {
    
    // Estructura jerárquica: Región > Provincia > Distrito > Reportes
    const hierarchyMap: Record<string, Record<string, Record<string, any[]>>> = {};
    const flatReports: Report[] = [];
    
    allReports.forEach(report => {
      const region = report.region || 'Sin región';
      const provincia = report.provincia || 'Sin provincia';
      const distrito = report.distrito || 'Sin distrito';
      
      if (!hierarchyMap[region]) hierarchyMap[region] = {};
      if (!hierarchyMap[region][provincia]) hierarchyMap[region][provincia] = {};
      if (!hierarchyMap[region][provincia][distrito]) hierarchyMap[region][provincia][distrito] = [];
      
      // Calcular kilometraje
      let km = 0;
      if (report.gpsData?.start && report.gpsData?.end) {
        const R = 6371;
        const lat1 = report.gpsData.start.latitude * Math.PI / 180;
        const lat2 = report.gpsData.end.latitude * Math.PI / 180;
        const dLat = (report.gpsData.end.latitude - report.gpsData.start.latitude) * Math.PI / 180;
        const dLon = (report.gpsData.end.longitude - report.gpsData.start.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        km = R * c;
      }
      
      // Convertir reporte al formato esperado
      const formattedReport = {
        id: report.id,
        reportNumber: report.numeroReporte,
        createdBy: report.creadoPor,
        date: new Date(report.fechaCreacion).toLocaleDateString(),
        district: report.distrito,
        province: report.provincia,
        region: report.region,
        municipio: report.municipio,
        sector: report.sector,
        totalInterventions: 1,
        tipoIntervencion: report.tipoIntervencion,
        subTipoCanal: report.subTipoCanal,
        metricData: report.metricData || {},
        gpsData: report.gpsData,
        observations: report.observaciones,
        fechaCreacion: report.fechaCreacion,
        numeroReporte: report.numeroReporte,
        creadoPor: report.creadoPor,
        estado: report.estado,
        kilometraje: km
      };
      
      hierarchyMap[region][provincia][distrito].push(formattedReport);
      flatReports.push(formattedReport);
    });
    
    // Construir estructura de regiones
    const regionNames = [
      'Ozama o Metropolitana', 'Cibao Norte', 'Cibao Sur', 'Cibao Nordeste',
      'Cibao Noroeste', 'Santiago', 'Valdesia', 'Enriquillo',
      'El Valle', 'Yuma', 'Higuamo'
    ];
    
    const regions: Region[] = regionNames.map(regionName => {
      const provincesMap = hierarchyMap[regionName] || {};
      const provinces: Province[] = Object.keys(provincesMap).map(provinceName => {
        const districtsMap = provincesMap[provinceName];
        const districts: District[] = Object.keys(districtsMap).map(districtName => ({
          name: districtName,
          interventions: districtsMap[districtName].length,
          reports: districtsMap[districtName]
        }));
        
        return {
          name: provinceName,
          interventions: districts.reduce((sum, d) => sum + d.interventions, 0),
          districts
        };
      });
      
      return {
        name: regionName,
        interventions: provinces.reduce((sum, p) => sum + p.interventions, 0),
        provinces
      };
    });
    
    setRegionsData(regions);
    setAllReportsFlat(flatReports);
  };

  // Aplicar filtros avanzados
  const filteredReports = useMemo(() => {
    let filtered = [...allReportsFlat];

    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.reportNumber?.toLowerCase().includes(query) ||
        report.tipoIntervencion?.toLowerCase().includes(query) ||
        report.province?.toLowerCase().includes(query) ||
        report.municipio?.toLowerCase().includes(query) ||
        report.createdBy?.toLowerCase().includes(query)
      );
    }

    // Filtro de período
    if (filterPeriod !== 'todos' && filtered.length > 0) {
      const now = new Date();
      let startDate: Date;

      switch (filterPeriod) {
        case 'hoy':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'semana':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'mes':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'trimestre':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'año':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'personalizado':
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => {
              const fecha = new Date(r.fechaCreacion || r.date);
              return fecha >= start && fecha <= end;
            });
          }
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(0);
      }

      if (filterPeriod !== 'personalizado') {
        filtered = filtered.filter(r => {
          const fecha = new Date(r.fechaCreacion || r.date);
          return fecha >= startDate;
        });
      }
    }

    // Filtro de tipo
    if (filterTipo !== '') {
      filtered = filtered.filter(r => r.tipoIntervencion === filterTipo);
    }

    // Filtro de estado
    if (filterEstado !== '') {
      filtered = filtered.filter(r => r.estado === filterEstado);
    }

    // Filtro de región
    if (filterRegion !== '') {
      filtered = filtered.filter(r => r.region === filterRegion);
    }

    // Filtro de provincia
    if (filterProvincia !== '') {
      filtered = filtered.filter(r => r.province === filterProvincia);
    }

    // Filtro de usuario
    if (filterUsuario !== '') {
      filtered = filtered.filter(r => r.createdBy === filterUsuario);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          const dateA = new Date(a.fechaCreacion || a.date).getTime();
          const dateB = new Date(b.fechaCreacion || b.date).getTime();
          comparison = dateA - dateB;
          break;
        case 'reportNumber':
          comparison = (a.numeroReporte || a.reportNumber || '').localeCompare(b.numeroReporte || b.reportNumber || '');
          break;
        case 'tipo':
          comparison = (a.tipoIntervencion || '').localeCompare(b.tipoIntervencion || '');
          break;
        case 'estado':
          comparison = (a.estado || '').localeCompare(b.estado || '');
          break;
        case 'kilometraje':
          comparison = (a.kilometraje || 0) - (b.kilometraje || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allReportsFlat, searchQuery, filterPeriod, filterTipo, filterEstado, filterRegion, 
      filterProvincia, filterUsuario, customStartDate, customEndDate, sortField, sortOrder]);

  // Opciones únicas para filtros
  const uniqueOptions = useMemo(() => {
    return {
      tipos: Array.from(new Set(allReportsFlat.map(r => r.tipoIntervencion).filter(Boolean))).sort(),
      estados: Array.from(new Set(allReportsFlat.map(r => r.estado).filter(Boolean))).sort(),
      regions: Array.from(new Set(allReportsFlat.map(r => r.region).filter(Boolean))).sort(),
      provincias: Array.from(new Set(allReportsFlat.map(r => r.province).filter(Boolean))).sort(),
      usuarios: Array.from(new Set(allReportsFlat.map(r => r.createdBy).filter(Boolean))).sort()
    };
  }, [allReportsFlat]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const totalKm = filteredReports.reduce((sum, r) => sum + (r.kilometraje || 0), 0);
    const completados = filteredReports.filter(r => r.estado === 'completado' || r.estado === 'aprobado').length;
    const pendientes = filteredReports.filter(r => r.estado === 'pendiente').length;
    const enProgreso = filteredReports.filter(r => r.estado === 'en progreso').length;

    return {
      total: filteredReports.length,
      completados,
      pendientes,
      enProgreso,
      totalKm,
      promedioKm: filteredReports.length > 0 ? totalKm / filteredReports.length : 0
    };
  }, [filteredReports]);

  // Funciones de utilidad
  const limpiarFiltros = () => {
    setSearchQuery('');
    setFilterPeriod('todos');
    setFilterTipo('');
    setFilterEstado('');
    setFilterRegion('');
    setFilterProvincia('');
    setFilterUsuario('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleRegion = (regionName: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionName)) {
      newExpanded.delete(regionName);
      setSelectedRegion(null);
    } else {
      newExpanded.add(regionName);
      setSelectedRegion(regionName);
    }
    setExpandedRegions(newExpanded);
    setExpandedProvinces(new Set());
    setExpandedDistricts(new Set());
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedReport(null);
  };

  const toggleProvince = (provinceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedProvinces);
    if (newExpanded.has(provinceName)) {
      newExpanded.delete(provinceName);
      setSelectedProvince(null);
    } else {
      newExpanded.add(provinceName);
      setSelectedProvince(provinceName);
    }
    setExpandedProvinces(newExpanded);
    setExpandedDistricts(new Set());
    setSelectedDistrict(null);
    setSelectedReport(null);
  };

  const toggleDistrict = (districtName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(districtName)) {
      newExpanded.delete(districtName);
      setSelectedDistrict(null);
    } else {
      newExpanded.add(districtName);
      setSelectedDistrict(districtName);
    }
    setExpandedDistricts(newExpanded);
    setSelectedReport(null);
  };

  const viewReport = (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
  };

  const closeReportView = () => {
    setSelectedReport(null);
  };

  const getProgressPercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  // Calcular el máximo para cada nivel
  const maxRegionInterventions = Math.max(...regionsData.map(r => r.interventions));
  
  const getMaxProvinceInterventions = (regionName: string) => {
    const region = regionsData.find(r => r.name === regionName);
    if (!region) return 1;
    return Math.max(...region.provinces.map(p => p.interventions));
  };

  const getMaxDistrictInterventions = (regionName: string, provinceName: string) => {
    const region = regionsData.find(r => r.name === regionName);
    if (!region) return 1;
    const province = region.provinces.find(p => p.name === provinceName);
    if (!province) return 1;
    return Math.max(...province.districts.map(d => d.interventions));
  };

  // Modal de detalle del reporte (cuando se selecciona uno)
  if (selectedReport) {
    return (
      <div className="detailed-report-modal">
        <div className="report-viewer">
          <div className="report-viewer-header">
            <h2>📄 Informe Completo - #{selectedReport.reportNumber}</h2>
            <div className="report-actions-buttons">
              <button 
                className="report-edit-btn"
                onClick={() => {
                  if (onEditReport) {
                    onEditReport(selectedReport);
                  } else {
                    alert('No se ha configurado la función de edición');
                  }
                }}
                title="Editar reporte"
              >
                ✏️ Editar
              </button>
              {isAdmin && (
                <button 
                  className="report-delete-btn"
                  onClick={() => deleteReport(selectedReport.id, selectedReport.reportNumber)}
                  title="Eliminar reporte"
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>
          <div className="report-viewer-content">
            {/* Información General */}
            <div className="report-section">
              <h3 className="section-title">📋 Información General</h3>
              <div className="report-grid">
                <div className="report-field">
                  <label>Número de Reporte:</label>
                  <div className="field-value">{selectedReport.reportNumber}</div>
                </div>
                <div className="report-field">
                  <label>Creado por:</label>
                  <div className="field-value">{selectedReport.createdBy}</div>
                </div>
                <div className="report-field">
                  <label>Fecha de Creación:</label>
                  <div className="field-value">{selectedReport.date}</div>
                </div>
                <div className="report-field">
                  <label>Tipo de Intervención:</label>
                  <div className="field-value">{selectedReport.tipoIntervencion}</div>
                </div>
              </div>
            </div>

            {/* Ubicación Geográfica */}
            <div className="report-section">
              <h3 className="section-title">📍 Ubicación Geográfica</h3>
              <div className="report-grid">
                <div className="report-field">
                  <label>Región:</label>
                  <div className="field-value">{selectedReport.region}</div>
                </div>
                <div className="report-field">
                  <label>Provincia:</label>
                  <div className="field-value">{selectedReport.province}</div>
                </div>
                <div className="report-field">
                  <label>Distrito:</label>
                  <div className="field-value">{selectedReport.district}</div>
                </div>
                <div className="report-field">
                  <label>Municipio:</label>
                  <div className="field-value">{selectedReport.municipio}</div>
                </div>
                <div className="report-field">
                  <label>Sector:</label>
                  <div className="field-value">{selectedReport.sector}</div>
                </div>
              </div>
            </div>

            {/* Datos Métricos */}
            {selectedReport.metricData && Object.keys(selectedReport.metricData).length > 0 && (
              <div className="report-section">
                <h3 className="section-title">📊 Datos Métricos</h3>
                <div className="report-grid">
                  {Object.entries(selectedReport.metricData).map(([key, value]) => (
                    <div key={key} className="report-field">
                      <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                      <div className="field-value">
                        {value} {getUnitForMetric(key)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="report-field total-interventions">
                  <label>Total de Intervenciones:</label>
                  <div className="field-value highlight">{selectedReport.totalInterventions}</div>
                </div>
              </div>
            )}

            {/* Coordenadas GPS */}
            {selectedReport.gpsData && (
              <div className="report-section">
                <h3 className="section-title">🌍 Coordenadas GPS</h3>
                <div className="report-grid">
                  {selectedReport.gpsData.punto_inicial && (
                    <div className="report-field">
                      <label>Punto Inicial:</label>
                      <div className="field-value gps-coords">
                        <span>Lat: {selectedReport.gpsData.punto_inicial.lat.toFixed(6)}°</span>
                        <span>Lon: {selectedReport.gpsData.punto_inicial.lon.toFixed(6)}°</span>
                      </div>
                    </div>
                  )}
                  {selectedReport.gpsData.punto_alcanzado && (
                    <div className="report-field">
                      <label>Punto Alcanzado:</label>
                      <div className="field-value gps-coords">
                        <span>Lat: {selectedReport.gpsData.punto_alcanzado.lat.toFixed(6)}°</span>
                        <span>Lon: {selectedReport.gpsData.punto_alcanzado.lon.toFixed(6)}°</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Imágenes */}
            {selectedReport.images && selectedReport.images.length > 0 && (
              <div className="report-section">
                <h3 className="section-title">📷 Imágenes del Proyecto</h3>
                <div className="images-grid">
                  {selectedReport.images.map((img, idx) => (
                    <div key={idx} className="image-item">
                      <img src={img} alt={`Imagen ${idx + 1}`} />
                      <span className="image-label">Imagen {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {selectedReport.observations && (
              <div className="report-section">
                <h3 className="section-title">📝 Observaciones</h3>
                <div className="observations-box">
                  {selectedReport.observations}
                </div>
              </div>
            )}
          </div>
          <div className="report-viewer-footer">
            <button className="btn-secondary" onClick={closeReportView}>Cerrar Informe</button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function para obtener unidades de medida
  function getUnitForMetric(key: string): string {
    const units: Record<string, string> = {
      longitud_limpiada: 'm',
      ancho_canal: 'm',
      profundidad_canal: 'm',
      volumen_excavado: 'm³',
      altura_presa: 'm',
      longitud_cresta: 'm',
      capacidad_almacenamiento: 'm³',
      longitud_drenaje: 'm',
      diametro_tuberia: 'm',
      longitud_camino: 'm',
      ancho_camino: 'm',
      espesor_capa: 'm',
      longitud_puente: 'm',
      ancho_puente: 'm',
      numero_vanos: 'unidades'
    };
    return units[key] || '';
  }

  // Vista principal con filtros avanzados y múltiples modos
  return (
    <div className="detailed-report-view">
      {/* Header mejorado */}
      <div className="header">
        <div className="header-left">
          <h2>📊 Informes y Estadísticas Detalladas</h2>
          <p className="header-subtitle">Análisis completo de intervenciones viales</p>
        </div>
        <div className="header-right">
          <div className="view-mode-selector">
            <button 
              className={`view-mode-btn ${viewMode === 'hierarchy' ? 'active' : ''}`}
              onClick={() => setViewMode('hierarchy')}
            >
              🌳 Jerarquía
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Tabla
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              📈 Estadísticas
            </button>
          </div>
        </div>
      </div>

      {/* Panel de filtros avanzados */}
      <div className="advanced-filters-panel">
        <div className="filters-header-row">
          <h3>🔍 Filtros Avanzados</h3>
          <button className="btn-clear-filters" onClick={limpiarFiltros}>
            🗑️ Limpiar Filtros
          </button>
        </div>

        <div className="filters-grid-compact">
          {/* Búsqueda */}
          <div className="filter-item">
            <input
              type="text"
              className="filter-input-search"
              placeholder="🔎 Buscar en informes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Período */}
          <div className="filter-item">
            <select 
              className="filter-select-compact"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
            >
              <option value="todos">📅 Todos los períodos</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="trimestre">Este trimestre</option>
              <option value="año">Este año</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Fechas personalizadas */}
          {filterPeriod === 'personalizado' && (
            <>
              <div className="filter-item">
                <input
                  type="date"
                  className="filter-input-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="filter-item">
                <input
                  type="date"
                  className="filter-input-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Región */}
          <div className="filter-item">
            <select 
              className="filter-select-compact"
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="">🗺️ Todas las regiones</option>
              {uniqueOptions.regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Provincia */}
          <div className="filter-item">
            <select 
              className="filter-select-compact"
              value={filterProvincia}
              onChange={(e) => setFilterProvincia(e.target.value)}
            >
              <option value="">🏙️ Todas las provincias</option>
              {uniqueOptions.provincias.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="filter-item">
            <select 
              className="filter-select-compact"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">🛣️ Todos los tipos</option>
              {uniqueOptions.tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="filter-item">
            <select 
              className="filter-select-compact"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="">📌 Todos los estados</option>
              {uniqueOptions.estados.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Usuario (solo para roles con permisos) */}
          {user && user.role !== 'Técnico' && (
            <div className="filter-item">
              <select 
                className="filter-select-compact"
                value={filterUsuario}
                onChange={(e) => setFilterUsuario(e.target.value)}
              >
                <option value="">👤 Todos los usuarios</option>
                {uniqueOptions.usuarios.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas resumidas */}
      <div className="stats-summary-compact">
        <div className="stat-box-compact">
          <div className="stat-icon-compact">📊</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.total}</div>
            <div className="stat-label-compact">Total Informes</div>
          </div>
        </div>
        <div className="stat-box-compact">
          <div className="stat-icon-compact">✅</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.completados}</div>
            <div className="stat-label-compact">Completados</div>
          </div>
        </div>
        <div className="stat-box-compact">
          <div className="stat-icon-compact">⏳</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.pendientes}</div>
            <div className="stat-label-compact">Pendientes</div>
          </div>
        </div>
        <div className="stat-box-compact">
          <div className="stat-icon-compact">🔄</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.enProgreso}</div>
            <div className="stat-label-compact">En Progreso</div>
          </div>
        </div>
        <div className="stat-box-compact">
          <div className="stat-icon-compact">📏</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.totalKm.toFixed(1)}</div>
            <div className="stat-label-compact">Km Totales</div>
          </div>
        </div>
        <div className="stat-box-compact">
          <div className="stat-icon-compact">📐</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.promedioKm.toFixed(2)}</div>
            <div className="stat-label-compact">Km Promedio</div>
          </div>
        </div>
      </div>

      {/* Barra de acciones y exportación */}
      <div className="actions-toolbar">
        <div className="results-info">
          Mostrando <strong>{filteredReports.length}</strong> de <strong>{allReportsFlat.length}</strong> informes
        </div>
        <div className="export-buttons">
          <button className="btn-export" onClick={handlePrint}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Contenido según modo de vista */}
      {viewMode === 'hierarchy' && (
        <div className="hierarchy-container">
          <div className="hierarchy-tree">
            {regionsData.map((region) => (
              <div key={region.name} className="hierarchy-item region-item">
                <div 
                  className="hierarchy-row"
                  onClick={() => toggleRegion(region.name)}
                  data-count={`${region.interventions} reportes`}
                >
                  <div className="hierarchy-info">
                    <span className="expand-icon">{expandedRegions.has(region.name) ? '▼' : '▶'}</span>
                    <span className="hierarchy-name">{region.name}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill"
                      style={{ width: `${getProgressPercentage(region.interventions, maxRegionInterventions)}%` }}
                    />
                  </div>
                </div>

                {expandedRegions.has(region.name) && (
                  <div className="hierarchy-children">
                    {region.provinces.length === 0 ? (
                      <div className="empty-message">No hay provincias con intervenciones registradas</div>
                    ) : (
                      region.provinces.map((province) => (
                        <div key={province.name} className="hierarchy-item province-item">
                          <div 
                            className="hierarchy-row"
                            onClick={(e) => toggleProvince(province.name, e)}
                            data-count={`${province.interventions} reportes`}
                          >
                            <div className="hierarchy-info">
                              <span className="expand-icon">{expandedProvinces.has(province.name) ? '▼' : '▶'}</span>
                              <span className="hierarchy-name">{province.name}</span>
                            </div>
                            <div className="progress-bar-container">
                              <div 
                                className="progress-bar-fill"
                                style={{ width: `${getProgressPercentage(province.interventions, getMaxProvinceInterventions(region.name))}%` }}
                              />
                            </div>
                          </div>

                          {expandedProvinces.has(province.name) && (
                            <div className="hierarchy-children">
                              {province.districts.map((district) => (
                                <div key={district.name} className="hierarchy-item district-item">
                                  <div 
                                    className="hierarchy-row"
                                    onClick={(e) => toggleDistrict(district.name, e)}
                                    data-count={`${district.interventions} reportes`}
                                  >
                                    <div className="hierarchy-info">
                                      <span className="expand-icon">{expandedDistricts.has(district.name) ? '▼' : '▶'}</span>
                                      <span className="hierarchy-name">{district.name}</span>
                                    </div>
                                  </div>

                                  {expandedDistricts.has(district.name) && (
                                    <div className="reports-list">
                                      {district.reports.map((report) => (
                                        <div 
                                          key={report.id}
                                          className="report-item"
                                        >
                                          <div
                                            className="report-info"
                                            onClick={(e) => viewReport(report, e)}
                                          >
                                            <span className="report-number">#{report.reportNumber}</span>
                                            <span className="report-creator">{report.createdBy}</span>
                                            <span className="report-date">{report.date}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <div className="table-view-container">
          <table className="detailed-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('reportNumber')}>
                  # Reporte {sortField === 'reportNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('date')}>
                  Fecha {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Región</th>
                <th>Provincia</th>
                <th>Distrito</th>
                <th className="sortable" onClick={() => handleSort('tipo')}>
                  Tipo {sortField === 'tipo' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('estado')}>
                  Estado {sortField === 'estado' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('kilometraje')}>
                  Km {sortField === 'kilometraje' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Usuario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data-cell">
                    <div className="no-data-content">
                      <div className="no-data-icon">📭</div>
                      <p>No se encontraron informes con los filtros aplicados</p>
                      <button className="btn-clear-inline" onClick={limpiarFiltros}>
                        Limpiar Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="report-num-cell">#{report.reportNumber}</td>
                    <td>{report.date}</td>
                    <td>{report.region}</td>
                    <td>{report.province}</td>
                    <td>{report.district}</td>
                    <td>{report.tipoIntervencion}</td>
                    <td>
                      <span className={`badge-status badge-${report.estado?.toLowerCase().replace(' ', '-') || 'pendiente'}`}>
                        {report.estado || 'Pendiente'}
                      </span>
                    </td>
                    <td className="km-cell">{report.kilometraje?.toFixed(2) || 'N/A'} km</td>
                    <td className="user-cell">{report.createdBy}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-view-icon"
                          onClick={(e) => viewReport(report, e)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="stats-view-container">
          <h3>📊 Estadísticas por Tipo de Intervención</h3>
          <p className="stats-subtitle">Totales calculados desde punto inicial hasta punto final (GPS)</p>
          
          <div className="intervention-stats-grid">
            {(() => {
              // Agrupar por tipo de intervención
              const statsByType: Record<string, {
                count: number;
                totalKm: number;
                reports: Report[];
              }> = {};

              filteredReports.forEach(report => {
                const tipo = report.tipoIntervencion || 'Sin clasificar';
                if (!statsByType[tipo]) {
                  statsByType[tipo] = {
                    count: 0,
                    totalKm: 0,
                    reports: []
                  };
                }
                statsByType[tipo].count++;
                statsByType[tipo].totalKm += report.kilometraje || 0;
                statsByType[tipo].reports.push(report);
              });

              // Convertir a array y ordenar por total de km descendente
              const statsArray = Object.entries(statsByType)
                .map(([tipo, data]) => ({ tipo, ...data }))
                .sort((a, b) => b.totalKm - a.totalKm);

              return statsArray.map((stat, index) => {
                const promedio = stat.count > 0 ? stat.totalKm / stat.count : 0;
                const porcentaje = stats.totalKm > 0 ? (stat.totalKm / stats.totalKm) * 100 : 0;

                return (
                  <div key={stat.tipo} className="intervention-stat-card">
                    <div className="stat-card-header">
                      <div className="stat-rank">#{index + 1}</div>
                      <h4 className="stat-tipo-title">{stat.tipo}</h4>
                    </div>
                    
                    <div className="stat-card-body">
                      <div className="stat-metric">
                        <div className="stat-metric-label">Total Reportes</div>
                        <div className="stat-metric-value">{stat.count}</div>
                      </div>
                      
                      <div className="stat-metric primary">
                        <div className="stat-metric-label">Kilometraje Total</div>
                        <div className="stat-metric-value large">{stat.totalKm.toFixed(2)} km</div>
                      </div>
                      
                      <div className="stat-metric">
                        <div className="stat-metric-label">Promedio por Reporte</div>
                        <div className="stat-metric-value">{promedio.toFixed(2)} km</div>
                      </div>
                      
                      <div className="stat-metric">
                        <div className="stat-metric-label">% del Total</div>
                        <div className="stat-metric-value">{porcentaje.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="stat-progress-bar">
                      <div 
                        className="stat-progress-fill"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    <div className="stat-card-footer">
                      <button 
                        className="btn-view-details"
                        onClick={() => {
                          // Filtrar por este tipo
                          setFilterTipo(stat.tipo);
                          setViewMode('table');
                        }}
                      >
                        Ver Detalles →
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {filteredReports.length === 0 && (
            <div className="no-stats-data">
              <div className="no-data-icon">📊</div>
              <p>No hay datos suficientes para generar estadísticas</p>
              <button className="btn-clear-inline" onClick={limpiarFiltros}>
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailedReportView;
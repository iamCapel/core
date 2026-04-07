import React, { useState, useEffect, useRef } from 'react';
import { reportStorage } from '../services/reportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import PendingReportsModal from './PendingReportsModal';
import DetailedReportView from './DetailedReportView';
import './ReportsPage.css';
import ClickableUsername from './ClickableUsername';

interface User {
  username: string;
  name: string;
  role?: string;
}

interface ReportsPageProps {
  user: User;
  onBack: () => void;
  onEditReport?: (reportId: string) => void;
}

type PageView = 'estadisticas' | 'detallado' | 'exportar' | 'vehiculos';
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
// NOTA: Esta función se mantiene para compatibilidad, pero el cálculo de kilómetros
// intervenidos ahora usa el campo manual 'longitud_intervencion' de las plantillas
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

// Función para calcular días de duración de una actividad
function calcularDiasActividad(obra: any): number {
  // Para reportes multi-día, usar el array diasTrabajo
  if (obra.diasTrabajo && Array.isArray(obra.diasTrabajo) && obra.diasTrabajo.length > 0) {
    return obra.diasTrabajo.length;
  }
  
  // Para reportes normales, calcular la diferencia entre fechas
  const inicio = obra.fechaInicio || obra.fechaProyecto || obra.fechaCreacion;
  const fin = obra.fechaFinal || obra.fechaProyecto || obra.fechaCreacion;
  
  if (!inicio || !fin) return 1;
  
  const fechaInicioDate = new Date(inicio);
  const fechaFinDate = new Date(fin);
  
  // Asegurar que la fecha de inicio no sea mayor que la de fin
  if (fechaInicioDate > fechaFinDate) {
    return 1;
  }
  
  const diffTime = Math.abs(fechaFinDate.getTime() - fechaInicioDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Mínimo 1 día
  return Math.max(1, diffDays + 1);
}

// Función para obtener fechas de inicio y fin de una obra
function obtenerFechasObra(obra: any): { inicio: string; fin: string } {
  // Para reportes multi-día, usar el primer y último día del array
  if (obra.diasTrabajo && Array.isArray(obra.diasTrabajo) && obra.diasTrabajo.length > 0) {
    const diasOrdenados = [...obra.diasTrabajo].sort();
    return {
      inicio: diasOrdenados[0],
      fin: diasOrdenados[diasOrdenados.length - 1]
    };
  }
  
  // Para reportes normales
  return {
    inicio: obra.fechaInicio || obra.fechaProyecto || obra.fechaCreacion || '',
    fin: obra.fechaFinal || obra.fechaProyecto || obra.fechaCreacion || ''
  };
}

// Función para formatear fecha corta
function formatearFechaCorta(fecha: string | undefined): string {
  if (!fecha) return 'N/A';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Componente Vista de Vehículos
const VehiculosView: React.FC<{ user: User; onOpenReport: (reportNumber: string) => void }> = ({ user, onOpenReport }) => {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vehiculosFiltrados, setVehiculosFiltrados] = useState<any[]>([]);
  const [searchFicha, setSearchFicha] = useState('');
  const [viewMode, setViewMode] = useState<'actualidad' | 'buscar'>('actualidad');
  const [selectedVehiculo, setSelectedVehiculo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para exportación
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'dia' | 'semana' | 'mes' | 'personalizado'>('semana');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportando, setExportando] = useState(false);
  
  // Estados para visualización del informe
  const [showInforme, setShowInforme] = useState(false);
  const [informeData, setInformeData] = useState<any>(null);
  const [rangoFechas, setRangoFechas] = useState<{inicio: Date, fin: Date} | null>(null);

  // Estados para modal de detalle de reporte
  const [selectedReporteDetail, setSelectedReporteDetail] = useState<any | null>(null);
  const [showReporteModal, setShowReporteModal] = useState(false);
  
  // Ref para controlar si es la primera carga
  const isFirstLoad = useRef(true);

  useEffect(() => {
    cargarVehiculos(true); // Primera carga con loading
    const interval = setInterval(() => cargarVehiculos(false), 30000); // Actualizar cada 30s sin loading
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode === 'buscar' && searchFicha.trim()) {
      const filtrados = vehiculos.filter(v => 
        v.ficha.toLowerCase().includes(searchFicha.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchFicha.toLowerCase()) ||
        v.tipo.toLowerCase().includes(searchFicha.toLowerCase())
      );
      setVehiculosFiltrados(filtrados);
    } else {
      // En modo "actualidad" o sin búsqueda, mostrar todos los vehículos
      setVehiculosFiltrados(vehiculos);
    }
  }, [searchFicha, vehiculos, viewMode]);

  const cargarVehiculos = async (showLoading: boolean = true) => {
    // Solo mostrar loading en la primera carga
    if (showLoading && isFirstLoad.current) {
      setLoading(true);
    }
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      console.log('📊 Total de reportes cargados:', reportes.length);
      
      // ✅ Filtrar reportes según rol del usuario
      let reportesFiltrados = reportes;
      
      // Admin y Supervisor ven TODO (incluidos pendientes de todos)
      const isAdminOrSupervisor = user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'admin' || user?.role === 'supervisor';
      const isTecnico = user?.role === 'Técnico' || user?.role === 'tecnico';
      
      if (isTecnico) {
        // Técnicos ven TODOS sus reportes (incluidos sus propios pendientes)
        reportesFiltrados = reportes.filter(r => 
          r.usuarioId === user.username
        );
      }
      
      console.log(`🚜 [${user?.role}] Reportes para vehículos:`, reportesFiltrados.length);
      console.log(`🟠 Incluye pendientes propios:`, isTecnico || isAdminOrSupervisor);
      console.log(`📋 Reportes pendientes en lista:`, reportesFiltrados.filter(r => r.estado === 'pendiente').length);
      
      // Agrupar vehículos por ficha
      const vehiculosPorFicha: Record<string, any> = {};
      
      reportesFiltrados.forEach(reporte => {
        if (reporte.vehiculos && Array.isArray(reporte.vehiculos) && reporte.vehiculos.length > 0) {
          console.log(`📋 Reporte ${reporte.numeroReporte} tiene ${reporte.vehiculos.length} vehículos:`, reporte.vehiculos);
          reporte.vehiculos.forEach((vehiculo: any) => {
            // Verificar que el vehículo tenga todos los campos necesarios
            if (!vehiculo.ficha || !vehiculo.tipo || !vehiculo.modelo) {
              console.warn(`⚠️ Vehículo incompleto en reporte ${reporte.numeroReporte}:`, vehiculo);
              return; // Saltar este vehículo
            }
            
            const ficha = vehiculo.ficha.trim();
            
            if (!vehiculosPorFicha[ficha]) {
              vehiculosPorFicha[ficha] = {
                ficha: vehiculo.ficha,
                tipo: vehiculo.tipo,
                modelo: vehiculo.modelo,
                ultimaObra: {
                  fecha: reporte.fechaCreacion,
                  numeroReporte: reporte.numeroReporte,
                  region: reporte.region,
                  provincia: reporte.provincia,
                  municipio: reporte.municipio,
                  sector: reporte.sector,
                  tipoIntervencion: reporte.tipoIntervencion
                },
                totalObras: 1,
                obras: [reporte]
              };
            } else {
              vehiculosPorFicha[ficha].totalObras++;
              vehiculosPorFicha[ficha].obras.push(reporte);
              
              // Actualizar última obra si es más reciente
              if (new Date(reporte.fechaCreacion) > new Date(vehiculosPorFicha[ficha].ultimaObra.fecha)) {
                vehiculosPorFicha[ficha].ultimaObra = {
                  fecha: reporte.fechaCreacion,
                  numeroReporte: reporte.numeroReporte,
                  region: reporte.region,
                  provincia: reporte.provincia,
                  municipio: reporte.municipio,
                  sector: reporte.sector,
                  tipoIntervencion: reporte.tipoIntervencion
                };
              }
            }
          });
        }
      });
      
      const listaVehiculos = Object.values(vehiculosPorFicha).sort((a, b) => 
        new Date(b.ultimaObra.fecha).getTime() - new Date(a.ultimaObra.fecha).getTime()
      );
      
      console.log('🚜 Total de vehículos únicos procesados:', listaVehiculos.length);
      console.log('🚜 Lista de vehículos:', listaVehiculos);
      
      setVehiculos(listaVehiculos);
      setVehiculosFiltrados(listaVehiculos);
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
    setLoading(false);
    isFirstLoad.current = false; // Marcar que ya no es la primera carga
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para calcular rango de fechas según periodo
  const calcularRangoFechas = (periodo: 'dia' | 'semana' | 'mes' | 'personalizado') => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date = new Date(hoy);
    
    switch(periodo) {
      case 'dia':
        inicio = new Date(hoy);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'personalizado':
        if (exportStartDate && exportEndDate) {
          inicio = new Date(exportStartDate);
          fin = new Date(exportEndDate);
        } else {
          inicio = new Date(hoy);
        }
        break;
      default:
        inicio = new Date(hoy);
    }
    
    return { inicio, fin };
  };

  // Función para exportar informe de vehículos
  const exportarInformeVehiculos = async () => {
    setExportando(true);
    
    try {
      const { inicio, fin } = calcularRangoFechas(exportPeriod);
      const reportes = await firebaseReportStorage.getAllReports();
      
      // Filtrar reportes por rango de fechas
      const reportesFiltrados = reportes.filter(reporte => {
        const fechaReporte = new Date(reporte.fechaProyecto || reporte.fechaCreacion);
        return fechaReporte >= inicio && fechaReporte <= fin;
      });
      
      // Agrupar vehículos con sus actividades
      const vehiculosConActividades: Record<string, any> = {};
      
      reportesFiltrados.forEach(reporte => {
        if (reporte.vehiculos && Array.isArray(reporte.vehiculos)) {
          reporte.vehiculos.forEach((vehiculo: any) => {
            const ficha = vehiculo.ficha;
            
            if (!vehiculosConActividades[ficha]) {
              vehiculosConActividades[ficha] = {
                ficha: vehiculo.ficha,
                tipo: vehiculo.tipo,
                modelo: vehiculo.modelo,
                actividades: [],
                totalKm: 0,
                diasActivos: new Set(),
                regiones: new Set(),
                provincias: new Set(),
                tiposIntervenciones: new Set()
              };
            }
            
            // Agregar actividad
            vehiculosConActividades[ficha].actividades.push({
              fecha: reporte.fechaProyecto || reporte.fechaCreacion,
              numeroReporte: reporte.numeroReporte,
              tipoIntervencion: reporte.tipoIntervencion,
              region: reporte.region,
              provincia: reporte.provincia,
              distrito: reporte.distrito,
              municipio: reporte.municipio,
              sector: reporte.sector,
              usuario: reporte.creadoPor,
              kilometraje: reporte.kilometraje || 0
            });
            
            // Acumular estadísticas
            vehiculosConActividades[ficha].totalKm += reporte.kilometraje || 0;
            vehiculosConActividades[ficha].diasActivos.add(
              new Date(reporte.fechaProyecto || reporte.fechaCreacion).toDateString()
            );
            vehiculosConActividades[ficha].regiones.add(reporte.region);
            vehiculosConActividades[ficha].provincias.add(reporte.provincia);
            vehiculosConActividades[ficha].tiposIntervenciones.add(reporte.tipoIntervencion);
          });
        }
      });
      
      // Guardar datos para mostrar en el informe
      setInformeData(vehiculosConActividades);
      setRangoFechas({ inicio, fin });
      setShowExportModal(false);
      setShowInforme(true);
      
      // Esperar un momento para que el DOM se renderice y luego imprimir automáticamente
      setTimeout(() => {
        window.print();
      }, 500);
      
    } catch (error) {
      console.error('Error al exportar informe:', error);
      alert('Error al generar el informe. Por favor intente nuevamente.');
    } finally {
      setExportando(false);
    }
  };

  // Función para abrir modal de reporte clickeando en número de reporte
  const abrirDetalleReporte = async (numeroReporte: string) => {
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      const reporte = reportes.find(r => r.numeroReporte === numeroReporte);
      
      if (reporte) {
        // Cargar imágenes del reporte
        console.log('📸 Cargando imágenes del reporte:', reporte.id);
        const { default: firebaseImageStorage } = await import('../services/firebaseImageStorage');
        const imagesPerDay = await firebaseImageStorage.getReportImages(reporte.id);
        console.log('✅ Imágenes cargadas:', imagesPerDay);
        
        // Agregar las imágenes al reporte
        const reporteConImagenes = {
          ...reporte,
          imagesPerDay,
          images: Object.values(imagesPerDay).flat() // Convertir imagesPerDay a array plano para compatibilidad
        };
        
        setSelectedReporteDetail(reporteConImagenes);
        setShowReporteModal(true);
      } else {
        alert('No se encontró el reporte');
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      alert('Error al cargar el reporte');
    }
  };

  const cerrarModalReporte = () => {
    setSelectedReporteDetail(null);
    setShowReporteModal(false);
  };

  // Función para descargar informe como PDF
  const descargarPDF = () => {
    window.print();
  };

  return (
    <div className="vehiculos-container">
      <div className="vehiculos-header">
        <h2 className="vehiculos-title">🚜 Gestión de Vehículos Pesados</h2>
        <p className="vehiculos-subtitle">
          {vehiculos.length} vehículos registrados en el sistema
        </p>
        {/* Mensaje informativo para Admin/Supervisor */}
        {(user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'admin' || user?.role === 'supervisor') && (
          <p style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #2196F3',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0d47a1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <strong>{user.role}:</strong> Los vehículos incluyen datos de reportes <strong>pendientes</strong> de todos los usuarios.
          </p>
        )}
        {/* Mensaje informativo para Técnico */}
        {(user?.role === 'Técnico' || user?.role === 'tecnico') && (
          <p style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#f1f8e9',
            border: '1px solid #8bc34a',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#33691e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>✅</span>
            <strong>Técnico:</strong> Los vehículos incluyen datos de <strong>tus reportes pendientes</strong>.
          </p>
        )}
      </div>

      <div className="vehiculos-controls">
        <div className="vehiculos-mode-selector">
          <button
            className={`mode-btn ${viewMode === 'actualidad' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('actualidad');
              setSearchFicha(''); // Limpiar búsqueda al cambiar a actualidad
            }}
          >
            📍 Actualidad
          </button>
          <button
            className={`mode-btn ${viewMode === 'buscar' ? 'active' : ''}`}
            onClick={() => setViewMode('buscar')}
          >
            🔍 Buscar
          </button>
        </div>

        {viewMode === 'buscar' && (
          <div className="vehiculos-search">
            <input
              type="text"
              placeholder="Buscar por ficha, modelo o tipo..."
              value={searchFicha}
              onChange={(e) => setSearchFicha(e.target.value)}
              className="search-input"
            />
          </div>
        )}

        <button
          className="btn-export-vehiculos"
          onClick={() => setShowExportModal(true)}
          title="Exportar informe de vehículos"
        >
          📊 Exportar Informe
        </button>
      </div>

      {loading ? (
        <div className="vehiculos-loading">
          <div className="loading-spinner"></div>
          <p>Cargando vehículos...</p>
        </div>
      ) : (
        <div className="vehiculos-lista-compacta">
          {vehiculosFiltrados.map((vehiculo) => (
            <div 
              key={vehiculo.ficha} 
              className={`vehiculo-carpeta ${selectedVehiculo === vehiculo.ficha ? 'abierta' : ''}`}
            >
              <div 
                className="carpeta-header"
                onClick={() => setSelectedVehiculo(
                  selectedVehiculo === vehiculo.ficha ? null : vehiculo.ficha
                )}
              >
                <div className="carpeta-icono">
                  {selectedVehiculo === vehiculo.ficha ? '📂' : '📁'}
                </div>
                <div className="carpeta-info">
                  <span className="carpeta-ficha">{vehiculo.ficha}</span>
                  <span className="carpeta-tipo">{vehiculo.tipo} • {vehiculo.modelo}</span>
                </div>
                <div className="carpeta-badges">
                  <span className="badge-obras">{vehiculo.totalObras} obras</span>
                  <span className="badge-dias">
                    {vehiculo.obras.reduce((total: number, obra: any) => total + calcularDiasActividad(obra), 0)}d
                  </span>
                </div>
                <div className="carpeta-flecha">
                  {selectedVehiculo === vehiculo.ficha ? '▼' : '▶'}
                </div>
              </div>

              {selectedVehiculo === vehiculo.ficha && (
                <div className="carpeta-contenido">
                  <table className="obras-tabla-compacta">
                    <thead>
                      <tr>
                        <th>Reporte</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Días</th>
                        <th>Ubicación</th>
                        <th>Intervención</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehiculo.obras
                        .sort((a: any, b: any) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
                        .map((obra: any, index: number) => {
                          const diasActividad = calcularDiasActividad(obra);
                          const { inicio, fin } = obtenerFechasObra(obra);
                          
                          return (
                            <tr key={`${obra.id}-${index}`}>
                              <td>
                                <span 
                                  className="reporte-link"
                                  onClick={() => onOpenReport(obra.numeroReporte)}
                                >
                                  {obra.numeroReporte}
                                </span>
                              </td>
                              <td className="fecha-celda">{formatearFechaCorta(inicio)}</td>
                              <td className="fecha-celda">{formatearFechaCorta(fin)}</td>
                              <td>
                                <span className={`dias-mini ${diasActividad > 5 ? 'largo' : diasActividad > 1 ? 'medio' : 'corto'}`}>
                                  {diasActividad}
                                </span>
                              </td>
                              <td className="ubicacion-celda">{obra.provincia} › {obra.municipio}</td>
                              <td className="intervencion-celda">{obra.tipoIntervencion}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  <div className="carpeta-resumen">
                    <span>📊 Total: <strong>{vehiculo.obras.reduce((total: number, obra: any) => total + calcularDiasActividad(obra), 0)} días</strong> en {vehiculo.totalObras} actividades</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && vehiculosFiltrados.length === 0 && (
        <div className="vehiculos-empty">
          <div className="empty-icon">🚜</div>
          <h3>No se encontraron vehículos</h3>
          <p>
            {searchFicha ? 
              'No hay vehículos que coincidan con tu búsqueda' : 
              'No hay vehículos registrados en el sistema'}
          </p>
        </div>
      )}

      {/* Modal de Exportación */}
      {showExportModal && (
        <div className="export-modal-overlay">
          <div className="export-modal-container">
            <div className="export-modal-header">
              <h2>📊 Exportar Informe de Vehículos</h2>
              <button 
                className="export-modal-close"
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="export-modal-body">
              <p className="export-modal-description">
                Seleccione el período para generar el informe detallado de actividades y recorridos de los vehículos pesados.
              </p>
              
              <div className="export-period-selector">
                <label className="export-label">Período de Tiempo:</label>
                <div className="period-buttons">
                  <button
                    className={`period-btn ${exportPeriod === 'dia' ? 'active' : ''}`}
                    onClick={() => setExportPeriod('dia')}
                  >
                    📅 Hoy
                  </button>
                  <button
                    className={`period-btn ${exportPeriod === 'semana' ? 'active' : ''}`}
                    onClick={() => setExportPeriod('semana')}
                  >
                    📆 Última Semana
                  </button>
                  <button
                    className={`period-btn ${exportPeriod === 'mes' ? 'active' : ''}`}
                    onClick={() => setExportPeriod('mes')}
                  >
                    📊 Último Mes
                  </button>
                  <button
                    className={`period-btn ${exportPeriod === 'personalizado' ? 'active' : ''}`}
                    onClick={() => setExportPeriod('personalizado')}
                  >
                    🗓️ Personalizado
                  </button>
                </div>
              </div>
              
              {exportPeriod === 'personalizado' && (
                <div className="export-custom-dates">
                  <div className="date-input-group">
                    <label>Fecha Inicio:</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label>Fecha Fin:</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                </div>
              )}
              
              <div className="export-info-box">
                <h4>📋 El informe incluirá:</h4>
                <ul>
                  <li>✓ Lista completa de vehículos activos en el período</li>
                  <li>✓ Todas las actividades y ubicaciones registradas</li>
                  <li>✓ Recorridos totales por vehículo (kilometraje)</li>
                  <li>✓ Estadísticas por región y provincia</li>
                  <li>✓ Detalles de cada intervención</li>
                  <li>✓ Usuarios responsables de cada registro</li>
                </ul>
              </div>
            </div>
            
            <div className="export-modal-footer">
              <button
                className="btn-cancel-export"
                onClick={() => setShowExportModal(false)}
                disabled={exportando}
              >
                Cancelar
              </button>
              <button
                className="btn-generate-export"
                onClick={exportarInformeVehiculos}
                disabled={exportando || (exportPeriod === 'personalizado' && (!exportStartDate || !exportEndDate))}
              >
                {exportando ? '⏳ Generando...' : '📊 Generar Informe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Informe Generado */}
      {showInforme && informeData && rangoFechas && (
        <div className="informe-fullscreen-modal">
          <div className="informe-container">
            {/* Header del informe */}
            <div className="informe-header">
              <div className="informe-title-section">
                <h1>🚜 INFORME DE VEHÍCULOS PESADOS</h1>
                <p className="informe-subtitle">Ministerio de Obras Públicas y Comunicaciones</p>
              </div>
              <button 
                className="informe-close-btn"
                onClick={() => setShowInforme(false)}
              >
                ✕
              </button>
            </div>

            {/* Información del período */}
            <div className="informe-period">
              <p><strong>Período del Informe:</strong> {rangoFechas.inicio.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })} al {rangoFechas.fin.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}</p>
              <p>Generado el {new Date().toLocaleString('es-ES')}</p>
            </div>

            {/* Botón de descarga PDF */}
            <div className="informe-actions">
              <button 
                className="btn-descargar-pdf"
                onClick={descargarPDF}
              >
                📄 Descargar PDF
              </button>
            </div>

            {/* Contenido del informe */}
            <div className="informe-content" id="informe-content">
              {/* Resumen de estadísticas */}
              <div className="informe-summary">
                <div className="informe-stat-card">
                  <span className="informe-stat-value">{Object.keys(informeData).length}</span>
                  <span className="informe-stat-label">Vehículos Activos</span>
                </div>
                <div className="informe-stat-card">
                  <span className="informe-stat-value">
                    {Object.values(informeData).reduce((sum: number, v: any) => sum + v.actividades.length, 0)}
                  </span>
                  <span className="informe-stat-label">Total Actividades</span>
                </div>
                <div className="informe-stat-card">
                  <span className="informe-stat-value">
                    {Object.values(informeData).reduce((sum: number, v: any) => sum + v.totalKm, 0).toFixed(1)} km
                  </span>
                  <span className="informe-stat-label">Kilometraje Total</span>
                </div>
                <div className="informe-stat-card">
                  <span className="informe-stat-value">
                    {new Set(Object.values(informeData).flatMap((v: any) => Array.from(v.provincias))).size}
                  </span>
                  <span className="informe-stat-label">Provincias Cubiertas</span>
                </div>
              </div>

              {/* Lista de vehículos - Formato Tabla Compacta */}
              <div className="informe-vehiculos-tabla-compacta">
                <table className="tabla-vehiculos-compacta">
                  <thead>
                    <tr>
                      <th>Tipo de Vehículo</th>
                      <th>Ficha</th>
                      <th>Total Actividades</th>
                      <th>Última Actividad</th>
                      <th>Última Ubicación</th>
                      <th>Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(informeData).map((vehiculo: any) => {
                      // Obtener la última actividad (más reciente)
                      const ultimaActividad = vehiculo.actividades
                        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
                      
                      return (
                        <tr key={vehiculo.ficha}>
                          <td className="tipo-vehiculo-cell">
                            <span className="vehiculo-icon">🚜</span>
                            <div className="vehiculo-info">
                              <div className="tipo-nombre">{vehiculo.tipo}</div>
                              <div className="modelo-nombre">{vehiculo.modelo}</div>
                            </div>
                          </td>
                          <td className="ficha-cell">
                            <span className="ficha-badge">{vehiculo.ficha}</span>
                          </td>
                          <td className="actividades-cell">
                            <span className="actividades-count">{vehiculo.actividades.length}</span>
                            <span className="actividades-label">actividades</span>
                          </td>
                          <td className="ultima-actividad-cell">
                            <div className="actividad-tipo">{ultimaActividad.tipoIntervencion}</div>
                            <div className="actividad-fecha">
                              {new Date(ultimaActividad.fecha).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="ubicacion-cell">
                            <div className="ubicacion-principal">
                              📍 {ultimaActividad.provincia}, {ultimaActividad.municipio}
                            </div>
                            <div className="ubicacion-detalle">
                              {ultimaActividad.sector}
                            </div>
                          </td>
                          <td className="usuario-cell">
                            <div className="usuario-info">
                              <span className="usuario-icon">👤</span>
                              <span className="usuario-nombre">{ultimaActividad.usuario}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer del informe */}
              <div className="informe-footer">
                <p><strong>Ministerio de Obras Públicas y Comunicaciones (MOPC)</strong></p>
                <p>Sistema de Gestión de Vehículos Pesados</p>
                <p>Documento generado automáticamente - {new Date().toLocaleString('es-ES')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle del Reporte */}
      {showReporteModal && selectedReporteDetail && (
        <div className="reporte-detail-modal-overlay" onClick={cerrarModalReporte}>
          <div className="reporte-detail-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="reporte-detail-header">
              <h2>📄 Reporte #{selectedReporteDetail.numeroReporte}</h2>
              <button className="reporte-close-btn" onClick={cerrarModalReporte}>✕</button>
            </div>
            
            <div className="reporte-detail-content">
              {/* Información General */}
              <div className="reporte-section">
                <h3 className="reporte-section-title">📋 Información General</h3>
                <div className="reporte-grid">
                  <div className="reporte-field">
                    <label>Número de Reporte:</label>
                    <div className="field-value">{selectedReporteDetail.numeroReporte}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Creado por:</label>
                    <div className="field-value">
                      <ClickableUsername 
                        username={selectedReporteDetail.creadoPor}
                      />
                    </div>
                  </div>
                  <div className="reporte-field">
                    <label>Fecha de Creación:</label>
                    <div className="field-value">{new Date(selectedReporteDetail.fechaCreacion).toLocaleString('es-ES')}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Fecha de Inicio del Proyecto:</label>
                    <div className="field-value">{new Date(selectedReporteDetail.fechaInicio || selectedReporteDetail.fechaProyecto || selectedReporteDetail.fechaCreacion).toLocaleDateString('es-ES')}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Estado:</label>
                    <div className={`field-value estado-badge estado-${selectedReporteDetail.estado?.toLowerCase()}`}>
                      {selectedReporteDetail.estado || 'Aprobado'}
                    </div>
                  </div>
                  <div className="reporte-field">
                    <label>Tipo de Intervención:</label>
                    <div className="field-value">{selectedReporteDetail.tipoIntervencion}</div>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="reporte-section">
                <h3 className="reporte-section-title">📍 Ubicación</h3>
                <div className="reporte-grid">
                  <div className="reporte-field">
                    <label>Región:</label>
                    <div className="field-value">{selectedReporteDetail.region}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Provincia:</label>
                    <div className="field-value">{selectedReporteDetail.provincia}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Distrito:</label>
                    <div className="field-value">{selectedReporteDetail.distrito}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Municipio:</label>
                    <div className="field-value">{selectedReporteDetail.municipio}</div>
                  </div>
                  <div className="reporte-field">
                    <label>Sector:</label>
                    <div className="field-value">{selectedReporteDetail.sector}</div>
                  </div>
                  {selectedReporteDetail.kilometraje && (
                    <div className="reporte-field">
                      <label>Kilometraje:</label>
                      <div className="field-value">{selectedReporteDetail.kilometraje.toFixed(2)} km</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehículos */}
              {selectedReporteDetail.vehiculos && selectedReporteDetail.vehiculos.length > 0 && (
                <div className="reporte-section">
                  <h3 className="reporte-section-title">🚜 Vehículos Utilizados</h3>
                  <div className="reporte-vehiculos-list">
                    {selectedReporteDetail.vehiculos.map((vehiculo: any, idx: number) => (
                      <div key={idx} className="reporte-vehiculo-item">
                        <div className="vehiculo-icon">🚜</div>
                        <div className="vehiculo-details">
                          <div><strong>Tipo:</strong> {vehiculo.tipo}</div>
                          <div><strong>Modelo:</strong> {vehiculo.modelo}</div>
                          <div><strong>Ficha:</strong> {vehiculo.ficha}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalles de la Intervención */}
              {selectedReporteDetail.plantilla && Object.keys(selectedReporteDetail.plantilla).length > 0 && (
                <div className="reporte-section">
                  <h3 className="reporte-section-title">🔧 Detalles de la Intervención</h3>
                  <div className="reporte-plantilla-grid">
                    {Object.entries(selectedReporteDetail.plantilla).map(([key, value]: [string, any]) => (
                      <div key={key} className="reporte-plantilla-item">
                        <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                        <div className="plantilla-value">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordenadas GPS */}
              {selectedReporteDetail.gpsData && (
                <div className="reporte-section">
                  <h3 className="reporte-section-title">🗺️ Coordenadas GPS</h3>
                  <div className="reporte-grid">
                    {selectedReporteDetail.gpsData.punto_inicial && (
                      <div className="reporte-field">
                        <label>Punto Inicial:</label>
                        <div className="field-value">
                          Lat: {selectedReporteDetail.gpsData.punto_inicial.lat}, 
                          Lon: {selectedReporteDetail.gpsData.punto_inicial.lon}
                        </div>
                      </div>
                    )}
                    {selectedReporteDetail.gpsData.punto_alcanzado && (
                      <div className="reporte-field">
                        <label>Punto Alcanzado:</label>
                        <div className="field-value">
                          Lat: {selectedReporteDetail.gpsData.punto_alcanzado.lat}, 
                          Lon: {selectedReporteDetail.gpsData.punto_alcanzado.lon}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Imágenes */}
              {selectedReporteDetail.images && selectedReporteDetail.images.length > 0 && (
                <div className="reporte-section">
                  <h3 className="reporte-section-title">📷 Imágenes</h3>
                  <div className="reporte-images-grid">
                    {selectedReporteDetail.images.map((img: string, idx: number) => (
                      <div key={idx} className="reporte-image-item">
                        <img src={img} alt={`Imagen ${idx + 1}`} />
                        <span className="image-label">Imagen {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedReporteDetail.observaciones && (
                <div className="reporte-section">
                  <h3 className="reporte-section-title">📝 Observaciones</h3>
                  <div className="reporte-observaciones-box">
                    {selectedReporteDetail.observaciones}
                  </div>
                </div>
              )}
            </div>

            <div className="reporte-detail-footer">
              <button className="btn-cerrar-reporte" onClick={cerrarModalReporte}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onBack, onEditReport }) => {
  const [currentView, setCurrentView] = useState<PageView>('estadisticas');
  const [statsMode, setStatsMode] = useState<StatsMode>('intervenciones');
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [regionesData, setRegionesData] = useState<RegionData[]>([]);
  const [provinciasData, setProvinciasData] = useState<Array<ProvinciaData & { region: string, regionIcon: string, regionColor: string }>>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingReportsList, setPendingReportsList] = useState<any[]>([]);
  const [expandedProvincias, setExpandedProvincias] = useState<Set<string>>(new Set());
  const [expandedMunicipios, setExpandedMunicipios] = useState<Set<string>>(new Set());
  const [municipioReportes, setMunicipioReportes] = useState<Record<string, any[]>>({});
  
  // Estados para el sistema de exportación
  const [exportSelectedRegion, setExportSelectedRegion] = useState<RegionData | null>(null);
  const [exportSelectedProvincia, setExportSelectedProvincia] = useState<ProvinciaData | null>(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportType, setExportType] = useState<'region' | 'provincia' | 'municipio'>('region');

  useEffect(() => {
    cargarDatosRegiones();
    const interval = setInterval(cargarDatosRegiones, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar contador de pendientes
  const updatePendingCount = async () => {
    try {
      const reports = await getPendingReports();
      setPendingReportsList(reports);
      setPendingCount(reports.length);
    } catch (error) {
      console.error('Error actualizando contador de pendientes:', error);
      setPendingCount(0);
      setPendingReportsList([]);
    }
  };

  const getPendingReports = async () => {
    try {
      // Obtener reportes con estado 'pendiente' de Firebase
      const allPending = await firebaseReportStorage.getReportsByEstado('pendiente');
      
      // Filtrar por usuario si es técnico
      const userPending = (user?.role === 'Técnico' || user?.role === 'tecnico')
        ? allPending.filter(report => 
            report.usuarioId === user?.username
          )
        : allPending;

      return userPending.map(report => ({
        id: report.id,
        reportNumber: report.numeroReporte || `DCR-${report.id.slice(-6)}`,
        timestamp: report.timestamp || report.fechaCreacion,
        estado: report.estado,
        region: report.region || 'N/A',
        provincia: report.provincia || 'N/A',
        municipio: report.municipio || 'N/A',
        tipoIntervencion: report.tipoIntervencion || 'No especificado'
      }));
    } catch (error) {
      console.error('Error obteniendo reportes pendientes:', error);
      return [];
    }
  };

  const handleContinuePendingReport = async (reportId: string) => {
    try {
      console.log('📋 Continuando reporte pendiente desde ReportsPage:', reportId);
      
      // Cerrar el modal de notificaciones
      setShowPendingModal(false);
      
      // Usar la prop onEditReport si está disponible
      if (onEditReport) {
        // Dashboard se encargará de cargar el reporte completo y mostrar el formulario
        onEditReport(reportId);
      } else {
        console.warn('⚠️ onEditReport no está disponible en ReportsPage');
        alert('No se puede editar el reporte desde esta vista. Por favor regrese al Dashboard.');
      }
    } catch (error) {
      console.error('❌ Error al continuar reporte pendiente:', error);
      alert('Error al cargar el reporte. Por favor intente nuevamente.');
    }
  };

  const handleCancelPendingReport = async (reportId: string) => {
    try {
      // Eliminar de Firebase
      await firebaseReportStorage.deleteReport(reportId);
      console.log('✅ Reporte pendiente eliminado de Firebase');
      // Actualizar la lista
      await updatePendingCount();
    } catch (error) {
      console.error('❌ Error eliminando reporte pendiente:', error);
      alert('Error al eliminar el reporte pendiente. Verifique su conexión a internet.');
    }
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
        allReports = allReports.filter(report => report.usuarioId === user.username);
      }
    } catch (error) {
      console.error('Error cargando reportes de Firebase:', error);
      // Fallback a localStorage si falla Firebase
      stats = reportStorage.getStatistics();
      allReports = reportStorage.getAllReports();
      
      // Filtrar reportes para usuarios técnicos - solo ven sus propios reportes
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        allReports = allReports.filter(report => report.usuarioId === user.username);
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
      
      // Calcular kilometraje total de la región desde campo manual
      const kmTotal = reportesRegion.reduce((sum, report) => {
        const longitudIntervencion = parseFloat(report.metricData?.longitud_intervencion || '0');
        return sum + (longitudIntervencion || 0);
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

        // Los reportes con estado 'pendiente' NO se incluyen en estadísticas
        if (report.estado === 'completado' || report.estado === 'aprobado') {
          // Si es multi-día, contar cada día como una intervención separada
          const numDias = (report.esProyectoMultiDia && report.diasTrabajo) ? report.diasTrabajo.length : 1;
          
          currentProv.total += numDias;
          currentProv.completados += numDias;
          currentMun.total += numDias;
          currentMun.completados += numDias;
          
          // Obtener kilometraje desde campo manual de la plantilla
          const longitudIntervencion = parseFloat(report.metricData?.longitud_intervencion || '0');
          currentProv.kilometraje += (longitudIntervencion || 0);
          currentMun.kilometraje += (longitudIntervencion || 0);
        }
        // Los reportes 'pendiente', 'borrador', 'en_revision', 'rechazado' se ignoran en estadísticas

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
    
    // Extraer todas las provincias de todas las regiones para vista directa
    const todasProvincias = regiones.flatMap(region => 
      region.provincias.map(provincia => ({
        ...provincia,
        region: region.name,
        regionIcon: region.icon,
        regionColor: region.color
      }))
    );
    
    // Ordenar provincias por kilometraje descendente
    todasProvincias.sort((a, b) => b.kilometraje - a.kilometraje);
    setProvinciasData(todasProvincias);
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

  const toggleMunicipioExpansion = async (regionId: number, provinciaNombre: string, municipioNombre: string) => {
    const key = `${regionId}-${provinciaNombre}-${municipioNombre}`;
    // Obtener nombre de región desde REGIONES_BASE
    const regionData = REGIONES_BASE.find(r => r.id === regionId);
    const regionNombre = regionData?.name || '';
    
    setExpandedMunicipios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        // Cargar reportes del municipio si aún no están cargados
        if (!municipioReportes[key]) {
          loadMunicipioReportes(key, regionNombre, provinciaNombre, municipioNombre);
        }
      }
      return newSet;
    });
  };

  const loadMunicipioReportes = async (key: string, regionNombre: string, provinciaNombre: string, municipioNombre: string) => {
    try {
      // Obtener todos los reportes
      let allReports = await firebaseReportStorage.getAllReports();
      
      // Filtrar por usuario si es técnico
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        allReports = allReports.filter(report => report.usuarioId === user.username);
      }

      // Filtrar reportes del municipio
      const regionKey = regionNombre.toLowerCase();
      const reportesMunicipioBase = allReports.filter(r => 
        r.region?.toLowerCase() === regionKey &&
        r.provincia === provinciaNombre &&
        r.municipio === municipioNombre &&
        (r.estado === 'completado' || r.estado === 'aprobado')
      );

      // Expandir reportes multi-días en reportes individuales por día
      const reportesExpandidos: any[] = [];
      
      reportesMunicipioBase.forEach(reporte => {
        // Si es multi-día, crear un reporte por cada día
        if (reporte.esProyectoMultiDia && reporte.diasTrabajo && reporte.diasTrabajo.length > 0) {
          reporte.diasTrabajo.forEach((dia: string, index: number) => {
            const dayData = reporte.reportesPorDia?.[dia] || {};
            reportesExpandidos.push({
              ...reporte,
              numeroReporte: `${reporte.numeroReporte} (Día ${index + 1}/${reporte.diasTrabajo?.length || 0})`,
              fechaInicio: dia,
              fechaProyecto: dia,
              metricData: dayData.metricData || reporte.metricData || {},
              observaciones: dayData.observaciones || reporte.observaciones,
              vehiculos: dayData.vehiculos || reporte.vehiculos || [],
              _diaNumero: index + 1,
              _totalDias: reporte.diasTrabajo?.length || 0,
              _esExpansionMultiDia: true
            });
          });
        } else {
          // Reporte normal de un solo día
          reportesExpandidos.push(reporte);
        }
      });

      // Ordenar por fecha descendente
      reportesExpandidos.sort((a, b) => {
        const fechaA = new Date(a.fechaInicio || a.fechaProyecto || a.fechaCreacion).getTime();
        const fechaB = new Date(b.fechaInicio || b.fechaProyecto || b.fechaCreacion).getTime();
        return fechaB - fechaA;
      });

      setMunicipioReportes(prev => ({
        ...prev,
        [key]: reportesExpandidos
      }));
    } catch (error) {
      console.error('Error cargando reportes del municipio:', error);
    }
  };

  const handleOpenReport = (reportNumber: string) => {
    console.log('📍 handleOpenReport llamado con:', reportNumber);
    // Cambiar a vista detallada con el reporte específico
    setCurrentView('detallado');
    console.log('📍 Vista cambiada a detallado');
    // El componente DetailedReportView recibirá el número de reporte para mostrarlo
    setTimeout(() => {
      console.log('📍 Enviando evento openReport con:', reportNumber);
      const event = new CustomEvent('openReport', { detail: { reportNumber } });
      window.dispatchEvent(event);
    }, 100);
  };

  // Funciones de exportación
  const handleExportRegion = (region: RegionData) => {
    setExportSelectedRegion(region);
    setExportSelectedProvincia(null);
    setExportType('region');
    setShowDateRangeModal(true);
  };

  const handleExportProvincia = (region: RegionData, provincia: ProvinciaData) => {
    setExportSelectedRegion(region);
    setExportSelectedProvincia(provincia);
    setExportType('provincia');
    setShowDateRangeModal(true);
  };

  const handleExportMunicipio = (region: RegionData, provincia: ProvinciaData, municipio: MunicipioData) => {
    setExportSelectedRegion(region);
    setExportSelectedProvincia(provincia);
    setExportType('municipio');
    // Para municipio exportamos directamente sin rango de fechas
    exportarMunicipioDetalle(region, provincia, municipio);
  };

  const confirmarExportacion = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Por favor seleccione un rango de fechas válido');
      return;
    }

    if (exportType === 'region' && exportSelectedRegion) {
      await exportarRegionConFechas(exportSelectedRegion, exportStartDate, exportEndDate);
    } else if (exportType === 'provincia' && exportSelectedRegion && exportSelectedProvincia) {
      await exportarProvinciaDetalle(exportSelectedRegion, exportSelectedProvincia, exportStartDate, exportEndDate);
    }

    setShowDateRangeModal(false);
    setExportStartDate('');
    setExportEndDate('');
  };

  const exportarRegionConFechas = async (region: RegionData, fechaInicio: string, fechaFin: string) => {
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      const reportesFiltrados = reportes.filter(r => {
        const fechaReporte = new Date(r.fechaCreacion);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return r.region === region.name && fechaReporte >= inicio && fechaReporte <= fin;
      });

      const contenido = `
INFORME DE REGIÓN: ${region.name}
Período: ${new Date(fechaInicio).toLocaleDateString('es-ES')} - ${new Date(fechaFin).toLocaleDateString('es-ES')}
==================================================

RESUMEN GENERAL
- Total de Intervenciones: ${region.total}
- Completadas: ${region.completados}
- En Progreso: ${region.enProgreso}
- Pendientes: ${region.pendientes}
- Kilometraje Total: ${region.kilometraje.toFixed(2)} km

PROVINCIAS DE LA REGIÓN:
${region.provincias.map(p => `
  ${p.nombre}:
  - Intervenciones: ${p.total}
  - Completadas: ${p.completados}
  - En Progreso: ${p.enProgreso}
  - Pendientes: ${p.pendientes}
  - Kilometraje: ${p.kilometraje.toFixed(2)} km
  
  Municipios:
${p.municipios.map(m => `    • ${m.nombre}: ${m.total} intervenciones (${m.kilometraje.toFixed(2)} km)`).join('\n')}
`).join('\n')}

REPORTES DETALLADOS (${reportesFiltrados.length}):
${reportesFiltrados.map((r, i) => {
  let kmReporte = 'N/A';
  const longitudIntervencion = parseFloat(r.metricData?.longitud_intervencion || '0');
  if (longitudIntervencion > 0) {
    kmReporte = longitudIntervencion.toFixed(2);
  }
  
  return `
${i + 1}. Reporte #${r.numeroReporte}
   Fecha: ${new Date(r.fechaCreacion).toLocaleDateString('es-ES')}
   Tipo: ${r.tipoIntervencion}
   Ubicación: ${r.provincia}, ${r.municipio}
   Creado por: ${r.creadoPor}
   Estado: ${r.estado || 'N/A'}
   Kilometraje: ${kmReporte} km
`;
}).join('\n')}
      `.trim();

      const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Informe_${region.name}_${fechaInicio}_${fechaFin}.txt`;
      link.click();
      
      alert(`Informe de ${region.name} exportado exitosamente`);
    } catch (error) {
      console.error('Error al exportar región:', error);
      alert('Error al exportar el informe');
    }
  };

  const exportarProvinciaDetalle = async (region: RegionData, provincia: ProvinciaData, fechaInicio: string, fechaFin: string) => {
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      const reportesFiltrados = reportes.filter(r => {
        const fechaReporte = new Date(r.fechaCreacion);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return r.provincia === provincia.nombre && fechaReporte >= inicio && fechaReporte <= fin;
      });

      const contenido = `
INFORME DETALLADO DE PROVINCIA: ${provincia.nombre}
Región: ${region.name}
Período: ${new Date(fechaInicio).toLocaleDateString('es-ES')} - ${new Date(fechaFin).toLocaleDateString('es-ES')}
==================================================

RESUMEN DE LA PROVINCIA
- Total de Intervenciones: ${provincia.total}
- Completadas: ${provincia.completados}
- En Progreso: ${provincia.enProgreso}
- Pendientes: ${provincia.pendientes}
- Kilometraje Total: ${provincia.kilometraje.toFixed(2)} km

MUNICIPIOS Y SECTORES TRABAJADOS:
${provincia.municipios.map(m => `
  MUNICIPIO: ${m.nombre}
  - Intervenciones: ${m.total}
  - Completadas: ${m.completados}
  - En Progreso: ${m.enProgreso}
  - Pendientes: ${m.pendientes}
  - Kilometraje: ${m.kilometraje.toFixed(2)} km
  
  Sectores trabajados:
${reportesFiltrados
  .filter(r => r.municipio === m.nombre)
  .map(r => `    • ${r.sector || 'N/A'} - ${r.tipoIntervencion}`)
  .filter((v, i, a) => a.indexOf(v) === i)
  .join('\n')}
`).join('\n')}

DATOS DETALLADOS DE REPORTES (${reportesFiltrados.length}):
${reportesFiltrados.map((r, i) => {
  let kmReporte = 'N/A';
  const longitudIntervencion = parseFloat(r.metricData?.longitud_intervencion || '0');
  if (longitudIntervencion > 0) {
    kmReporte = longitudIntervencion.toFixed(2);
  }
  
  return `
${i + 1}. Reporte #${r.numeroReporte}
   Fecha: ${new Date(r.fechaCreacion).toLocaleDateString('es-ES')}
   Municipio: ${r.municipio}
   Sector: ${r.sector || 'N/A'}
   Distrito: ${r.distrito || 'N/A'}
   Tipo Intervención: ${r.tipoIntervencion}
   Creado por: ${r.creadoPor}
   Estado: ${r.estado || 'N/A'}
   Kilometraje: ${kmReporte} km
   Observaciones: ${r.observaciones || 'Ninguna'}
`;
}).join('\n')}
      `.trim();

      const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Informe_Provincia_${provincia.nombre}_${fechaInicio}_${fechaFin}.txt`;
      link.click();
      
      alert(`Informe de ${provincia.nombre} exportado exitosamente`);
    } catch (error) {
      console.error('Error al exportar provincia:', error);
      alert('Error al exportar el informe');
    }
  };

  const exportarMunicipioDetalle = async (region: RegionData, provincia: ProvinciaData, municipio: MunicipioData) => {
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      const reportesMunicipio = reportes.filter(r => r.municipio === municipio.nombre);

      const contenido = `
INFORME DETALLADO DE MUNICIPIO: ${municipio.nombre}
Provincia: ${provincia.nombre}
Región: ${region.name}
==================================================

RESUMEN DEL MUNICIPIO
- Total de Intervenciones: ${municipio.total}
- Completadas: ${municipio.completados}
- En Progreso: ${municipio.enProgreso}
- Pendientes: ${municipio.pendientes}
- Kilometraje Total: ${municipio.kilometraje.toFixed(2)} km

TIPOS DE INTERVENCIÓN REALIZADAS:
${Object.entries(
  reportesMunicipio.reduce((acc, r) => {
    acc[r.tipoIntervencion] = (acc[r.tipoIntervencion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
).map(([tipo, cantidad]) => `  • ${tipo}: ${cantidad} intervenciones`).join('\n')}

SECTORES INTERVENIDOS:
${Array.from(new Set(reportesMunicipio.map(r => r.sector).filter(Boolean))).map(s => `  • ${s}`).join('\n')}

DISTRITOS TRABAJADOS:
${Array.from(new Set(reportesMunicipio.map(r => r.distrito).filter(Boolean))).map(d => `  • ${d}`).join('\n')}

LISTA COMPLETA DE INTERVENCIONES (${reportesMunicipio.length}):
${reportesMunicipio.map((r, i) => {
  let kmReporte = 'N/A';
  const longitudIntervencion = parseFloat(r.metricData?.longitud_intervencion || '0');
  if (longitudIntervencion > 0) {
    kmReporte = longitudIntervencion.toFixed(2);
  }
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERVENCIÓN #${i + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Número de Reporte: ${r.numeroReporte}
Fecha: ${new Date(r.fechaCreacion).toLocaleDateString('es-ES')}
Tipo de Intervención: ${r.tipoIntervencion}
Ubicación Específica:
  - Sector: ${r.sector || 'N/A'}
  - Distrito: ${r.distrito || 'N/A'}
Responsable: ${r.creadoPor}
Estado: ${r.estado || 'N/A'}
Kilometraje: ${kmReporte} km

Datos Métricos:
${Object.entries(r.metricData || {}).map(([key, value]) => `  - ${key}: ${value}`).join('\n')}

Coordenadas GPS:
${r.gpsData ? `
  Punto Inicial: ${r.gpsData.punto_inicial ? `Lat ${r.gpsData.punto_inicial.lat}, Lon ${r.gpsData.punto_inicial.lon}` : 'N/A'}
  Punto Alcanzado: ${r.gpsData.punto_alcanzado ? `Lat ${r.gpsData.punto_alcanzado.lat}, Lon ${r.gpsData.punto_alcanzado.lon}` : 'N/A'}
` : '  No disponible'}

Observaciones: ${r.observaciones || 'Ninguna'}
`;
}).join('\n')}
      `.trim();

      const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Informe_Municipio_${municipio.nombre}_${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      
      alert(`Informe detallado de ${municipio.nombre} exportado exitosamente`);
    } catch (error) {
      console.error('Error al exportar municipio:', error);
      alert('Error al exportar el informe');
    }
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
                onClick={async () => {
                  await updatePendingCount();
                  setShowPendingModal(true);
                }}
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
              <button 
                className={`view-btn-topbar ${currentView === 'vehiculos' ? 'active' : ''}`}
                onClick={() => setCurrentView('vehiculos')}
              >
                <span className="view-icon">🚜</span>
                <span className="view-label">Vehículos Pesados</span>
              </button>
              <button 
                className={`view-btn-topbar ${currentView === 'exportar' ? 'active' : ''}`}
                onClick={() => setCurrentView('exportar')}
              >
                <span className="view-icon">📥</span>
                <span className="view-label">Exportar Informe</span>
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
                    <h2 className="stats-title">Provincias de República Dominicana</h2>
                    <p className="stats-subtitle">Vista de provinciasty sus municipios</p>
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

              {/* Vista de tabla de provincias */}
              <div className="provincias-table-container">
                <table className="provincias-table">
                  <thead>
                    <tr>
                      <th>PROVINCIA</th>
                      <th>REGIÓN</th>
                      {statsMode === 'kilometraje' && <th>KILOMETRAJE</th>}
                      {statsMode === 'intervenciones' && (
                        <>
                          <th>COMPLETADOS</th>
                          <th>PENDIENTES</th>
                          <th>EN PROGRESO</th>
                        </>
                      )}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {provinciasData.map((provincia, index) => {
                      const provinciaKey = `provincia-${provincia.nombre}`;
                      const isExpanded = expandedProvincias.has(provinciaKey);
                      
                      return (
                        <React.Fragment key={provinciaKey}>
                          <tr 
                            className="provincia-row clickable"
                            onClick={() => {
                              setExpandedProvincias(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(provinciaKey)) {
                                  newSet.delete(provinciaKey);
                                } else {
                                  newSet.add(provinciaKey);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <td className="provincia-nombre-cell">
                              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                              <span className="provincia-nombre-text">{provincia.nombre}</span>
                            </td>
                            <td>
                              <span className="region-badge" style={{ backgroundColor: provincia.regionColor }}>
                                {provincia.regionIcon} {provincia.region}
                              </span>
                            </td>
                            {statsMode === 'kilometraje' && (
                              <td className="kilometraje-cell">
                                <strong>{provincia.kilometraje.toFixed(2)} km</strong>
                              </td>
                            )}
                            {statsMode === 'intervenciones' && (
                              <>
                                <td className="stat-completados">{provincia.completados}</td>
                                <td className="stat-pendientes">{provincia.pendientes}</td>
                                <td className="stat-progreso">{provincia.enProgreso}</td>
                              </>
                            )}
                            <td className="arrow-cell">→</td>
                          </tr>

                          {/* Municipios expandibles */}
                          {isExpanded && provincia.municipios.length > 0 && (
                            <tr className="municipios-row">
                              <td colSpan={statsMode === 'kilometraje' ? 4 : 6}>
                                <div className="municipios-expandidos">
                                  <div className="municipios-header-small">
                                    <span>📂 Municipios/Distritos ({provincia.municipios.length})</span>
                                  </div>
                                  {provincia.municipios.map((municipio, munIndex) => {
                                    const municipioKey = `${provinciaKey}-${municipio.nombre}`;
                                    const isMunicipioExpanded = expandedMunicipios.has(municipioKey);
                                    const reportes = municipioReportes[municipioKey] || [];
                                    
                                    return (
                                      <div key={municipioKey} className="municipio-item-table">
                                        <div 
                                          className={`municipio-row-content ${statsMode === 'kilometraje' ? 'clickable' : ''}`}
                                          onClick={() => {
                                            if (statsMode === 'kilometraje') {
                                              setExpandedMunicipios(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(municipioKey)) {
                                                  newSet.delete(municipioKey);
                                                } else {
                                                  newSet.add(municipioKey);
                                                  // Cargar reportes del municipio
                                                  loadMunicipioReportes(municipioKey, provincia.region, provincia.nombre, municipio.nombre);
                                                }
                                                return newSet;
                                              });
                                            }
                                          }}
                                        >
                                          <div className="municipio-nombre-section">
                                            {statsMode === 'kilometraje' && (
                                              <span className="expand-icon-small">{isMunicipioExpanded ? '▼' : '▶'}</span>
                                            )}
                                            <span className="municipio-icon">📍</span>
                                            <span className="municipio-nombre">{municipio.nombre}</span>
                                          </div>
                                          <div className="municipio-stats-section">
                                            {statsMode === 'kilometraje' && (
                                              <span className="kilometraje-badge">{municipio.kilometraje.toFixed(2)} km</span>
                                            )}
                                            {statsMode === 'intervenciones' && (
                                              <>
                                                <span className="stat-badge completados">✅ {municipio.completados}</span>
                                                <span className="stat-badge pendientes">⏳ {municipio.pendientes}</span>
                                                <span className="stat-badge progreso">🔄 {municipio.enProgreso}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {/* Lista de reportes para modo kilometraje */}
                                        {statsMode === 'kilometraje' && isMunicipioExpanded && (
                                          <div className="reportes-list-container">
                                            {reportes.length > 0 ? (
                                              <div className="reportes-list">
                                                {reportes.map((reporte, idx) => {
                                                  const kmReporte = parseFloat(reporte.metricData?.longitud_intervencion || '0') || 0;
                                                  return (
                                                    <div 
                                                      key={reporte.id || idx}
                                                      className="reporte-item-km"
                                                      style={{ cursor: 'pointer' }}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log('🔍 Click en reporte:', reporte.numeroReporte);
                                                        handleOpenReport(reporte.numeroReporte);
                                                      }}
                                                      title="Click para ver detalles del reporte"
                                                    >
                                                      <div className="reporte-item-left">
                                                        <span className="reporte-icon">📄</span>
                                                        <div className="reporte-info">
                                                          <span className="reporte-numero" style={{ color: '#667eea', fontWeight: 'bold' }}>{reporte.numeroReporte}</span>
                                                          <span className="reporte-fecha">
                                                            {new Date(reporte.fechaInicio || reporte.fechaProyecto || reporte.fechaCreacion).toLocaleDateString('es-ES')}
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <div className="reporte-item-right">
                                                        <span className="reporte-km">{kmReporte.toFixed(2)} km</span>
                                                        <span className="reporte-tipo">{reporte.tipoIntervencion}</span>
                                                      </div>
                                                      <span className="reporte-arrow">→</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="reportes-empty">
                                                <p>📭 No hay reportes disponibles</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'detallado' && (
            <DetailedReportView 
              user={user} 
              onEditReport={(report) => {
                if (onEditReport) {
                  onEditReport(report.id);
                }
              }}
            />
          )}

          {currentView === 'vehiculos' && (
            <VehiculosView user={user} onOpenReport={handleOpenReport} />
          )}

          {currentView === 'exportar' && (
            <div className="export-view-container">
              <div className="export-header">
                <h2 className="export-title">📥 Sistema de Exportación de Informes</h2>
                <p className="export-subtitle">Seleccione una región para exportar informes detallados</p>
              </div>

              <div className="export-regions-grid">
                {regionesData.map(region => (
                  <div key={region.id} className="export-region-card">
                    <div className="export-card-header" onClick={() => {
                      if (exportSelectedRegion?.id === region.id) {
                        setExportSelectedRegion(null);
                      } else {
                        setExportSelectedRegion(region);
                        setExportSelectedProvincia(null);
                      }
                    }}>
                      <div className="export-card-icon">{region.icon}</div>
                      <div className="export-card-info">
                        <h3 className="export-card-title">{region.name}</h3>
                        <p className="export-card-stats">
                          {region.total} intervenciones • {region.kilometraje.toFixed(2)} km
                        </p>
                      </div>
                      <button 
                        className="export-card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportRegion(region);
                        }}
                        title="Exportar región con rango de fechas"
                      >
                        📄 Exportar
                      </button>
                    </div>

                    {exportSelectedRegion?.id === region.id && (
                      <div className="export-provincias-container">
                        <h4 className="export-section-title">Provincias de {region.name}</h4>
                        <div className="export-provincias-grid">
                          {region.provincias.map(provincia => (
                            <div key={provincia.nombre} className="export-provincia-card">
                              <div className="export-provincia-header" onClick={() => {
                                if (exportSelectedProvincia?.nombre === provincia.nombre) {
                                  setExportSelectedProvincia(null);
                                } else {
                                  setExportSelectedProvincia(provincia);
                                }
                              }}>
                                <div className="export-provincia-info">
                                  <h4 className="export-provincia-name">📍 {provincia.nombre}</h4>
                                  <p className="export-provincia-stats">
                                    {provincia.total} intervenciones • {provincia.kilometraje.toFixed(2)} km
                                  </p>
                                </div>
                                <button 
                                  className="export-provincia-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportProvincia(region, provincia);
                                  }}
                                  title="Exportar provincia con lista detallada"
                                >
                                  📋 Exportar
                                </button>
                              </div>

                              {exportSelectedProvincia?.nombre === provincia.nombre && (
                                <div className="export-municipios-container">
                                  <h5 className="export-municipios-title">Municipios de {provincia.nombre}</h5>
                                  <div className="export-municipios-grid">
                                    {provincia.municipios.map(municipio => (
                                      <div key={municipio.nombre} className="export-municipio-card">
                                        <div className="export-municipio-info">
                                          <h5 className="export-municipio-name">🏘️ {municipio.nombre}</h5>
                                          <p className="export-municipio-stats">
                                            {municipio.total} intervenciones
                                          </p>
                                          <p className="export-municipio-km">
                                            {municipio.kilometraje.toFixed(2)} km
                                          </p>
                                        </div>
                                        <button 
                                          className="export-municipio-btn"
                                          onClick={() => handleExportMunicipio(region, provincia, municipio)}
                                          title="Exportar municipio con detalles completos"
                                        >
                                          📥 Exportar
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de selección de rango de fechas */}
      {showDateRangeModal && (
        <div className="date-range-modal-overlay" onClick={() => setShowDateRangeModal(false)}>
          <div className="date-range-modal" onClick={(e) => e.stopPropagation()}>
            <div className="date-range-header">
              <h3>📅 Seleccionar Rango de Fechas</h3>
              <button className="date-range-close" onClick={() => setShowDateRangeModal(false)}>✕</button>
            </div>
            
            <div className="date-range-content">
              <p className="date-range-info">
                {exportType === 'region' && `Exportando: Región ${exportSelectedRegion?.name}`}
                {exportType === 'provincia' && `Exportando: Provincia ${exportSelectedProvincia?.nombre}`}
              </p>

              <div className="date-range-inputs">
                <div className="date-input-group">
                  <label htmlFor="startDate">Fecha Inicio:</label>
                  <input
                    id="startDate"
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>

                <div className="date-input-group">
                  <label htmlFor="endDate">Fecha Fin:</label>
                  <input
                    id="endDate"
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>

              <div className="date-range-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowDateRangeModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-confirm" 
                  onClick={confirmarExportacion}
                  disabled={!exportStartDate || !exportEndDate}
                >
                  Exportar Informe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de notificaciones pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={pendingReportsList}
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />
    </div>
  );
};

export default ReportsPage;

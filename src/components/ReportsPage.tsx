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

// Componente Vista de Vehículos
const VehiculosView: React.FC = () => {
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

  useEffect(() => {
    cargarVehiculos();
    const interval = setInterval(cargarVehiculos, 10000);
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

  const cargarVehiculos = async () => {
    setLoading(true);
    try {
      const reportes = await firebaseReportStorage.getAllReports();
      console.log('📊 Total de reportes cargados:', reportes.length);
      
      // Agrupar vehículos por ficha
      const vehiculosPorFicha: Record<string, any> = {};
      
      reportes.forEach(reporte => {
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
      
      // Generar HTML del informe
      generarInformeHTML(vehiculosConActividades, inicio, fin);
      
    } catch (error) {
      console.error('Error al exportar informe:', error);
      alert('Error al generar el informe. Por favor intente nuevamente.');
    } finally {
      setExportando(false);
      setShowExportModal(false);
    }
  };

  // Función para generar HTML del informe
  const generarInformeHTML = (vehiculosData: Record<string, any>, inicio: Date, fin: Date) => {
    const listaVehiculos = Object.values(vehiculosData);
    
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Vehículos Pesados - MOPC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 36px;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .header .subtitle {
      font-size: 18px;
      opacity: 0.95;
    }
    .period-info {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 3px solid #FF9800;
    }
    .period-info strong {
      color: #FF9800;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #fafafa;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border: 2px solid #e0e0e0;
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #FF9800;
      display: block;
      margin-bottom: 8px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .vehiculos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
      gap: 20px;
      padding: 30px;
    }
    .vehiculo-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      overflow: hidden;
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;
      page-break-inside: avoid;
    }
    .vehiculo-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      transform: translateY(-4px);
    }
    .vehiculo-header {
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 20px;
    }
    .vehiculo-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .vehiculo-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 12px;
      font-size: 14px;
    }
    .vehiculo-info-grid div {
      background: rgba(255,255,255,0.2);
      padding: 6px 10px;
      border-radius: 6px;
    }
    .vehiculo-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      padding: 15px;
      background: #f8f9fa;
      border-bottom: 2px solid #FF9800;
    }
    .stat-mini {
      text-align: center;
    }
    .stat-mini-value {
      font-size: 20px;
      font-weight: 700;
      color: #FF9800;
      display: block;
    }
    .stat-mini-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    .actividades-section {
      padding: 20px;
    }
    .actividades-title {
      font-size: 18px;
      font-weight: 700;
      color: #FF9800;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .actividad-item {
      background: #fafafa;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 8px;
      border-left: 4px solid #FF9800;
    }
    .actividad-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .actividad-fecha {
      color: #FF9800;
      font-size: 14px;
    }
    .actividad-reporte {
      background: #e0e0e0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .actividad-detalles {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .actividad-detalles div {
      margin-bottom: 4px;
    }
    .actividad-detalles strong {
      color: #333;
      margin-right: 6px;
    }
    .ubicacion-box {
      background: white;
      padding: 10px;
      border-radius: 6px;
      margin-top: 8px;
      border: 1px solid #e0e0e0;
    }
    .footer {
      background: #2c3e50;
      color: white;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .vehiculo-card { page-break-inside: avoid; }
      .vehiculos-grid { display: block; }
      .vehiculo-card { margin-bottom: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚜 INFORME DE VEHÍCULOS PESADOS</h1>
      <div class="subtitle">Ministerio de Obras Públicas y Comunicaciones</div>
    </div>
    
    <div class="period-info">
      <p><strong>Período del Informe:</strong> ${inicio.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })} al ${fin.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}</p>
      <p style="margin-top: 8px; font-size: 14px;">Generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>
    
    <div class="summary">
      <div class="stat-card">
        <span class="stat-value">${listaVehiculos.length}</span>
        <span class="stat-label">Vehículos Activos</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${listaVehiculos.reduce((sum, v) => sum + v.actividades.length, 0)}</span>
        <span class="stat-label">Total Actividades</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${listaVehiculos.reduce((sum, v) => sum + v.totalKm, 0).toFixed(1)} km</span>
        <span class="stat-label">Kilometraje Total</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${new Set(listaVehiculos.flatMap(v => Array.from(v.provincias))).size}</span>
        <span class="stat-label">Provincias Cubiertas</span>
      </div>
    </div>
    
    <div class="vehiculos-grid">
      ${listaVehiculos.map(vehiculo => `
        <div class="vehiculo-card">
          <div class="vehiculo-header">
            <div class="vehiculo-title">🚜 ${vehiculo.tipo}</div>
            <div class="vehiculo-info-grid">
              <div><strong>Modelo:</strong> ${vehiculo.modelo}</div>
              <div><strong>Ficha:</strong> ${vehiculo.ficha}</div>
            </div>
          </div>
          
          <div class="vehiculo-stats">
            <div class="stat-mini">
              <span class="stat-mini-value">${vehiculo.actividades.length}</span>
              <span class="stat-mini-label">Actividades</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value">${vehiculo.diasActivos.size}</span>
              <span class="stat-mini-label">Días Activos</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value">${vehiculo.totalKm.toFixed(1)} km</span>
              <span class="stat-mini-label">Recorrido</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-value">${vehiculo.regiones.size}</span>
              <span class="stat-mini-label">Regiones</span>
            </div>
          </div>
          
          <div class="actividades-section">
            <div class="actividades-title">📋 Actividades y Recorridos</div>
            ${vehiculo.actividades
              .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .map((actividad: any) => `
                <div class="actividad-item">
                  <div class="actividad-header">
                    <span class="actividad-fecha">📅 ${new Date(actividad.fecha).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                    <span class="actividad-reporte">#${actividad.numeroReporte}</span>
                  </div>
                  <div class="actividad-detalles">
                    <div><strong>🔧 Tipo:</strong> ${actividad.tipoIntervencion}</div>
                    <div class="ubicacion-box">
                      <div><strong>📍 Región:</strong> ${actividad.region}</div>
                      <div><strong>📍 Provincia:</strong> ${actividad.provincia}</div>
                      <div><strong>📍 Distrito:</strong> ${actividad.distrito}</div>
                      <div><strong>📍 Municipio:</strong> ${actividad.municipio}</div>
                      <div><strong>📍 Sector:</strong> ${actividad.sector}</div>
                    </div>
                    <div style="margin-top: 8px;"><strong>👤 Registrado por:</strong> ${actividad.usuario}</div>
                    ${actividad.kilometraje > 0 ? `<div><strong>📏 Kilometraje:</strong> ${actividad.kilometraje.toFixed(2)} km</div>` : ''}
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p><strong>Ministerio de Obras Públicas y Comunicaciones (MOPC)</strong></p>
      <p>Sistema de Gestión de Vehículos Pesados</p>
      <p style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
        Documento generado automáticamente - ${new Date().toLocaleString('es-ES')}
      </p>
    </div>
  </div>
  
  <script>
    // Imprimir automáticamente al cargar
    window.onload = () => {
      setTimeout(() => window.print(), 500);
    };
  </script>
</body>
</html>
    `;
    
    // Abrir en nueva ventana
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
  };

  return (
    <div className="vehiculos-container">
      <div className="vehiculos-header">
        <h2 className="vehiculos-title">🚜 Gestión de Vehículos Pesados</h2>
        <p className="vehiculos-subtitle">
          {vehiculos.length} vehículos registrados en el sistema
        </p>
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
            <button
              className="btn-export-vehiculos"
              onClick={() => setShowExportModal(true)}
              title="Exportar informe de vehículos"
            >
              📊 Exportar Informe
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="vehiculos-loading">
          <div className="loading-spinner"></div>
          <p>Cargando vehículos...</p>
        </div>
      ) : (
        <div className="vehiculos-grid">
          {vehiculosFiltrados.map((vehiculo) => (
            <div 
              key={vehiculo.ficha} 
              className={`vehiculo-card ${selectedVehiculo === vehiculo.ficha ? 'expanded' : ''}`}
            >
              <div 
                className="vehiculo-header"
                onClick={() => setSelectedVehiculo(
                  selectedVehiculo === vehiculo.ficha ? null : vehiculo.ficha
                )}
              >
                <div className="vehiculo-icon">🚜</div>
                <div className="vehiculo-info">
                  <h3 className="vehiculo-tipo">{vehiculo.tipo}</h3>
                  <p className="vehiculo-modelo">{vehiculo.modelo}</p>
                  <p className="vehiculo-ficha">Ficha: <strong>{vehiculo.ficha}</strong></p>
                </div>
                <div className="vehiculo-stats">
                  <div className="stat-badge">
                    <span className="stat-value">{vehiculo.totalObras}</span>
                    <span className="stat-label">Obras</span>
                  </div>
                </div>
              </div>

              <div className="vehiculo-ultima-obra">
                <div className="ultima-obra-header">
                  <span className="obra-badge">📍 Última Posición</span>
                  <span className="obra-fecha">{formatearFecha(vehiculo.ultimaObra.fecha)}</span>
                </div>
                <div className="ultima-obra-details">
                  <p><strong>Reporte:</strong> {vehiculo.ultimaObra.numeroReporte}</p>
                  <p><strong>Región:</strong> {vehiculo.ultimaObra.region}</p>
                  <p><strong>Provincia:</strong> {vehiculo.ultimaObra.provincia}</p>
                  <p><strong>Municipio:</strong> {vehiculo.ultimaObra.municipio}</p>
                  <p><strong>Sector:</strong> {vehiculo.ultimaObra.sector}</p>
                  <p><strong>Intervención:</strong> {vehiculo.ultimaObra.tipoIntervencion}</p>
                </div>
              </div>

              {selectedVehiculo === vehiculo.ficha && (
                <div className="vehiculo-obras-historial">
                  <h4 className="historial-title">📋 Historial de Obras ({vehiculo.obras.length})</h4>
                  <div className="obras-lista">
                    {vehiculo.obras
                      .sort((a: any, b: any) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
                      .map((obra: any, index: number) => (
                        <div key={`${obra.id}-${index}`} className="obra-item">
                          <div className="obra-item-header">
                            <span className="obra-numero">{obra.numeroReporte}</span>
                            <span className="obra-fecha-small">{formatearFecha(obra.fechaCreacion)}</span>
                          </div>
                          <div className="obra-item-body">
                            <p>📍 {obra.provincia} › {obra.municipio} › {obra.sector}</p>
                            <p>🔧 {obra.tipoIntervencion}</p>
                          </div>
                        </div>
                      ))}
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
    </div>
  );
};

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onBack, onEditReport }) => {
  const [currentView, setCurrentView] = useState<PageView>('estadisticas');
  const [statsMode, setStatsMode] = useState<StatsMode>('intervenciones');
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [regionesData, setRegionesData] = useState<RegionData[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedProvincias, setExpandedProvincias] = useState<Set<string>>(new Set());
  
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

        // Actualizar contadores de provincia y municipio
        // Los reportes con estado 'pendiente' NO se incluyen en estadísticas
        if (report.estado === 'completado' || report.estado === 'aprobado') {
          currentProv.total++;
          currentProv.completados++;
          currentMun.total++;
          currentMun.completados++;
          
          // Calcular kilometraje solo para reportes completados/aprobados
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
        } else if (report.estado === 'en progreso') {
          currentProv.total++;
          currentProv.enProgreso++;
          currentMun.total++;
          currentMun.enProgreso++;
          
          // Calcular kilometraje también para reportes en progreso
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
        }
        // Los reportes 'pendiente' se ignoran completamente en estadísticas

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
  if (r.gpsData?.start && r.gpsData?.end) {
    const km = calcularDistanciaKm(
      r.gpsData.start.latitude,
      r.gpsData.start.longitude,
      r.gpsData.end.latitude,
      r.gpsData.end.longitude
    );
    kmReporte = km.toFixed(2);
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
  if (r.gpsData?.start && r.gpsData?.end) {
    const km = calcularDistanciaKm(
      r.gpsData.start.latitude,
      r.gpsData.start.longitude,
      r.gpsData.end.latitude,
      r.gpsData.end.longitude
    );
    kmReporte = km.toFixed(2);
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
  if (r.gpsData?.start && r.gpsData?.end) {
    const km = calcularDistanciaKm(
      r.gpsData.start.latitude,
      r.gpsData.start.longitude,
      r.gpsData.end.latitude,
      r.gpsData.end.longitude
    );
    kmReporte = km.toFixed(2);
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
                                <div key={provinciaKey} className="provincia-card-expandable">
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
                                        <div key={`${provincia.nombre}-${municipio.nombre}`} className="municipio-item">
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
            <VehiculosView />
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
        reports={getPendingReports()}
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />
    </div>
  );
};

export default ReportsPage;

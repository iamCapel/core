import React, { useState, useEffect, useMemo } from 'react';
import { reportStorage } from '../services/reportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import ExportButton from './ExportButton';
import { exportReportsAsPdf } from '../utils/reportExport';
import './DetailedReportView.css';

// Mapeo de etiquetas de campos con sus unidades (igual que en el PDF)
const fieldLabels: Record<string, { label: string; unit: string }> = {
  'longitud_intervencion': { label: 'Longitud de intervención', unit: 'km' },
  'limpieza_superficie': { label: 'Limpieza de superficie', unit: 'm²' },
  'perfilado_superficie': { label: 'Perfilado de superficie', unit: 'm²' },
  'compactado_superficie': { label: 'Compactado de superficie', unit: 'm²' },
  'conformacion_cunetas': { label: 'Conformación de cunetas', unit: 'ml' },
  'extraccion_bote_material': { label: 'Extracción y bote de material inservible', unit: 'm³' },
  'escarificacion_superficies': { label: 'Escarificación de superficies', unit: 'm²' },
  'conformacion_plataforma': { label: 'Conformación de plataforma', unit: 'm²' },
  'zafra_material': { label: 'Zafra de material', unit: 'm³' },
  'motonivelacion_superficie': { label: 'Motonivelación de superficie', unit: 'm²' },
  'escarpe_talud': { label: 'Escarpe de talud', unit: 'm²' },
  'limpieza_alcantarillas': { label: 'Limpieza de alcantarillas', unit: 'und' },
  'desmalezado_arbustos': { label: 'Desmalezado de arbustos', unit: 'm²' },
  'corte_poda_arboles': { label: 'Corte y poda de árboles', unit: 'und' },
  'escarificado_plataforma': { label: 'Escarificado de plataforma', unit: 'm²' },
  'tapada_baches': { label: 'Tapada de baches', unit: 'm³' },
  'reposicion_tuberias': { label: 'Reposición de tuberías', unit: 'und' },
  'trabajos_especiales': { label: 'Trabajos especiales', unit: '' },
  'cantidad_material_colocado': { label: 'Cantidad de material colocado', unit: 'm³' },
  'camino_inicio': { label: 'Camino inicio', unit: '' },
  'camino_termino': { label: 'Camino término', unit: '' },
  'apertura_zanjas': { label: 'Apertura de zanjas', unit: 'ml' },
  'mano_obra': { label: 'Mano de obra', unit: '' }
};

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
  // Imágenes organizadas por día
  imagesPerDay?: Record<string, Array<{ url: string; timestamp: string }>>;
  // Imágenes (legacy - array simple)
  images?: string[];
  // Otros campos
  observations?: string;
  fechaCreacion?: string;
  fechaProyecto?: string;
  numeroReporte?: string;
  creadoPor?: string;
  estado?: string;
  kilometraje?: number;
  // Vehículos pesados
  vehiculos?: Array<{tipo: string, modelo: string, ficha: string}>;
  // Campos para reportes multi-día
  esMultiDia?: boolean;
  diaNumero?: number;
  totalDias?: number;
  reporteOriginalId?: string;
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
  initialReportNumber?: string;
  onBack?: () => void;
}

type ViewMode = 'hierarchy' | 'table' | 'stats';
type FilterPeriod = 'todos' | 'hoy' | 'semana' | 'mes' | 'trimestre' | 'año' | 'personalizado';
type SortField = 'reportNumber' | 'date' | 'tipo' | 'estado' | 'kilometraje';
type SortOrder = 'asc' | 'desc';
type StatsListType = 'total' | 'completados' | 'pendientes' | 'enProgreso' | 'kmTotal' | 'kmPromedio';

const DetailedReportView: React.FC<DetailedReportViewProps> = ({ onClose = null, onEditReport, user, initialReportNumber, onBack }) => {
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

  // Estados para listado de reportes por estadistica
  const [statsListOpen, setStatsListOpen] = useState(false);
  const [statsListType, setStatsListType] = useState<StatsListType | null>(null);

  // Cargar datos reales desde reportStorage
  const [regionsData, setRegionsData] = useState<Region[]>([]);
  const [allReportsFlat, setAllReportsFlat] = useState<Report[]>([]);

  // Estados para modal de historial de vehículo
  const [selectedVehicle, setSelectedVehicle] = useState<{tipo: string, modelo: string, ficha: string} | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);

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

  // Maneja la exportación según formato seleccionado (excel, pdf, word)
  const handleExport = (format: string) => {
    if (!selectedReport) {
      alert('No hay un reporte seleccionado para exportar');
      return;
    }
    console.log('🌐 Pedido de exportación:', format, selectedReport.numeroReporte);
    // TODO: integrar lógica real de generación (exportPage helpers)
    alert(`Exportar reporte ${selectedReport.numeroReporte} como ${format} (funcionalidad en desarrollo)`);
  };

  // Función para cargar historial de un vehículo
  const loadVehicleHistory = async (vehiculo: {tipo: string, modelo: string, ficha: string}) => {
    setSelectedVehicle(vehiculo);
    
    try {
      // Cargar todos los reportes desde Firebase
      const allReports = await firebaseReportStorage.getAllReports();
      
      // Filtrar reportes que contengan este vehículo (por ficha)
      const history: any[] = [];
      
      for (const report of allReports) {
        if (report.vehiculos && Array.isArray(report.vehiculos)) {
          const hasVehicle = report.vehiculos.some((v: any) => v.ficha === vehiculo.ficha);
          
          if (hasVehicle) {
            // Si es multi-día, expandir cada día
            if (report.esProyectoMultiDia && report.diasTrabajo && report.diasTrabajo.length > 0) {
              const totalDias = report.diasTrabajo.length;
              report.diasTrabajo.forEach((dia: string, index: number) => {
                const dayData = report.reportesPorDia?.[dia] || {};
                const vehiculosDia = dayData.vehiculos || report.vehiculos || [];
                const hasVehicleInDay = vehiculosDia.some((v: any) => v.ficha === vehiculo.ficha);
                
                if (hasVehicleInDay) {
                  history.push({
                    fecha: dia,
                    fechaDisplay: new Date(dia).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }),
                    numeroReporte: `${report.numeroReporte} (Día ${index + 1}/${totalDias})`,
                    tipoIntervencion: report.tipoIntervencion,
                    usuario: report.creadoPor,
                    region: report.region,
                    provincia: report.provincia,
                    distrito: report.distrito,
                    municipio: report.municipio,
                    sector: report.sector
                  });
                }
              });
            } else {
              // Reporte de un solo día
              const fechaMostrar = report.fechaProyecto || report.fechaCreacion;
              history.push({
                fecha: fechaMostrar,
                fechaDisplay: new Date(fechaMostrar).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                numeroReporte: report.numeroReporte,
                tipoIntervencion: report.tipoIntervencion,
                usuario: report.creadoPor,
                region: report.region,
                provincia: report.provincia,
                distrito: report.distrito,
                municipio: report.municipio,
                sector: report.sector
              });
            }
          }
        }
      }
      
      // Ordenar por fecha descendente
      history.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      setVehicleHistory(history);
    } catch (error) {
        console.error('Error al cargar historial de vehículo:', error);
      setVehicleHistory([]);
    }
  };

  // Función para cerrar modal de vehículo
  const closeVehicleModal = () => {
    setSelectedVehicle(null);
    setVehicleHistory([]);
  };

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'Administrador' || user?.role === 'administrador' || user?.role === 'Admin' || user?.role === 'admin';

  useEffect(() => {
    // Cargar todos los reportes desde Firebase
    const loadReports = async () => {
      try {
        let allReports = await firebaseReportStorage.getAllReports();
        
        console.log('📊 Total reportes cargados desde Firebase:', allReports.length);
        
        // Verificar cuántos reportes tienen imágenes
        const reportesConImagenes = allReports.filter(r => r.imagesPerDay && Object.keys(r.imagesPerDay).length > 0);
        console.log(`📸 Reportes con imágenes: ${reportesConImagenes.length}/${allReports.length}`);
        
        if (reportesConImagenes.length > 0) {
          console.log('📸 Reportes con fotos:', reportesConImagenes.map(r => ({
            numeroReporte: r.numeroReporte,
            totalFotos: Object.values(r.imagesPerDay || {}).flat().length
          })));
        }
        
        // ✅ Admin y Supervisor VEN reportes pendientes de todos los usuarios
        // ✅ Técnicos VEN sus propios reportes pendientes
        const isAdminOrSupervisor = user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'admin' || user?.role === 'supervisor';
        const isTecnico = user?.role === 'Técnico' || user?.role === 'tecnico';
        
        // Filtrar por rol si es técnico (solo ven sus propios reportes)
        if (isTecnico) {
          // Técnicos ven TODOS sus reportes (completados Y pendientes)
          allReports = allReports.filter(report => 
            report.usuarioId === user.username
          );
        }
        
        console.log(`📊 [${user?.role}] Total reportes cargados:`, allReports.length);
        console.log(`🟠 Reportes pendientes visibles:`, allReports.filter(r => r.estado === 'pendiente').length);
        console.log(`✅ Reportes completados visibles:`, allReports.filter(r => r.estado === 'completado').length);
        
        processReports(allReports);
      } catch (error) {
        console.error('Error cargando reportes de Firebase:', error);
        // Fallback a localStorage
        let allReports = reportStorage.getAllReports();
        
        const isTecnico = user?.role === 'Técnico' || user?.role === 'tecnico';
        
        // Filtrar por rol si es técnico
        if (isTecnico) {
          allReports = allReports.filter(report => 
            report.usuarioId === user.username
          );
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
      
      // Obtener kilometraje desde campo manual de la plantilla
      const longitudIntervencion = parseFloat(report.metricData?.longitud_intervencion || '0');
      const km = longitudIntervencion || 0;
      
      // Si es proyecto multi-día CON reportesPorDia (formato antiguo), expandir en múltiples entradas
      // NOTA: Los reportes guardados individualmente ya tienen fechaProyecto, NO deben expandirse
      const debeExpandirse = report.esProyectoMultiDia && 
                             report.diasTrabajo && 
                             report.diasTrabajo.length > 0 && 
                             report.reportesPorDia && 
                             Object.keys(report.reportesPorDia).length > 0;
      
      if (debeExpandirse) {
        report.diasTrabajo.forEach((dia: string, index: number) => {
          const dayData = report.reportesPorDia?.[dia] || {};
          
          // Los vehículos del reporte principal se muestran en todos los días
          const vehiculosDia = dayData.vehiculos || report.vehiculos || [];
          
          const formattedReport = {
            id: `${report.id}_dia_${index + 1}`,
            reportNumber: `${report.numeroReporte} (Día ${index + 1}/${report.diasTrabajo.length})`,
            createdBy: report.creadoPor,
            date: new Date(dia).toLocaleDateString(),
            district: report.distrito,
            province: report.provincia,
            region: report.region,
            municipio: report.municipio,
            sector: report.sector,
            totalInterventions: 1,
            tipoIntervencion: report.tipoIntervencion,
            subTipoCanal: report.subTipoCanal,
            metricData: dayData.metricData || report.metricData || {},
            // gpsData intentionally omitted per requirements
            observations: dayData.observaciones || report.observaciones,
            fechaCreacion: report.fechaCreacion,
            fechaProyecto: dia,
            numeroReporte: report.numeroReporte,
            creadoPor: report.creadoPor,
            estado: report.estado,
            kilometraje: km / report.diasTrabajo.length,
            vehiculos: vehiculosDia,
            esMultiDia: true,
            diaNumero: index + 1,
            totalDias: report.diasTrabajo.length,
            reporteOriginalId: report.id,
            // 📸 INCLUIR IMÁGENES (nuevo y legacy)
            imagesPerDay: report.imagesPerDay || {},
            images: report.images || []
          };
          
          hierarchyMap[region][provincia][distrito].push(formattedReport);
          flatReports.push(formattedReport);
        });
      } else {
        // Reporte de un solo día
        // ✅ Priorizar fechaProyecto para mostrar la fecha real del día específico
        // (importante para reportes multi-día guardados individualmente)
        const fechaMostrar = report.fechaProyecto || report.fechaInicio || report.fechaCreacion;
        const formattedReport = {
          id: report.id,
          reportNumber: report.numeroReporte,
          createdBy: report.creadoPor,
          date: new Date(fechaMostrar).toLocaleDateString(),
          district: report.distrito,
          province: report.provincia,
          region: report.region,
          municipio: report.municipio,
          sector: report.sector,
          totalInterventions: 1,
          tipoIntervencion: report.tipoIntervencion,
          subTipoCanal: report.subTipoCanal,
          metricData: report.metricData || {},
          // gpsData intentionally omitted per requirements
          observations: report.observaciones,
          fechaCreacion: report.fechaCreacion,
          fechaProyecto: fechaMostrar,
          numeroReporte: report.numeroReporte,
          creadoPor: report.creadoPor,
          estado: report.estado,
          kilometraje: km,
          vehiculos: report.vehiculos || [],
          // 📸 INCLUIR IMÁGENES (nuevo y legacy)
          imagesPerDay: report.imagesPerDay || {},
          images: report.images || []
        };
        
        hierarchyMap[region][provincia][distrito].push(formattedReport);
        flatReports.push(formattedReport);
      }
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

  // Efecto para seleccionar automáticamente un reporte si se pasa initialReportNumber
  useEffect(() => {
    if (initialReportNumber && allReportsFlat.length > 0 && !selectedReport) {
      const report = allReportsFlat.find(r => r.numeroReporte === initialReportNumber || r.reportNumber === initialReportNumber);
      if (report) {
        // Aplicar la misma lógica de migración de imágenes
        let reportToShow = report;
        if (report.images && Array.isArray(report.images) && report.images.length > 0) {
          if (!report.imagesPerDay || Object.keys(report.imagesPerDay).length === 0) {
            reportToShow = {
              ...report,
              imagesPerDay: {
                'general': report.images.map((url: string, index: number) => ({
                  url: url,
                  timestamp: new Date().toISOString()
                }))
              }
            };
          }
        }
        setSelectedReport(reportToShow);
        console.log('📋 Reporte seleccionado automáticamente desde mapa:', initialReportNumber);
      }
    }
  }, [initialReportNumber, allReportsFlat, selectedReport]);

  // Escuchar evento para abrir reportes desde otras vistas (como ReportsPage)
  useEffect(() => {
    const handleOpenReport = (event: any) => {
      console.log('📡 DetailedReportView recibió evento openReport:', event.detail);
      const { reportNumber } = event.detail;
      if (reportNumber && allReportsFlat.length > 0) {
        console.log('🔍 Buscando reporte:', reportNumber, 'en', allReportsFlat.length, 'reportes');
        const reportToOpen = allReportsFlat.find(r => r.numeroReporte === reportNumber || r.reportNumber === reportNumber);
        if (reportToOpen) {
          console.log('✅ Reporte encontrado:', reportToOpen.numeroReporte || reportToOpen.reportNumber);
          // Crear evento sintético
          const syntheticEvent = {
            stopPropagation: () => {},
            preventDefault: () => {}
          } as React.MouseEvent<HTMLButtonElement>;
          viewReport(reportToOpen, syntheticEvent);
        } else {
          console.log('❌ Reporte no encontrado. Reportes disponibles:', allReportsFlat.map(r => r.numeroReporte || r.reportNumber));
        }
      } else {
        console.log('⚠️ No se puede abrir reporte:', { reportNumber, totalReports: allReportsFlat.length });
      }
    };

    window.addEventListener('openReport', handleOpenReport);
    return () => {
      window.removeEventListener('openReport', handleOpenReport);
    };
  }, [allReportsFlat]);

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
    // Obtener kilometraje desde campo manual de las plantillas
    const totalKm = filteredReports.reduce((sum, r) => {
      const km = parseFloat(r.metricData?.longitud_intervencion || '0') || 0;
      return sum + km;
    }, 0);
    const completados = filteredReports.filter(r => r.estado === 'completado' || r.estado === 'aprobado').length;
    const pendientes = filteredReports.filter(r => r.estado === 'pendiente' || r.estado === 'borrador').length;
    const enProgreso = filteredReports.filter(r => r.estado === 'en_revision').length;

    return {
      total: filteredReports.length,
      completados,
      pendientes,
      enProgreso,
      totalKm,
      promedioKm: filteredReports.length > 0 ? totalKm / filteredReports.length : 0
    };
  }, [filteredReports]);

  const statsListTitle = useMemo(() => {
    switch (statsListType) {
      case 'total':
        return 'Listado de informes (total)';
      case 'completados':
        return 'Listado de informes completados';
      case 'pendientes':
        return 'Listado de informes pendientes';
      case 'enProgreso':
        return 'Listado de informes en progreso';
      case 'kmTotal':
        return 'Listado de informes (km totales)';
      case 'kmPromedio':
        return 'Listado de informes (km promedio)';
      default:
        return '';
    }
  }, [statsListType]);

  const statsListReports = useMemo(() => {
    if (!statsListType) return [];

    let base = filteredReports;
    if (statsListType === 'completados') {
      base = filteredReports.filter(r => r.estado === 'completado' || r.estado === 'aprobado');
    }
    if (statsListType === 'pendientes') {
      base = filteredReports.filter(r => r.estado === 'pendiente' || r.estado === 'borrador');
    }
    if (statsListType === 'enProgreso') {
      base = filteredReports.filter(r => r.estado === 'en_revision');
    }

    return [...base].sort((a, b) => {
      const rawA = a.fechaProyecto || a.fechaCreacion || a.date || '';
      const rawB = b.fechaProyecto || b.fechaCreacion || b.date || '';
      const dateA = rawA ? new Date(rawA).getTime() : 0;
      const dateB = rawB ? new Date(rawB).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredReports, statsListType]);

  const openStatsList = (type: StatsListType) => {
    setStatsListType(type);
    setStatsListOpen(true);
  };

  const getReportStartDate = (report: Report): string => {
    const rawDate = report.fechaProyecto || report.fechaCreacion;
    if (rawDate) {
      return new Date(rawDate).toLocaleDateString('es-ES');
    }
    return report.date || 'N/A';
  };

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


  const handleDownloadPdf = async () => {
    if (!filteredReports || filteredReports.length === 0) {
      alert('No hay reportes para descargar en este período.');
      return;
    }

    try {
      await exportReportsAsPdf(filteredReports as any);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('No se pudo generar el PDF. Por favor intente de nuevo.');
    }
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
    
    // 🔄 MIGRACIÓN: Convertir formato legacy a imagesPerDay si es necesario
    let reportToShow = report;
    if (report.images && Array.isArray(report.images) && report.images.length > 0) {
      if (!report.imagesPerDay || Object.keys(report.imagesPerDay).length === 0) {
        console.log('🔄 MIGRACIÓN viewReport: Convirtiendo images → imagesPerDay para', report.numeroReporte);
        reportToShow = {
          ...report,
          imagesPerDay: {
            'general': report.images.map((url: string, index: number) => ({
              url: url,
              timestamp: new Date().toISOString()
            }))
          }
        };
        console.log('✅ MIGRACIÓN viewReport: Fotos convertidas:', reportToShow.imagesPerDay);
      }
    }
    
    // Mostrar el reporte inmediatamente
    setSelectedReport(reportToShow);
    
    console.log('📸 Verificando fotos del reporte:', reportToShow.id);
    console.log('📸 imagesPerDay:', reportToShow.imagesPerDay);
    console.log('📸 images (legacy):', reportToShow.images);
    
    const totalFotos = reportToShow.imagesPerDay ? Object.values(reportToShow.imagesPerDay).flat().length : 0;
    console.log('📸 Total fotos a mostrar:', totalFotos);
  };

  const closeReportView = () => {
    // Si hay un onBack (venimos del mapa), volver al mapa
    if (onBack && initialReportNumber) {
      onBack();
    } else {
      setSelectedReport(null);
    }
  };

  // 🖼️ Función para abrir fotos en nueva pestaña (maneja base64)
  const openPhotoInNewTab = (imageUrl: string) => {
    // Si la URL es base64, convertir a blob para mejor compatibilidad del navegador
    if (imageUrl.startsWith('data:')) {
      try {
        // Extraer el tipo MIME y los datos base64
        const [header, base64Data] = imageUrl.split(',');
        const mimeMatch = header.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        // Convertir base64 a binary
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Crear blob y URL
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña
        const newWindow = window.open(blobUrl, '_blank');
        
        // Liberar el blob URL después de un tiempo
        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 100);
        }
      } catch (error) {
        console.error('Error al abrir imagen:', error);
        alert('Error al abrir la imagen. Por favor intente de nuevo.');
      }
    } else {
      // URL normal, abrir directamente
      window.open(imageUrl, '_blank');
    }
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
      <div className="detailed-report-modal" onClick={closeReportView}>
        <div className="report-viewer" onClick={(e) => e.stopPropagation()}>
          <div className="report-viewer-header">
            <div className="report-viewer-header-left">
              <img 
                src="/mopc-logo.png" 
                alt="MOPC Logo" 
                className="report-viewer-logo"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <h2 className="report-viewer-title">DIRECCIÓN DE COORDINACIÓN REGIONAL</h2>
              <p className="report-viewer-subtitle">{selectedReport.tipoIntervencion || 'INTERVENCIÓN VIAL'}</p>
            </div>
            <div className="report-viewer-header-right">
              <div className="report-info-box-row">
                <span className="report-info-label">N° REPORTE:</span>
              </div>
              <div className="report-info-box-row">
                <span className="report-info-value">{selectedReport.reportNumber}</span>
              </div>
              <div className="report-info-box-row" style={{ marginTop: '8px' }}>
                <span className="report-info-label">CREADO POR:</span>
              </div>
              <div className="report-info-box-row">
                <span className="report-info-value-normal">{selectedReport.createdBy}</span>
              </div>
              <div className="report-info-box-row" style={{ marginTop: '8px' }}>
                <span className="report-info-label">FECHA:</span>
                <span className="report-info-value-date">{selectedReport.date}</span>
              </div>
            </div>
            <button className="close-btn" onClick={closeReportView} title="Cerrar">✕</button>
          </div>
          
          {/* 📸 Banner de información de fotos */}
          {selectedReport.imagesPerDay && Object.keys(selectedReport.imagesPerDay).length > 0 && (
            <div style={{
              backgroundColor: '#d1f2eb',
              border: '2px solid #28a745',
              borderRadius: '8px',
              padding: '15px',
              margin: '15px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(40, 167, 69, 0.2)'
            }}>
              <div style={{ fontSize: '32px' }}>📸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#155724', marginBottom: '5px', fontSize: '16px' }}>
                  Este reporte contiene {Object.values(selectedReport.imagesPerDay).flat().length} foto{Object.values(selectedReport.imagesPerDay).flat().length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '13px', color: '#155724' }}>
                  Desplácese hacia abajo para ver la evidencia fotográfica después de las coordenadas GPS
                </div>
              </div>
            </div>
          )}
          
          <div className="report-viewer-content">
            {/* Ubicación */}
            <div className="report-section">
              <h3 className="section-title">📍 UBICACIÓN</h3>
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
                  <label>Municipio:</label>
                  <div className="field-value">{selectedReport.municipio}</div>
                </div>
                <div className="report-field">
                  <label>Distrito:</label>
                  <div className="field-value">{selectedReport.district}</div>
                </div>
                <div className="report-field">
                  <label>Sector:</label>
                  <div className="field-value">{selectedReport.sector}</div>
                </div>
              </div>
            </div>

            {/* Detalles de Intervención */}
            {selectedReport.metricData && Object.keys(selectedReport.metricData).length > 0 && (
              <div className="report-section">
                <h3 className="section-title">🔧 DETALLES DE INTERVENCIÓN</h3>
                <div className="report-grid">
                  {Object.entries(selectedReport.metricData)
                    .filter(([key]) => key !== 'punto_inicial' && key !== 'punto_alcanzado')
                    .map(([key, value]) => {
                      const fieldInfo = fieldLabels[key];
                      const label = fieldInfo ? fieldInfo.label : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      const displayValue = fieldInfo?.unit ? `${value} ${fieldInfo.unit}` : value;
                      
                      return (
                        <div key={key} className="report-field">
                          <label>{label}:</label>
                          <div className="field-value">{displayValue}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Vehículos Pesados */}
            {selectedReport.vehiculos && selectedReport.vehiculos.length > 0 && (
              <div className="report-section">
                <h3 className="section-title">🚜 VEHÍCULOS UTILIZADOS</h3>
                <div className="report-grid">
                  {selectedReport.vehiculos.map((vehiculo, idx) => (
                    <div key={idx} className="report-field">
                      <label>Vehículo {idx + 1}:</label>
                      <div 
                        className="field-value vehicle-clickable"
                        onClick={() => loadVehicleHistory(vehiculo)}
                        title="Click para ver historial de este vehículo"
                      >
                        <div><strong>Tipo:</strong> {vehiculo.tipo}</div>
                        <div><strong>Modelo:</strong> {vehiculo.modelo}</div>
                        <div><strong>Ficha:</strong> {vehiculo.ficha}</div>
                        <div className="view-history-hint">📋 Ver historial →</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coordenadas GPS */}


            {/* Imágenes - Priorizar imagesPerDay sobre images */}
            {selectedReport.imagesPerDay && Object.keys(selectedReport.imagesPerDay).length > 0 ? (
              <div className="report-section">
                <h3 className="section-title">📸 EVIDENCIA FOTOGRÁFICA</h3>
                {Object.entries(selectedReport.imagesPerDay).map(([dayKey, images]: [string, any]) => {
                  if (!images || images.length === 0) return null;
                  
                  const dayLabel = dayKey.replace('dia-', 'Día ').replace('general', 'General');
                  
                  return (
                    <div key={dayKey} style={{ marginBottom: '25px' }}>
                      <h4 style={{ 
                        color: '#667eea', 
                        marginBottom: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderBottom: '2px solid #667eea',
                        paddingBottom: '8px'
                      }}>
                        📅 {dayLabel} ({images.length} foto{images.length !== 1 ? 's' : ''})
                      </h4>
                      <div className="images-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '15px'
                      }}>
                        {images
                          .filter((image: any) => image && image.url)
                          .map((image: any, idx: number) => (
                            <div key={idx} className="image-item" style={{
                              border: '3px solid #667eea',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => openPhotoInNewTab(image.url)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <img 
                                src={image.url} 
                                alt={`Foto ${idx + 1} - ${dayLabel}`} 
                                loading="lazy"
                                style={{
                                  width: '100%',
                                  height: '180px',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="180"%3E%3Crect fill="%23e9ecef" width="200" height="180"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo disponible%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div style={{
                                padding: '10px',
                                fontSize: '11px',
                                color: '#666',
                                textAlign: 'center',
                                backgroundColor: '#f8f9fa',
                                borderTop: '1px solid #dee2e6'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Foto {idx + 1}</div>
                                <div>{new Date(image.timestamp).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</div>
                              </div>
                            </div>
                          ))}
                        {images.filter((image: any) => !image || !image.url).length > 0 && (
                          <div style={{ color: 'red', fontSize: '13px', marginTop: '10px' }}>
                            ⚠️ Algunas fotos no se pueden mostrar porque faltan datos o la URL.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedReport.images && selectedReport.images.length > 0 ? (
              <div className="report-section">
                <h3 className="section-title">📸 EVIDENCIA FOTOGRÁFICA ({selectedReport.images.length} fotos)</h3>
                <div className="images-grid">
                  {selectedReport.images
                    .filter((img) => !!img)
                    .map((img, idx) => (
                      <div key={idx} className="image-item" style={{
                        border: '3px solid #667eea',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onClick={() => openPhotoInNewTab(img)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <img 
                          src={img} 
                          alt={`Imagen ${idx + 1}`} 
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '180px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="180"%3E%3Crect fill="%23e9ecef" width="200" height="180"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo disponible%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <span className="image-label">Imagen {idx + 1}</span>
                      </div>
                    ))}
                  {selectedReport.images.filter((img) => !img).length > 0 && (
                    <div style={{ color: 'red', fontSize: '13px', marginTop: '10px' }}>
                      ⚠️ Algunas fotos no se pueden mostrar porque faltan datos o la URL.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Observaciones */}
            {selectedReport.observations && (
              <div className="report-section">
                <h3 className="section-title">📝 OBSERVACIONES</h3>
                <div className="observations-box">
                  {selectedReport.observations}
                </div>
              </div>
            )}
          </div>
          <div className="report-viewer-footer">
            <div className="footer-actions-left">
              <ExportButton
                selectedReport={selectedReport}
                onExport={(format) => handleExport(format)}
              />
              <button 
                className="report-edit-btn"
                onClick={() => {
                  console.log('🔍 EDITAR - Reporte seleccionado completo:', selectedReport);
                  console.log('🔍 EDITAR - numeroReporte:', selectedReport?.numeroReporte);
                  console.log('🔍 EDITAR - imagesPerDay:', selectedReport?.imagesPerDay);
                  console.log('🔍 EDITAR - images (legacy):', selectedReport?.images);
                  
                  // 🔄 MIGRACIÓN: Convertir formato legacy a imagesPerDay si es necesario
                  let imagesPerDayToUse = selectedReport?.imagesPerDay || {};
                  if (selectedReport && selectedReport.images && Array.isArray(selectedReport.images) && selectedReport.images.length > 0) {
                    if (!selectedReport.imagesPerDay || Object.keys(selectedReport.imagesPerDay).length === 0) {
                      console.log('🔄 MIGRACIÓN: Convirtiendo images (legacy) → imagesPerDay');
                      imagesPerDayToUse = {
                        'general': selectedReport.images.map((url: string, index: number) => ({
                          url: url,
                          timestamp: new Date().toISOString()
                        }))
                      };
                      console.log('✅ MIGRACIÓN: Fotos convertidas:', imagesPerDayToUse);
                    }
                  }
                  
                  // 🔄 MAPEAR propiedades al formato que ReportForm espera
                  const reportToEdit = {
                    id: selectedReport.id,
                    _pendingReportId: selectedReport.id, // Para que se actualice en lugar de crear nuevo
                    region: selectedReport.region,
                    provincia: selectedReport.province, // province → provincia
                    distrito: selectedReport.district, // district → distrito
                    municipio: selectedReport.municipio,
                    sector: selectedReport.sector,
                    tipoIntervencion: selectedReport.tipoIntervencion,
                    subTipoCanal: selectedReport.subTipoCanal,
                    observaciones: selectedReport.observations || '', // observations → observaciones
                    metricData: selectedReport.metricData || {},
                    vehiculos: selectedReport.vehiculos || [],
                    fechaReporte: selectedReport.fechaProyecto || selectedReport.fechaCreacion?.split('T')[0] || '',
                    fechaInicio: selectedReport.fechaProyecto || '',
                    fechaFinal: '',
                    estado: selectedReport.estado,
                    imagesPerDay: imagesPerDayToUse,
                    numeroReporte: selectedReport.numeroReporte,
                    creadoPor: selectedReport.creadoPor,
                    _isEditingPending: selectedReport.estado === 'pendiente'
                  };
                  
                  const totalFotos = reportToEdit?.imagesPerDay ? Object.values(reportToEdit.imagesPerDay).flat().length : 0;
                  console.log('🔍 EDITAR - Cantidad de fotos FINAL:', totalFotos);
                  console.log('✅ EDITAR - Objeto mapeado para ReportForm:', reportToEdit);
                  
                  if (onEditReport) {
                    onEditReport(reportToEdit as any);
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
            <button className="btn-secondary" onClick={closeReportView}>Cerrar Informe</button>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal con filtros avanzados y múltiples modos
  return (
    <div className="detailed-report-view">
      {/* Header mejorado */}
      <div className="header">
        <div className="header-left">
          <h2>📊 Informes y Estadísticas Detalladas</h2>
          <p className="header-subtitle">Análisis completo de intervenciones viales</p>
          {/* Mensaje informativo para Admin/Supervisor */}
          {(user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'admin' || user?.role === 'supervisor') && (
            <p style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#856404'
            }}>
              🟠 <strong>{user.role}:</strong> Puedes ver reportes <strong>pendientes</strong> de todos los usuarios. Usa el filtro de estado para verlos.
            </p>
          )}
          {/* Mensaje informativo para Técnico */}
          {(user?.role === 'Técnico' || user?.role === 'tecnico') && (
            <p style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196F3',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#0d47a1'
            }}>
              ℹ️ <strong>Técnico:</strong> Puedes ver todos tus reportes, incluyendo los <strong>pendientes</strong>. Usa el filtro de estado para filtrarlos.
            </p>
          )}
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
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('total')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('total');
            }
          }}
        >
          <div className="stat-icon-compact">📊</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.total}</div>
            <div className="stat-label-compact">Total Informes</div>
          </div>
        </div>
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('completados')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('completados');
            }
          }}
        >
          <div className="stat-icon-compact">✅</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.completados}</div>
            <div className="stat-label-compact">Completados</div>
          </div>
        </div>
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('pendientes')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('pendientes');
            }
          }}
        >
          <div className="stat-icon-compact">⏳</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.pendientes}</div>
            <div className="stat-label-compact">Pendientes</div>
          </div>
        </div>
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('enProgreso')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('enProgreso');
            }
          }}
        >
          <div className="stat-icon-compact">🔄</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.enProgreso}</div>
            <div className="stat-label-compact">En Progreso</div>
          </div>
        </div>
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('kmTotal')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('kmTotal');
            }
          }}
        >
          <div className="stat-icon-compact">📏</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.totalKm.toFixed(1)}</div>
            <div className="stat-label-compact">Km Totales</div>
          </div>
        </div>
        <div
          className="stat-box-compact"
          role="button"
          tabIndex={0}
          onClick={() => openStatsList('kmPromedio')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openStatsList('kmPromedio');
            }
          }}
        >
          <div className="stat-icon-compact">📐</div>
          <div className="stat-text-compact">
            <div className="stat-value-compact">{stats.promedioKm.toFixed(2)}</div>
            <div className="stat-label-compact">Km Promedio</div>
          </div>
        </div>
      </div>

      {statsListOpen && statsListType && (
        <div className="stats-list-panel">
          <div className="stats-list-header">
            <div className="stats-list-title">
              <h4>{statsListTitle}</h4>
              <span className="stats-list-count">{statsListReports.length} reporte(s)</span>
            </div>
            <button className="stats-list-close" onClick={() => setStatsListOpen(false)} title="Cerrar">
              ✕
            </button>
          </div>
          <div className="stats-list-body">
            {statsListReports.length === 0 ? (
              <div className="stats-list-empty">No hay reportes para este criterio.</div>
            ) : (
              statsListReports.map((report) => (
                <div key={report.id} className="stats-list-item">
                  <div className="stats-list-main">
                    <button
                      type="button"
                      className="stats-list-report stats-list-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewReport(report, e);
                      }}
                      title="Ver detalle del reporte"
                    >
                      #{report.numeroReporte || report.reportNumber}
                    </button>
                    <span className="stats-list-user">👤 {report.creadoPor || report.createdBy || 'N/A'}</span>
                  </div>
                  <div className="stats-list-date">
                    📅 {getReportStartDate(report)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Barra de acciones y exportación */}
      <div className="actions-toolbar">
        <div className="results-info">
          Mostrando <strong>{filteredReports.length}</strong> de <strong>{allReportsFlat.length}</strong> informes
        </div>
        <div className="export-buttons">
          <button className="btn-export" onClick={handlePrint}>
            🖨️ Imprimir vista actual
          </button>
          {filterPeriod !== 'todos' && (
            <button
              className="btn-export"
              onClick={handleDownloadPdf}
              disabled={filteredReports.length === 0}
              title={filteredReports.length === 0 ? 'No hay reportes para descargar con los filtros actuales' : 'Descargar un PDF con todos los reportes del período'}
            >
              📄 Descargar PDF
            </button>
          )}
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
                    <td className="report-num-cell">
                      <span 
                        className="report-number-link"
                        onClick={(e) => viewReport(report, e)}
                        style={{ cursor: 'pointer', color: '#667eea', fontWeight: 'bold', textDecoration: 'underline' }}
                        title="Click para ver detalles"
                      >
                        #{report.reportNumber}
                      </span>
                    </td>
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
                    <td className="km-cell">
                      {(parseFloat(report.metricData?.longitud_intervencion || '0') || report.kilometraje || 0).toFixed(2)} km
                    </td>
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
                // Obtener kilometraje desde campo manual de la plantilla
                const kmReport = parseFloat(report.metricData?.longitud_intervencion || '0') || 0;
                statsByType[tipo].totalKm += kmReport;
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

      {/* Modal de Historial de Vehículo */}
      {selectedVehicle && (
        <div className="vehicle-history-modal">
          <div className="vehicle-history-container">
            <div className="vehicle-history-header">
              <div className="vehicle-history-title">
                <h2>🚜 Historial del Vehículo</h2>
                <div className="vehicle-info-header">
                  <div><strong>Tipo:</strong> {selectedVehicle.tipo}</div>
                  <div><strong>Modelo:</strong> {selectedVehicle.modelo}</div>
                  <div><strong>Ficha:</strong> {selectedVehicle.ficha}</div>
                </div>
              </div>
              <button className="close-btn" onClick={closeVehicleModal}>✕</button>
            </div>
            
            <div className="vehicle-history-content">
              {vehicleHistory.length === 0 ? (
                <div className="no-history-message">
                  <div className="no-history-icon">📭</div>
                  <p>No se encontró historial para este vehículo</p>
                </div>
              ) : (
                <div className="history-timeline">
                  <div className="history-stats">
                    <div className="stat-badge">
                      <span className="stat-number">{vehicleHistory.length}</span>
                      <span className="stat-label">Actividades Registradas</span>
                    </div>
                  </div>
                  
                  {vehicleHistory.map((activity, index) => (
                    <div key={index} className="history-entry">
                      <div className="history-date-badge">
                        <div className="history-day">{new Date(activity.fecha).getDate()}</div>
                        <div className="history-month">
                          {new Date(activity.fecha).toLocaleDateString('es-ES', { month: 'short' })}
                        </div>
                      </div>
                      
                      <div className="history-details">
                        <div className="history-header-row">
                          <h3 className="history-activity">{activity.tipoIntervencion}</h3>
                          <span className="history-report-num">#{activity.numeroReporte}</span>
                        </div>
                        
                        <div className="history-date-full">
                          📅 {activity.fechaDisplay}
                        </div>
                        
                        <div className="history-location">
                          <div className="location-item">
                            <strong>📍 Ubicación:</strong>
                          </div>
                          <div className="location-details">
                            <div>• <strong>Región:</strong> {activity.region}</div>
                            <div>• <strong>Provincia:</strong> {activity.provincia}</div>
                            <div>• <strong>Distrito:</strong> {activity.distrito}</div>
                            <div>• <strong>Municipio:</strong> {activity.municipio}</div>
                            <div>• <strong>Sector:</strong> {activity.sector}</div>
                          </div>
                        </div>
                        
                        <div className="history-user">
                          👤 <strong>Registrado por:</strong> {activity.usuario}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="vehicle-history-footer">
              <button className="btn-close-modal" onClick={closeVehicleModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedReportView;

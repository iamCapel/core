import React, { useState, useEffect } from 'react';
import { reportStorage } from '../services/reportStorage';
import { firebasePendingReportStorage } from '../services/firebasePendingReportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import PendingClockAnimation from './PendingClockAnimation';
import PendingReportsModal from './PendingReportsModal';

type Field = { key: string; label: string; type: 'text' | 'number'; unit: string };

interface User {
  username: string;
  name: string;
}

interface ReportFormProps {
  user: User;
  onBack: () => void;
  plantillaDefault: Field[];
  regionesRD: string[];
  provinciasPorRegion: Record<string, string[]>;
  municipiosPorProvincia: Record<string, string[]>;
  sectoresPorProvincia: Record<string, string[]>;
  distritosPorProvincia: Record<string, string[]>;
  distritosPorMunicipio: Record<string, string[]>;
  opcionesIntervencion: string[];
  canalOptions: string[];
  plantillasPorIntervencion: Record<string, Field[]>;
  interventionToEdit?: any;
  isGpsEnabled?: boolean;
  gpsPosition?: { lat: number; lon: number } | null;
  initialSection?: 'actividades' | 'vehiculos';
}

const ReportForm: React.FC<ReportFormProps> = ({
  user,
  onBack,
  plantillaDefault,
  regionesRD,
  provinciasPorRegion,
  municipiosPorProvincia,
  sectoresPorProvincia,
  distritosPorProvincia,
  distritosPorMunicipio,
  opcionesIntervencion,
  canalOptions,
  plantillasPorIntervencion,
  interventionToEdit,
  isGpsEnabled: parentGpsEnabled = false,
  gpsPosition: parentGpsPosition = null,
  initialSection = 'actividades'
}) => {
  // Estados del formulario
  const [region, setRegion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sector, setSector] = useState('');
  const [sectorPersonalizado, setSectorPersonalizado] = useState('');
  const [mostrarSectorPersonalizado, setMostrarSectorPersonalizado] = useState(false);
  const [distritoPersonalizado, setDistritoPersonalizado] = useState('');
  const [mostrarDistritoPersonalizado, setMostrarDistritoPersonalizado] = useState(false);
  const [fechaReporte, setFechaReporte] = useState('');
  
  // Estados para sistema multi-día
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [diasTrabajo, setDiasTrabajo] = useState<string[]>([]);
  const [diaActual, setDiaActual] = useState(0);
  const [reportesPorDia, setReportesPorDia] = useState<Record<string, any>>({});
  
  // 📸 Estado para imágenes del reporte
  const [imagesPerDay, setImagesPerDay] = useState<Record<string, any>>({});
  
  // 🖼️ Estado para modal de visualización de fotos
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentDayKey, setCurrentDayKey] = useState('');
  
  const [tipoIntervencion, setTipoIntervencion] = useState('');
  const [subTipoCanal, setSubTipoCanal] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (initialSection === 'vehiculos' && !tipoIntervencion) {
      // Activar el registro de vehículos pesados en el formulario principal
      setTipoIntervencion('Canalización');
    }
  }, [initialSection, tipoIntervencion]);

  // Estados para vehículos (ahora es un array)
  const [vehiculos, setVehiculos] = useState<Array<{tipo: string, modelo: string, ficha: string}>>([]);
  const [tipoVehiculoActual, setTipoVehiculoActual] = useState('');
  const [modeloVehiculoActual, setModeloVehiculoActual] = useState('');
  const [fichaVehiculoActual, setFichaVehiculoActual] = useState('');

  const [plantillaFields, setPlantillaFields] = useState<Field[]>(plantillaDefault);
  const [plantillaValues, setPlantillaValues] = useState<Record<string, string>>({});

  // Estado para animación de guardado
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [showPendingAnimation, setShowPendingAnimation] = useState(false);
  const [currentPendingReportId, setCurrentPendingReportId] = useState<string | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingReportsList, setPendingReportsList] = useState<any[]>([]);
  const [isLoadingPendingData, setIsLoadingPendingData] = useState(false); // ✅ Flag para evitar auto-save durante carga
  const [isUnmounting, setIsUnmounting] = useState(false); // ✅ Flag para evitar auto-save al desmontar

  // GPS state
  const [gpsEnabled, setGpsEnabled] = useState(parentGpsEnabled);
  const [gpsStatus, setGpsStatus] = useState('');
  const [pendingCoords, setPendingCoords] = useState<{lat: number, lon: number} | null>(null);
  const [targetField, setTargetField] = useState<{key: string, label: string} | null>(null);
  const [approvedGpsFields, setApprovedGpsFields] = useState<Set<string>>(new Set());
  const [rejectedGpsFields, setRejectedGpsFields] = useState<Set<string>>(new Set());
  const [autoGpsFields, setAutoGpsFields] = useState<Record<string, {lat: number, lon: number}>>({});

  // Si el dashboard ya habilitó GPS y proporcionó una posición, usarla como autoGpsFields
  useEffect(() => {
    if (parentGpsEnabled && parentGpsPosition) {
      setAutoGpsFields(prev => ({
        ...prev,
        punto_inicial: { lat: parentGpsPosition.lat, lon: parentGpsPosition.lon },
        punto_alcanzado: { lat: parentGpsPosition.lat, lon: parentGpsPosition.lon }
      }));
      setGpsStatus('GPS habilitado desde el sistema');
      setGpsEnabled(true);
    }
  }, [parentGpsEnabled, parentGpsPosition]);
  // Sincronizar GPS del parent
  useEffect(() => {
    setGpsEnabled(parentGpsEnabled);
    if (parentGpsEnabled && parentGpsPosition) {
      setGpsStatus('GPS habilitado desde el sistema');
    }
  }, [parentGpsEnabled, parentGpsPosition]);

  // Efecto para calcular días entre fechas
  useEffect(() => {
    // ⚠️ No ejecutar si estamos cargando datos pendientes
    if (isLoadingPendingData) {
      console.log('⏸️ Saltando auto-generación de días - cargando datos pendientes');
      return;
    }
    
    if (fechaInicio && fechaFinal) {
      const inicio = new Date(fechaInicio);
      const final = new Date(fechaFinal);
      
      if (final >= inicio) {
        const dias: string[] = [];
        const current = new Date(inicio);
        
        while (current <= final) {
          dias.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        
        setDiasTrabajo(dias);
        setDiaActual(0);
        
        // Inicializar reportes por día si no existen
        const nuevosReportes: Record<string, any> = {};
        let vehiculosPrevios: any[] = [];
        
        dias.forEach((dia, index) => {
          if (!reportesPorDia[dia]) {
            // ✅ Los días después del primero heredan los vehículos del día anterior
            nuevosReportes[dia] = {
              fecha: dia,
              tipoIntervencion: '',
              subTipoCanal: '',
              observaciones: '',
              vehiculos: index === 0 ? [] : [...vehiculosPrevios], // Heredar vehículos
              plantillaValues: {},
              autoGpsFields: {},
              completado: false
            };
            vehiculosPrevios = nuevosReportes[dia].vehiculos;
          } else {
            nuevosReportes[dia] = reportesPorDia[dia];
            // Actualizar vehículos previos para el siguiente día
            if (reportesPorDia[dia].vehiculos) {
              vehiculosPrevios = reportesPorDia[dia].vehiculos;
            }
          }
        });
        setReportesPorDia(nuevosReportes);
      }
    }
  }, [fechaInicio, fechaFinal, isLoadingPendingData]);

  // Cargar reportes pendientes cuando se abre el modal
  useEffect(() => {
    if (showPendingModal) {
      console.log('📥 Modal de pendientes abierto, cargando reportes...');
      getPendingReports();
    }
  }, [showPendingModal]);

  // 🖼️ Manejo de tecla ESC para cerrar modal de fotos
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && photoModalOpen) {
        closePhotoModal();
      }
    };
    
    if (photoModalOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [photoModalOpen]);

  // Lógica de habilitación de campos
  const provinciasDisponibles = region ? provinciasPorRegion[region] || [] : [];
  const municipiosDisponibles = provincia ? municipiosPorProvincia[provincia] || [] : [];
  const distritosDisponibles = municipio ? distritosPorMunicipio[municipio] || [] : [];
  const sectoresDisponibles = provincia ? sectoresPorProvincia[provincia] || [] : [];
  
  // Verificar si todos los campos geográficos están completos
  const distritoFinal = distrito === 'otros' ? distritoPersonalizado : distrito;
  const camposGeograficosCompletos = region && provincia && distritoFinal && municipio && (sector || (sector === 'otros' && sectorPersonalizado));

  // Cargar intervención para editar si se proporciona
  useEffect(() => {
    if (interventionToEdit) {
      setIsLoadingPendingData(true); // ✅ Bloquear auto-save durante carga
      
      console.log('🔄 ReportForm: Cargando interventionToEdit:', interventionToEdit);
      console.log('🔍 Claves del objeto:', Object.keys(interventionToEdit));
      console.log('🔍 Valores completos:', JSON.stringify(interventionToEdit, null, 2));
      
      // Si viene de un reporte pendiente, guardar el ID
      if (interventionToEdit._pendingReportId) {
        console.log('📌 Estableciendo currentPendingReportId:', interventionToEdit._pendingReportId);
        setCurrentPendingReportId(interventionToEdit._pendingReportId);
      }
      
      console.log('📍 Cargando campos geográficos:', {
        region: interventionToEdit.region,
        provincia: interventionToEdit.provincia,
        municipio: interventionToEdit.municipio,
        distrito: interventionToEdit.distrito,
        sector: interventionToEdit.sector
      });
      
      setRegion(interventionToEdit.region || '');
      setProvincia(interventionToEdit.provincia || '');
      setDistrito(interventionToEdit.distrito || '');
      setMunicipio(interventionToEdit.municipio || '');
      
      console.log('🔧 Cargando campos personalizados:', {
        sectorPersonalizado: interventionToEdit.sectorPersonalizado,
        mostrarSectorPersonalizado: interventionToEdit.mostrarSectorPersonalizado,
        distritoPersonalizado: interventionToEdit.distritoPersonalizado,
        mostrarDistritoPersonalizado: interventionToEdit.mostrarDistritoPersonalizado
      });
      
      // Cargar sector personalizado si existe
      if (interventionToEdit.sectorPersonalizado) {
        setSectorPersonalizado(interventionToEdit.sectorPersonalizado);
      }
      if (interventionToEdit.mostrarSectorPersonalizado) {
        setMostrarSectorPersonalizado(true);
      }
      
      // Cargar distrito personalizado si existe
      if (interventionToEdit.distritoPersonalizado) {
        setDistritoPersonalizado(interventionToEdit.distritoPersonalizado);
      }
      if (interventionToEdit.mostrarDistritoPersonalizado) {
        setMostrarDistritoPersonalizado(true);
      }
      
      // Manejar sector
      const sectoresDisponiblesParaProvincia = sectoresPorProvincia[interventionToEdit.provincia] || [];
      if (sectoresDisponiblesParaProvincia.includes(interventionToEdit.sector)) {
        setSector(interventionToEdit.sector);
        setMostrarSectorPersonalizado(false);
        setSectorPersonalizado('');
      } else {
        setSector('otros');
        setMostrarSectorPersonalizado(true);
        setSectorPersonalizado(interventionToEdit.sector || '');
      }
      
      // Manejar distrito personalizado
      if (interventionToEdit.mostrarDistritoPersonalizado) {
        setDistrito('otros');
        setMostrarDistritoPersonalizado(true);
        setDistritoPersonalizado(interventionToEdit.distritoPersonalizado || '');
      }
      
      // Manejar tipo de intervención
      let tipoBase = interventionToEdit.tipoIntervencion;
      let subTipo = '';
      
      if (interventionToEdit.tipoIntervencion?.includes(':')) {
        const partes = interventionToEdit.tipoIntervencion.split(':');
        tipoBase = partes[0];
        subTipo = partes[1];
      }
      
      console.log('🔧 Cargando tipo de intervención:', {
        tipoBase,
        subTipo: subTipo || interventionToEdit.subTipoCanal
      });
      
      setTipoIntervencion(tipoBase);
      setSubTipoCanal(subTipo || interventionToEdit.subTipoCanal || '');
      
      // Cargar observaciones
      console.log('📝 Cargando observaciones:', interventionToEdit.observaciones);
      setObservaciones(interventionToEdit.observaciones || '');
      
      // Cargar fecha del reporte si existe
      if (interventionToEdit.fechaReporte) {
        console.log('📅 Cargando fechaReporte:', interventionToEdit.fechaReporte);
        setFechaReporte(interventionToEdit.fechaReporte);
      } else if (interventionToEdit.timestamp) {
        // Si no hay fechaReporte, usar timestamp
        const fecha = new Date(interventionToEdit.timestamp).toISOString().split('T')[0];
        console.log('📅 Cargando fecha desde timestamp:', fecha);
        setFechaReporte(fecha);
      }
      
      // Cargar valores de plantilla (metricData si viene de pendiente)
      const valoresPlantilla: Record<string, string> = interventionToEdit.metricData || {};
      
      // Si no hay metricData, cargar desde los campos individuales (reporte normal)
      if (!interventionToEdit.metricData) {
        plantillaDefault.forEach(field => {
          if (interventionToEdit[field.key]) {
            valoresPlantilla[field.key] = interventionToEdit[field.key];
          }
        });
        
        if (interventionToEdit.nombre_mina) {
          valoresPlantilla.nombre_mina = interventionToEdit.nombre_mina;
        }
      }
      
      console.log('📊 Cargando valores de plantilla (metricData):', valoresPlantilla);
      setPlantillaValues(valoresPlantilla);
      
      // Cargar vehículos si existen
      if (interventionToEdit.vehiculos && Array.isArray(interventionToEdit.vehiculos)) {
        console.log('🚜 Cargando vehículos:', interventionToEdit.vehiculos);
        setVehiculos(interventionToEdit.vehiculos);
      }
      
      // Cargar datos GPS si existen
      if (interventionToEdit.gpsData) {
        console.log('📍 Cargando datos GPS:', interventionToEdit.gpsData);
        setAutoGpsFields(interventionToEdit.gpsData);
      }
      
      // 📸 Cargar imágenes si existen (con conversión automática desde formato legacy)
      if (interventionToEdit.imagesPerDay && Object.keys(interventionToEdit.imagesPerDay).length > 0) {
        const totalFotos = Object.values(interventionToEdit.imagesPerDay).flat().length;
        console.log('📸 Cargando imágenes del reporte:', interventionToEdit.imagesPerDay);
        console.log('📸 Total de fotos encontradas:', totalFotos);
        console.log('📸 Días con fotos:', Object.keys(interventionToEdit.imagesPerDay));
        setImagesPerDay(interventionToEdit.imagesPerDay);
      } else if (interventionToEdit.images && Array.isArray(interventionToEdit.images) && interventionToEdit.images.length > 0) {
        // 🔄 Conversión de formato legacy images → imagesPerDay
        console.log('🔄 ReportForm: Convirtiendo images (legacy) → imagesPerDay');
        console.log('📸 Array de images:', interventionToEdit.images);
        const convertedImages = {
          'general': interventionToEdit.images.map((url: string, index: number) => ({
            url: url,
            timestamp: new Date().toISOString()
          }))
        };
        console.log('✅ ReportForm: Fotos convertidas:', convertedImages);
        console.log('✅ ReportForm: Total fotos:', convertedImages.general.length);
        setImagesPerDay(convertedImages);
      } else {
        console.log('📸 Este reporte NO tiene fotos (ni imagesPerDay ni images)');
      }
      
      // ⭐ PRIMERO: Cargar datos multi-día si existen (ANTES de cargar fechas simples)
      if (interventionToEdit.diasTrabajo && Array.isArray(interventionToEdit.diasTrabajo) && interventionToEdit.diasTrabajo.length > 0) {
        console.log('📅 🔄 MODO MULTI-DÍA - Cargando días de trabajo:', interventionToEdit.diasTrabajo);
        
        // Cargar primero los reportes por día
        if (interventionToEdit.reportesPorDia) {
          console.log('📦 Cargando reportes por día:', interventionToEdit.reportesPorDia);
          setReportesPorDia(interventionToEdit.reportesPorDia);
        }
        
        // Luego los días
        setDiasTrabajo(interventionToEdit.diasTrabajo);
        
        // Luego el día actual
        if (interventionToEdit.diaActual !== undefined) {
          console.log('📌 Cargando día actual:', interventionToEdit.diaActual);
          setDiaActual(interventionToEdit.diaActual);
        }
        
        // Finalmente las fechas (esto puede disparar el useEffect pero está bloqueado)
        if (interventionToEdit.fechaInicio) {
          console.log('📅 Cargando fechaInicio:', interventionToEdit.fechaInicio);
          setFechaInicio(interventionToEdit.fechaInicio);
        }
        
        if (interventionToEdit.fechaFinal) {
          console.log('📅 Cargando fechaFinal:', interventionToEdit.fechaFinal);
          setFechaFinal(interventionToEdit.fechaFinal);
        }
      } 
      // Si NO es multi-día, cargar fecha simple
      else if (interventionToEdit.fechaProyecto) {
        console.log('📅 Cargando fecha simple del proyecto:', interventionToEdit.fechaProyecto);
        setFechaInicio(interventionToEdit.fechaProyecto);
        setFechaFinal(interventionToEdit.fechaProyecto);
      }
      
      console.log('✅ ReportForm: Datos cargados completamente');
      
      // ✅ Desbloquear auto-save después de un delay más largo para asegurar que React termine
      setTimeout(() => {
        console.log('🔓 Desbloqueando auto-save');
        setIsLoadingPendingData(false);
      }, 1000); // Aumentado a 1 segundo
    }
  }, [interventionToEdit, plantillaDefault, sectoresPorProvincia]);

  // Efecto para obtener coordenadas automáticamente cuando se activa GPS
  useEffect(() => {
    if (gpsEnabled && plantillaFields.length > 0) {
      // Buscar campos de coordenadas en la plantilla actual
      const coordFields = plantillaFields.filter(field => 
        field.key.includes('punto_inicial') || field.key.includes('punto_alcanzado')
      );
      
      if (coordFields.length > 0 && !('geolocation' in navigator)) {
        setGpsStatus('Geolocalización no soportada.');
        return;
      }

      if (coordFields.length > 0) {
        setGpsStatus('Obteniendo ubicación automáticamente...');
        
        navigator.geolocation.getCurrentPosition(
          pos => {
            const coords = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            };
            
            // Agregar coordenadas automáticas para todos los campos de coordenadas
            const newAutoGpsFields: Record<string, {lat: number, lon: number}> = {};
            coordFields.forEach(field => {
              newAutoGpsFields[field.key] = coords;
            });
            
            setAutoGpsFields(newAutoGpsFields);
            setGpsStatus(`Coordenadas obtenidas: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          },
          error => {
            let errorMsg = 'Error GPS: ';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMsg += 'Permiso denegado. Active la ubicación en su navegador.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg += 'Ubicación no disponible.';
                break;
              case error.TIMEOUT:
                errorMsg += 'Tiempo agotado.';
                break;
              default:
                errorMsg += 'Error desconocido.';
            }
            setGpsStatus(errorMsg);
            setAutoGpsFields({});
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    } else {
      setAutoGpsFields({});
    }
  }, [gpsEnabled, plantillaFields]);
  useEffect(() => {
    if (tipoIntervencion === 'Canalización' && subTipoCanal) {
      const key = `${tipoIntervencion}:${subTipoCanal}`;
      setPlantillaFields(plantillasPorIntervencion[key] || plantillaDefault);
    } else if (tipoIntervencion && tipoIntervencion !== 'Canalización') {
      setPlantillaFields(plantillasPorIntervencion[tipoIntervencion] || plantillaDefault);
    } else {
      setPlantillaFields(plantillaDefault);
    }
  }, [tipoIntervencion, subTipoCanal, plantillasPorIntervencion, plantillaDefault]);

  // Funciones de manejo del formulario
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value);
    setProvincia('');
    setMunicipio('');
    setDistrito('');
    setDistritoPersonalizado('');
    setMostrarDistritoPersonalizado(false);
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvincia(e.target.value);
    setMunicipio('');
    setDistrito('');
    setDistritoPersonalizado('');
    setMostrarDistritoPersonalizado(false);
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  // Funciones de notificaciones
  const updatePendingCount = async () => {
    try {
      const pendientes = await firebasePendingReportStorage.getAllPendingReports();
      setPendingCount(pendientes.length);
    } catch (error) {
      console.error('❌ Error actualizando contador de pendientes desde Firebase:', error);
      setPendingCount(0);
    }
  };

  const getPendingReports = async () => {
    try {
      const pendingReports = await firebasePendingReportStorage.getAllPendingReports();
      const formattedReports = pendingReports.map(report => ({
        id: report.id,
        reportNumber: `DCR-${report.id.split('_').pop()?.slice(-6) || '000000'}`,
        timestamp: report.timestamp,
        estado: 'pendiente',
        region: report.formData.region || 'N/A',
        provincia: report.formData.provincia || 'N/A',
        municipio: report.formData.municipio || 'N/A',
        tipoIntervencion: report.formData.tipoIntervencion || 'No especificado'
      }));
      setPendingReportsList(formattedReports);
      return formattedReports;
    } catch (error) {
      console.error('❌ Error obteniendo reportes pendientes desde Firebase:', error);
      setPendingReportsList([]);
      return [];
    }
  };

  const handleContinuePendingReport = async (reportId: string) => {
    console.log('📋 Continuando reporte pendiente desde ReportForm:', reportId);
    try {
      const pendingReport = await firebasePendingReportStorage.getPendingReport(reportId);
      if (!pendingReport) {
        console.error('❌ Reporte pendiente no encontrado en Firebase');
        alert('No se encontró el reporte pendiente. Puede que haya sido eliminado.');
        return;
      }
      await loadPendingReportData(pendingReport, reportId);
    } catch (error) {
      console.error('❌ Error cargando reporte pendiente desde Firebase:', error);
      alert('Error al cargar el reporte pendiente. Verifique su conexión a internet.');
    }
  };

  const loadPendingReportData = async (pendingReport: any, reportId: string) => {
    if (pendingReport && pendingReport.formData) {
      setIsLoadingPendingData(true); // 🔒 Bloquear auto-save durante carga
      
      // Cargar TODOS los datos del reporte pendiente
      const data = pendingReport.formData;
      setRegion(data.region || '');
      setProvincia(data.provincia || '');
      setMunicipio(data.municipio || '');
      setDistrito(data.distrito || '');
      
      // Restaurar sector personalizado si existe
      if (data.mostrarSectorPersonalizado) {
        setSector('otros');
        setMostrarSectorPersonalizado(true);
        setSectorPersonalizado(data.sectorPersonalizado || '');
      } else {
        setSector(data.sector || '');
        setMostrarSectorPersonalizado(false);
        setSectorPersonalizado('');
      }
      
      // Restaurar distrito personalizado si existe
      if (data.mostrarDistritoPersonalizado) {
        setDistrito('otros');
        setMostrarDistritoPersonalizado(true);
        setDistritoPersonalizado(data.distritoPersonalizado || '');
      } else {
        setDistrito(data.distrito || '');
        setMostrarDistritoPersonalizado(false);
        setDistritoPersonalizado('');
      }
      
      // Restaurar fecha si existe
      setFechaReporte(data.fechaReporte || '');
      
      setTipoIntervencion(data.tipoIntervencion || '');
      setSubTipoCanal(data.subTipoCanal || '');
      setPlantillaValues(data.metricData || {});
      setObservaciones(data.observaciones || '');
      
      // Restaurar información de vehículos (array)
      setVehiculos(data.vehiculos || []);
      setTipoVehiculoActual('');
      setFichaVehiculoActual('');
      
      // 🆕 Restaurar datos GPS
      if (data.gpsData) {
        setAutoGpsFields(data.gpsData);
      }
      
      // 🆕 Restaurar datos multi-día si existen
      if (data.diasTrabajo && Array.isArray(data.diasTrabajo) && data.diasTrabajo.length > 0) {
        console.log('🔄 Restaurando datos multi-día:', data.diasTrabajo);
        setDiasTrabajo(data.diasTrabajo);
        
        if (data.reportesPorDia) {
          setReportesPorDia(data.reportesPorDia);
        }
        
        if (data.fechaInicio) {
          setFechaInicio(data.fechaInicio);
        }
        
        if (data.fechaFinal) {
          setFechaFinal(data.fechaFinal);
        }
        
        if (data.diaActual !== undefined) {
          setDiaActual(data.diaActual);
        }
      }
      
      setCurrentPendingReportId(reportId);
      setShowPendingModal(false);
      
      console.log('✅ Reporte pendiente cargado completo:', reportId);
      
      // 🔓 Desbloquear después de un delay
      setTimeout(() => {
        setIsLoadingPendingData(false);
      }, 1000);
    }
  };

  const handleCancelPendingReport = async (reportId: string) => {
    console.log('❌ Cancelando reporte pendiente:', reportId);
    try {
      // Eliminar SOLO de Firebase
      await firebasePendingReportStorage.deletePendingReport(reportId);
      console.log('✅ Reporte eliminado exitosamente de Firebase');
      
      await updatePendingCount();
      setShowPendingModal(false);
      setTimeout(() => setShowPendingModal(true), 100);
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
  
  // ✅ Detectar cuando el componente se va a desmontar
  useEffect(() => {
    return () => {
      console.log('🔴 ReportForm desmontando - bloqueando auto-save');
      setIsUnmounting(true);
    };
  }, []);

  // Efecto para guardar automáticamente los cambios en reportes pendientes
  useEffect(() => {
    // ✅ NO guardar si está cargando datos
    if (isLoadingPendingData) {
      console.log('⏸️ Auto-save bloqueado: cargando datos...');
      return;
    }
    
    // ✅ NO guardar si está desmontando
    if (isUnmounting) {
      console.log('⏸️ Auto-save bloqueado: desmontando componente...');
      return;
    }
    
    // ✅ NO guardar si NO hay datos válidos (todos los campos geográficos vacíos)
    if (!region && !provincia && !municipio && !distrito && !tipoIntervencion) {
      console.log('⏸️ Auto-save bloqueado: sin datos válidos para guardar');
      return;
    }
    
    // Si hay un reporte pendiente activo, guardar automáticamente los cambios
    if (currentPendingReportId) {
      const timer = setTimeout(async () => {
        try {
          const pendingReport = {
            id: currentPendingReportId,
            timestamp: fechaReporte ? new Date(fechaReporte).toISOString() : new Date().toISOString(),
            lastModified: new Date().toISOString(),
            userId: user.username,
            userName: user.name || user.username,
            formData: {
              region,
              provincia,
              distrito,
              municipio,
              sector,
              sectorPersonalizado,
              mostrarSectorPersonalizado,
              distritoPersonalizado,
              mostrarDistritoPersonalizado,
              fechaReporte,
              tipoIntervencion,
              subTipoCanal,
              metricData: plantillaValues,
              observaciones,
              vehiculos,
              gpsData: autoGpsFields, // ¡IMPORTANTE! Guardar datos GPS
              // 🆕 Guardar datos multi-día
              diasTrabajo: diasTrabajo.length > 0 ? diasTrabajo : undefined,
              reportesPorDia: diasTrabajo.length > 0 ? reportesPorDia : undefined,
              fechaInicio: fechaInicio || undefined,
              fechaFinal: fechaFinal || undefined,
              diaActual: diasTrabajo.length > 0 ? diaActual : undefined
            },
            progress: 0,
            fieldsCompleted: []
          };
          
          console.log('💾 Guardando automáticamente reporte pendiente en Firebase:', currentPendingReportId);
          console.log('📦 Datos a guardar:', pendingReport.formData);
          
          // Guardar SOLO en Firebase
          await firebasePendingReportStorage.savePendingReport(pendingReport);
          console.log('✅ Cambios guardados automáticamente en Firebase');
        } catch (error) {
          console.error('❌ Error al guardar en Firebase:', error);
          console.error('⚠️ No se pudo guardar. Verifique su conexión a internet.');
        }
      }, 1000); // Guardar después de 1 segundo de inactividad
      
      return () => clearTimeout(timer);
    }
  }, [
    currentPendingReportId,
    region,
    provincia,
    distrito,
    municipio,
    sector,
    sectorPersonalizado,
    mostrarSectorPersonalizado,
    distritoPersonalizado,
    mostrarDistritoPersonalizado,
    fechaReporte,
    tipoIntervencion,
    subTipoCanal,
    plantillaValues,
    observaciones,
    vehiculos,
    autoGpsFields, // ¡IMPORTANTE! Detectar cambios en datos GPS
    diasTrabajo, // 🆕 Detectar cambios en días
    reportesPorDia, // 🆕 Detectar cambios en reportes por día
    fechaInicio, // 🆕 Detectar cambios en fechas
    fechaFinal, // 🆕 Detectar cambios en fechas
    diaActual, // 🆕 Detectar cambios en día actual
    isLoadingPendingData, // ✅ Reagendar cuando termine de cargar
    user.username,
    user.name
  ]);

  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMunicipio(e.target.value);
    setDistrito('');
    setDistritoPersonalizado('');
    setMostrarDistritoPersonalizado(false);
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setDistrito(value);
    if (value === 'otros') {
      setMostrarDistritoPersonalizado(true);
    } else {
      setMostrarDistritoPersonalizado(false);
      setDistritoPersonalizado('');
    }
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setTipoIntervencion('');
    setSubTipoCanal('');
  };

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSector(value);
    setTipoIntervencion('');
    setSubTipoCanal('');
    
    if (value === 'otros') {
      setMostrarSectorPersonalizado(true);
      setSectorPersonalizado('');
    } else {
      setMostrarSectorPersonalizado(false);
      setSectorPersonalizado('');
    }
  };

  const handleTipoIntervencionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoIntervencion(e.target.value);
    setSubTipoCanal('');
    setPlantillaValues({});
  };

  const handlePlantillaChange = (key: string, value: string) => {
    setPlantillaValues(prev => ({...prev, [key]: value}));
  };

  // Funciones para sistema multi-día
  const guardarDiaActual = () => {
    if (diasTrabajo.length === 0) return;
    
    const diaKey = diasTrabajo[diaActual];
    setReportesPorDia(prev => ({
      ...prev,
      [diaKey]: {
        fecha: diaKey,
        tipoIntervencion,
        subTipoCanal,
        observaciones,
        vehiculos: [...vehiculos],
        plantillaValues: {...plantillaValues},
        autoGpsFields: {...autoGpsFields},
        completado: true
      }
    }));
  };

  const cargarDia = (indiceDia: number) => {
    // Guardar día actual antes de cambiar
    guardarDiaActual();
    
    const diaKey = diasTrabajo[indiceDia];
    const reporte = reportesPorDia[diaKey];
    
    if (reporte) {
      setTipoIntervencion(reporte.tipoIntervencion || '');
      setSubTipoCanal(reporte.subTipoCanal || '');
      setObservaciones(reporte.observaciones || '');
      
      // ✅ Si el día tiene vehículos guardados, usarlos
      // Si no tiene vehículos pero el día anterior sí tenía, heredarlos
      if (reporte.vehiculos && reporte.vehiculos.length > 0) {
        setVehiculos(reporte.vehiculos);
      } else if (vehiculos.length > 0) {
        // Copiar vehículos del día actual al nuevo día (persistencia)
        console.log('🚜 Copiando vehículos al día', indiceDia, ':', vehiculos);
        setVehiculos([...vehiculos]);
      } else {
        setVehiculos([]);
      }
      
      setPlantillaValues(reporte.plantillaValues || {});
      setAutoGpsFields(reporte.autoGpsFields || {});
    } else {
      // Si no hay reporte guardado para este día, copiar vehículos del día actual
      console.log('📝 Día nuevo - copiando vehículos actuales:', vehiculos);
      setTipoIntervencion('');
      setSubTipoCanal('');
      setObservaciones('');
      setVehiculos([...vehiculos]); // ✅ Heredar vehículos
      setPlantillaValues({});
      setAutoGpsFields({});
    }
    
    setDiaActual(indiceDia);
  };

  const cambiarDia = (direccion: 'anterior' | 'siguiente') => {
    if (direccion === 'anterior' && diaActual > 0) {
      cargarDia(diaActual - 1);
    } else if (direccion === 'siguiente' && diaActual < diasTrabajo.length - 1) {
      cargarDia(diaActual + 1);
    }
  };

  // 📸 Función para manejar la carga de fotos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione solo archivos de imagen');
      return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // Determinar la clave del día actual
      const currentDayKey = diasTrabajo.length > 0 
        ? diasTrabajo[diaActual] 
        : (fechaReporte || new Date().toISOString().split('T')[0]);
      
      // Actualizar el estado de imagesPerDay
      setImagesPerDay(prev => {
        const dayImages = prev[currentDayKey] || [];
        const updatedDayImages = [...dayImages];
        updatedDayImages[photoIndex] = base64String;
        
        return {
          ...prev,
          [currentDayKey]: updatedDayImages
        };
      });
      
      console.log(`✅ Foto ${photoIndex + 1} cargada para el día ${currentDayKey}`);
    };
    
    reader.readAsDataURL(file);
  };

  // 📸 Función para eliminar una foto
  const handleRemovePhoto = (photoIndex: number) => {
    const currentDayKey = diasTrabajo.length > 0 
      ? diasTrabajo[diaActual] 
      : (fechaReporte || new Date().toISOString().split('T')[0]);
    
    setImagesPerDay(prev => {
      const dayImages = prev[currentDayKey] || [];
      const updatedDayImages = dayImages.filter((_: any, idx: number) => idx !== photoIndex);
      
      return {
        ...prev,
        [currentDayKey]: updatedDayImages.length > 0 ? updatedDayImages : undefined
      };
    });
    
    console.log(`🗑️ Foto ${photoIndex + 1} eliminada del día ${currentDayKey}`);
  };

  const limpiarFormulario = () => {
    setRegion('');
    setProvincia('');
    setDistrito('');
    setDistritoPersonalizado('');
    setMostrarDistritoPersonalizado(false);
    setMunicipio('');
    setSector('');
    setSectorPersonalizado('');
    setMostrarSectorPersonalizado(false);
    setFechaReporte('');
    setFechaInicio('');
    setFechaFinal('');
    setDiasTrabajo([]);
    setDiaActual(0);
    setReportesPorDia({});
    setTipoIntervencion('');
    setSubTipoCanal('');
    setObservaciones('');
    setVehiculos([]);
    setTipoVehiculoActual('');
    setModeloVehiculoActual('');
    setFichaVehiculoActual('');
    setPlantillaValues({});
    setImagesPerDay({}); // 📸 Limpiar fotos cargadas
  };

  const guardarIntervencion = () => {
    const sectorFinal = sector === 'otros' ? sectorPersonalizado : sector;
    const distritoFinal = distrito === 'otros' ? distritoPersonalizado : distrito;
    
    // Validación para sistema multi-día
    // Solo usar flujo multi-día si hay días Y al menos uno tiene datos guardados
    const hayReportesGuardados = Object.values(reportesPorDia).some((r: any) => r.tipoIntervencion);
    
    if (diasTrabajo.length > 0 && hayReportesGuardados) {
      console.log('🔄 Modo multi-día detectado:', { diasTrabajo, reportesPorDia });
      
      if (!region || !provincia || !distritoFinal || !sectorFinal) {
        alert('Por favor complete todos los campos geográficos requeridos');
        return;
      }
      
      // ✅ CREAR COPIA LOCAL del día actual ANTES de actualizar el estado
      // Esto evita el problema de que setReportesPorDia es asíncrono
      const diaActualKey = diasTrabajo[diaActual];
      const diaActualData = {
        fecha: diaActualKey,
        tipoIntervencion,
        subTipoCanal,
        observaciones,
        vehiculos: [...vehiculos],
        plantillaValues: {...plantillaValues},
        autoGpsFields: {...autoGpsFields},
        completado: true
      };
      
      // Crear copia completa de reportesPorDia incluyendo el día actual
      const reportesPorDiaCompletos = {
        ...reportesPorDia,
        [diaActualKey]: diaActualData
      };
      
      console.log('📦 Reportes por día COMPLETOS (incluyendo día actual):', reportesPorDiaCompletos);
      
      // Guardar día actual en el estado también (para consistencia)
      guardarDiaActual();
      
      // Guardar todos los reportes del proyecto multi-día como COMPLETADOS
      setShowSaveAnimation(true);
      setSaveStatus('saving'); // Mostrar animación de "guardando..."
      
      // Ejecutar guardado inmediatamente (sin setTimeout previo)
      (async () => {
        try {
          let reportesGuardados = 0;
          console.log('📊 Días a procesar:', diasTrabajo);
          
          for (const dia of diasTrabajo) {
            // ✅ USAR la copia local que incluye el día actual
            const reporteDia = reportesPorDiaCompletos[dia];
            console.log(`🔍 Procesando día ${dia}:`, reporteDia);
            
            if (reporteDia && reporteDia.tipoIntervencion) {
              const reportData = {
                timestamp: new Date(dia).toISOString(),
                fechaCreacion: new Date(dia).toISOString(),
                creadoPor: user?.name || 'Desconocido',
                usuarioId: user?.username || 'desconocido',
                region,
                provincia,
                distrito: distritoFinal,
                municipio,
                sector: sectorFinal,
                tipoIntervencion: reporteDia.tipoIntervencion === 'Canalización' 
                  ? `${reporteDia.tipoIntervencion}:${reporteDia.subTipoCanal}` 
                  : reporteDia.tipoIntervencion,
                subTipoCanal: reporteDia.tipoIntervencion === 'Canalización' ? reporteDia.subTipoCanal : undefined,
                observaciones: reporteDia.observaciones || undefined,
                metricData: reporteDia.plantillaValues,
                gpsData: reporteDia.autoGpsFields,
                vehiculos: reporteDia.vehiculos || [],
                imagesPerDay: imagesPerDay && Object.keys(imagesPerDay).length > 0 ? imagesPerDay : undefined,
                estado: 'completado' as const,
                // ✅ FECHA ESPECÍFICA del día - ESTO ES LO MÁS IMPORTANTE
                fechaProyecto: dia,
                // Metadatos del proyecto (NO usar para expandir)
                esProyectoMultiDia: false, // ✅ FALSE porque este ya es UN DÍA individual
                fechaInicio: fechaInicio,
                fechaFinal: fechaFinal
                // ✅ NO incluir diasTrabajo - este reporte ya es de un día específico
              };
              
              // Guardar como COMPLETADO en Firebase
              const savedReport = await reportStorage.saveReport(reportData);
              await firebaseReportStorage.saveReport(savedReport);
              
              console.log(`✅ Reporte guardado como COMPLETADO para ${dia}`);
              reportesGuardados++;
            }
          }
          
          console.log(`📊 Total de reportes guardados: ${reportesGuardados}`);
          
          // ✅ Solo mostrar éxito DESPUÉS de que todo se guarde correctamente
          setSaveStatus('success');
          setTimeout(() => {
            setShowSaveAnimation(false);
            setSaveStatus('idle');
            limpiarFormulario();
          }, 2000);
          
        } catch (error) {
          console.error('❌ Error al guardar reportes:', error);
          setSaveStatus('error');
          setSaveErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
          setTimeout(() => {
            setShowSaveAnimation(false);
            setSaveStatus('idle');
          }, 3000);
        }
      })();
      
      return;
    }
    
    // Validación tradicional (reporte de un solo día)
    console.log('📝 Modo un solo día - Validando campos...');
    if (!region || !provincia || !distritoFinal || !sectorFinal || !fechaInicio || !tipoIntervencion) {
      alert('Por favor complete todos los campos requeridos, incluyendo las fechas del proyecto');
      return;
    }

    if (sector === 'otros' && !sectorPersonalizado.trim()) {
      alert('Por favor ingrese el nombre del sector personalizado');
      return;
    }

    if (distrito === 'otros' && !distritoPersonalizado.trim()) {
      alert('Por favor ingrese el nombre del distrito municipal personalizado');
      return;
    }

    if (tipoIntervencion === 'Canalización' && !subTipoCanal) {
      alert('Por favor seleccione el tipo de canal');
      return;
    }

    // Mostrar animación de guardado
    setShowSaveAnimation(true);
    setSaveStatus('saving');

    // Ejecutar guardado inmediatamente
    (async () => {
      const sectorFinal = sector === 'otros' ? sectorPersonalizado : sector;
      const distritoFinal = distrito === 'otros' ? distritoPersonalizado : distrito;
      
      // Guardar usando reportStorage
      const reportData = {
        id: interventionToEdit?.id,
        timestamp: fechaReporte ? new Date(fechaReporte).toISOString() : new Date().toISOString(),
        fechaCreacion: fechaReporte ? new Date(fechaReporte).toISOString() : new Date().toISOString(),
        creadoPor: user?.name || 'Desconocido',
        usuarioId: user?.username || 'desconocido',
        region,
        provincia,
        distrito: distritoFinal,
        municipio,
        sector: sectorFinal,
        tipoIntervencion: tipoIntervencion === 'Canalización' ? `${tipoIntervencion}:${subTipoCanal}` : tipoIntervencion,
        subTipoCanal: tipoIntervencion === 'Canalización' ? subTipoCanal : undefined,
        observaciones: observaciones || undefined,
        metricData: plantillaValues,
        gpsData: autoGpsFields,
        // Información de vehículos (array)
        vehiculos: vehiculos,
        // 📸 Imágenes del reporte (preservadas del estado actual)
        imagesPerDay: imagesPerDay && Object.keys(imagesPerDay).length > 0 ? imagesPerDay : undefined,
        estado: 'completado' as const,
        modificadoPor: interventionToEdit ? user?.name : undefined,
        // 📅 Fechas de inicio y fin (para reportes de un solo día son la misma)
        fechaInicio: fechaInicio || fechaReporte || undefined,
        fechaFinal: fechaFinal || fechaReporte || undefined
      };

      console.log('🚜 Vehículos en el estado antes de guardar:', vehiculos);
      console.log('🚜 Vehículos en reportData:', reportData.vehiculos);
      console.log('📦 ReportData completo:', reportData);

      try {
        console.log('💾 Guardando reporte en Firebase...');
        
        // PRIMERO: Guardar en localStorage para generar campos requeridos (numeroReporte, timestamp, etc.)
        const savedReport = await reportStorage.saveReport(reportData);
        console.log('📦 Reporte procesado con campos generados');
        
        // SEGUNDO: Guardar en Firebase con todos los campos completos
        await firebaseReportStorage.saveReport(savedReport);
        console.log('✅ Reporte guardado exitosamente en Firebase');

        // ✅ Solo mostrar éxito DESPUÉS de que todo se guarde correctamente
        setSaveStatus('success');
        setTimeout(() => {
          setShowSaveAnimation(false);
          setSaveStatus('idle');
          limpiarFormulario();
        }, 2000);
      } catch (error) {
        console.error('❌ Error al guardar reporte:', error);
        setSaveStatus('error');
        setSaveErrorMessage(error instanceof Error ? error.message : 'Error de conexión');
        setTimeout(() => {
          setShowSaveAnimation(false);
          setSaveStatus('idle');
        }, 3000);
      }
    })();
  };

  // Función para guardar plantilla como predeterminada
  const guardarPlantillaPorDefecto = () => {
    const templateConfig = {
      templateName: 'MOPC Formulario de Intervención Estándar',
      headerConfig: {
        title: '📋 FORMULARIO DE INTERVENCIÓN',
        subtitle: 'Registro detallado de trabajos realizados',
        logoEnabled: true,
        referenceEnabled: true,
        dateEnabled: true
      },
      projectInfoEnabled: true,
      separatorEnabled: true,
      separatorText: 'DATOS TÉCNICOS DE LA INTERVENCIÓN',
      footerConfig: {
        signatureEnabled: true,
        stampEnabled: true,
        stampText: 'MOPC VALIDADO'
      },
      savedAt: new Date().toISOString(),
      isDefault: true
    };

    localStorage.setItem('mopc_template_default', JSON.stringify(templateConfig));
    
    // También guardamos las configuraciones de diseño
    const designConfig = {
      primaryColor: '#ff7a00',
      backgroundColor: 'white',
      borderColor: '#ccc',
      borderRadius: '8px',
      maxWidth: '800px',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('mopc_design_default', JSON.stringify(designConfig));
    alert('✅ Plantilla guardada como predeterminada');
  };

  // Cargar plantilla predeterminada al inicio
  useEffect(() => {
    const defaultTemplate = localStorage.getItem('mopc_template_default');
    if (!defaultTemplate) {
      // Si no hay plantilla predeterminada, guardar la actual como predeterminada
      guardarPlantillaPorDefecto();
      console.log('Plantilla predeterminada configurada automáticamente');
    } else {
      const config = JSON.parse(defaultTemplate);
      console.log('Plantilla predeterminada cargada:', config.templateName);
    }
  }, []);

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    guardarIntervencion();
  };

  // GPS Functions
  const handleCoordinateFieldClick = (fieldKey: string, fieldLabel: string) => {
    // Try to enable GPS via parent state or request permission if not enabled
    if (!gpsEnabled) {
      if ('geolocation' in navigator) {
        setGpsStatus('Solicitando permiso de geolocalización...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsEnabled(true);
            const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setPendingCoords(coords);
            setTargetField({ key: fieldKey, label: fieldLabel });
            setGpsStatus(`Ubicación encontrada: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          },
          (err) => {
            setGpsStatus('Permiso de geolocalización denegado o no disponible.');
            alert('Por favor habilite el GPS en su dispositivo y recargue la página.');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
        return;
      } else {
        setGpsStatus('Geolocalización no soportada.');
        return;
      }
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('Geolocalización no soportada.');
      return;
    }

    setGpsStatus('Buscando ubicación...');
    setTargetField({ key: fieldKey, label: fieldLabel });

    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
        
        setPendingCoords(coords);
        setGpsStatus(`Ubicación encontrada: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
      },
      error => {
        let errorMsg = 'Error GPS: ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Permiso denegado. Active la ubicación en su navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Tiempo agotado.';
            break;
          default:
            errorMsg += 'Error desconocido.';
        }
        setGpsStatus(errorMsg);
        setTargetField(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const toggleGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('Geolocalización no soportada.');
      return;
    }
    setGpsEnabled(v => !v);
    if (gpsEnabled) {
      setGpsStatus('');
      setPendingCoords(null);
      setTargetField(null);
      setApprovedGpsFields(new Set());
      setAutoGpsFields({});
    } else {
      setGpsStatus('');
    }
  };

  // Funciones para manejar coordenadas automáticas
  const acceptAutoGps = (fieldKey: string) => {
    const coords = autoGpsFields[fieldKey];
    if (coords) {
      const coordsString = `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
      setPlantillaValues(prev => ({ ...prev, [fieldKey]: coordsString }));
      setApprovedGpsFields(prev => new Set(prev).add(fieldKey));
      // Mark as approved (hide buttons)
      setRejectedGpsFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });
      
      // Remover de campos automáticos
      setAutoGpsFields(prev => {
        const newFields = { ...prev };
        delete newFields[fieldKey];
        return newFields;
      });
      
      setGpsStatus(`Coordenadas aceptadas para ${fieldKey}`);
    }
  };

  const rejectAutoGps = (fieldKey: string) => {
    // Remover de campos automáticos para permitir entrada manual
    setAutoGpsFields(prev => {
      const newFields = { ...prev };
      delete newFields[fieldKey];
      return newFields;
    });
    // Mark as rejected to hide buttons and allow manual entry
    setRejectedGpsFields(prev => new Set(prev).add(fieldKey));
    setGpsStatus(`Campo ${fieldKey} disponible para entrada manual`);
  };

  // Función para verificar si todos los campos de "Registros de obras realizadas" están completos
  const areAllRegistrosCompleted = () => {
    const distritoFinal = distrito === 'otros' ? distritoPersonalizado : distrito;
    const sectorFinal = sector === 'otros' ? sectorPersonalizado : sector;
    const basicFieldsCompleted = region && provincia && distritoFinal && sectorFinal && tipoIntervencion;
    
    if (tipoIntervencion === 'Canalización') {
      return basicFieldsCompleted && subTipoCanal;
    }
    
    return basicFieldsCompleted;
  };

  // 🖼️ Funciones para el modal de visualización de fotos
  const openPhotoModal = (dayKey: string, photoIndex: number) => {
    setCurrentDayKey(dayKey);
    setCurrentPhotoIndex(photoIndex);
    setPhotoModalOpen(true);
  };

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

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
  };

  const goToNextPhoto = () => {
    const currentDayImages = imagesPerDay[currentDayKey] || [];
    if (currentPhotoIndex < currentDayImages.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      // Ir al siguiente día con fotos
      const dayKeys = Object.keys(imagesPerDay).filter(key => imagesPerDay[key]?.length > 0);
      const currentDayIndex = dayKeys.indexOf(currentDayKey);
      if (currentDayIndex < dayKeys.length - 1) {
        const nextDayKey = dayKeys[currentDayIndex + 1];
        setCurrentDayKey(nextDayKey);
        setCurrentPhotoIndex(0);
      }
    }
  };

  const goToPrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else {
      // Ir al día anterior con fotos
      const dayKeys = Object.keys(imagesPerDay).filter(key => imagesPerDay[key]?.length > 0);
      const currentDayIndex = dayKeys.indexOf(currentDayKey);
      if (currentDayIndex > 0) {
        const prevDayKey = dayKeys[currentDayIndex - 1];
        setCurrentDayKey(prevDayKey);
        const prevDayImages = imagesPerDay[prevDayKey] || [];
        setCurrentPhotoIndex(prevDayImages.length - 1);
      }
    }
  };

  const downloadCurrentPhoto = () => {
    const currentImage = imagesPerDay[currentDayKey]?.[currentPhotoIndex];
    if (currentImage) {
      const link = document.createElement('a');
      link.href = currentImage.url;
      link.download = `foto_${currentDayKey}_${currentPhotoIndex + 1}.jpg`;
      link.click();
    }
  };

  return (
    <div className="dashboard">
      {/* Topbar similar al dashboard principal */}
      <div className="topbar">
        <div className="topbar-left">
          <button 
            onClick={onBack}
            title="Volver al Dashboard" 
            className="btn topbar-btn"
          >
            ← Volver
          </button>
        </div>

        <div className="topbar-logo" aria-hidden></div>

        <div className="topbar-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Ícono de notificaciones - posicionado en el extremo derecho */}
          <div style={{ position: 'relative', cursor: 'pointer', marginRight: '0' }}>
            <img 
              src="/images/notification-bell-icon.svg" 
              alt="Notificaciones" 
              onClick={() => setShowPendingModal(true)}
              style={{
                width: '24px', 
                height: '24px',
                filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
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
        </div>
      </div>

      <div className="dashboard-content">
        <h3 className="records-header">
          {interventionToEdit ? '📝 Editar Intervención' : '📋 Registro de Obras Realizadas'}
        </h3>

        {/* 🔄 BANNER DE MODO EDICIÓN */}
        {interventionToEdit && (
          <div style={{
            backgroundColor: '#d1ecf1',
            border: '3px solid #0c5460',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div style={{
                backgroundColor: '#0c5460',
                color: 'white',
                padding: '12px',
                borderRadius: '50%',
                fontSize: '24px',
                lineHeight: '1'
              }}>
                ✏️
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 5px 0',
                  color: '#0c5460',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  Modo Edición Activo
                </h4>
                <p style={{
                  margin: 0,
                  color: '#0c5460',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Se han cargado los datos del reporte para su modificación
                </p>
              </div>
            </div>
            
            {/* Información de datos cargados */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '15px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '10px'
              }}>
                {interventionToEdit.numeroReporte && (
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0c5460' }}>📋 Reporte:</strong>{' '}
                    <span style={{ color: '#666' }}>{interventionToEdit.numeroReporte}</span>
                  </div>
                )}
                {interventionToEdit.tipoIntervencion && (
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0c5460' }}>🛠️ Tipo:</strong>{' '}
                    <span style={{ color: '#666' }}>{interventionToEdit.tipoIntervencion}</span>
                  </div>
                )}
                {interventionToEdit.provincia && (
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0c5460' }}>📍 Provincia:</strong>{' '}
                    <span style={{ color: '#666' }}>{interventionToEdit.provincia}</span>
                  </div>
                )}
                {interventionToEdit.metricData && Object.keys(interventionToEdit.metricData).length > 0 && (
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0c5460' }}>📊 Datos métricos:</strong>{' '}
                    <span style={{ color: '#28a745', fontWeight: '600' }}>
                      {Object.keys(interventionToEdit.metricData).length} campos cargados ✓
                    </span>
                  </div>
                )}
                {interventionToEdit.imagesPerDay && Object.keys(interventionToEdit.imagesPerDay).length > 0 && (
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0c5460' }}>📸 Fotos:</strong>{' '}
                    <span style={{ color: '#28a745', fontWeight: '600' }}>
                      {Object.values(interventionToEdit.imagesPerDay).flat().length} imágenes cargadas ✓
                    </span>
                  </div>
                )}
              </div>
              
              {/* Nota informativa */}
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderLeft: '4px solid #ffc107',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#856404'
              }}>
                <strong>💡 Nota:</strong> Los datos de las plantillas y las fotos del reporte se muestran más abajo,
                después de la sección de observaciones. Desplácese hacia abajo para verlos.
              </div>
            </div>
          </div>
        )}

        <form className="dashboard-form" onSubmit={handleGuardar}>
          {/* Sección de ubicación */}
          <div className="dashboard-row">
            <div className="form-group">
              <label htmlFor="region">Región</label>
              <select 
                id="region"
                value={region}
                onChange={handleRegionChange}
                className="form-input"
                required
              >
                <option value="">Seleccionar región</option>
                {regionesRD.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="provincia">Provincia</label>
              <select 
                id="provincia"
                value={provincia}
                onChange={handleProvinciaChange}
                className="form-input"
                disabled={!region}
                required
              >
                <option value="">Seleccionar provincia</option>
                {provinciasDisponibles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="municipio">Municipio</label>
              <select 
                id="municipio"
                value={municipio}
                onChange={handleMunicipioChange}
                className="form-input"
                disabled={!provincia}
                required
              >
                <option value="">Seleccionar municipio</option>
                {municipiosDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="distrito">Distrito Municipal</label>
              <div style={{ position: 'relative' }}>
                <select 
                  id="distrito"
                  value={distrito}
                  onChange={handleDistritoChange}
                  className="form-input"
                  disabled={!municipio}
                  required
                >
                  <option value="">Seleccionar distrito municipal</option>
                  {distritosDisponibles.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="otros">➕ Agregar nuevo distrito municipal</option>
                </select>
              </div>
              
              {mostrarDistritoPersonalizado && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    value={distritoPersonalizado}
                    onChange={(e) => setDistritoPersonalizado(e.target.value)}
                    placeholder="Escriba el nombre del distrito municipal"
                    className="form-input"
                    style={{ 
                      borderColor: 'var(--primary-orange)',
                      backgroundColor: 'var(--pale-orange)'
                    }}
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="sector">Sector o Localidad</label>
              <select 
                id="sector"
                value={sector}
                onChange={handleSectorChange}
                className="form-input"
                disabled={!distrito}
                required
              >
                <option value="">Seleccionar sector o localidad</option>
                {sectoresDisponibles.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="otros">➕ Otros (Agregar nuevo sector o localidad)</option>
              </select>
            </div>

            {/* Sistema de rango de fechas para proyectos multi-día */}
            <div className="form-group">
              <label htmlFor="fechaInicio">📅 Fecha de Inicio del Proyecto</label>
              <input 
                type="date"
                id="fechaInicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="form-input"
                required
                style={{ cursor: 'pointer' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fechaFinal">📅 Fecha Final del Proyecto</label>
              <input 
                type="date"
                id="fechaFinal"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                min={fechaInicio}
                className="form-input"
                required
                disabled={!fechaInicio}
                style={{ cursor: fechaInicio ? 'pointer' : 'not-allowed', opacity: fechaInicio ? 1 : 0.6 }}
              />
            </div>
          </div>

          {/* Navegación entre días de trabajo */}
          {diasTrabajo.length > 0 && (
            <div style={{ 
              marginTop: '24px', 
              marginBottom: '24px', 
              padding: '20px', 
              background: 'linear-gradient(135deg, var(--tertiary-orange) 0%, var(--pale-orange) 100%)',
              borderRadius: '12px',
              border: '2px solid var(--secondary-orange)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--primary-orange)', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  📋 Reportes por Día ({diasTrabajo.length} días de trabajo)
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => cambiarDia('anterior')}
                    disabled={diaActual === 0}
                    style={{
                      padding: '8px 16px',
                      background: diaActual === 0 ? '#ccc' : 'var(--primary-orange)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: diaActual === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Día {diaActual + 1} de {diasTrabajo.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => cambiarDia('siguiente')}
                    disabled={diaActual === diasTrabajo.length - 1}
                    style={{
                      padding: '8px 16px',
                      background: diaActual === diasTrabajo.length - 1 ? '#ccc' : 'var(--primary-orange)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: diaActual === diasTrabajo.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>

              {/* Pestañas de navegación tipo Excel */}
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                overflowX: 'auto', 
                padding: '8px 0',
                borderTop: '1px solid var(--secondary-orange)',
                paddingTop: '12px'
              }}>
                {diasTrabajo.map((dia, index) => {
                  const reporteDia = reportesPorDia[dia];
                  const completado = reporteDia?.completado;
                  const esActual = index === diaActual;
                  
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => cargarDia(index)}
                      style={{
                        minWidth: '120px',
                        padding: '10px 16px',
                        background: esActual ? 'var(--primary-orange)' : (completado ? '#00C49F' : 'white'),
                        color: esActual || completado ? 'white' : 'var(--text-primary)',
                        border: `2px solid ${esActual ? 'var(--primary-orange-dark)' : (completado ? '#00A884' : 'var(--gray)')}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: esActual ? '700' : '500',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: esActual ? '0 4px 8px rgba(255, 122, 0, 0.3)' : 'none',
                        transform: esActual ? 'translateY(-2px)' : 'none'
                      }}
                      onMouseOver={(e) => {
                        if (!esActual) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!esActual) {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{completado ? '✅' : '📄'}</span>
                      <span>
                        {new Date(dia + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Información del día actual */}
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: 'white', 
                borderRadius: '8px',
                border: '1px solid var(--gray)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--primary-orange)' }}>Fecha actual:</strong>{' '}
                  {new Date(diasTrabajo[diaActual] + 'T12:00:00').toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {reportesPorDia[diasTrabajo[diaActual]]?.completado 
                    ? '✅ Reporte completado para este día' 
                    : '⏳ Complete los datos para guardar este reporte'}
                </p>
              </div>
            </div>
          )}

          {/* Campo de sector personalizado */}
          {mostrarSectorPersonalizado && (
            <div className="dashboard-row">
              <div className="form-group" style={{ width: '100%' }}>
                <div className="sector-personalizado">
                  <label htmlFor="sectorPersonalizado" className="sector-personalizado-label">
                    Ingrese el nombre del nuevo sector:
                  </label>
                  <input
                    id="sectorPersonalizado"
                    type="text"
                    value={sectorPersonalizado}
                    onChange={(e) => setSectorPersonalizado(e.target.value)}
                    placeholder="Escriba el nombre del sector o localidad..."
                    className="form-input sector-personalizado-input"
                    required
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sección de tipo de intervención */}
          <div className="dashboard-row">
            <div className="form-group">
              <label htmlFor="tipoIntervencion">Tipo de Intervención</label>
              <select 
                id="tipoIntervencion"
                value={tipoIntervencion}
                onChange={handleTipoIntervencionChange}
                className="form-input"
                disabled={!camposGeograficosCompletos}
                required
              >
                <option value="">Seleccionar tipo</option>
                {opcionesIntervencion.map(opcion => (
                  <option key={opcion} value={opcion}>{opcion}</option>
                ))}
              </select>
            </div>

            {tipoIntervencion === 'Canalización' && (
              <div className="form-group">
                <label htmlFor="subTipoCanal">Tipo de Canal</label>
                <select 
                  id="subTipoCanal"
                  value={subTipoCanal}
                  onChange={(e) => setSubTipoCanal(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Seleccionar tipo de canal</option>
                  {canalOptions.map(opcion => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sección de información de vehículos y operarios */}
          {tipoIntervencion && (
            <>
              <div className="dashboard-row">
                <h4 style={{ width: '100%', color: 'var(--primary-orange)', marginBottom: '8px', fontSize: '16px' }}>
                  🚜 Información de Vehículos Pesados
                </h4>
              </div>
              
              {/* Campo para número de vehículos */}
              <div className="dashboard-row">
                <div className="form-group">
                  <label htmlFor="numVehiculos">¿Cuántos vehículos están trabajando?</label>
                  <input
                    type="number"
                    id="numVehiculos"
                    min="0"
                    max="50"
                    value={vehiculos.length}
                    onChange={(e) => {
                      const cantidad = parseInt(e.target.value) || 0;
                      if (cantidad >= 0 && cantidad <= 50) {
                        const nuevosVehiculos = [];
                        for (let i = 0; i < cantidad; i++) {
                          if (i < vehiculos.length) {
                            // Mantener vehículo existente
                            nuevosVehiculos.push(vehiculos[i]);
                          } else {
                            // Agregar nuevo vehículo vacío
                            nuevosVehiculos.push({ tipo: '', modelo: '', ficha: '' });
                          }
                        }
                        setVehiculos(nuevosVehiculos);
                      }
                    }}
                    placeholder="Ej: 5"
                    className="form-input"
                    style={{ maxWidth: '200px' }}
                  />
                  <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                    Ingrese el número y aparecerán las filas para llenar
                  </small>
                </div>
              </div>
              
              {/* Formulario para cada vehículo */}
              {vehiculos.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ marginBottom: '16px', fontSize: '14px', color: '#666', fontWeight: '600' }}>
                    Complete la información de cada vehículo:
                  </h5>
                  {vehiculos.map((vehiculo, index) => (
                    <div key={`vehiculo-${index}`} style={{ 
                      marginBottom: '20px',
                      padding: '16px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <h6 style={{ margin: 0, color: 'var(--primary-orange)', fontSize: '14px', fontWeight: '600' }}>
                          🚜 Vehículo #{index + 1}
                        </h6>
                        <button
                          type="button"
                          onClick={() => {
                            setVehiculos(vehiculos.filter((_, i) => i !== index));
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                      
                      <div className="dashboard-row">
                        <div className="form-group" style={{ flex: '1' }}>
                          <label htmlFor={`tipoVehiculo-${index}`}>Tipo de Vehículo</label>
                          <select 
                            id={`tipoVehiculo-${index}`}
                            value={vehiculo.tipo}
                            onChange={(e) => {
                              const nuevosVehiculos = [...vehiculos];
                              nuevosVehiculos[index].tipo = e.target.value;
                              setVehiculos(nuevosVehiculos);
                            }}
                            className="form-input"
                          >
                            <option value="">Seleccionar tipo</option>
                            <option value="Excavadora">Excavadora</option>
                            <option value="Retroexcavadora">Retroexcavadora</option>
                            <option value="Motoniveladora">Motoniveladora</option>
                            <option value="Rodillo Compactador">Rodillo Compactador</option>
                            <option value="Rodillo Liso">Rodillo Liso</option>
                            <option value="Rodillo Pata de Cabra">Rodillo Pata de Cabra</option>
                            <option value="Rodillo Neumático">Rodillo Neumático</option>
                            <option value="Cargador Frontal">Cargador Frontal</option>
                            <option value="Bulldozer">Bulldozer</option>
                            <option value="Camión Volquete">Camión Volquete</option>
                            <option value="Camión Cisterna">Camión Cisterna</option>
                            <option value="Camión de Carga">Camión de Carga</option>
                            <option value="Compactadora">Compactadora</option>
                            <option value="Compactadora Vibratoria">Compactadora Vibratoria</option>
                            <option value="Pavimentadora">Pavimentadora</option>
                            <option value="Finisher">Finisher</option>
                            <option value="Recicladora de Asfalto">Recicladora de Asfalto</option>
                            <option value="Fresadora">Fresadora</option>
                            <option value="Barredora">Barredora</option>
                            <option value="Distribuidor de Asfalto">Distribuidor de Asfalto</option>
                            <option value="Planta de Asfalto">Planta de Asfalto</option>
                            <option value="Planta de Concreto">Planta de Concreto</option>
                            <option value="Mezcladora de Concreto">Mezcladora de Concreto</option>
                            <option value="Bomba de Concreto">Bomba de Concreto</option>
                            <option value="Vibradora de Concreto">Vibradora de Concreto</option>
                            <option value="Zanjadora">Zanjadora</option>
                            <option value="Perforadora">Perforadora</option>
                            <option value="Martillo Hidráulico">Martillo Hidráulico</option>
                            <option value="Grúa">Grúa</option>
                            <option value="Minicargador">Minicargador</option>
                            <option value="Tractor">Tractor</option>
                            <option value="Generador Eléctrico">Generador Eléctrico</option>
                            <option value="Compresor de Aire">Compresor de Aire</option>
                            <option value="Otros">Otros</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ flex: '1' }}>
                          <label htmlFor={`modeloVehiculo-${index}`}>Modelo del Vehículo</label>
                          <input
                            type="text"
                            id={`modeloVehiculo-${index}`}
                            value={vehiculo.modelo}
                            onChange={(e) => {
                              const nuevosVehiculos = [...vehiculos];
                              nuevosVehiculos[index].modelo = e.target.value;
                              setVehiculos(nuevosVehiculos);
                            }}
                            placeholder="Ej: CAT 320D"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group" style={{ flex: '1' }}>
                          <label htmlFor={`fichaVehiculo-${index}`}>Ficha del Vehículo (MOPC)</label>
                          <input
                            type="text"
                            id={`fichaVehiculo-${index}`}
                            value={vehiculo.ficha}
                            onChange={(e) => {
                              const nuevosVehiculos = [...vehiculos];
                              nuevosVehiculos[index].ficha = e.target.value;
                              setVehiculos(nuevosVehiculos);
                            }}
                            placeholder="Ej: MOPC-VH-2024-001"
                            className="form-input"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Sección de plantilla de datos */}
          {plantillaFields.length > 0 && areAllRegistrosCompleted() && (
            // @ts-ignore - React element
            <div className="report-template-container">
              {/* Header del reporte de intervención */}
              <div className="template-header">
                <div className="template-header-left">
                  <h3 className="template-title">📋 FORMULARIO DE INTERVENCIÓN</h3>
                  <div className="template-subtitle">Registro detallado de trabajos realizados</div>
                </div>
                <div className="template-header-right">
                  <div className="header-info-section">
                    <div className="template-reference">
                      <span className="reference-label">Ref:</span>
                      <span className="reference-code">MOPC-{Date.now().toString().slice(-6)}</span>
                    </div>
                    <div className="template-date">
                      {new Date().toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="header-logo-section">
                  </div>
                </div>
              </div>

              {/* Información del proyecto */}
              <div className="project-info-section">
                <div className="project-info-grid">
                  <div className="info-item">
                    <span className="info-label">Región:</span>
                    <span className="info-value">{region}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Provincia:</span>
                    <span className="info-value">{provincia}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Municipio:</span>
                    <span className="info-value">{municipio}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Tipo:</span>
                    <span className="info-value">{tipoIntervencion}</span>
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="template-separator">
                <div className="separator-line"></div>
                <span className="separator-text">DATOS TÉCNICOS DE LA INTERVENCIÓN</span>
                <div className="separator-line"></div>
              </div>

              {/* Grid de campos de la plantilla */}
              <div className="template-fields-grid">
                {plantillaFields.map((field, index) => (
                  <div key={field.key} className="template-field-card" style={
                    interventionToEdit && plantillaValues[field.key] ? {
                      backgroundColor: '#f0f8ff',
                      borderColor: '#0c5460',
                      borderWidth: '2px'
                    } : {}
                  }>
                    <div className="field-header">
                      <span className="field-number">{(index + 1).toString().padStart(2, '0')}</span>
                      <label className="field-label" htmlFor={field.key}>
                        {field.label}
                        {/* Indicador de dato precargado */}
                        {interventionToEdit && plantillaValues[field.key] && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            color: '#28a745',
                            fontWeight: '600',
                            backgroundColor: '#d4edda',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            border: '1px solid #c3e6cb'
                          }}>
                            ✓
                          </span>
                        )}
                      </label>
                      {field.unit && <span className="field-unit">({field.unit})</span>}
                    </div>
                    
                    <div className="field-input-container">
                      {field.type === 'text' ? (
                        (field.key.includes('coordenadas') || field.key.includes('punto_inicial') || field.key.includes('punto_alcanzado')) ? (
                          <div className="coordinate-input-wrapper">
                            {/* Campo de entrada de coordenadas */}
                            <input
                              id={field.key}
                              type="text"
                              value={
                                autoGpsFields[field.key] 
                                  ? `${autoGpsFields[field.key].lat.toFixed(6)}, ${autoGpsFields[field.key].lon.toFixed(6)}`
                                  : plantillaValues[field.key] || ''
                              }
                              onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                              className={`form-input coordinate-field ${autoGpsFields[field.key] ? 'has-auto-gps' : ''}`}
                              placeholder={autoGpsFields[field.key] ? "Coordenadas automáticas disponibles" : "Obtener coordenadas GPS"}
                              readOnly={!!autoGpsFields[field.key] && !approvedGpsFields.has(field.key) && !rejectedGpsFields.has(field.key)}
                              onClick={() => !autoGpsFields[field.key] && handleCoordinateFieldClick(field.key, field.label)}
                              style={{
                                backgroundColor: autoGpsFields[field.key] ? 'rgba(0, 123, 255, 0.1)' : undefined,
                                color: autoGpsFields[field.key] ? '#495057' : undefined,
                                fontStyle: autoGpsFields[field.key] ? 'italic' : undefined,
                                cursor: autoGpsFields[field.key] ? 'default' : 'pointer'
                              }}
                            />
                            
                            {/* Iconos de aceptar/rechazar coordenadas automáticas */}
                            {(autoGpsFields[field.key] && !approvedGpsFields.has(field.key) && !rejectedGpsFields.has(field.key)) && (
                            <div className="gps-action-buttons">
                              <button
                                type="button"
                                className={`gps-accept-btn ${autoGpsFields[field.key] ? 'active' : 'inactive'}`}
                                onClick={() => autoGpsFields[field.key] ? acceptAutoGps(field.key) : handleCoordinateFieldClick(field.key, field.label)}
                                title={autoGpsFields[field.key] ? "Aceptar coordenadas automáticas" : "Obtener coordenadas GPS"}
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className={`gps-reject-btn ${autoGpsFields[field.key] ? 'active' : 'inactive'}`}
                                onClick={() => autoGpsFields[field.key] ? rejectAutoGps(field.key) : undefined}
                                title={autoGpsFields[field.key] ? "Rechazar y permitir entrada manual" : "Rechazar coordenadas"}
                                disabled={!autoGpsFields[field.key]}
                              >
                                ✗
                              </button>
                            </div>
                            )}
                          </div>
                        ) : (
                          <input
                            id={field.key}
                            type="text"
                            value={plantillaValues[field.key] || ''}
                            onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                            className="field-input"
                          />
                        )
                      ) : (
                        <input
                          id={field.key}
                          type="number"
                          step="0.01"
                          value={plantillaValues[field.key] || ''}
                          onChange={(e) => handlePlantillaChange(field.key, e.target.value)}
                          className="field-input"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Separador antes de observaciones */}
              <div className="template-separator" style={{ marginTop: '40px', marginBottom: '30px' }}>
                <div className="separator-line"></div>
                <span className="separator-text">OBSERVACIONES Y ACCIONES ADICIONALES</span>
                <div className="separator-line"></div>
              </div>

              {/* 📸 SECCIÓN DE CARGA DE FOTOS (2 fotos máximo por día) */}
              <div style={{ gridColumn: '1 / -1', marginBottom: '30px' }}>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  border: '2px solid var(--secondary-orange)',
                  borderRadius: '12px',
                  padding: '25px'
                }}>
                  <h3 style={{
                    color: 'var(--primary-orange)',
                    margin: '0 0 20px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    📸 Evidencia Fotográfica
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 'normal',
                      color: '#666',
                      backgroundColor: '#fff3cd',
                      padding: '4px 12px',
                      borderRadius: '20px'
                    }}>
                      Máximo 2 fotos por día
                    </span>
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* Foto 1 */}
                    <div style={{
                      backgroundColor: 'white',
                      border: '2px dashed var(--primary-orange)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}>
                      {(() => {
                        const currentDayKey = diasTrabajo.length > 0 
                          ? diasTrabajo[diaActual] 
                          : (fechaReporte || new Date().toISOString().split('T')[0]);
                        const foto1 = imagesPerDay[currentDayKey]?.[0];
                        
                        return foto1 ? (
                          <div style={{ position: 'relative' }}>
                            <img 
                              src={foto1} 
                              alt="Foto 1" 
                              style={{
                                width: '100%',
                                height: '250px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                marginBottom: '10px'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                              <label style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--primary-orange)',
                                color: 'white',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>
                                🔄 Cambiar
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoUpload(e, 0)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(0)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '15px',
                            cursor: 'pointer',
                            padding: '40px 20px'
                          }}>
                            <div style={{
                              width: '80px',
                              height: '80px',
                              backgroundColor: 'var(--pale-orange)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '36px'
                            }}>
                              📷
                            </div>
                            <div>
                              <div style={{
                                color: 'var(--primary-orange)',
                                fontSize: '16px',
                                fontWeight: '600',
                                marginBottom: '5px'
                              }}>
                                Cargar Foto 1
                              </div>
                              <div style={{
                                color: '#666',
                                fontSize: '13px'
                              }}>
                                Click para seleccionar archivo
                              </div>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, 0)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        );
                      })()}
                    </div>

                    {/* Foto 2 */}
                    <div style={{
                      backgroundColor: 'white',
                      border: '2px dashed var(--primary-orange)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}>
                      {(() => {
                        const currentDayKey = diasTrabajo.length > 0 
                          ? diasTrabajo[diaActual] 
                          : (fechaReporte || new Date().toISOString().split('T')[0]);
                        const foto2 = imagesPerDay[currentDayKey]?.[1];
                        
                        return foto2 ? (
                          <div style={{ position: 'relative' }}>
                            <img 
                              src={foto2} 
                              alt="Foto 2" 
                              style={{
                                width: '100%',
                                height: '250px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                marginBottom: '10px'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                              <label style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--primary-orange)',
                                color: 'white',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>
                                🔄 Cambiar
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoUpload(e, 1)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(1)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '15px',
                            cursor: 'pointer',
                            padding: '40px 20px'
                          }}>
                            <div style={{
                              width: '80px',
                              height: '80px',
                              backgroundColor: 'var(--pale-orange)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '36px'
                            }}>
                              📷
                            </div>
                            <div>
                              <div style={{
                                color: 'var(--primary-orange)',
                                fontSize: '16px',
                                fontWeight: '600',
                                marginBottom: '5px'
                              }}>
                                Cargar Foto 2
                              </div>
                              <div style={{
                                color: '#666',
                                fontSize: '13px'
                              }}>
                                Click para seleccionar archivo
                              </div>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, 1)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#004085'
                  }}>
                    💡 <strong>Nota:</strong> Las fotos se asociarán al día que estás editando actualmente.
                    Formato JPG, PNG o WebP. Tamaño máximo: 5MB por foto.
                  </div>
                </div>
              </div>

              {/* Campo de observaciones */}
              <div className="template-field-card" style={{ gridColumn: '1 / -1' }}>
                <div className="field-header">
                  <label className="field-label" htmlFor="observaciones">
                    Observaciones, acciones realizadas o comentarios adicionales
                  </label>
                </div>
                <div className="field-input-container">
                  <textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="field-input"
                    rows={6}
                    placeholder="Describa cualquier observación relevante, acciones adicionales realizadas o comentarios sobre la intervención..."
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      padding: '12px'
                    }}
                  />
                </div>
              </div>

              {/* 📸 VISTA PREVIA DE FOTOS (Solo visualización de fotos de app móvil) */}
              {/* Diagnóstico de fotos en consola */}
              {(() => {
                console.log('🔍 RENDER - Estado actual de imagesPerDay:', imagesPerDay);
                console.log('🔍 RENDER - Cantidad de fotos:', imagesPerDay ? Object.values(imagesPerDay).flat().length : 0);
                return null;
              })()}
              
              {imagesPerDay && Object.keys(imagesPerDay).length > 0 ? (
                <div style={{ gridColumn: '1 / -1', marginTop: '30px' }}>
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      color: '#856404',
                      margin: '0 0 15px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      📸 Evidencia Fotográfica (Desde App Móvil)
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 'normal',
                        color: '#666',
                        backgroundColor: '#fff',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        marginLeft: 'auto'
                      }}>
                        {Object.values(imagesPerDay).flat().length} foto{Object.values(imagesPerDay).flat().length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    {Object.entries(imagesPerDay).map(([dayKey, images]: [string, any]) => {
                      if (!images || images.length === 0) return null;
                      
                      const dayLabel = dayKey.replace('dia-', 'Día ').replace('general', 'General');
                      
                      return (
                        <div key={dayKey} style={{ marginBottom: '20px' }}>
                          <h4 style={{ 
                            color: '#FF7A00', 
                            marginBottom: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderBottom: '2px solid #FF7A00',
                            paddingBottom: '8px'
                          }}>
                            📅 {dayLabel}
                          </h4>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {images.map((image: any, index: number) => (
                              <div key={index} style={{
                                border: '3px solid #FF7A00',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                backgroundColor: '#fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              onClick={() => openPhotoInNewTab(image.url)}
                              >
                                <img 
                                  src={image.url} 
                                  alt={`Foto ${index + 1} - ${dayLabel}`}
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
                                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Foto {index + 1}</div>
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
                          </div>
                        </div>
                      );
                    })}
                    <div style={{
                      marginTop: '15px',
                      padding: '10px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      💡 Estas fotos fueron capturadas desde la aplicación móvil. Haga clic en cualquier foto para abrirla en tamaño completo en una nueva pestaña.
                    </div>
                  </div>
                </div>
              ) : interventionToEdit ? (
                <div style={{ gridColumn: '1 / -1', marginTop: '30px' }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    color: '#6c757d'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>Sin fotos</h4>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      Este reporte no tiene fotos adjuntas desde la aplicación móvil.
                    </p>
                  </div>
                </div>
              ) : null}



              {/* Footer del template */}
              <div className="template-footer">
                <div className="footer-left">
                  <div className="signature-section">
                    <div className="signature-line"></div>
                    <span className="signature-label">Firma del Responsable Técnico</span>
                  </div>
                </div>
                <div className="footer-right">
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions" style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
            
            {/* Botón Verde - Guardar */}
            <button 
              type="button" 
              onClick={guardarIntervencion} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#27AE60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(39, 174, 96, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.3)';
              }}
            >
              <img 
                src="/images/save-green-icon.svg" 
                alt="Guardar" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {diasTrabajo.length > 0 
                  ? `Guardar ${diasTrabajo.length} días` 
                  : 'Guardar'}
              </span>
            </button>

            {/* Botón Naranja - Guardar sin estadísticas */}
            <button 
              type="button" 
              onClick={async () => {
                const sectorFinal = sector === 'otros' ? sectorPersonalizado : sector;
                const distritoFinal = distrito === 'otros' ? distritoPersonalizado : distrito;
                
                // Validación para sistema multi-día
                const hayReportesGuardados = Object.values(reportesPorDia).some((r: any) => r.tipoIntervencion);
                
                if (diasTrabajo.length > 0 && hayReportesGuardados) {
                  // 🔄 MODO MULTI-DÍA PENDIENTE
                  console.log('🟠 Modo multi-día PENDIENTE detectado');
                  
                  if (!region || !provincia || !distritoFinal || !sectorFinal) {
                    alert('Por favor complete todos los campos geográficos requeridos');
                    return;
                  }
                  
                  // Guardar día actual antes de proceder
                  guardarDiaActual();
                  
                  setShowPendingAnimation(true);
                  
                  setTimeout(async () => {
                    try {
                      let reportesGuardados = 0;
                      console.log('📊 Guardando días como PENDIENTES:', diasTrabajo);
                      
                      for (const dia of diasTrabajo) {
                        const reporteDia = reportesPorDia[dia];
                        
                        if (reporteDia && reporteDia.tipoIntervencion) {
                          const reportData = {
                            timestamp: new Date(dia).toISOString(),
                            fechaCreacion: new Date(dia).toISOString(),
                            creadoPor: user?.name || 'Desconocido',
                            usuarioId: user?.username || 'desconocido',
                            region,
                            provincia,
                            distrito: distritoFinal,
                            municipio,
                            sector: sectorFinal,
                            tipoIntervencion: reporteDia.tipoIntervencion === 'Canalización' 
                              ? `${reporteDia.tipoIntervencion}:${reporteDia.subTipoCanal}` 
                              : reporteDia.tipoIntervencion,
                            subTipoCanal: reporteDia.tipoIntervencion === 'Canalización' ? reporteDia.subTipoCanal : undefined,
                            observaciones: reporteDia.observaciones || undefined,
                            metricData: reporteDia.plantillaValues,
                            gpsData: reporteDia.autoGpsFields,
                            vehiculos: reporteDia.vehiculos || [],
                            estado: 'pendiente' as const, // 🟠 PENDIENTE
                            fechaProyecto: dia,
                            esProyectoMultiDia: true
                          };
                          
                          const savedReport = await reportStorage.saveReport(reportData);
                          await firebaseReportStorage.saveReport(savedReport);
                          
                          console.log(`🟠 Reporte guardado como PENDIENTE para ${dia}`);
                          reportesGuardados++;
                        }
                      }
                      
                      setTimeout(() => {
                        setShowPendingAnimation(false);
                        alert(`🟠 ${reportesGuardados} reportes guardados como pendientes (no aparecerán en estadísticas)`);
                        limpiarFormulario();
                      }, 2000);
                      
                    } catch (error) {
                      console.error('❌ Error al guardar reportes pendientes:', error);
                      setShowPendingAnimation(false);
                      alert('Error al guardar los reportes pendientes. Intente nuevamente.');
                    }
                  }, 500);
                  
                  return;
                }
                
                // 📝 MODO UN SOLO DÍA PENDIENTE
                console.log('🟠 Modo un solo día PENDIENTE');
                
                if (!region || !provincia || !distritoFinal || !sectorFinal || !fechaInicio || !tipoIntervencion) {
                  alert('Por favor complete todos los campos requeridos');
                  return;
                }
                
                setShowPendingAnimation(true);
                
                setTimeout(async () => {
                  try {
                    // Guardar como PENDIENTE (no aparecerá en estadísticas)
                    const reportData = {
                      timestamp: fechaReporte ? new Date(fechaReporte).toISOString() : new Date().toISOString(),
                      fechaCreacion: fechaReporte ? new Date(fechaReporte).toISOString() : new Date().toISOString(),
                      creadoPor: user?.name || 'Desconocido',
                      usuarioId: user?.username || 'desconocido',
                      region,
                      provincia,
                      distrito: distritoFinal,
                      municipio,
                      sector: sectorFinal,
                      tipoIntervencion: tipoIntervencion === 'Canalización' ? `${tipoIntervencion}:${subTipoCanal}` : tipoIntervencion,
                      subTipoCanal: tipoIntervencion === 'Canalización' ? subTipoCanal : undefined,
                      observaciones: observaciones || undefined,
                      metricData: plantillaValues,
                      gpsData: autoGpsFields,
                      vehiculos: vehiculos,
                      estado: 'pendiente' as const,  // 🟠 PENDIENTE
                      // Guardar datos multi-día si existen (para futuro uso)
                      diasTrabajo: diasTrabajo.length > 0 ? diasTrabajo : undefined,
                      reportesPorDia: diasTrabajo.length > 0 ? reportesPorDia : undefined,
                      fechaInicio: fechaInicio || undefined,
                      fechaFinal: fechaFinal || undefined,
                      diaActual: diasTrabajo.length > 0 ? diaActual : undefined
                    };
                    
                    const savedReport = await reportStorage.saveReport(reportData);
                    await firebaseReportStorage.saveReport(savedReport);
                    
                    console.log('🟠 Reporte guardado como pendiente (sin estadísticas)');
                    
                    setTimeout(() => {
                      setShowPendingAnimation(false);
                      alert('🟠 Reporte guardado como pendiente (no aparecerá en estadísticas)');
                      limpiarFormulario();
                    }, 2000);
                  } catch (error) {
                    console.error('❌ Error:', error);
                    setShowPendingAnimation(false);
                    alert('Error al guardar el reporte.');
                  }
                }, 500);
              }}
            
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#F39C12',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(243, 156, 18, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(243, 156, 18, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(243, 156, 18, 0.3)';
              }}
            >
              <img 
                src="/images/pending-orange-icon.svg" 
                alt="Pendiente" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Pendiente</span>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>(Sin estadísticas)</span>
            </button>

            {/* Botón Rojo - Cancelar */}
            <button 
              type="button" 
              onClick={async () => {
                if (window.confirm('¿Está seguro de que desea cancelar? Se perderán los datos no guardados.')) {
                  // Si existe un reporte pendiente, eliminarlo
                  if (currentPendingReportId) {
                    console.log('❌ Cancelando y eliminando reporte pendiente:', currentPendingReportId);
                    try {
                      // Eliminar SOLO de Firebase
                      await firebasePendingReportStorage.deletePendingReport(currentPendingReportId);
                      console.log('✅ Reporte eliminado exitosamente de Firebase');
                    } catch (error) {
                      console.error('❌ Error eliminando reporte de Firebase:', error);
                    }
                    setCurrentPendingReportId(null);
                  }
                  
                  // Limpiar formulario
                  limpiarFormulario();
                  
                  // El formulario queda listo para un nuevo reporte
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: '#E74C3C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                boxShadow: '0 4px 8px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(231, 76, 60, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(231, 76, 60, 0.3)';
              }}
            >
              <img 
                src="/images/cancel-red-icon.svg" 
                alt="Cancelar" 
                style={{ width: '32px', height: '32px', marginBottom: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Cancelar</span>
            </button>

          </div>
        </form>
      </div>
      
      {/* Animación de guardado - con estados: guardando, éxito, error */}
      {showSaveAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            animation: 'scaleIn 0.5s ease-out',
            minWidth: '300px'
          }}>
            {/* Estado: Guardando */}
            {saveStatus === 'saving' && (
              <>
                <div style={{
                  width: '100px',
                  height: '100px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  border: '6px solid #f3f3f3',
                  borderTop: '6px solid #F59E0B',
                  animation: 'spin 1s linear infinite'
                }} />
                <h2 style={{
                  color: '#F59E0B',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: '0 0 10px 0'
                }}>
                  Guardando...
                </h2>
                <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
                  Por favor espere mientras se guardan los reportes
                </p>
              </>
            )}
            
            {/* Estado: Éxito */}
            {saveStatus === 'success' && (
              <>
                <div style={{
                  width: '100px',
                  height: '100px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  backgroundColor: '#28a745',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'checkBounce 0.6s ease-out'
                }}>
                  <svg 
                    width="60" 
                    height="60" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      animation: 'checkDraw 0.5s ease-out 0.3s forwards',
                      strokeDasharray: 50,
                      strokeDashoffset: 50
                    }}
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h2 style={{
                  color: '#28a745',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0 0 10px 0',
                  animation: 'fadeInUp 0.5s ease-out 0.2s both'
                }}>
                  ¡Guardado Exitoso!
                </h2>
                <p style={{
                  color: '#666',
                  fontSize: '16px',
                  margin: 0,
                  animation: 'fadeInUp 0.5s ease-out 0.3s both'
                }}>
                  El reporte ha sido guardado correctamente
                </p>
              </>
            )}
            
            {/* Estado: Error */}
            {saveStatus === 'error' && (
              <>
                <div style={{
                  width: '100px',
                  height: '100px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  backgroundColor: '#dc3545',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'shake 0.5s ease-out'
                }}>
                  <svg 
                    width="60" 
                    height="60" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                <h2 style={{
                  color: '#dc3545',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0 0 10px 0'
                }}>
                  Error al Guardar
                </h2>
                <p style={{
                  color: '#666',
                  fontSize: '16px',
                  margin: 0
                }}>
                  {saveErrorMessage || 'Ocurrió un error. Intente nuevamente.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            transform: scale(0.5);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes checkBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
      `}</style>

      {/* Animación de Pendiente */}
      {showPendingAnimation && (
        <PendingClockAnimation
          message="Reporte Guardado como Pendiente"
          onClose={() => {
            setShowPendingAnimation(false);
            limpiarFormulario();
            // Mantener el ID para poder cancelar después si es necesario
            // setCurrentPendingReportId(null); // NO limpiar aquí
          }}
        />
      )}

      {/* Modal de notificaciones pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={pendingReportsList}
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />

      {/* 🖼️ Modal de visualización de fotos */}
      {photoModalOpen && imagesPerDay[currentDayKey]?.[currentPhotoIndex] && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={closePhotoModal}
        >
          {/* Botón cerrar */}
          <button
            onClick={closePhotoModal}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              cursor: 'pointer',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              zIndex: 10001
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>

          {/* Contenedor de la imagen */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Imagen */}
            <img
              src={imagesPerDay[currentDayKey][currentPhotoIndex].url}
              alt={`Foto ${currentPhotoIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
            />

            {/* Info y controles */}
            <div style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px'
            }}>
              {/* Metadatos de la foto */}
              <div style={{
                color: 'white',
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>
                  📸 {currentDayKey.replace('dia-', 'Día ').replace('general', 'General')} - Foto {currentPhotoIndex + 1} de {imagesPerDay[currentDayKey].length}
                </div>
                <div style={{ opacity: 0.9 }}>
                  {new Date(imagesPerDay[currentDayKey][currentPhotoIndex].timestamp).toLocaleString('es-ES', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* Controles de navegación */}
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                {/* Botón anterior */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevPhoto();
                  }}
                  disabled={currentPhotoIndex === 0 && Object.keys(imagesPerDay).indexOf(currentDayKey) === 0}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    opacity: currentPhotoIndex === 0 && Object.keys(imagesPerDay).indexOf(currentDayKey) === 0 ? 0.3 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!(currentPhotoIndex === 0 && Object.keys(imagesPerDay).indexOf(currentDayKey) === 0)) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  ← Anterior
                </button>

                {/* Botón descargar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadCurrentPhoto();
                  }}
                  style={{
                    backgroundColor: '#FF7A00',
                    border: 'none',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF9533';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF7A00';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  📥 Descargar
                </button>

                {/* Botón siguiente */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextPhoto();
                  }}
                  disabled={(() => {
                    const dayKeys = Object.keys(imagesPerDay).filter(key => imagesPerDay[key]?.length > 0);
                    const currentDayIndex = dayKeys.indexOf(currentDayKey);
                    const currentDayImages = imagesPerDay[currentDayKey] || [];
                    return currentPhotoIndex === currentDayImages.length - 1 && currentDayIndex === dayKeys.length - 1;
                  })()}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    opacity: (() => {
                      const dayKeys = Object.keys(imagesPerDay).filter(key => imagesPerDay[key]?.length > 0);
                      const currentDayIndex = dayKeys.indexOf(currentDayKey);
                      const currentDayImages = imagesPerDay[currentDayKey] || [];
                      return currentPhotoIndex === currentDayImages.length - 1 && currentDayIndex === dayKeys.length - 1 ? 0.3 : 1;
                    })()
                  }}
                  onMouseEnter={(e) => {
                    const dayKeys = Object.keys(imagesPerDay).filter(key => imagesPerDay[key]?.length > 0);
                    const currentDayIndex = dayKeys.indexOf(currentDayKey);
                    const currentDayImages = imagesPerDay[currentDayKey] || [];
                    if (!(currentPhotoIndex === currentDayImages.length - 1 && currentDayIndex === dayKeys.length - 1)) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  Siguiente →
                </button>
              </div>

              {/* Indicador de posición global */}
              <div style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                {(() => {
                  const allPhotos: any[] = [];
                  Object.entries(imagesPerDay).forEach(([dk, imgs]: [string, any]) => {
                    if (imgs && Array.isArray(imgs)) {
                      imgs.forEach((img: any, idx: number) => {
                        allPhotos.push({ dayKey: dk, index: idx, ...img });
                      });
                    }
                  });
                  const currentGlobalIndex = allPhotos.findIndex(p => p.dayKey === currentDayKey && p.index === currentPhotoIndex) + 1;
                  return `Foto ${currentGlobalIndex} de ${allPhotos.length} en total`;
                })()}
              </div>
            </div>
          </div>

          {/* Hint para cerrar */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px'
          }}>
            Presione ESC o haga clic fuera de la imagen para cerrar
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
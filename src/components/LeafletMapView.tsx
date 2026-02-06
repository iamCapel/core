import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportStorage } from '../services/reportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import DetailedReportView from './DetailedReportView';

// Configurar iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Tipo de vista del mapa
type MapViewMode = 'vehiculos' | 'actividades' | 'operadores';

interface Intervention {
  id: number;
  timestamp: string;
  numeroReporte?: string;
  region: string;
  provincia: string;
  distrito: string;
  municipio: string;
  sector: string;
  tipoIntervencion: string;
  usuario: string;
  latitud?: number;
  longitud?: number;
  vehiculos?: Array<{tipo: string; modelo: string; ficha: string}>;
  fechaInicio?: string;
  fechaFinal?: string;
  diasTrabajo?: string[];
  creadoPor?: string;
  [key: string]: any;
}

interface VehiculoMarker {
  id: string;
  ficha: string;
  tipo: string;
  modelo: string;
  latitud: number;
  longitud: number;
  actividad: string;
  reportes: Array<{
    numeroReporte: string;
    fechaInicio: string;
    fechaFin: string;
    tipoIntervencion: string;
  }>;
}

// Nuevo interface para reportes con vehículos
interface ReporteConVehiculos {
  id: string;
  numeroReporte: string;
  tipoIntervencion: string;
  municipio: string;
  provincia: string;
  fechaInicio: string;
  fechaFin: string;
  latitud: number;
  longitud: number;
  vehiculos: Array<{
    tipo: string;
    modelo: string;
    ficha: string;
  }>;
}

interface OperadorMarker {
  id: string;
  username: string;
  nombre: string;
  latitud: number;
  longitud: number;
  ultimaActividad?: string;
  reportesCercanos: Array<{
    numeroReporte: string;
    tipoIntervencion: string;
    distancia: number;
  }>;
}

interface LeafletMapViewProps {
  user: any;
  onBack: () => void;
}

// Función para calcular distancia entre coordenadas (Haversine)
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
  const [vehiculosMarkers, setVehiculosMarkers] = useState<VehiculoMarker[]>([]);
  const [reportesConVehiculos, setReportesConVehiculos] = useState<ReporteConVehiculos[]>([]);
  const [operadoresMarkers, setOperadoresMarkers] = useState<OperadorMarker[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedReportNumber, setSelectedReportNumber] = useState<string>('');
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('actividades');
  const [loading, setLoading] = useState(false);
  const [busquedaFicha, setBusquedaFicha] = useState<string>('');

  // Cargar datos según el modo de vista
  useEffect(() => {
    loadMapData();
  }, [user, mapViewMode]);

  const loadMapData = async () => {
    setLoading(true);
    
    try {
      // Cargar reportes desde Firebase
      const reports = await firebaseReportStorage.getAllReports();
      
      // Filtrar reportes para usuarios técnicos
      let filteredReports = reports;
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        filteredReports = reports.filter(report => report.creadoPor === user.username);
      }

      // Procesar datos según el modo
      if (mapViewMode === 'actividades') {
        const interventionsData = filteredReports.map((report: any, index: number) => {
          // Obtener coordenadas basadas en la dirección seleccionada en el reporte
          // Prioridad: municipio > provincia > región
          let latitud: number | undefined;
          let longitud: number | undefined;
          
          // Buscar por municipio primero
          if (report.municipio && municipioCoordinates[report.municipio]) {
            latitud = municipioCoordinates[report.municipio].lat;
            longitud = municipioCoordinates[report.municipio].lng;
          }
          // Buscar por distrito si no hay municipio
          else if (report.distrito && municipioCoordinates[report.distrito]) {
            latitud = municipioCoordinates[report.distrito].lat;
            longitud = municipioCoordinates[report.distrito].lng;
          }
          // Buscar por provincia si no hay municipio ni distrito
          else if (report.provincia && municipioCoordinates[report.provincia]) {
            latitud = municipioCoordinates[report.provincia].lat;
            longitud = municipioCoordinates[report.provincia].lng;
          }
          
          return {
            id: index,
            timestamp: report.timestamp || report.fechaCreacion,
            numeroReporte: report.numeroReporte,
            region: report.region,
            provincia: report.provincia,
            distrito: report.distrito,
            municipio: report.municipio,
            sector: report.sector,
            tipoIntervencion: report.tipoIntervencion,
            usuario: report.creadoPor,
            creadoPor: report.creadoPor,
            latitud: latitud,
            longitud: longitud,
            fechaInicio: report.fechaInicio || report.fechaProyecto,
            fechaFinal: report.fechaFinal || report.fechaProyecto,
            diasTrabajo: report.diasTrabajo
          };
        });
        setInterventions(interventionsData);
        
        // Obtener tipos únicos
        const typeSet = new Set<string>();
        interventionsData.forEach((i: Intervention) => typeSet.add(i.tipoIntervencion));
        setSelectedTypes(Array.from(typeSet));
      }
      
      if (mapViewMode === 'vehiculos') {
        // Crear lista de reportes que tienen vehículos
        const reportesVehiculos: ReporteConVehiculos[] = [];
        
        filteredReports.forEach((report: any) => {
          if (report.vehiculos && Array.isArray(report.vehiculos) && report.vehiculos.length > 0) {
            // Obtener coordenadas basadas en la dirección seleccionada en el reporte
            // Prioridad: municipio > distrito > provincia
            let finalLat: number | undefined;
            let finalLon: number | undefined;
            
            // Buscar por municipio primero
            if (report.municipio && municipioCoordinates[report.municipio]) {
              finalLat = municipioCoordinates[report.municipio].lat;
              finalLon = municipioCoordinates[report.municipio].lng;
            }
            // Buscar por distrito si no hay municipio
            else if (report.distrito && municipioCoordinates[report.distrito]) {
              finalLat = municipioCoordinates[report.distrito].lat;
              finalLon = municipioCoordinates[report.distrito].lng;
            }
            // Buscar por provincia si no hay municipio ni distrito
            else if (report.provincia && municipioCoordinates[report.provincia]) {
              finalLat = municipioCoordinates[report.provincia].lat;
              finalLon = municipioCoordinates[report.provincia].lng;
            }
            
            if (finalLat && finalLon) {
              // Obtener fechas - Priorizar fechaInicio y fechaFinal del formulario
              // Estas son las fechas seleccionadas por el usuario al llenar el reporte
              let fechaInicioReporte = report.fechaInicio;
              let fechaFinReporte = report.fechaFinal;
              
              // Fallback: si no hay fechas explícitas, usar diasTrabajo
              if (!fechaInicioReporte && report.diasTrabajo && report.diasTrabajo.length > 0) {
                const diasOrdenados = [...report.diasTrabajo].sort();
                fechaInicioReporte = diasOrdenados[0];
              }
              if (!fechaFinReporte && report.diasTrabajo && report.diasTrabajo.length > 0) {
                const diasOrdenados = [...report.diasTrabajo].sort();
                fechaFinReporte = diasOrdenados[diasOrdenados.length - 1];
              }
              
              // Último fallback: fechaProyecto o fechaCreacion
              fechaInicioReporte = fechaInicioReporte || report.fechaProyecto || report.fechaCreacion;
              fechaFinReporte = fechaFinReporte || report.fechaProyecto || report.fechaCreacion;
              
              // Filtrar vehículos válidos (con ficha)
              const vehiculosValidos = report.vehiculos.filter((v: any) => v.ficha?.trim());
              
              if (vehiculosValidos.length > 0) {
                reportesVehiculos.push({
                  id: report.id || report.numeroReporte,
                  numeroReporte: report.numeroReporte,
                  tipoIntervencion: report.tipoIntervencion,
                  municipio: report.municipio,
                  provincia: report.provincia,
                  fechaInicio: fechaInicioReporte,
                  fechaFin: fechaFinReporte,
                  latitud: finalLat,
                  longitud: finalLon,
                  vehiculos: vehiculosValidos.map((v: any) => ({
                    tipo: v.tipo || 'Sin tipo',
                    modelo: v.modelo || 'Sin modelo',
                    ficha: v.ficha
                  }))
                });
              }
            }
          }
        });
        
        setReportesConVehiculos(reportesVehiculos);
      }
      
      if (mapViewMode === 'operadores') {
        // Obtener técnicos únicos de los reportes
        const tecnicosMap: Record<string, OperadorMarker> = {};
        
        filteredReports.forEach((report: any) => {
          const username = report.creadoPor;
          if (!username) return;
          
          const lat = report.gpsData?.punto_inicial?.lat || report.gpsData?.punto_alcanzado?.lat;
          const lon = report.gpsData?.punto_inicial?.lon || report.gpsData?.punto_alcanzado?.lon;
          
          let finalLat = lat;
          let finalLon = lon;
          if (!lat || !lon) {
            const coords = municipioCoordinates[report.municipio];
            if (coords) {
              finalLat = coords.lat;
              finalLon = coords.lng;
            }
          }
          
          if (finalLat && finalLon) {
            if (!tecnicosMap[username]) {
              tecnicosMap[username] = {
                id: username,
                username: username,
                nombre: username,
                latitud: finalLat,
                longitud: finalLon,
                ultimaActividad: report.tipoIntervencion,
                reportesCercanos: [{
                  numeroReporte: report.numeroReporte,
                  tipoIntervencion: report.tipoIntervencion,
                  distancia: 0
                }]
              };
            } else {
              // Actualizar a la ubicación más reciente
              const fechaActual = new Date(report.fechaCreacion || report.timestamp);
              tecnicosMap[username].latitud = finalLat;
              tecnicosMap[username].longitud = finalLon;
              tecnicosMap[username].ultimaActividad = report.tipoIntervencion;
              tecnicosMap[username].reportesCercanos.push({
                numeroReporte: report.numeroReporte,
                tipoIntervencion: report.tipoIntervencion,
                distancia: 0
              });
            }
          }
        });
        
        setOperadoresMarkers(Object.values(tecnicosMap));
      }
    } catch (error) {
      console.error('Error cargando datos del mapa:', error);
    }
    
    setLoading(false);
  };

  const filteredInterventions = interventions.filter(intervention => 
    selectedTypes.includes(intervention.tipoIntervencion)
  );


  const getTypeColor = (tipo: string) => {
    for (const [key, color] of Object.entries(INTERVENTION_COLORS)) {
      if (tipo.includes(key)) return color;
    }
    return INTERVENTION_COLORS.default;
  };

  const handleViewDetail = (numeroReporte: string) => {
    setSelectedReportNumber(numeroReporte);
    setShowDetailView(true);
  };

  const handleBackToMap = () => {
    setShowDetailView(false);
    setSelectedReportNumber('');
  };

  if (showDetailView && selectedReportNumber) {
    return (
      <DetailedReportView 
        user={user} 
        initialReportNumber={selectedReportNumber} 
        onBack={handleBackToMap} 
      />
    );
  }

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

  // Icono de vehículo pesado (excavadora)
  const createVehiculoIcon = () => {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="18" fill="#FF7700" stroke="#fff" stroke-width="2"/>
        <text x="20" y="26" font-size="20" text-anchor="middle" fill="white">🚜</text>
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker vehiculo-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  // Icono de actividad (obrero con pala)
  const createActividadIcon = (color: string) => {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
        <circle cx="18" cy="18" r="16" fill="${color}" stroke="#fff" stroke-width="2"/>
        <text x="18" y="24" font-size="18" text-anchor="middle" fill="white">⛏️</text>
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker actividad-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };

  // Icono de operador (técnico)
  const createOperadorIcon = () => {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
        <circle cx="18" cy="18" r="16" fill="#3498db" stroke="#fff" stroke-width="2"/>
        <text x="18" y="24" font-size="18" text-anchor="middle" fill="white">👷</text>
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker operador-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };

  // Formatear fecha corta
  const formatearFechaCorta = (fecha: string | undefined): string => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Centro de República Dominicana
  const center: [number, number] = [18.7357, -70.1627];

  return (
    <div style={{ padding: '20px', height: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: 'white',
        color: '#2c3e50',
        padding: '12px 20px',
        marginBottom: '20px',
        borderRadius: '0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Volver
          </button>
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#dee2e6'
          }}></div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '18px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            🗺️ Mapa de Intervenciones MOPC
          </h1>
        </div>
        {/* Ícono de notificaciones - posicionado a la derecha */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <img 
            src="/images/notification-bell-icon.svg" 
            alt="Notificaciones" 
            style={{
              width: '24px', 
              height: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
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
        </div>
      </div>      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
        {/* Panel de control */}
        <div style={{ 
          width: '280px', 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2c3e50', fontSize: '16px' }}>🗺️ Ver en el Mapa</h3>
          
          {/* Menú de selección de vista */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Opción Vehículos */}
            <button
              onClick={() => setMapViewMode('vehiculos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: mapViewMode === 'vehiculos' ? '#FFF3E6' : '#f8f9fa',
                border: mapViewMode === 'vehiculos' ? '2px solid #FF7700' : '1px solid #e9ecef',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>🚜</span>
              <div>
                <div style={{ fontWeight: '600', color: mapViewMode === 'vehiculos' ? '#FF7700' : '#2c3e50', fontSize: '14px' }}>
                  Vehículos
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {reportesConVehiculos.length} obras con vehículos
                </div>
              </div>
              {mapViewMode === 'vehiculos' && (
                <span style={{ marginLeft: 'auto', color: '#FF7700', fontWeight: 'bold' }}>✓</span>
              )}
            </button>

            {/* Filtro de búsqueda por ficha - Solo visible en modo Vehículos */}
            {mapViewMode === 'vehiculos' && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#FFF3E6', 
                borderRadius: '8px',
                border: '1px solid #FFD699'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#FF7700', marginBottom: '6px', display: 'block' }}>
                  🔍 Buscar por Ficha
                </label>
                <input
                  type="text"
                  placeholder="Ej: 12345"
                  value={busquedaFicha}
                  onChange={(e) => setBusquedaFicha(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #FFD699',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                {busquedaFicha && (
                  <button
                    onClick={() => setBusquedaFicha('')}
                    style={{
                      marginTop: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      backgroundColor: '#fff',
                      border: '1px solid #FF7700',
                      color: '#FF7700',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Limpiar filtro
                  </button>
                )}
              </div>
            )}

            {/* Opción Actividades */}
            <button
              onClick={() => setMapViewMode('actividades')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: mapViewMode === 'actividades' ? '#e8f5e9' : '#f8f9fa',
                border: mapViewMode === 'actividades' ? '2px solid #4CAF50' : '1px solid #e9ecef',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>⛏️</span>
              <div>
                <div style={{ fontWeight: '600', color: mapViewMode === 'actividades' ? '#4CAF50' : '#2c3e50', fontSize: '14px' }}>
                  Actividades
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {interventions.length} intervenciones
                </div>
              </div>
              {mapViewMode === 'actividades' && (
                <span style={{ marginLeft: 'auto', color: '#4CAF50', fontWeight: 'bold' }}>✓</span>
              )}
            </button>

            {/* Opción Operadores */}
            <button
              onClick={() => setMapViewMode('operadores')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: mapViewMode === 'operadores' ? '#e3f2fd' : '#f8f9fa',
                border: mapViewMode === 'operadores' ? '2px solid #2196F3' : '1px solid #e9ecef',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>👷</span>
              <div>
                <div style={{ fontWeight: '600', color: mapViewMode === 'operadores' ? '#2196F3' : '#2c3e50', fontSize: '14px' }}>
                  Operadores
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {operadoresMarkers.length} técnicos
                </div>
              </div>
              {mapViewMode === 'operadores' && (
                <span style={{ marginLeft: 'auto', color: '#2196F3', fontWeight: 'bold' }}>✓</span>
              )}
            </button>
          </div>

          {/* Información de la vista actual */}
          <div style={{ 
            marginTop: '20px', 
            padding: '12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#6c757d'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '20px' }}>⏳</span>
                <p style={{ margin: '8px 0 0' }}>Cargando datos...</p>
              </div>
            ) : (
              <>
                {mapViewMode === 'vehiculos' && (
                  <div>
                    <p style={{ margin: '0 0 8px' }}>
                      <strong>🚜 Vehículos:</strong> Muestra las obras que tienen vehículos registrados. 
                      Haz clic en un marcador para ver la lista de fichas.
                    </p>
                    {busquedaFicha && (
                      <p style={{ margin: 0, color: '#FF7700', fontWeight: '600' }}>
                        🔍 Filtrando por ficha: "{busquedaFicha}" - {reportesConVehiculos.filter(r => 
                          r.vehiculos.some(v => v.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()))
                        ).length} obras encontradas
                      </p>
                    )}
                  </div>
                )}
                {mapViewMode === 'actividades' && (
                  <p style={{ margin: 0 }}>
                    <strong>⛏️ Actividades:</strong> Muestra las intervenciones registradas. 
                    Haz clic en un icono para ver el detalle del reporte.
                  </p>
                )}
                {mapViewMode === 'operadores' && (
                  <p style={{ margin: 0 }}>
                    <strong>👷 Operadores:</strong> Muestra la última ubicación conocida de los técnicos 
                    basada en sus reportes más recientes.
                  </p>
                )}
              </>
            )}
          </div>
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
            
            {/* Marcadores de VEHÍCULOS (Reportes con vehículos) */}
            {mapViewMode === 'vehiculos' && reportesConVehiculos
              .filter(reporte => {
                // Filtrar por búsqueda de ficha si hay texto
                if (!busquedaFicha.trim()) return true;
                return reporte.vehiculos.some(v => 
                  v.ficha.toLowerCase().includes(busquedaFicha.toLowerCase())
                );
              })
              .map((reporte) => (
              <Marker 
                key={reporte.id} 
                position={[reporte.latitud, reporte.longitud]}
                icon={createVehiculoIcon()}
              >
                <Popup closeOnClick={false}>
                  <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '280px', maxWidth: '340px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #FF7700 0%, #FF9944 100%)', 
                      color: 'white', 
                      padding: '12px', 
                      margin: '-13px -20px 12px -20px',
                      borderRadius: '8px 8px 0 0'
                    }}>
                      <p 
                        onMouseDown={(e) => { e.preventDefault(); handleViewDetail(reporte.numeroReporte); }}
                        style={{ 
                          margin: '0 0 6px', 
                          fontSize: '14px', 
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        📋 {reporte.numeroReporte}
                      </p>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>
                        ⛏️ {reporte.tipoIntervencion}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
                        📍 {reporte.municipio}, {reporte.provincia}
                      </p>
                    </div>
                    
                    <div style={{ fontSize: '13px' }}>
                      {/* Fechas del reporte */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        marginBottom: '12px',
                        padding: '8px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '6px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>📅 INICIO</div>
                          <div style={{ fontWeight: '700', color: '#2e7d32' }}>{formatearFechaCorta(reporte.fechaInicio)}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>🏁 FIN</div>
                          <div style={{ fontWeight: '700', color: '#c62828' }}>{formatearFechaCorta(reporte.fechaFin)}</div>
                        </div>
                      </div>
                      
                      {/* Lista de vehículos/fichas */}
                      <div style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '6px', 
                        padding: '10px',
                        maxHeight: '180px',
                        overflowY: 'auto'
                      }}>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#FF7700', fontSize: '12px' }}>
                          🚜 VEHÍCULOS EN ESTA OBRA ({reporte.vehiculos.length})
                        </p>
                        {reporte.vehiculos.map((vehiculo, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            marginBottom: idx < reporte.vehiculos.length - 1 ? '6px' : 0,
                            backgroundColor: busquedaFicha && vehiculo.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()) 
                              ? '#FFF3E6' : '#fff',
                            borderRadius: '6px',
                            border: busquedaFicha && vehiculo.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()) 
                              ? '2px solid #FF7700' : '1px solid #e9ecef'
                          }}>
                            <span style={{ fontSize: '20px' }}>🚜</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '13px' }}>
                                {vehiculo.tipo}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6c757d' }}>
                                {vehiculo.modelo}
                              </div>
                            </div>
                            <div style={{ 
                              backgroundColor: '#FF7700',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              {vehiculo.ficha}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Botón ver detalle */}
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); handleViewDetail(reporte.numeroReporte); }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#FF7700',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Ver Reporte Completo →
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Marcadores de ACTIVIDADES */}
            {mapViewMode === 'actividades' && filteredInterventions.map((intervention, index) => {
              let position: [number, number];
              if (intervention.latitud && intervention.longitud) {
                position = [intervention.latitud, intervention.longitud];
              } else {
                const municipioCoords = municipioCoordinates[intervention.municipio];
                if (municipioCoords) {
                  position = [municipioCoords.lat, municipioCoords.lng];
                } else {
                  position = [18.4861, -69.9312];
                }
              }
              const markerColor = getTypeColor(intervention.tipoIntervencion);

              return (
                <Marker 
                  key={intervention.id} 
                  position={position}
                  icon={createActividadIcon(markerColor)}
                >
                  <Popup closeOnClick={false}>
                    <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '260px', maxWidth: '300px' }}>
                      <div style={{ 
                        background: `linear-gradient(135deg, ${markerColor} 0%, ${markerColor}cc 100%)`, 
                        color: 'white', 
                        padding: '12px', 
                        margin: '-13px -20px 12px -20px',
                        borderRadius: '8px 8px 0 0'
                      }}>
                        {intervention.numeroReporte && (
                          <p 
                            onMouseDown={(e) => { e.preventDefault(); handleViewDetail(intervention.numeroReporte!); }}
                            style={{ 
                              margin: '0 0 6px', 
                              fontSize: '14px', 
                              fontWeight: '700',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            📋 {intervention.numeroReporte}
                          </p>
                        )}
                        <h3 style={{ margin: 0, fontSize: '15px' }}>
                          ⛏️ {intervention.tipoIntervencion}
                        </h3>
                      </div>
                      
                      <div style={{ fontSize: '13px' }}>
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>👤 Técnico:</strong> {intervention.usuario || intervention.creadoPor}
                        </p>
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>📅 Inicio:</strong> {formatearFechaCorta(intervention.fechaInicio || intervention.timestamp)}
                        </p>
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>🏁 Fin:</strong> {formatearFechaCorta(intervention.fechaFinal || intervention.timestamp)}
                        </p>
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>📍 Ubicación:</strong> {intervention.municipio}, {intervention.provincia}
                        </p>
                        
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); intervention.numeroReporte && handleViewDetail(intervention.numeroReporte); }}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: markerColor,
                              color: 'white',
                              border: 'none',
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Ver Reporte →
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Marcadores de OPERADORES */}
            {mapViewMode === 'operadores' && operadoresMarkers.map((operador) => (
              <Marker 
                key={operador.id} 
                position={[operador.latitud, operador.longitud]}
                icon={createOperadorIcon()}
              >
                <Popup closeOnClick={false}>
                  <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '260px', maxWidth: '300px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', 
                      color: 'white', 
                      padding: '12px', 
                      margin: '-13px -20px 12px -20px',
                      borderRadius: '8px 8px 0 0'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👷 {operador.nombre}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
                        Técnico de Campo
                      </p>
                    </div>
                    
                    <div style={{ fontSize: '13px' }}>
                      {operador.ultimaActividad && (
                        <p style={{ margin: '0 0 8px' }}>
                          <strong>🔧 Última actividad:</strong> {operador.ultimaActividad}
                        </p>
                      )}
                      
                      <div style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '6px', 
                        padding: '10px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        <p style={{ margin: '0 0 6px', fontWeight: '600', color: '#495057', fontSize: '11px' }}>
                          📋 REPORTES RECIENTES ({operador.reportesCercanos.length})
                        </p>
                        {operador.reportesCercanos.slice(0, 5).map((rep, idx) => (
                          <div key={idx} style={{ 
                            borderBottom: idx < Math.min(operador.reportesCercanos.length, 5) - 1 ? '1px solid #e9ecef' : 'none',
                            paddingBottom: '4px',
                            marginBottom: '4px'
                          }}>
                            <span 
                              onMouseDown={(e) => { e.preventDefault(); handleViewDetail(rep.numeroReporte); }}
                              style={{ 
                                color: '#3498db', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '12px'
                              }}
                            >
                              {rep.numeroReporte}
                            </span>
                            <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: '6px' }}>
                              - {rep.tipoIntervencion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .vehiculo-marker, .actividad-marker, .operador-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          padding: 0;
        }
        
        .leaflet-popup-content {
          margin: 13px 20px;
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default LeafletMapView;
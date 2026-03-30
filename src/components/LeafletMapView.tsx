import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportStorage } from '../services/reportStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import userLocationService from '../services/userLocationService';
import DetailedReportView from './DetailedReportView';
import { UserRole } from '../types/userRoles';

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
    region?: string;
    provincia?: string;
    distrito?: string;
    municipio?: string;
    sector?: string;
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
  isRealTime?: boolean; // Indica si la ubicación es en tiempo real
  lastUpdate?: string; // Última actualización de ubicación
  accuracy?: number; // Precisión del GPS en metros
  deviceId?: string; // ID del dispositivo
  altitude?: number; // Altitud en metros
  speed?: number; // Velocidad en m/s
  heading?: number; // Dirección en grados
  status?: 'online' | 'recent' | 'offline'; // Estado de conexión
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

const normalizeLocationKey = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

const findLocationCoordinate = (value: string): { lat: number; lng: number } | null => {
  if (!value || typeof value !== 'string') return null;

  const normalized = normalizeLocationKey(value);

  // Búsqueda exacta directo (incluye acentos, si existe singular)
  for (const key of Object.keys(municipioCoordinates)) {
    if (normalizeLocationKey(key) === normalized) {
      return municipioCoordinates[key];
    }
  }

  // Búsqueda parcial (ej. "san pedro" coincide con pluri)
  for (const key of Object.keys(municipioCoordinates)) {
    if (normalizeLocationKey(key).includes(normalized) || normalized.includes(normalizeLocationKey(key))) {
      return municipioCoordinates[key];
    }
  }

  return null;
};

type LocationMode = 'provincia' | 'municipio' | 'distrito';

const getReportCoordinates = (report: any, mode: LocationMode = 'municipio'): { lat: number; lng: number } | null => {
  // El modo determina qué jerarquía usar primero.
  let locationOrder: (string | undefined)[];
  if (mode === 'provincia') {
    locationOrder = [
      report.provincia,
      report.region,
      report.zona,
      report.sector,
      report.direccion,
      report.municipio,
      report.distrito,
    ];
  } else if (mode === 'distrito') {
    locationOrder = [
      report.distrito,
      report.municipio,
      report.provincia,
      report.region,
      report.zona,
      report.sector,
      report.direccion,
    ];
  } else {
    locationOrder = [
      report.municipio,
      report.distrito,
      report.provincia,
      report.region,
      report.zona,
      report.sector,
      report.direccion,
    ];
  }

  for (const place of locationOrder) {
    const coordinates = findLocationCoordinate(place);
    if (coordinates) {
      return coordinates;
    }
  }

  // Si no hay dirección válida, usar GPS o coordenadas directas (precisa actual) como fallback.
  if (report.gpsData?.punto_inicial?.lat && report.gpsData?.punto_inicial?.lon) {
    return { lat: report.gpsData.punto_inicial.lat, lng: report.gpsData.punto_inicial.lon };
  }
  if (report.gpsData?.punto_alcanzado?.lat && report.gpsData?.punto_alcanzado?.lon) {
    return { lat: report.gpsData.punto_alcanzado.lat, lng: report.gpsData.punto_alcanzado.lon };
  }

  // Si no hay geocodificación textual válida, usar coordenadas directas (lat/lng) y gps
  const coordCandidates = [
    { lat: report.latitud, lng: report.longitud },
    { lat: report.lat, lng: report.lon },
    { lat: report.latitude, lng: report.longitude },
    { lat: report.latitudActual, lng: report.longitudActual },
    { lat: report.gpsData?.punto_inicial?.lat, lng: report.gpsData?.punto_inicial?.lon },
    { lat: report.gpsData?.punto_alcanzado?.lat, lng: report.gpsData?.punto_alcanzado?.lon }
  ];

  for (const c of coordCandidates) {
    if (c && c.lat !== undefined && c.lng !== undefined) {
      const lat = Number(c.lat);
      const lng = Number(c.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const latIsValid = lat >= -90 && lat <= 90;
      const lngIsValid = lng >= -180 && lng <= 180;
      if (latIsValid && lngIsValid) {
        return { lat, lng };
      }

      const swappedLat = Number(c.lng);
      const swappedLng = Number(c.lat);
      if (swappedLat >= -90 && swappedLat <= 90 && swappedLng >= -180 && swappedLng <= 180) {
        return { lat: swappedLat, lng: swappedLng };
      }
    }
  }

  return null;
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const hasOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => {
  return startA.getTime() <= endB.getTime() && startB.getTime() <= endA.getTime();
};

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

  const [vehiculosMode, setVehiculosMode] = useState<'grupos' | 'solo'>('grupos');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiculoMarker | {tipo: string; modelo: string; ficha: string; latitud?: number; longitud?: number; reportes?: any[]} | null>(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<any[]>([]);
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);
  const [selectedVehicleCurrent, setSelectedVehicleCurrent] = useState<any>(null);
  const [showVehicleHistoryModal, setShowVehicleHistoryModal] = useState(false);

  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('actividades');
  const [locationMode, setLocationMode] = useState<LocationMode>('provincia');
  const [loading, setLoading] = useState(false);
  const [busquedaFicha, setBusquedaFicha] = useState<string>('');
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());

  const refreshCycle: LocationMode[] = ['provincia', 'municipio', 'distrito'];
  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationMode(prev => {
      const nextIndex = (refreshCycle.indexOf(prev) + 1) % refreshCycle.length;
      return refreshCycle[nextIndex];
    });
    setRefreshTimestamp(Date.now());
  };

  // Cargar datos según el modo de vista
  useEffect(() => {
    loadMapData();
  }, [user, mapViewMode, refreshTimestamp, locationMode]);

  const loadMapData = async () => {
    setLoading(true);
    
    try {
      // Cargar reportes desde Firebase
      const reports = await firebaseReportStorage.getAllReports();
      
      // Filtrar reportes para usuarios técnicos
      let filteredReports = reports;
      if (user?.role === 'Técnico' || user?.role === 'tecnico') {
        filteredReports = reports.filter(report => report.usuarioId === user.username);
      }

      // Procesar datos según el modo
      if (mapViewMode === 'actividades') {
        const interventionsData = filteredReports.map((report: any, index: number) => {
          // Obtener coordenadas claras usando modo de ubicación activo: provincia/municipio/distrito
          const coords = getReportCoordinates(report, locationMode);
          let latitud: number | undefined;
          let longitud: number | undefined;

          if (coords) {
            latitud = coords.lat;
            longitud = coords.lng;
          } else {
            // Fallback a la lógica anterior si no se pudo resolver coordenadas
            if (report.municipio && municipioCoordinates[report.municipio]) {
              latitud = municipioCoordinates[report.municipio].lat;
              longitud = municipioCoordinates[report.municipio].lng;
            } else if (report.distrito && municipioCoordinates[report.distrito]) {
              latitud = municipioCoordinates[report.distrito].lat;
              longitud = municipioCoordinates[report.distrito].lng;
            } else if (report.provincia && municipioCoordinates[report.provincia]) {
              latitud = municipioCoordinates[report.provincia].lat;
              longitud = municipioCoordinates[report.provincia].lng;
            }
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
        // Agrupar por reportes y por vehículos individuales
        const reportesVehiculos: ReporteConVehiculos[] = [];
        const vehiculosMap: Record<string, VehiculoMarker> = {};

        filteredReports.forEach((report: any) => {
          if (!report.vehiculos || !Array.isArray(report.vehiculos) || report.vehiculos.length === 0) return;

          const coords = getReportCoordinates(report, locationMode);
          if (!coords) return;

          let fechaInicioReporte = report.fechaInicio;
          let fechaFinReporte = report.fechaFinal;

          if (!fechaInicioReporte && report.diasTrabajo && report.diasTrabajo.length > 0) {
            const diasOrdenados = [...report.diasTrabajo].sort();
            fechaInicioReporte = diasOrdenados[0];
          }
          if (!fechaFinReporte && report.diasTrabajo && report.diasTrabajo.length > 0) {
            const diasOrdenados = [...report.diasTrabajo].sort();
            fechaFinReporte = diasOrdenados[diasOrdenados.length - 1];
          }

          fechaInicioReporte = fechaInicioReporte || report.fechaProyecto || report.fechaCreacion || report.timestamp || '';
          fechaFinReporte = fechaFinReporte || report.fechaProyecto || report.fechaCreacion || report.timestamp || '';

          const vehiculosValidos = report.vehiculos.filter((v: any) => v.ficha?.trim());
          if (vehiculosValidos.length === 0) return;

          reportesVehiculos.push({
            id: report.id || report.numeroReporte,
            numeroReporte: report.numeroReporte,
            tipoIntervencion: report.tipoIntervencion,
            municipio: report.municipio || '',
            provincia: report.provincia || '',
            fechaInicio: fechaInicioReporte,
            fechaFin: fechaFinReporte,
            latitud: coords.lat,
            longitud: coords.lng,
            vehiculos: vehiculosValidos.map((v: any) => ({
              tipo: v.tipo || 'Sin tipo',
              modelo: v.modelo || 'Sin modelo',
              ficha: v.ficha
            }))
          });

          vehiculosValidos.forEach((v: any, idx: number) => {
            const key = v.ficha.trim();
            if (!key) return;

            const current = vehiculosMap[key];
            if (!current) {
              vehiculosMap[key] = {
                id: `${key}_${report.id || idx}`,
                ficha: key,
                tipo: v.tipo || 'Sin tipo',
                modelo: v.modelo || 'Sin modelo',
                latitud: coords.lat,
                longitud: coords.lng,
                actividad: report.tipoIntervencion || 'Desconocida',
                reportes: [{
                  numeroReporte: report.numeroReporte || 'N/A',
                  fechaInicio: fechaInicioReporte,
                  fechaFin: fechaFinReporte,
                  tipoIntervencion: report.tipoIntervencion || 'N/A',
                  region: report.region || '',
                  provincia: report.provincia || '',
                  distrito: report.distrito || '',
                  municipio: report.municipio || '',
                  sector: report.sector || ''
                }]
              };
            } else {
              current.reportes.push({
                numeroReporte: report.numeroReporte || 'N/A',
                fechaInicio: fechaInicioReporte,
                fechaFin: fechaFinReporte,
                tipoIntervencion: report.tipoIntervencion || 'N/A',
                region: report.region || '',
                provincia: report.provincia || '',
                distrito: report.distrito || '',
                municipio: report.municipio || '',
                sector: report.sector || ''
              });

              // actualizar posición si rep por fecha más reciente
              const currentEnd = toDate(current.reportes[current.reportes.length-1].fechaFin);
              const newEnd = toDate(fechaFinReporte);
              if (newEnd && (!currentEnd || newEnd.getTime() > currentEnd.getTime())) {
                current.latitud = coords.lat;
                current.longitud = coords.lng;
                current.actividad = report.tipoIntervencion || current.actividad;
              }
            }
          });
        });

        // Añadir registros directos de la colección de vehículos (CORE-APK) para no perder ninguno
        const vehicleRecords = await firebaseReportStorage.getAllVehicleReports();
        vehicleRecords.forEach((vr: any) => {
          const ficha = (vr.fichaVehiculoActual || vr.ficha || '').toString().trim();
          if (!ficha) return;

          // Prioriza coordenadas directas si existen, sino usa la misma función de reporte
          const coords = getReportCoordinates(vr, locationMode) || getReportCoordinates({
            municipio: vr.municipio,
            provincia: vr.provincia,
            distrito: vr.distrito
          });
          if (!coords) return;

          const key = ficha;
          const existing = vehiculosMap[key];
          const reportId = vr.id || vr.numeroReporte || `${ficha}-${vr.fechaCreacion || ''}`;
          const noReportData = {
            numeroReporte: vr.numeroReporte || 'N/A',
            fechaInicio: vr.fechaInicio || vr.fechaCreacion || vr.timestamp || '',
            fechaFin: vr.fechaFinal || '',
            tipoIntervencion: vr.tipoIntervencion || 'Vehículo Registrado',
            region: vr.region || '',
            provincia: vr.provincia || '',
            distrito: vr.distrito || '',
            municipio: vr.municipio || '',
            sector: vr.sector || vr.zona || ''
          };

          if (!existing) {
            vehiculosMap[key] = {
              id: `${key}-${reportId}`,
              ficha,
              tipo: vr.tipoVehiculoActual || vr.tipoVehiculo || 'Sin tipo',
              modelo: vr.modeloVehiculoActual || vr.modeloVehiculo || 'Sin modelo',
              latitud: coords.lat,
              longitud: coords.lng,
              actividad: noReportData.tipoIntervencion,
              reportes: [noReportData]
            };
          } else {
            existing.reportes.push(noReportData);

            const newEnd = toDate(noReportData.fechaFin || noReportData.fechaInicio);
            const existingEnd = toDate(existing.reportes[existing.reportes.length - 1]?.fechaFin || existing.reportes[existing.reportes.length - 1]?.fechaInicio);
            if (newEnd && (!existingEnd || newEnd.getTime() > existingEnd.getTime())) {
              existing.latitud = coords.lat;
              existing.longitud = coords.lng;
              existing.actividad = noReportData.tipoIntervencion;
            }
          }
        });

        setReportesConVehiculos(reportesVehiculos);
        setVehiculosMarkers(Object.values(vehiculosMap));
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

  // Suscripción a ubicaciones en tiempo real para el modo operadores
  useEffect(() => {
    if (mapViewMode !== 'operadores') {
      return;
    }

    console.log('🌍 Suscribiéndose a ubicaciones en vivo desde CORE-APK...');
    
    const unsubscribe = userLocationService.subscribeToLiveLocations(async (locations) => {
      console.log('📍 Ubicaciones en vivo recibidas:', locations.length);
      
      if (locations.length === 0) {
        setOperadoresMarkers([]);
        return;
      }

      try {
        // Obtener todos los reportes para complementar la información de los operadores
        const reports = await firebaseReportStorage.getAllReports();
        
        // Filtrar reportes para usuarios técnicos si es necesario
        let filteredReports = reports;
        if (user?.role === 'Técnico' || user?.role === 'tecnico') {
          filteredReports = reports.filter(report => report.usuarioId === user.username);
        }

        // Crear mapa de operadores con ubicaciones en tiempo real
        const operadoresMap: Record<string, OperadorMarker> = {};

        locations.forEach(location => {
          const username = location.username;
          
          // Buscar reportes del usuario para obtener más información
          const userReports = filteredReports.filter(
            report => report.creadoPor === username || report.usuarioId === username
          );

          // Encontrar la última actividad
          const ultimaActividad = userReports.length > 0 
            ? userReports[userReports.length - 1].tipoIntervencion 
            : undefined;

          // Crear lista de reportes cercanos (últimos 10)
          const reportesCercanos = userReports
            .slice(-10)
            .reverse()
            .map(report => ({
              numeroReporte: report.numeroReporte,
              tipoIntervencion: report.tipoIntervencion,
              distancia: 0
            }));

          // Calcular estado de conexión basado en timestamp
          const locationTime = new Date(location.timestamp);
          const now = new Date();
          const diffSeconds = (now.getTime() - locationTime.getTime()) / 1000;
          
          let status: 'online' | 'recent' | 'offline';
          if (diffSeconds < 30) {
            status = 'online'; // Últimos 30 segundos
          } else if (diffSeconds < 300) {
            status = 'recent'; // Últimos 5 minutos
          } else {
            status = 'offline'; // Más de 5 minutos
          }

          operadoresMap[username] = {
            id: username,
            username: username,
            nombre: username,
            latitud: location.latitude,
            longitud: location.longitude,
            ultimaActividad,
            reportesCercanos,
            isRealTime: true,
            lastUpdate: location.timestamp,
            accuracy: location.accuracy,
            deviceId: location.deviceId,
            altitude: location.altitude,
            speed: location.speed,
            heading: location.heading,
            status: status
          };
        });

        setOperadoresMarkers(Object.values(operadoresMap));
        console.log('✅ Operadores actualizados:', Object.values(operadoresMap).length);
      } catch (error) {
        console.error('Error procesando ubicaciones en tiempo real:', error);
      }
    });

    // Cleanup: desuscribirse al desmontar o cambiar de modo
    return () => {
      console.log('🌍 Desuscribiéndose de ubicaciones en tiempo real');
      unsubscribe();
    };
  }, [mapViewMode, user, refreshTimestamp]);

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

  const handleVehicleModal = (vehiculo: VehiculoMarker) => {
    setSelectedVehicle(vehiculo);
    setShowVehicleModal(true);

    const reports = [...vehiculo.reportes];
    reports.sort((a, b) => {
      const aDate = toDate(a.fechaInicio) || new Date(0);
      const bDate = toDate(b.fechaInicio) || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    setSelectedVehicleHistory(reports);

    const now = new Date();
    const currentMatch = reports.find(rep => {
      const start = toDate(rep.fechaInicio);
      const end = toDate(rep.fechaFin) || now;
      if (!start) return false;
      return start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
    });
    setSelectedVehicleCurrent(currentMatch || null);
  };

  const closeVehicleModal = () => {
    setShowVehicleModal(false);
    setSelectedVehicle(null);
    setSelectedVehicleHistory([]);
    setSelectedVehicleCurrent(null);
  };

  const openVehicleHistory = async (vehiculo: {tipo: string; modelo: string; ficha: string}) => {
    setSelectedVehicle(vehiculo);
    setShowVehicleHistoryModal(true);

    try {
      const allReports = await firebaseReportStorage.getAllReports();
      const filteredReports = allReports
        .filter(report => report.vehiculos && Array.isArray(report.vehiculos) && report.vehiculos.some((v: any) => v.ficha === vehiculo.ficha))
        .map((report: any) => {
          const start = report.fechaInicio || report.fechaProyecto || report.fechaCreacion || report.timestamp || '';
          const location = `${report.region || ''} / ${report.provincia || ''} / ${report.distrito || ''} / ${report.municipio || ''} / ${report.sector || ''}`;

          return {
            numeroReporte: report.numeroReporte,
            tipoIntervencion: report.tipoIntervencion,
            usuario: report.creadoPor || report.usuarioId || 'Desconocido',
            region: report.region || '',
            provincia: report.provincia || '',
            distrito: report.distrito || '',
            municipio: report.municipio || '',
            sector: report.sector || '',
            fechaInicio: start,
            fechaFinOriginal: report.fechaFinal || '',
            estadoOriginal: report.estado || '',
            direccion: location
          };
        });

      const sortedByStart = filteredReports.sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
      const computedHistory = sortedByStart.map((item: any, index: number) => {
        const nextItem = sortedByStart[index + 1];
        const fechaFin = nextItem ? new Date(nextItem.fechaInicio).toLocaleDateString('es-ES') : 'Actualidad';
        const estado = nextItem ? 'Finalizado' : 'Actualidad';

        return {
          ...item,
          fechaFin,
          estado,
          fechaInicio: item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString('es-ES') : 'N/A'
        };
      });

      const formatVehicleDate = (value: string) => {
        if (!value || value.trim() === '') return 'N/A';
        if (value === 'Actualidad') return 'Actualidad';

        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-ES');
        }
        return value;
      };


      // Mostrar más reciente primero
      computedHistory.sort((a: any, b: any) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
      setVehicleHistory(computedHistory);
    } catch (error) {
      console.error('Error cargando historial de vehículo:', error);
      setVehicleHistory([]);
    }
  };

  const closeVehicleHistory = () => {
    setShowVehicleHistoryModal(false);
    setSelectedVehicle(null);
    setVehicleHistory([]);
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
    if (fecha === 'Actualidad') return 'Actualidad';

    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return fecha;
    }

    return parsed.toLocaleDateString('es-ES', {
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
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type='button'
                    onClick={handleRefreshClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#FF7700',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title='Actualizar Vehículos (ciclo provincia/municipio/distrito)'
                  >
                    🔄
                  </button>
                  <span style={{ color: '#FF7700', fontWeight: 'bold' }}>✓</span>
                </span>
              )}
            </button>

            {/* Filtro de búsqueda por ficha - Solo visible en modo Vehículos */}
            {mapViewMode === 'vehiculos' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  onClick={() => setVehiculosMode('grupos')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: vehiculosMode === 'grupos' ? '2px solid #FF7700' : '1px solid #e9ecef',
                    backgroundColor: vehiculosMode === 'grupos' ? '#FFF3E6' : '#f8f9fa',
                    cursor: 'pointer',
                    fontWeight: vehiculosMode === 'grupos' ? '700' : '500'
                  }}
                >
                  Grupos
                </button>
                <button
                  onClick={() => setVehiculosMode('solo')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: vehiculosMode === 'solo' ? '2px solid #FF7700' : '1px solid #e9ecef',
                    backgroundColor: vehiculosMode === 'solo' ? '#FFF3E6' : '#f8f9fa',
                    cursor: 'pointer',
                    fontWeight: vehiculosMode === 'solo' ? '700' : '500'
                  }}
                >
                  Solo
                </button>
              </div>
            )}

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
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type='button'
                    onClick={handleRefreshClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#4CAF50',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title='Actualizar Actividades (ciclo provincia/municipio/distrito)'
                  >
                    🔄
                  </button>
                  <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓</span>
                </span>
              )}
            </button>

            {/* Opción Operadores - Solo visible para administradores */}
            {user?.role === UserRole.ADMIN && (
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: mapViewMode === 'operadores' ? '#2196F3' : '#2c3e50', fontSize: '14px' }}>
                  Operadores
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>{operadoresMarkers.length} técnicos</span>
                  {operadoresMarkers.filter(op => op.status === 'online').length > 0 && (
                    <span style={{ color: '#2ecc71' }}>
                      🟢 {operadoresMarkers.filter(op => op.status === 'online').length} en línea
                    </span>
                  )}
                </div>
              </div>
              {mapViewMode === 'operadores' && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type='button'
                    onClick={handleRefreshClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#2196F3',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title='Actualizar Operadores (ciclo provincia/municipio/distrito)'
                  >
                    🔄
                  </button>
                  <span style={{ color: '#2196F3', fontWeight: 'bold' }}>✓</span>
                </span>
              )}
            </button>
            )}
          </div>

          {/* Información de la vista actual */}
          {(mapViewMode !== 'operadores' || operadoresMarkers.length > 0) && (
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
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#2c3e50' }}>
                        📍 Modo de ubicación: <strong>{locationMode}</strong>
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
                    <>
                      <p style={{ margin: 0 }}>
                        <strong>⛏️ Actividades:</strong> Muestra las intervenciones registradas. 
                        Haz clic en un icono para ver el detalle del reporte.
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#2c3e50' }}>
                        📍 Modo de ubicación: <strong>{locationMode}</strong>
                      </p>
                    </>
                  )}
                  {mapViewMode === 'operadores' && (
                    <>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#2c3e50' }}>
                        📍 Modo de ubicación: <strong>{locationMode}</strong>
                      </p>
                      {operadoresMarkers.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginTop: '8px' }}>
                          {operadoresMarkers.filter(op => op.status === 'online').length > 0 && (
                        <span style={{ color: '#2ecc71', fontWeight: '600' }}>
                          🟢 {operadoresMarkers.filter(op => op.status === 'online').length} En línea
                        </span>
                      )}
                      {operadoresMarkers.filter(op => op.status === 'recent').length > 0 && (
                        <span style={{ color: '#f39c12', fontWeight: '600' }}>
                          🟡 {operadoresMarkers.filter(op => op.status === 'recent').length} Activo
                        </span>
                      )}
                      {operadoresMarkers.filter(op => op.status === 'offline').length > 0 && (
                        <span style={{ color: '#95a5a6', fontWeight: '600' }}>
                          ⚫ {operadoresMarkers.filter(op => op.status === 'offline').length} Desconectado
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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
            
            {/* Marcadores de VEHÍCULOS */}
            {mapViewMode === 'vehiculos' && vehiculosMode === 'grupos' && reportesConVehiculos
              .filter(reporte => {
                if (!busquedaFicha.trim()) return true;
                return reporte.vehiculos.some(v => v.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()));
              })
              .map((reporte) => (
              <Marker 
                key={`grupo-${reporte.id}`} 
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
                          <div 
                            key={idx} 
                            onClick={() => openVehicleHistory(vehiculo)}
                            style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px',
                              marginBottom: idx < reporte.vehiculos.length - 1 ? '6px' : 0,
                              backgroundColor: busquedaFicha && vehiculo.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()) 
                                ? '#FFF3E6' : '#fff',
                              borderRadius: '6px',
                              border: busquedaFicha && vehiculo.ficha.toLowerCase().includes(busquedaFicha.toLowerCase()) 
                                ? '2px solid #FF7700' : '1px solid #e9ecef',
                              cursor: 'pointer'
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

            {mapViewMode === 'vehiculos' && vehiculosMode === 'solo' && vehiculosMarkers
              .filter(vehiculo => {
                if (!busquedaFicha.trim()) return true;
                return vehiculo.ficha.toLowerCase().includes(busquedaFicha.toLowerCase());
              })
              .map((vehiculo) => (
              <Marker
                key={`solo-${vehiculo.id}`}
                position={[vehiculo.latitud, vehiculo.longitud]}
                icon={createVehiculoIcon()}
              >
                <Popup closeOnClick={false}>
                  <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '260px', maxWidth: '320px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #FF7700 0%, #FF9944 100%)',
                      color: 'white',
                      padding: '12px',
                      margin: '-13px -20px 12px -20px',
                      borderRadius: '8px 8px 0 0'
                    }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>
                        🚜 {vehiculo.tipo} {vehiculo.modelo}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.9 }}>
                        Ficha: {vehiculo.ficha}
                      </p>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <p style={{ margin: '0 0 8px' }}><strong>Intervenciones:</strong> {vehiculo.reportes.length}</p>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px' }}>
                        {vehiculo.reportes.map((rep, idx) => (
                          <div key={idx} style={{ marginBottom: '6px', borderBottom: '1px solid #e9ecef', paddingBottom: '4px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700' }}>{rep.numeroReporte}</div>
                            <div style={{ fontSize: '11px' }}>{rep.tipoIntervencion}</div>
                            <div style={{ fontSize: '10px', color: '#555' }}>{rep.fechaInicio} → {rep.fechaFin || 'Actualidad'}</div>
                            <div style={{ fontSize: '10px', color: '#555' }}>{rep.municipio}, {rep.provincia}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); handleVehicleModal(vehiculo); }}
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
                        Ver información completa
                      </button>
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
                  <div style={{ fontFamily: 'Arial, sans-serif', minWidth: '280px', maxWidth: '320px' }}>
                    <div style={{ 
                      background: operador.status === 'online' 
                        ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' 
                        : operador.status === 'recent'
                        ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
                        : 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)', 
                      color: 'white', 
                      padding: '12px', 
                      margin: '-13px -20px 12px -20px',
                      borderRadius: '8px 8px 0 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', flex: 1 }}>
                          👷 {operador.nombre}
                        </h3>
                        {operador.status === 'online' && (
                          <span style={{ 
                            fontSize: '10px', 
                            background: 'rgba(255,255,255,0.3)', 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            fontWeight: 'bold'
                          }}>
                            🟢 EN LÍNEA
                          </span>
                        )}
                        {operador.status === 'recent' && (
                          <span style={{ 
                            fontSize: '10px', 
                            background: 'rgba(255,255,255,0.3)', 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            fontWeight: 'bold'
                          }}>
                            🟡 ACTIVO
                          </span>
                        )}
                        {operador.status === 'offline' && (
                          <span style={{ 
                            fontSize: '10px', 
                            background: 'rgba(255,255,255,0.3)', 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            fontWeight: 'bold'
                          }}>
                            🔴 DESCONECTADO
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
                        Técnico de Campo - CORE-APK
                      </p>
                    </div>
                    
                    <div style={{ fontSize: '13px' }}>
                      {/* Información GPS en Tiempo Real */}
                      {operador.isRealTime && operador.lastUpdate && (
                        <div style={{ 
                          background: operador.status === 'online' ? '#e8f8f5' : '#fef5e7', 
                          padding: '10px', 
                          borderRadius: '6px', 
                          marginBottom: '10px',
                          border: `1px solid ${operador.status === 'online' ? '#2ecc71' : '#f39c12'}`
                        }}>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '600', color: operador.status === 'online' ? '#27ae60' : '#e67e22' }}>
                            🌍 UBICACIÓN GPS EN TIEMPO REAL
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#555' }}>
                            <strong>📅 Última actualización:</strong><br/>
                            {new Date(operador.lastUpdate).toLocaleString('es-DO')}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                            {operador.accuracy !== undefined && (
                              <div style={{ fontSize: '10px', color: '#666' }}>
                                <strong>🎯 Precisión:</strong><br/>
                                ±{Math.round(operador.accuracy)}m
                              </div>
                            )}
                            {operador.altitude !== undefined && (
                              <div style={{ fontSize: '10px', color: '#666' }}>
                                <strong>⛰️ Altitud:</strong><br/>
                                {Math.round(operador.altitude)}m
                              </div>
                            )}
                            {operador.speed !== undefined && operador.speed > 0 && (
                              <div style={{ fontSize: '10px', color: '#666' }}>
                                <strong>🚗 Velocidad:</strong><br/>
                                {(operador.speed * 3.6).toFixed(1)} km/h
                              </div>
                            )}
                            {operador.heading !== undefined && (
                              <div style={{ fontSize: '10px', color: '#666' }}>
                                <strong>🧭 Dirección:</strong><br/>
                                {Math.round(operador.heading)}°
                              </div>
                            )}
                          </div>
                          {operador.deviceId && (
                            <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#999' }}>
                              📱 ID: {operador.deviceId.substring(0, 20)}...
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Coordenadas */}
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#555' }}>
                        <strong>📍 Coordenadas:</strong><br/>
                        Lat: {operador.latitud.toFixed(6)}<br/>
                        Lng: {operador.longitud.toFixed(6)}
                      </p>
                      
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
                        {operador.reportesCercanos.length === 0 && (
                          <p style={{ margin: '0', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                            Sin reportes recientes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {showVehicleHistoryModal && selectedVehicle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            borderRadius: '12px',
            overflowY: 'auto',
            padding: '20px',
            position: 'relative'
          }}>
            <button onClick={closeVehicleHistory} style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer'
            }}>✕</button>
            <h2 style={{ marginTop: 0 }}>Historial de Vehículo</h2>
            <p><strong>Ficha:</strong> {selectedVehicle.ficha}</p>
            <p><strong>Tipo:</strong> {selectedVehicle.tipo} <strong>Modelo:</strong> {selectedVehicle.modelo}</p>

            {vehicleHistory.length === 0 ? (
              <p>No se encontró historial de intervenciones para este vehículo.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {vehicleHistory.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>#{item.numeroReporte || 'N/A'} - {item.tipoIntervencion || 'N/A'}</div>
                    <div>📅 Inicio: {item.fechaInicio || 'N/A'} | Fin: {item.fechaFin || 'N/A'}</div>
                    <div>🟢 Estado: {item.estado || 'Desconocido'}</div>
                    <div>📍 Ubicación: {item.direccion}</div>
                    <div>👤 Registrado por: {item.usuario || 'Desconocido'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showVehicleModal && selectedVehicle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: 'white',
            width: '90%',
            maxWidth: '760px',
            maxHeight: '85vh',
            borderRadius: '12px',
            overflowY: 'auto',
            padding: '20px',
            position: 'relative'
          }}>
            <button onClick={closeVehicleModal} style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer'
            }}>✕</button>
            <h2 style={{ marginTop: 0 }}>Detalle del Vehículo</h2>
            <p><strong>Ficha:</strong> {selectedVehicle.ficha}</p>
            <p><strong>Tipo:</strong> {selectedVehicle.tipo} <strong>Modelo:</strong> {selectedVehicle.modelo}</p>
            <p><strong>Posición actual estimada:</strong> {typeof selectedVehicle?.latitud === 'number' ? selectedVehicle.latitud.toFixed(6) : 'N/A'}, {typeof selectedVehicle?.longitud === 'number' ? selectedVehicle.longitud.toFixed(6) : 'N/A'}</p>

            {selectedVehicleCurrent ? (              <div style={{ marginBottom: '12px', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px', padding: '10px'}}>
                <strong>Actualmente activo en:</strong>
                <div>{selectedVehicleCurrent.numeroReporte || 'N/A'}</div>
                <div>{selectedVehicleCurrent.tipoIntervencion}</div>
                <div>{selectedVehicleCurrent.fechaInicio} → {selectedVehicleCurrent.fechaFin || 'Actualidad'}</div>
                <div>{selectedVehicleCurrent.municipio || ''}, {selectedVehicleCurrent.provincia || ''}</div>
              </div>
            ) : (
              <div style={{ marginBottom: '12px', color: '#777' }}>No se encontró coincidencia actual de ubicación y fecha.</div>
            )}

            <h3>Historial de obras</h3>
            {selectedVehicleHistory.length === 0 ? (
              <p>No hay historial disponible.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {selectedVehicleHistory.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: '700' }}>{item.numeroReporte}</div>
                    <div style={{ fontSize: '12px' }}>{item.tipoIntervencion}</div>
                    <div style={{ fontSize: '11px' }}><strong>Fecha:</strong> {item.fechaInicio} - {item.fechaFin || 'Actualidad'}</div>
                    <div style={{ fontSize: '11px' }}><strong>Lugar:</strong> {item.municipio || item.provincia || 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
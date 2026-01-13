export interface Report {
  id: string;
  numeroReporte: string;
  timestamp: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  creadoPor: string;
  usuarioId: string;
  modificadoPor?: string;
  
  // Ubicación
  region: string;
  provincia: string;
  municipio: string;
  distrito: string;
  sector: string;
  
  // Intervención
  tipoIntervencion: string;
  subTipoCanal?: string;
  observaciones?: string;
  
  // Datos dinámicos
  metricData?: Record<string, string>;
  gpsData?: Record<string, { lat: number; lon: number }>;
  
  // Multimedia
  images?: string[];
  videos?: string[];
  documentos?: string[];
  
  // Estado
  estado: 'completado' | 'pendiente' | 'borrador';
}

export interface PendingReport {
  id: string;
  timestamp: string;
  lastModified: string;
  userId: string;
  userName: string;
  formData: {
    region?: string;
    provincia?: string;
    distrito?: string;
    municipio?: string;
    sector?: string;
    sectorPersonalizado?: string;
    mostrarSectorPersonalizado?: boolean;
    distritoPersonalizado?: string;
    mostrarDistritoPersonalizado?: boolean;
    fechaReporte?: string;
    tipoIntervencion?: string;
    subTipoCanal?: string;
    metricData?: Record<string, string>;
    observaciones?: string;
  };
  progress?: number;
  fieldsCompleted?: string[];
}

export interface ReportFilters {
  provincia?: string;
  municipio?: string;
  tipoIntervencion?: string;
  creadoPor?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportStats {
  total: number;
  porProvincia: Record<string, number>;
  porMunicipio: Record<string, number>;
  porTipoIntervencion: Record<string, number>;
}

/**
 * ReportStorage - Sistema de almacenamiento estructurado para reportes
 * Proporciona una capa de abstracción sobre localStorage con estructura de base de datos
 */

export interface ReportData {
  id: string;
  numeroReporte: string;
  timestamp: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  
  // Datos del usuario
  creadoPor: string;
  modificadoPor?: string;
  usuarioId: string;
  
  // Datos geográficos
  region: string;
  provincia: string;
  municipio: string;
  distrito: string;
  sector: string;
  
  // Datos de intervención
  tipoIntervencion: string;
  subTipoCanal?: string;
  observaciones?: string;
  
  // Datos métricos (dinámicos según tipo de intervención)
  metricData: Record<string, string>;
  
  // Datos GPS
  gpsData?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
    [key: string]: any;
  };
  
  // Multimedia
  images?: string[];
  videos?: string[];
  documentos?: string[];
  
  // Estado del reporte
  estado: 'completado' | 'pendiente' | 'borrador' | 'en_revision' | 'aprobado' | 'rechazado';
  
  // Metadata
  version: number;
  etiquetas?: string[];
  categorias?: string[];
}

export interface ReportIndex {
  id: string;
  numeroReporte: string;
  timestamp: string;
  creadoPor: string;
  region: string;
  provincia: string;
  municipio: string;
  tipoIntervencion: string;
  estado: string;
}

class ReportStorage {
  private readonly STORAGE_KEY = 'mopc_reports_db';
  private readonly INDEX_KEY = 'mopc_reports_index';
  private readonly METADATA_KEY = 'mopc_reports_metadata';
  private readonly VERSION = 1;

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Inicializar la base de datos si no existe
   */
  private initializeDatabase(): void {
    try {
      const metadata = this.getMetadata();
      if (!metadata) {
        this.setMetadata({
          version: this.VERSION,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalReports: 0,
          lastReportNumber: 0
        });
      }

      // Migrar datos antiguos si existen
      this.migrateOldData();
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
    }
  }

  /**
   * Migrar datos del formato antiguo al nuevo
   */
  private migrateOldData(): void {
    try {
      const oldData = localStorage.getItem('mopc_intervenciones');
      if (oldData) {
        const oldReports = JSON.parse(oldData);
        if (Array.isArray(oldReports) && oldReports.length > 0) {
          console.log(`Migrando ${oldReports.length} reportes del formato antiguo...`);
          
          oldReports.forEach((oldReport: any) => {
            const newReport: ReportData = {
              id: oldReport.id?.toString() || `migrated_${Date.now()}_${Math.random()}`,
              numeroReporte: `DCR-${oldReport.id || Date.now()}`,
              timestamp: oldReport.timestamp || new Date().toISOString(),
              fechaCreacion: oldReport.timestamp || new Date().toISOString(),
              creadoPor: oldReport.usuario || 'Sistema',
              usuarioId: oldReport.usuario || 'sistema',
              region: oldReport.region || '',
              provincia: oldReport.provincia || '',
              municipio: oldReport.municipio || '',
              distrito: oldReport.distrito || '',
              sector: oldReport.sector || '',
              tipoIntervencion: oldReport.tipoIntervencion || '',
              subTipoCanal: oldReport.subTipoCanal,
              observaciones: oldReport.observaciones,
              metricData: { ...oldReport },
              estado: 'completado',
              version: 1
            };
            
            this.saveReport(newReport);
          });
          
          // Guardar copia de seguridad
          localStorage.setItem('mopc_intervenciones_backup', oldData);
          console.log('Migración completada. Backup guardado.');
        }
      }
    } catch (error) {
      console.error('Error al migrar datos antiguos:', error);
    }
  }

  /**
   * Encriptar número de reporte para usar como ID
   * Usa una codificación simple Base64 con transformación adicional
   */
  private encryptReportNumber(reportNumber: string): string {
    // Convertir a Base64 y agregar prefijo para identificación
    const base64 = btoa(reportNumber);
    // Transformar para hacerlo único y no obvio
    const encrypted = 'MOPC_' + base64.split('').reverse().join('').replace(/=/g, '_');
    return encrypted;
  }

  /**
   * Desencriptar ID para obtener número de reporte
   */
  private decryptReportId(encryptedId: string): string {
    try {
      // Remover prefijo y revertir transformación
      const base64 = encryptedId.replace('MOPC_', '').replace(/_/g, '=').split('').reverse().join('');
      return atob(base64);
    } catch {
      return '';
    }
  }

  /**
   * Generar número de reporte único y su ID encriptado
   */
  private generateReportNumber(): { reportNumber: string; encryptedId: string } {
    const metadata = this.getMetadata();
    const nextNumber = (metadata?.lastReportNumber || 0) + 1;
    const year = new Date().getFullYear();
    const reportNumber = `DCR-${year}-${String(nextNumber).padStart(6, '0')}`;
    
    this.updateMetadata({ lastReportNumber: nextNumber });
    
    return {
      reportNumber,
      encryptedId: this.encryptReportNumber(reportNumber)
    };
  }

  /**
   * Guardar o actualizar un reporte
   */
  saveReport(report: Partial<ReportData>): ReportData {
    try {
      const reports = this.getAllReportsRaw();
      const index = this.getIndex();
      const now = new Date().toISOString();

      // Si es nuevo reporte
      if (!report.id) {
        // Generar número de reporte y su ID encriptado
        const { reportNumber, encryptedId } = this.generateReportNumber();
        
        const newReport: ReportData = {
          id: encryptedId, // Usar ID encriptado del número de reporte
          numeroReporte: reportNumber,
          timestamp: now,
          fechaCreacion: now,
          creadoPor: report.creadoPor || 'Sistema',
          usuarioId: report.usuarioId || report.creadoPor || 'sistema',
          region: report.region || '',
          provincia: report.provincia || '',
          municipio: report.municipio || '',
          distrito: report.distrito || '',
          sector: report.sector || '',
          tipoIntervencion: report.tipoIntervencion || '',
          subTipoCanal: report.subTipoCanal,
          observaciones: report.observaciones,
          metricData: report.metricData || {},
          gpsData: report.gpsData,
          images: report.images,
          videos: report.videos,
          documentos: report.documentos,
          estado: report.estado || 'completado',
          version: 1,
          etiquetas: report.etiquetas,
          categorias: report.categorias
        };

        reports[newReport.id] = newReport;
        
        // Actualizar índice
        index.push({
          id: newReport.id,
          numeroReporte: newReport.numeroReporte,
          timestamp: newReport.timestamp,
          creadoPor: newReport.creadoPor,
          region: newReport.region,
          provincia: newReport.provincia,
          municipio: newReport.municipio,
          tipoIntervencion: newReport.tipoIntervencion,
          estado: newReport.estado
        });

        this.saveToStorage(reports);
        this.saveIndex(index);
        this.updateMetadata({ 
          totalReports: Object.keys(reports).length,
          lastModified: now 
        });

        return newReport;
      } else {
        // Actualizar reporte existente
        const existingReport = reports[report.id];
        if (!existingReport) {
          throw new Error(`Reporte con ID ${report.id} no encontrado`);
        }

        const updatedReport: ReportData = {
          ...existingReport,
          ...report,
          id: existingReport.id,
          numeroReporte: existingReport.numeroReporte,
          fechaCreacion: existingReport.fechaCreacion,
          fechaModificacion: now,
          modificadoPor: report.modificadoPor || report.creadoPor,
          version: existingReport.version + 1
        };

        reports[updatedReport.id] = updatedReport;

        // Actualizar índice
        const indexItem = index.find(i => i.id === updatedReport.id);
        if (indexItem) {
          Object.assign(indexItem, {
            numeroReporte: updatedReport.numeroReporte,
            timestamp: updatedReport.timestamp,
            creadoPor: updatedReport.creadoPor,
            region: updatedReport.region,
            provincia: updatedReport.provincia,
            municipio: updatedReport.municipio,
            tipoIntervencion: updatedReport.tipoIntervencion,
            estado: updatedReport.estado
          });
        }

        this.saveToStorage(reports);
        this.saveIndex(index);
        this.updateMetadata({ lastModified: now });

        return updatedReport;
      }
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los reportes (estructura completa)
   */
  private getAllReportsRaw(): Record<string, ReportData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error al obtener reportes:', error);
      return {};
    }
  }

  /**
   * Obtener todos los reportes como array
   */
  getAllReports(): ReportData[] {
    const reports = this.getAllReportsRaw();
    return Object.values(reports).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Obtener reporte por ID
   */
  getReportById(id: string): ReportData | null {
    const reports = this.getAllReportsRaw();
    return reports[id] || null;
  }

  /**
   * Obtener reporte por número de reporte
   * Optimizado: busca directamente usando el ID encriptado del número
   */
  getReportByNumber(numeroReporte: string): ReportData | null {
    try {
      // Primero intentar búsqueda directa por ID encriptado (más rápido)
      const encryptedId = this.encryptReportNumber(numeroReporte);
      const reports = this.getAllReportsRaw();
      
      if (reports[encryptedId]) {
        return reports[encryptedId];
      }
      
      // Si no se encuentra, buscar linealmente (para compatibilidad con datos antiguos)
      const allReports = Object.values(reports);
      return allReports.find(r => r.numeroReporte === numeroReporte) || null;
    } catch (error) {
      console.error('Error al buscar reporte por número:', error);
      return null;
    }
  }

  /**
   * Buscar reportes con filtros
   */
  searchReports(filters: {
    region?: string;
    provincia?: string;
    municipio?: string;
    distrito?: string;
    tipoIntervencion?: string;
    creadoPor?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    query?: string;
  }): ReportData[] {
    let reports = this.getAllReports();

    if (filters.region) {
      reports = reports.filter(r => r.region === filters.region);
    }
    if (filters.provincia) {
      reports = reports.filter(r => r.provincia === filters.provincia);
    }
    if (filters.municipio) {
      reports = reports.filter(r => r.municipio === filters.municipio);
    }
    if (filters.distrito) {
      reports = reports.filter(r => r.distrito === filters.distrito);
    }
    if (filters.tipoIntervencion) {
      reports = reports.filter(r => r.tipoIntervencion.includes(filters.tipoIntervencion!));
    }
    if (filters.creadoPor) {
      reports = reports.filter(r => r.creadoPor === filters.creadoPor);
    }
    if (filters.estado) {
      reports = reports.filter(r => r.estado === filters.estado);
    }
    if (filters.fechaDesde) {
      reports = reports.filter(r => r.timestamp >= filters.fechaDesde!);
    }
    if (filters.fechaHasta) {
      reports = reports.filter(r => r.timestamp <= filters.fechaHasta!);
    }
    if (filters.query) {
      const query = filters.query.toLowerCase();
      reports = reports.filter(r => 
        r.numeroReporte.toLowerCase().includes(query) ||
        r.tipoIntervencion.toLowerCase().includes(query) ||
        r.observaciones?.toLowerCase().includes(query) ||
        r.municipio.toLowerCase().includes(query) ||
        r.provincia.toLowerCase().includes(query)
      );
    }

    return reports;
  }

  /**
   * Obtener vista previa de reporte por número (optimizado para búsquedas)
   * Retorna datos básicos sin cargar todos los detalles
   */
  getReportPreviewByNumber(numeroReporte: string): Partial<ReportData> | null {
    try {
      const encryptedId = this.encryptReportNumber(numeroReporte);
      const index = this.getIndex();
      
      // Buscar en el índice primero (más rápido)
      const indexEntry = index.find(i => i.numeroReporte === numeroReporte);
      if (indexEntry) {
        return indexEntry as Partial<ReportData>;
      }
      
      // Si no está en el índice, buscar en la base completa
      const report = this.getReportByNumber(numeroReporte);
      return report ? {
        id: report.id,
        numeroReporte: report.numeroReporte,
        timestamp: report.timestamp,
        creadoPor: report.creadoPor,
        region: report.region,
        provincia: report.provincia,
        municipio: report.municipio,
        tipoIntervencion: report.tipoIntervencion,
        estado: report.estado
      } : null;
    } catch (error) {
      console.error('Error al obtener vista previa:', error);
      return null;
    }
  }

  /**
   * Eliminar reporte
   */
  deleteReport(id: string): boolean {
    try {
      const reports = this.getAllReportsRaw();
      const index = this.getIndex();

      if (!reports[id]) {
        return false;
      }

      delete reports[id];
      
      const newIndex = index.filter(i => i.id !== id);
      
      this.saveToStorage(reports);
      this.saveIndex(newIndex);
      this.updateMetadata({ 
        totalReports: Object.keys(reports).length,
        lastModified: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error al eliminar reporte:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas
   */
  getStatistics() {
    const reports = this.getAllReports();
    const metadata = this.getMetadata();

    const byRegion: Record<string, number> = {};
    const byProvincia: Record<string, number> = {};
    const byTipo: Record<string, number> = {};
    const byEstado: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    
    // Estadísticas detalladas por región
    const porRegion: Record<string, {
      total: number;
      completados: number;
      pendientes: number;
      enProgreso: number;
      totalKm: number;
    }> = {};

    reports.forEach(report => {
      byRegion[report.region] = (byRegion[report.region] || 0) + 1;
      byProvincia[report.provincia] = (byProvincia[report.provincia] || 0) + 1;
      byTipo[report.tipoIntervencion] = (byTipo[report.tipoIntervencion] || 0) + 1;
      byEstado[report.estado] = (byEstado[report.estado] || 0) + 1;
      byUser[report.creadoPor] = (byUser[report.creadoPor] || 0) + 1;
      
      // Estadísticas detalladas por región
      if (!porRegion[report.region]) {
        porRegion[report.region] = {
          total: 0,
          completados: 0,
          pendientes: 0,
          enProgreso: 0,
          totalKm: 0
        };
      }
      
      porRegion[report.region].total += 1;
      
      if (report.estado === 'completado') {
        porRegion[report.region].completados += 1;
      } else if (report.estado === 'pendiente') {
        porRegion[report.region].pendientes += 1;
      } else {
        porRegion[report.region].enProgreso += 1;
      }
    });

    return {
      total: reports.length,
      byRegion,
      byProvincia,
      byTipo,
      byEstado,
      byUser,
      porRegion,
      metadata
    };
  }

  /**
   * Obtener índice de reportes (ligero)
   */
  private getIndex(): ReportIndex[] {
    try {
      const data = localStorage.getItem(this.INDEX_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Guardar índice
   */
  private saveIndex(index: ReportIndex[]): void {
    localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
  }

  /**
   * Obtener metadata
   */
  private getMetadata(): any {
    try {
      const data = localStorage.getItem(this.METADATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Establecer metadata
   */
  private setMetadata(metadata: any): void {
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
  }

  /**
   * Actualizar metadata
   */
  private updateMetadata(updates: any): void {
    const metadata = this.getMetadata() || {};
    this.setMetadata({ ...metadata, ...updates });
  }

  /**
   * Guardar en storage
   */
  private saveToStorage(reports: Record<string, ReportData>): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
  }

  /**
   * Exportar toda la base de datos
   */
  exportDatabase(): string {
    return JSON.stringify({
      reports: this.getAllReportsRaw(),
      index: this.getIndex(),
      metadata: this.getMetadata(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Importar base de datos
   */
  importDatabase(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.reports) {
        this.saveToStorage(data.reports);
      }
      if (data.index) {
        this.saveIndex(data.index);
      }
      if (data.metadata) {
        this.setMetadata(data.metadata);
      }

      return true;
    } catch (error) {
      console.error('Error al importar base de datos:', error);
      return false;
    }
  }

  /**
   * Limpiar toda la base de datos
   */
  clearDatabase(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.INDEX_KEY);
    localStorage.removeItem(this.METADATA_KEY);
    this.initializeDatabase();
  }
}

// Instancia singleton
export const reportStorage = new ReportStorage();

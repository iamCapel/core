/**
 * ReportStorage - Sistema de almacenamiento estructurado para reportes
 * Proporciona una capa de abstracción sobre localStorage con estructura de base de datos
 */

import { generatePDFBlob, generateExcelBlob, generateWordBlob } from './documentGenerationService';

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
  
  // Datos de vehículos
  vehiculos?: Array<{
    tipo: string;
    modelo: string;
    ficha: string;
  }>;
  
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
  
  // Archivos generados automáticamente
  generatedFiles?: {
    pdf?: {
      filename: string;
      data: string; // base64
      generatedAt: string;
    };
    excel?: {
      filename: string;
      data: string; // base64
      generatedAt: string;
    };
    word?: {
      filename: string;
      data: string; // base64
      generatedAt: string;
    };
  };
  
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
   * Convertir Blob a string base64 para almacenamiento
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extraer solo la parte base64 (después de la coma)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('No se pudo convertir el blob a base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convertir string base64 a Blob para descarga
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
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
  private async migrateOldData(): Promise<void> {
    try {
      const oldData = localStorage.getItem('mopc_intervenciones');
      if (oldData) {
        const oldReports = JSON.parse(oldData);
        if (Array.isArray(oldReports) && oldReports.length > 0) {
          console.log(`Migrando ${oldReports.length} reportes del formato antiguo...`);
          
          // Migrar sin generar archivos (solo datos)
          for (const oldReport of oldReports) {
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
            
            // Guardar directamente sin generar archivos para migración
            const reports = this.getAllReportsRaw();
            reports[newReport.id] = newReport;
            this.saveToStorage(reports);
          }
          
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
   * Guardar o actualizar un reporte y generar archivos automáticamente
   */
  async saveReport(report: Partial<ReportData>): Promise<ReportData> {
    try {
      const reports = this.getAllReportsRaw();
      const index = this.getIndex();
      const now = new Date().toISOString();

      let savedReport: ReportData;

      // Si es nuevo reporte
      if (!report.id) {
        // Generar número de reporte y su ID encriptado
        const { reportNumber, encryptedId } = this.generateReportNumber();
        
        savedReport = {
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

        // Generar archivos PDF, Excel y Word automáticamente (DESACTIVADO TEMPORALMENTE)
        // La generación automática está causando errores de memoria
        // Los archivos se pueden generar bajo demanda desde la página de reportes
        try {
          console.log('⏭️ Generación automática de archivos desactivada para evitar errores de memoria');
          console.log('📄 Los archivos se pueden generar bajo demanda desde la página de reportes');
          
          // Nota: Los archivos se generarán cuando el usuario los solicite explícitamente
          savedReport.generatedFiles = undefined;
        } catch (error) {
          console.error('Error al generar archivos automáticamente:', error);
          // Continuar guardando el reporte aunque falle la generación de archivos
        }

        reports[savedReport.id] = savedReport;
        
        // Actualizar índice
        index.push({
          id: savedReport.id,
          numeroReporte: savedReport.numeroReporte,
          timestamp: savedReport.timestamp,
          creadoPor: savedReport.creadoPor,
          region: savedReport.region,
          provincia: savedReport.provincia,
          municipio: savedReport.municipio,
          tipoIntervencion: savedReport.tipoIntervencion,
          estado: savedReport.estado
        });

        this.saveToStorage(reports);
        this.saveIndex(index);
        this.updateMetadata({ 
          totalReports: Object.keys(reports).length,
          lastModified: now 
        });

        return savedReport;
      } else {
        // Actualizar reporte existente
        const existingReport = reports[report.id];
        if (!existingReport) {
          throw new Error(`Reporte con ID ${report.id} no encontrado`);
        }

        savedReport = {
          ...existingReport,
          ...report,
          id: existingReport.id,
          numeroReporte: existingReport.numeroReporte,
          fechaCreacion: existingReport.fechaCreacion,
          fechaModificacion: now,
          modificadoPor: report.modificadoPor || report.creadoPor,
          version: existingReport.version + 1
        };

        // Regenerar archivos si ha habido cambios significativos
        try {
          console.log('Regenerando archivos para el reporte actualizado:', savedReport.numeroReporte);
          
          const [pdfBlob, excelBlob, wordBlob] = await Promise.all([
            generatePDFBlob(savedReport),
            generateExcelBlob(savedReport),
            generateWordBlob(savedReport)
          ]);

          const [pdfBase64, excelBase64, wordBase64] = await Promise.all([
            this.blobToBase64(pdfBlob),
            this.blobToBase64(excelBlob),
            this.blobToBase64(wordBlob)
          ]);

          savedReport.generatedFiles = {
            pdf: {
              filename: `${savedReport.numeroReporte}_reporte.pdf`,
              data: pdfBase64,
              generatedAt: now
            },
            excel: {
              filename: `${savedReport.numeroReporte}_reporte.xlsx`,
              data: excelBase64,
              generatedAt: now
            },
            word: {
              filename: `${savedReport.numeroReporte}_reporte.docx`,
              data: wordBase64,
              generatedAt: now
            }
          };

          console.log('Archivos regenerados exitosamente');
        } catch (error) {
          console.error('Error al regenerar archivos:', error);
          // Mantener archivos anteriores si existen
          if (existingReport.generatedFiles) {
            savedReport.generatedFiles = existingReport.generatedFiles;
          }
        }

        reports[savedReport.id] = savedReport;

        // Actualizar índice
        const indexItem = index.find(i => i.id === savedReport.id);
        if (indexItem) {
          Object.assign(indexItem, {
            numeroReporte: savedReport.numeroReporte,
            timestamp: savedReport.timestamp,
            creadoPor: savedReport.creadoPor,
            region: savedReport.region,
            provincia: savedReport.provincia,
            municipio: savedReport.municipio,
            tipoIntervencion: savedReport.tipoIntervencion,
            estado: savedReport.estado
          });
        }

        this.saveToStorage(reports);
        this.saveIndex(index);
        this.updateMetadata({ lastModified: now });

        return savedReport;
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
   * Descargar archivo PDF generado de un reporte
   */
  downloadGeneratedPDF(reportId: string): void {
    const report = this.getReportById(reportId);
    if (!report || !report.generatedFiles?.pdf) {
      throw new Error('No se encontró el archivo PDF generado para este reporte');
    }

    const blob = this.base64ToBlob(report.generatedFiles.pdf.data, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.generatedFiles.pdf.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Descargar archivo Excel generado de un reporte
   */
  downloadGeneratedExcel(reportId: string): void {
    const report = this.getReportById(reportId);
    if (!report || !report.generatedFiles?.excel) {
      throw new Error('No se encontró el archivo Excel generado para este reporte');
    }

    const blob = this.base64ToBlob(
      report.generatedFiles.excel.data, 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.generatedFiles.excel.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Descargar archivo Word generado de un reporte
   */
  downloadGeneratedWord(reportId: string): void {
    const report = this.getReportById(reportId);
    if (!report || !report.generatedFiles?.word) {
      throw new Error('No se encontró el archivo Word generado para este reporte');
    }

    const blob = this.base64ToBlob(
      report.generatedFiles.word.data, 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.generatedFiles.word.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Verificar si un reporte tiene archivos generados
   */
  hasGeneratedFiles(reportId: string): boolean {
    const report = this.getReportById(reportId);
    return !!(report?.generatedFiles?.pdf && report?.generatedFiles?.excel && report?.generatedFiles?.word);
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

/**
 * PendingReportStorage - Sistema de almacenamiento temporal para reportes pendientes
 * Guarda el estado exacto del formulario para recuperarlo después
 */

export interface PendingReport {
  id: string;
  timestamp: string;
  lastModified: string;
  userId: string;
  userName: string;
  
  // Estado del formulario - todos los campos opcionales
  formData: {
    // Datos geográficos
    region?: string;
    provincia?: string;
    municipio?: string;
    distrito?: string;
    sector?: string;
    
    // Campos personalizados adicionales
    sectorPersonalizado?: string;
    mostrarSectorPersonalizado?: boolean;
    distritoPersonalizado?: string;
    mostrarDistritoPersonalizado?: boolean;
    
    // Tipo de intervención
    tipoIntervencion?: string;
    subTipoCanal?: string;
    
    // Observaciones
    observaciones?: string;
    
    // Datos métricos (dinámicos)
    metricData?: Record<string, string>;
    
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
  };
  
  // Paso actual del formulario
  currentStep?: number;
  
  // Metadata
  progress: number; // Porcentaje de completitud
  fieldsCompleted: string[]; // Lista de campos completados
}

class PendingReportStorage {
  private readonly STORAGE_KEY = 'mopc_pending_reports';
  private readonly NOTIFICATIONS_KEY = 'mopc_pending_notifications';

  /**
   * Guardar o actualizar un reporte pendiente
   */
  savePendingReport(report: PendingReport): void {
    try {
      const pendingReports = this.getAllPendingReports();
      const existingIndex = pendingReports.findIndex(r => r.id === report.id);
      
      report.lastModified = new Date().toISOString();
      
      if (existingIndex >= 0) {
        pendingReports[existingIndex] = report;
      } else {
        pendingReports.push(report);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pendingReports));
      this.updateNotifications();
      
      console.log('✅ Reporte pendiente guardado:', report.id);
    } catch (error) {
      console.error('❌ Error al guardar reporte pendiente:', error);
    }
  }

  /**
   * Obtener todos los reportes pendientes
   */
  getAllPendingReports(): PendingReport[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al obtener reportes pendientes:', error);
      return [];
    }
  }

  /**
   * Obtener un reporte pendiente específico
   */
  getPendingReport(id: string): PendingReport | null {
    try {
      const pendingReports = this.getAllPendingReports();
      return pendingReports.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Error al obtener reporte pendiente:', error);
      return null;
    }
  }

  /**
   * Obtener reportes pendientes de un usuario
   */
  getUserPendingReports(userId: string): PendingReport[] {
    try {
      const allReports = this.getAllPendingReports();
      return allReports.filter(r => r.userId === userId);
    } catch (error) {
      console.error('Error al obtener reportes del usuario:', error);
      return [];
    }
  }

  /**
   * Eliminar un reporte pendiente (cuando se completa o cancela)
   */
  deletePendingReport(id: string): void {
    try {
      const pendingReports = this.getAllPendingReports();
      const filtered = pendingReports.filter(r => r.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      this.updateNotifications();
      
      console.log('✅ Reporte pendiente eliminado:', id);
    } catch (error) {
      console.error('❌ Error al eliminar reporte pendiente:', error);
    }
  }

  /**
   * Calcular el progreso del formulario
   */
  calculateProgress(formData: PendingReport['formData']): { progress: number; fieldsCompleted: string[] } {
    const allFields = [
      'region', 'provincia', 'municipio', 'distrito', 'sector',
      'tipoIntervencion', 'subTipoCanal', 'observaciones',
      'gpsData', 'metricData'
    ];
    
    const fieldsCompleted: string[] = [];
    
    Object.keys(formData).forEach(key => {
      const value = formData[key as keyof typeof formData];
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object' && Object.keys(value).length > 0) {
          fieldsCompleted.push(key);
        } else if (typeof value !== 'object') {
          fieldsCompleted.push(key);
        }
      }
    });
    
    const progress = Math.round((fieldsCompleted.length / allFields.length) * 100);
    
    return { progress, fieldsCompleted };
  }

  /**
   * Actualizar notificaciones
   */
  private updateNotifications(): void {
    try {
      const pendingReports = this.getAllPendingReports();
      const notifications = pendingReports.map(report => ({
        id: report.id,
        type: 'pending_report',
        timestamp: report.lastModified,
        userId: report.userId,
        userName: report.userName,
        progress: report.progress,
        message: `Reporte pendiente - ${report.progress}% completado`
      }));
      
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error al actualizar notificaciones:', error);
    }
  }

  /**
   * Obtener notificaciones de reportes pendientes
   */
  getNotifications(): any[] {
    try {
      const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return [];
    }
  }

  /**
   * Obtener cantidad de reportes pendientes
   */
  getPendingCount(): number {
    return this.getAllPendingReports().length;
  }

  /**
   * Obtener cantidad de reportes pendientes de un usuario
   */
  getUserPendingCount(userId: string): number {
    return this.getUserPendingReports(userId).length;
  }

  /**
   * Limpiar reportes pendientes antiguos (más de 30 días)
   */
  cleanOldPendingReports(): void {
    try {
      const pendingReports = this.getAllPendingReports();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filtered = pendingReports.filter(report => {
        const reportDate = new Date(report.lastModified);
        return reportDate > thirtyDaysAgo;
      });
      
      if (filtered.length < pendingReports.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        this.updateNotifications();
        console.log(`🧹 Limpiados ${pendingReports.length - filtered.length} reportes antiguos`);
      }
    } catch (error) {
      console.error('Error al limpiar reportes antiguos:', error);
    }
  }
}

export const pendingReportStorage = new PendingReportStorage();

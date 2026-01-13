import { IReportRepository } from '../repositories/ReportRepository';
import { Report, PendingReport, ReportFilters, ReportStats } from '../models/Report';

/**
 * Controlador de reportes
 * Contiene toda la lógica de negocio para la gestión de reportes
 */
export class ReportController {
  constructor(private reportRepository: IReportRepository) {}

  /**
   * Crear un nuevo reporte
   */
  async createReport(reportData: Partial<Report>): Promise<{ success: boolean; report?: Report; error?: string }> {
    try {
      // Validaciones
      if (!reportData.region || !reportData.provincia || !reportData.municipio || 
          !reportData.distrito || !reportData.sector || !reportData.tipoIntervencion) {
        return { success: false, error: 'Todos los campos de ubicación e intervención son requeridos' };
      }

      if (!reportData.fechaCreacion && !reportData.timestamp) {
        return { success: false, error: 'La fecha del reporte es requerida' };
      }

      const report = await this.reportRepository.createReport(reportData);
      return { success: true, report };
    } catch (error: any) {
      console.error('Error creando reporte:', error);
      return { success: false, error: error.message || 'Error al crear reporte' };
    }
  }

  /**
   * Obtener un reporte por ID
   */
  async getReport(id: string): Promise<Report | null> {
    return await this.reportRepository.getReport(id);
  }

  /**
   * Obtener un reporte por número
   */
  async getReportByNumber(reportNumber: string): Promise<Report | null> {
    return await this.reportRepository.getReportByNumber(reportNumber);
  }

  /**
   * Obtener todos los reportes
   */
  async getAllReports(): Promise<Report[]> {
    return await this.reportRepository.getAllReports();
  }

  /**
   * Obtener reportes con filtros
   */
  async getFilteredReports(filters: ReportFilters, userRole?: string, userId?: string): Promise<Report[]> {
    // Si es técnico, solo ver sus reportes
    if (userRole === 'tecnico' && userId) {
      return await this.reportRepository.getUserReports(userId);
    }

    return await this.reportRepository.searchReports(filters);
  }

  /**
   * Obtener reportes de un usuario
   */
  async getUserReports(userId: string): Promise<Report[]> {
    return await this.reportRepository.getUserReports(userId);
  }

  /**
   * Obtener reportes por provincia
   */
  async getReportsByProvince(provincia: string): Promise<Report[]> {
    return await this.reportRepository.getReportsByProvince(provincia);
  }

  /**
   * Obtener reportes por municipio
   */
  async getReportsByMunicipality(municipio: string): Promise<Report[]> {
    return await this.reportRepository.getReportsByMunicipality(municipio);
  }

  /**
   * Obtener estadísticas de reportes
   */
  async getStatistics(): Promise<ReportStats> {
    return await this.reportRepository.getReportStats();
  }

  /**
   * Actualizar un reporte
   */
  async updateReport(id: string, updates: Partial<Report>): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportRepository.updateReport(id, updates);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al actualizar reporte' };
    }
  }

  /**
   * Eliminar un reporte
   */
  async deleteReport(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportRepository.deleteReport(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al eliminar reporte' };
    }
  }

  /**
   * Buscar reportes
   */
  async searchReports(searchTerm: string, userRole?: string, userId?: string): Promise<Report[]> {
    const allReports = userRole === 'tecnico' && userId
      ? await this.getUserReports(userId)
      : await this.getAllReports();

    const term = searchTerm.toLowerCase().trim();
    return allReports.filter(report => 
      report.numeroReporte.toLowerCase().includes(term) ||
      report.provincia.toLowerCase().includes(term) ||
      report.municipio.toLowerCase().includes(term) ||
      report.tipoIntervencion.toLowerCase().includes(term)
    );
  }
}

/**
 * Controlador de reportes pendientes
 */
export class PendingReportController {
  constructor(private reportRepository: IReportRepository) {}

  /**
   * Guardar reporte pendiente
   */
  async savePendingReport(report: PendingReport): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportRepository.savePendingReport(report);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al guardar reporte pendiente' };
    }
  }

  /**
   * Obtener reporte pendiente
   */
  async getPendingReport(id: string): Promise<PendingReport | null> {
    return await this.reportRepository.getPendingReport(id);
  }

  /**
   * Obtener todos los reportes pendientes
   */
  async getAllPendingReports(): Promise<PendingReport[]> {
    return await this.reportRepository.getAllPendingReports();
  }

  /**
   * Obtener reportes pendientes de un usuario
   */
  async getUserPendingReports(userId: string): Promise<PendingReport[]> {
    return await this.reportRepository.getUserPendingReports(userId);
  }

  /**
   * Eliminar reporte pendiente
   */
  async deletePendingReport(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportRepository.deletePendingReport(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al eliminar reporte pendiente' };
    }
  }

  /**
   * Obtener contador de reportes pendientes
   */
  async getPendingCount(): Promise<number> {
    return await this.reportRepository.getPendingCount();
  }

  /**
   * Convertir reporte pendiente a reporte completado
   */
  async completePendingReport(pendingId: string, additionalData?: Partial<Report>): Promise<{ success: boolean; report?: Report; error?: string }> {
    try {
      const pending = await this.getPendingReport(pendingId);
      if (!pending) {
        return { success: false, error: 'Reporte pendiente no encontrado' };
      }

      // Crear reporte completado con los datos del pendiente
      const reportData: Partial<Report> = {
        ...pending.formData,
        ...additionalData,
        timestamp: pending.formData.fechaReporte 
          ? new Date(pending.formData.fechaReporte).toISOString()
          : pending.timestamp,
        fechaCreacion: pending.formData.fechaReporte 
          ? new Date(pending.formData.fechaReporte).toISOString()
          : pending.timestamp,
        usuarioId: pending.userId,
        creadoPor: pending.userName,
        estado: 'completado'
      };

      const report = await this.reportRepository.createReport(reportData);
      
      // Eliminar el reporte pendiente
      await this.deletePendingReport(pendingId);

      return { success: true, report };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al completar reporte pendiente' };
    }
  }
}

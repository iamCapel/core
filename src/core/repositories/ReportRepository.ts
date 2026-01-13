import { Report, PendingReport, ReportFilters, ReportStats } from '../models/Report';

/**
 * Interfaz abstracta para el repositorio de reportes
 * Puede ser implementada por Firebase, API REST, o cualquier otro backend
 */
export interface IReportRepository {
  // CRUD de reportes
  createReport(report: Partial<Report>): Promise<Report>;
  getReport(id: string): Promise<Report | null>;
  getReportByNumber(reportNumber: string): Promise<Report | null>;
  getAllReports(): Promise<Report[]>;
  updateReport(id: string, updates: Partial<Report>): Promise<void>;
  deleteReport(id: string): Promise<void>;
  
  // Búsqueda y filtrado
  searchReports(filters: ReportFilters): Promise<Report[]>;
  getUserReports(userId: string): Promise<Report[]>;
  getReportsByProvince(provincia: string): Promise<Report[]>;
  getReportsByMunicipality(municipio: string): Promise<Report[]>;
  getReportsByIntervention(tipoIntervencion: string): Promise<Report[]>;
  
  // Estadísticas
  getReportStats(): Promise<ReportStats>;
  
  // Reportes pendientes
  savePendingReport(report: PendingReport): Promise<void>;
  getPendingReport(id: string): Promise<PendingReport | null>;
  getAllPendingReports(): Promise<PendingReport[]>;
  getUserPendingReports(userId: string): Promise<PendingReport[]>;
  deletePendingReport(id: string): Promise<void>;
  getPendingCount(): Promise<number>;
}

/**
 * Implementación usando los servicios existentes
 */
export class ReportRepository implements IReportRepository {
  constructor(
    private firebaseStorage: any,
    private firebasePendingStorage: any,
    private localStorageBackup: any
  ) {}

  async createReport(report: Partial<Report>): Promise<Report> {
    // Guardar primero en localStorage para generar campos
    const savedReport = await this.localStorageBackup.saveReport(report);
    // Luego sincronizar con Firebase
    await this.firebaseStorage.saveReport(savedReport);
    return savedReport;
  }

  async getReport(id: string): Promise<Report | null> {
    return await this.firebaseStorage.getReport(id);
  }

  async getReportByNumber(reportNumber: string): Promise<Report | null> {
    const allReports = await this.getAllReports();
    return allReports.find(r => r.numeroReporte === reportNumber) || null;
  }

  async getAllReports(): Promise<Report[]> {
    return await this.firebaseStorage.getAllReports();
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<void> {
    const report = await this.getReport(id);
    if (report) {
      const updatedReport = { ...report, ...updates };
      await this.firebaseStorage.saveReport(updatedReport);
    }
  }

  async deleteReport(id: string): Promise<void> {
    await this.firebaseStorage.deleteReport(id);
  }

  async searchReports(filters: ReportFilters): Promise<Report[]> {
    let reports = await this.getAllReports();

    if (filters.provincia) {
      reports = reports.filter(r => r.provincia === filters.provincia);
    }
    if (filters.municipio) {
      reports = reports.filter(r => r.municipio === filters.municipio);
    }
    if (filters.tipoIntervencion) {
      reports = reports.filter(r => r.tipoIntervencion === filters.tipoIntervencion);
    }
    if (filters.creadoPor) {
      reports = reports.filter(r => r.creadoPor === filters.creadoPor);
    }
    if (filters.startDate) {
      reports = reports.filter(r => new Date(r.timestamp) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      reports = reports.filter(r => new Date(r.timestamp) <= new Date(filters.endDate!));
    }

    return reports;
  }

  async getUserReports(userId: string): Promise<Report[]> {
    return await this.firebaseStorage.getUserReports(userId);
  }

  async getReportsByProvince(provincia: string): Promise<Report[]> {
    return await this.firebaseStorage.getReportsByProvince(provincia);
  }

  async getReportsByMunicipality(municipio: string): Promise<Report[]> {
    return await this.firebaseStorage.getReportsByMunicipality(municipio);
  }

  async getReportsByIntervention(tipoIntervencion: string): Promise<Report[]> {
    return await this.firebaseStorage.getReportsByIntervention(tipoIntervencion);
  }

  async getReportStats(): Promise<ReportStats> {
    return await this.firebaseStorage.getReportStats();
  }

  async savePendingReport(report: PendingReport): Promise<void> {
    await this.firebasePendingStorage.savePendingReport(report);
  }

  async getPendingReport(id: string): Promise<PendingReport | null> {
    return await this.firebasePendingStorage.getPendingReport(id);
  }

  async getAllPendingReports(): Promise<PendingReport[]> {
    return await this.firebasePendingStorage.getAllPendingReports();
  }

  async getUserPendingReports(userId: string): Promise<PendingReport[]> {
    return await this.firebasePendingStorage.getUserPendingReports(userId);
  }

  async deletePendingReport(id: string): Promise<void> {
    await this.firebasePendingStorage.deletePendingReport(id);
  }

  async getPendingCount(): Promise<number> {
    return await this.firebasePendingStorage.getPendingCount();
  }
}

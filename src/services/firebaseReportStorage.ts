import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where
} from "firebase/firestore";
import app from "../config/firebase";
import { ReportData } from "./reportStorage";

const db = getFirestore(app);
const REPORTS_COLLECTION = "reports";
const VEHICLES_COLLECTION = "vehiculos"; // Colección de registros de vehículos pesados (CORE-APK)
const HEAVY_VEHICLES_COLLECTION = "heavyVehicles"; // Colección de vehículos pesados del formulario web

class FirebaseReportStorage {
  /**
   * Guardar un reporte en Firestore
   */
  async saveReport(report: ReportData): Promise<void> {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, report.id);
      
      console.log('🚜 Vehículos recibidos en saveReport:', report.vehiculos);
      
      // Preparar el reporte con valores por defecto
      const reportToSave = {
        ...report,
        timestamp: report.timestamp || new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      
      console.log('🚜 Vehículos en reportToSave:', reportToSave.vehiculos);
      
      // Eliminar todos los campos undefined (Firebase no los acepta)
      const cleanReport: any = {};
      Object.keys(reportToSave).forEach(key => {
        const value = (reportToSave as any)[key];
        if (value !== undefined && value !== null) {
          // Mantener arrays vacíos también
          cleanReport[key] = value;
        }
      });
      
      console.log('🚜 Vehículos en cleanReport antes de guardar:', cleanReport.vehiculos);
      console.log('📦 Reporte completo a guardar:', JSON.stringify(cleanReport, null, 2));
      
      await setDoc(reportRef, cleanReport);
      console.log('✅ Reporte guardado en Firebase con vehículos');

      // Actualizar registros previos del mismo vehículo para que no sigan como "Actualidad"
      if (Array.isArray(cleanReport.vehiculos) && cleanReport.vehiculos.length > 0) {
        await this._closePreviousVehicleInterventions(cleanReport);
      }
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      throw error;
    }
  }

  private async _closePreviousVehicleInterventions(report: ReportData): Promise<void> {
    const currentStart = new Date(report.fechaInicio || report.fechaProyecto || report.fechaCreacion || report.timestamp || new Date().toISOString());

    const allReports = await this.getAllReports();
    const vehicleFichas = Array.from(new Set((report.vehiculos || []).map(v => v.ficha)));

    for (const ficha of vehicleFichas) {
      // Obtener reportes con este mismo vehículo (funicular en múltiplos lugares)
      const relatedReports = allReports
        .filter(r => r.id !== report.id && Array.isArray(r.vehiculos) && r.vehiculos.some(v => v.ficha === ficha));

      // Tomar el anterior más reciente antes del reporte actual
      const previous = relatedReports
        .map(r => ({
          ...r,
          _fechaInicio: new Date(r.fechaInicio || r.fechaProyecto || r.fechaCreacion || r.timestamp || new Date().toISOString())
        }))
        .filter(r => r._fechaInicio < currentStart)
        .sort((a, b) => b._fechaInicio.getTime() - a._fechaInicio.getTime())[0];

      if (previous) {
        const previousFechaFin = previous.fechaFinal ? new Date(previous.fechaFinal) : null;
        const shouldUpdate = !previousFechaFin || previousFechaFin.getTime() > currentStart.getTime();

        if (shouldUpdate) {
          await this.updateReport(previous.id, {
            fechaFinal: currentStart.toISOString(),
            estado: 'completado'
          });
        }
      }
    }
  }

  /**
   * Obtener un reporte por ID
   */
  async getReport(id: string): Promise<ReportData | null> {
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const reportSnap = await getDoc(reportRef);
    return reportSnap.exists() ? (reportSnap.data() as ReportData) : null;
  }

  /**
   * Obtener todos los reportes
   */
  async getAllReports(): Promise<ReportData[]> {
    const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as ReportData);
  }

  /**
   * Obtener todos los registros de vehículos (CORE-APK, colección vehiculos)
   */
  async getAllVehicleReports(): Promise<any[]> {
    try {
      // Obtener de la colección CORE-APK
      const snapshot1 = await getDocs(collection(db, VEHICLES_COLLECTION));
      const vehiculos1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Obtener de la colección del formulario web
      const snapshot2 = await getDocs(collection(db, HEAVY_VEHICLES_COLLECTION));
      const vehiculos2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Combinar ambas colecciones
      return [...vehiculos1, ...vehiculos2];
    } catch (error) {
      console.warn(`No se pudo leer colecciones de vehículos o están vacías`, error);
      return [];
    }
  }

  /**
   * Obtener reportes de un usuario específico
   */
  async getUserReports(userId: string): Promise<ReportData[]> {
    const q = query(
      collection(db, REPORTS_COLLECTION), 
      where("usuarioId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => doc.data() as ReportData);
    // Ordenar en el cliente en lugar de Firestore para evitar necesidad de índice
    return reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Obtener reportes por región
   */
  async getReportsByRegion(region: string): Promise<ReportData[]> {
    const q = query(
      collection(db, REPORTS_COLLECTION), 
      where("region", "==", region)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ReportData);
  }

  /**
   * Obtener reportes por provincia
   */
  async getReportsByProvincia(provincia: string): Promise<ReportData[]> {
    const q = query(
      collection(db, REPORTS_COLLECTION), 
      where("provincia", "==", provincia)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ReportData);
  }

  /**
   * Obtener reportes por estado
   */
  async getReportsByEstado(estado: string): Promise<ReportData[]> {
    const q = query(
      collection(db, REPORTS_COLLECTION), 
      where("estado", "==", estado)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ReportData);
  }

  /**
   * Obtener reportes por tipo de intervención
   */
  async getReportsByTipoIntervencion(tipo: string): Promise<ReportData[]> {
    const q = query(
      collection(db, REPORTS_COLLECTION), 
      where("tipoIntervencion", "==", tipo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ReportData);
  }

  /**
   * Eliminar un reporte
   */
  async deleteReport(id: string): Promise<void> {
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    await deleteDoc(reportRef);
  }

  /**
   * Actualizar un reporte existente
   */
  async updateReport(id: string, updates: Partial<ReportData>): Promise<void> {
    const reportRef = doc(db, REPORTS_COLLECTION, id);
    const currentReport = await this.getReport(id);
    
    if (!currentReport) {
      throw new Error(`Reporte con ID ${id} no encontrado`);
    }

    await setDoc(reportRef, {
      ...currentReport,
      ...updates,
      fechaModificacion: new Date().toISOString()
    });
  }

  /**
   * Obtener estadísticas generales
   */
  async getStatistics() {
    const allReports = await this.getAllReports();
    
    const stats = {
      total: allReports.length,
      porEstado: {} as Record<string, number>,
      porRegion: {} as Record<string, number>,
      porTipoIntervencion: {} as Record<string, number>
    };

    allReports.forEach(report => {
      // Por estado
      stats.porEstado[report.estado] = (stats.porEstado[report.estado] || 0) + 1;
      
      // Por región
      stats.porRegion[report.region] = (stats.porRegion[report.region] || 0) + 1;
      
      // Por tipo de intervención
      stats.porTipoIntervencion[report.tipoIntervencion] = 
        (stats.porTipoIntervencion[report.tipoIntervencion] || 0) + 1;
    });

    return stats;
  }
}

const firebaseReportStorage = new FirebaseReportStorage();
export default firebaseReportStorage;

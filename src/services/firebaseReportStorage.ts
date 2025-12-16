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

class FirebaseReportStorage {
  /**
   * Guardar un reporte en Firestore
   */
  async saveReport(report: ReportData): Promise<void> {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, report.id);
      
      // Limpiar campos undefined para Firebase
      const cleanReport = JSON.parse(JSON.stringify({
        ...report,
        timestamp: report.timestamp || new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      }));
      
      await setDoc(reportRef, cleanReport);
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      throw error;
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

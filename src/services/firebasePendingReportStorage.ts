import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import app from "../config/firebase";
import { PendingReport } from "./pendingReportStorage";

const db = getFirestore(app);
const PENDING_REPORTS_COLLECTION = "pendingReports";
const PENDING_NOTIFICATIONS_COLLECTION = "pendingNotifications";

class FirebasePendingReportStorage {
  async savePendingReport(report: PendingReport): Promise<void> {
    const reportRef = doc(db, PENDING_REPORTS_COLLECTION, report.id);
    report.lastModified = new Date().toISOString();
    await setDoc(reportRef, report);
    await this.updateNotifications();
  }

  async getAllPendingReports(): Promise<PendingReport[]> {
    const snapshot = await getDocs(collection(db, PENDING_REPORTS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as PendingReport);
  }

  async getPendingReport(id: string): Promise<PendingReport | null> {
    const reportRef = doc(db, PENDING_REPORTS_COLLECTION, id);
    const reportSnap = await getDoc(reportRef);
    return reportSnap.exists() ? (reportSnap.data() as PendingReport) : null;
  }

  async getUserPendingReports(userId: string): Promise<PendingReport[]> {
    const q = query(collection(db, PENDING_REPORTS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingReport);
  }

  async deletePendingReport(id: string): Promise<void> {
    const reportRef = doc(db, PENDING_REPORTS_COLLECTION, id);
    await deleteDoc(reportRef);
    await this.updateNotifications();
  }

  async updateNotifications(): Promise<void> {
    const pendingReports = await this.getAllPendingReports();
    const notifications = pendingReports.map(report => ({
      id: report.id,
      type: 'pending_report',
      timestamp: report.lastModified,
      userId: report.userId,
      userName: report.userName,
      progress: report.progress,
      message: `Reporte pendiente - ${report.progress}% completado`
    }));
    // Guardar notificaciones en Firestore
    for (const notif of notifications) {
      const notifRef = doc(collection(db, PENDING_NOTIFICATIONS_COLLECTION));
      await setDoc(notifRef, notif);
    }
  }

  async getNotifications(): Promise<any[]> {
    const snapshot = await getDocs(collection(db, PENDING_NOTIFICATIONS_COLLECTION));
    return snapshot.docs.map(doc => doc.data());
  }

  async getPendingCount(): Promise<number> {
    const snapshot = await getDocs(collection(db, PENDING_REPORTS_COLLECTION));
    return snapshot.size;
  }

  async getUserPendingCount(userId: string): Promise<number> {
    const reports = await this.getUserPendingReports(userId);
    return reports.length;
  }

  async cleanOldPendingReports(): Promise<void> {
    const pendingReports = await this.getAllPendingReports();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const report of pendingReports) {
      const reportDate = new Date(report.lastModified);
      if (reportDate <= thirtyDaysAgo) {
        await this.deletePendingReport(report.id);
      }
    }
  }
}

export const firebasePendingReportStorage = new FirebasePendingReportStorage();

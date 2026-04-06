import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import app from '../config/firebase';
import firebaseReportStorage from './firebaseReportStorage';
import { reportStorage, ReportData } from './reportStorage';

const db = getFirestore(app);
const HEAVY_VEHICLES_COLLECTION = 'heavyVehicles';

export interface HeavyVehicleRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  region: string;
  provincia: string;
  municipio: string;
  distrito: string;
  distritoPersonalizado?: string;
  fechaInicio: string;
  hastaLaFecha: boolean;
  fechaFinal?: string;
  cantidadVehiculos: number;
  tipoVehiculo: string;
  modelo?: string;
  ficha: string;
  usuarioId?: string;
  observaciones?: string;
  vehiculos?: Array<{ tipo: string; modelo?: string; ficha: string }>; // Soporte múltiple
}

class FirebaseHeavyVehiclesStorage {
  private createVehicleForReport(record: HeavyVehicleRecord) {
    return {
      tipo: record.tipoVehiculo,
      modelo: record.modelo || '',
      ficha: record.ficha,
      cantidadVehiculos: record.cantidadVehiculos,
      fechaInicio: record.fechaInicio,
      fechaFinal: record.hastaLaFecha ? (record.fechaFinal || record.fechaInicio) : (record.fechaFinal || ''),
      distrito: record.distrito || record.distritoPersonalizado || ''
    };
  }

  private async updatePreviousReportForVehicle(record: HeavyVehicleRecord): Promise<void> {
    const allReports = await firebaseReportStorage.getAllReports();
    if (!record.fechaInicio) return;

    const currentStart = new Date(record.fechaInicio);
    if (isNaN(currentStart.getTime())) return;

    let candidateReport: ReportData | null = null;
    let candidateVehicle: any = null;
    let candidateStart: Date | null = null;

    allReports.forEach(report => {
      const vehiculos = Array.isArray(report.vehiculos) ? report.vehiculos : [];
      vehiculos.forEach((v: any) => {
        if (v.ficha !== record.ficha) return;

        const vehicleStart = v.fechaInicio ? new Date(v.fechaInicio) : (report.fechaInicio ? new Date(report.fechaInicio) : null);
        if (!vehicleStart || isNaN(vehicleStart.getTime())) return;

        if (vehicleStart < currentStart) {
          if (!candidateStart || vehicleStart > candidateStart) {
            candidateReport = report;
            candidateVehicle = v;
            candidateStart = vehicleStart;
          }
        }
      });
    });

    if (!candidateReport || !candidateVehicle || !candidateStart) return;

    const previousVehicle = candidateVehicle;
    const proposedEndDate = record.fechaInicio;

    // Si el anterior no tiene fecha final o su fecha final es anterior a la fecha actual
    const previousFinal = previousVehicle.fechaFinal ? new Date(previousVehicle.fechaFinal) : null;

    if (previousFinal && !isNaN(previousFinal.getTime()) && previousFinal >= currentStart) {
      return;
    }

    const reportToUpdate: any = candidateReport;
    const updatedVehiculos = (reportToUpdate.vehiculos || []).map((v: any) =>
      v.ficha === record.ficha
        ? { ...v, fechaFinal: proposedEndDate }
        : v
    );

    try {
      await firebaseReportStorage.updateReport(reportToUpdate.id, { vehiculos: updatedVehiculos });
      await reportStorage.saveReport({
        ...reportToUpdate,
        vehiculos: updatedVehiculos,
        fechaModificacion: new Date().toISOString(),
        modificadoPor: record.usuarioId || reportToUpdate.usuarioId || 'sistema'
      });
      console.log('✅ Vehículo anterior actualizado con fechaFinal:', record.ficha, proposedEndDate);
    } catch (error) {
      console.warn('⚠️ No se pudo actualizar el reporte anterior con fechaFinal:', error);
    }
  }

  private async upsertReportForHeavyVehicle(record: HeavyVehicleRecord): Promise<void> {
    // Buscar reporte existente que coincida con ubicación y fecha de inicio
    const allReports = await firebaseReportStorage.getAllReports();
    const existingReport = allReports.find(report => 
      report.region === record.region &&
      report.provincia === record.provincia &&
      report.municipio === record.municipio &&
      (report.distrito === record.distrito || report.distrito === record.distritoPersonalizado || '') &&
      report.fechaInicio === record.fechaInicio
    );

    const vehiculo = this.createVehicleForReport(record);

    if (existingReport) {
      const existingVehiculos = Array.isArray(existingReport.vehiculos) ? existingReport.vehiculos : [];

      const duplicate = existingVehiculos.some((v: any) => v.ficha === vehiculo.ficha && v.tipo === vehiculo.tipo);
      const mergedVehiculos = duplicate ? existingVehiculos : [...existingVehiculos, vehiculo];

      if (!duplicate) {
        await firebaseReportStorage.updateReport(existingReport.id, { vehiculos: mergedVehiculos });
      }

      try {
        await reportStorage.saveReport({
          ...existingReport,
          vehiculos: mergedVehiculos,
          fechaModificacion: new Date().toISOString(),
          modificadoPor: record.usuarioId || existingReport.usuarioId || 'sistema'
        });
      } catch (e) {
        console.warn('No se pudo sincronizar reporte local, sigue siendo prioridad Firestore', e);
      }

      return;
    }

    // Si no existe reporte, creamos uno nuevo completo con estado completado
    const newReport: Partial<ReportData> = {
      region: record.region,
      provincia: record.provincia,
      municipio: record.municipio,
      distrito: record.distrito || record.distritoPersonalizado || '',
      sector: '',
      tipoIntervencion: 'Vehículos Pesados',
      observaciones: record.observaciones || 'Registro de vehículo pesado asociada',
      metricData: {},
      vehiculos: [vehiculo],
      fechaInicio: record.fechaInicio,
      fechaFinal: record.hastaLaFecha ? (record.fechaFinal || record.fechaInicio) : record.fechaFinal,
      estado: 'completado',
      creadoPor: record.usuarioId || 'sistema',
      usuarioId: record.usuarioId || 'sistema',
      version: 1
    };

    const createdReport = await reportStorage.saveReport(newReport);
    await firebaseReportStorage.saveReport(createdReport);
  }

  async saveHeavyVehicle(record: HeavyVehicleRecord): Promise<void> {
    try {
      const recordId = record.id || (crypto?.randomUUID?.() || Date.now().toString());

      const recordRef = doc(db, HEAVY_VEHICLES_COLLECTION, recordId);
      const now = new Date().toISOString();

      const toSave: any = {
        ...record,
        id: recordId,
        createdAt: record.createdAt || now,
        updatedAt: now
      };

      // Eliminar undefined
      const clean: any = {};
      Object.keys(toSave).forEach(key => {
        if (toSave[key] !== undefined && toSave[key] !== null) {
          clean[key] = toSave[key];
        }
      });

      await setDoc(recordRef, clean);
      console.log('✅ Heavy vehicle record saved', recordId);

      // Actualizar reportes previos del mismo vehículo con fecha final si se mueve a otro lugar
      await this.updatePreviousReportForVehicle(record);

      // Asociar con reportes existentes y/o crear un reporte consolidado
      await this.upsertReportForHeavyVehicle(record);
    } catch (error) {
      console.error('Error saving heavy vehicle record:', error);
      throw error;
    }
  }
}

export const firebaseHeavyVehiclesStorage = new FirebaseHeavyVehiclesStorage();

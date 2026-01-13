/**
 * EJEMPLO: Cómo usar el Core en un componente React
 * 
 * Este archivo muestra cómo refactorizar un componente
 * para usar la capa Core en lugar de llamar directamente a los servicios
 */

import React, { useState, useEffect } from 'react';
import { coreApp, User, Report } from '../index';

// ========== ANTES (Lógica mezclada con UI) ==========
/*
const Dashboard = () => {
  const [reports, setReports] = useState([]);
  
  useEffect(() => {
    // Lógica directa en el componente
    const loadReports = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user.role === 'tecnico') {
          const data = await firebaseReportStorage.getUserReports(user.username);
          setReports(data);
        } else {
          const data = await firebaseReportStorage.getAllReports();
          setReports(data);
        }
      } catch (error) {
        alert('Error cargando reportes');
      }
    };
    loadReports();
  }, []);
  
  return <div>{...}</div>;
};
*/

// ========== DESPUÉS (Usando Core) ==========

const DashboardWithCore: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      // Toda la lógica está en el controlador
      const user = coreApp.authController.getCurrentUser();
      
      if (!user) {
        setError('No hay sesión activa');
        return;
      }

      // El controlador maneja la lógica de permisos internamente
      const reportsData = await coreApp.reportController.getFilteredReports(
        {},
        user.role,
        user.username
      );

      setReports(reportsData);
    } catch (err: any) {
      setError(err.message || 'Error cargando reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (reportData: Partial<Report>) => {
    const result = await coreApp.reportController.createReport(reportData);

    if (result.success) {
      alert('Reporte creado exitosamente');
      loadReports(); // Recargar lista
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const result = await coreApp.reportController.deleteReport(reportId);

    if (result.success) {
      alert('Reporte eliminado');
      loadReports();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => handleCreateReport({/* data */})}>
        Crear Reporte
      </button>
      
      {reports.map(report => (
        <div key={report.id}>
          <h3>{report.numeroReporte}</h3>
          <p>{report.provincia} - {report.municipio}</p>
          <button onClick={() => handleDeleteReport(report.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
};

// ========== Custom Hook Reutilizable ==========

/**
 * Hook personalizado que encapsula la lógica de reportes
 * Puede ser usado en cualquier componente (web o móvil)
 */
export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = coreApp.authController.getCurrentUser();
      if (!user) throw new Error('No hay sesión activa');

      const data = await coreApp.reportController.getFilteredReports(
        {},
        user.role,
        user.username
      );

      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: Partial<Report>) => {
    setLoading(true);
    const result = await coreApp.reportController.createReport(reportData);
    setLoading(false);

    if (result.success) {
      await loadReports();
    }

    return result;
  };

  const deleteReport = async (id: string) => {
    setLoading(true);
    const result = await coreApp.reportController.deleteReport(id);
    setLoading(false);

    if (result.success) {
      await loadReports();
    }

    return result;
  };

  const searchReports = async (searchTerm: string) => {
    setLoading(true);
    const user = coreApp.authController.getCurrentUser();
    
    if (user) {
      const results = await coreApp.reportController.searchReports(
        searchTerm,
        user.role,
        user.username
      );
      setReports(results);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  return {
    reports,
    loading,
    error,
    loadReports,
    createReport,
    deleteReport,
    searchReports
  };
}

// ========== Uso del Hook ==========

const SimpleDashboard: React.FC = () => {
  const { reports, loading, error, createReport, deleteReport } = useReports();

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {reports.map(report => (
        <div key={report.id}>
          <h3>{report.numeroReporte}</h3>
          <button onClick={() => deleteReport(report.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
};

export { DashboardWithCore, SimpleDashboard };

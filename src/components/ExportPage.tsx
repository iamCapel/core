import React, { useState, useEffect } from 'react';
import PendingReportsModal from './PendingReportsModal';
import { reportStorage } from '../services/reportStorage';
import './ExportPage.css';
import { UserRole } from '../types/userRoles';

interface User {
  username: string;
  name: string;
  role?: UserRole;
}

interface ExportPageProps {
  user: User;
  onBack: () => void;
}

interface ReportData {
  reportNumber: string;
  title: string;
  date: string;
  province: string;
  status: string;
  description: string;
  createdBy: string; // Usuario que creó el reporte
}

const ExportPage: React.FC<ExportPageProps> = ({ user, onBack }) => {
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  // Estados para notificaciones
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Función para actualizar el contador de pendientes
  const updatePendingCount = () => {
    const pendientes = Object.keys(localStorage).filter(key => 
      key.startsWith('intervencion_pendiente_') || key.startsWith('borrador_intervencion')
    ).length;
    setPendingCount(pendientes);
  };

  // Función para obtener lista detallada de reportes pendientes
  const getPendingReports = () => {
    const pendingKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('intervencion_pendiente_') || key.startsWith('borrador_intervencion')
    );

    return pendingKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          id: key,
          reportNumber: key.includes('pendiente_') ? 
            `RPT-${key.split('_').pop()?.slice(-6) || '000000'}` : 
            `BRR-${Date.now().toString().slice(-6)}`,
          timestamp: data.timestamp || new Date().toISOString(),
          estado: data.estado || (key.includes('borrador') ? 'borrador' : 'pendiente'),
          region: data.region || 'N/A',
          provincia: data.provincia || 'N/A',
          municipio: data.municipio || 'N/A',
          tipoIntervencion: data.tipoIntervencion || 'No especificado'
        };
      } catch {
        return {
          id: key,
          reportNumber: `ERR-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toISOString(),
          estado: 'error',
          region: 'Error',
          provincia: 'Error',
          municipio: 'Error',
          tipoIntervencion: 'Error al cargar'
        };
      }
    });
  };

  // Función para eliminar un reporte pendiente
  const handleDeletePendingReport = (reportId: string) => {
    localStorage.removeItem(reportId);
    updatePendingCount();
    // Actualizar la vista del modal
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  // Actualizar contador al cargar y cada vez que cambie localStorage
  useEffect(() => {
    updatePendingCount();
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      updatePendingCount();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También verificar periódicamente por si hay cambios internos
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSearch = () => {
    if (!searchNumber.trim()) return;

    setLoading(true);
    setNotFound(false);
    setSearchResult(null);

    // Buscar usando reportStorage con sistema de encriptación optimizado
    setTimeout(() => {
      try {
        // Búsqueda optimizada: primero intenta por ID encriptado (O(1))
        const directMatch = reportStorage.getReportByNumber(searchNumber.trim());
        
        if (directMatch) {
          // Verificar permisos según rol
          if (user.role === UserRole.TECNICO && directMatch.usuarioId !== user.username) {
            setSearchResult(null);
            setNotFound(true);
            setLoading(false);
            return;
          }
          
          // Vista previa cargada exitosamente
          setSearchResult({
            reportNumber: directMatch.numeroReporte,
            title: directMatch.tipoIntervencion || 'Sin título',
            date: new Date(directMatch.fechaCreacion).toLocaleDateString(),
            province: directMatch.provincia || 'N/A',
            status: directMatch.estado || 'Completado',
            description: `${directMatch.tipoIntervencion || 'Intervención'} - ${directMatch.municipio || ''}, ${directMatch.provincia || ''}`,
            createdBy: directMatch.creadoPor || 'Sistema'
          });
          setNotFound(false);
          console.log('✅ Reporte encontrado por búsqueda optimizada (ID encriptado):', directMatch.numeroReporte);
        } else {
          // Búsqueda parcial en todos los reportes (fallback)
          const searchFilters = user.role === UserRole.TECNICO 
            ? { creadoPor: user.username } 
            : {};
          
          const allReports = reportStorage.searchReports(searchFilters);
          const found = allReports.find(report => 
            report.numeroReporte.toLowerCase().includes(searchNumber.toLowerCase())
          );
          
          if (found) {
            setSearchResult({
              reportNumber: found.numeroReporte,
              title: found.tipoIntervencion || 'Sin título',
              date: new Date(found.fechaCreacion).toLocaleDateString(),
              province: found.provincia || 'N/A',
              status: found.estado || 'Completado',
              description: `${found.tipoIntervencion || 'Intervención'} - ${found.municipio || ''}, ${found.provincia || ''}`,
              createdBy: found.creadoPor || 'Sistema'
            });
            setNotFound(false);
            console.log('✅ Reporte encontrado por búsqueda parcial:', found.numeroReporte);
          } else {
            setSearchResult(null);
            setNotFound(true);
            console.log('❌ Reporte no encontrado:', searchNumber);
          }
        }
      } catch (error) {
        console.error('Error en búsqueda:', error);
        setSearchResult(null);
        setNotFound(true);
      }
      setLoading(false);
    }, 800);
  };

  const handleDownloadPDF = (report: ReportData) => {
    // Simulación de descarga PDF
    const pdfContent = generatePDFContent(report);
    downloadFile(pdfContent, `${report.reportNumber}_reporte.pdf`, 'application/pdf');
  };

  const handleDownloadExcel = (report: ReportData) => {
    // Simulación de descarga Excel
    const excelContent = generateExcelContent(report);
    downloadFile(excelContent, `${report.reportNumber}_reporte.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const handleDownloadWord = (report: ReportData) => {
    // Simulación de descarga Word
    const wordContent = generateWordContent(report);
    downloadFile(wordContent, `${report.reportNumber}_reporte.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  };

  const generatePDFContent = (report: ReportData): string => {
    return `
MINISTERIO DE OBRAS PÚBLICAS Y COMUNICACIONES
===============================================

REPORTE DE INTERVENCIÓN
Número: ${report.reportNumber}
Fecha: ${report.date}
Provincia: ${report.province}
Estado: ${report.status}

TÍTULO: ${report.title}

DESCRIPCIÓN:
${report.description}

---
Generado el: ${new Date().toLocaleString()}
Usuario: ${user.name}
    `.trim();
  };

  const generateExcelContent = (report: ReportData): string => {
    return `Número de Reporte,Título,Fecha,Provincia,Estado,Descripción
${report.reportNumber},"${report.title}",${report.date},${report.province},${report.status},"${report.description}"`;
  };

  const generateWordContent = (report: ReportData): string => {
    return `
MINISTERIO DE OBRAS PÚBLICAS Y COMUNICACIONES

REPORTE DE INTERVENCIÓN

Número de Reporte: ${report.reportNumber}
Título: ${report.title}
Fecha: ${report.date}
Provincia: ${report.province}
Estado: ${report.status}

Descripción:
${report.description}

Documento generado el ${new Date().toLocaleString()} por ${user.name}
    `.trim();
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="export-page">
      {/* Topbar */}
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: 'white',
        color: '#2c3e50',
        padding: '12px 20px',
        marginBottom: '20px',
        borderRadius: '0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Volver
          </button>
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#dee2e6'
          }}></div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '18px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            📤 Exportar Reportes
          </h1>
        </div>
        {/* Ícono de notificaciones - posicionado a la derecha */}
        <div className="notification-container" style={{ position: 'relative', cursor: 'pointer' }}>
          <img 
            src="/images/notification-bell-icon.svg" 
            alt="Notificaciones" 
            style={{
              width: '24px', 
              height: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowPendingModal(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.filter = 'drop-shadow(0 3px 6px rgba(255, 152, 0, 0.6))';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.4))';
            }}
          />
          {/* Contador de notificaciones */}
          {pendingCount > 0 && (
            <span 
              className="notification-badge"
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none'
              }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </div>
      </div>

      <div className="export-content">
        <div className="search-container">
          <div className="search-header">
            <h2 className="search-title">🔍 Buscar Reporte por Número</h2>
            <p className="search-description">
              Ingresa el número de reporte para buscar y descargar la plantilla en diferentes formatos
            </p>
          </div>

          <div className="search-box">
            <div className="search-input-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                className="search-input"
                placeholder="Ej: RPT-2025-001"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="search-button"
                onClick={handleSearch}
                disabled={loading || !searchNumber.trim()}
              >
                {loading ? '🔄 Buscando...' : '🔍 Buscar'}
              </button>
            </div>
          </div>

          {/* Ejemplos de números de reporte */}
          <div className="examples-container">
            <h3 className="examples-title">💡 Ejemplos de números de reporte:</h3>
            <div className="examples-grid">
              {(() => {
                // Obtener reportes reales según el rol del usuario
                const searchFilters = user.role === UserRole.TECNICO 
                  ? { creadoPor: user.username } 
                  : {};
                
                const availableReports = reportStorage.searchReports(searchFilters)
                  .slice(0, 3)
                  .map(report => ({
                    reportNumber: report.numeroReporte,
                    title: report.tipoIntervencion || 'Sin título'
                  }));
                
                return availableReports;
              })().map((report) => (
                <div 
                  key={report.reportNumber}
                  className="example-item"
                  onClick={() => setSearchNumber(report.reportNumber)}
                >
                  <span className="example-number">{report.reportNumber}</span>
                  <span className="example-title">{report.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resultado de búsqueda */}
        {searchResult && (
          <div className="result-container">
            <div className="result-header">
              <h3 className="result-title">✅ Reporte Encontrado</h3>
            </div>
            
            <div className="result-card">
              <div className="result-info">
                <div className="result-main">
                  <h4 className="result-number">{searchResult.reportNumber}</h4>
                  <h5 className="result-project-title">{searchResult.title}</h5>
                  <div className="result-details">
                    <span className="result-detail">📅 {searchResult.date}</span>
                    <span className="result-detail">📍 {searchResult.province}</span>
                    <span className={`result-status status-${searchResult.status.toLowerCase().replace(' ', '-')}`}>
                      {searchResult.status}
                    </span>
                  </div>
                  <p className="result-description">{searchResult.description}</p>
                </div>
              </div>

              <div className="download-options">
                <h4 className="download-title">📥 Descargar en formato:</h4>
                <div className="download-buttons">
                  <button 
                    className="download-btn pdf-btn"
                    onClick={() => handleDownloadPDF(searchResult)}
                  >
                    📄 PDF
                  </button>
                  <button 
                    className="download-btn excel-btn"
                    onClick={() => handleDownloadExcel(searchResult)}
                  >
                    📊 Excel
                  </button>
                  <button 
                    className="download-btn word-btn"
                    onClick={() => handleDownloadWord(searchResult)}
                  >
                    📝 Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No encontrado */}
        {notFound && (
          <div className="not-found-container">
            <div className="not-found-card">
              <div className="not-found-icon">❌</div>
              <h3 className="not-found-title">Reporte No Encontrado</h3>
              <p className="not-found-message">
                No se encontró ningún reporte con el número: <strong>{searchNumber}</strong>
              </p>
              <p className="not-found-suggestion">
                Verifica que el número esté escrito correctamente o intenta con uno de los ejemplos.
              </p>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="info-section">
          <div className="info-card">
            <h3 className="info-title">ℹ️ Información sobre los formatos</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon">📄</div>
                <div className="info-content">
                  <h4>PDF</h4>
                  <p>Formato ideal para visualización e impresión. No editable.</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📊</div>
                <div className="info-content">
                  <h4>Excel</h4>
                  <p>Formato de hoja de cálculo. Ideal para análisis de datos.</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📝</div>
                <div className="info-content">
                  <h4>Word</h4>
                  <p>Documento editable. Ideal para modificaciones y reportes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Reportes Pendientes */}
      <PendingReportsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        reports={getPendingReports()}
        onDeleteReport={handleDeletePendingReport}
      />
    </div>
  );
};

export default ExportPage;
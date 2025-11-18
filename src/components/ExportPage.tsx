import React, { useState, useEffect } from 'react';
import PendingReportsModal from './PendingReportsModal';
import { reportStorage, ReportData as FullReportData } from '../services/reportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import './ExportPage.css';
import { UserRole } from '../types/userRoles';
import jsPDF from 'jspdf';

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
    const pendientes = pendingReportStorage.getPendingCount();
    setPendingCount(pendientes);
  };

  // Función para obtener lista detallada de reportes pendientes
  const getPendingReports = () => {
    const pendingReports = pendingReportStorage.getAllPendingReports();
    return pendingReports.map(report => ({
      id: report.id,
      reportNumber: `DCR-${report.id.split('_').pop()?.slice(-6) || '000000'}`,
      timestamp: report.timestamp,
      estado: 'pendiente',
      region: report.formData.region || 'N/A',
      provincia: report.formData.provincia || 'N/A',
      municipio: report.formData.municipio || 'N/A',
      tipoIntervencion: report.formData.tipoIntervencion || 'No especificado'
    }));
  };

  const handleContinuePendingReport = (reportId: string) => {
    alert('Función de continuar reporte desde ExportPage - redirigir a formulario');
    setShowPendingModal(false);
  };

  const handleCancelPendingReport = (reportId: string) => {
    pendingReportStorage.deletePendingReport(reportId);
    updatePendingCount();
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  // Actualizar contador al cargar y cada vez que cambie localStorage
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
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
    // Obtener datos completos del reporte desde reportStorage
    const fullReport = reportStorage.getReportByNumber(report.reportNumber);
    
    if (!fullReport) {
      alert('No se pudo cargar el reporte completo');
      return;
    }

    generateProfessionalPDF(fullReport, report);
  };

  const generateProfessionalPDF = (fullReport: FullReportData, displayData: ReportData) => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Encabezado - Logo y título
    doc.setFillColor(41, 128, 185); // Azul MOPC
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MINISTERIO DE OBRAS PÚBLICAS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Y COMUNICACIONES', pageWidth / 2, 25, { align: 'center' });
    
    yPos = 50;

    // Título del documento
    doc.setTextColor(41, 128, 185);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE INTERVENCIÓN VIAL', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;

    // Información principal en recuadro
    doc.setFillColor(240, 248, 255);
    doc.rect(margin, yPos - 5, contentWidth, 30, 'F');
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, yPos - 5, contentWidth, 30, 'S');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Número de Reporte:`, margin + 5, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.numeroReporte, margin + 50, yPos + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha:`, margin + 5, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(fullReport.fechaCreacion).toLocaleDateString('es-PY'), margin + 50, yPos + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Estado:`, margin + 5, yPos + 19);
    doc.setFont('helvetica', 'normal');
    const estadoColor = fullReport.estado === 'completado' ? [34, 139, 34] : 
                        fullReport.estado === 'pendiente' ? [255, 140, 0] : [128, 128, 128];
    doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
    doc.text(fullReport.estado.toUpperCase(), margin + 50, yPos + 19);
    doc.setTextColor(0, 0, 0);

    yPos += 40;

    // Sección de Ubicación
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('📍 UBICACIÓN GEOGRÁFICA', margin + 3, yPos + 5);
    
    yPos += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Región:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.region || 'N/A', margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Provincia:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.provincia || 'N/A', margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Municipio:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.municipio || 'N/A', margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Distrito:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.distrito || 'N/A', margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Sector:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.sector || 'N/A', margin + 30, yPos);
    
    yPos += 15;

    // Sección de Intervención
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('🛠️ DATOS DE LA INTERVENCIÓN', margin + 3, yPos + 5);
    
    yPos += 13;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Tipo de Intervención:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fullReport.tipoIntervencion || 'N/A', margin + 50, yPos);
    
    if (fullReport.subTipoCanal) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Subtipo:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fullReport.subTipoCanal, margin + 50, yPos);
    }
    
    yPos += 15;

    // Datos Métricos
    if (fullReport.metricData && Object.keys(fullReport.metricData).length > 0) {
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 DATOS MÉTRICOS', margin + 3, yPos + 5);
      
      yPos += 13;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      Object.entries(fullReport.metricData).forEach(([key, value]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`${label}:`, margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 70, yPos);
        yPos += 6;
      });
      
      yPos += 10;
    }

    // Datos GPS
    if (fullReport.gpsData && (fullReport.gpsData.punto_inicial || fullReport.gpsData.punto_alcanzado)) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('🌍 COORDENADAS GPS', margin + 3, yPos + 5);
      
      yPos += 13;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      if (fullReport.gpsData.punto_inicial) {
        doc.setFont('helvetica', 'bold');
        doc.text('Punto Inicial:', margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`Lat: ${fullReport.gpsData.punto_inicial.lat}, Lon: ${fullReport.gpsData.punto_inicial.lon}`, margin + 35, yPos);
        yPos += 6;
      }
      
      if (fullReport.gpsData.punto_alcanzado) {
        doc.setFont('helvetica', 'bold');
        doc.text('Punto Alcanzado:', margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`Lat: ${fullReport.gpsData.punto_alcanzado.lat}, Lon: ${fullReport.gpsData.punto_alcanzado.lon}`, margin + 35, yPos);
        yPos += 6;
      }
      
      yPos += 10;
    }

    // Observaciones
    if (fullReport.observaciones) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('📝 OBSERVACIONES', margin + 3, yPos + 5);
      
      yPos += 13;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(fullReport.observaciones, contentWidth - 10);
      lines.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin + 5, yPos);
        yPos += 5;
      });
      
      yPos += 10;
    }

    // Pie de página en todas las páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generado el ${new Date().toLocaleDateString('es-PY')} a las ${new Date().toLocaleTimeString('es-PY')}`, margin, 285);
      doc.text(`Por: ${fullReport.creadoPor}`, margin, 290);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
      
      // Línea decorativa
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.line(margin, 280, pageWidth - margin, 280);
    }

    // Descargar el PDF
    doc.save(`${fullReport.numeroReporte}_reporte.pdf`);
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
              transition: 'all 0.3s ease',
              animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
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
                animation: 'badgeGlow 2s infinite'
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
                placeholder="Ej: DCR-2025-001"
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
        onContinueReport={handleContinuePendingReport}
        onCancelReport={handleCancelPendingReport}
      />
    </div>
  );
};

export default ExportPage;
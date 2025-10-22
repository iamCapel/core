import React, { useState } from 'react';
import './ExportPage.css';

interface User {
  username: string;
  name: string;
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
}

const ExportPage: React.FC<ExportPageProps> = ({ user, onBack }) => {
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Datos simulados de reportes
  const mockReports: ReportData[] = [
    {
      reportNumber: 'RPT-2025-001',
      title: 'Reparación de Carretera Ruta 1',
      date: '2025-01-15',
      province: 'Central',
      status: 'Completado',
      description: 'Intervención de mantenimiento en la Ruta 1, tramo km 25-30'
    },
    {
      reportNumber: 'RPT-2025-002',
      title: 'Construcción de Puente Yabebyry',
      date: '2025-02-10',
      province: 'Paraguarí',
      status: 'En Progreso',
      description: 'Construcción de puente vehicular sobre el río Yabebyry'
    },
    {
      reportNumber: 'RPT-2025-003',
      title: 'Mantenimiento Ruta 7',
      date: '2025-03-05',
      province: 'Caaguazú',
      status: 'Pendiente',
      description: 'Mantenimiento preventivo de la Ruta 7, varios tramos'
    },
    {
      reportNumber: 'RPT-2025-004',
      title: 'Rehabilitación Ruta 2',
      date: '2025-03-20',
      province: 'Central',
      status: 'Completado',
      description: 'Rehabilitación completa de la Ruta 2, tramo Luque-Capiatá'
    },
    {
      reportNumber: 'RPT-2025-005',
      title: 'Pavimentación Acceso Norte',
      date: '2025-04-01',
      province: 'Asunción',
      status: 'En Progreso',
      description: 'Pavimentación del acceso norte de Asunción'
    }
  ];

  const handleSearch = () => {
    if (!searchNumber.trim()) return;

    setLoading(true);
    setNotFound(false);
    setSearchResult(null);

    // Simular búsqueda con delay
    setTimeout(() => {
      const found = mockReports.find(report => 
        report.reportNumber.toLowerCase().includes(searchNumber.toLowerCase())
      );
      
      if (found) {
        setSearchResult(found);
        setNotFound(false);
      } else {
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
      <div className="export-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 className="page-title">
            📤 Exportar Reportes
          </h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="welcome-text">Bienvenido, {user.name}</span>
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          </div>
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
              {mockReports.slice(0, 3).map((report) => (
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
    </div>
  );
};

export default ExportPage;
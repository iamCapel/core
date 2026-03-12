import React from 'react';
import ReactDOM from 'react-dom';
import { exportReport } from '../utils/reportExport';

interface ExportButtonProps {
  selectedReport?: any;
  onExport?: (format: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ selectedReport, onExport }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  // removed coords and buttonRef as no longer needed for modal

  const handleFormat = async (format: string) => {
    setMenuOpen(false);
    if (!selectedReport) {
      alert('No hay un reporte seleccionado para exportar');
      return;
    }
    console.log(`📁 Exportando a ${format}...`);
    try {
      await exportReport(selectedReport, format as any);
    } catch (err) {
      console.error('Error durante exportación', err);
      alert('Fallo en la exportación. Revise la consola.');
    }
    if (onExport) onExport(format);
  };

  const toggleMenu = () => {
    setMenuOpen((open) => !open);
  };

  return (
    <>
      <button 
        className="report-export-btn"
        onClick={toggleMenu}
        title="Exportar reporte"
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'transform 0.2s',
          background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        📊 Exportar ▾
      </button>
      {menuOpen && ReactDOM.createPortal(
        <div className="export-modal-overlay">
          <div className="export-modal">
            <button
              className="export-btn-choice export-excel"
              onClick={() => handleFormat('excel')}
            >
              📗 Excel
            </button>
            <button
              className="export-btn-choice export-pdf"
              onClick={() => handleFormat('pdf')}
            >
              📕 PDF
            </button>
            <button
              className="export-btn-choice export-word"
              onClick={() => handleFormat('word')}
            >
              📘 Word
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ExportButton;

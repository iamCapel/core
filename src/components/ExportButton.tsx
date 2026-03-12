import React from 'react';

interface ExportButtonProps {
  selectedReport?: any;
  onExport?: (format: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ selectedReport, onExport }) => {
  const handleExportClick = () => {
    if (!selectedReport) {
      alert('No hay un reporte seleccionado para exportar');
      return;
    }
    
    const format = prompt('¿En qué formato deseas exportar el reporte?\n\nEscribe una de las siguientes opciones:\n• excel\n• pdf\n• word\n\nO presiona Cancelar para salir');
    
    if (format) {
      const normalizedFormat = format.toLowerCase().trim();
      
      switch (normalizedFormat) {
        case 'excel':
          console.log('📊 Exportando a Excel...');
          if (onExport) onExport('excel');
          else alert('Exportación a Excel en desarrollo...');
          break;
          
        case 'pdf':
          console.log('📄 Exportando a PDF...');
          if (onExport) onExport('pdf');
          else alert('Exportación a PDF en desarrollo...');
          break;
          
        case 'word':
        case 'docx':
          console.log('📝 Exportando a Word...');
          if (onExport) onExport('word');
          else alert('Exportación a Word en desarrollo...');
          break;
          
        default:
          alert('Formato no válido. Por favor, elige: excel, pdf o word');
      }
    }
  };

  return (
    <button 
      className="report-export-btn"
      onClick={handleExportClick}
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
      📊 Exportar
    </button>
  );
};

export default ExportButton;

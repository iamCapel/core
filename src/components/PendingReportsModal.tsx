import React from 'react';

interface PendingReport {
  id: string;
  reportNumber: string;
  timestamp: string;
  estado: string;
  region?: string;
  provincia?: string;
  municipio?: string;
  tipoIntervencion?: string;
}

interface PendingReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: PendingReport[];
  onEditReport?: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
}

const PendingReportsModal: React.FC<PendingReportsModalProps> = ({
  isOpen,
  onClose,
  reports,
  onEditReport,
  onDeleteReport
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getReportNumber = (reportId: string) => {
    // Extraer número de reporte del ID o generar uno basado en timestamp
    const match = reportId.match(/(\d+)$/);
    if (match) {
      return `RPT-${match[1].slice(-6).padStart(6, '0')}`;
    }
    // Generar número basado en timestamp si no hay número en el ID
    const timestamp = Date.now();
    return `RPT-${timestamp.toString().slice(-6)}`;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingTop: '70px',
        paddingRight: '20px'
      }}
      onClick={onClose} // Cerrar al hacer click fuera
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '15px',
          maxWidth: '400px',
          width: '400px',
          maxHeight: '60vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid #ddd',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()} // Evitar que se cierre al hacer click dentro
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          borderBottom: '2px solid #ff7a00',
          paddingBottom: '8px'
        }}>
          <h3 style={{ margin: 0, color: '#ff7a00', fontSize: '16px' }}>
            � Pendientes ({reports.length})
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>

        {reports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontSize: '14px', margin: 0 }}>No hay reportes pendientes</p>
          </div>
        ) : (
          <div>
            {reports.slice(0, 5).map((report, index) => (
              <div
                key={report.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: report.estado === 'borrador' ? '#fff9e6' : '#f8f9fa',
                  fontSize: '12px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        backgroundColor: report.estado === 'borrador' ? '#f39c12' : '#3498db',
                        color: 'white',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        marginRight: '8px'
                      }}>
                        {getReportNumber(report.id)}
                      </span>
                      <span style={{
                        backgroundColor: report.estado === 'borrador' ? '#e67e22' : '#2980b9',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        textTransform: 'uppercase'
                      }}>
                        {report.estado}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#333', marginBottom: '4px' }}>
                      <strong>{report.provincia}</strong> → {report.municipio}
                    </div>
                    
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      {formatDate(report.timestamp)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {onEditReport && (
                      <button
                        onClick={() => onEditReport(report.id)}
                        style={{
                          backgroundColor: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                    )}
                    
                    {onDeleteReport && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar ${getReportNumber(report.id)}?`)) {
                            onDeleteReport(report.id);
                          }
                        }}
                        style={{
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {reports.length > 5 && (
              <div style={{
                textAlign: 'center',
                padding: '8px',
                color: '#666',
                fontSize: '11px',
                borderTop: '1px solid #eee',
                marginTop: '8px'
              }}>
                ... y {reports.length - 5} más
              </div>
            )}
          </div>
        )}

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#999'
        }}>
          💡 Click para gestionar reportes
        </div>
      </div>
    </div>
  );
};

export default PendingReportsModal;
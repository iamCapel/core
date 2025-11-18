import React, { useState } from 'react';

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
  onContinueReport?: (reportId: string) => void;
  onCancelReport?: (reportId: string) => void;
}

const PendingReportsModal: React.FC<PendingReportsModalProps> = ({
  isOpen,
  onClose,
  reports,
  onContinueReport,
  onCancelReport
}) => {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getReportNumber = (reportId: string) => {
    const match = reportId.match(/(\d+)$/);
    const year = new Date().getFullYear();
    if (match) {
      return `DCR-${year}-${match[1].slice(-6).padStart(6, '0')}`;
    }
    const timestamp = Date.now();
    return `DCR-${year}-${timestamp.toString().slice(-6)}`;
  };

  const handleCancelWithAnimation = (reportId: string) => {
    if (window.confirm('¿Eliminar este reporte pendiente?')) {
      // Agregar el ID a la lista de elementos que se están eliminando
      setRemovingIds(prev => new Set(prev).add(reportId));
      
      // Esperar a que termine la animación antes de eliminar
      setTimeout(() => {
        if (onCancelReport) {
          onCancelReport(reportId);
        }
        // Limpiar el ID de la lista de removidos
        setRemovingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(reportId);
          return newSet;
        });
      }, 400); // Duración de la animación
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingTop: '80px',
        paddingRight: '24px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#f9f9f9',
          borderRadius: '20px',
          padding: '0',
          maxWidth: '420px',
          width: '420px',
          maxHeight: '75vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: 'none',
          position: 'relative',
          animation: 'slideInRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ff7a00 0%, #ff9a3d 100%)',
          padding: '20px 24px',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 2px 10px rgba(255, 122, 0, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                color: 'white', 
                fontSize: '22px',
                fontWeight: '700',
                letterSpacing: '-0.5px'
              }}>
                Notificaciones
              </h3>
              <p style={{ 
                margin: '4px 0 0 0', 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {reports.length} {reports.length === 1 ? 'reporte pendiente' : 'reportes pendientes'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                fontWeight: '300'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <div style={{
          padding: '16px',
          maxHeight: 'calc(75vh - 100px)',
          overflowY: 'auto',
          backgroundColor: '#f9f9f9'
        }}>
          {reports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.5 }}>🔔</div>
              <p style={{ fontSize: '16px', margin: 0, fontWeight: '600', color: '#666' }}>Sin notificaciones</p>
              <p style={{ fontSize: '13px', margin: '8px 0 0 0', color: '#999' }}>Todos los reportes están al día</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report) => {
                const isRemoving = removingIds.has(report.id);
                return (
                  <div
                    key={report.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? 'translateX(100px) scale(0.8)' : 'translateX(0) scale(1)',
                      maxHeight: isRemoving ? '0px' : '500px',
                      overflow: 'hidden',
                      marginBottom: isRemoving ? '0px' : '0px',
                      pointerEvents: isRemoving ? 'none' : 'auto'
                    }}
                  >
                  {/* Contenido del reporte */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#ff7a00',
                            animation: 'pulse 2s infinite'
                          }}></span>
                          {report.tipoIntervencion || 'Intervención'}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '4px'
                        }}>
                          📍 <strong>{report.provincia}</strong> • {report.municipio || 'N/A'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#999',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>🕐 {formatDate(report.timestamp)}</span>
                          <span style={{
                            backgroundColor: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#666'
                          }}>
                            {getReportNumber(report.id)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end'
                  }}>
                    {/* Botón Cancelar (Rojo) */}
                    {onCancelReport && (
                      <button
                        onClick={() => handleCancelWithAnimation(report.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: 'white',
                          color: '#e74c3c',
                          border: '2px solid #e74c3c',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(231, 76, 60, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e74c3c';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#e74c3c';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span style={{
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}>✕</span>
                        Cancelar
                      </button>
                    )}

                    {/* Botón Continuar (Verde) */}
                    {onContinueReport && (
                      <button
                        onClick={() => onContinueReport(report.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#27ae60',
                          color: 'white',
                          border: '2px solid #27ae60',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(39, 174, 96, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#229954';
                          e.currentTarget.style.borderColor = '#229954';
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#27ae60';
                          e.currentTarget.style.borderColor = '#27ae60';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(39, 174, 96, 0.2)';
                        }}
                      >
                        Continuar
                        <span style={{
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}>→</span>
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default PendingReportsModal;
import React from 'react';

interface GpsApprovalProps {
  isOpen: boolean;
  coordinates: {lat: number, lon: number} | null;
  targetFieldLabel: string;
  fieldKey: string;
  onApprove: () => void;
  onCancel: () => void;
}

const GpsApproval: React.FC<GpsApprovalProps> = ({ isOpen, coordinates, targetFieldLabel, fieldKey, onApprove, onCancel }) => {
  if (!isOpen || !coordinates) return null;

  const formatCoordinates = (lat: number, lon: number) => {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  // Personalizar el mensaje según el campo específico
  const getFieldMessage = () => {
    switch (fieldKey) {
      case 'punto_inicial':
        return '¿Desea ACEPTAR estas coordenadas para el PUNTO INICIAL de la intervención?';
      case 'punto_alcanzado':
        return '¿Desea ACEPTAR estas coordenadas para el PUNTO FINAL de la intervención?';
      default:
        return `¿Desea ACEPTAR estas coordenadas para "${targetFieldLabel}"?`;
    }
  };

  return (
    <div className="gps-approval-overlay">
      <div className="gps-approval-modal">
        <div className="gps-approval-header">
          <h3>📍 Coordenadas GPS Detectadas</h3>
        </div>
        
        <div className="gps-approval-content">
          <p>📍 Ubicación actual detectada:</p>
          <div className="coordinates-display">
            {formatCoordinates(coordinates.lat, coordinates.lon)}
          </div>
          <p className="confirmation-message">{getFieldMessage()}</p>
        </div>
        
        <div className="gps-approval-actions">
          <button 
            className="btn-approve" 
            onClick={onApprove}
            autoFocus
          >
            ✅ ACEPTAR
          </button>
          <button 
            className="btn-cancel" 
            onClick={onCancel}
          >
            ❌ DESCARTAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default GpsApproval;
import React from 'react';
import './PendingClockAnimation.css';

interface PendingClockAnimationProps {
  onClose?: () => void;
  message?: string;
}

const PendingClockAnimation: React.FC<PendingClockAnimationProps> = ({ 
  onClose, 
  message = 'Reporte guardado como pendiente' 
}) => {
  return (
    <div className="pending-clock-overlay">
      <div className="pending-clock-container">
        <div className="clock-animation">
          <div className="clock-face">
            <div className="clock-hand hour"></div>
            <div className="clock-hand minute"></div>
            <div className="clock-center"></div>
          </div>
          <div className="clock-glow"></div>
        </div>
        
        <h2 className="pending-message">{message}</h2>
        <p className="pending-subtitle">Podrás continuarlo desde las notificaciones</p>
        
        <button className="pending-close-btn" onClick={onClose}>
          ✓ Entendido
        </button>
      </div>
    </div>
  );
};

export default PendingClockAnimation;

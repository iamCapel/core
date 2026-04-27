import React, { useEffect, useState } from 'react';
import { firebaseHeavyVehiclesStorage, HeavyVehicleRecord } from '../services/firebaseHeavyVehiclesStorage';
import './RecentVehiclesList.css';

interface RecentVehiclesListProps {
  limitCount?: number;
  onVehicleClick?: (vehicle: HeavyVehicleRecord) => void;
}

const RecentVehiclesList: React.FC<RecentVehiclesListProps> = ({ limitCount = 20, onVehicleClick }) => {
  const [vehicles, setVehicles] = useState<HeavyVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Suscribirse a los vehículos recientes en tiempo real
    const unsubscribe = firebaseHeavyVehiclesStorage.subscribeToRecentVehicles(
      limitCount,
      (recentVehicles) => {
        setVehicles(recentVehicles);
        setLoading(false);
      }
    );

    // Cleanup: cancelar suscripción al desmontar
    return () => {
      unsubscribe();
    };
  }, [limitCount]);

  // Formatear fecha de forma legible
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Justo ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays < 7) return `Hace ${diffDays}d`;
      
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Fecha desconocida';
    }
  };

  // Obtener ubicación completa
  const getLocation = (vehicle: HeavyVehicleRecord): string => {
    const parts = [
      vehicle.municipio,
      vehicle.provincia,
      vehicle.distrito
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
  };

  // Obtener icono del tipo de vehículo
  const getVehicleIcon = (tipo: string): string => {
    const iconMap: Record<string, string> = {
      'Excavadora': '🚜',
      'Retroexcavadora': '🚜',
      'Motoniveladora': '🚧',
      'Rodillo': '🛞',
      'Cargador': '🏗️',
      'Bulldozer': '🚧',
      'Camión': '🚛',
      'Compactadora': '🛞',
      'Pavimentadora': '🚧',
      'Grúa': '🏗️',
      'Tractor': '🚜'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (tipo.includes(key)) return icon;
    }
    
    return '🚜'; // Icono por defecto
  };

  if (loading) {
    return (
      <div className="recent-vehicles-loading">
        <span className="loading-spinner">⏳</span>
        <p>Cargando vehículos recientes...</p>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="recent-vehicles-empty">
        <span className="empty-icon">📭</span>
        <p>No hay vehículos registrados recientemente</p>
      </div>
    );
  }

  return (
    <div className="recent-vehicles-container">
      <div className="recent-vehicles-header">
        <h4>
          <span className="header-icon">🚜</span>
          Vehículos Recientes
        </h4>
        <span className="vehicle-count">{vehicles.length}</span>
      </div>

      <div className="recent-vehicles-list">
        {vehicles.map((vehicle) => (
          <div 
            key={vehicle.id} 
            className="vehicle-card" 
            title={`${vehicle.tipoVehiculo} - ${vehicle.modelo || 'Sin modelo'} - ${getLocation(vehicle)}`}
            onClick={() => onVehicleClick && onVehicleClick(vehicle)}
          >
            <div className="vehicle-card-header">
              <span className="vehicle-icon">
                {getVehicleIcon(vehicle.tipoVehiculo)}
              </span>
              <div className="vehicle-info">
                <div className="vehicle-type">{vehicle.tipoVehiculo}</div>
                <div className="vehicle-ficha">
                  <strong>#{vehicle.ficha}</strong>
                </div>
              </div>
            </div>

            <div className="vehicle-card-footer">
              <div className="vehicle-user">
                <span className="user-icon">👤</span>
                <span className="user-name">
                  {vehicle.usuarioId || 'Sistema'}
                </span>
              </div>
              <div className="vehicle-time">
                {formatDate(vehicle.createdAt)}
              </div>
            </div>
            
            {vehicle.cantidadVehiculos > 1 && (
              <div className="vehicle-badge">
                <span className="quantity-badge">
                  ×{vehicle.cantidadVehiculos}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentVehiclesList;

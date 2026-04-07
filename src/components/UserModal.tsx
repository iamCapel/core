import React, { useState, useEffect } from 'react';
import './UserModal.css';
import userLocationService from '../services/userLocationService';
import userPresenceService from '../services/userPresenceService';

export interface UserData {
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  region?: string;
  provincia?: string;
  municipio?: string;
  telefono?: string;
  createdAt?: string;
  lastActive?: string;
  status?: 'active' | 'inactive' | 'suspended';
  reportCount?: number;
  [key: string]: any; // Para campos adicionales
}

type ConnectionStatus = 'online-app' | 'online-web' | 'offline';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userData?: UserData;
  onEditUser?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onViewReports?: (userId: string) => void;
  onViewHistory?: (userId: string) => void;
  onResetPassword?: (userId: string) => void;
  showActions?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  userId,
  userData,
  onEditUser,
  onDeleteUser,
  onViewReports,
  onViewHistory,
  onResetPassword,
  showActions = true
}) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [lastSeen, setLastSeen] = useState<string>('');
  
  // Estados para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && userId) {
      if (userData) {
        setUser(userData);
      } else {
        // Aquí puedes cargar los datos del usuario desde Firebase
        loadUserData(userId);
      }
      // Suscribirse a las ubicaciones en vivo
      const unsubscribe = checkUserConnection(userId);
      
      // Resetear posición cuando se abre el modal
      setPosition({ x: 0, y: 0 });
      
      // Limpiar suscripción cuando el modal se cierre
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isOpen, userId, userData]);

  // Manejo de eventos de drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPosition({
          x: position.x + deltaX,
          y: position.y + deltaY
        });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const checkUserConnection = (username: string) => {
    let isOnlineWeb = false;
    let hasRecentGPS = false;
    let latestTimestamp: string = '';

    // Suscribirse a la presencia web
    const unsubscribeWeb = userPresenceService.subscribeToUserPresence(username, (online: boolean, lastChanged?: string) => {
      isOnlineWeb = online;
      if (online) {
        setConnectionStatus('online-web');
        setLastSeen('Ahora');
      } else if (!hasRecentGPS) {
        setConnectionStatus('offline');
        setLastSeen(lastChanged ? formatDate(lastChanged) : 'Desconectado');
      }
    });

    // Suscribirse a las ubicaciones GPS (CORE-APK)
    const unsubscribeGPS = userLocationService.subscribeToLiveLocations((locations) => {
      const userLocation = locations.find(loc => loc.username === username);
      
      if (userLocation) {
        const locationTime = new Date(userLocation.timestamp);
        const now = new Date();
        const diffSeconds = (now.getTime() - locationTime.getTime()) / 1000;
        
        // Prioridad: GPS reciente de CORE-APK
        if (diffSeconds < 30) {
          hasRecentGPS = true;
          setConnectionStatus('online-app');
          setLastSeen('Ahora');
        } else if (diffSeconds < 300) {
          hasRecentGPS = true;
          setConnectionStatus('online-app');
          setLastSeen(`Hace ${Math.floor(diffSeconds / 60)} min`);
        } else {
          hasRecentGPS = false;
          // Si no hay GPS reciente pero está online en web, mantener ese estado
          if (isOnlineWeb) {
            setConnectionStatus('online-web');
            setLastSeen('Ahora');
          } else {
            setConnectionStatus('offline');
            setLastSeen(formatDate(userLocation.timestamp));
          }
        }
        latestTimestamp = userLocation.timestamp;
      } else {
        hasRecentGPS = false;
        // Si no hay datos de GPS, depender de la presencia web
        if (!isOnlineWeb) {
          setConnectionStatus('offline');
          setLastSeen('Desconectado');
        }
      }
    });

    // Retornar función para limpiar ambas suscripciones
    return () => {
      unsubscribeWeb();
      unsubscribeGPS();
    };
  };

  const loadUserData = async (id: string) => {
    setLoading(true);
    try {
      // TODO: Implementar carga desde Firebase
      // const userDoc = await getDoc(doc(db, 'usuarios', id));
      // if (userDoc.exists()) {
      //   setUser(userDoc.data() as UserData);
      // }
      console.log('Cargando datos del usuario:', id);
    } catch (error) {
      console.error('Error cargando usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatusBadge = (status: ConnectionStatus) => {
    const statusConfig = {
      'online-app': { 
        label: '🟢 EN LÍNEA (CORE-APK)', 
        color: '#10b981',
        detail: lastSeen
      },
      'online-web': { 
        label: '🟢 EN LÍNEA (WEB)', 
        color: '#3b82f6',
        detail: lastSeen
      },
      'offline': { 
        label: '⚫ DESCONECTADO', 
        color: '#6b7280',
        detail: lastSeen
      }
    };
    const config = statusConfig[status];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="user-status-badge" style={{ backgroundColor: config.color }}>
          {config.label}
        </span>
        {config.detail && (
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {config.detail}
          </span>
        )}
      </div>
    );
  };

  const getRoleLabel = (role?: string) => {
    const roles: { [key: string]: string } = {
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'tecnico': 'Técnico',
      'operador': 'Operador',
      'consulta': 'Solo Consulta'
    };
    return roles[role || ''] || role || 'No definido';
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      'active': { label: 'Activo', color: '#10b981' },
      'inactive': { label: 'Inactivo', color: '#6b7280' },
      'suspended': { label: 'Suspendido', color: '#ef4444' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <span className="user-status-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-modal-overlay" onClick={onClose}>
      <div 
        className="user-modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div 
          className="user-modal-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="drag-indicator" title="Arrastra para mover">
            <span>⋮⋮</span>
          </div>
          <div className="user-modal-title-section">
            <div className="user-avatar">
              {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="user-modal-title">
                {user?.fullName || user?.username || 'Usuario'}
              </h2>
              <p className="user-modal-username">@{user?.username || userId}</p>
            </div>
          </div>
          <button className="user-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="user-modal-body">
          {loading ? (
            <div className="user-modal-loading">
              <div className="spinner"></div>
              <p>Cargando información del usuario...</p>
            </div>
          ) : user ? (
            <>
              {/* Estado de Conexión y Rol */}
              <div className="user-info-card">
                <div className="user-info-row">
                  <div className="user-info-item">
                    <span className="user-info-label">Conexión</span>
                    {getConnectionStatusBadge(connectionStatus)}
                  </div>
                  <div className="user-info-item">
                    <span className="user-info-label">Estado</span>
                    {getStatusBadge(user.status)}
                  </div>
                </div>
                <div className="user-info-row" style={{ marginTop: '12px' }}>
                  <div className="user-info-item">
                    <span className="user-info-label">Rol</span>
                    <span className="user-info-value">{getRoleLabel(user.role)}</span>
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="user-info-card">
                <h3 className="user-info-section-title">Información de Contacto</h3>
                <div className="user-info-grid">
                  {user.email && (
                    <div className="user-info-item">
                      <span className="user-info-label">📧 Email</span>
                      <span className="user-info-value">{user.email}</span>
                    </div>
                  )}
                  {user.telefono && (
                    <div className="user-info-item">
                      <span className="user-info-label">📱 Teléfono</span>
                      <span className="user-info-value">{user.telefono}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ubicación */}
              {(user.region || user.provincia || user.municipio) && (
                <div className="user-info-card">
                  <h3 className="user-info-section-title">Ubicación Asignada</h3>
                  <div className="user-info-grid">
                    {user.region && (
                      <div className="user-info-item">
                        <span className="user-info-label">🗺️ Región</span>
                        <span className="user-info-value">{user.region}</span>
                      </div>
                    )}
                    {user.provincia && (
                      <div className="user-info-item">
                        <span className="user-info-label">📍 Provincia</span>
                        <span className="user-info-value">{user.provincia}</span>
                      </div>
                    )}
                    {user.municipio && (
                      <div className="user-info-item">
                        <span className="user-info-label">🏘️ Municipio</span>
                        <span className="user-info-value">{user.municipio}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estadísticas */}
              <div className="user-info-card">
                <h3 className="user-info-section-title">Estadísticas</h3>
                <div className="user-info-grid">
                  <div className="user-info-item">
                    <span className="user-info-label">📊 Reportes Creados</span>
                    <span className="user-info-value">{user.reportCount || 0}</span>
                  </div>
                  {user.createdAt && (
                    <div className="user-info-item">
                      <span className="user-info-label">📅 Fecha de Registro</span>
                      <span className="user-info-value">{formatDate(user.createdAt)}</span>
                    </div>
                  )}
                  {user.lastActive && (
                    <div className="user-info-item">
                      <span className="user-info-label">🕐 Última Actividad</span>
                      <span className="user-info-value">{formatDate(user.lastActive)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="user-modal-no-data">
              <p>No se encontró información del usuario</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        {showActions && user && (
          <div className="user-modal-actions">
            {onViewReports && (
              <button 
                className="user-action-btn view-reports"
                onClick={() => onViewReports(userId)}
              >
                📋 Ver Reportes
              </button>
            )}
            {onViewHistory && (
              <button 
                className="user-action-btn view-history"
                onClick={() => onViewHistory(userId)}
              >
                📜 Ver Historial
              </button>
            )}
            {onResetPassword && (
              <button 
                className="user-action-btn reset-password"
                onClick={() => onResetPassword(userId)}
              >
                🔑 Resetear Contraseña
              </button>
            )}
            {onEditUser && (
              <button 
                className="user-action-btn edit-user"
                onClick={() => onEditUser(userId)}
              >
                ✏️ Editar Usuario
              </button>
            )}
            {onDeleteUser && (
              <button 
                className="user-action-btn delete-user"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar al usuario ${user.username}?`)) {
                    onDeleteUser(userId);
                  }
                }}
              >
                🗑️ Eliminar Usuario
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserModal;

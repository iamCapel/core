import React, { useState, useEffect } from 'react';
import { reportStorage } from '../services/reportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import './UsersPage.css';
import PendingReportsModal from './PendingReportsModal';

interface User {
  username: string;
  name: string;
}

interface UsersPageProps {
  user: User;
  onBack: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastSeen: string;
  avatar?: string;
  department: string;
  reportsCount: number;
  joinDate: string;
  pendingReportsCount?: number;
  currentLocation: {
    province: string;
    municipality: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    lastUpdated: string;
  };
}

interface UserReport {
  id: string;
  title: string;
  date: string;
  status: 'Completado' | 'En Progreso' | 'Pendiente';
  province: string;
  type: string;
}

const UsersPage: React.FC<UsersPageProps> = ({ user, onBack }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [gpsUpdateNotification, setGpsUpdateNotification] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedPendingReport, setSelectedPendingReport] = useState<UserReport | null>(null);
  const [showPendingReportPreview, setShowPendingReportPreview] = useState(false);
  
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
    alert('Función de continuar reporte desde UsersPage - redirigir a formulario');
    setShowPendingModal(false);
  };

  const handleCancelPendingReport = (reportId: string) => {
    pendingReportStorage.deletePendingReport(reportId);
    updatePendingCount();
    setShowPendingModal(false);
    setTimeout(() => setShowPendingModal(true), 100);
  };

  // Generar usuarios mock al cargar y calcular pendingReportsCount desde pendingReportStorage
  useEffect(() => {
    const mockUsers: UserProfile[] = [
      {
        id: 'user-001',
        username: 'juan.perez',
        name: 'Juan Pérez',
        email: 'juan.perez@mopc.gov.py',
        role: 'Supervisor',
        isActive: true,
        lastSeen: 'Hace 5 minutos',
        department: 'Departamento de Obras Viales',
        reportsCount: 45,
        joinDate: '2024-01-15',
        currentLocation: {
          province: 'Central',
          municipality: 'Asunción',
          coordinates: { lat: -25.2637, lng: -57.5759 },
          lastUpdated: 'Hace 10 minutos'
        }
      },
      {
        id: 'user-002',
        username: 'maria.gonzalez',
        name: 'María González',
        email: 'maria.gonzalez@mopc.gov.py',
        role: 'Técnico',
        isActive: true,
        lastSeen: 'Hace 15 minutos',
        department: 'Departamento de Infraestructura',
        reportsCount: 32,
        joinDate: '2024-02-20',
        currentLocation: {
          province: 'Alto Paraná',
          municipality: 'Ciudad del Este',
          coordinates: { lat: -25.5138, lng: -54.6158 },
          lastUpdated: 'Hace 20 minutos'
        }
      },
      {
        id: 'user-003',
        username: 'carlos.rodriguez',
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@mopc.gov.py',
        role: 'Técnico',
        isActive: true,
        lastSeen: 'Hace 30 minutos',
        department: 'Departamento de Mantenimiento',
        reportsCount: 28,
        joinDate: '2023-11-10',
        currentLocation: {
          province: 'Itapúa',
          municipality: 'Encarnación',
          coordinates: { lat: -27.3300, lng: -55.8663 },
          lastUpdated: 'Hace 45 minutos'
        }
      },
      {
        id: 'user-004',
        username: 'ana.martinez',
        name: 'Ana Martínez',
        email: 'ana.martinez@mopc.gov.py',
        role: 'Supervisor',
        isActive: false,
        lastSeen: 'Hace 2 días',
        department: 'Departamento de Obras Viales',
        reportsCount: 18,
        joinDate: '2024-03-05',
        currentLocation: {
          province: 'Cordillera',
          municipality: 'Caacupé',
          coordinates: { lat: -25.3864, lng: -57.1439 },
          lastUpdated: 'Hace 2 días'
        }
      },
      {
        id: 'user-005',
        username: 'pedro.lopez',
        name: 'Pedro López',
        email: 'pedro.lopez@mopc.gov.py',
        role: 'Técnico',
        isActive: true,
        lastSeen: 'Hace 1 hora',
        department: 'Departamento de Infraestructura',
        reportsCount: 52,
        joinDate: '2023-08-12',
        currentLocation: {
          province: 'Central',
          municipality: 'Luque',
          coordinates: { lat: -25.2650, lng: -57.4942 },
          lastUpdated: 'Hace 1 hora'
        }
      }
    ];

    // Calcular pendingReportsCount para cada usuario desde pendingReportStorage
    const usersWithPendingCounts = mockUsers.map(mockUser => ({
      ...mockUser,
      pendingReportsCount: pendingReportStorage.getUserPendingReports(mockUser.username).length
    }));

    setUsers(usersWithPendingCounts);
  }, []);

  // Actualizar contador al cargar y cada vez que cambie localStorage
  useEffect(() => {
    updatePendingCount();
    
    // Actualizar pendingReportsCount de todos los usuarios periódicamente
    const updateUsersPendingCounts = () => {
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          pendingReportsCount: pendingReportStorage.getUserPendingReports(user.username).length
        }))
      );
    };
    
    const interval = setInterval(() => {
      updatePendingCount();
      updateUsersPendingCounts();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleUserClick = (clickedUser: UserProfile) => {
    setSelectedUser(clickedUser);
    
    // Cargar reportes pendientes reales del usuario desde pendingReportStorage
    const pendingReports = pendingReportStorage.getUserPendingReports(clickedUser.username);
    const formattedPendingReports: UserReport[] = pendingReports.map(report => ({
      id: report.id,
      title: report.formData.tipoIntervencion || 'Intervención',
      date: new Date(report.timestamp).toLocaleDateString(),
      status: 'Pendiente' as const,
      province: report.formData.provincia || 'N/A',
      type: report.formData.tipoIntervencion || 'No especificado'
    }));
    
    setUserReports(formattedPendingReports);
    setShowUserDetail(true);
  };

  const handleBackToUsers = () => {
    setShowUserDetail(false);
    setSelectedUser(null);
    setUserReports([]);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado': return '#28a745';
      case 'En Progreso': return '#ffc107';
      case 'Pendiente': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Simular actualización de GPS
  const simulateGPSUpdate = () => {
    if (!selectedUser) return;
    
    const paraguayLocations = [
      { province: 'Central', municipality: 'Asunción', lat: -25.2637, lng: -57.5759 },
      { province: 'Central', municipality: 'San Lorenzo', lat: -25.3371, lng: -57.5044 },
      { province: 'Central', municipality: 'Luque', lat: -25.2650, lng: -57.4942 },
      { province: 'Alto Paraná', municipality: 'Ciudad del Este', lat: -25.5138, lng: -54.6158 },
      { province: 'Itapúa', municipality: 'Encarnación', lat: -27.3300, lng: -55.8663 },
      { province: 'Cordillera', municipality: 'Caacupé', lat: -25.3864, lng: -57.1439 },
      { province: 'Paraguarí', municipality: 'Paraguarí', lat: -25.6117, lng: -57.1286 },
      { province: 'Ñeembucú', municipality: 'Pilar', lat: -26.8667, lng: -58.3000 },
    ];
    
    const randomLocation = paraguayLocations[Math.floor(Math.random() * paraguayLocations.length)];
    
    const updatedUser = {
      ...selectedUser,
      currentLocation: {
        ...randomLocation,
        coordinates: { lat: randomLocation.lat, lng: randomLocation.lng },
        lastUpdated: 'Ahora'
      }
    };
    
    setSelectedUser(updatedUser);
    
    // Actualizar también en la lista de usuarios
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      )
    );
    
    // Mostrar notificación temporal
    setGpsUpdateNotification(`📍 GPS actualizado: ${randomLocation.province}, ${randomLocation.municipality}`);
    setTimeout(() => {
      setGpsUpdateNotification('');
    }, 3000);
  };

  const activeUsers = users.filter(u => u.isActive);
  const inactiveUsers = users.filter(u => !u.isActive);
  const usersWithPendingReports = users.filter(u => u.pendingReportsCount && u.pendingReportsCount > 0);

  // Filtrar usuarios en búsqueda del modal de administración
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showUserDetail && selectedUser) {
    return (
      <div className="users-page">
        <div className="users-header">
          <div className="header-left">
            <button className="back-button" onClick={handleBackToUsers}>
              ← Volver a Usuarios
            </button>
            <h1 className="page-title">
              👤 Perfil de Usuario
            </h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="welcome-text">Bienvenido, {user.name}</span>
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            </div>
            {/* Ícono de notificaciones - posicionado a la derecha */}
            <div className="notification-container" style={{ position: 'relative', cursor: 'pointer', marginLeft: '15px' }}>
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
        </div>

        {/* Notificación de GPS */}
        {gpsUpdateNotification && (
          <div className="gps-notification">
            {gpsUpdateNotification}
          </div>
        )}

        <div className="user-detail-content">
          <div className="user-profile-card">
            <div className="profile-header">
              <div className="profile-avatar-container">
                <div className="profile-avatar">
                  {getInitials(selectedUser.name)}
                </div>
                <div className={`status-indicator ${selectedUser.isActive ? 'active' : 'inactive'}`}></div>
              </div>
              <div className="profile-info">
                <h2 className="profile-name">{selectedUser.name}</h2>
                <p className="profile-location">📍 {selectedUser.currentLocation.province}, {selectedUser.currentLocation.municipality}</p>
                <p className="profile-department">{selectedUser.department}</p>
                <div className="profile-status">
                  <span className={`status-badge ${selectedUser.isActive ? 'active' : 'inactive'}`}>
                    {selectedUser.isActive ? '🟢 Activo' : '⚫ Inactivo'}
                  </span>
                  <span className="last-seen">Última vez: {selectedUser.lastSeen}</span>
                </div>
              </div>
            </div>

            <div className="profile-details">
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{selectedUser.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Usuario:</span>
                <span className="detail-value">{selectedUser.username}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fecha de ingreso:</span>
                <span className="detail-value">{new Date(selectedUser.joinDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reportes totales:</span>
                <span className="detail-value">{selectedUser.reportsCount}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📍 Ubicación actual:</span>
                <span className="detail-value">{selectedUser.currentLocation.province}, {selectedUser.currentLocation.municipality}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🌐 Coordenadas GPS:</span>
                <span className="detail-value">{selectedUser.currentLocation.coordinates.lat.toFixed(4)}, {selectedUser.currentLocation.coordinates.lng.toFixed(4)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🕒 GPS actualizado:</span>
                <span className="detail-value">{selectedUser.currentLocation.lastUpdated}</span>
              </div>
            </div>
            
            {/* Botón de simulación GPS */}
            <div className="gps-simulation">
              <button className="gps-update-button" onClick={simulateGPSUpdate}>
                🔄 Simular Actualización GPS
              </button>
              <p className="gps-note">Haz clic para simular un cambio de ubicación GPS del usuario</p>
            </div>
          </div>

          <div className="user-reports-section">
            <h3 className="reports-title">📋 Reportes del Usuario ({userReports.length})</h3>
            
            {userReports.length > 0 ? (
              <div className="reports-grid">
                {userReports.map((report) => (
                  <div key={report.id} className="report-card">
                    <div className="report-header">
                      <h4 className="report-title">{report.title}</h4>
                      <span 
                        className="report-status"
                        style={{ backgroundColor: getStatusColor(report.status) }}
                      >
                        {report.status}
                      </span>
                    </div>
                    <div className="report-details">
                      <div className="report-detail">
                        <span className="detail-icon">📅</span>
                        <span>{new Date(report.date).toLocaleDateString()}</span>
                      </div>
                      <div className="report-detail">
                        <span className="detail-icon">📍</span>
                        <span>{report.province}</span>
                      </div>
                      <div className="report-detail">
                        <span className="detail-icon">🔖</span>
                        <span>{report.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-reports">
                <div className="no-reports-icon">📝</div>
                <p>Este usuario aún no ha creado reportes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      {/* Topbar compacto y fijo */}
      <div className="users-topbar">
        <button className="topbar-back-button" onClick={onBack}>
          <span className="back-icon">←</span>
          <span>Volver</span>
        </button>
        <div className="topbar-divider"></div>
        <h1 className="topbar-title">👥 Gestión de Usuarios</h1>
        <div className="topbar-spacer"></div>
        <div className="topbar-notification notification-container" style={{ position: 'relative' }}>
          <img 
            src="/images/notification-bell-icon.svg" 
            alt="Notificaciones" 
            className="notification-icon"
            onClick={() => setShowPendingModal(true)}
            style={{ 
              cursor: 'pointer',
              animation: pendingCount > 0 ? 'bellShake 0.5s ease-in-out infinite alternate' : 'none'
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

      {/* Contenedor principal agrupado */}
      <div className="users-main-container">
        {/* Panel de control - Acciones principales */}
        <div className="users-control-panel">
          <div className="control-panel-header">
            <h2 className="control-title">Panel de Control</h2>
            <p className="control-description">Gestiona y administra los usuarios del sistema</p>
          </div>
          <div className="control-actions">
            <button className="action-button create-user-btn" onClick={() => setShowCreateUserModal(true)}>
              <span className="action-icon">➕</span>
              <span className="action-text">Crear Usuario</span>
            </button>
            <button className="action-button admin-user-btn" onClick={() => setShowAdminUserModal(true)}>
              <span className="action-icon">⚙️</span>
              <span className="action-text">Administrar Usuario</span>
            </button>
          </div>
        </div>      <div className="users-content">
        {/* Usuarios Activos */}
        <div className="users-section">
          <div className="section-header">
            <h2 className="section-title">🟢 Usuarios Activos ({activeUsers.length})</h2>
            <p className="section-description">
              Usuarios conectados actualmente al sistema
            </p>
          </div>

          <div className="users-grid">
            {activeUsers.map((userProfile) => (
              <div 
                key={userProfile.id} 
                className="user-card active"
                onClick={() => handleUserClick(userProfile)}
              >
                <div className="user-avatar-container">
                  <div className="user-avatar-circle">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt={userProfile.name} />
                    ) : (
                      <span className="user-initials">{getInitials(userProfile.name)}</span>
                    )}
                  </div>
                  <div className="status-indicator active"></div>
                </div>
                <div className="user-details">
                  <h3 className="user-name">{userProfile.name}</h3>
                  <p className="user-location">📍 {userProfile.currentLocation.province}, {userProfile.currentLocation.municipality}</p>
                  <p className="user-department">{userProfile.department}</p>
                  <div className="user-stats">
                    <span className="reports-count">📋 {userProfile.reportsCount} reportes</span>
                    <span className="last-seen">⏰ {userProfile.lastSeen}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usuarios Inactivos */}
        <div className="users-section">
          <div className="section-header">
            <h2 className="section-title">⚫ Usuarios Inactivos ({inactiveUsers.length})</h2>
            <p className="section-description">
              Usuarios desconectados del sistema
            </p>
          </div>

          <div className="users-grid">
            {inactiveUsers.map((userProfile) => (
              <div 
                key={userProfile.id} 
                className="user-card inactive"
                onClick={() => handleUserClick(userProfile)}
              >
                <div className="user-avatar-container">
                  <div className="user-avatar-circle">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt={userProfile.name} />
                    ) : (
                      <span className="user-initials">{getInitials(userProfile.name)}</span>
                    )}
                  </div>
                  <div className="status-indicator inactive"></div>
                </div>
                <div className="user-details">
                  <h3 className="user-name">{userProfile.name}</h3>
                  <p className="user-location">📍 {userProfile.currentLocation.province}, {userProfile.currentLocation.municipality}</p>
                  <p className="user-department">{userProfile.department}</p>
                  <div className="user-stats">
                    <span className="reports-count">📋 {userProfile.reportsCount} reportes</span>
                    <span className="last-seen">⏰ {userProfile.lastSeen}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usuarios con Reportes Pendientes */}
        <div className="users-section">
          <div className="section-header">
            <h2 className="section-title">⚠️ Usuarios con Reportes Pendientes ({usersWithPendingReports.length})</h2>
            <p className="section-description">
              Usuarios que tienen reportes en progreso por completar
            </p>
          </div>

          <div className="users-grid">
            {usersWithPendingReports.map((userProfile) => (
              <div 
                key={userProfile.id} 
                className="user-card pending"
                onClick={() => handleUserClick(userProfile)}
              >
                <div className="user-avatar-container">
                  <div className="user-avatar-circle">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt={userProfile.name} />
                    ) : (
                      <span className="user-initials">{getInitials(userProfile.name)}</span>
                    )}
                  </div>
                  <div className="status-indicator pending"></div>
                </div>
                <div className="user-details">
                  <h3 className="user-name">{userProfile.name}</h3>
                  <p className="user-location">📍 {userProfile.currentLocation.province}, {userProfile.currentLocation.municipality}</p>
                  <p className="user-department">{userProfile.department}</p>
                  <div className="user-stats">
                    <span className="reports-count">📋 {userProfile.reportsCount} reportes</span>
                    <span className="pending-count" style={{ color: '#ff9800', fontWeight: 'bold' }}>
                      ⚠️ {userProfile.pendingReportsCount} pendientes
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      
      {/* Modal de Crear Usuario */}
      {showCreateUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '500px',
            maxHeight: '90vh',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Botón de cerrar (X) */}
            <button 
              onClick={() => setShowCreateUserModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#6c757d',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.color = '#495057';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.color = '#6c757d';
              }}
            >
              ×
            </button>
            
            {/* Formulario de Crear Usuario */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  margin: '0 0 20px 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  Crear Nuevo Usuario
                </h2>
                
                <div style={{
                  display: 'grid',
                  gap: '15px'
                }}>
                  {/* Nombres */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Nombres
                    </label>
                    <input
                      type="text"
                      placeholder="Ingrese los nombres"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Apellidos */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Apellidos
                    </label>
                    <input
                      type="text"
                      placeholder="Ingrese los apellidos"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Número de Cédula */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Número de Cédula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 12345678-9"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Usuario */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Usuario
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre de usuario"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Contraseña
                    </label>
                    <input
                      type="password"
                      placeholder="Ingrese la contraseña"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Nivel de Usuario */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Nivel de Usuario
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'white',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Seleccionar nivel...</option>
                      <option value="TECNICO">Técnico</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '20px'
              }}>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a6268';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6c757d';
                  }}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007bff';
                  }}
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Administrar Usuario */}
      {showAdminUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '600px',
            maxHeight: '90vh',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Botón de cerrar (X) */}
            <button 
              onClick={() => {
                setShowAdminUserModal(false);
                setSearchQuery('');
                setSelectedAdminUser(null);
                setEditingUser(null);
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#6c757d',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.color = '#495057';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.color = '#6c757d';
              }}
            >
              ×
            </button>
            
            {/* Contenido del Modal */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h2 style={{
                margin: '0 0 10px 0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#333',
                textAlign: 'center'
              }}>
                Administrar Usuarios
              </h2>
              
              {/* Barra de búsqueda */}
              <div style={{
                position: 'relative',
                width: '100%'
              }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar usuario por nombre, usuario o correo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              {/* Lista de usuarios filtrados */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {!selectedAdminUser ? (
                  <>
                    {users
                      .filter(u => 
                        searchQuery === '' ||
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(userItem => (
                        <div
                          key={userItem.id}
                          style={{
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '2px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                            e.currentTarget.style.borderColor = '#007bff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                          onClick={() => {
                            // Cargar los datos del usuario para editar
                            setSelectedAdminUser(userItem);
                            setEditingUser({ ...userItem });
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Avatar */}
                            <div style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '50%',
                              backgroundColor: '#007bff',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              flexShrink: 0
                            }}>
                              {getInitials(userItem.name)}
                            </div>
                            
                            {/* Información del usuario */}
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: '600',
                                fontSize: '15px',
                                color: '#2c3e50',
                                marginBottom: '3px'
                              }}>
                                {userItem.name}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: '#6c757d'
                              }}>
                                @{userItem.username} • {userItem.email}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#495057',
                                marginTop: '3px'
                              }}>
                                {userItem.role} • {userItem.department}
                              </div>
                            </div>

                            {/* Estado activo */}
                            <div style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: userItem.isActive ? '#d4edda' : '#f8d7da',
                              color: userItem.isActive ? '#155724' : '#721c24'
                            }}>
                              {userItem.isActive ? 'Activo' : 'Inactivo'}
                            </div>
                          </div>
                        </div>
                      ))}
                  
                    {/* Mensaje si no hay resultados */}
                    {users.filter(u => 
                      searchQuery === '' ||
                      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px'
                      }}>
                        No se encontraron usuarios que coincidan con la búsqueda
                      </div>
                    )}
                  </>
                ) : (
                  /* Panel de edición del usuario */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Botón de volver */}
                    <button
                      onClick={() => {
                        setSelectedAdminUser(null);
                        setEditingUser(null);
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 15px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5a6268';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                      }}
                    >
                      ← Volver a la lista
                    </button>

                    {/* Datos editables del usuario */}
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px'
                    }}>
                      <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>
                        Información del Usuario
                      </h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {/* Nombre */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Nombre completo
                          </label>
                          <input
                            type="text"
                            value={editingUser?.name || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Usuario */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Usuario
                          </label>
                          <input
                            type="text"
                            value={editingUser?.username || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Correo electrónico
                          </label>
                          <input
                            type="email"
                            value={editingUser?.email || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Rol */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Rol
                          </label>
                          <input
                            type="text"
                            value={editingUser?.role || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Departamento */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Departamento
                          </label>
                          <input
                            type="text"
                            value={editingUser?.department || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, department: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Estado */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Estado
                          </label>
                          <select
                            value={editingUser?.isActive ? 'true' : 'false'}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, isActive: e.target.value === 'true' } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: 'white',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Reportes del usuario */}
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px'
                    }}>
                      <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '18px' }}>
                        Reportes del Usuario (0)
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#6c757d',
                          fontSize: '13px'
                        }}>
                          Este usuario no tiene reportes registrados
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => {
                          // Guardar cambios
                          if (editingUser) {
                            setUsers(prevUsers => 
                              prevUsers.map(u => u.id === editingUser.id ? editingUser : u)
                            );
                            alert('Cambios guardados exitosamente');
                            setSelectedAdminUser(null);
                            setEditingUser(null);
                          }
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#218838';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#28a745';
                        }}
                      >
                        Guardar Cambios
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
                            setUsers(prevUsers => prevUsers.filter(u => u.id !== selectedAdminUser.id));
                            alert('Usuario eliminado exitosamente');
                            setSelectedAdminUser(null);
                            setEditingUser(null);
                          }
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#c82333';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc3545';
                        }}
                      >
                        Eliminar Usuario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
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

export default UsersPage;
import React, { useState, useEffect } from 'react';
import './UsersPage.css';

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
  const [gpsUpdateNotification, setGpsUpdateNotification] = useState('');

  // Datos simulados de usuarios con geolocalización
  const mockUsers: UserProfile[] = [
    {
      id: 'u1',
      username: 'carlos.martinez',
      name: 'Carlos Martínez',
      email: 'carlos.martinez@mopc.gov.py',
      role: 'Supervisor de Obras',
      isActive: true,
      lastSeen: 'Ahora',
      department: 'Infraestructura Vial',
      reportsCount: 23,
      joinDate: '2024-01-15',
      currentLocation: {
        province: 'Central',
        municipality: 'Asunción',
        coordinates: { lat: -25.2637, lng: -57.5759 },
        lastUpdated: 'Hace 2 min'
      }
    },
    {
      id: 'u2',
      username: 'maria.gonzalez',
      name: 'María González',
      email: 'maria.gonzalez@mopc.gov.py',
      role: 'Ingeniera Civil',
      isActive: true,
      lastSeen: 'Hace 5 min',
      department: 'Proyectos Especiales',
      reportsCount: 18,
      joinDate: '2024-02-20',
      currentLocation: {
        province: 'Central',
        municipality: 'San Lorenzo',
        coordinates: { lat: -25.3371, lng: -57.5044 },
        lastUpdated: 'Hace 5 min'
      }
    },
    {
      id: 'u3',
      username: 'admin',
      name: 'Administrador Sistema',
      email: 'admin@mopc.gov.py',
      role: 'Administrador',
      isActive: true,
      lastSeen: 'Ahora',
      department: 'Tecnología',
      reportsCount: 45,
      joinDate: '2023-12-01',
      currentLocation: {
        province: 'Central',
        municipality: 'Asunción',
        coordinates: { lat: -25.2637, lng: -57.5759 },
        lastUpdated: 'Ahora'
      }
    },
    {
      id: 'u4',
      username: 'jose.rodriguez',
      name: 'José Rodríguez',
      email: 'jose.rodriguez@mopc.gov.py',
      role: 'Técnico de Campo',
      isActive: false,
      lastSeen: 'Hace 2 horas',
      department: 'Mantenimiento',
      reportsCount: 31,
      joinDate: '2024-03-10',
      currentLocation: {
        province: 'Alto Paraná',
        municipality: 'Ciudad del Este',
        coordinates: { lat: -25.5138, lng: -54.6158 },
        lastUpdated: 'Hace 2 horas'
      }
    },
    {
      id: 'u5',
      username: 'ana.lopez',
      name: 'Ana López',
      email: 'ana.lopez@mopc.gov.py',
      role: 'Coordinadora Regional',
      isActive: false,
      lastSeen: 'Ayer',
      department: 'Gestión Regional',
      reportsCount: 27,
      joinDate: '2024-01-25',
      currentLocation: {
        province: 'Itapúa',
        municipality: 'Encarnación',
        coordinates: { lat: -27.3300, lng: -55.8663 },
        lastUpdated: 'Ayer'
      }
    },
    {
      id: 'u6',
      username: 'pedro.silva',
      name: 'Pedro Silva',
      email: 'pedro.silva@mopc.gov.py',
      role: 'Inspector de Calidad',
      isActive: true,
      lastSeen: 'Hace 1 min',
      department: 'Control de Calidad',
      reportsCount: 19,
      joinDate: '2024-04-05',
      currentLocation: {
        province: 'Central',
        municipality: 'Luque',
        coordinates: { lat: -25.2650, lng: -57.4942 },
        lastUpdated: 'Hace 1 min'
      }
    },
    {
      id: 'u7',
      username: 'lucia.fernandez',
      name: 'Lucía Fernández',
      email: 'lucia.fernandez@mopc.gov.py',
      role: 'Analista de Datos',
      isActive: false,
      lastSeen: 'Hace 3 días',
      department: 'Planificación',
      reportsCount: 12,
      joinDate: '2024-05-12',
      currentLocation: {
        province: 'Cordillera',
        municipality: 'Caacupé',
        coordinates: { lat: -25.3864, lng: -57.1439 },
        lastUpdated: 'Hace 3 días'
      }
    },
    {
      id: 'u8',
      username: 'miguel.torres',
      name: 'Miguel Torres',
      email: 'miguel.torres@mopc.gov.py',
      role: 'Jefe de Proyecto',
      isActive: true,
      lastSeen: 'Hace 15 min',
      department: 'Gestión de Proyectos',
      reportsCount: 34,
      joinDate: '2023-11-20',
      currentLocation: {
        province: 'Paraguarí',
        municipality: 'Paraguarí',
        coordinates: { lat: -25.6117, lng: -57.1286 },
        lastUpdated: 'Hace 15 min'
      }
    }
  ];

  // Datos simulados de reportes por usuario
  const mockReportsByUser: Record<string, UserReport[]> = {
    'u1': [
      { id: 'r1', title: 'Reparación Ruta 1 - Tramo Norte', date: '2025-10-15', status: 'Completado', province: 'Central', type: 'Mantenimiento' },
      { id: 'r2', title: 'Inspección Puente Yabebyry', date: '2025-10-10', status: 'En Progreso', province: 'Paraguarí', type: 'Inspección' },
      { id: 'r3', title: 'Evaluación Estructura Vial', date: '2025-10-05', status: 'Completado', province: 'Central', type: 'Evaluación' }
    ],
    'u2': [
      { id: 'r4', title: 'Diseño Puente Peatonal', date: '2025-10-12', status: 'En Progreso', province: 'Asunción', type: 'Diseño' },
      { id: 'r5', title: 'Supervisión Obra Civil', date: '2025-10-08', status: 'Completado', province: 'Central', type: 'Supervisión' }
    ],
    'u3': [
      { id: 'r6', title: 'Auditoría Sistemas MOPC', date: '2025-10-18', status: 'En Progreso', province: 'Asunción', type: 'Auditoría' },
      { id: 'r7', title: 'Implementación Dashboard', date: '2025-10-01', status: 'Completado', province: 'Asunción', type: 'Tecnología' },
      { id: 'r8', title: 'Backup Sistemas Críticos', date: '2025-09-28', status: 'Completado', province: 'Asunción', type: 'Mantenimiento' }
    ],
    'u4': [
      { id: 'r9', title: 'Mantenimiento Ruta 7', date: '2025-10-14', status: 'Pendiente', province: 'Caaguazú', type: 'Mantenimiento' },
      { id: 'r10', title: 'Reparación Señalización', date: '2025-10-11', status: 'Completado', province: 'Itapúa', type: 'Señalización' }
    ],
    'u5': [
      { id: 'r11', title: 'Coordinación Regional Este', date: '2025-10-13', status: 'En Progreso', province: 'Alto Paraná', type: 'Coordinación' },
      { id: 'r12', title: 'Planificación Trimestral', date: '2025-10-09', status: 'Completado', province: 'Itapúa', type: 'Planificación' }
    ],
    'u6': [
      { id: 'r13', title: 'Control Calidad Pavimento', date: '2025-10-16', status: 'En Progreso', province: 'Central', type: 'Control de Calidad' },
      { id: 'r14', title: 'Inspección Materiales', date: '2025-10-07', status: 'Completado', province: 'Asunción', type: 'Inspección' }
    ],
    'u7': [
      { id: 'r15', title: 'Análisis Estadístico Obras', date: '2025-10-06', status: 'Completado', province: 'Asunción', type: 'Análisis' },
      { id: 'r16', title: 'Reporte Mensual KPIs', date: '2025-09-30', status: 'Completado', province: 'Asunción', type: 'Reporte' }
    ],
    'u8': [
      { id: 'r17', title: 'Gestión Proyecto Ruta 2', date: '2025-10-17', status: 'En Progreso', province: 'Central', type: 'Gestión' },
      { id: 'r18', title: 'Seguimiento Cronograma', date: '2025-10-14', status: 'Completado', province: 'Central', type: 'Seguimiento' },
      { id: 'r19', title: 'Reunión Stakeholders', date: '2025-10-12', status: 'Completado', province: 'Asunción', type: 'Reunión' }
    ]
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setUsers(mockUsers);
  }, []);

  const handleUserClick = (clickedUser: UserProfile) => {
    setSelectedUser(clickedUser);
    setUserReports(mockReportsByUser[clickedUser.id] || []);
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
      <div className="users-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 className="page-title">
            👥 Gestión de Usuarios
          </h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="welcome-text">Bienvenido, {user.name}</span>
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="users-content">
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

        {/* Estadísticas generales */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>Total Usuarios</h3>
                <p className="stat-value">{users.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🟢</div>
              <div className="stat-info">
                <h3>Usuarios Activos</h3>
                <p className="stat-value">{activeUsers.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚫</div>
              <div className="stat-info">
                <h3>Usuarios Inactivos</h3>
                <p className="stat-value">{inactiveUsers.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <h3>Reportes Totales</h3>
                <p className="stat-value">{users.reduce((sum, u) => sum + u.reportsCount, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
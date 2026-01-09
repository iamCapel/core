import React, { useState, useEffect } from 'react';
import { reportStorage } from '../services/reportStorage';
import { pendingReportStorage } from '../services/pendingReportStorage';
import { userStorage } from '../services/userStorage';
import * as firebaseUserStorage from '../services/firebaseUserStorage';
import { sendWelcomeEmail } from '../services/emailService';
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
  isVerified?: boolean;
  lastSeen: string;
  avatar?: string;
  department: string;
  reportsCount: number;
  joinDate: string;
  pendingReportsCount?: number;
  password?: string;  // Contraseña (opcional para edición)
  cedula?: string;  // Número de cédula
  notes?: Array<{
    id: string;
    tipo: string;
    contenido: string;
    creadoPor: string;
    fecha: string;
  }>;
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
  
  // Estados para el formulario de crear usuario
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    cedula: '',
    role: 'Técnico'
  });
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
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

  // Cargar usuarios desde Firebase
  useEffect(() => {
    const loadUsers = async () => {
      const loadedUsers = await firebaseUserStorage.getAllUsers();
      
      // Calcular pendingReportsCount para cada usuario desde pendingReportStorage
      const usersWithPendingCounts = loadedUsers.map(user => ({
        ...user,
        pendingReportsCount: pendingReportStorage.getUserPendingReports(user.username).length
      }));

      setUsers(usersWithPendingCounts);
    };
    
    loadUsers();
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

  const handleCreateUser = async () => {
    // Validar campos obligatorios
    if (!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.email.trim()) {
      alert('Por favor complete todos los campos obligatorios (Nombre, Usuario, Contraseña, Email)');
      return;
    }

    // Validar que el username no exista
    const existingUser = await firebaseUserStorage.getUserByUsername(newUserForm.username);
    if (existingUser) {
      alert('El nombre de usuario ya existe. Por favor elija otro.');
      return;
    }

    try {
      // Crear el usuario en Firebase con Authentication + Firestore
      const result = await firebaseUserStorage.createUser({
        username: newUserForm.username,
        name: newUserForm.name,
        email: newUserForm.email,
        phone: newUserForm.phone,
        cedula: newUserForm.cedula,
        role: newUserForm.role,
        department: 'Sin asignar',
        isActive: true,
        isVerified: false,
        lastSeen: 'Ahora',
        joinDate: new Date().toISOString(),
        currentLocation: {
          province: 'Sin asignar',
          municipality: 'Sin asignar',
          coordinates: {
            lat: -25.2637,
            lng: -57.5759
          },
          lastUpdated: new Date().toISOString()
        },
        reportsCount: 0,
        notes: []
      }, newUserForm.password);

      if (!result.success) {
        alert(`Error creando usuario: ${result.error}`);
        return;
      }

      // Enviar email de bienvenida al nuevo usuario
      console.log('📧 Enviando email de bienvenida...');
      const emailResult = await sendWelcomeEmail({
        name: newUserForm.name,
        username: newUserForm.username,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role
      });

      if (emailResult.success) {
        console.log('✅ Email enviado correctamente');
      } else {
        console.warn('⚠️ No se pudo enviar el email:', emailResult.error);
      }

      // Mostrar animación de éxito
      setShowSuccessAnimation(true);

      // Recargar la lista de usuarios
      setTimeout(async () => {
        const loadedUsers = await firebaseUserStorage.getAllUsers();
        const usersWithPendingCounts = loadedUsers.map(u => ({
          ...u,
          pendingReportsCount: pendingReportStorage.getUserPendingReports(u.username).length
        }));
        setUsers(usersWithPendingCounts);

        // Cerrar modal después de la animación
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setShowCreateUserModal(false);
          // Resetear formulario
          setNewUserForm({
            name: '',
            username: '',
            password: '',
            email: '',
            phone: '',
            cedula: '',
            role: 'Técnico'
          });
        }, 1500);
      }, 500);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear el usuario. Por favor intente nuevamente.');
    }
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

  // Modo de vista de agrupación
  const [groupingMode, setGroupingMode] = useState<'estado' | 'rendimiento' | 'asignaciones'>('rendimiento');
  
  // Estados para asignaciones
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedUserForNotes, setSelectedUserForNotes] = useState<UserProfile | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'observacion' | 'amonestacion' | 'pendiente'>('observacion');

  // Agrupar usuarios por estado
  const activeUsers = users.filter(u => u.isActive);
  const inactiveUsers = users.filter(u => !u.isActive);
  const usersWithPendingReports = users.filter(u => u.pendingReportsCount && u.pendingReportsCount > 0);

  // Agrupar usuarios por rol
  const usersByRole = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, UserProfile[]>);

  // Agrupar usuarios por departamento
  const usersByDepartment = users.reduce((acc, user) => {
    if (!acc[user.department]) {
      acc[user.department] = [];
    }
    acc[user.department].push(user);
    return acc;
  }, {} as Record<string, UserProfile[]>);

  // Agrupar usuarios por provincia
  const usersByProvince = users.reduce((acc, user) => {
    const province = user.currentLocation?.province || 'Sin asignar';
    if (!acc[province]) {
      acc[province] = [];
    }
    acc[province].push(user);
    return acc;
  }, {} as Record<string, UserProfile[]>);

  // Ranking de usuarios por rendimiento (reportes registrados)
  const usersByPerformance = [...users].sort((a, b) => b.reportsCount - a.reportsCount);
  const maxReports = Math.max(...users.map(u => u.reportsCount), 1);

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
                <p className="profile-location">📍 {selectedUser.currentLocation?.province || 'Sin asignar'}, {selectedUser.currentLocation?.municipality || 'Sin asignar'}</p>
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
                <span className="detail-value">{selectedUser.currentLocation?.province || 'Sin asignar'}, {selectedUser.currentLocation?.municipality || 'Sin asignar'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🌐 Coordenadas GPS:</span>
                <span className="detail-value">{selectedUser.currentLocation?.coordinates?.lat.toFixed(4) || 'N/A'}, {selectedUser.currentLocation?.coordinates?.lng.toFixed(4) || 'N/A'}</span>
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
            <h2 className="control-title">Panel de Control de Usuarios</h2>
            <p className="control-description">Gestiona y administra los usuarios del sistema</p>
          </div>
          
          {/* Selector de modo de agrupación */}
          <div className="grouping-selector">
            <label className="grouping-label">Visualizar por:</label>
            <div className="grouping-buttons">
              <button 
                className={`grouping-btn ${groupingMode === 'rendimiento' ? 'active' : ''}`}
                onClick={() => setGroupingMode('rendimiento')}
              >
                <span className="btn-icon">📊</span>
                <span>Rendimiento</span>
              </button>
              <button 
                className={`grouping-btn ${groupingMode === 'asignaciones' ? 'active' : ''}`}
                onClick={() => setGroupingMode('asignaciones')}
              >
                <span className="btn-icon">📝</span>
                <span>Asignaciones</span>
              </button>
              <button 
                className={`grouping-btn ${groupingMode === 'estado' ? 'active' : ''}`}
                onClick={() => setGroupingMode('estado')}
              >
                <span className="btn-icon">🔄</span>
                <span>Estado</span>
              </button>
            </div>
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
        </div>

      <div className="users-content">
        {/* Modo: Ranking de Rendimiento */}
        {groupingMode === 'rendimiento' && (
          <div className="users-section">
            <div className="section-header">
              <h2 className="section-title">
                📊 Ranking de Rendimiento
              </h2>
              <p className="section-description">
                Clasificación de usuarios según reportes registrados
              </p>
            </div>

            <div className="performance-ranking">
              {usersByPerformance.map((userProfile, index) => {
                const percentage = (userProfile.reportsCount / maxReports) * 100;
                return (
                  <div 
                    key={userProfile.id} 
                    className="performance-item"
                    onClick={() => handleUserClick(userProfile)}
                  >
                    <div className="performance-rank">
                      <span className={`rank-badge rank-${index + 1}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </div>

                    <div className="performance-user-info">
                      <div className="user-avatar-small">
                        {userProfile.avatar ? (
                          <img src={userProfile.avatar} alt={userProfile.name} />
                        ) : (
                          <span className="user-initials-small">{getInitials(userProfile.name)}</span>
                        )}
                        <div className={`status-dot ${userProfile.isActive ? 'active' : 'inactive'}`}></div>
                      </div>
                      
                      <div className="performance-details">
                        <div className="performance-header">
                          <h3 className="performance-name">{userProfile.name}</h3>
                          <span className="performance-role-badge">{userProfile.role}</span>
                        </div>
                        <p className="performance-location">
                          📍 {userProfile.currentLocation?.province || 'Sin asignar'} • {userProfile.department}
                        </p>
                        
                        <div className="performance-bar-container">
                          <div className="performance-bar-bg">
                            <div 
                              className="performance-bar-fill"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="performance-bar-label">
                                {userProfile.reportsCount} reportes
                              </span>
                            </div>
                          </div>
                          <span className="performance-percentage">{percentage.toFixed(0)}%</span>
                        </div>

                        {userProfile.pendingReportsCount !== undefined && userProfile.pendingReportsCount > 0 && (
                          <div className="performance-pending">
                            ⚠️ {userProfile.pendingReportsCount} reporte{userProfile.pendingReportsCount > 1 ? 's' : ''} pendiente{userProfile.pendingReportsCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modo: Asignaciones y Notas */}
        {groupingMode === 'asignaciones' && (
          <div className="users-section">
            <div className="section-header">
              <h2 className="section-title">
                📝 Asignaciones y Observaciones
              </h2>
              <p className="section-description">
                Busca usuarios para agregar notas, observaciones, amonestaciones o pendientes
              </p>
            </div>

            <div className="assignments-container">
              {/* Buscador de usuarios */}
              <div className="user-search-panel">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="user-search-input"
                    placeholder="Buscar usuario por nombre, email o departamento..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                  />
                  {searchUserQuery && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => setSearchUserQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista de usuarios filtrados */}
                <div className="filtered-users-list">
                  {users
                    .filter(u => 
                      searchUserQuery === '' || 
                      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                      u.department.toLowerCase().includes(searchUserQuery.toLowerCase())
                    )
                    .map((userProfile) => (
                      <div
                        key={userProfile.id}
                        className={`search-user-item ${selectedUserForNotes?.id === userProfile.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedUserForNotes(userProfile);
                          setNoteText('');
                        }}
                      >
                        <div className="search-user-avatar">
                          {userProfile.avatar ? (
                            <img src={userProfile.avatar} alt={userProfile.name} />
                          ) : (
                            <span className="search-user-initials">{getInitials(userProfile.name)}</span>
                          )}
                          <div className={`search-status-dot ${userProfile.isActive ? 'active' : 'inactive'}`}></div>
                        </div>
                        <div className="search-user-info">
                          <h4 className="search-user-name">{userProfile.name}</h4>
                          <p className="search-user-details">{userProfile.role} • {userProfile.department}</p>
                        </div>
                        <span className="search-user-arrow">→</span>
                      </div>
                    ))}
                  {users.filter(u => 
                    searchUserQuery === '' || 
                    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                    u.department.toLowerCase().includes(searchUserQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="no-users-found">
                      <span className="no-users-icon">🔍</span>
                      <p>No se encontraron usuarios</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel de notas/observaciones */}
              <div className="notes-panel">
                {selectedUserForNotes ? (
                  <>
                    <div className="notes-panel-header">
                      <div className="selected-user-info">
                        <div className="selected-user-avatar-large">
                          {selectedUserForNotes.avatar ? (
                            <img src={selectedUserForNotes.avatar} alt={selectedUserForNotes.name} />
                          ) : (
                            <span className="selected-user-initials-large">{getInitials(selectedUserForNotes.name)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="selected-user-name">{selectedUserForNotes.name}</h3>
                          <p className="selected-user-role">{selectedUserForNotes.role}</p>
                          <p className="selected-user-department">{selectedUserForNotes.department}</p>
                        </div>
                      </div>
                    </div>

                    {/* Formulario de notas */}
                    <div className="note-form">
                      <label className="note-type-label">Tipo de registro:</label>
                      <div className="note-type-selector">
                        <button
                          className={`note-type-btn ${noteType === 'observacion' ? 'active' : ''}`}
                          onClick={() => setNoteType('observacion')}
                        >
                          <span className="note-type-icon">👁️</span>
                          <span>Observación</span>
                        </button>
                        <button
                          className={`note-type-btn ${noteType === 'amonestacion' ? 'active' : ''}`}
                          onClick={() => setNoteType('amonestacion')}
                        >
                          <span className="note-type-icon">⚠️</span>
                          <span>Amonestación</span>
                        </button>
                        <button
                          className={`note-type-btn ${noteType === 'pendiente' ? 'active' : ''}`}
                          onClick={() => setNoteType('pendiente')}
                        >
                          <span className="note-type-icon">📌</span>
                          <span>Pendiente</span>
                        </button>
                      </div>

                      <label className="note-textarea-label">
                        {noteType === 'observacion' ? 'Observación:' : 
                         noteType === 'amonestacion' ? 'Amonestación:' : 'Pendiente:'}
                      </label>
                      <textarea
                        className="note-textarea"
                        placeholder={`Escribe aquí ${noteType === 'observacion' ? 'la observación' : noteType === 'amonestacion' ? 'la amonestación' : 'el pendiente'}...`}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={6}
                      />

                      <button 
                        className="save-note-btn"
                        onClick={() => {
                          if (noteText.trim() && selectedUserForNotes) {
                            const success = userStorage.addUserNote(
                              selectedUserForNotes.id,
                              noteType,
                              noteText.trim(),
                              user.username
                            );
                            
                            if (success) {
                              alert(`${noteType.charAt(0).toUpperCase() + noteType.slice(1)} guardada para ${selectedUserForNotes.name}`);
                              setNoteText('');
                              
                              // Actualizar el usuario en el estado
                              const updatedUser = userStorage.getUserById(selectedUserForNotes.id);
                              if (updatedUser) {
                                setSelectedUserForNotes(updatedUser);
                                setUsers(prevUsers => 
                                  prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
                                );
                              }
                            } else {
                              alert('Error al guardar la nota');
                            }
                          }
                        }}
                        disabled={!noteText.trim()}
                      >
                        <span className="save-icon">💾</span>
                        <span>Guardar {noteType}</span>
                      </button>
                    </div>

                    {/* Historial de notas */}
                    <div className="notes-history">
                      <h4 className="notes-history-title">Historial de registros</h4>
                      {selectedUserForNotes.notes && selectedUserForNotes.notes.length > 0 ? (
                        <div className="notes-history-list">
                          {selectedUserForNotes.notes.slice().reverse().map((note) => (
                            <div key={note.id} className={`note-item note-type-${note.tipo}`}>
                              <div className="note-item-header">
                                <span className="note-item-type">
                                  {note.tipo === 'observacion' ? '👁️ Observación' : 
                                   note.tipo === 'amonestacion' ? '⚠️ Amonestación' : 
                                   '📌 Pendiente'}
                                </span>
                                <span className="note-item-date">
                                  {new Date(note.fecha).toLocaleDateString('es-PY', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="note-item-content">{note.contenido}</p>
                              <p className="note-item-author">Por: {note.creadoPor}</p>
                              <button 
                                className="delete-note-btn"
                                onClick={() => {
                                  if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
                                    const success = userStorage.deleteUserNote(selectedUserForNotes.id, note.id);
                                    if (success) {
                                      const updatedUser = userStorage.getUserById(selectedUserForNotes.id);
                                      if (updatedUser) {
                                        setSelectedUserForNotes(updatedUser);
                                        setUsers(prevUsers => 
                                          prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
                                        );
                                      }
                                    }
                                  }
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="notes-history-empty">
                          <span className="empty-icon">📋</span>
                          <p>No hay registros previos para este usuario</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="notes-panel-empty">
                    <span className="empty-state-icon">👈</span>
                    <h3>Selecciona un usuario</h3>
                    <p>Busca y selecciona un usuario de la lista para agregar observaciones, amonestaciones o pendientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modo: Agrupación por Estado (original) */}
        {groupingMode === 'estado' && (
          <>
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
                  <span className="user-role-badge">{userProfile.role}</span>
                  <p className="user-location">📍 {userProfile.currentLocation?.province || 'Sin asignar'}, {userProfile.currentLocation?.municipality || 'Sin asignar'}</p>
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
                  <span className="user-role-badge">{userProfile.role}</span>
                  <p className="user-location">📍 {userProfile.currentLocation?.province || 'Sin asignar'}, {userProfile.currentLocation?.municipality || 'Sin asignar'}</p>
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
                  <span className="user-role-badge">{userProfile.role}</span>
                  <p className="user-location">📍 {userProfile.currentLocation?.province || 'Sin asignar'}, {userProfile.currentLocation?.municipality || 'Sin asignar'}</p>
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
        </>
        )}
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
            {/* Animación de éxito */}
            {showSuccessAnimation && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(76, 175, 80, 0.95)',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{
                  fontSize: '64px',
                  marginBottom: '20px',
                  animation: 'scaleIn 0.5s ease'
                }}>
                  ✓
                </div>
                <h3 style={{
                  color: 'white',
                  fontSize: '24px',
                  margin: 0,
                  fontWeight: 'bold'
                }}>
                  ¡Usuario Agregado!
                </h3>
              </div>
            )}

            {/* Botón de cerrar (X) */}
            <button 
              onClick={() => {
                setShowCreateUserModal(false);
                setNewUserForm({
                  name: '',
                  username: '',
                  password: '',
                  email: '',
                  phone: '',
                  cedula: '',
                  role: 'Técnico'
                });
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
                
                <div style={{  display: 'grid',
                  gap: '15px'
                }}>
                  {/* Nombre Completo */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez Gómez"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
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
                      Nombre de Usuario *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: juan.perez"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
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
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      placeholder="Ingrese la contraseña"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
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
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      placeholder="usuario@mopc.gov.py"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
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

                  {/* Teléfono */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      Número de Celular
                    </label>
                    <input
                      type="tel"
                      placeholder="+595 981 123456"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
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

                  {/* Cédula */}
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
                      placeholder="Ej: 1.234.567"
                      value={newUserForm.cedula}
                      onChange={(e) => setNewUserForm({ ...newUserForm, cedula: e.target.value })}
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
                      Nivel de Usuario *
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'white',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Técnico">Técnico</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e9ecef'
              }}>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setNewUserForm({
                      name: '',
                      username: '',
                      password: '',
                      email: '',
                      phone: '',
                      cedula: '',
                      role: 'Técnico'
                    });
                  }}
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
                  onClick={handleCreateUser}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FF7A00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E66D00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF7A00';
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
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              alignItems: 'flex-end'
                            }}>
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
                              
                              {/* Indicador de verificación */}
                              <div style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '500',
                                backgroundColor: userItem.isVerified ? '#d1ecf1' : '#fff3cd',
                                color: userItem.isVerified ? '#0c5460' : '#856404'
                              }}>
                                {userItem.isVerified ? '✓ Verificado' : '⚠ No verificado'}
                              </div>
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

                        {/* Contraseña */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            placeholder="Dejar vacío para mantener la actual"
                            value={editingUser?.password || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, password: e.target.value } : null)}
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
                          <small style={{ color: '#6c757d', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                            Solo ingrese una nueva contraseña si desea cambiarla
                          </small>
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

                        {/* Nivel de Usuario */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Nivel de Usuario
                          </label>
                          <select
                            value={editingUser?.role || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value } : null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: 'white',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Técnico">Técnico</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Administrador">Administrador</option>
                          </select>
                        </div>

                        {/* Número de Cédula */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Número de Cédula
                          </label>
                          <input
                            type="text"
                            value={editingUser?.cedula || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, cedula: e.target.value } : null)}
                            placeholder="Ej: 001-1234567-8"
                            maxLength={15}
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

                        {/* Verificación de Cuenta */}
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            Verificación
                          </label>
                          <select
                            value={editingUser?.isVerified ? 'true' : 'false'}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, isVerified: e.target.value === 'true' } : null)}
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
                            <option value="false">No Verificada</option>
                            <option value="true">Verificada</option>
                          </select>
                          <div style={{
                            fontSize: '11px',
                            color: '#6c757d',
                            marginTop: '5px',
                            fontStyle: 'italic'
                          }}>
                            {editingUser?.isVerified 
                              ? '✓ Verificado - NO se solicitará verificación de perfil al iniciar sesión' 
                              : '⚠ No verificado - Se solicitará completar perfil (foto, cédula, etc.) al iniciar sesión'}
                          </div>
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
                        onClick={async () => {
                          // Guardar cambios
                          if (editingUser) {
                            // Actualizar en el estado local
                            setUsers(prevUsers => 
                              prevUsers.map(u => u.id === editingUser.id ? editingUser : u)
                            );
                            
                            // Preparar datos para actualizar
                            const updateData: any = {
                              name: editingUser.name,
                              username: editingUser.username,
                              email: editingUser.email,
                              role: editingUser.role,
                              cedula: editingUser.cedula,
                              isActive: editingUser.isActive,
                              isVerified: editingUser.isVerified
                            };
                            
                            // Solo actualizar la contraseña si se proporcionó una nueva
                            if (editingUser.password && editingUser.password.trim() !== '') {
                              updateData.password = editingUser.password;
                            }
                            
                            // Actualizar en Firebase
                            const result = await firebaseUserStorage.updateUser(editingUser.id, updateData);
                            
                            if (result.success) {
                              // También actualizar en localStorage como fallback
                              userStorage.updateUser(editingUser.id, updateData);
                              alert('✅ Cambios guardados exitosamente en Firebase');
                            } else {
                              alert(`❌ Error guardando cambios: ${result.error}`);
                            }
                            
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
                        onClick={async () => {
                          if (window.confirm('¿Está seguro de que desea eliminar este usuario?\n\nNOTA: Los reportes creados por este usuario se conservarán.')) {
                            if (editingUser) {
                              // Eliminar de Firebase
                              const result = await firebaseUserStorage.deleteUser(editingUser.id);
                              
                              if (result.success) {
                                // También eliminar de localStorage como fallback
                                userStorage.deleteUser(editingUser.id);
                                
                                // Actualizar lista local
                                setUsers(prevUsers => prevUsers.filter(u => u.id !== editingUser.id));
                                alert('✅ Usuario eliminado exitosamente de Firebase.\n\nLos reportes creados por este usuario se han conservado.');
                                setSelectedAdminUser(null);
                                setEditingUser(null);
                              } else {
                                alert(`❌ Error al eliminar el usuario: ${result.error}`);
                              }
                            }
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
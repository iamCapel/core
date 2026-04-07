/**
 * EJEMPLO DE IMPLEMENTACIÓN
 * 
 * Este archivo muestra cómo integrar el componente ClickableUsername
 * en RegionDetailModal.tsx (aplica de forma similar a otros componentes)
 */

// ===================================================================
// PASO 1: Importar el componente al inicio del archivo
// ===================================================================

import React, { useState, useEffect } from 'react';
import './RegionDetailModal.css';
import ClickableUsername from './ClickableUsername';  // ⬅️ AGREGAR ESTA LÍNEA

// ===================================================================
// PASO 2: En el JSX donde se muestra el nombre del usuario, reemplazar
//         el texto plano con el componente ClickableUsername
// ===================================================================

// ANTES (línea aproximada 280-290):
// <div className="report-user">
//   👤 {report.userFullName}
// </div>

// DESPUÉS:
// <div className="report-user">
//   👤 <ClickableUsername 
//       username={report.userName}
//       fullName={report.userFullName}
//       onViewReports={(userId) => {
//         // Opcional: filtrar reportes por este usuario
//         console.log('Ver reportes de:', userId);
//       }}
//     />
// </div>

// ===================================================================
// EJEMPLO COMPLETO DE UNA TARJETA DE REPORTE CON CLICKABLEUSERNAME
// ===================================================================

function EjemploTarjetaReporte() {
  return (
    <div className="report-card">
      <div className="report-header">
        <h3>Reporte #{reportNumber}</h3>
        <span className="report-date">{date}</span>
      </div>
      
      <div className="report-body">
        <div className="report-info">
          <span className="label">Tipo de Intervención:</span>
          <span className="value">{tipoIntervencion}</span>
        </div>
        
        <div className="report-info">
          <span className="label">Sector:</span>
          <span className="value">{sector}</span>
        </div>
        
        <div className="report-info">
          <span className="label">Kilómetros:</span>
          <span className="value">{totalKm.toFixed(2)} km</span>
        </div>
        
        {/* AQUÍ ES DONDE MUESTRAS EL USUARIO - USAR CLICKABLEUSERNAME */}
        <div className="report-info">
          <span className="label">👤 Creado por:</span>
          <ClickableUsername 
            username={report.userName}
            fullName={report.userFullName}
            onViewReports={(userId) => {
              alert(`Ver todos los reportes de: ${userId}`);
              // Aquí puedes filtrar la vista o navegar a otra página
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// EJEMPLO EN UNA TABLA
// ===================================================================

function EjemploTabla() {
  return (
    <table className="reports-table">
      <thead>
        <tr>
          <th>Número Reporte</th>
          <th>Usuario</th>
          <th>Fecha</th>
          <th>Kilómetros</th>
        </tr>
      </thead>
      <tbody>
        {reports.map(report => (
          <tr key={report.id}>
            <td>{report.reportNumber}</td>
            <td>
              {/* REEMPLAZAR TEXTO PLANO POR CLICKABLEUSERNAME */}
              <ClickableUsername 
                username={report.userName}
                fullName={report.userFullName}
              />
            </td>
            <td>{report.date}</td>
            <td>{report.totalKm.toFixed(2)} km</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ===================================================================
// EJEMPLO EN DetailedReportView.tsx
// ===================================================================

function EjemploDetailedReport() {
  return (
    <div className="detailed-report">
      <div className="report-metadata">
        <div className="meta-item">
          <span className="label">📋 Reporte:</span>
          <span className="value">DCR-2024-001234</span>
        </div>
        
        <div className="meta-item">
          <span className="label">👤 Usuario:</span>
          {/* USAR CLICKABLEUSERNAME EN LUGAR DE MOSTRAR SOLO EL NOMBRE */}
          <ClickableUsername 
            username={report.creadoPor}
            fullName={report.nombreCompleto}
            userData={{
              username: report.creadoPor,
              fullName: report.nombreCompleto,
              role: report.rol,
              region: report.region,
              reportCount: report.totalReportes
            }}
            onViewReports={(userId) => {
              // Filtrar reportes por este usuario
              setFilterUsuario(userId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
        
        <div className="meta-item">
          <span className="label">📅 Fecha:</span>
          <span className="value">{formatDate(report.fecha)}</span>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// EJEMPLO EN UsersPage.tsx
// ===================================================================

function EjemploUsersPage() {
  const handleEditUser = (userId: string) => {
    // Abrir formulario de edición
    console.log('Editar usuario:', userId);
  };

  const handleDeleteUser = (userId: string) => {
    // Eliminar usuario
    console.log('Eliminar usuario:', userId);
  };

  const handleViewReports = (userId: string) => {
    // Ir a página de reportes
    window.location.href = `/reports?user=${userId}`;
  };

  return (
    <div className="users-grid">
      {users.map(user => (
        <div key={user.username} className="user-card">
          <div className="user-card-header">
            <h3>
              {/* NOMBRE CLICKEABLE */}
              <ClickableUsername 
                username={user.username}
                fullName={user.fullName}
                userData={{
                  username: user.username,
                  fullName: user.fullName,
                  email: user.email,
                  role: user.role,
                  region: user.region,
                  provincia: user.provincia,
                  status: user.active ? 'active' : 'inactive',
                  reportCount: user.totalReports,
                  createdAt: user.createdAt,
                  lastActive: user.lastLogin
                }}
                showActions={true}
                onEditUser={handleEditUser}
                onDeleteUser={handleDeleteUser}
                onViewReports={handleViewReports}
              />
            </h3>
          </div>
          
          <div className="user-card-body">
            <p className="user-role">{user.role}</p>
            <p className="user-region">{user.region}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================================================================
// EJEMPLO EN Dashboard.tsx - Actividad Reciente
// ===================================================================

function EjemploDashboard() {
  return (
    <div className="recent-activity">
      <h3>📊 Actividad Reciente</h3>
      <div className="activity-list">
        {activities.map(activity => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon">{activity.icon}</div>
            <div className="activity-content">
              <p>
                <ClickableUsername 
                  username={activity.userId}
                  fullName={activity.userFullName}
                />
                {' '}{activity.action}
              </p>
              <span className="activity-time">{activity.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// OPCIONES AVANZADAS
// ===================================================================

// 1. Sin opciones de acciones (solo ver info):
<ClickableUsername 
  username="juan_perez"
  showActions={false}
/>

// 2. Con estilos personalizados:
<ClickableUsername 
  username="juan_perez"
  style={{ color: '#ff6b6b', fontWeight: 'bold' }}
  className="mi-clase-custom"
/>

// 3. Con todas las funcionalidades:
<ClickableUsername 
  username="juan_perez"
  fullName="Juan Pérez"
  userData={{
    username: 'juan_perez',
    fullName: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'tecnico',
    region: 'Norte',
    provincia: 'Santiago',
    status: 'active',
    reportCount: 45,
    telefono: '809-123-4567',
    createdAt: '2024-01-15T10:30:00',
    lastActive: '2024-03-20T15:45:00'
  }}
  showActions={true}
  onEditUser={(userId) => console.log('Editar:', userId)}
  onDeleteUser={(userId) => console.log('Eliminar:', userId)}
  onViewReports={(userId) => console.log('Ver reportes:', userId)}
  onViewHistory={(userId) => console.log('Ver historial:', userId)}
  onResetPassword={(userId) => console.log('Resetear password:', userId)}
/>

export {};

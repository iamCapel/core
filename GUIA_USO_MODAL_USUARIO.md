# Guía de Uso del Modal de Usuario

## Componentes creados:

1. **UserModal.tsx** - El modal principal que muestra la información del usuario
2. **UserModal.css** - Estilos del modal
3. **ClickableUsername.tsx** - Componente auxiliar para hacer nombres clickeables

---

## 🎯 Uso Básico

### Opción 1: Usando ClickableUsername (Recomendado)

```tsx
import ClickableUsername from './components/ClickableUsername';

// En cualquier componente donde muestres un nombre de usuario:
function MiComponente() {
  return (
    <div>
      <p>Reporte creado por: <ClickableUsername username="juan_perez" fullName="Juan Pérez" /></p>
    </div>
  );
}
```

### Opción 2: Usando UserModal directamente

```tsx
import { useState } from 'react';
import UserModal from './components/UserModal';

function MiComponente() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  return (
    <>
      <span 
        onClick={() => {
          setSelectedUser('juan_perez');
          setShowModal(true);
        }}
      >
        Juan Pérez
      </span>

      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userId={selectedUser}
      />
    </>
  );
}
```

---

## 📋 Ejemplos de Implementación

### 1. En una tabla de reportes:

```tsx
import ClickableUsername from './components/ClickableUsername';

function TablaReportes({ reportes }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Reporte</th>
          <th>Creado por</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {reportes.map(reporte => (
          <tr key={reporte.id}>
            <td>{reporte.numero}</td>
            <td>
              <ClickableUsername 
                username={reporte.creadoPor}
                fullName={reporte.nombreCompleto}
                onViewReports={(userId) => console.log('Ver reportes de:', userId)}
              />
            </td>
            <td>{reporte.fecha}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 2. En una lista de usuarios (UsersPage.tsx):

```tsx
import ClickableUsername from './components/ClickableUsername';

function UsersPage() {
  const handleEditUser = (userId: string) => {
    // Lógica para editar usuario
    console.log('Editar usuario:', userId);
  };

  const handleDeleteUser = (userId: string) => {
    // Lógica para eliminar usuario
    console.log('Eliminar usuario:', userId);
  };

  const handleViewReports = (userId: string) => {
    // Navegar a página de reportes del usuario
    window.location.href = `/reports?user=${userId}`;
  };

  return (
    <div>
      {users.map(user => (
        <div key={user.username}>
          <ClickableUsername 
            username={user.username}
            fullName={user.fullName}
            userData={{
              username: user.username,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
              status: user.status,
              reportCount: user.reportCount
            }}
            showActions={true}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onViewReports={handleViewReports}
          />
        </div>
      ))}
    </div>
  );
}
```

### 3. En DetailedReportView.tsx:

```tsx
import ClickableUsername from './components/ClickableUsername';

// Dentro del componente, donde muestras el nombre del usuario:
<div className="report-creator">
  Creado por: <ClickableUsername 
    username={report.creadoPor}
    onViewReports={(userId) => {
      // Filtrar reportes por este usuario
      setFilterUsuario(userId);
    }}
  />
</div>
```

### 4. En el Dashboard:

```tsx
import ClickableUsername from './components/ClickableUsername';

// En la lista de actividad reciente:
<div className="recent-activity">
  {activities.map(activity => (
    <div key={activity.id}>
      <ClickableUsername username={activity.user} /> 
      {activity.action}
    </div>
  ))}
</div>
```

---

## 🎨 Personalización

### Cambiar estilos del nombre clickeable:

```tsx
<ClickableUsername 
  username="juan_perez"
  style={{
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: '16px'
  }}
  className="mi-clase-custom"
/>
```

### Deshabilitar acciones en el modal:

```tsx
<ClickableUsername 
  username="juan_perez"
  showActions={false}  // No muestra botones de acción
/>
```

### Pasar datos del usuario directamente (evita carga adicional):

```tsx
<ClickableUsername 
  username="juan_perez"
  userData={{
    username: 'juan_perez',
    fullName: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'tecnico',
    region: 'Norte',
    provincia: 'Santiago',
    status: 'active',
    reportCount: 45,
    createdAt: '2024-01-15',
    lastActive: '2024-03-20'
  }}
/>
```

---

## 🔧 Configuración Avanzada

### Conectar con Firebase:

En `UserModal.tsx`, edita la función `loadUserData`:

```tsx
const loadUserData = async (id: string) => {
  setLoading(true);
  try {
    const { db } = await import('../config/firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'usuarios', id));
    if (userDoc.exists()) {
      setUser(userDoc.data() as UserData);
    }
  } catch (error) {
    console.error('Error cargando usuario:', error);
  } finally {
    setLoading(false);
  }
};
```

### Agregar más campos al modal:

Edita la interfaz `UserData` en `UserModal.tsx`:

```tsx
export interface UserData {
  username: string;
  fullName?: string;
  email?: string;
  // ... campos existentes
  
  // Nuevos campos personalizados:
  cedula?: string;
  departamento?: string;
  supervisor?: string;
  // etc...
}
```

Luego agrega la visualización en el JSX del modal.

---

## 📱 Responsive

El modal es completamente responsive y se adapta a dispositivos móviles automáticamente.

---

## ✅ Siguiente Paso

Para implementarlo en tu plataforma, simplemente importa `ClickableUsername` en los componentes donde muestres nombres de usuario y reemplaza el texto plano con el componente.

**Archivos principales a modificar:**
- `src/components/DetailedReportView.tsx`
- `src/components/UsersPage.tsx`
- `src/components/Dashboard.tsx`
- `src/components/ExportPage.tsx`
- Cualquier otro componente que muestre nombres de usuario

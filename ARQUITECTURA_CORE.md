# Arquitectura Core - Lógica Backend Independiente

## 📁 Estructura

```
src/core/
├── index.ts                 # Punto de entrada principal
├── models/                  # Modelos de datos (interfaces TypeScript)
│   ├── User.ts             # Modelo de usuario
│   └── Report.ts           # Modelo de reportes
├── repositories/           # Capa de acceso a datos
│   ├── UserRepository.ts   # Repositorio de usuarios
│   └── ReportRepository.ts # Repositorio de reportes
├── controllers/            # Lógica de negocio
│   ├── AuthController.ts   # Autenticación y autorización
│   └── ReportController.ts # Gestión de reportes
└── utils/                  # Utilidades compartidas
```

## 🎯 Objetivo

Separar completamente la lógica de negocio de la interfaz de usuario para poder:
- ✅ Reutilizar en aplicación móvil nativa (React Native, Flutter, etc.)
- ✅ Mantener una única fuente de verdad para la lógica
- ✅ Facilitar testing unitario
- ✅ Desacoplar la UI del backend

## 📱 Uso en Aplicación Móvil

### 1. Importar el Core

```typescript
import { coreApp } from './core';

// O importar controladores específicos
import { AuthController, ReportController } from './core';
```

### 2. Autenticación

```typescript
// Login
const handleLogin = async (username: string, password: string) => {
  const result = await coreApp.authController.login({
    username,
    password
  });

  if (result.success) {
    console.log('Usuario logueado:', result.user);
    // Navegar a pantalla principal
  } else {
    console.error('Error:', result.error);
    // Mostrar mensaje de error
  }
};

// Logout
await coreApp.authController.logout();

// Verificar si está autenticado
const isLoggedIn = coreApp.authController.isAuthenticated();

// Obtener usuario actual
const currentUser = coreApp.authController.getCurrentUser();
```

### 3. Gestión de Usuarios

```typescript
// Crear usuario
const result = await coreApp.userController.createUser({
  username: 'juan.perez',
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'password123',
  role: UserRole.TECNICO,
  currentLocation: {
    province: 'Santo Domingo',
    municipality: 'Santo Domingo Este'
  }
});

// Obtener todos los usuarios
const users = await coreApp.userController.getAllUsers();

// Actualizar usuario
await coreApp.userController.updateUser('juan.perez', {
  name: 'Juan Carlos Pérez',
  email: 'jcperez@example.com'
});

// Eliminar usuario
await coreApp.userController.deleteUser('juan.perez');

// Verificar usuario
await coreApp.userController.verifyUser('juan.perez');
```

### 4. Gestión de Reportes

```typescript
// Crear reporte
const result = await coreApp.reportController.createReport({
  region: 'Ozama o Metropolitana',
  provincia: 'Santo Domingo',
  municipio: 'Santo Domingo Este',
  distrito: 'Los Mina',
  sector: 'Los Mina Norte',
  tipoIntervencion: 'Bacheo',
  timestamp: new Date().toISOString(),
  fechaCreacion: new Date().toISOString(),
  creadoPor: currentUser.name,
  usuarioId: currentUser.username,
  metricData: {
    metros_lineales: '150',
    area_intervenida: '300'
  },
  observaciones: 'Trabajo completado exitosamente',
  estado: 'completado'
});

// Obtener todos los reportes
const reports = await coreApp.reportController.getAllReports();

// Obtener reportes del usuario
const myReports = await coreApp.reportController.getUserReports(currentUser.username);

// Buscar reportes
const searchResults = await coreApp.reportController.searchReports(
  'DCR-2024',
  currentUser.role,
  currentUser.username
);

// Obtener estadísticas
const stats = await coreApp.reportController.getStatistics();

// Obtener reportes por provincia
const provinceReports = await coreApp.reportController.getReportsByProvince('Santo Domingo');
```

### 5. Reportes Pendientes

```typescript
// Guardar reporte pendiente (autoguardado)
await coreApp.pendingReportController.savePendingReport({
  id: 'pending_123',
  timestamp: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  userId: currentUser.username,
  userName: currentUser.name,
  formData: {
    region: 'Ozama o Metropolitana',
    provincia: 'Santo Domingo',
    // ... otros campos
  }
});

// Obtener reportes pendientes del usuario
const pendingReports = await coreApp.pendingReportController.getUserPendingReports(
  currentUser.username
);

// Continuar reporte pendiente
const pending = await coreApp.pendingReportController.getPendingReport('pending_123');

// Completar reporte pendiente
const result = await coreApp.pendingReportController.completePendingReport('pending_123');

// Eliminar reporte pendiente
await coreApp.pendingReportController.deletePendingReport('pending_123');

// Obtener contador de pendientes
const count = await coreApp.pendingReportController.getPendingCount();
```

## 🔐 Permisos y Roles

```typescript
// Verificar si el usuario es admin
const isAdmin = coreApp.authController.isAdmin();

// Verificar si tiene un rol específico
const isTecnico = coreApp.authController.hasRole(UserRole.TECNICO);

// Verificar si puede acceder a un recurso
const canAccess = coreApp.authController.canAccessResource(reportOwnerId);
```

## 📊 Modelos de Datos

### User
```typescript
interface User {
  username: string;
  name: string;
  email?: string;
  password?: string;
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
  currentLocation?: {
    province?: string;
    municipality?: string;
  };
  pendingReportsCount?: number;
}
```

### Report
```typescript
interface Report {
  id: string;
  numeroReporte: string;
  timestamp: string;
  fechaCreacion: string;
  creadoPor: string;
  usuarioId: string;
  region: string;
  provincia: string;
  municipio: string;
  distrito: string;
  sector: string;
  tipoIntervencion: string;
  subTipoCanal?: string;
  observaciones?: string;
  metricData?: Record<string, string>;
  gpsData?: Record<string, { lat: number; lon: number }>;
  images?: string[];
  videos?: string[];
  estado: 'completado' | 'pendiente' | 'borrador';
}
```

## 🔄 Respuestas de los Controladores

Todos los métodos que pueden fallar devuelven un objeto con esta estructura:

```typescript
{
  success: boolean;
  data?: any;      // Dato devuelto si success = true
  error?: string;  // Mensaje de error si success = false
}
```

Ejemplo de uso:
```typescript
const result = await coreApp.reportController.createReport(data);

if (result.success) {
  console.log('Reporte creado:', result.report);
  // Mostrar éxito en UI
} else {
  console.error('Error:', result.error);
  // Mostrar error en UI
}
```

## 🚀 Integración en React Native

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { coreApp, User } from './core';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar core
    coreApp.initialize();
    
    // Verificar si hay sesión
    const currentUser = coreApp.authController.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const result = await coreApp.authController.login({ username, password });
    
    if (result.success) {
      setUser(result.user!);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainApp user={user} />;
}
```

## 🧪 Testing

El core está completamente desacoplado, facilitando el testing:

```typescript
import { ReportController } from './core/controllers/ReportController';
import { ReportRepository } from './core/repositories/ReportRepository';

// Mock del repositorio
const mockRepository = {
  createReport: jest.fn(),
  getAllReports: jest.fn(),
  // ...
};

const controller = new ReportController(mockRepository);

test('crear reporte requiere campos obligatorios', async () => {
  const result = await controller.createReport({});
  expect(result.success).toBe(false);
  expect(result.error).toContain('requeridos');
});
```

## 📝 Notas Importantes

1. **Firebase**: La configuración de Firebase está en `src/config/firebase.ts`
2. **Persistencia**: Los datos se guardan automáticamente en Firebase
3. **Offline**: Considera implementar caché local en la app móvil
4. **Sincronización**: Los reportes pendientes se sincronizan automáticamente
5. **Seguridad**: Las reglas de seguridad de Firebase deben estar configuradas

## 🔧 Personalización para App Móvil

Si necesitas adaptar para una tecnología específica:

### React Native
- Ya está listo, solo importa `coreApp`
- Usa AsyncStorage para persistencia local si es necesario

### Flutter
- Crea un bridge JS para llamar las funciones del core
- O reimplementa los repositorios en Dart usando la misma interfaz

### Ionic/Capacitor
- Funciona directamente, es TypeScript puro
- Usa Capacitor Storage para persistencia local

### Native iOS/Android
- Usa un bridge JavaScript (JSCore en iOS, V8 en Android)
- O expón los controladores como API REST

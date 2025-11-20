# 🧹 Guía de Limpieza de Usuarios de Prueba

## Descripción

Este documento describe el proceso de limpieza de usuarios de prueba del sistema MOPC v0.1, manteniendo únicamente los usuarios registrados en el sistema userStorage.

## 📋 Cambios Realizados

### 1. Modificación del Sistema de Login (Dashboard.tsx)

Se eliminaron **TODOS** los usuarios de prueba del sistema de autenticación, dejando únicamente:

- **Usuarios de userStorage**: Todos los usuarios registrados correctamente en el sistema

#### Usuarios Eliminados:
- ❌ `admin` (Usuario de prueba)
- ❌ `eng` (Usuario de prueba - Engineer User)
- ❌ `supervisor` y variantes `sup*` (Usuarios de prueba)
- ❌ `tecnico` y variantes `tec*` (Usuarios de prueba)

#### Usuario Administrador del Sistema:
- ✅ **Miguel de Jesús Cabrera Cruz** - Usuario único con privilegios de administrador (registrado en userStorage)

### 2. Herramienta de Limpieza (clean-test-users.html)

Se creó una herramienta HTML independiente para limpiar usuarios de prueba del localStorage.

## 🚀 Cómo Usar la Herramienta de Limpieza

### Paso 1: Abrir la Herramienta

```bash
# Opción 1: Abrir directamente el archivo HTML
open clean-test-users.html

# Opción 2: Servir con un servidor local
npx serve .
# Luego navegar a http://localhost:3000/clean-test-users.html
```

### Paso 2: Analizar el Sistema

1. Haz clic en el botón **"🔍 Analizar Sistema"**
2. La herramienta mostrará:
   - Número de usuarios en userStorage
   - Usuario activo actualmente
   - Lista completa de usuarios en el sistema

### Paso 3: Ejecutar Limpieza

1. Haz clic en el botón **"🗑️ Limpiar Usuarios de Prueba"**
2. Confirma la acción en el diálogo
3. La herramienta eliminará:
   - Perfiles de usuarios de prueba en localStorage
   - Usuario activo si no es válido
   - Datos temporales de sesión

### Paso 4: Verificar

1. La herramienta mostrará un mensaje de éxito
2. Se actualizará automáticamente el análisis
3. Verifica que solo quedan usuarios válidos

## 🔐 Sistema de Autenticación Actualizado

### Usuarios Válidos

El sistema ahora **SOLO** acepta usuarios registrados en userStorage:

1. **Usuarios de userStorage**
   - Usuarios registrados mediante el sistema de gestión
   - Autenticación con username y password
   - Validación de cuenta activa
   - Verificación de permisos según rol

### Flujo de Autenticación

```
Usuario ingresa credenciales
    ↓
¿Existe en userStorage?
    ├─ SÍ → Validar contraseña
    │        ├─ Correcta → ¿Cuenta activa?
    │        │              ├─ SÍ → ✅ Login exitoso
    │        │              └─ NO → ❌ Cuenta desactivada
    │        └─ Incorrecta → ❌ Contraseña incorrecta
    └─ NO → ❌ Usuario no encontrado
```

## 📝 Funcionalidades del Sistema userStorage

### Gestión de Usuarios

Los administradores pueden:

- ✅ Crear nuevos usuarios
- ✅ Editar información de usuarios
- ✅ Activar/Desactivar cuentas
- ✅ Verificar usuarios
- ✅ Asignar roles y permisos
- ✅ Agregar notas y observaciones
- ✅ Gestionar amonestaciones

### Datos de Usuario

Cada usuario en userStorage contiene:

```typescript
{
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  cedula?: string;
  role: string; // Técnico, Supervisor, Administrador
  department: string;
  isActive: boolean;
  isVerified: boolean;
  currentLocation: {...};
  reportsCount: number;
  notes: UserNote[];
  // ... más campos
}
```

## 🛡️ Seguridad

### Cambios de Seguridad Implementados

1. **Eliminación completa de usuarios de prueba**
   - No se aceptan credenciales de prueba
   - Solo usuarios registrados en userStorage tienen acceso

2. **Validación de cuenta activa**
   - Usuarios inactivos no pueden iniciar sesión
   - Mensaje específico para cuentas desactivadas

3. **Sistema 100% basado en userStorage**
   - Todos los usuarios deben estar registrados
   - Control completo de accesos y permisos
   - Trazabilidad total de usuarios

### Recomendaciones

- 🔒 Cambiar las contraseñas por defecto en producción
- 🔒 Implementar sistema de recuperación de contraseñas
- 🔒 Agregar autenticación de dos factores (futuro)
- 🔒 Registrar intentos de login fallidos

## 🔄 Migración de Usuarios Existentes

Si tienes usuarios que necesitan ser migrados a userStorage:

### Opción 1: Crear Manualmente (Recomendado)

1. Iniciar sesión como `eng`
2. Ir a **Gestión de Usuarios**
3. Hacer clic en **"➕ Crear Usuario"**
4. Completar el formulario con los datos correctos
5. Asignar el rol apropiado
6. Guardar el usuario

### Opción 2: Importar mediante Script

```javascript
// Ejecutar en consola del navegador
const userStorage = {
  saveUser: function(userData) {
    // Lógica de importación
  }
};

// Ejemplo de importación
userStorage.saveUser({
  username: 'juan.perez',
  password: 'temporal123',
  name: 'Juan Pérez',
  email: 'juan.perez@mopc.gov.py',
  phone: '+595 981 123456',
  cedula: '1.234.567',
  role: 'Técnico',
  department: 'Mantenimiento',
  isActive: true,
  lastSeen: 'Nunca',
  joinDate: new Date().toISOString(),
  currentLocation: {
    province: 'Central',
    municipality: 'Asunción',
    coordinates: { lat: -25.2637, lng: -57.5759 },
    lastUpdated: new Date().toISOString()
  },
  reportsCount: 0
});
```

## 📊 Verificación Post-Limpieza

Después de ejecutar la limpieza, verifica:

- [ ] No existen usuarios de prueba en el sistema
- [ ] Todos los usuarios de userStorage están intactos
- [ ] No hay perfiles huérfanos en localStorage
- [ ] El login funciona correctamente con usuarios válidos de userStorage
- [ ] Los usuarios inválidos son rechazados apropiadamente
- [ ] Solo el administrador (Miguel de Jesús Cabrera Cruz) tiene privilegios completos

## ⚠️ Solución de Problemas

### No puedo iniciar sesión después de la limpieza

1. Verifica que estás usando credenciales válidas de un usuario registrado en userStorage
2. Contacta al administrador del sistema (Miguel de Jesús Cabrera Cruz) para crear tu cuenta
3. Verifica que tu cuenta esté activa en el sistema

### Perdí acceso al sistema

1. Contacta al administrador del sistema
2. Solicita la creación o reactivación de tu cuenta de usuario
3. Verifica tus credenciales de acceso

### Mis usuarios de userStorage fueron eliminados

**No es posible** - La herramienta de limpieza NO elimina usuarios de userStorage. Solo elimina:
- Usuarios de prueba temporales
- Perfiles sin usuario asociado
- Sesiones de usuarios no válidos

## 📞 Soporte

Para asistencia adicional:

- Consulta la documentación en `README.md`
- Revisa el sistema de roles en `SISTEMA_ROLES.md`
- Contacta al equipo de desarrollo

---

**Última actualización**: 19 de noviembre de 2025
**Versión**: MOPC v0.1

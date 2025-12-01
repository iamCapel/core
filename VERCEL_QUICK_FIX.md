# 🚀 Solución Rápida - Error "Usuario no encontrado" en Vercel

## ✅ Cambios Implementados (3 commits)

### 1️⃣ Fix Principal - Import Estático
**Problema**: `require()` no funciona en build de producción  
**Solución**: Cambiar a `import defaultUsersData from '../config/userstorage.json'`

```typescript
// ❌ ANTES (no funciona en Vercel)
const defaultUsers = require('../config/userstorage.json');

// ✅ AHORA (funciona en Vercel)
import defaultUsersData from '../config/userstorage.json';
const defaultUsers = defaultUsersData;
```

### 2️⃣ Herramientas de Diagnóstico
**Archivos creados**:
- `public/diagnostic.html` - Diagnóstico en tiempo real
- `DEPLOY_VERCEL.md` - Guía completa de troubleshooting

**URLs en tu sitio**:
```
https://core-mopc.vercel.app/diagnostic.html
https://core-mopc.vercel.app/reset-users.html
```

### 3️⃣ UserInitializer - Auto-recuperación
**Componente**: `src/components/UserInitializer.tsx`  
**Función**: Garantiza que usuarios estén cargados antes de mostrar el login

**Beneficios**:
- ✅ Pantalla de loading al inicio
- ✅ Verificación automática
- ✅ Logs detallados en consola
- ✅ Botones de recuperación si falla

## 📋 Qué Hacer Ahora en Vercel

### Paso 1: Esperar el Rebuild
Vercel detectará automáticamente los cambios y hará rebuild (2-3 minutos).

### Paso 2: Verificar la Consola
1. Abrir tu sitio en Vercel
2. Presionar F12 → Console
3. Buscar mensajes:
   ```
   🔄 Inicializando sistema de usuarios...
   📊 Usuarios encontrados: 3
   ✅ Sistema de usuarios listo. Disponibles: admin, capel, tecnico
   ```

### Paso 3: Si Aún Falla
Visita: `https://tu-sitio.vercel.app/diagnostic.html`

**Verás**:
- ✅/❌ Estado de localStorage
- 👥 Lista de usuarios registrados
- 🔍 JSON completo de la base de datos
- 🌐 Info del entorno

## 🎯 Usuarios Disponibles

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| capel | 02260516 | Administrador ⭐ |
| tecnico | tecnico123 | Técnico |

## 🔧 Troubleshooting Rápido

### Error persiste después del rebuild
```javascript
// En consola del navegador (F12):
localStorage.clear();
window.location.reload();
```

### Ver qué usuarios hay cargados
```javascript
// En consola:
const db = JSON.parse(localStorage.getItem('mopc_users_db'));
console.table(Object.values(db).map(u => ({
  usuario: u.username,
  nombre: u.name,
  rol: u.role,
  activo: u.isActive
})));
```

### Forzar recarga de usuarios
```javascript
// En consola:
localStorage.removeItem('mopc_users_db');
localStorage.removeItem('mopc_users_index');
localStorage.removeItem('mopc_users_metadata');
window.location.reload();
```

## 📊 Verificación de Despliegue

✅ Commit subido: `5ef5f83`  
✅ Branch: `main`  
✅ Archivos modificados: 6  
✅ Sistema: localStorage + Auto-inicialización  

## �� Resultado Esperado

Al abrir tu sitio en Vercel verás:

1. **Primera carga**: Pantalla "Inicializando sistema..." (1-2 segundos)
2. **Consola**: Logs de carga exitosa
3. **Login**: Formulario listo con usuarios disponibles
4. **Sin errores**: Sistema funcionando perfectamente

---

**¿Necesitas ayuda?** Revisa `/diagnostic.html` o abre la consola del navegador (F12).

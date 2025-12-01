# 👥 Sistema de Usuarios - MOPC Dashboard

## 🎯 Usuarios Predefinidos

El sistema incluye **3 usuarios predefinidos** que se cargan automáticamente:

### 1. 👑 Administrador Principal

- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** Administrador
- **Email:** admin@mopc.gob.do

### 2. 👨‍💼 Usuario Capel (Tu usuario personal)

- **Usuario:** `capel`
- **Contraseña:** `02260516`
- **Rol:** Administrador
- **Email:** capel@mopc.gob.do

### 3. 👷 Técnico Demo

- **Usuario:** `tecnico`
- **Contraseña:** `tecnico123`
- **Rol:** Técnico
- **Email:** tecnico@mopc.gob.do

---

## 🚀 Cómo usar el sistema

### Primera vez / Instalación limpia:

1. **Abre la aplicación** en tu navegador:

   ```
   http://localhost:3001
   ```

2. **Los usuarios se cargan automáticamente** la primera vez que accedes.

3. **Inicia sesión** con cualquiera de los usuarios predefinidos.

---

## 🔧 Si no puedes iniciar sesión

### Opción 1: Usar el archivo de reset (MÁS FÁCIL)

1. Abre en tu navegador:

   ```
   /workspaces/core/reset-users.html
   ```

   O arrastra el archivo `reset-users.html` a tu navegador.

2. Haz clic en el botón **"🔄 Restablecer Usuarios Predefinidos"**

3. Recarga la página del dashboard

4. Intenta iniciar sesión nuevamente

### Opción 2: Limpiar localStorage manualmente

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Application** o **Almacenamiento**
3. Encuentra **Local Storage**
4. Elimina las claves:
   - `mopc_users_db`
   - `mopc_users_index`
   - `mopc_users_metadata`
5. Recarga la página

---

## 📝 Notas importantes

### ✅ El sistema usa localStorage

- Los usuarios se guardan en el **navegador** (localStorage)
- **NO necesitas MySQL** para que funcione el login
- Los datos persisten entre sesiones del navegador
- Si limpias la caché del navegador, los usuarios se perderán (pero se recargan automáticamente)

### 🔐 Seguridad

- Las contraseñas se guardan **en texto plano** en localStorage (solo para desarrollo)
- Para producción, se recomienda usar un backend real con encriptación

### 📦 Incluido en el repositorio

El archivo `src/config/userstorage.json` contiene los usuarios predefinidos y viaja con el repositorio, por lo que cualquier persona que clone el proyecto tendrá acceso automático a estos usuarios.

---

## 🆘 Solución de problemas

### Problema: "Usuario no encontrado"

**Solución:**

1. Abre `reset-users.html` y restablece los usuarios
2. O limpia localStorage y recarga la página

### Problema: "Contraseña incorrecta"

**Solución:**

- Verifica que estés usando la contraseña correcta
- Usuario `capel` → Contraseña: `02260516`
- Usuario `admin` → Contraseña: `admin123`

### Problema: Los usuarios desaparecen

**Solución:**

- Los usuarios se borran si limpias la caché del navegador
- Simplemente recarga la página o usa `reset-users.html`

---

## 🎨 Personalización

Para modificar los usuarios predefinidos, edita:

```
src/config/userstorage.json
```

Luego recarga la aplicación o usa `reset-users.html`.

---

## 📞 Contacto

Para soporte técnico, contacta al equipo de desarrollo.

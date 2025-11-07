# 📦 BACKUP - Configuración APK Android

**Fecha:** 7 de Noviembre, 2025  
**Propósito:** Copia de seguridad de toda la configuración para compilar APK

---

## 📁 Contenido de este Backup

Este backup contiene toda la configuración necesaria para compilar la aplicación MOPC Dashboard como APK para Android:

### Archivos Incluidos:

#### 📄 Scripts de Compilación
- `COMPILAR_APK.bat` - Script para compilar con Android Studio
- `COMPILAR_APK_DIRECTO.bat` - Script para compilar directamente sin Android Studio

#### 📚 Documentación
- `README_MOBILE.md` - Guía completa de la versión móvil
- `GUIA_APK.md` - Instrucciones detalladas de compilación
- `COMPILAR_RAPIDO.md` - Guía de inicio rápido
- `RESUMEN_APK.md` - Resumen general

#### ⚙️ Configuración
- `capacitor.config.ts` - Configuración de Capacitor

#### 📱 Proyecto Android
- `android/` - Proyecto Android completo con Gradle, permisos, recursos, etc.

---

## 🔄 Cómo Restaurar

Si necesitas restaurar esta configuración APK:

### 1. Copiar archivos de configuración
```powershell
Copy-Item -Path "BACKUP_APK_CONFIG_20251107\capacitor.config.ts" -Destination ".\" -Force
Copy-Item -Path "BACKUP_APK_CONFIG_20251107\*.bat" -Destination ".\" -Force
Copy-Item -Path "BACKUP_APK_CONFIG_20251107\*_MOBILE.md" -Destination ".\" -Force
Copy-Item -Path "BACKUP_APK_CONFIG_20251107\*APK*.md" -Destination ".\" -Force
```

### 2. Restaurar carpeta Android
```powershell
Copy-Item -Path "BACKUP_APK_CONFIG_20251107\android" -Destination ".\" -Recurse -Force
```

### 3. Reinstalar dependencias de Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/geolocation @capacitor/splash-screen
```

### 4. Sincronizar
```bash
npx cap sync
```

---

## 📊 Estado al Momento del Backup

### Dependencias Instaladas:
- @capacitor/core: ^7.4.4
- @capacitor/cli: ^7.4.4
- @capacitor/android: ^7.4.4
- @capacitor/geolocation: ^7.1.5
- @capacitor/splash-screen: ^7.0.3

### Configuración:
- ✅ Proyecto Android generado
- ✅ Permisos GPS configurados
- ✅ Splash screen configurado
- ✅ Scripts de compilación creados
- ✅ Documentación completa

### Funcionalidades Móviles:
- ✅ Dashboard completo
- ✅ Mapas (Google Maps / Leaflet)
- ✅ Geolocalización GPS
- ✅ Reportes y formularios
- ✅ Aprobación de coordenadas
- ✅ Estadísticas y gráficos

---

## 🚀 Compilar APK desde este Backup

### Después de restaurar:

```bash
# Método 1: Con Android Studio
.\COMPILAR_APK.bat

# Método 2: Sin Android Studio
.\COMPILAR_APK_DIRECTO.bat

# Método 3: Manual
npm run build
npx cap sync
cd android
gradlew.bat assembleDebug
```

---

## ⚠️ Notas Importantes

- Este backup NO incluye `node_modules` - deberás ejecutar `npm install` después de restaurar
- El APK compilado NO está incluido - deberás recompilarlo
- Los archivos de build (`build/`) no están incluidos
- Asegúrate de tener JDK 17+ y Android SDK instalados antes de compilar

---

## 📞 Información del Proyecto

**Proyecto:** MOPC Dashboard  
**Repositorio:** https://github.com/iamCapel/MOPC-Dashboard  
**Versión App:** 0.1.0  
**App ID:** com.mopc.dashboard  
**Nombre App:** MOPC Dashboard  

---

**Backup creado automáticamente antes de continuar con modificaciones al proyecto principal.**

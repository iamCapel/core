# 📱 MOPC Dashboard - Versión Móvil (APK)

## ✅ Configuración Completada

Tu proyecto MOPC Dashboard ahora está listo para ser compilado como una aplicación Android (APK).

### 🎯 Componentes Instalados

- ✅ **Capacitor Core** - Framework para apps nativas
- ✅ **Capacitor Android** - Plataforma Android
- ✅ **Geolocation Plugin** - Para funcionalidades GPS
- ✅ **Splash Screen Plugin** - Pantalla de inicio

### 📋 Permisos Configurados

La app solicitará los siguientes permisos:
- 🌐 Internet
- 📡 Estado de red
- 📍 Ubicación GPS (precisa y aproximada)
- 🗺️ Acceso a mapas

---

## 🚀 Compilar APK

### Opción 1: Con Android Studio (Visual)

```bash
# Ejecutar el script automático
COMPILAR_APK.bat
```

Esto abrirá Android Studio donde podrás:
1. Build > Build Bundle(s) / APK(s) > Build APK(s)
2. El APK estará en: `android\app\build\outputs\apk\debug\`

### Opción 2: Compilación Directa (Sin Android Studio)

```bash
# Ejecutar el script de compilación directa
COMPILAR_APK_DIRECTO.bat
```

**Requisitos:**
- JDK 17 o superior instalado
- Variable `ANDROID_HOME` configurada
- Android SDK instalado

### Opción 3: Comandos Manuales

```bash
# 1. Compilar React
npm run build

# 2. Sincronizar con Android
npx cap sync

# 3. Compilar APK
cd android
gradlew.bat assembleDebug
cd ..
```

---

## 📦 Ubicación del APK

Después de compilar, el APK estará en:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📲 Instalar en tu Dispositivo

### Método 1: Transferencia USB
1. Conecta tu dispositivo Android al PC
2. Copia el APK a tu dispositivo
3. En el dispositivo: Configuración > Seguridad > Habilitar "Fuentes desconocidas"
4. Abre el archivo APK desde tu dispositivo
5. Toca "Instalar"

### Método 2: Email/Cloud
1. Envía el APK por email o súbelo a Drive/Dropbox
2. Descárgalo en tu dispositivo
3. Instala como se describe arriba

### Método 3: ADB (Advanced)
```bash
# Con el dispositivo conectado por USB
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔧 Scripts NPM Disponibles

```bash
# Compilar web y sincronizar con móvil
npm run build:mobile

# Abrir proyecto en Android Studio
npm run android:open

# Ejecutar en dispositivo conectado
npm run android:run
```

---

## 🎨 Personalización

### Cambiar Icono de la App

1. Crea iconos en diferentes tamaños:
   - 48x48 (mdpi)
   - 72x72 (hdpi)
   - 96x96 (xhdpi)
   - 144x144 (xxhdpi)
   - 192x192 (xxxhdpi)

2. Colócalos en: `android\app\src\main\res\mipmap-[densidad]\`

3. Reemplaza `ic_launcher.png` y `ic_launcher_round.png`

### Cambiar Nombre de la App

Edita: `android\app\src\main\res\values\strings.xml`
```xml
<string name="app_name">Tu Nombre Aquí</string>
```

### Cambiar Splash Screen

Edita `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    backgroundColor: '#1976d2', // Tu color
    showSpinner: true
  }
}
```

---

## 🏗️ APK de Producción (Release)

Para crear un APK optimizado para publicar:

### 1. Crear Keystore

```bash
keytool -genkey -v -keystore mopc-release-key.keystore -alias mopc -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configurar Firma

Edita `android\app\build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../mopc-release-key.keystore')
            storePassword 'tu_password'
            keyAlias 'mopc'
            keyPassword 'tu_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### 3. Compilar Release

```bash
cd android
gradlew.bat assembleRelease
```

APK Release en: `android\app\build\outputs\apk\release\app-release.apk`

---

## 📊 Optimización para Móviles

### Recomendaciones Implementadas:
- ✅ Splash screen configurado
- ✅ HTTPS habilitado
- ✅ Permisos de ubicación
- ✅ Soporte para mapas

### Próximas Mejoras:
- [ ] Optimizar imágenes para móvil
- [ ] Implementar caché offline
- [ ] Agregar notificaciones push
- [ ] Modo oscuro
- [ ] Diseño responsive mejorado

---

## 🐛 Solución de Problemas

### Error: "ANDROID_HOME not set"
```bash
# Configura la variable de entorno:
setx ANDROID_HOME "C:\Users\TU_USUARIO\AppData\Local\Android\Sdk"
```

### Error: "Java version incompatible"
- Instala JDK 17: https://adoptium.net/
- Configura `JAVA_HOME`

### Error: "SDK not found"
1. Descarga Android Studio
2. Tools > SDK Manager
3. Instala Android SDK 33+

### APK no instala en el dispositivo
- Verifica que "Fuentes desconocidas" esté habilitado
- Intenta desinstalar versión anterior primero
- Verifica espacio en el dispositivo

### La app se cierra al abrir
- Revisa logs con: `adb logcat`
- Verifica permisos en AndroidManifest.xml
- Asegúrate de que `npm run build` completó sin errores

---

## 📱 Características de la App Móvil

### Funcionalidades Disponibles:
- ✅ Dashboard completo
- ✅ Visualización de mapas (Google Maps / Leaflet)
- ✅ Geolocalización GPS
- ✅ Reportes y formularios
- ✅ Aprobación de coordenadas GPS
- ✅ Estadísticas y gráficos
- ✅ Gestión de usuarios

### Plugins Capacitor Integrados:
- **Geolocation**: Acceso a GPS del dispositivo
- **Splash Screen**: Pantalla de inicio personalizada

---

## 📚 Recursos Adicionales

- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Guía Android Studio](https://developer.android.com/studio/intro)
- [Publicar en Google Play](https://support.google.com/googleplay/android-developer/answer/9859152)

---

## 🔄 Actualizar la App

Cuando hagas cambios en el código:

```bash
# 1. Compilar cambios
npm run build

# 2. Sincronizar
npx cap sync

# 3. Recompilar APK
cd android
gradlew.bat assembleDebug
```

---

## 📞 Soporte

¿Problemas o preguntas? Revisa:
1. `GUIA_APK.md` - Guía detallada
2. Logs de compilación
3. Documentación de Capacitor

---

**¡Tu app MOPC Dashboard está lista para Android! 📱🚀**

Para compilar el APK, ejecuta: `COMPILAR_APK.bat` o `COMPILAR_APK_DIRECTO.bat`

# MOPC Dashboard - Guía de Compilación APK

## 📱 Generar APK para Android

### Requisitos Previos

1. **Java Development Kit (JDK)**
   - Descargar e instalar JDK 17 o superior
   - Link: https://adoptium.net/

2. **Android Studio**
   - Descargar e instalar Android Studio
   - Link: https://developer.android.com/studio
   - Durante la instalación, asegúrate de instalar:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (opcional, para pruebas)

3. **Variables de Entorno**
   ```
   ANDROID_HOME: C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
   JAVA_HOME: C:\Program Files\Eclipse Adoptium\jdk-17.x.x
   ```
   Agregar a PATH:
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   %JAVA_HOME%\bin
   ```

### Método 1: Usando el Script Automático (Recomendado)

1. Ejecuta el archivo `COMPILAR_APK.bat`
2. Espera a que se complete la compilación
3. Android Studio se abrirá automáticamente
4. En Android Studio:
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
5. El APK estará en: `android\app\build\outputs\apk\debug\app-debug.apk`

### Método 2: Manual

```bash
# 1. Compilar la aplicación React
npm run build

# 2. Sincronizar con Capacitor
npx cap sync

# 3. Abrir en Android Studio
npx cap open android

# 4. En Android Studio: Build > Build APK
```

### Método 3: Desde Línea de Comandos

```bash
# 1. Compilar React
npm run build

# 2. Sincronizar
npx cap sync

# 3. Navegar a la carpeta android
cd android

# 4. Compilar APK con Gradle
.\gradlew assembleDebug

# El APK estará en: app\build\outputs\apk\debug\app-debug.apk
```

### Generar APK de Producción (Release)

Para crear un APK firmado para distribución:

1. **Crear un Keystore:**
   ```bash
   keytool -genkey -v -keystore mopc-release-key.keystore -alias mopc -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configurar en `android/app/build.gradle`:**
   ```gradle
   android {
       ...
       signingConfigs {
           release {
               storeFile file('mopc-release-key.keystore')
               storePassword 'tu_password'
               keyAlias 'mopc'
               keyPassword 'tu_password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **Compilar APK Release:**
   ```bash
   cd android
   .\gradlew assembleRelease
   ```

### Scripts NPM Disponibles

- `npm run build:mobile` - Compila React y sincroniza con Capacitor
- `npm run android:open` - Abre el proyecto en Android Studio
- `npm run android:run` - Ejecuta la app en dispositivo/emulador conectado

### Problemas Comunes

#### Error: "ANDROID_HOME not set"
- Configura la variable de entorno ANDROID_HOME

#### Error: "Java version incompatible"
- Usa JDK 17 o superior
- Verifica con: `java -version`

#### Error: "SDK not found"
- Abre Android Studio
- Ve a Tools > SDK Manager
- Instala Android SDK 33 o superior

#### APK muy grande
- El APK debug incluye símbolos de depuración
- Usa el APK release para producción (más pequeño)

### Personalización de la App

#### Cambiar Icono
1. Coloca tu icono en `android/app/src/main/res/`
2. Usa diferentes resoluciones:
   - mipmap-mdpi: 48x48
   - mipmap-hdpi: 72x72
   - mipmap-xhdpi: 96x96
   - mipmap-xxhdpi: 144x144
   - mipmap-xxxhdpi: 192x192

#### Cambiar Nombre de la App
Edita `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">MOPC Dashboard</string>
```

#### Cambiar Package Name
Edita `capacitor.config.ts`:
```typescript
appId: 'com.mopc.dashboard'
```

### Instalar el APK

1. Copia el APK a tu dispositivo Android
2. En el dispositivo, habilita "Instalar apps de origen desconocido"
3. Abre el archivo APK y sigue las instrucciones

### Distribución

- **Google Play Store:** Requiere APK firmado (release)
- **Distribución directa:** Usa el APK debug para pruebas internas

---

## 📂 Estructura del Proyecto

```
MOPC Dashboard/
├── android/                 # Proyecto Android nativo
│   ├── app/
│   │   └── build/
│   │       └── outputs/
│   │           └── apk/    # APKs generados aquí
│   └── build.gradle
├── build/                   # Build de React
├── capacitor.config.ts      # Configuración de Capacitor
├── COMPILAR_APK.bat        # Script de compilación
└── src/                     # Código fuente React
```

## 🚀 Próximos Pasos

1. Prueba la app en un dispositivo real
2. Optimiza el rendimiento para móviles
3. Agrega permisos nativos si es necesario (GPS, cámara, etc.)
4. Configura el splash screen
5. Publica en Google Play Store

---

**¿Necesitas ayuda?** Revisa la documentación de Capacitor: https://capacitorjs.com/docs

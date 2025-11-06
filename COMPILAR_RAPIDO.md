# 🚀 INICIO RÁPIDO - Compilar APK

## ⚡ Opción Más Rápida

### Si tienes Android Studio instalado:
1. Doble clic en: **`COMPILAR_APK.bat`**
2. Espera a que se compile
3. Android Studio se abrirá
4. Build > Build APK

### Si NO tienes Android Studio:
1. Instala **Android SDK** primero
2. Configura variable `ANDROID_HOME`
3. Doble clic en: **`COMPILAR_APK_DIRECTO.bat`**
4. ¡Listo! El APK estará en la carpeta que se abre

---

## 📋 Requisitos Mínimos

- [ ] Node.js instalado ✓ (ya lo tienes)
- [ ] JDK 17 o superior
- [ ] Android SDK
- [ ] Variable ANDROID_HOME configurada

---

## 📥 Descargas Necesarias

### 1. Java (JDK 17)
https://adoptium.net/

### 2. Android Studio (incluye Android SDK)
https://developer.android.com/studio

O solo el SDK:
https://developer.android.com/studio#command-tools

---

## 🎯 Configurar Variables de Entorno

```powershell
# En PowerShell como Administrador:

# 1. JAVA_HOME
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.0.x', 'Machine')

# 2. ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\TU_USUARIO\AppData\Local\Android\Sdk', 'Machine')

# 3. Agregar a PATH
$path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$newPath = $path + ';%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%JAVA_HOME%\bin'
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'Machine')

# 4. Reinicia la terminal
```

---

## 📱 Ubicación del APK Final

```
android\app\build\outputs\apk\debug\app-debug.apk
```

¡Transfiere este archivo a tu Android e instala!

---

## 🆘 ¿Problemas?

Lee el archivo: **`GUIA_APK.md`** para soluciones detalladas

---

**🎉 ¡Todo está listo para compilar!**

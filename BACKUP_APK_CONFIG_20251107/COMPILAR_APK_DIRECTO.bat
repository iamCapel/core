@echo off
echo ========================================
echo  MOPC Dashboard - Compilador APK
echo  (Sin necesidad de Android Studio)
echo ========================================
echo.
if "%ANDROID_HOME%"=="" (
    echo ERROR: ANDROID_HOME no esta configurado
    echo.
    echo Por favor configura la variable de entorno ANDROID_HOME
    echo Ejemplo: C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
    echo.
    pause
    exit /b 1
)
echo [1/4] Compilando aplicacion React...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion de React
    pause
    exit /b %errorlevel%
)
echo.
echo [2/4] Sincronizando con Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Fallo la sincronizacion
    pause
    exit /b %errorlevel%
)
echo.
echo [3/4] Compilando APK con Gradle...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion del APK
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..
echo.
echo [4/4] APK generado exitosamente!
echo.
echo ========================================
echo  APK LISTO
echo ========================================
echo.
echo Ubicacion: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Puedes instalar este APK en tu dispositivo Android
echo.
explorer "android\app\build\outputs\apk\debug"
echo ========================================
pause

@echo off
echo ========================================
echo  MOPC Dashboard - Compilador de APK
echo ========================================
echo.
echo [1/3] Compilando aplicacion React...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion de React
    pause
    exit /b %errorlevel%
)
echo.
echo [2/3] Sincronizando con Android...
call npx cap sync
if %errorlevel% neq 0 (
    echo ERROR: Fallo la sincronizacion
    pause
    exit /b %errorlevel%
)
echo.
echo [3/3] Abriendo Android Studio...
echo.
echo INSTRUCCIONES:
echo 1. Android Studio se abrira automaticamente
echo 2. Espera a que Gradle termine de sincronizar
echo 3. Ve a: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 4. El APK estara en: android\app\build\outputs\apk\debug\
echo.
call npx cap open android
echo.
echo ========================================
echo  Proceso completado
echo ========================================
pause

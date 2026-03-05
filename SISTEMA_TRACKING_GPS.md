# Sistema de Seguimiento GPS en Tiempo Real

## 📍 Descripción General

Se ha implementado un sistema completo de tracking GPS que permite monitorear la ubicación en tiempo real de todos los operadores/técnicos que usan la aplicación móvil CORE-APK. Este sistema proporciona:

- **Seguimiento automático** de ubicación mientras usan la app móvil
- **Visualización en tiempo real** en el mapa de la plataforma web
- **Actualización continua** de posiciones cada 30 segundos aproximadamente
- **Verificación de campo** para asegurar que los ingenieros estén donde deben estar

---

## 🏗️ Arquitectura del Sistema

### 1. **CORE-APK (Aplicación Móvil)**

#### Servicio de Tracking GPS

**Archivo:** `/CORE-APK/src/services/locationTrackingService.ts`

**Funcionalidades:**

- Solicita permisos de ubicación al usuario
- Captura ubicación GPS continuamente usando Capacitor Geolocation API
- Guarda las ubicaciones en Firebase Realtime Database
- Actualiza automáticamente cada vez que el dispositivo se mueve
- Se activa automáticamente al iniciar sesión
- Se detiene al cerrar sesión

**Datos guardados:**

```javascript
{
  latitude: number,    // Latitud del dispositivo
  longitude: number,   // Longitud del dispositivo
  accuracy: number,    // Precisión en metros
  speed: number,       // Velocidad (opcional)
  heading: number,     // Dirección (opcional)
  timestamp: serverTimestamp(),
  lastUpdate: ISO String
}
```

**Estructura en Firebase:**

```
userLocations/
  ├─ username1/
  │   ├─ latitude: -34.123456
  │   ├─ longitude: -58.987654
  │   ├─ accuracy: 15
  │   ├─ lastUpdate: "2026-03-05T10:30:45.123Z"
  │   └─ timestamp: [Firebase ServerTimestamp]
  │
  └─ username2/
      ├─ latitude: -25.434567
      └─ ...
```

#### Integración en Dashboard

**Archivo:** `/CORE-APK/src/components/Dashboard.tsx`

Se agregó un `useEffect` que:

1. Detecta cuando un usuario inicia sesión
2. Inicia el servicio de tracking GPS automáticamente
3. Detiene el tracking cuando cierra sesión
4. Maneja el cleanup al desmontar el componente

```typescript
useEffect(() => {
  if (user && user.username) {
    locationTrackingService.startTracking(user.username);
  } else {
    locationTrackingService.stopTracking();
  }

  return () => {
    locationTrackingService.stopTracking();
  };
}, [user]);
```

---

### 2. **Plataforma Web (CORE)**

#### Servicio de Lectura de Ubicaciones

**Archivo:** `/src/services/userLocationService.ts`

**Funcionalidades:**

- Se suscribe a cambios en tiempo real en Firebase
- Obtiene todas las ubicaciones activas de usuarios
- Verifica si las ubicaciones son recientes (< 5 minutos)
- Proporciona callback para actualizar UI automáticamente

**Métodos principales:**

- `subscribeToAllUserLocations()`: Suscripción en tiempo real
- `getUserLocation(username)`: Obtener ubicación de un usuario específico
- `hasActiveLocation(username)`: Verificar si tiene ubicación activa

#### Visualización en Mapa

**Archivo:** `/src/components/LeafletMapView.tsx`

**Mejoras implementadas:**

1. **Import del servicio:**

```typescript
import userLocationService from "../services/userLocationService";
```

2. **Interface actualizada para Operadores:**

```typescript
interface OperadorMarker {
  // ... campos existentes
  isRealTime?: boolean; // Indica ubicación en tiempo real
  lastUpdate?: string; // Última actualización
  accuracy?: number; // Precisión GPS
}
```

3. **Suscripción automática:**
   Se agregó un `useEffect` que se activa cuando el modo del mapa es "operadores":

- Se suscribe a actualizaciones de Firebase en tiempo real
- Procesa las ubicaciones recibidas
- Combina con datos de reportes para mostrar información completa
- Actualiza los marcadores automáticamente
- Se desuscribe al cambiar de modo o desmontar

4. **Indicador visual mejorado:**

- Marcadores verdes para ubicaciones en tiempo real (🔴 EN VIVO)
- Marcadores azules para ubicaciones históricas
- Muestra hora de última actualización
- Muestra precisión del GPS en metros
- Lista de reportes recientes del técnico

---

## 🎯 Uso del Sistema

### Para Operadores/Técnicos (App Móvil)

1. **Inicia sesión** en CORE-APK
2. **Acepta los permisos** de ubicación cuando se soliciten
3. El tracking GPS se inicia **automáticamente**
4. Puedes usar la app normalmente - el tracking funciona en segundo plano
5. Al **cerrar sesión**, el tracking se detiene automáticamente

> **Nota:** La app debe tener permisos de ubicación concedidos para que funcione.

### Para Supervisores/Administradores (Plataforma Web)

1. Abre el **Mapa** en la plataforma web
2. Haz clic en el botón **"👷 Operadores"**
3. Verás todos los técnicos que tienen la app abierta y han iniciado sesión
4. Los marcadores se actualizan **automáticamente en tiempo real**
5. Haz clic en un marcador para ver:
   - Estado (EN VIVO o histórico)
   - Hora de última actualización
   - Precisión del GPS
   - Última actividad realizada
   - Reportes recientes

---

## 🔒 Consideraciones de Privacidad

- El tracking **solo funciona cuando el usuario está logueado** en la app
- Se detiene automáticamente al cerrar sesión
- Los usuarios son conscientes del tracking (solicitud de permisos)
- Solo se guarda la ubicación actual (no historial completo)
- Solo usuarios autorizados pueden ver las ubicaciones

---

## 📱 Permisos Necesarios

### Android (AndroidManifest.xml)

Ya incluido en CORE-APK:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (Info.plist)

Ya incluido en CORE-APK:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Se necesita acceso a tu ubicación para registrar las intervenciones en el mapa</string>
```

---

## 🔧 Configuración Técnica

### Firebase Realtime Database

La estructura de seguridad recomendada es:

```json
{
  "rules": {
    "userLocations": {
      "$username": {
        ".write": "$username === auth.uid || auth != null",
        ".read": "auth != null"
      }
    }
  }
}
```

Esto permite:

- Los usuarios pueden escribir solo su propia ubicación
- Todos los usuarios autenticados pueden leer todas las ubicaciones

---

## 🚀 Ventajas del Sistema

1. **Monitoreo en Tiempo Real**: Ver dónde están los técnicos ahora mismo
2. **Verificación de Campo**: Asegurar que estén donde deben estar
3. **Gestión Eficiente**: Asignar tareas según proximidad
4. **Seguridad**: Saber ubicación en caso de emergencia
5. **Automático**: No requiere acción manual del técnico
6. **Preciso**: Usa GPS nativo del dispositivo
7. **Eficiente**: Actualización inteligente solo cuando hay movimiento

---

## 🐛 Solución de Problemas

### El técnico no aparece en el mapa

**Posibles causas:**

1. No ha dado permisos de ubicación a la app
2. No ha iniciado sesión en CORE-APK
3. Su GPS está desactivado
4. No tiene conexión a internet
5. La ubicación fue actualizada hace más de 5 minutos

**Solución:**

1. Verificar permisos de ubicación en configuración del dispositivo
2. Reiniciar la app
3. Verificar conexión a internet
4. Activar GPS/ubicación en el dispositivo

### Las ubicaciones no se actualizan

**Posibles causas:**

1. Problemas de conexión a Firebase
2. Credenciales de Firebase incorrectas
3. Reglas de seguridad muy restrictivas

**Solución:**

1. Verificar consola de Firebase
2. Revisar logs en navegador (F12)
3. Verificar reglas de base de datos

---

## 📊 Métricas y Monitoreo

El sistema registra en consola:

- Inicio/detención de tracking
- Ubicaciones guardadas exitosamente
- Errores de permisos o GPS
- Número de operadores con ubicación activa

Revisar la consola del navegador (F12) para ver estos logs.

---

## 🔮 Mejoras Futuras Posibles

1. **Historial de rutas**: Guardar trayectorias completas
2. **Geocercas**: Alertas cuando salen de zona asignada
3. **Análisis de tiempo**: Tiempo en cada ubicación
4. **Optimización de rutas**: Sugerir rutas óptimas
5. **Modo offline**: Queue de actualizaciones cuando vuelva internet
6. **Batería inteligente**: Reducir frecuencia cuando batería baja

---

## ✅ Checklist de Implementación

- [x] Servicio de tracking GPS creado (CORE-APK)
- [x] Integración con Dashboard (CORE-APK)
- [x] Servicio de lectura de ubicaciones (Web)
- [x] Visualización en mapa (Web)
- [x] Indicadores visuales de tiempo real
- [x] Manejo de permisos
- [x] Cleanup y desuscripciones
- [x] Testing de errores
- [x] Documentación completa

---

## 📞 Soporte

Para problemas o dudas sobre este sistema, contactar al equipo de desarrollo con:

- Logs de consola (F12 en navegador)
- Descripción del problema
- Usuario afectado
- Capturas de pantalla si es posible

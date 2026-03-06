# 🔄 Migración a Firestore - Ubicaciones en Vivo

## ✅ Cambio Implementado

Se ha migrado el sistema de ubicaciones en vivo de **Firebase Realtime Database** a **Firestore** debido a que Realtime Database no estaba activado en el proyecto.

---

## 📦 Cambios en Main Core (Web) - ✅ COMPLETADO

### 1. Servicio actualizado
- **Archivo:** `src/services/userLocationService.ts`
- **Cambio:** Ahora usa Firestore en lugar de Realtime Database
- **Colección:** `live_locations` en Firestore

### 2. Herramientas de diagnóstico actualizadas
- ✅ `public/diagnostic-live-locations.html` → Ahora usa Firestore
- ✅ `public/test-send-location.html` → Ahora usa Firestore

---

## 📱 CORE-APK - REQUIERE ACTUALIZACIÓN

Para que la aplicación CORE-APK envíe ubicaciones al nuevo sistema, necesitas actualizar el código de tracking.

### 🔧 Cambios Necesarios en CORE-APK

#### Antes (Realtime Database):
```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

const database = getDatabase();
const liveLocationsRef = ref(database, 'live_locations');
const newLocationRef = push(liveLocationsRef);
await set(newLocationRef, locationData);
```

#### Después (Firestore):
```typescript
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const database = getFirestore();
const liveLocationsRef = collection(database, 'live_locations');
await addDoc(liveLocationsRef, locationData);
```

---

## 📝 Instrucciones Detalladas para CORE-APK

### 1. Actualizar imports en LiveLocationService

**Archivo:** `src/services/LiveLocationService.ts` (o similar)

**Buscar:**
```typescript
import { getDatabase, ref, push, set } from 'firebase/database';
```

**Reemplazar con:**
```typescript
import { getFirestore, collection, addDoc } from 'firebase/firestore';
```

### 2. Actualizar inicialización de database

**Buscar:**
```typescript
const database = getDatabase();
```

**Reemplazar con:**
```typescript
const database = getFirestore();
```

### 3. Actualizar método de envío de ubicaciones

**Buscar:**
```typescript
async sendLocationToFirebase(locationData: any) {
  try {
    const database = getDatabase();
    const liveLocationsRef = ref(database, 'live_locations');
    const newLocationRef = push(liveLocationsRef);
    await set(newLocationRef, locationData);
    console.log('✅ Location sent to Firebase');
  } catch (error) {
    console.error('❌ Error sending location:', error);
  }
}
```

**Reemplazar con:**
```typescript
async sendLocationToFirebase(locationData: any) {
  try {
    const database = getFirestore();
    const liveLocationsRef = collection(database, 'live_locations');
    await addDoc(liveLocationsRef, locationData);
    console.log('✅ Location sent to Firestore');
  } catch (error) {
    console.error('❌ Error sending location:', error);
  }
}
```

### 4. Verificar estructura de datos

El formato de `locationData` debe ser el mismo:

```typescript
const locationData = {
  deviceId: string,      // ID único del dispositivo
  username: string,      // Usuario actual
  latitude: number,      // Latitud GPS
  longitude: number,     // Longitud GPS
  timestamp: string,     // ISO timestamp
  accuracy: number,      // Precisión en metros
  altitude?: number,     // Altitud (opcional)
  speed?: number,        // Velocidad m/s (opcional)
  heading?: number       // Dirección grados (opcional)
};
```

---

## 🧪 Pruebas

### Prueba 1: Test Manual desde Web

1. Abre: `http://localhost:3002/test-send-location.html`
2. Haz clic en "Obtener Mi Ubicación GPS"
3. Haz clic en "Enviar Ubicación de Prueba"
4. Deberías ver: ✅ Ubicación enviada exitosamente

### Prueba 2: Verificar en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Proyecto: **coredatabase-206ac**
3. Ve a **Firestore Database**
4. Busca la colección: `live_locations`
5. Deberías ver documentos con las ubicaciones

### Prueba 3: Diagnóstico en Vivo

1. Abre: `http://localhost:3002/diagnostic-live-locations.html`
2. Debe mostrar: "✅ Conectado a Firestore"
3. Debe listar las ubicaciones encontradas

### Prueba 4: Mapa de Operadores

1. Abre Main Core: `http://localhost:3002`
2. Inicia sesión
3. Ve a "Gestión de Reportes"
4. Haz clic en "👷 Operadores"
5. Deberías ver los marcadores en el mapa

---

## 🔥 Reglas de Firestore

Asegúrate de tener reglas apropiadas en Firestore:

### Para Desarrollo:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /live_locations/{locationId} {
      allow read, write: true;
    }
  }
}
```

### Para Producción (más seguras):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /live_locations/{locationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
                    && request.resource.data.username == request.auth.token.email.split('@')[0];
      allow update, delete: if false;
    }
  }
}
```

---

## 🚀 Ventajas de Firestore vs Realtime Database

✅ **Mejor escalabilidad** → Maneja más consultas simultáneas
✅ **Queries más potentes** → Filtros, ordenamiento, paginación
✅ **Facturación más clara** → Cobro por operaciones, no por conexiones
✅ **Offline support** → Mejor soporte para apps móviles
✅ **Estructura más flexible** → Documentos con subcollections

---

## 📞 Siguiente Paso

**IMPORTANTE:** Actualiza el código de CORE-APK siguiendo las instrucciones anteriores y vuelve a compilar la aplicación.

Una vez actualizado:
1. Instala la nueva versión en Android
2. Inicia sesión
3. Otorga permisos de ubicación
4. Verifica que aparezca en el mapa de operadores

---

## ✅ Checklist

- [ ] Actualizar imports en CORE-APK
- [ ] Cambiar `getDatabase()` por `getFirestore()`
- [ ] Cambiar `ref/push/set` por `collection/addDoc`
- [ ] Compilar nueva versión de CORE-APK
- [ ] Instalar en dispositivo Android
- [ ] Probar envío de ubicaciones
- [ ] Verificar en herramienta de diagnóstico
- [ ] Verificar en mapa de operadores

---

**Fecha de cambio:** 5 de marzo de 2026  
**Versión Main Core:** Actualizada a Firestore  
**Versión CORE-APK:** Pendiente de actualización

# 🔧 Guía de Diagnóstico - Ubicaciones en Vivo

## ⚠️ Problema: No aparecen las ubicaciones de los operadores

Si has instalado CORE-APK en un dispositivo Android, otorgado permisos de ubicación, pero no ves la posición en el mapa de operadores, sigue esta guía de diagnóstico paso a paso.

---

## 📋 Checklist de Verificación

### 1. ✅ Verificar que CORE-APK esté enviando datos

**En el dispositivo Android:**

1. Abre CORE-APK
2. Inicia sesión con el usuario
3. Verifica que aparezca un indicador de GPS activo
4. Revisa los logs de la aplicación (si tienes acceso a depuración)

**Puntos clave:**
- ¿El usuario inició sesión correctamente?
- ¿Se otorgaron permisos de ubicación?
- ¿La app tiene acceso a GPS (no solo Wi-Fi)?

---

### 2. 🔍 Usar Herramientas de Diagnóstico

#### A. **Test de Envío Manual**

Abre en tu navegador:
```
http://localhost:3002/test-send-location.html
```

**Pasos:**
1. Ingresa el nombre del usuario de prueba
2. Haz clic en "Obtener Mi Ubicación GPS" (permite el acceso)
3. Haz clic en "Enviar Ubicación de Prueba"
4. Si aparece "✅ Ubicación enviada exitosamente", ve al paso B

**Si falla aquí:** El problema es con Firebase, revisa:
- Configuración de Firebase
- Reglas de seguridad de Realtime Database
- Conexión a internet

#### B. **Herramienta de Diagnóstico en Vivo**

Abre en tu navegador:
```
http://localhost:3002/diagnostic-live-locations.html
```

**Qué verificar:**
- ✅ **Conectado a Firebase**: Debe mostrar estado verde
- 📊 **Total de registros**: Debe ser > 0 si hay datos
- 📍 **Ubicaciones Detectadas**: Debe listar los dispositivos

**Ejemplo de salida correcta:**
```
✅ Conectado a Firebase
Total de registros: 5
Ubicaciones recientes: 3
Usuarios únicos: 3
```

---

### 3. 🔥 Verificar Firebase Realtime Database

#### Opción A: desde la consola de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **coredatabase-206ac**
3. Ve a **Realtime Database** (en el menú lateral)
4. Busca el nodo: `/live_locations`

**Debe verse así:**
```
live_locations/
  ├─ -Nxxx...
  │   ├─ deviceId: "device_abc123..."
  │   ├─ username: "juan.perez"
  │   ├─ latitude: 18.486058
  │   ├─ longitude: -69.931212
  │   ├─ timestamp: "2026-03-05T..."
  │   └─ accuracy: 5.2
  └─ -Nyyy...
      └─ ...
```

#### Opción B: Verificar Reglas de Seguridad

En **Realtime Database > Reglas**, debe permitir lectura/escritura:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **NOTA:** Estas reglas son para desarrollo. En producción, implementa reglas más restrictivas.

---

### 4. 📱 Verificar en el Dispositivo Android

#### A. Permisos de Ubicación

Android **CORE-APK** necesita:
- ✅ Permiso de ubicación (Permitir todo el tiempo o Permitir solo mientras se usa)
- ✅ GPS activado en el dispositivo
- ✅ Internet activo (WiFi o datos móviles)

**Verificar manualmente:**
1. Configuración > Aplicaciones > CORE-APK > Permisos
2. Ubicación debe estar en "Permitir"
3. Si dice "Denegar", otorga el permiso

#### B. Verificar que el servicio esté corriendo

Si tienes acceso a **logcat** (Android Studio):

```bash
adb logcat | grep "LiveLocation"
```

Deberías ver:
```
LiveLocationService: Starting live tracking...
LiveLocationService: Location sent to Firebase
```

---

### 5. 🌐 Verificar Configuración de Red

#### A. Firewall o Proxy

¿Estás detrás de un firewall corporativo?
- Firebase Realtime Database usa WebSocket
- Algunos firewall bloquean conexiones WebSocket
- Prueba con otra red (ej: datos móviles)

#### B. DNS

Firebase requiere resolver:
```
firebaseio.com
googleapis.com
```

Prueba:
```bash
ping coredatabase-206ac-default-rtdb.firebaseio.com
```

---

### 6. 🔄 Verificar en el Main Core (Web)

Abre la consola del navegador (F12) y ve a la pestaña **Console**.

#### A. Logs Esperados

Cuando hagas clic en el botón "👷 Operadores", deberías ver:

```
🔄 Iniciando suscripción a /live_locations en Firebase...
📡 Snapshot recibido de Firebase
📊 Snapshot existe: true
📦 Datos brutos recibidos: {-Nxxx: {...}, -Nyyy: {...}}
🔢 Número de claves en data: 5
✅ Ubicación agregada: juan.perez
📍 Total ubicaciones válidas encontradas: 5
👥 Usuarios únicos con ubicación: 5
```

#### B. Errores Comunes

**Error:** `Firebase: No se encontró el proyecto`
```
❌ Revisar firebaseConfig en src/config/firebase.ts
```

**Error:** `Permission denied`
```
❌ Reglas de seguridad de Firebase muy restrictivas
```

**Error:** `Network request failed`
```
❌ Problema de conectividad o firewall
```

---

## 🛠️ Soluciones Rápidas

### Problema: No aparecen datos en Firebase

**Solución 1:** Revisar código CORE-APK

Verifica que el archivo de tracking incluya:

```typescript
const liveLocationsRef = ref(database, 'live_locations');
const newLocationRef = push(liveLocationsRef);
await set(newLocationRef, locationData);
```

**Solución 2:** Verificar que el usuario inició sesión

El tracking solo funciona si el usuario está autenticado:

```typescript
if (!username) {
  console.error('No hay usuario autenticado');
  return;
}
```

---

### Problema: Datos antiguos en Firebase

Las ubicaciones de más de 5 minutos no se muestran.

**Verificar timestamp:**
```javascript
{
  timestamp: "2026-03-05T14:30:00.000Z"  // ✅ Formato correcto
}
```

**Solución:** Asegúrate de que el dispositivo tenga la hora correcta (sincronizada).

---

### Problema: Aparece pero con estado "DESCONECTADO"

**Causas:**
- Ubicación de más de 5 minutos de antigüedad
- El servicio de tracking se detuvo en la app
- El dispositivo perdió conexión a internet

**Solución:**
1. Abre CORE-APK nuevamente
2. Verifica que el usuario siga conectado
3. Espera 5-10 segundos
4. Refresca el mapa en Main Core

---

## 📞 Contacto de Soporte

Si después de seguir todos estos pasos el problema persiste:

1. **Captura de pantalla** de la herramienta de diagnóstico
2. **Logs** de la consola del navegador (F12)
3. **Logs** del dispositivo Android (si es posible)
4. **Versión** de CORE-APK instalada

---

## ✅ Checklist Final

- [ ] Firebase Realtime Database creada
- [ ] databaseURL configurado en firebase.ts
- [ ] Reglas de Firebase permiten lectura/escritura
- [ ] CORE-APK tiene permisos de ubicación
- [ ] Usuario inició sesión en CORE-APK
- [ ] GPS activado en el dispositivo
- [ ] Internet activo en el dispositivo
- [ ] Datos visibles en `/live_locations` en Firebase Console
- [ ] Herramienta de diagnóstico muestra datos
- [ ] Main Core muestra operadores en el mapa

---

**Última actualización:** 5 de marzo de 2026

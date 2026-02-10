# 🤖 INSTRUCCIONES PARA EL AGENTE - CORE-APK
## Guía Rápida de Implementación

> **Para el Agente Implementador:** Sigue estos pasos EN ORDEN. Todo está preparado y listo para aplicar.

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

```
[ ] Paso 1: Copiar servicios de Firebase
[ ] Paso 2: Copiar hook de imágenes
[ ] Paso 3: Instalar dependencias
[ ] Paso 4: Configurar Firebase
[ ] Paso 5: Actualizar tipos/interfaces
[ ] Paso 6: Integrar en formulario de reportes
[ ] Paso 7: Configurar reglas de Firebase
[ ] Paso 8: Probar flujo completo
```

---

## 🚀 PASO 1: COPIAR SERVICIOS DE FIREBASE

### 1.1 Firebase Report Storage

**Crear archivo:** `src/services/firebaseReportStorage.ts`

**Copiar código completo desde:** [CONFIGURACION_CORE_APK_COMPLETA.md](CONFIGURACION_CORE_APK_COMPLETA.md#1-firebase-report-storage-firebasereportstoragets)

**Funciones principales:**
- `saveReport(report)` → Guardar/actualizar reporte
- `getReport(id)` → Obtener reporte por ID
- `getUserReports(userId)` → Obtener reportes del usuario
- `getReportsByEstado(estado)` → Filtrar por estado
- `deleteReport(id)` → Eliminar reporte
- `updateReport(id, updates)` → Actualizar parcialmente

### 1.2 Firebase Image Storage

**Crear archivo:** `src/services/firebaseImageStorage.ts`

**Copiar código completo desde:** [CONFIGURACION_CORE_APK_COMPLETA.md](CONFIGURACION_CORE_APK_COMPLETA.md#2-firebase-image-storage-firebaseimagestorages)

**Funciones principales:**
- `uploadImage(file, reportId, dayIndex)` → Subir una imagen
- `deleteImage(path)` → Eliminar imagen
- `getDayImages(reportId, dayIndex)` → Obtener imágenes de un día
- `getReportImages(reportId)` → Obtener todas las imágenes del reporte
- `compressImage(file)` → Comprimir antes de subir
- `compressAndUpload(file, reportId, dayIndex)` → **Función recomendada** (comprime y sube)

---

## 🪝 PASO 2: COPIAR HOOK DE IMÁGENES

**Crear archivo:** `src/hooks/useReportImages.ts`

**Copiar código completo desde:** [CONFIGURACION_CORE_APK_COMPLETA.md](CONFIGURACION_CORE_APK_COMPLETA.md#hook-de-react-para-manejo-de-fotos)

**Uso:**
```typescript
const {
  images,          // Array de fotos actuales
  uploading,       // ¿Está subiendo?
  uploadProgress,  // Progreso 0-100
  addImage,        // Función para agregar foto
  removeImage,     // Función para eliminar foto
  canAddMore,      // ¿Puede agregar más?
  remainingSlots   // Cuántas quedan disponibles
} = useReportImages(reportId, dayIndex, 2);
```

---

## 📦 PASO 3: INSTALAR DEPENDENCIAS

```bash
npm install firebase
```

O si usas yarn:
```bash
yarn add firebase
```

**Verificar versión mínima:** Firebase >= 9.0.0

---

## 🔧 PASO 4: CONFIGURAR FIREBASE

### 4.1 Crear/Actualizar Configuración

**Archivo:** `src/config/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDfb_DlMOm8n7HLyKfcQD0ePgUq1kNgPs4",
  authDomain: "plataforma-mopc.firebaseapp.com",
  projectId: "plataforma-mopc",
  storageBucket: "plataforma-mopc.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export default app;
```

**Nota:** Usa las credenciales reales de tu proyecto Firebase.

### 4.2 Verificar Conexión

```typescript
// Agregar esto temporalmente para probar
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import app from './config/firebase';

const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firebase conectado:', app.name);
```

---

## 📊 PASO 5: ACTUALIZAR TIPOS/INTERFACES

### 5.1 Crear/Actualizar Tipos de Reporte

**Archivo:** `src/types/report.types.ts` (crear si no existe)

```typescript
export interface ImageData {
  url: string;
  path: string;
  size: number;
  timestamp: string;
  localPreview?: string;
}

export interface DayReportData {
  fecha: string;
  tipoIntervencion: string;
  subTipoCanal?: string;
  observaciones?: string;
  plantillaValues: Record<string, string>;
  metricData?: Record<string, string>;
  autoGpsFields?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  gpsData?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  vehiculos: Array<{
    tipo: string;
    modelo: string;
    ficha: string;
  }>;
  images?: ImageData[];
  completado: boolean;
}

export interface ReportData {
  // Identificadores
  id: string;
  numeroReporte: string;
  
  // Timestamps
  timestamp: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  
  // Usuario
  creadoPor: string;
  usuarioId: string;
  
  // Ubicación
  region: string;
  provincia: string;
  distrito: string;
  municipio: string;
  sector: string;
  
  // Trabajo
  tipoIntervencion: string;
  subTipoCanal?: string;
  
  // Datos técnicos
  metricData: Record<string, string>;
  plantillaValues?: Record<string, string>;
  
  // GPS
  gpsData?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  autoGpsFields?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  
  // Vehículos
  vehiculos: Array<{
    tipo: string;
    modelo: string;
    ficha: string;
  }>;
  
  // Fotos
  images?: ImageData[];
  
  // Observaciones
  observaciones?: string;
  
  // Estado
  estado: 'pendiente' | 'completado' | 'aprobado' | 'en progreso';
  
  // Multi-día (si aplica)
  esProyectoMultiDia?: boolean;
  fechaInicio?: string;
  fechaFinal?: string;
  diasTrabajo?: string[];
  diaActual?: number;
  reportesPorDia?: Record<string, DayReportData>;
  imagesPerDay?: Record<string, ImageData[]>;
}
```

---

## 🎨 PASO 6: INTEGRAR EN FORMULARIO DE REPORTES

### 6.1 Encontrar el Componente de Formulario

Buscar archivo que maneje el formulario de reportes. Probablemente:
- `src/screens/ReportForm.tsx`
- `src/components/ReportForm.tsx`
- `src/pages/NewReport.tsx`

### 6.2 Agregar Imports

```typescript
import { useState, useEffect } from 'react';
import { useReportImages } from '../hooks/useReportImages';
import firebaseReportStorage from '../services/firebaseReportStorage';
import { ImageData } from '../types/report.types';
```

### 6.3 Agregar Estados

```typescript
// En el componente de formulario

// ID del reporte
const [reportId, setReportId] = useState(`DCR_${Date.now()}`);

// Multi-día
const [fechaInicio, setFechaInicio] = useState('');
const [fechaFinal, setFechaFinal] = useState('');
const [diasTrabajo, setDiasTrabajo] = useState<string[]>([]);
const [diaActual, setDiaActual] = useState(0);
const [reportesPorDia, setReportesPorDia] = useState<Record<string, DayReportData>>({});
const [imagesPerDay, setImagesPerDay] = useState<Record<string, ImageData[]>>({});

// Datos del formulario actual (ubicación, métricas, etc.)
// ... tus estados existentes ...
```

### 6.4 Agregar Componente de Fotos

```typescript
// Componente para manejar fotos del día actual
const PhotosSection = () => {
  const {
    images,
    uploading,
    uploadProgress,
    addImage,
    removeImage,
    canAddMore,
    remainingSlots
  } = useReportImages(reportId, diaActual, 2);

  // Sincronizar con estado principal
  useEffect(() => {
    const dayKey = `dia-${diaActual}`;
    setImagesPerDay(prev => ({
      ...prev,
      [dayKey]: images
    }));
  }, [images]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await addImage(file);
      if (success) {
        // Opcional: mostrar toast de éxito
        console.log('✅ Foto agregada');
      }
      e.target.value = ''; // Limpiar input
    }
  };

  return (
    <View style={styles.photosSection}>
      <Text style={styles.sectionTitle}>
        📸 Fotos del Día {diaActual + 1}
      </Text>
      <Text style={styles.subtitle}>
        Puedes agregar hasta 2 fotos. Restantes: {remainingSlots}
      </Text>

      {/* Botón para agregar foto */}
      {canAddMore && (
        <TouchableOpacity 
          style={styles.addPhotoButton}
          onPress={() => {
            // Aquí implementar según tu plataforma:
            // - Web: usar input file
            // - React Native: usar ImagePicker
          }}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? '⏳ Subiendo...' : '📷 Tomar Foto'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Progreso */}
      {uploading && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          <Text>{uploadProgress}%</Text>
        </View>
      )}

      {/* Galería */}
      <View style={styles.photosGrid}>
        {images.map((img, index) => (
          <View key={index} style={styles.photoItem}>
            <Image
              source={{ uri: img.localPreview || img.url }}
              style={styles.photoThumbnail}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Text>❌</Text>
            </TouchableOpacity>
            <Text style={styles.photoSize}>
              {(img.size / 1024).toFixed(0)} KB
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
```

### 6.5 Agregar Funciones de Guardado

```typescript
/**
 * 💾 GUARDAR DÍA ACTUAL
 */
const guardarDiaActual = async () => {
  if (diasTrabajo.length === 0) return;
  
  const diaKey = diasTrabajo[diaActual];
  
  const datosDelDia: DayReportData = {
    fecha: diaKey,
    tipoIntervencion,
    subTipoCanal,
    observaciones,
    plantillaValues,
    metricData: plantillaValues,
    autoGpsFields,
    gpsData: autoGpsFields,
    vehiculos,
    completado: true
  };
  
  setReportesPorDia(prev => ({
    ...prev,
    [diaKey]: datosDelDia
  }));
  
  console.log(`✅ Día ${diaActual + 1} guardado`);
};

/**
 * 💾 GUARDAR REPORTE COMPLETO
 */
const guardarReporte = async (esCompletado: boolean = false) => {
  try {
    // Validar antes de guardar
    if (!validarDiaActual()) {
      return;
    }
    
    // Guardar día actual
    await guardarDiaActual();
    
    // Construir reporte
    const reporteCompleto: ReportData = {
      id: reportId,
      numeroReporte: reportId,
      timestamp: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
      fechaCreacion: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
      creadoPor: user?.name || "Desconocido",
      usuarioId: user?.username || "desconocido",
      
      region,
      provincia,
      distrito,
      municipio,
      sector,
      
      esProyectoMultiDia: diasTrabajo.length > 1,
      fechaInicio,
      fechaFinal,
      diasTrabajo,
      diaActual,
      reportesPorDia,
      imagesPerDay,
      
      tipoIntervencion,
      subTipoCanal,
      observaciones,
      metricData: plantillaValues,
      plantillaValues,
      gpsData: autoGpsFields,
      autoGpsFields,
      vehiculos,
      
      estado: esCompletado ? 'completado' : 'en progreso'
    };
    
    // Guardar en Firebase
    await firebaseReportStorage.saveReport(reporteCompleto);
    
    console.log('✅ Reporte guardado exitosamente');
    // Mostrar mensaje al usuario
    
  } catch (error) {
    console.error('❌ Error guardando reporte:', error);
    // Mostrar error al usuario
  }
};

/**
 * ➡️ AVANZAR AL SIGUIENTE DÍA
 */
const avanzarAlSiguienteDia = async () => {
  try {
    // Guardar día actual
    await guardarReporte(false);
    
    // Verificar si hay más días
    if (diaActual < diasTrabajo.length - 1) {
      // Hay más días, avanzar
      const nuevoDiaActual = diaActual + 1;
      setDiaActual(nuevoDiaActual);
      
      // Cargar datos del siguiente día si existen
      const siguienteDiaKey = diasTrabajo[nuevoDiaActual];
      const datosSiguienteDia = reportesPorDia[siguienteDiaKey];
      
      if (datosSiguienteDia) {
        // Cargar datos guardados
        setTipoIntervencion(datosSiguienteDia.tipoIntervencion);
        setSubTipoCanal(datosSiguienteDia.subTipoCanal || '');
        setObservaciones(datosSiguienteDia.observaciones || '');
        setPlantillaValues(datosSiguienteDia.plantillaValues);
        setAutoGpsFields(datosSiguienteDia.autoGpsFields || {});
      } else {
        // Nuevo día, limpiar campos
        setTipoIntervencion('');
        setSubTipoCanal('');
        setObservaciones('');
        setPlantillaValues({});
        setAutoGpsFields({});
        // vehiculos persisten automáticamente
      }
      
      console.log(`➡️ Día ${nuevoDiaActual + 1}/${diasTrabajo.length}`);
    } else {
      // Último día, completar reporte
      await guardarReporte(true);
      console.log('✅ Reporte completado');
      // Navegar de vuelta o mostrar resumen
    }
  } catch (error) {
    console.error('❌ Error avanzando al siguiente día:', error);
  }
};

/**
 * ✅ VALIDAR DÍA ACTUAL
 */
const validarDiaActual = (): boolean => {
  const errores: string[] = [];
  
  if (!tipoIntervencion) {
    errores.push('Selecciona tipo de intervención');
  }
  
  const plantillaCompleta = plantillaFields.every(field => 
    plantillaValues[field.key]?.trim()
  );
  
  if (!plantillaCompleta) {
    errores.push('Completa todos los campos de métricas');
  }
  
  if (vehiculos.length === 0) {
    errores.push('Agrega al menos un vehículo');
  }
  
  if (!autoGpsFields.punto_inicial && !autoGpsFields.punto_alcanzado) {
    errores.push('Captura al menos un punto GPS');
  }
  
  if (errores.length > 0) {
    alert('Errores:\n' + errores.join('\n'));
    return false;
  }
  
  return true;
};
```

### 6.6 Integrar en el Render

```typescript
return (
  <View style={styles.container}>
    {/* Header con navegación de días */}
    {diasTrabajo.length > 1 && (
      <View style={styles.dayNavigation}>
        <Text style={styles.dayIndicator}>
          Día {diaActual + 1} de {diasTrabajo.length}
        </Text>
        <Text style={styles.dateIndicator}>
          {diasTrabajo[diaActual]}
        </Text>
      </View>
    )}

    {/* Formulario normal */}
    {/* ... tus campos existentes ... */}

    {/* Sección de fotos */}
    <PhotosSection />

    {/* Botones de acción */}
    <View style={styles.actionButtons}>
      <Button 
        title="💾 Guardar Progreso" 
        onPress={() => guardarReporte(false)}
      />
      
      {diaActual < diasTrabajo.length - 1 ? (
        <Button 
          title="➡️ Siguiente Día" 
          onPress={avanzarAlSiguienteDia}
        />
      ) : (
        <Button 
          title="✅ Completar Reporte" 
          onPress={() => guardarReporte(true)}
        />
      )}
    </View>
  </View>
);
```

---

## 🔒 PASO 7: CONFIGURAR REGLAS DE FIREBASE

### 7.1 Reglas de Firestore

En Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      // Lectura: todos los autenticados
      allow read: if request.auth != null;
      
      // Escritura: solo el creador
      allow create: if request.auth != null;
      allow update: if request.auth != null 
                    && resource.data.usuarioId == request.auth.token.username;
      allow delete: if request.auth != null
                    && resource.data.usuarioId == request.auth.token.username;
    }
  }
}
```

### 7.2 Reglas de Storage

En Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reportes/{reportId}/{day}/{filename} {
      // Lectura: todos los autenticados
      allow read: if request.auth != null;
      
      // Escritura: usuarios autenticados
      allow write: if request.auth != null;
      
      // Validaciones
      allow create: if request.resource.contentType.matches('image/.*')
                    && request.resource.size < 5 * 1024 * 1024; // Máx 5MB
    }
  }
}
```

---

## 🧪 PASO 8: PROBAR FLUJO COMPLETO

### 8.1 Prueba Básica

```
1. Crear reporte nuevo
2. Llenar datos de ubicación
3. Llenar datos técnicos
4. Agregar 2 fotos
5. Guardar
6. Verificar en Firebase Console que aparezca en Firestore
7. Verificar en Firebase Console que las fotos estén en Storage
```

### 8.2 Prueba Multi-Día

```
1. Crear reporte multi-día (3 días)
2. Llenar Día 1 completo con 2 fotos
3. Guardar y avanzar al Día 2
4. Llenar Día 2 con 2 fotos diferentes
5. Guardar y avanzar al Día 3
6. Llenar Día 3 con 2 fotos diferentes
7. Completar reporte
8. Verificar estructura en Firebase:
   - reportesPorDia debe tener 3 entradas
   - imagesPerDay debe tener dia-0, dia-1, dia-2
   - Storage debe tener 6 fotos en total
```

### 8.3 Comandos de Verificación

```typescript
// Agregar esto temporalmente para debug
const testReport = async () => {
  const reportId = "DCR_2026_001";
  
  // Obtener reporte
  const report = await firebaseReportStorage.getReport(reportId);
  console.log('📊 Reporte:', report);
  
  // Obtener fotos
  const images = await firebaseImageStorage.getReportImages(reportId);
  console.log('📸 Fotos:', images);
  
  // Verificar estructura
  if (report?.esProyectoMultiDia) {
    console.log('✅ Multi-día detectado');
    console.log('Días:', report.diasTrabajo);
    console.log('Reportes por día:', Object.keys(report.reportesPorDia || {}));
    console.log('Fotos por día:', Object.keys(images));
  }
};
```

---

## ⚠️ NOTAS IMPORTANTES

### Si usas React Native:

1. **Compresión de imágenes**: Reemplazar `compressImage` por:
   ```bash
   npm install react-native-image-compressor
   ```

2. **Selector de imágenes**: Usar:
   ```bash
   npm install react-native-image-picker
   ```

3. **Firebase**: Usar:
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/storage
   ```

### Si usas TypeScript:

Asegúrate de que todos los tipos estén correctamente importados y definidos.

### Manejo de Errores:

Agrega try-catch en todas las funciones async y muestra mensajes claros al usuario.

### Optimización:

- Comprimir fotos antes de subir (ya implementado)
- Mostrar previews mientras se sube
- Permitir modo offline con sincronización posterior

---

## ✅ CHECKLIST FINAL

Antes de dar por terminado, verificar:

```
[ ] Servicios de Firebase funcionan correctamente
[ ] Hook de imágenes funciona (agregar/eliminar)
[ ] Máximo 2 fotos por día se respeta
[ ] Fotos se suben a carpetas correctas (dia-0, dia-1, etc.)
[ ] Datos por día se guardan independientemente
[ ] Vehículos persisten entre días
[ ] Navegación entre días funciona
[ ] Estado del reporte se actualiza correctamente
[ ] Validaciones funcionan
[ ] Reglas de Firebase configuradas
[ ] Probado en dispositivo real (si es móvil)
```

---

## 📞 SOPORTE

Si hay problemas:

1. **Revisar logs de consola** para errores específicos
2. **Verificar Firebase Console** para ver si los datos llegaron
3. **Revisar reglas de Firebase** si hay errores de permisos
4. **Verificar credenciales** de Firebase
5. **Revisar tipos/interfaces** si hay errores de TypeScript

---

## 🎉 ¡LISTO!

Con esto tienes todo lo necesario para implementar el sistema completo. El documento principal tiene todos los detalles y ejemplos. Esta guía es solo el resumen de pasos.

**Orden de lectura:**
1. Esta guía (pasos rápidos)
2. [CONFIGURACION_CORE_APK_COMPLETA.md](CONFIGURACION_CORE_APK_COMPLETA.md) (detalles completos)
3. Código fuente en `core` (referencia)

# 📸 GUÍA DE INTEGRACIÓN - Sistema de Fotos para Reportes

## 🎯 Resumen

Sistema completo para agregar, comprimir y subir fotos a Firebase Storage en los reportes multi-día.

---

## 📁 Archivos Creados

### 1. `src/services/firebaseImageStorage.ts`

**Qué hace:** Servicio principal para subir/bajar/eliminar fotos de Firebase Storage
**Copiar a:** `core-apk/src/services/firebaseImageStorage.ts`

### 2. `src/hooks/useReportImages.ts`

**Qué hace:** Hook de React para manejar el estado de las fotos
**Copiar a:** `core-apk/src/hooks/useReportImages.ts`

---

## 🚀 Cómo Integrar en core-apk

### Paso 1: Copiar Archivos

```bash
# En core-apk, copiar estos archivos:
cp core/src/services/firebaseImageStorage.ts src/services/
cp core/src/hooks/useReportImages.ts src/hooks/
```

### Paso 2: Instalar Dependencias (solo en web)

```bash
# Ya está instalado en core, en core-apk si usas web:
npm install firebase
```

**NOTA:** Si core-apk es React Native, debes:

- Usar `react-native-firebase` en lugar de `firebase` web
- Cambiar la compresión por `react-native-image-compressor`

---

## 💻 Uso en Componentes (Ejemplo Completo)

### Ejemplo 1: Componente Simple con Fotos

```typescript
import React from 'react';
import { useReportImages } from '../hooks/useReportImages';

function ReportFormWithPhotos() {
  const reportId = 'DCR_2026_001';
  const dayIndex = 0; // Día actual en multi-día

  // Hook que maneja todo
  const {
    images,           // Array de fotos
    uploading,        // ¿Está subiendo?
    uploadProgress,   // Progreso 0-100
    addImage,         // Agregar foto
    removeImage,      // Eliminar foto
    canAddMore        // ¿Puede agregar más?
  } = useReportImages(reportId, dayIndex, 2); // Máx 2 fotos

  // Handler para cuando seleccionan archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addImage(file);
    }
  };

  return (
    <div>
      <h3>📸 Fotos del Día {dayIndex + 1}</h3>

      {/* Botón para agregar foto */}
      {canAddMore && (
        <label>
          <input
            type="file"
            accept="image/*"
            capture="environment"  // Abre cámara en móviles
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <button disabled={uploading}>
            {uploading ? '⏳ Subiendo...' : '📷 Agregar Foto'}
          </button>
        </label>
      )}

      {/* Progreso de subida */}
      {uploading && (
        <div>
          <progress value={uploadProgress} max="100" />
          <span>{uploadProgress}%</span>
        </div>
      )}

      {/* Mostrar fotos */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {images.map((img, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <img
              src={img.localPreview || img.url}
              alt={`Foto ${index + 1}`}
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
            <button
              onClick={() => removeImage(index)}
              style={{ position: 'absolute', top: 0, right: 0 }}
            >
              ❌
            </button>
            <p>{(img.size / 1024).toFixed(0)} KB</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📸 Ejemplo 2: Con Cámara Nativa (React Native)

```typescript
import { launchCamera } from 'react-native-image-picker';
import { useReportImages } from '../hooks/useReportImages';

function CameraButton() {
  const { addImage } = useReportImages('DCR_2026_001', 0, 2);

  const takePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: false,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
    });

    if (result.assets?.[0]?.uri) {
      // Convertir a File/Blob según tu setup
      const file = await fetch(result.assets[0].uri)
        .then(r => r.blob());

      await addImage(file as any);
    }
  };

  return (
    <button onClick={takePhoto}>
      📷 Tomar Foto
    </button>
  );
}
```

---

## 🗂️ Ejemplo 3: Multi-Día con Fotos por Día

```typescript
import { useReportImages } from '../hooks/useReportImages';

function MultiDayReportForm() {
  const reportId = 'DCR_2026_001';
  const [diaActual, setDiaActual] = useState(0);
  const diasTrabajo = ['2026-02-04', '2026-02-05', '2026-02-06'];

  // Hook separado para cada día
  const dia0Photos = useReportImages(reportId, 0, 2);
  const dia1Photos = useReportImages(reportId, 1, 2);
  const dia2Photos = useReportImages(reportId, 2, 2);

  const photosHooks = [dia0Photos, dia1Photos, dia2Photos];
  const currentDayPhotos = photosHooks[diaActual];

  return (
    <div>
      {/* Navegación de días */}
      <div>
        {diasTrabajo.map((dia, index) => (
          <button
            key={index}
            onClick={() => setDiaActual(index)}
            style={{
              fontWeight: diaActual === index ? 'bold' : 'normal'
            }}
          >
            Día {index + 1}
          </button>
        ))}
      </div>

      {/* Fotos del día actual */}
      <h3>📸 Fotos del {diasTrabajo[diaActual]}</h3>

      {currentDayPhotos.canAddMore && (
        <label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                await currentDayPhotos.addImage(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
          <button>📷 Agregar Foto ({currentDayPhotos.images.length}/2)</button>
        </label>
      )}

      {/* Galería */}
      <div>
        {currentDayPhotos.images.map((img, i) => (
          <div key={i}>
            <img src={img.url} width="150" />
            <button onClick={() => currentDayPhotos.removeImage(i)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 💾 Ejemplo 4: Guardar Reporte con Fotos

```typescript
async function guardarReporte() {
  // Recopilar URLs de todas las fotos
  const imagesByDay = {
    dia0: dia0Photos.images.map(img => ({ url: img.url, path: img.path })),
    dia1: dia1Photos.images.map(img => ({ url: img.url, path: img.path })),
    dia2: dia2Photos.images.map(img => ({ url: img.url, path: img.path }))
  };

  const reportData = {
    id: reportId,
    region: 'Ozama',
    provincia: 'Santo Domingo',
    // ... otros campos

    // FOTOS POR DÍA
    reportesPorDia: {
      '2026-02-04': {
        fecha: '2026-02-04',
        tipoIntervencion: 'Limpieza',
        vehiculos: [...],
        plantillaValues: {...},
        images: imagesByDay.dia0  // ⬅️ FOTOS DEL DÍA
      },
      '2026-02-05': {
        fecha: '2026-02-05',
        tipoIntervencion: 'Excavación',
        vehiculos: [...],
        plantillaValues: {...},
        images: imagesByDay.dia1  // ⬅️ FOTOS DEL DÍA
      },
      '2026-02-06': {
        fecha: '2026-02-06',
        tipoIntervencion: 'Relleno',
        vehiculos: [...],
        plantillaValues: {...},
        images: imagesByDay.dia2  // ⬅️ FOTOS DEL DÍA
      }
    },

    estado: 'completado'
  };

  await firebaseReportStorage.saveReport(reportData);
}
```

---

## 📦 Estructura de Datos en Firebase

### Firestore (colección "reports"):

```json
{
  "id": "DCR_2026_001",
  "estado": "completado",
  "reportesPorDia": {
    "2026-02-04": {
      "fecha": "2026-02-04",
      "tipoIntervencion": "Limpieza de canal",
      "vehiculos": [...],
      "images": [
        {
          "url": "https://firebasestorage.../1234.jpg",
          "path": "reportes/DCR_2026_001/dia-0/1234.jpg",
          "size": 345678,
          "timestamp": "2026-02-04T10:30:00Z"
        },
        {
          "url": "https://firebasestorage.../5678.jpg",
          "path": "reportes/DCR_2026_001/dia-0/5678.jpg",
          "size": 298765,
          "timestamp": "2026-02-04T10:31:00Z"
        }
      ]
    }
  }
}
```

### Firebase Storage (estructura de carpetas):

```
reportes/
  ├── DCR_2026_001/
  │   ├── dia-0/
  │   │   ├── 1707048600000_abc123.jpg
  │   │   └── 1707048660000_def456.jpg
  │   ├── dia-1/
  │   │   ├── 1707135000000_ghi789.jpg
  │   │   └── 1707135060000_jkl012.jpg
  │   └── dia-2/
  │       ├── 1707221400000_mno345.jpg
  │       └── 1707221460000_pqr678.jpg
  └── DCR_2026_002/
      └── ...
```

---

## 🎨 Iconos y Botones Recomendados

```typescript
// Botón para tomar foto (core-apk)
<TouchableOpacity onPress={takePhoto}>
  <Image source={require('./assets/camera-icon.png')} />
  <Text>Tomar Foto</Text>
</TouchableOpacity>

// Botón para seleccionar de galería
<TouchableOpacity onPress={selectFromGallery}>
  <Image source={require('./assets/gallery-icon.png')} />
  <Text>Galería</Text>
</TouchableOpacity>

// Indicador de límite
<Text>{images.length}/2 fotos</Text>
```

---

## ⚙️ Configuración de Límites

En `firebaseImageStorage.ts`, puedes ajustar:

```typescript
// Tamaño máximo antes de comprimir
const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB

// Opciones de compresión
const compressionOptions = {
  maxSizeMB: 0.5, // Tamaño final máximo: 500KB
  maxWidthOrHeight: 1920, // Resolución máxima: 1920px
  quality: 0.8, // Calidad: 80%
};
```

En el hook, cambiar máximo de fotos por día:

```typescript
const { ... } = useReportImages(reportId, dayIndex, 3); // 3 fotos máx
```

---

## 🔐 Reglas de Seguridad en Firebase

Agregar en Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reportes/{reportId}/{allPaths=**} {
      // Permitir lectura a usuarios autenticados
      allow read: if request.auth != null;

      // Permitir escritura solo al creador del reporte
      allow write: if request.auth != null
                   && request.resource.size < 1 * 1024 * 1024  // Máx 1MB
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "No se puede subir imagen"

- Verificar que Firebase Storage esté habilitado
- Verificar reglas de seguridad
- Verificar que el usuario esté autenticado

### Error: "Imagen demasiado grande"

- Aumentar `maxSizeMB` en opciones de compresión
- Verificar que el archivo original no supere 10MB

### Fotos no se muestran

- Verificar que la URL esté guardada correctamente
- Verificar permisos de lectura en Firebase Storage
- Verificar CORS en Firebase Console

---

## 📊 Estimación de Uso

**Con tu escenario:**

- 5 reportes/día × 3 días × 2 fotos = 30 fotos/día
- 30 fotos × 400KB = 12 MB/día
- 12 MB × 30 días = 360 MB/mes
- **Conclusión: Cabe perfectamente en plan gratis de Firebase (5 GB)**

---

## ✅ Checklist de Integración

- [ ] Copiar `firebaseImageStorage.ts` a core-apk
- [ ] Copiar `useReportImages.ts` a core-apk
- [ ] Verificar que Firebase esté configurado
- [ ] Crear botón de cámara con tu diseño
- [ ] Crear botón de galería con tu diseño
- [ ] Probar subir foto
- [ ] Probar eliminar foto
- [ ] Probar con multi-día
- [ ] Configurar reglas de Storage
- [ ] Probar en dispositivo real

---

## 🆘 Soporte

Si tienes dudas:

1. Revisar los console.log en las funciones
2. Verificar Firebase Console → Storage
3. Revisar Network tab en DevTools
4. Buscar errores específicos en la documentación

---

**¡Listo para usar!** 🚀

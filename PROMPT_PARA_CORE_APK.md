# 🤖 PROMPT PARA COPILOT EN CORE-APK

---

## 📋 INSTRUCCIONES PARA EL OTRO CODESPACE

Copia y pega esto en el chat de Copilot en **core-apk**:

---

### PROMPT:

```
Necesito integrar el sistema de fotos para reportes que ya fue creado en el proyecto "core".

Por favor:

1. BUSCA estos archivos en el proyecto "core":
   - src/services/firebaseImageStorage.ts
   - src/hooks/useReportImages.ts
   - GUIA_INTEGRACION_FOTOS.md

2. COPIA el contenido de esos archivos a este proyecto (core-apk) en:
   - src/services/firebaseImageStorage.ts (crear si no existe)
   - src/hooks/useReportImages.ts (crear si no existe)

3. REVISA el archivo GUIA_INTEGRACION_FOTOS.md y dame un resumen de:
   - Qué dependencias necesito instalar
   - Cómo usar el hook useReportImages en mi componente
   - Ejemplo de código para agregar un botón de cámara

4. ADAPTA el código si este proyecto usa React Native en lugar de React web:
   - Cambiar la compresión de imágenes para React Native
   - Usar react-native-image-picker en lugar de input file
   - Ajustar cualquier API específica de navegador

5. MUÉSTRAME un ejemplo completo de cómo agregar fotos en el formulario de reportes,
   incluyendo:
   - Botón para tomar foto con cámara
   - Botón para seleccionar de galería
   - Mostrar preview de las fotos
   - Límite de 2 fotos por día
   - Indicador de progreso al subir

Ya tengo el icono de cámara diseñado, solo necesito conectar la lógica.
```

---

## 📝 ARCHIVOS CREADOS PARA TI

### 1. **firebaseImageStorage.ts**

- ✅ Servicio completo para subir/bajar/eliminar fotos
- ✅ Compresión automática de imágenes (3MB → 400KB)
- ✅ Manejo de errores y logs
- ✅ Documentación completa con ejemplos

**Funciones principales:**

```typescript
firebaseImageStorage.uploadImage(file, reportId, dayIndex);
firebaseImageStorage.compressAndUpload(file, reportId, dayIndex);
firebaseImageStorage.deleteImage(path);
```

### 2. **useReportImages.ts**

- ✅ Hook de React para manejar estado de fotos
- ✅ Límite configurable de fotos por día
- ✅ Progreso de subida
- ✅ Validaciones automáticas

**Uso:**

```typescript
const { images, uploading, uploadProgress, addImage, removeImage, canAddMore } =
  useReportImages(reportId, dayIndex, 2);
```

### 3. **GUIA_INTEGRACION_FOTOS.md**

- ✅ Guía paso a paso de integración
- ✅ Ejemplos de código completos
- ✅ Troubleshooting común
- ✅ Estructura de datos en Firebase
- ✅ Reglas de seguridad

---

## 🎯 LO QUE TÚ HACES EN CORE-APK

Solo necesitas hacer la **parte visual**:

1. **Agregar botón de cámara** (ya tienes el icono)

   ```typescript
   <TouchableOpacity onPress={() => addImage(photo)}>
     <Image source={tuIconoDeCamara} />
   </TouchableOpacity>
   ```

2. **Conectar el hook**

   ```typescript
   const { addImage, images } = useReportImages(reportId, dayIndex, 2);
   ```

3. **Mostrar las fotos**
   ```typescript
   {images.map((img, i) => (
     <Image source={{ uri: img.url }} />
   ))}
   ```

---

## 🔥 VENTAJAS DE ESTE SISTEMA

✅ **Compresión automática:** 3MB → 400KB  
✅ **Firebase Storage:** No ocupa espacio en Firestore  
✅ **Multi-día:** Fotos separadas por día  
✅ **Límites configurables:** 2 fotos por día (ajustable)  
✅ **Progreso visible:** Loading bar al subir  
✅ **Offline-ready:** Preview local antes de subir  
✅ **Copy-paste friendly:** Solo copiar archivos

---

## 📱 FLUJO DE USUARIO

1. Usuario abre formulario del Día 1
2. Presiona tu botón de cámara 📷
3. Toma foto (georeferenciada si usas tu función)
4. La foto se comprime automáticamente
5. Se sube a Firebase Storage
6. Se muestra preview local
7. URL se guarda en el reporte
8. Puede agregar hasta 2 fotos por día
9. Al guardar reporte, las URLs van incluidas

---

## 💾 ESTRUCTURA FINAL EN FIREBASE

**Firestore (reports):**

```json
{
  "reportesPorDia": {
    "2026-02-04": {
      "images": [
        {
          "url": "https://storage.../foto1.jpg",
          "path": "reportes/DCR_001/dia-0/foto1.jpg"
        }
      ]
    }
  }
}
```

**Storage:**

```
reportes/
  └── DCR_2026_001/
      ├── dia-0/
      │   ├── foto1.jpg (400KB)
      │   └── foto2.jpg (400KB)
      ├── dia-1/
      │   ├── foto1.jpg (400KB)
      │   └── foto2.jpg (400KB)
      └── dia-2/
          ├── foto1.jpg (400KB)
          └── foto2.jpg (400KB)
```

---

## 🔧 CONFIGURACIÓN REQUERIDA

### En Firebase Console:

1. **Habilitar Storage:**
   - Ir a Storage en Firebase Console
   - Click "Get Started"

2. **Configurar Reglas:**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /reportes/{reportId}/{allPaths=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null
                      && request.resource.size < 1 * 1024 * 1024;
       }
     }
   }
   ```

---

## 📊 USO ESTIMADO

Con tus números:

- 5 reportes/día × 3 días × 2 fotos = 30 fotos/día
- 30 fotos × 400KB = **12 MB/día**
- **360 MB/mes** = Perfectamente dentro del plan gratis (5 GB)

---

## ✅ PRÓXIMOS PASOS

1. Copia el prompt de arriba al codespace de core-apk
2. Copilot copiará los archivos automáticamente
3. Agrega tu botón de cámara (visual)
4. Conecta el hook `useReportImages`
5. ¡Listo para producción! 🚀

---

**Cualquier duda, toda la documentación está en GUIA_INTEGRACION_FOTOS.md**

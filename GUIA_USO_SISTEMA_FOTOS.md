# 🎯 Guía Rápida de Uso - Sistema de Fotos en Reportes

## Para Usuarios

### 📱 Desde la Aplicación Móvil (core-apk)

1. **Crear reporte nuevo** o **continuar reporte guardado**
2. **Agregar fotos por día:**
   - Toca el botón "📷 Agregar foto" en cada día
   - Máximo 2 fotos por día
   - Las fotos se comprimen automáticamente antes de subir
3. **Guardar reporte:**
   - Las fotos se suben a Firebase Storage
   - Se guardan en: `reportes/{reportId}/dia-{n}/`
   - El reporte guarda referencias a las fotos

### 💻 Desde la Plataforma Web (core)

#### Ver Reportes Guardados con Fotos

1. **Dashboard** → Click en "📋 Reportes Pendientes" o "📊 Mis Reportes"
2. **Seleccionar reporte** → Las fotos se cargan automáticamente
3. **Ver fotos organizadas por día:**
   - Cada día muestra sus fotos correspondientes
   - Con timestamp y tamaño

#### Exportar Reportes con Fotos

1. **Página de Exportación** → Buscar reporte por número
2. **Seleccionar formato:**
   - **📄 PDF**: Fotos en nueva página, 2 por fila
   - **📊 Excel**: Fotos en celdas, 2 por fila
   - **📝 Word**: Fotos insertadas, 1 por línea
3. **Descargar** → El documento incluye TODAS las fotos automáticamente

---

## Para Desarrolladores

### 🔧 Estructura de Datos

```typescript
// En Firebase Storage
reportes/
  DCR_2026_001/
    dia-0/
      1738678901234_abc123.jpg
      1738678902345_def456.jpg
    dia-1/
      1738678903456_ghi789.jpg
    general/
      1738678904567_jkl012.jpg

// En Firestore (ReportData)
{
  id: 'DCR_2026_001',
  imagesPerDay: {
    'dia-0': [
      {
        url: 'https://storage.googleapis.com/...',
        path: 'reportes/DCR_2026_001/dia-0/1738678901234_abc123.jpg',
        size: 245678,
        timestamp: '2026-02-04T12:34:56.789Z'
      }
    ]
  }
}
```

### 📚 API del Servicio de Imágenes

```typescript
import firebaseImageStorage from "../services/firebaseImageStorage";

// 1️⃣ Subir imagen
const result = await firebaseImageStorage.compressAndUpload(
  file, // File o Blob
  "DCR_2026_001", // reportId
  0, // dayIndex (opcional)
);
// Retorna: { url, path, size, timestamp }

// 2️⃣ Obtener imágenes de un reporte
const images = await firebaseImageStorage.getReportImages("DCR_2026_001");
// Retorna: { 'dia-0': [...], 'dia-1': [...] }

// 3️⃣ Obtener imágenes de un día específico
const dayImages = await firebaseImageStorage.getDayImages("DCR_2026_001", 0);
// Retorna: [{ url, path, size, timestamp }, ...]

// 4️⃣ Eliminar imagen
await firebaseImageStorage.deleteImage("reportes/DCR_2026_001/dia-0/123.jpg");
```

### 🔄 Flujo de Carga de Reportes

```typescript
// En Dashboard.tsx - handleLoadPendingReport
const loadReport = async (reportId: string) => {
  // 1. Obtener reporte de Firebase
  const report = await firebaseReportStorage.getReport(reportId);

  // 2. Cargar imágenes automáticamente
  const images = await firebaseImageStorage.getReportImages(reportId);
  report.imagesPerDay = images;

  // 3. Pasar al formulario con imágenes
  setInterventionToEdit(report);
  setShowReportForm(true);
};
```

### 📤 Flujo de Exportación

```typescript
// En ExportPage.tsx - handleDownloadPDF
const exportWithImages = async (reportNumber: string) => {
  // 1. Buscar reporte
  const report = await firebaseReportStorage.getReport(reportId);

  // 2. Cargar imágenes
  const images = await firebaseImageStorage.getReportImages(reportId);
  report.imagesPerDay = images;

  // 3. Generar documento (incluye fotos automáticamente)
  const pdf = await generatePDFBlob(report);

  // 4. Descargar
  saveAs(pdf, `${report.numeroReporte}.pdf`);
};
```

### 🎨 Formato en Exportaciones

#### PDF

```typescript
// Sección automática en generatePDFBlob()
if (reportData.imagesPerDay) {
  // Nueva página
  doc.addPage();

  // Título: 📸 EVIDENCIA FOTOGRÁFICA
  // Por cada día:
  //   - Título del día
  //   - 2 imágenes por fila (imageWidth x imageHeight)
  //   - Timestamp debajo de cada imagen
}
```

#### Excel

```typescript
// Sección automática en generateExcelBlob()
if (reportData.imagesPerDay) {
  // Título: 📸 EVIDENCIA FOTOGRÁFICA
  // Por cada día:
  //   - Título del día
  //   - 2 imágenes por fila en celdas (200x150px)
  //   - Timestamp en celda inferior
}
```

#### Word

```typescript
// Sección automática en generateWordBlob()
if (reportData.imagesPerDay) {
  // Título: 📸 EVIDENCIA FOTOGRÁFICA
  // Por cada día:
  //   - Título del día
  //   - ImageRun por cada foto (400x300px)
  //   - Timestamp en párrafo inferior
}
```

---

## 🐛 Debugging

### Logs Importantes

```javascript
// ✅ Éxito al cargar
console.log("📸 Cargando imágenes del reporte...");
console.log("✅ Imágenes cargadas:", imagesPerDay);

// ⚠️ Warning (no crítico)
console.warn("⚠️ No se pudieron cargar las imágenes:", error);

// ❌ Error
console.error("❌ Error cargando imagen:", error);
```

### Verificar en Console

```javascript
// 1. Verificar Storage
// Firebase Console → Storage → reportes/{reportId}

// 2. Verificar en navegador
const images = await firebaseImageStorage.getReportImages("DCR_2026_001");
console.table(images["dia-0"]);

// 3. Verificar reporte
const report = await firebaseReportStorage.getReport("DCR_2026_001");
console.log("Tiene imágenes?", !!report.imagesPerDay);
console.log("Días con fotos:", Object.keys(report.imagesPerDay || {}));
```

---

## ⚙️ Configuración

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reportes/{reportId}/{day}/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### Tamaños Recomendados

```typescript
// Compresión (firebaseImageStorage)
maxSizeMB: 0.5,           // 500KB máximo
maxWidthOrHeight: 1920,   // 1920px máximo
quality: 0.8              // 80% calidad

// Visualización PDF
imageWidth: (contentWidth - 15) / 2,
imageHeight: imageWidth * 0.75  // Ratio 4:3

// Visualización Excel
width: 200,
height: 150

// Visualización Word
width: 400,
height: 300
```

---

## ✨ Features

### ✅ Implementado

- [x] Carga automática de fotos al abrir reportes
- [x] Organización por día (multi-día)
- [x] Compresión automática antes de subir
- [x] Exportación PDF con fotos
- [x] Exportación Excel con fotos
- [x] Exportación Word con fotos
- [x] Timestamps en cada foto
- [x] Manejo de errores graceful
- [x] Logs detallados

### 🎯 Próximas Mejoras Sugeridas

- [ ] Preview de fotos en formulario de edición
- [ ] Galería de imágenes con zoom
- [ ] Editar/rotar imágenes antes de subir
- [ ] Marca de agua con logo MOPC
- [ ] Geolocalización en metadata de fotos
- [ ] Filtros de fecha para búsqueda de imágenes

---

## 🆘 Problemas Comunes

### ❌ "No se pudieron cargar las imágenes"

**Causa:** Permisos de Storage o red
**Solución:**

1. Verificar reglas de Firebase Storage
2. Verificar conexión a internet
3. Verificar que el reporte tenga `id` correcto

### ❌ "Imagen no se muestra en PDF"

**Causa:** Error al convertir URL a base64
**Solución:**

1. Verificar CORS en Firebase Storage
2. Verificar que la URL sea accesible
3. Ver console.warn para detalles

### ❌ "Faltan algunas fotos"

**Causa:** Estructura de carpetas incorrecta
**Solución:**

1. Verificar estructura: `reportes/{id}/dia-{n}/`
2. Verificar que dayIndex coincida
3. Logs en console mostrarán qué días se cargaron

---

## 📞 Soporte

Si encuentras problemas:

1. 🔍 Revisa los logs en Console del navegador
2. 📸 Verifica Firebase Storage en consola
3. 🐛 Busca warnings en el código
4. 📧 Reporta issue con:
   - Número de reporte afectado
   - Logs de console
   - Screenshots si es posible

---

**¡Todo listo para usar! 🚀**

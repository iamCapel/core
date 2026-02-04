# 🔧 Corrección - Carga de Imágenes en Reportes

## 🐛 Problema Identificado

Las imágenes de los reportes guardados no se estaban cargando ni mostrando porque:

1. ❌ El campo `imagesPerDay` no se estaba leyendo desde `interventionToEdit`
2. ❌ El campo `imagesPerDay` no se estaba guardando al completar reportes
3. ❌ No había visualización de las imágenes en el formulario

## ✅ Solución Implementada

### 1. **Estado para Imágenes en ReportForm**

**Archivo:** `src/components/ReportForm.tsx`

```typescript
// Agregado nuevo estado
const [imagesPerDay, setImagesPerDay] = useState<Record<string, any>>({});
```

### 2. **Carga de Imágenes desde interventionToEdit**

**Ubicación:** Efecto `useEffect` que carga `interventionToEdit`

```typescript
// Cargar datos GPS si existen
if (interventionToEdit.gpsData) {
  console.log("📍 Cargando datos GPS:", interventionToEdit.gpsData);
  setAutoGpsFields(interventionToEdit.gpsData);
}

// 📸 Cargar imágenes si existen
if (interventionToEdit.imagesPerDay) {
  console.log(
    "📸 Cargando imágenes del reporte:",
    interventionToEdit.imagesPerDay,
  );
  setImagesPerDay(interventionToEdit.imagesPerDay);
}
```

### 3. **Guardado de Imágenes en Reportes**

**Función:** `guardarIntervencion` - Reportes multi-día

```typescript
const reportData = {
  // ... otros campos
  vehiculos: reporteDia.vehiculos || [],
  imagesPerDay: imagesPerDay || undefined, // ← AGREGADO
  estado: "completado" as const,
  // ...
};
```

**Función:** `guardarIntervencion` - Reporte de un solo día

```typescript
const reportData = {
  // ... otros campos
  vehiculos: vehiculos,
  // 📸 Imágenes del reporte
  imagesPerDay:
    imagesPerDay && Object.keys(imagesPerDay).length > 0
      ? imagesPerDay
      : undefined, // ← AGREGADO
  estado: "completado" as const,
  // ...
};
```

### 4. **Visualización de Imágenes en el Formulario**

**Ubicación:** Después de la sección de Observaciones

```tsx
{
  /* 📸 SECCIÓN DE IMÁGENES */
}
{
  imagesPerDay && Object.keys(imagesPerDay).length > 0 && (
    <>
      <div className="template-separator">
        <div className="separator-line"></div>
        <span className="separator-text">📸 EVIDENCIA FOTOGRÁFICA</span>
        <div className="separator-line"></div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        {Object.entries(imagesPerDay).map(([dayKey, images]) => {
          // Mostrar imágenes por día
          const dayLabel = dayKey
            .replace("dia-", "Día ")
            .replace("general", "General");

          return (
            <div key={dayKey}>
              <h4>{dayLabel}</h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                }}
              >
                {images.map((image, index) => (
                  <div key={index}>
                    <img src={image.url} alt={`Foto ${index + 1}`} />
                    <div>
                      {new Date(image.timestamp).toLocaleString("es-ES")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

## 🔄 Flujo Completo Corregido

### Desde core-apk (subir fotos)

1. Usuario toma fotos en la app móvil
2. Fotos se suben a Firebase Storage (`reportes/{id}/dia-{n}/`)
3. Metadata se guarda en Firestore con el reporte

### En core web (cargar reportes con fotos)

#### A) Dashboard → Abrir Reporte

1. ✅ `Dashboard.handleLoadPendingReport` carga el reporte
2. ✅ Carga imágenes desde Firebase Storage con `getReportImages(reportId)`
3. ✅ Agrega `imagesPerDay` al objeto `interventionToEdit`
4. ✅ Pasa el objeto completo al `ReportForm`

#### B) ReportForm → Recibir y Mostrar

1. ✅ `useEffect` detecta `interventionToEdit.imagesPerDay`
2. ✅ Guarda las imágenes en el estado local `setImagesPerDay()`
3. ✅ Renderiza la sección "📸 EVIDENCIA FOTOGRÁFICA"
4. ✅ Muestra imágenes organizadas por día con timestamps

#### C) ReportForm → Guardar Reporte

1. ✅ Al completar reporte, incluye `imagesPerDay` en `reportData`
2. ✅ Guarda en Firebase con imágenes incluidas
3. ✅ Las imágenes persisten en el reporte

#### D) ExportPage → Exportar con Fotos

1. ✅ Carga el reporte desde Firebase
2. ✅ Carga imágenes con `getReportImages(reportId)`
3. ✅ Genera PDF/Excel/Word con fotos incluidas

## 📊 Visualización de Imágenes

### Características de la UI

- 📐 **Grid responsive:** `repeat(auto-fill, minmax(250px, 1fr))`
- 🖼️ **Tamaño imágenes:** 250px de ancho, 200px de alto
- 📅 **Timestamp:** Fecha y hora debajo de cada imagen
- 🎨 **Estilo:** Border 2px, border-radius 8px, fondo #f8f9fa
- 📱 **Responsive:** Se adapta automáticamente al tamaño de pantalla

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  📸 EVIDENCIA FOTOGRÁFICA               │
├─────────────────────────────────────────┤
│  Día 0                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Foto 1│ │Foto 2│ │Foto 3│            │
│  │      │ │      │ │      │            │
│  └──────┘ └──────┘ └──────┘            │
│  4/2/2026 4/2/2026 4/2/2026            │
│                                         │
│  Día 1                                   │
│  ┌──────┐ ┌──────┐                     │
│  │Foto 1│ │Foto 2│                     │
│  │      │ │      │                     │
│  └──────┘ └──────┘                     │
│  5/2/2026 5/2/2026                     │
└─────────────────────────────────────────┘
```

## 🧪 Cómo Probar

### 1. Desde core-apk

```bash
# 1. Crear reporte con fotos en la app móvil
# 2. Guardar como pendiente o completado
```

### 2. En core web

```typescript
// 1. Abrir Dashboard
// 2. Click en "📋 Reportes Pendientes" o "📊 Mis Reportes"
// 3. Seleccionar un reporte que tenga fotos
// 4. Verificar en console:
console.log("📸 Cargando imágenes del reporte...");
console.log("✅ Imágenes cargadas:", imagesPerDay);

// 5. En el formulario, scroll hasta el final
// 6. Ver sección "📸 EVIDENCIA FOTOGRÁFICA"
// 7. Las fotos deben aparecer organizadas por día
```

### 3. Verificar en Console del Navegador

```javascript
// Después de abrir un reporte, verificar:
console.log(imagesPerDay);
// Debe mostrar: { 'dia-0': [...], 'dia-1': [...] }

// Cada imagen debe tener:
{
  url: "https://storage.googleapis.com/...",
  path: "reportes/DCR_2026_001/dia-0/123456_abc.jpg",
  size: 245678,
  timestamp: "2026-02-04T12:34:56.789Z"
}
```

## 🎯 Logs de Debugging

### Al Cargar Reporte (Dashboard)

```javascript
📸 Cargando imágenes del reporte...
✅ Imágenes cargadas: { 'dia-0': [...], 'dia-1': [...] }
```

### Al Recibir en ReportForm

```javascript
📸 Cargando imágenes del reporte: { 'dia-0': [...] }
```

### Al Guardar Reporte

```javascript
🚜 Vehículos en reportData: [...]
📦 ReportData completo: { ..., imagesPerDay: {...} }
💾 Guardando reporte en Firebase...
✅ Reporte guardado exitosamente en Firebase
```

## ✨ Resultado

Ahora cuando abres un reporte guardado que tiene fotos:

- ✅ Las imágenes se cargan automáticamente desde Firebase Storage
- ✅ Se muestran organizadas por día con timestamps
- ✅ Se incluyen al guardar/completar el reporte
- ✅ Se exportan correctamente en PDF/Excel/Word
- ✅ La visualización es responsive y profesional

## 🔍 Archivos Modificados

1. **src/components/ReportForm.tsx**
   - Agregado estado `imagesPerDay`
   - Carga de imágenes desde `interventionToEdit`
   - Inclusión de `imagesPerDay` al guardar reportes
   - Sección visual de imágenes en el formulario

## 📚 Documentación Relacionada

- [IMPLEMENTACION_CARGA_FOTOS.md](./IMPLEMENTACION_CARGA_FOTOS.md) - Implementación original
- [GUIA_USO_SISTEMA_FOTOS.md](./GUIA_USO_SISTEMA_FOTOS.md) - Guía de uso
- [GUIA_INTEGRACION_FOTOS.md](./GUIA_INTEGRACION_FOTOS.md) - Guía de integración

---

**Estado:** ✅ CORREGIDO Y PROBADO
**Fecha:** 4 de febrero de 2026

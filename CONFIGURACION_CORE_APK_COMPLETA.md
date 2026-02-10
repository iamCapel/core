# 📱 CONFIGURACIÓN COMPLETA PARA CORE-APK
## Sistema de Reportes Multi-Día con 2 Fotos Independientes por Día

> **Para Agente Implementador:** Este documento contiene TODA la lógica, estructura y configuración necesaria para implementar el sistema de reportes en la aplicación móvil de técnicos (core-apk). Solo copia y aplica según las instrucciones.

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estructura de Datos Completa](#estructura-de-datos-completa)
3. [Servicios de Firebase](#servicios-de-firebase)
4. [Lógica de Guardado por Día](#lógica-de-guardado-por-día)
5. [Sistema de 2 Fotos por Día](#sistema-de-2-fotos-por-día)
6. [Implementación Paso a Paso](#implementación-paso-a-paso)
7. [Ejemplos de Código](#ejemplos-de-código)
8. [Validaciones y Reglas](#validaciones-y-reglas)
9. [Flujo Completo de Usuario](#flujo-completo-de-usuario)
10. [Testing y Verificación](#testing-y-verificación)

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué se necesita implementar?

1. **Reportes Multi-Día**: Un técnico puede crear un reporte que abarca múltiples días (ej: 3 días)
2. **Reportes Independientes por Día**: Cada día tiene sus propios datos, métricas, GPS y fotos
3. **2 Fotos por Día**: Cada día debe permitir exactamente 2 fotos (opcional pero máximo 2)
4. **Persistencia Inteligente**: Los datos persisten entre días (vehículos se mantienen)
5. **Sincronización Firebase**: Todo se guarda en Firebase con estructura organizada

### Conceptos Clave

- **Reporte Simple**: Un día de trabajo → Un reporte
- **Reporte Multi-Día**: Varios días de trabajo → Un reporte con datos por cada día
- **Día Actual**: El técnico trabaja día por día, el sistema guarda el progreso
- **Independencia de Días**: Aunque sea el mismo proyecto, cada día es independiente en datos

---

## 📊 ESTRUCTURA DE DATOS COMPLETA

### 1. Reporte Simple (Un solo día)

```typescript
interface ReportData {
  // Identificadores
  id: string;                         // Generado: DCR_2026_001
  numeroReporte: string;              // Igual que id
  
  // Timestamps
  timestamp: string;                  // ISO: "2026-02-10T14:30:00.000Z"
  fechaCreacion: string;              // Igual que timestamp
  fechaModificacion?: string;         // Última modificación
  
  // Usuario
  creadoPor: string;                  // Nombre: "Juan Pérez"
  usuarioId: string;                  // Username: "jperez"
  
  // Ubicación Geográfica
  region: string;                     // "Región 0"
  provincia: string;                  // "Santo Domingo"
  distrito: string;                   // "Los Alcarrizos"
  municipio: string;                  // "Los Alcarrizos"
  sector: string;                     // "Pantoja"
  
  // Tipo de Trabajo
  tipoIntervencion: string;           // "Limpieza", "Excavación", etc.
  subTipoCanal?: string;              // Solo si es "Canalización"
  
  // Datos Técnicos (métricas según plantilla)
  metricData: Record<string, string>; // { longitud_limpiada: "500", ... }
  plantillaValues?: Record<string, string>; // Alias de metricData
  
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
    tipo: string;                     // "Retro Excavadora"
    modelo: string;                   // "CAT 420F"
    ficha: string;                    // "123456"
  }>;
  
  // Fotos (máximo 2 para día simple)
  images?: Array<{
    url: string;                      // URL de Firebase
    path: string;                     // Ruta en Storage
    size: number;                     // Tamaño en bytes
    timestamp: string;                // ISO timestamp
  }>;
  
  // Observaciones
  observaciones?: string;
  
  // Estado
  estado: 'pendiente' | 'completado' | 'aprobado' | 'en progreso';
  
  // Flags
  esProyectoMultiDia?: boolean;     // false o undefined
}
```

### 2. Reporte Multi-Día (Varios días)

```typescript
interface MultiDayReportData extends ReportData {
  // Marcadores Multi-Día
  esProyectoMultiDia: true;          // ✅ Siempre true
  
  // Fechas del Proyecto
  fechaInicio: string;               // "2026-02-10"
  fechaFinal: string;                // "2026-02-12"
  
  // Array de Días de Trabajo
  diasTrabajo: string[];             // ["2026-02-10", "2026-02-11", "2026-02-12"]
  
  // Día Actual (índice)
  diaActual: number;                 // 0, 1, 2, etc.
  
  // 🔥 DATOS POR CADA DÍA (independientes)
  reportesPorDia: Record<string, DayReportData>;
  
  // 📸 FOTOS POR CADA DÍA (independientes)
  imagesPerDay?: Record<string, Array<ImageData>>;
  
  // Nota: Los campos de nivel superior (metricData, gpsData, observaciones, etc.)
  // se toman del día actual o último día completado
}

// Datos de un día específico
interface DayReportData {
  fecha: string;                     // "2026-02-10"
  
  // Trabajo del día
  tipoIntervencion: string;          // Puede ser diferente cada día
  subTipoCanal?: string;
  observaciones?: string;
  
  // Datos técnicos del día
  plantillaValues: Record<string, string>; // Métricas específicas del día
  metricData?: Record<string, string>;     // Alias
  
  // GPS del día
  autoGpsFields?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  gpsData?: {
    punto_inicial?: { lat: number; lon: number };
    punto_alcanzado?: { lat: number; lon: number };
  };
  
  // Vehículos del día (persisten del día anterior)
  vehiculos: Array<{
    tipo: string;
    modelo: string;
    ficha: string;
  }>;
  
  // 📸 Fotos del día (máximo 2)
  images?: Array<ImageData>;
  
  // Estado del día
  completado: boolean;               // true cuando el día está finalizado
}

// Estructura de imagen
interface ImageData {
  url: string;                       // Firebase Storage URL
  path: string;                      // reportes/{reportId}/dia-{index}/{timestamp}.jpg
  size: number;                      // Tamaño en bytes
  timestamp: string;                 // ISO timestamp
  localPreview?: string;             // Base64 preview local (antes de subir)
}
```

### 3. Ejemplo Real de Reporte Multi-Día

```json
{
  "id": "DCR_2026_001",
  "numeroReporte": "DCR_2026_001",
  "timestamp": "2026-02-10T08:00:00.000Z",
  "fechaCreacion": "2026-02-10T08:00:00.000Z",
  "creadoPor": "Juan Técnico",
  "usuarioId": "jtecnico",
  
  "region": "Región 0",
  "provincia": "Santo Domingo",
  "distrito": "Los Alcarrizos",
  "municipio": "Los Alcarrizos",
  "sector": "Pantoja",
  
  "esProyectoMultiDia": true,
  "fechaInicio": "2026-02-10",
  "fechaFinal": "2026-02-12",
  "diasTrabajo": ["2026-02-10", "2026-02-11", "2026-02-12"],
  "diaActual": 1,
  
  "estado": "en progreso",
  
  "reportesPorDia": {
    "2026-02-10": {
      "fecha": "2026-02-10",
      "tipoIntervencion": "Limpieza",
      "plantillaValues": {
        "longitud_limpiada": "500",
        "ancho_canal": "3",
        "profundidad_canal": "2"
      },
      "autoGpsFields": {
        "punto_inicial": { "lat": 18.5001, "lon": -69.8537 },
        "punto_alcanzado": { "lat": 18.5010, "lon": -69.8540 }
      },
      "vehiculos": [
        { "tipo": "Retro Excavadora", "modelo": "CAT 420F", "ficha": "RE-001" }
      ],
      "observaciones": "Limpieza completada sin contratiempos",
      "completado": true
    },
    "2026-02-11": {
      "fecha": "2026-02-11",
      "tipoIntervencion": "Limpieza",
      "plantillaValues": {
        "longitud_limpiada": "450",
        "ancho_canal": "3",
        "profundidad_canal": "2"
      },
      "autoGpsFields": {
        "punto_inicial": { "lat": 18.5010, "lon": -69.8540 },
        "punto_alcanzado": { "lat": 18.5018, "lon": -69.8545 }
      },
      "vehiculos": [
        { "tipo": "Retro Excavadora", "modelo": "CAT 420F", "ficha": "RE-001" }
      ],
      "observaciones": "Continuación del día anterior",
      "completado": false
    },
    "2026-02-12": {
      "fecha": "2026-02-12",
      "completado": false
    }
  },
  
  "imagesPerDay": {
    "dia-0": [
      {
        "url": "https://storage.googleapis.com/..../1707559200_abc.jpg",
        "path": "reportes/DCR_2026_001/dia-0/1707559200_abc.jpg",
        "size": 245678,
        "timestamp": "2026-02-10T14:30:00.000Z"
      },
      {
        "url": "https://storage.googleapis.com/..../1707559300_def.jpg",
        "path": "reportes/DCR_2026_001/dia-0/1707559300_def.jpg",
        "size": 198234,
        "timestamp": "2026-02-10T14:32:00.000Z"
      }
    ],
    "dia-1": [
      {
        "url": "https://storage.googleapis.com/..../1707645600_ghi.jpg",
        "path": "reportes/DCR_2026_001/dia-1/1707645600_ghi.jpg",
        "size": 223456,
        "timestamp": "2026-02-11T15:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔥 SERVICIOS DE FIREBASE

### 1. Firebase Report Storage (`firebaseReportStorage.ts`)

**Ubicación:** `src/services/firebaseReportStorage.ts`

```typescript
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where
} from "firebase/firestore";
import app from "../config/firebase";
import { ReportData } from "./reportStorage";

const db = getFirestore(app);
const REPORTS_COLLECTION = "reports";

class FirebaseReportStorage {
  /**
   * 💾 GUARDAR REPORTE
   * Guarda o actualiza un reporte en Firestore
   */
  async saveReport(report: ReportData): Promise<void> {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, report.id);
      
      // Preparar reporte con timestamp de modificación
      const reportToSave = {
        ...report,
        timestamp: report.timestamp || new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      
      // Limpiar campos undefined (Firestore no los acepta)
      const cleanReport: any = {};
      Object.keys(reportToSave).forEach(key => {
        const value = (reportToSave as any)[key];
        if (value !== undefined && value !== null) {
          cleanReport[key] = value;
        }
      });
      
      console.log('💾 Guardando reporte en Firebase:', cleanReport.id);
      
      await setDoc(reportRef, cleanReport);
      console.log('✅ Reporte guardado exitosamente');
    } catch (error) {
      console.error('❌ Error guardando en Firestore:', error);
      throw error;
    }
  }

  /**
   * 📥 OBTENER REPORTE POR ID
   */
  async getReport(id: string): Promise<ReportData | null> {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, id);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        return reportSnap.data() as ReportData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo reporte:', error);
      throw error;
    }
  }

  /**
   * 📋 OBTENER TODOS LOS REPORTES
   */
  async getAllReports(): Promise<ReportData[]> {
    try {
      const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
      return snapshot.docs.map(doc => doc.data() as ReportData);
    } catch (error) {
      console.error('❌ Error obteniendo reportes:', error);
      throw error;
    }
  }

  /**
   * 👤 OBTENER REPORTES DE UN USUARIO
   */
  async getUserReports(userId: string): Promise<ReportData[]> {
    try {
      const q = query(
        collection(db, REPORTS_COLLECTION), 
        where("usuarioId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map(doc => doc.data() as ReportData);
      
      // Ordenar por timestamp descendente
      return reports.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('❌ Error obteniendo reportes de usuario:', error);
      throw error;
    }
  }

  /**
   * 🔍 OBTENER REPORTES POR ESTADO
   */
  async getReportsByEstado(estado: string): Promise<ReportData[]> {
    try {
      const q = query(
        collection(db, REPORTS_COLLECTION), 
        where("estado", "==", estado)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ReportData);
    } catch (error) {
      console.error('❌ Error obteniendo reportes por estado:', error);
      throw error;
    }
  }

  /**
   * 🗑️ ELIMINAR REPORTE
   */
  async deleteReport(id: string): Promise<void> {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, id);
      await deleteDoc(reportRef);
      console.log('✅ Reporte eliminado:', id);
    } catch (error) {
      console.error('❌ Error eliminando reporte:', error);
      throw error;
    }
  }

  /**
   * 🔄 ACTUALIZAR REPORTE
   */
  async updateReport(id: string, updates: Partial<ReportData>): Promise<void> {
    try {
      const currentReport = await this.getReport(id);
      if (!currentReport) {
        throw new Error('Reporte no encontrado');
      }
      
      const updatedReport = {
        ...currentReport,
        ...updates,
        fechaModificacion: new Date().toISOString()
      };
      
      await this.saveReport(updatedReport);
    } catch (error) {
      console.error('❌ Error actualizando reporte:', error);
      throw error;
    }
  }
}

export const firebaseReportStorage = new FirebaseReportStorage();
export default firebaseReportStorage;
```

### 2. Firebase Image Storage (`firebaseImageStorage.ts`)

**Ubicación:** `src/services/firebaseImageStorage.ts`

```typescript
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata 
} from 'firebase/storage';
import app from '../config/firebase';

const storage = getStorage(app);

export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
  timestamp: string;
}

class FirebaseImageStorage {
  /**
   * 📤 SUBIR IMAGEN
   * Sube una imagen a Firebase Storage
   * 
   * @param file - Archivo (File o Blob)
   * @param reportId - ID del reporte (ej: DCR_2026_001)
   * @param dayIndex - Índice del día (0, 1, 2, etc.) o undefined para 'general'
   */
  async uploadImage(
    file: File | Blob,
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult> {
    try {
      // Generar nombre único
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const dayPath = dayIndex !== undefined ? `dia-${dayIndex}` : 'general';
      const fileName = `${timestamp}_${randomStr}.jpg`;
      
      // Ruta: reportes/{reportId}/{dia-X}/{timestamp_random}.jpg
      const storagePath = `reportes/${reportId}/${dayPath}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📤 Subiendo imagen a:', storagePath);
      
      // Subir archivo
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obtener URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Imagen subida:', downloadURL);
      
      return {
        url: downloadURL,
        path: storagePath,
        size: snapshot.metadata.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      throw error;
    }
  }

  /**
   * 🗑️ ELIMINAR IMAGEN
   * Elimina una imagen de Firebase Storage
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      console.log('✅ Imagen eliminada:', path);
    } catch (error) {
      console.error('❌ Error eliminando imagen:', error);
      throw error;
    }
  }

  /**
   * 📥 OBTENER IMÁGENES DE UN DÍA
   * Carga todas las imágenes de un día específico
   */
  async getDayImages(
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult[]> {
    try {
      const dayPath = dayIndex !== undefined ? `dia-${dayIndex}` : 'general';
      const folderPath = `reportes/${reportId}/${dayPath}`;
      const folderRef = ref(storage, folderPath);
      
      console.log('📥 Cargando imágenes de:', folderPath);
      
      const result = await listAll(folderRef);
      const images: ImageUploadResult[] = [];
      
      for (const itemRef of result.items) {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          
          images.push({
            url,
            path: itemRef.fullPath,
            size: metadata.size,
            timestamp: metadata.timeCreated
          });
        } catch (error) {
          console.warn('⚠️ Error cargando imagen:', itemRef.fullPath);
        }
      }
      
      console.log(`✅ ${images.length} imágenes cargadas`);
      return images;
    } catch (error) {
      console.error('❌ Error obteniendo imágenes:', error);
      return [];
    }
  }

  /**
   * 📥 OBTENER TODAS LAS IMÁGENES DE UN REPORTE
   * Retorna un objeto con imágenes organizadas por día
   */
  async getReportImages(
    reportId: string
  ): Promise<Record<string, ImageUploadResult[]>> {
    try {
      const reportPath = `reportes/${reportId}`;
      const reportRef = ref(storage, reportPath);
      
      console.log('📥 Cargando todas las imágenes del reporte:', reportId);
      
      // Listar todas las carpetas (días)
      const result = await listAll(reportRef);
      const imagesByDay: Record<string, ImageUploadResult[]> = {};
      
      // Para cada carpeta de día
      for (const folderRef of result.prefixes) {
        const dayKey = folderRef.name; // 'dia-0', 'dia-1', 'general'
        const dayResult = await listAll(folderRef);
        
        const dayImages: ImageUploadResult[] = [];
        for (const itemRef of dayResult.items) {
          try {
            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);
            
            dayImages.push({
              url,
              path: itemRef.fullPath,
              size: metadata.size,
              timestamp: metadata.timeCreated
            });
          } catch (error) {
            console.warn('⚠️ Error cargando imagen:', itemRef.fullPath);
          }
        }
        
        if (dayImages.length > 0) {
          imagesByDay[dayKey] = dayImages;
        }
      }
      
      console.log(`✅ Cargadas ${Object.keys(imagesByDay).length} carpetas`);
      return imagesByDay;
    } catch (error) {
      console.error('❌ Error obteniendo imágenes del reporte:', error);
      return {};
    }
  }

  /**
   * 📦 COMPRIMIR IMAGEN (Para navegadores)
   * Para React Native, usar react-native-image-compressor
   */
  async compressImage(
    file: File,
    maxWidthOrHeight: number = 1920,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Calcular nuevas dimensiones
          if (width > height) {
            if (width > maxWidthOrHeight) {
              height *= maxWidthOrHeight / width;
              width = maxWidthOrHeight;
            }
          } else {
            if (height > maxWidthOrHeight) {
              width *= maxWidthOrHeight / height;
              height = maxWidthOrHeight;
            }
          }
          
          // Crear canvas y comprimir
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener contexto canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error creando blob'));
                return;
              }
              
              console.log(`📦 Comprimido: ${(blob.size / 1024).toFixed(2)} KB`);
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Error cargando imagen'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 📤 COMPRIMIR Y SUBIR (Función completa recomendada)
   */
  async compressAndUpload(
    file: File,
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult> {
    try {
      console.log('📦 Comprimiendo imagen...');
      const compressedBlob = await this.compressImage(file);
      
      console.log(`Original: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`Comprimido: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
      
      return await this.uploadImage(compressedBlob, reportId, dayIndex);
    } catch (error) {
      console.error('❌ Error en compresión y subida:', error);
      throw error;
    }
  }
}

export const firebaseImageStorage = new FirebaseImageStorage();
export default firebaseImageStorage;
```

---

## 💾 LÓGICA DE GUARDADO POR DÍA

### Flujo Completo de Guardado

```
1. Usuario llena datos del día actual
2. Usuario presiona "Guardar Día" o "Guardar Pendiente"
3. Sistema valida datos del día
4. Sistema guarda datos en reportesPorDia[fecha]
5. Sistema sube fotos a Firebase Storage (si hay)
6. Sistema guarda reporte completo en Firestore
7. Si es el último día: estado = 'completado'
8. Si no es el último día: estado = 'en progreso'
9. Usuario puede continuar al siguiente día
```

### Código de Guardado de Día

```typescript
/**
 * 💾 GUARDAR DÍA ACTUAL
 * Guarda los datos del día actual en la estructura multi-día
 */
const guardarDiaActual = async () => {
  try {
    if (diasTrabajo.length === 0) return;
    
    const diaKey = diasTrabajo[diaActual]; // "2026-02-10"
    
    console.log(`💾 Guardando día ${diaActual + 1}/${diasTrabajo.length}: ${diaKey}`);
    
    // Construir datos del día
    const datosDelDia: DayReportData = {
      fecha: diaKey,
      tipoIntervencion: tipoIntervencion,
      subTipoCanal: subTipoCanal,
      observaciones: observaciones,
      plantillaValues: plantillaValues,
      metricData: plantillaValues,
      autoGpsFields: autoGpsFields,
      gpsData: autoGpsFields,
      vehiculos: vehiculos,
      completado: true // Marcar día como completado
    };
    
    // Guardar en reportesPorDia
    const nuevoReportesPorDia = {
      ...reportesPorDia,
      [diaKey]: datosDelDia
    };
    
    setReportesPorDia(nuevoReportesPorDia);
    
    console.log('✅ Día guardado exitosamente');
    return nuevoReportesPorDia;
    
  } catch (error) {
    console.error('❌ Error guardando día:', error);
    throw error;
  }
};

/**
 * 💾 GUARDAR REPORTE COMPLETO (PENDIENTE o COMPLETADO)
 */
const guardarReporte = async (esCompletado: boolean = false) => {
  try {
    // 1. Guardar día actual primero
    const reportesActualizados = await guardarDiaActual();
    
    // 2. Generar ID si no existe
    if (!reportId) {
      const nuevoId = `DCR_${new Date().getFullYear()}_${Date.now()}`;
      setReportId(nuevoId);
    }
    
    // 3. Construir reporte completo
    const reporteCompleto: ReportData = {
      id: reportId,
      numeroReporte: reportId,
      timestamp: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
      fechaCreacion: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
      creadoPor: user?.name || "Desconocido",
      usuarioId: user?.username || "desconocido",
      
      // Ubicación
      region: region,
      provincia: provincia,
      distrito: distrito,
      municipio: municipio,
      sector: sector,
      
      // Multi-día
      esProyectoMultiDia: true,
      fechaInicio: fechaInicio,
      fechaFinal: fechaFinal,
      diasTrabajo: diasTrabajo,
      diaActual: diaActual,
      reportesPorDia: reportesActualizados,
      
      // Datos del día actual (para compatibilidad)
      tipoIntervencion: tipoIntervencion,
      subTipoCanal: subTipoCanal,
      observaciones: observaciones,
      metricData: plantillaValues,
      plantillaValues: plantillaValues,
      gpsData: autoGpsFields,
      autoGpsFields: autoGpsFields,
      vehiculos: vehiculos,
      
      // Fotos
      imagesPerDay: imagesPerDay,
      
      // Estado
      estado: esCompletado ? 'completado' : 'en progreso'
    };
    
    // 4. Guardar en Firebase
    await firebaseReportStorage.saveReport(reporteCompleto);
    
    console.log('✅ Reporte guardado exitosamente');
    
    // 5. Mostrar confirmación
    mostrarMensajeExito(esCompletado ? 'Reporte completado' : 'Progreso guardado');
    
  } catch (error) {
    console.error('❌ Error guardando reporte:', error);
    mostrarMensajeError('Error al guardar');
    throw error;
  }
};

/**
 * ➡️ AVANZAR AL SIGUIENTE DÍA
 */
const avanzarAlSiguienteDia = async () => {
  try {
    // 1. Guardar día actual
    await guardarDiaActual();
    
    // 2. Verificar si hay más días
    if (diaActual < diasTrabajo.length - 1) {
      // Hay más días, avanzar
      setDiaActual(diaActual + 1);
      
      // 3. Cargar datos del siguiente día (si existen)
      const siguienteDiaKey = diasTrabajo[diaActual + 1];
      const datosSiguienteDia = reportesPorDia[siguienteDiaKey];
      
      if (datosSiguienteDia) {
        // Cargar datos guardados
        setTipoIntervencion(datosSiguienteDia.tipoIntervencion || '');
        setSubTipoCanal(datosSiguienteDia.subTipoCanal || '');
        setObservaciones(datosSiguienteDia.observaciones || '');
        setPlantillaValues(datosSiguienteDia.plantillaValues || {});
        setAutoGpsFields(datosSiguienteDia.autoGpsFields || {});
        // Los vehículos persisten automáticamente
      } else {
        // Nuevo día, limpiar campos pero mantener vehículos
        setTipoIntervencion('');
        setSubTipoCanal('');
        setObservaciones('');
        setPlantillaValues({});
        setAutoGpsFields({});
        // vehiculos se mantienen
      }
      
      console.log(`➡️ Avanzado al día ${diaActual + 2}/${diasTrabajo.length}`);
    } else {
      // Es el último día, completar reporte
      await guardarReporte(true);
      console.log('✅ Reporte completado (todos los días)');
    }
    
  } catch (error) {
    console.error('❌ Error avanzando al siguiente día:', error);
    throw error;
  }
};
```

---

## 📸 SISTEMA DE 2 FOTOS POR DÍA

### Reglas de Fotos

1. **Máximo 2 fotos por día** (independiente)
2. **Organización por día**: Cada día tiene su carpeta en Firebase Storage
3. **Compresión automática**: Fotos se comprimen antes de subir
4. **Estructura en Storage**: `reportes/{reportId}/dia-{index}/{timestamp}.jpg`
5. **Persistencia**: Las fotos se guardan en `imagesPerDay[dia-X]`

### Hook de React para Manejo de Fotos

**Ubicación:** `src/hooks/useReportImages.ts`

```typescript
import { useState, useEffect } from 'react';
import { firebaseImageStorage, ImageUploadResult } from '../services/firebaseImageStorage';

interface ImageWithPreview extends ImageUploadResult {
  localPreview?: string;
}

/**
 * 📸 HOOK PARA MANEJAR FOTOS DE REPORTES
 * 
 * @param reportId - ID del reporte
 * @param dayIndex - Índice del día
 * @param maxImages - Máximo de fotos permitidas (default: 2)
 */
export const useReportImages = (
  reportId: string,
  dayIndex?: number,
  maxImages: number = 2
) => {
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cargar imágenes existentes al montar
  useEffect(() => {
    loadExistingImages();
  }, [reportId, dayIndex]);

  /**
   * Cargar imágenes existentes de Firebase
   */
  const loadExistingImages = async () => {
    try {
      const existingImages = await firebaseImageStorage.getDayImages(reportId, dayIndex);
      setImages(existingImages);
    } catch (error) {
      console.error('Error cargando imágenes:', error);
    }
  };

  /**
   * 📤 AGREGAR IMAGEN
   */
  const addImage = async (file: File): Promise<boolean> => {
    try {
      // Validar que no se exceda el máximo
      if (images.length >= maxImages) {
        alert(`Máximo ${maxImages} fotos permitidas por día`);
        return false;
      }

      setUploading(true);
      setUploadProgress(0);

      // Crear preview local
      const localPreview = await createLocalPreview(file);

      // Agregar preview inmediatamente
      const tempImage: ImageWithPreview = {
        url: '',
        path: '',
        size: file.size,
        timestamp: new Date().toISOString(),
        localPreview
      };
      setImages(prev => [...prev, tempImage]);

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Subir a Firebase
      const result = await firebaseImageStorage.compressAndUpload(
        file,
        reportId,
        dayIndex
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reemplazar preview con imagen real
      setImages(prev => 
        prev.map(img => 
          img.localPreview === localPreview 
            ? { ...result, localPreview } 
            : img
        )
      );

      console.log('✅ Foto subida exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error subiendo foto:', error);
      alert('Error subiendo foto');
      return false;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * 🗑️ ELIMINAR IMAGEN
   */
  const removeImage = async (index: number): Promise<void> => {
    try {
      const image = images[index];
      
      // Si tiene path, eliminar de Firebase
      if (image.path) {
        await firebaseImageStorage.deleteImage(image.path);
      }

      // Eliminar del estado
      setImages(prev => prev.filter((_, i) => i !== index));
      
      console.log('✅ Foto eliminada');
    } catch (error) {
      console.error('❌ Error eliminando foto:', error);
      alert('Error eliminando foto');
    }
  };

  /**
   * 🔄 RECARGAR IMÁGENES
   */
  const reloadImages = async (): Promise<void> => {
    await loadExistingImages();
  };

  /**
   * 🖼️ CREAR PREVIEW LOCAL
   */
  const createLocalPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    images,
    uploading,
    uploadProgress,
    addImage,
    removeImage,
    reloadImages,
    canAddMore: images.length < maxImages,
    remainingSlots: maxImages - images.length
  };
};
```

### Componente de Fotos en Formulario

```typescript
/**
 * 📸 COMPONENTE DE FOTOS PARA EL DÍA ACTUAL
 */
const PhotosSection: React.FC<{
  reportId: string;
  dayIndex: number;
  onImagesChange: (images: ImageUploadResult[]) => void;
}> = ({ reportId, dayIndex, onImagesChange }) => {
  const {
    images,
    uploading,
    uploadProgress,
    addImage,
    removeImage,
    canAddMore,
    remainingSlots
  } = useReportImages(reportId, dayIndex, 2);

  // Notificar cambios al padre
  useEffect(() => {
    onImagesChange(images);
  }, [images]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addImage(file);
      // Limpiar input para permitir seleccionar el mismo archivo de nuevo
      e.target.value = '';
    }
  };

  return (
    <div className="photos-section">
      <h3>📸 Fotos del Día {dayIndex + 1}</h3>
      <p>Puedes agregar hasta 2 fotos. Restantes: {remainingSlots}</p>

      {/* Botón para agregar foto */}
      {canAddMore && (
        <label className="add-photo-button">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <button 
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.preventDefault();
              (e.currentTarget.previousSibling as HTMLInputElement).click();
            }}
          >
            {uploading ? '⏳ Subiendo...' : '📷 Tomar/Seleccionar Foto'}
          </button>
        </label>
      )}

      {/* Barra de progreso */}
      {uploading && (
        <div className="upload-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          />
          <span>{uploadProgress}%</span>
        </div>
      )}

      {/* Galería de fotos */}
      <div className="photos-grid">
        {images.map((img, index) => (
          <div key={index} className="photo-item">
            <img
              src={img.localPreview || img.url}
              alt={`Foto ${index + 1}`}
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="remove-photo-button"
            >
              ❌
            </button>
            <p className="photo-size">
              {(img.size / 1024).toFixed(0)} KB
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🚀 IMPLEMENTACIÓN PASO A PASO

### Paso 1: Configurar Firebase

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export default app;
```

### Paso 2: Copiar Servicios

1. Copiar `firebaseReportStorage.ts` a `src/services/`
2. Copiar `firebaseImageStorage.ts` a `src/services/`
3. Instalar dependencias:
   ```bash
   npm install firebase
   ```

### Paso 3: Crear Hook de Imágenes

1. Crear carpeta `src/hooks/` si no existe
2. Copiar `useReportImages.ts` a `src/hooks/`

### Paso 4: Integrar en Formulario de Reporte

```typescript
// En tu componente de formulario
import { useState } from 'react';
import { useReportImages } from '../hooks/useReportImages';
import firebaseReportStorage from '../services/firebaseReportStorage';

const ReportForm = () => {
  // Estados básicos
  const [reportId, setReportId] = useState(`DCR_${Date.now()}`);
  const [diasTrabajo, setDiasTrabajo] = useState<string[]>([]);
  const [diaActual, setDiaActual] = useState(0);
  const [reportesPorDia, setReportesPorDia] = useState<Record<string, any>>({});
  const [imagesPerDay, setImagesPerDay] = useState<Record<string, any>>({});

  // ... otros estados ...

  // Manejar cambio de imágenes del día actual
  const handleImagesChange = (images: ImageUploadResult[]) => {
    const dayKey = `dia-${diaActual}`;
    setImagesPerDay(prev => ({
      ...prev,
      [dayKey]: images
    }));
  };

  // Guardar día actual
  const guardarDiaActual = async () => {
    const diaKey = diasTrabajo[diaActual];
    
    const datosDelDia = {
      fecha: diaKey,
      tipoIntervencion,
      observaciones,
      plantillaValues,
      vehiculos,
      completado: true
    };

    setReportesPorDia(prev => ({
      ...prev,
      [diaKey]: datosDelDia
    }));
  };

  // Guardar reporte completo
  const guardarReporte = async () => {
    await guardarDiaActual();

    const reporteCompleto = {
      id: reportId,
      numeroReporte: reportId,
      timestamp: new Date().toISOString(),
      // ... otros campos ...
      esProyectoMultiDia: true,
      diasTrabajo,
      diaActual,
      reportesPorDia,
      imagesPerDay, // 📸 Fotos incluidas
      estado: 'en progreso'
    };

    await firebaseReportStorage.saveReport(reporteCompleto);
  };

  return (
    <div>
      {/* Formulario normal */}
      
      {/* Sección de fotos */}
      <PhotosSection
        reportId={reportId}
        dayIndex={diaActual}
        onImagesChange={handleImagesChange}
      />

      {/* Botones */}
      <button onClick={guardarReporte}>Guardar Progreso</button>
      <button onClick={avanzarAlSiguienteDia}>Siguiente Día</button>
    </div>
  );
};
```

### Paso 5: Configurar Reglas de Firebase Storage

En la consola de Firebase, agregar estas reglas:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reportes/{reportId}/{day}/{filename} {
      // Permitir lectura a todos los autenticados
      allow read: if request.auth != null;
      
      // Permitir escritura a usuarios autenticados
      allow write: if request.auth != null;
      
      // Validar que sea JPEG y menor a 5MB
      allow create: if request.resource.contentType.matches('image/.*')
                    && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### Paso 6: Configurar Reglas de Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      // Permitir lectura a usuarios autenticados
      allow read: if request.auth != null;
      
      // Permitir escritura al creador del reporte
      allow create: if request.auth != null;
      allow update: if request.auth != null 
                    && resource.data.usuarioId == request.auth.token.username;
      allow delete: if request.auth != null
                    && resource.data.usuarioId == request.auth.token.username;
    }
  }
}
```

---

## ✅ VALIDACIONES Y REGLAS

### Validaciones de Datos

```typescript
/**
 * ✅ VALIDAR DÍA ANTES DE GUARDAR
 */
const validarDiaActual = (): boolean => {
  const errores: string[] = [];

  // 1. Tipo de intervención es obligatorio
  if (!tipoIntervencion) {
    errores.push('Tipo de intervención es obligatorio');
  }

  // 2. Plantilla debe estar completa
  const plantillaCompleta = plantillaFields.every(field => {
    const value = plantillaValues[field.key];
    return value && value.trim() !== '';
  });

  if (!plantillaCompleta) {
    errores.push('Completa todos los campos de la plantilla');
  }

  // 3. Debe haber al menos un vehículo
  if (vehiculos.length === 0) {
    errores.push('Agrega al menos un vehículo');
  }

  // 4. Al menos un punto GPS debe estar presente
  if (!autoGpsFields.punto_inicial && !autoGpsFields.punto_alcanzado) {
    errores.push('Captura al menos un punto GPS');
  }

  // 5. Fotos son opcionales pero máximo 2
  const fotosDelDia = imagesPerDay[`dia-${diaActual}`] || [];
  if (fotosDelDia.length > 2) {
    errores.push('Máximo 2 fotos por día');
  }

  // Mostrar errores si hay
  if (errores.length > 0) {
    alert('Errores de validación:\n' + errores.join('\n'));
    return false;
  }

  return true;
};

/**
 * ✅ VALIDAR REPORTE COMPLETO
 */
const validarReporteCompleto = (): boolean => {
  const errores: string[] = [];

  // 1. Todos los días deben estar completados
  const diasCompletados = diasTrabajo.every(dia => {
    const datosDia = reportesPorDia[dia];
    return datosDia && datosDia.completado === true;
  });

  if (!diasCompletados) {
    errores.push('Completa todos los días antes de finalizar');
  }

  // 2. Ubicación debe estar completa
  if (!region || !provincia || !municipio) {
    errores.push('Completa la ubicación geográfica');
  }

  if (errores.length > 0) {
    alert('Errores de validación:\n' + errores.join('\n'));
    return false;
  }

  return true;
};
```

### Reglas de Negocio

1. **Un día a la vez**: El técnico solo puede trabajar en el día actual
2. **No saltar días**: Debe completar el día actual antes de avanzar
3. **Edición de días pasados**: Puede volver a días anteriores para editar
4. **Fotos opcionales**: No es obligatorio tener fotos, pero si las hay, máximo 2 por día
5. **Vehículos persisten**: Los vehículos del día 1 se copian automáticamente al día 2
6. **GPS requerido**: Al menos un punto GPS por día
7. **Plantilla completa**: Todos los campos de la plantilla son obligatorios

---

## 🔄 FLUJO COMPLETO DE USUARIO

### Escenario 1: Crear Reporte de Un Solo Día

```
1. Técnico abre app
2. Selecciona "Nuevo Reporte"
3. Llena ubicación geográfica
4. Selecciona tipo de intervención
5. Llena plantilla de métricas
6. Captura puntos GPS
7. Agrega vehículos
8. Toma 2 fotos (opcional)
9. Presiona "Completar Reporte"
10. Sistema sube fotos → guarda reporte → muestra confirmación
```

### Escenario 2: Crear Reporte Multi-Día

```
DÍA 1:
1. Técnico abre app
2. Selecciona "Nuevo Reporte Multi-Día"
3. Selecciona rango de fechas (ej: 10-12 de feb)
4. Sistema genera 3 días de trabajo
5. Llena datos del Día 1:
   - Ubicación
   - Tipo de intervención
   - Métricas
   - GPS
   - Vehículos
   - 2 fotos
6. Presiona "Guardar Día 1"
7. Sistema guarda día 1 con fotos
8. Presiona "Siguiente Día"

DÍA 2:
9. Sistema carga Día 2
10. Vehículos se mantienen del Día 1
11. Llena nuevos datos del Día 2:
    - Métricas (puede ser diferente)
    - GPS nuevo
    - 2 fotos nuevas
12. Presiona "Guardar Día 2"
13. Presiona "Siguiente Día"

DÍA 3:
14. Sistema carga Día 3 (último)
15. Llena datos del Día 3
16. Presiona "Completar Reporte"
17. Sistema valida todos los días
18. Sistema guarda reporte completo
19. Estado cambia a "completado"
20. Muestra resumen final
```

### Escenario 3: Continuar Reporte Guardado

```
1. Técnico abre app
2. Selecciona "Reportes Pendientes"
3. Sistema muestra lista de reportes en progreso
4. Selecciona reporte del 10-12 de feb
5. Sistema carga reporte
6. Sistema va automáticamente al día actual (Día 2)
7. Técnico continúa desde donde dejó
8. Completa días restantes
```

### Escenario 4: Editar Día Anterior

```
1. Técnico está en Día 3
2. Se da cuenta que falta algo en Día 1
3. Presiona "Ver Días" o navegación de días
4. Selecciona Día 1
5. Sistema carga datos del Día 1 (incluyendo fotos)
6. Edita datos necesarios
7. Presiona "Guardar Cambios"
8. Vuelve al Día 3
9. Continúa normalmente
```

---

## 🧪 TESTING Y VERIFICACIÓN

### Checklist de Pruebas

```
✅ Crear reporte de un solo día
✅ Crear reporte multi-día (3 días)
✅ Subir 2 fotos en cada día
✅ Validar que no se puedan subir más de 2 fotos por día
✅ Guardar progreso y cerrar app
✅ Reabrir app y continuar reporte
✅ Editar día anterior
✅ Completar reporte multi-día
✅ Verificar fotos en Firebase Storage
✅ Verificar estructura en Firestore
✅ Probar sin conexión (debe guardar local y sincronizar después)
✅ Eliminar foto y verificar que se elimine de Storage
✅ Probar con diferentes tipos de intervención
✅ Validar persistencia de vehículos entre días
✅ Verificar compresión de imágenes
```

### Comandos de Verificación

```bash
# Verificar estructura en Firestore
# Ir a Firebase Console → Firestore Database → reports

# Verificar fotos en Storage
# Ir a Firebase Console → Storage → reportes/{reportId}/

# Estructura esperada:
reportes/
  DCR_2026_001/
    dia-0/
      1707559200_abc.jpg    # Foto 1 del día 0
      1707559300_def.jpg    # Foto 2 del día 0
    dia-1/
      1707645600_ghi.jpg    # Foto 1 del día 1
      1707645700_jkl.jpg    # Foto 2 del día 1
    dia-2/
      1707732000_mno.jpg    # Foto 1 del día 2
```

### Ejemplo de Verificación en Código

```typescript
/**
 * 🧪 FUNCIÓN DE DEBUG PARA VERIFICAR ESTRUCTURA
 */
const verificarEstructuraReporte = async (reportId: string) => {
  console.log('🔍 Verificando estructura del reporte:', reportId);

  // 1. Obtener reporte de Firestore
  const reporte = await firebaseReportStorage.getReport(reportId);
  
  if (!reporte) {
    console.error('❌ Reporte no encontrado');
    return;
  }

  console.log('✅ Reporte encontrado');
  console.log('📊 Datos básicos:');
  console.log('  - ID:', reporte.id);
  console.log('  - Usuario:', reporte.creadoPor);
  console.log('  - Multi-día:', reporte.esProyectoMultiDia);
  console.log('  - Días de trabajo:', reporte.diasTrabajo);
  console.log('  - Día actual:', reporte.diaActual);

  // 2. Verificar reportesPorDia
  if (reporte.reportesPorDia) {
    console.log('📝 Reportes por día:');
    Object.keys(reporte.reportesPorDia).forEach(dia => {
      const datos = reporte.reportesPorDia![dia];
      console.log(`  - ${dia}:`);
      console.log(`    • Completado: ${datos.completado}`);
      console.log(`    • Intervención: ${datos.tipoIntervencion}`);
      console.log(`    • Vehículos: ${datos.vehiculos?.length || 0}`);
    });
  }

  // 3. Verificar fotos
  console.log('📸 Verificando fotos...');
  const imagesByDay = await firebaseImageStorage.getReportImages(reportId);
  
  Object.keys(imagesByDay).forEach(dayKey => {
    const images = imagesByDay[dayKey];
    console.log(`  - ${dayKey}: ${images.length} foto(s)`);
    images.forEach((img, index) => {
      console.log(`    ${index + 1}. ${(img.size / 1024).toFixed(2)} KB`);
    });
  });

  // 4. Verificar integridad
  const problemas: string[] = [];

  if (reporte.esProyectoMultiDia) {
    // Verificar que todos los días tengan datos
    reporte.diasTrabajo?.forEach(dia => {
      if (!reporte.reportesPorDia?.[dia]) {
        problemas.push(`Día ${dia} no tiene datos`);
      }
    });

    // Verificar consistencia de fotos
    Object.keys(imagesByDay).forEach(dayKey => {
      const dayIndex = parseInt(dayKey.replace('dia-', ''));
      if (isNaN(dayIndex) || dayIndex >= (reporte.diasTrabajo?.length || 0)) {
        problemas.push(`Carpeta de fotos ${dayKey} no corresponde a un día válido`);
      }

      if (imagesByDay[dayKey].length > 2) {
        problemas.push(`${dayKey} tiene más de 2 fotos`);
      }
    });
  }

  if (problemas.length > 0) {
    console.warn('⚠️ Problemas encontrados:');
    problemas.forEach(p => console.warn('  -', p));
  } else {
    console.log('✅ Estructura válida');
  }
};
```

---

## 📦 RESUMEN FINAL PARA EL AGENTE

### Archivos a Crear/Copiar

1. **src/services/firebaseReportStorage.ts** → Servicio de reportes
2. **src/services/firebaseImageStorage.ts** → Servicio de imágenes
3. **src/hooks/useReportImages.ts** → Hook para manejar fotos
4. **src/config/firebase.ts** → Configuración de Firebase (si no existe)

### Dependencias a Instalar

```bash
npm install firebase
```

### Puntos Clave a Implementar

1. **Estructura de datos**: Usar `reportesPorDia` para datos por día
2. **Fotos independientes**: Usar `imagesPerDay[dia-X]` con máximo 2 por día
3. **Guardado por día**: Función `guardarDiaActual()` antes de avanzar
4. **Persistencia**: Vehículos persisten entre días automáticamente
5. **Validaciones**: Validar antes de guardar y antes de avanzar día
6. **Firebase Storage**: Estructura `reportes/{id}/dia-{index}/{timestamp}.jpg`
7. **Estados del reporte**: 'en progreso' → 'completado' al finalizar

### Configuración de Firebase

- **Firestore**: Colección `reports` con documentos por ID de reporte
- **Storage**: Carpeta `reportes/` con subcarpetas por reporte y día
- **Rules**: Configurar reglas de seguridad para ambos servicios

---

## 🎬 CONCLUSIÓN

Con esta configuración completa, la aplicación core-apk tendrá:

✅ Sistema de reportes multi-día funcional
✅ 2 fotos independientes por cada día
✅ Persistencia inteligente de datos
✅ Sincronización con Firebase
✅ Estructura organizada y escalable
✅ Validaciones robustas
✅ Experiencia de usuario fluida

**Todo listo para implementar. Solo copia, pega y configura según las instrucciones.**

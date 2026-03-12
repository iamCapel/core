/**
 * 🔥 SERVICIO DE FIREBASE STORAGE PARA IMÁGENES
 * 
 * Este servicio maneja la subida, descarga y eliminación de imágenes
 * en Firebase Storage para los reportes.
 * 
 * CÓMO USAR EN CORE-APK:
 * 1. Copiar este archivo a src/services/
 * 2. Importar: import { firebaseImageStorage } from './services/firebaseImageStorage'
 * 3. Usar las funciones según los ejemplos abajo
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import app from '../config/firebase';

const storage = getStorage(app);

/**
 * Interfaz para el resultado de subida
 */
export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
  timestamp: string;
}

/**
 * Opciones de compresión de imagen
 */
export interface ImageCompressionOptions {
  maxSizeMB: number;      // Tamaño máximo en MB (default: 0.5)
  maxWidthOrHeight: number; // Ancho/alto máximo en px (default: 1920)
  useWebWorker: boolean;   // Usar Web Worker (default: true)
  quality: number;        // Calidad 0-1 (default: 0.8)
}

class FirebaseImageStorage {
  /**
   * 📤 SUBIR IMAGEN
   * 
   * Sube una imagen a Firebase Storage y retorna la URL
   * 
   * @param file - Archivo de imagen (File o Blob)
   * @param reportId - ID del reporte
   * @param dayIndex - Índice del día (para multi-día) o null
   * @returns Promise con URL y metadata
   * 
   * EJEMPLO:
   * ```typescript
   * const file = event.target.files[0];
   * const result = await firebaseImageStorage.uploadImage(file, 'DCR_2026_001', 0);
   * console.log('URL de la imagen:', result.url);
   * ```
   */
  async uploadImage(
    file: File | Blob,
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult> {
    try {
      // Generar nombre único para la imagen
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const dayPath = dayIndex !== undefined ? `dia-${dayIndex}` : 'general';
      const fileName = `${timestamp}_${randomStr}.jpg`;
      
      // Ruta en Firebase Storage: reportes/{reportId}/{dia}/{timestamp}.jpg
      const storagePath = `reportes/${reportId}/${dayPath}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📤 Subiendo imagen a:', storagePath);
      
      // Subir archivo
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Imagen subida exitosamente:', downloadURL);
      
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
   * 📤 SUBIR MÚLTIPLES IMÁGENES
   * 
   * Sube varias imágenes en paralelo
   * 
   * @param files - Array de archivos
   * @param reportId - ID del reporte
   * @param dayIndex - Índice del día
   * @returns Promise con array de URLs
   * 
   * EJEMPLO:
   * ```typescript
   * const files = Array.from(event.target.files);
   * const results = await firebaseImageStorage.uploadMultipleImages(files, 'DCR_2026_001', 0);
   * console.log('URLs:', results.map(r => r.url));
   * ```
   */
  async uploadMultipleImages(
    files: (File | Blob)[],
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult[]> {
    try {
      console.log(`📤 Subiendo ${files.length} imágenes...`);
      
      // Subir todas en paralelo
      const uploadPromises = files.map(file => 
        this.uploadImage(file, reportId, dayIndex)
      );
      
      const results = await Promise.all(uploadPromises);
      
      console.log(`✅ ${results.length} imágenes subidas exitosamente`);
      
      return results;
    } catch (error) {
      console.error('❌ Error subiendo imágenes:', error);
      throw error;
    }
  }

  /**
   * 🗑️ ELIMINAR IMAGEN
   * 
   * Elimina una imagen de Firebase Storage
   * 
   * @param path - Ruta de la imagen en Storage
   * 
   * EJEMPLO:
   * ```typescript
   * await firebaseImageStorage.deleteImage('reportes/DCR_2026_001/dia-0/1234567890.jpg');
   * ```
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
   * 🗑️ ELIMINAR MÚLTIPLES IMÁGENES
   * 
   * Elimina varias imágenes en paralelo
   * 
   * @param paths - Array de rutas
   * 
   * EJEMPLO:
   * ```typescript
   * await firebaseImageStorage.deleteMultipleImages([
   *   'reportes/DCR_2026_001/dia-0/1234.jpg',
   *   'reportes/DCR_2026_001/dia-0/5678.jpg'
   * ]);
   * ```
   */
  async deleteMultipleImages(paths: string[]): Promise<void> {
    try {
      const deletePromises = paths.map(path => this.deleteImage(path));
      await Promise.all(deletePromises);
      console.log(`✅ ${paths.length} imágenes eliminadas`);
    } catch (error) {
      console.error('❌ Error eliminando imágenes:', error);
      throw error;
    }
  }

  /**
   * 🔗 OBTENER URL DE IMAGEN
   * 
   * Obtiene la URL de descarga de una imagen ya subida
   * 
   * @param path - Ruta de la imagen en Storage
   * @returns URL de descarga
   * 
   * EJEMPLO:
   * ```typescript
   * const url = await firebaseImageStorage.getImageURL('reportes/DCR_2026_001/dia-0/1234.jpg');
   * ```
   */
  async getImageURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('❌ Error obteniendo URL:', error);
      throw error;
    }
  }

  /**
   * 📦 COMPRIMIR IMAGEN (Browser)
   * 
   * Comprime una imagen usando canvas (funciona en navegador)
   * Para React Native usa react-native-image-compressor
   * 
   * @param file - Archivo original
   * @param options - Opciones de compresión
   * @returns Blob comprimido
   * 
   * EJEMPLO:
   * ```typescript
   * const compressed = await firebaseImageStorage.compressImage(file, {
   *   maxSizeMB: 0.5,
   *   maxWidthOrHeight: 1920,
   *   quality: 0.8
   * });
   * ```
   */
  async compressImage(
    file: File,
    options: Partial<ImageCompressionOptions> = {}
  ): Promise<Blob> {
    const {
      maxWidthOrHeight = 1920,
      quality = 0.8
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Calcular nuevas dimensiones
          let width = img.width;
          let height = img.height;
          
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
            reject(new Error('No se pudo obtener contexto de canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al crear blob'));
                return;
              }
              
              const sizeInMB = blob.size / (1024 * 1024);
              console.log(`📦 Imagen comprimida: ${sizeInMB.toFixed(2)} MB`);
              
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Error al cargar imagen'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 📤 COMPRIMIR Y SUBIR (Todo en uno)
   * 
   * Comprime automáticamente y sube la imagen
   * Esta es la función más recomendada para usar
   * 
   * @param file - Archivo original
   * @param reportId - ID del reporte
   * @param dayIndex - Índice del día
   * @param options - Opciones de compresión
   * @returns Resultado con URL
   * 
   * EJEMPLO (USO RECOMENDADO):
   * ```typescript
   * const file = event.target.files[0];
   * const result = await firebaseImageStorage.compressAndUpload(
   *   file,
   *   'DCR_2026_001',
   *   0
   * );
   * console.log('Foto subida:', result.url);
   * ```
   */
  async compressAndUpload(
    file: File,
    reportId: string,
    dayIndex?: number,
    options?: Partial<ImageCompressionOptions>
  ): Promise<ImageUploadResult> {
    try {
      console.log('📦 Comprimiendo imagen...');
      const compressedBlob = await this.compressImage(file, options);
      
      console.log(`📊 Tamaño original: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`📊 Tamaño comprimido: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
      
      return await this.uploadImage(compressedBlob, reportId, dayIndex);
    } catch (error) {
      console.error('❌ Error en compresión y subida:', error);
      throw error;
    }
  }

  /**
   * 📥 OBTENER IMÁGENES DE UN REPORTE
   * 
   * Carga todas las imágenes de un reporte guardado desde Firebase Storage
   * 
   * @param reportId - ID del reporte
   * @returns Record con imágenes por día
   * 
   * EJEMPLO:
   * ```typescript
   * const images = await firebaseImageStorage.getReportImages('DCR_2026_001');
   * console.log('Imágenes del día 0:', images['dia-0']);
   * ```
   */
  async getReportImages(reportId: string): Promise<Record<string, ImageUploadResult[]>> {
    try {
      console.log('📥 Cargando imágenes del reporte:', reportId);
      
      // Temporalmente deshabilitado para evitar errores CORS
      console.warn('⚠️ Carga de imágenes deshabilitada temporalmente por CORS');
      return {};
      
      const reportPath = `reportes/${reportId}`;
      const reportRef = ref(storage, reportPath);
      
      // Listar todas las carpetas (días)
      const result = await listAll(reportRef);
      const imagesByDay: Record<string, ImageUploadResult[]> = {};
      
      // Para cada carpeta de día, obtener las imágenes
      for (const folderRef of result.prefixes) {
        const dayKey = folderRef.name; // 'dia-0', 'dia-1', 'general', etc.
        const dayResult = await listAll(folderRef);
        
        const dayImages: ImageUploadResult[] = [];
        for (const itemRef of dayResult.items) {
          try {
            const { getDownloadURL, getMetadata } = await import('firebase/storage');
            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);
            
            dayImages.push({
              url,
              path: itemRef.fullPath,
              size: metadata.size,
              timestamp: metadata.timeCreated
            });
          } catch (error) {
            console.warn('⚠️ Error cargando imagen:', itemRef.fullPath, error);
          }
        }
        
        if (dayImages.length > 0) {
          imagesByDay[dayKey] = dayImages;
        }
      }
      
      console.log(`✅ Cargadas ${Object.keys(imagesByDay).length} carpetas de imágenes`);
      return imagesByDay;
      
    } catch (error) {
      console.error('❌ Error obteniendo imágenes del reporte:', error);
      return {};
    }
  }

  /**
   * 📥 OBTENER IMÁGENES DE UN DÍA ESPECÍFICO
   * 
   * Carga las imágenes de un día específico de un reporte
   * 
   * @param reportId - ID del reporte
   * @param dayIndex - Índice del día
   * @returns Array de imágenes
   * 
   * EJEMPLO:
   * ```typescript
   * const images = await firebaseImageStorage.getDayImages('DCR_2026_001', 0);
   * console.log('Imágenes:', images);
   * ```
   */
  async getDayImages(
    reportId: string,
    dayIndex?: number
  ): Promise<ImageUploadResult[]> {
    try {
      const { ref: storageRef, listAll } = await import('firebase/storage');
      const dayPath = dayIndex !== undefined ? `dia-${dayIndex}` : 'general';
      const folderPath = `reportes/${reportId}/${dayPath}`;
      const folderRef = storageRef(storage, folderPath);
      
      console.log('📥 Cargando imágenes de:', folderPath);
      
      const result = await listAll(folderRef);
      const images: ImageUploadResult[] = [];
      
      for (const itemRef of result.items) {
        try {
          const { getDownloadURL, getMetadata } = await import('firebase/storage');
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          
          images.push({
            url,
            path: itemRef.fullPath,
            size: metadata.size,
            timestamp: metadata.timeCreated
          });
        } catch (error) {
          console.warn('⚠️ Error cargando imagen:', itemRef.fullPath, error);
        }
      }
      
      console.log(`✅ ${images.length} imágenes cargadas`);
      return images;
      
    } catch (error) {
      console.error('❌ Error obteniendo imágenes del día:', error);
      return [];
    }
  }
}

export const firebaseImageStorage = new FirebaseImageStorage();
export default firebaseImageStorage;

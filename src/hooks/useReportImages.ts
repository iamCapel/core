/**
 * 🎣 HOOK PARA MANEJAR IMÁGENES EN REPORTES
 * 
 * Este hook maneja todo el estado y lógica de las fotos
 * 
 * CÓMO USAR EN CORE-APK:
 * 1. Copiar este archivo a src/hooks/
 * 2. Importar: import { useReportImages } from '../hooks/useReportImages'
 * 3. Usar en tu componente según el ejemplo abajo
 * 
 * EJEMPLO DE USO:
 * ```typescript
 * const {
 *   images,           // Array de imágenes actuales
 *   uploading,        // Boolean: está subiendo?
 *   uploadProgress,   // Progreso 0-100
 *   addImage,         // Función para agregar foto
 *   removeImage,      // Función para eliminar foto
 *   clearImages       // Limpiar todas
 * } = useReportImages('DCR_2026_001', 0, 2); // reportId, dayIndex, maxImages
 * 
 * // Agregar foto desde input
 * <input type="file" onChange={(e) => {
 *   if (e.target.files[0]) addImage(e.target.files[0]);
 * }} />
 * 
 * // Mostrar fotos
 * {images.map((img, i) => (
 *   <div key={i}>
 *     <img src={img.url} />
 *     <button onClick={() => removeImage(i)}>X</button>
 *   </div>
 * ))}
 * ```
 */

import { useState, useCallback } from 'react';
import firebaseImageStorage, { ImageUploadResult } from '../services/firebaseImageStorage';

export interface ReportImage {
  url: string;
  path: string;
  size: number;
  timestamp: string;
  localPreview?: string; // Para preview antes de subir
}

export interface UseReportImagesReturn {
  images: ReportImage[];
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  addImage: (file: File) => Promise<void>;
  addMultipleImages: (files: File[]) => Promise<void>;
  removeImage: (index: number) => Promise<void>;
  clearImages: () => void;
  setImages: (images: ReportImage[]) => void;
  canAddMore: boolean;
}

/**
 * Hook para manejar imágenes de un reporte
 * 
 * @param reportId - ID del reporte
 * @param dayIndex - Índice del día (para multi-día)
 * @param maxImages - Máximo de imágenes permitidas (default: 2)
 * @returns Objeto con estado y funciones
 */
export function useReportImages(
  reportId: string,
  dayIndex?: number,
  maxImages: number = 2
): UseReportImagesReturn {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = images.length < maxImages;

  /**
   * Agregar una imagen
   */
  const addImage = useCallback(async (file: File) => {
    if (images.length >= maxImages) {
      setError(`Máximo ${maxImages} fotos por día`);
      alert(`Máximo ${maxImages} fotos por día`);
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      alert('Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (máx 10MB antes de comprimir)
    const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBeforeCompression) {
      setError('La imagen es demasiado grande (máx 10MB)');
      alert('La imagen es demasiado grande (máx 10MB)');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      console.log('📤 Iniciando subida de imagen...');
      
      // Crear preview local
      const localPreview = URL.createObjectURL(file);
      
      // Agregar imagen temporal con preview
      const tempImage: ReportImage = {
        url: '',
        path: '',
        size: file.size,
        timestamp: new Date().toISOString(),
        localPreview
      };
      
      setImages(prev => [...prev, tempImage]);
      setUploadProgress(30);

      // Comprimir y subir
      const result = await firebaseImageStorage.compressAndUpload(
        file,
        reportId,
        dayIndex
      );
      
      setUploadProgress(100);

      // Actualizar con URL real
      setImages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          url: result.url,
          path: result.path,
          size: result.size,
          timestamp: result.timestamp
        };
        return updated;
      });

      console.log('✅ Imagen agregada exitosamente');
      
    } catch (err) {
      console.error('❌ Error agregando imagen:', err);
      setError('Error al subir la imagen');
      
      // Remover imagen temporal si falló
      setImages(prev => prev.slice(0, -1));
      
      alert('Error al subir la imagen. Intenta nuevamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [images, maxImages, reportId, dayIndex]);

  /**
   * Agregar múltiples imágenes
   */
  const addMultipleImages = useCallback(async (files: File[]) => {
    const availableSlots = maxImages - images.length;
    const filesToUpload = files.slice(0, availableSlots);

    if (filesToUpload.length < files.length) {
      alert(`Solo se pueden agregar ${availableSlots} fotos más`);
    }

    for (const file of filesToUpload) {
      await addImage(file);
    }
  }, [images, maxImages, addImage]);

  /**
   * Eliminar una imagen
   */
  const removeImage = useCallback(async (index: number) => {
    const imageToRemove = images[index];
    
    if (!imageToRemove) return;

    try {
      // Si tiene path en Firebase, eliminar de Storage
      if (imageToRemove.path) {
        await firebaseImageStorage.deleteImage(imageToRemove.path);
      }

      // Remover del estado
      setImages(prev => prev.filter((_, i) => i !== index));
      
      console.log('✅ Imagen eliminada');
    } catch (err) {
      console.error('❌ Error eliminando imagen:', err);
      alert('Error al eliminar la imagen');
    }
  }, [images]);

  /**
   * Limpiar todas las imágenes
   */
  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
    setUploadProgress(0);
  }, []);

  return {
    images,
    uploading,
    uploadProgress,
    error,
    addImage,
    addMultipleImages,
    removeImage,
    clearImages,
    setImages,
    canAddMore
  };
}

export default useReportImages;

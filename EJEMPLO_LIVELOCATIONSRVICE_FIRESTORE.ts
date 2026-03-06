/**
 * LiveLocationService - VERSIÓN ACTUALIZADA PARA FIRESTORE
 * 
 * Este archivo debe reemplazar el LiveLocationService existente en CORE-APK
 * Envía ubicaciones GPS a Firestore cada 5 segundos
 */

import { Geolocation } from '@capacitor/geolocation';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

export interface LiveLocationData {
  deviceId: string;
  username: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

class LiveLocationService {
  private trackingInterval: NodeJS.Timer | null = null;
  private isTracking = false;
  private deviceId: string = '';
  private currentUsername: string = '';

  /**
   * Obtener o crear un ID único para este dispositivo
   */
  private getDeviceId(): string {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Intentar obtener del localStorage
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      // Crear nuevo ID único
      deviceId = `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem('device_id', deviceId);
    }

    this.deviceId = deviceId;
    return deviceId;
  }

  /**
   * Enviar ubicación actual a Firestore
   */
  private async sendLocationToFirestore(position: any): Promise<void> {
    try {
      const database = getFirestore();
      const liveLocationsRef = collection(database, 'live_locations');

      const locationData: LiveLocationData = {
        deviceId: this.getDeviceId(),
        username: this.currentUsername,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading
      };

      // Enviar a Firestore
      await addDoc(liveLocationsRef, locationData);

      console.log('✅ Ubicación enviada a Firestore:', locationData);
    } catch (error) {
      console.error('❌ Error enviando ubicación a Firestore:', error);
    }
  }

  /**
   * Obtener ubicación GPS actual
   */
  private async getCurrentLocation(): Promise<void> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      await this.sendLocationToFirestore(position);
    } catch (error) {
      console.error('❌ Error obteniendo ubicación GPS:', error);
    }
  }

  /**
   * Iniciar tracking de ubicación en tiempo real
   */
  async startLiveTracking(username: string): Promise<boolean> {
    if (this.isTracking) {
      console.log('⚠️ Ya se está ejecutando el tracking');
      return false;
    }

    this.currentUsername = username;

    try {
      // Solicitar permisos de geolocalización
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location !== 'granted') {
        console.error('❌ Permisos de ubicación denegados');
        return false;
      }

      console.log('✅ Permisos de ubicación otorgados');

      // Enviar ubicación inmediatamente
      await this.getCurrentLocation();

      // Configurar intervalo para enviar cada 5 segundos
      this.trackingInterval = setInterval(async () => {
        await this.getCurrentLocation();
      }, 5000); // 5 segundos

      this.isTracking = true;
      console.log('🌍 Tracking de ubicación iniciado (cada 5 segundos)');
      return true;

    } catch (error) {
      console.error('❌ Error iniciando tracking:', error);
      return false;
    }
  }

  /**
   * Detener tracking de ubicación
   */
  stopLiveTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    this.currentUsername = '';
    console.log('🛑 Tracking de ubicación detenido');
  }

  /**
   * Verificar si el tracking está activo
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Limpiar ubicaciones antiguas (más de 24 horas)
   * Este método puede ser llamado periódicamente
   */
  async cleanOldLocations(): Promise<void> {
    try {
      // Firestore no permite eliminar por query directamente
      // Se debe hacer desde una Cloud Function o manualmente
      console.log('ℹ️ La limpieza de ubicaciones antiguas debe hacerse desde Cloud Functions');
    } catch (error) {
      console.error('❌ Error limpiando ubicaciones antiguas:', error);
    }
  }
}

// Exportar instancia única (singleton)
export const liveLocationService = new LiveLocationService();
export default liveLocationService;

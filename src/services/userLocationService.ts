import { getFirestore, collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserLocationData {
  username: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  lastUpdate: string;
  timestamp: any;
}

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

class UserLocationService {
  private listeners: Map<string, (locations: UserLocationData[]) => void> = new Map();

  /**
   * Suscribirse a las ubicaciones en vivo desde CORE-APK (Firestore)
   * Estas ubicaciones se envían cada 5 segundos desde los dispositivos móviles
   */
  subscribeToLiveLocations(callback: (locations: LiveLocationData[]) => void): () => void {
    console.log('🔄 Iniciando suscripción a live_locations en Firestore...');

    try {
      // Crear query para obtener ubicaciones de los últimos 5 minutos
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const locationsRef = collection(db, 'live_locations');
      
      const unsubscribe = onSnapshot(locationsRef, (snapshot) => {
        console.log('📡 Snapshot recibido de Firestore');
        console.log('📊 Documentos en snapshot:', snapshot.size);
        
        const locations: LiveLocationData[] = [];
        
        snapshot.forEach((doc) => {
          const locationData = doc.data();
          
          console.log(`🗝️ Procesando documento: ${doc.id}`, locationData);
          
          if (locationData.latitude && locationData.longitude && locationData.username) {
            // Verificar si la ubicación es reciente
            const locationTime = new Date(locationData.timestamp);
            const now = new Date();
            const diffMinutes = (now.getTime() - locationTime.getTime()) / 1000 / 60;
            
            console.log(`⏰ Ubicación de ${locationData.username}: ${diffMinutes.toFixed(2)} minutos de antigüedad`);
            
            // Solo incluir ubicaciones recientes (últimos 5 minutos)
            if (diffMinutes < 5) {
              locations.push({
                deviceId: locationData.deviceId,
                username: locationData.username,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timestamp: locationData.timestamp,
                accuracy: locationData.accuracy || 0,
                altitude: locationData.altitude,
                speed: locationData.speed,
                heading: locationData.heading
              });
              console.log(`✅ Ubicación agregada: ${locationData.username}`);
            } else {
              console.log(`❌ Ubicación descartada (muy antigua): ${locationData.username}`);
            }
          } else {
            console.log(`⚠️ Datos incompletos en documento ${doc.id}:`, {
              hasLatitude: !!locationData.latitude,
              hasLongitude: !!locationData.longitude,
              hasUsername: !!locationData.username
            });
          }
        });

        console.log(`📍 Total ubicaciones válidas encontradas: ${locations.length}`);

        // Agrupar por usuario (tomar la ubicación más reciente de cada usuario)
        const latestByUser = new Map<string, LiveLocationData>();
        locations.forEach(loc => {
          const existing = latestByUser.get(loc.username);
          if (!existing || new Date(loc.timestamp) > new Date(existing.timestamp)) {
            latestByUser.set(loc.username, loc);
          }
        });

        console.log(`👥 Usuarios únicos con ubicación: ${latestByUser.size}`);
        callback(Array.from(latestByUser.values()));
      }, (error) => {
        console.error('❌ Error en suscripción a Firestore:', error);
      });

      // Retornar función para desuscribirse
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error al crear suscripción:', error);
      return () => {}; // Retornar función vacía si falla
    }
  }

  /**
   * Suscribirse a las actualizaciones de ubicación de todos los usuarios en tiempo real
   * NOTA: Este método está deprecado, usa subscribeToLiveLocations() en su lugar
   */
  subscribeToAllUserLocations(callback: (locations: UserLocationData[]) => void): () => void {
    console.warn('⚠️ subscribeToAllUserLocations está deprecado, usa subscribeToLiveLocations');
    // Redirigir al nuevo método
    return this.subscribeToLiveLocations((liveLocations) => {
      const userLocations: UserLocationData[] = liveLocations.map(loc => ({
        username: loc.username,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        lastUpdate: loc.timestamp,
        timestamp: loc.timestamp
      }));
      callback(userLocations);
    });
  }

  /**
   * Obtener la ubicación actual de un usuario específico (una sola vez)
   */
  async getUserLocation(username: string): Promise<UserLocationData | null> {
    try {
      const locationsRef = collection(db, 'live_locations');
      const q = query(locationsRef, where('username', '==', username));
      
      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          unsubscribe(); // Desuscribirse inmediatamente
          
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            resolve({
              username,
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy || 0,
              speed: data.speed,
              heading: data.heading,
              lastUpdate: data.timestamp,
              timestamp: data.timestamp
            });
          } else {
            resolve(null);
          }
        }, (error) => {
          console.error('Error obteniendo ubicación de usuario:', error);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Error en getUserLocation:', error);
      return null;
    }
  }

  /**
   * Verificar si un usuario tiene ubicación activa
   */
  async hasActiveLocation(username: string): Promise<boolean> {
    const location = await this.getUserLocation(username);
    
    if (!location) return false;

    // Verificar si la ubicación fue actualizada en los últimos 5 minutos
    const lastUpdate = new Date(location.lastUpdate);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;
    
    return diffMinutes < 5;
  }
}

// Exportar instancia única (singleton)
export const userLocationService = new UserLocationService();
export default userLocationService;

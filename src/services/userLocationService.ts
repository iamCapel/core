import { getDatabase, ref, onValue, off } from 'firebase/database';

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

class UserLocationService {
  private listeners: Map<string, (locations: UserLocationData[]) => void> = new Map();

  /**
   * Suscribirse a las actualizaciones de ubicación de todos los usuarios en tiempo real
   */
  subscribeToAllUserLocations(callback: (locations: UserLocationData[]) => void): () => void {
    const db = getDatabase();
    const locationsRef = ref(db, 'userLocations');

    const listener = onValue(locationsRef, (snapshot) => {
      const locations: UserLocationData[] = [];
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        Object.keys(data).forEach((username) => {
          const locationData = data[username];
          
          if (locationData.latitude && locationData.longitude) {
            locations.push({
              username,
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy || 0,
              speed: locationData.speed,
              heading: locationData.heading,
              lastUpdate: locationData.lastUpdate,
              timestamp: locationData.timestamp
            });
          }
        });
      }
      
      callback(locations);
    });

    // Retornar función para desuscribirse
    return () => {
      off(locationsRef, 'value', listener);
    };
  }

  /**
   * Obtener la ubicación actual de un usuario específico (una sola vez)
   */
  async getUserLocation(username: string): Promise<UserLocationData | null> {
    return new Promise((resolve) => {
      const db = getDatabase();
      const userLocationRef = ref(db, `userLocations/${username}`);

      onValue(userLocationRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          resolve({
            username,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy || 0,
            speed: data.speed,
            heading: data.heading,
            lastUpdate: data.lastUpdate,
            timestamp: data.timestamp
          });
        } else {
          resolve(null);
        }
      }, {
        onlyOnce: true
      });
    });
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

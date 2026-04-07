import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

/**
 * Servicio para rastrear la presencia de usuarios en tiempo real
 * Detecta si un usuario está conectado desde la aplicación web
 */
class UserPresenceService {
  private currentUser: string | null = null;

  /**
   * Iniciar el rastreo de presencia para el usuario actual
   */
  startPresenceTracking(username: string): void {
    if (!username || !realtimeDb) {
      console.warn('❌ No se puede iniciar presencia: usuario o database no disponible');
      return;
    }

    this.currentUser = username;
    const userStatusRef = ref(realtimeDb, `presence/${username}`);

    // Marcar como online
    set(userStatusRef, {
      state: 'online-web',
      platform: 'web',
      lastChanged: new Date().toISOString()
    });

    // Configurar que se marque como offline al desconectarse
    onDisconnect(userStatusRef).set({
      state: 'offline',
      platform: 'web',
      lastChanged: new Date().toISOString()
    });

    console.log('✅ Presencia iniciada para:', username);
  }

  /**
   * Detener el rastreo de presencia
   */
  stopPresenceTracking(): void {
    if (!this.currentUser || !realtimeDb) return;

    const userStatusRef = ref(realtimeDb, `presence/${this.currentUser}`);
    set(userStatusRef, {
      state: 'offline',
      platform: 'web',
      lastChanged: new Date().toISOString()
    });

    this.currentUser = null;
  }

  /**
   * Suscribirse al estado de presencia de un usuario específico
   */
  subscribeToUserPresence(
    username: string, 
    callback: (isOnlineWeb: boolean, lastChanged?: string) => void
  ): () => void {
    if (!username || !realtimeDb) {
      callback(false);
      return () => {};
    }

    const userStatusRef = ref(realtimeDb, `presence/${username}`);
    
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const isOnline = data.state === 'online-web';
        callback(isOnline, data.lastChanged);
      } else {
        callback(false);
      }
    });

    return unsubscribe;
  }
}

const userPresenceService = new UserPresenceService();
export default userPresenceService;

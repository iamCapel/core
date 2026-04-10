import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  deleteDoc,
  Timestamp,
  setDoc,
  getDoc,
  limit,
  limitToLast,
  updateDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'image';
  imageUrl?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: Timestamp;
  createdAt: Timestamp;
  unreadCounts?: Record<string, number>;
}

class ChatService {
  private chatsCollection = 'chats';
  private messagesSubcollection = 'messages';

  /**
   * Genera un ID único para el chat basado en los participantes
   * Siempre en orden alfabético para consistencia
   */
  private getChatId(user1: string, user2: string): string {
    const sorted = [user1, user2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Obtiene o crea un chat entre dos usuarios.
   * Busca primero cualquier chat existente entre ambos (independientemente del formato de ID)
   * para evitar duplicados causados por móvil (UIDs) vs web (usernames).
   */
  async getOrCreateChat(currentUser: string, otherUser: string): Promise<string> {
    // 1. Ruta rápida: ID determinístico por usernames
    const chatId = this.getChatId(currentUser, otherUser);
    const chatRef = doc(db, this.chatsCollection, chatId);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) return chatId;

    // 2. Buscar cualquier chat existente entre estos dos participantes (cualquier formato)
    const chatsRef = collection(db, this.chatsCollection);
    const q = query(chatsRef, where('participants', 'array-contains', currentUser));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const parts: string[] = d.data().participants || [];
      if (parts.includes(otherUser)) return d.id;
    }

    // 3. No existe: crear nuevo con ID determinístico por usernames
    await setDoc(chatRef, {
      participants: [currentUser, otherUser],
      lastMessage: '',
      lastMessageTime: Timestamp.now(),
      createdAt: Timestamp.now()
    });
    return chatId;
  }

  /**
   * Envía un mensaje de texto
   */
  async sendMessage(chatId: string, senderId: string, text: string): Promise<void> {
    const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
    
    await addDoc(messagesRef, {
      senderId,
      text,
      timestamp: Timestamp.now(),
      type: 'text'
    });

    // Obtener participantes para incrementar contador del destinatario
    const chatRef = doc(db, this.chatsCollection, chatId);
    const chatSnap = await getDoc(chatRef);
    const participants: string[] = chatSnap.exists() ? chatSnap.data().participants : [];
    const recipient = participants.find(p => p !== senderId);

    // Actualizar último mensaje e incrementar no leídos del destinatario
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: { [key: string]: any } = {
      lastMessage: text,
      lastMessageTime: Timestamp.now()
    };
    if (recipient) updateData[`unreadCounts.${recipient}`] = increment(1);
    await updateDoc(chatRef, updateData);
  }

  /**
   * Sube una imagen y envía un mensaje con la imagen
   */
  async sendImageMessage(chatId: string, senderId: string, imageFile: File): Promise<void> {
    try {
      // Subir imagen a Firebase Storage
      const timestamp = Date.now();
      const fileName = `chats/${chatId}/${timestamp}_${imageFile.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Crear mensaje con imagen
      const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
      
      await addDoc(messagesRef, {
        senderId,
        text: '📷 Imagen',
        timestamp: Timestamp.now(),
        type: 'image',
        imageUrl
      });

      // Obtener participantes para incrementar contador del destinatario
      const chatRef = doc(db, this.chatsCollection, chatId);
      const chatSnap = await getDoc(chatRef);
      const participants: string[] = chatSnap.exists() ? chatSnap.data().participants : [];
      const recipient = participants.find(p => p !== senderId);

      // Actualizar último mensaje e incrementar no leídos del destinatario
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: { [key: string]: any } = {
        lastMessage: '📷 Imagen',
        lastMessageTime: Timestamp.now()
      };
      if (recipient) updateData[`unreadCounts.${recipient}`] = increment(1);
      await updateDoc(chatRef, updateData);
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }
  }

  /**
   * Suscribe a los mensajes de un chat en tiempo real
   */
  subscribeToMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
    // limitToLast(100) garantiza que siempre recibimos los mensajes MÁS RECIENTES
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(100));

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentUnsub: (() => void) | null = null;

    const subscribe = (): (() => void) => {
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null; }
          const messages: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
          });
          callback(messages);
        },
        (error) => {
          console.error('[ChatService] onSnapshot error, reintentando en 3s:', error);
          unsub();
          retryTimeout = setTimeout(() => {
            currentUnsub = subscribe();
          }, 3000);
        }
      );
      return unsub;
    };

    currentUnsub = subscribe();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (currentUnsub) currentUnsub();
    };
  }

  /**
   * Limpia mensajes antiguos (más de 7 días)
   * Esta función debería ejecutarse periódicamente
   */
  async cleanOldMessages(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffTimestamp = Timestamp.fromDate(sevenDaysAgo);

      // Obtener todos los chats
      const chatsRef = collection(db, this.chatsCollection);
      const chatsSnapshot = await getDocs(chatsRef);

      let deletedCount = 0;

      // Recorrer cada chat
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
        
        // Buscar mensajes antiguos
        const oldMessagesQuery = query(
          messagesRef,
          where('timestamp', '<', cutoffTimestamp)
        );
        
        const oldMessagesSnapshot = await getDocs(oldMessagesQuery);
        
        // Eliminar cada mensaje antiguo
        for (const messageDoc of oldMessagesSnapshot.docs) {
          await deleteDoc(messageDoc.ref);
          deletedCount++;
        }
      }

      console.log(`Limpieza completada: ${deletedCount} mensajes eliminados`);
    } catch (error) {
      console.error('Error al limpiar mensajes antiguos:', error);
    }
  }

  /**
   * Elimina un chat completo y todos sus mensajes
   */
  async deleteChat(chatId: string): Promise<void> {
    try {
      // Eliminar todos los mensajes
      const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
      const messagesSnapshot = await getDocs(messagesRef);
      
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(messageDoc.ref);
      }

      // Eliminar el chat
      const chatRef = doc(db, this.chatsCollection, chatId);
      await deleteDoc(chatRef);
    } catch (error) {
      console.error('Error al eliminar chat:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de un chat
   */
  async getChatHistory(chatId: string): Promise<ChatMessage[]> {
    const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
    
    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      } as ChatMessage);
    });
    
    return messages;
  }

  /**
   * Obtiene todos los chats de un usuario
   */
  async getUserChats(username: string): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, this.chatsCollection);
      const q = query(
        chatsRef,
        where('participants', 'array-contains', username),
        orderBy('lastMessageTime', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const chats: Chat[] = [];
      
      snapshot.forEach((doc) => {
        chats.push({
          id: doc.id,
          ...doc.data()
        } as Chat);
      });
      
      return chats;
    } catch (error) {
      console.error('Error al obtener chats del usuario:', error);
      return [];
    }
  }

  /**
   * Suscribe a los chats de un usuario en tiempo real
   */
  subscribeToUserChats(
    username: string,
    callback: (chats: Chat[]) => void
  ): () => void {
    const chatsRef = collection(db, this.chatsCollection);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', username),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((doc) => {
        chats.push({
          id: doc.id,
          ...doc.data()
        } as Chat);
      });
      callback(chats);
    });

    return unsubscribe;
  }

  /**
   * Suscribe al total de mensajes no leídos de un usuario
   */
  subscribeToTotalUnread(
    username: string,
    callback: (total: number) => void
  ): () => void {
    const chatsRef = collection(db, this.chatsCollection);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', username)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        total += data.unreadCounts?.[username] ?? 0;
      });
      callback(total);
    });

    return unsubscribe;
  }

  /**
   * Marca todos los mensajes de un chat como leídos para el usuario
   */
  async markChatAsRead(chatId: string, username: string): Promise<void> {
    try {
      const chatRef = doc(db, this.chatsCollection, chatId);
      await updateDoc(chatRef, {
        [`unreadCounts.${username}`]: 0
      });
    } catch (error) {
      console.error('Error al marcar chat como leído:', error);
    }
  }
}

export const chatService = new ChatService();

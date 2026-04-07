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
  updateDoc
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
   * Obtiene o crea un chat entre dos usuarios
   */
  async getOrCreateChat(currentUser: string, otherUser: string): Promise<string> {
    const chatId = this.getChatId(currentUser, otherUser);
    const chatRef = doc(db, this.chatsCollection, chatId);
    
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      // Crear nuevo chat
      await setDoc(chatRef, {
        participants: [currentUser, otherUser],
        lastMessage: '',
        lastMessageTime: Timestamp.now(),
        createdAt: Timestamp.now()
      });
    }
    
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

    // Actualizar último mensaje del chat
    const chatRef = doc(db, this.chatsCollection, chatId);
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageTime: Timestamp.now()
    });
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

      // Actualizar último mensaje del chat
      const chatRef = doc(db, this.chatsCollection, chatId);
      await updateDoc(chatRef, {
        lastMessage: '📷 Imagen',
        lastMessageTime: Timestamp.now()
      });
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
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as ChatMessage);
      });
      callback(messages);
    });

    return unsubscribe;
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
}

export const chatService = new ChatService();

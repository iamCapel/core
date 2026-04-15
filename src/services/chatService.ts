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
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import { getUserByUsername, getUserById } from './firebaseUserStorage';

// Interfaces que coinciden EXACTAMENTE con firebaseChatService.ts del core-apk
export interface ChatMessage {
  id: string;
  senderId: string;      // Firebase UID
  senderName: string;    // Nombre para mostrar
  text: string;
  timestamp: Timestamp | null;
  type: 'text' | 'image';
  imageUrl?: string;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];                      // Firebase UIDs
  participantNames: Record<string, string>;    // { uid: displayName }
  participantAvatars: Record<string, string>;  // { uid: avatarUrl }
  lastMessage: string;
  lastMessageTime: Timestamp | null;
  lastMessageSenderId: string;
  unreadCount: Record<string, number>;         // { uid: count } â€” igual que el APK
  createdAt: Timestamp | null;
}

class ChatService {
  private chatsCollection = 'chats';
  private messagesSubcollection = 'messages';

  private toMillis(ts: unknown): number {
    try {
      if (!ts) return 0;
      if (typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof (ts as any).toMillis === 'function') {
        return (ts as any).toMillis();
      }
      if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as any).toDate === 'function') {
        return (ts as any).toDate().getTime();
      }
      if (typeof ts === 'string' || typeof ts === 'number') {
        const ms = new Date(ts as any).getTime();
        return Number.isNaN(ms) ? 0 : ms;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  // Normaliza mensajes legacy/web/APK a una sola interfaz para la UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeMessage(id: string, data: any): ChatMessage {
    const normalizedType: 'text' | 'image' = data?.type === 'image' ? 'image' : 'text';
    return {
      id,
      senderId: data?.senderId || data?.senderUid || data?.senderUID || '',
      senderName: data?.senderName || data?.sender || data?.username || '',
      text: data?.text || data?.message || '',
      timestamp: data?.timestamp ?? data?.serverTimestamp ?? data?.createdAt ?? null,
      type: normalizedType,
      imageUrl: data?.imageUrl,
      read: typeof data?.read === 'boolean' ? data.read : false,
    };
  }

  /**
   * Devuelve el UID del usuario actual.
   * Primero desde Firebase Auth (disponible tras login), luego desde localStorage
   * como fallback para cuando Firebase Auth aún no ha restaurado la sesión (page reload).
   */
  getEffectiveUid(): string | null {
    const fromAuth = auth.currentUser?.uid;
    if (fromAuth) {
      console.log('[chatService] UID desde Firebase Auth:', fromAuth);
      return fromAuth;
    }
    
    try {
      const raw = localStorage.getItem('mopc_user');
      if (raw) {
        const u = JSON.parse(raw);
        const uid = u.uid || u.id || null;
        console.log('[chatService] UID desde localStorage:', { 
          raw: raw.substring(0, 100), 
          uid, 
          hasUid: !!u.uid, 
          hasId: !!u.id,
          username: u.username 
        });
        return uid;
      }
    } catch (e) { 
      console.error('[chatService] Error leyendo localStorage:', e);
    }
    
    console.warn('[chatService] No se pudo obtener UID del usuario actual');
    return null;
  }

  /**
   * Devuelve el nombre de display del usuario actual desde localStorage.
   */
  getCurrentUserName(): string {
    try {
      const raw = localStorage.getItem('mopc_user');
      if (raw) {
        const u = JSON.parse(raw);
        return u.name || u.username || '';
      }
    } catch { /* ignore */ }
    return '';
  }

  private getChatId(id1: string, id2: string): string {
    // IMPORTANTE: Usar usernames (no UIDs) para compatibilidad con app móvil
    return [id1, id2].sort().join('_');
  }

  /**
   * Busca TODOS los chats donde un usuario participa.
   * Busca tanto por UID (Firebase) como por username (app móvil).
   */
  private async findExistingChat(identifier1: string, identifier2: string): Promise<string | null> {
    try {
      // Buscar por participants array
      const chatsRef = collection(db, this.chatsCollection);
      const q = query(chatsRef, where('participants', 'array-contains', identifier1));
      const snapshot = await getDocs(q);
      
      for (const chatDoc of snapshot.docs) {
        const chat = chatDoc.data();
        const participants = chat.participants || [];
        
        if (participants.includes(identifier2)) {
          console.log('[chatService] ✅ Chat encontrado:', chatDoc.id, 'participants:', participants);
          return chatDoc.id;
        }
      }
      
      console.log('[chatService] ❌ No se encontró chat entre', identifier1, 'y', identifier2);
      return null;
    } catch (error) {
      console.error('[chatService] Error buscando chat:', error);
      return null;
    }
  }

  /**
   * Obtiene o crea un chat entre dos usuarios.
   * USA USERNAMES para el chatId (igual que la app móvil).
   */
  async getOrCreateChat(
    currentUserId: string,
    currentUserName: string,
    otherUserId: string,
    otherUserName: string,
    currentUserAvatar = '',
    otherUserAvatar = ''
  ): Promise<string> {
    // Obtener usernames desde firebaseUserStorage
    let currentUsername = currentUserName;
    let otherUsername = otherUserName;
    let resolvedCurrentUid = currentUserId;
    let resolvedOtherUid = otherUserId;
    
    try {
      // Resolver usuario actual - puede ser UID o username
      let currentUser;
      if (currentUserId && currentUserId.length > 20) {
        // Parece un UID de Firebase (largo)
        currentUser = await getUserById(currentUserId);
      } else {
        // Parece un username
        currentUser = await getUserByUsername(currentUserId);
        if (currentUser) resolvedCurrentUid = currentUser.id;
      }
      
      // Resolver otro usuario - puede ser UID o username
      let otherUser;
      if (otherUserId && otherUserId.length > 20) {
        // Parece un UID de Firebase (largo)
        otherUser = await getUserById(otherUserId);
      } else {
        // Parece un username
        otherUser = await getUserByUsername(otherUserId);
        if (otherUser) resolvedOtherUid = otherUser.id;
      }
      
      if (currentUser?.username) currentUsername = currentUser.username;
      if (otherUser?.username) otherUsername = otherUser.username;
      
      console.log('[chatService] 🔍 Usuarios resueltos:', {
        currentInput: currentUserId,
        currentUsername,
        currentUid: resolvedCurrentUid,
        otherInput: otherUserId,
        otherUsername,
        otherUid: resolvedOtherUid
      });
    } catch (e) {
      console.warn('[chatService] No se pudieron obtener usernames, usando names:', e);
    }

    console.log('[chatService] 🔍 Buscando chat entre USERNAMES:', {
      currentUsername,
      otherUsername
    });

    // PASO 1: Buscar chat existente (por username O por UID)
    let existingChatId = await this.findExistingChat(currentUsername, otherUsername);
    if (!existingChatId) {
      existingChatId = await this.findExistingChat(resolvedCurrentUid, resolvedOtherUid);
    }
    
    if (existingChatId) {
      console.log('[chatService] ✅ Usando chat existente:', existingChatId);
      return existingChatId;
    }

    // PASO 2: Crear chat nuevo con USERNAMES (igual que app móvil)
    const newChatId = this.getChatId(currentUsername, otherUsername);
    console.log('[chatService] 🆕 Creando chat con USERNAMES:', newChatId);
    const newChatRef = doc(db, this.chatsCollection, newChatId);
    
    await setDoc(newChatRef, {
      // CRÍTICO: usar USERNAMES en participants (igual que app móvil)
      participants: [currentUsername, otherUsername],
      participantNames: {
        [currentUsername]: currentUserName,
        [otherUsername]: otherUserName,
      },
      participantAvatars: {
        [currentUsername]: currentUserAvatar,
        [otherUsername]: otherUserAvatar,
      },
      lastMessage: '',
      lastMessageTime: null,
      lastMessageSenderId: currentUsername,
      unreadCount: {
        [currentUsername]: 0,
        [otherUsername]: 0,
      },
      createdAt: serverTimestamp(),
    });

    return newChatId;
  }

  /**
   * Envía un mensaje de texto.
   * ADAPTADO para app móvil: usa USERNAMES en lugar de UIDs.
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    otherUserId: string
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Obtener usernames (la app móvil usa usernames, no UIDs)
    let senderUsername = senderName;
    let otherUsername = otherUserId;
    let resolvedSenderUid = senderId;
    let resolvedOtherUid = otherUserId;
    
    try {
      // Resolver sender - puede ser UID o username
      let senderUser;
      if (senderId && senderId.length > 20) {
        senderUser = await getUserById(senderId);
      } else {
        senderUser = await getUserByUsername(senderId);
        if (senderUser) resolvedSenderUid = senderUser.id;
      }
      
      // Resolver other - puede ser UID o username
      let otherUser;
      if (otherUserId && otherUserId.length > 20) {
        otherUser = await getUserById(otherUserId);
      } else {
        otherUser = await getUserByUsername(otherUserId);
        if (otherUser) resolvedOtherUid = otherUser.id;
      }
      
      if (senderUser?.username) senderUsername = senderUser.username;
      if (otherUser?.username) otherUsername = otherUser.username;
    } catch (e) {
      console.warn('[chatService] No se pudieron obtener usernames, usando valores originales');
    }

    console.log('[chatService] sendMessage:', {
      chatId,
      senderId,
      senderUsername,
      otherUserId,
      otherUsername,
      text: trimmed
    });

    const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
    const messageData = {
      // Campos principales (compatible con app móvil)
      senderId: senderUsername,     // Username, NO UID
      senderName,
      text: trimmed,
      timestamp: serverTimestamp(),
      type: 'text',
      read: false,
      // Campos de compatibilidad adicionales
      serverTimestamp: serverTimestamp(),
      message: trimmed,
      sender: senderName,
      senderUid: resolvedSenderUid, // UID real como backup
      username: senderUsername,
    };
    
    console.log('[chatService] Guardando mensaje:', messageData);
    await addDoc(messagesRef, messageData);

    const chatRef = doc(db, this.chatsCollection, chatId);
    await updateDoc(chatRef, {
      lastMessage: trimmed,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: senderUsername,  // Username, NO UID
      [`unreadCount.${otherUsername}`]: increment(1),  // Username, NO UID
    });
  }

  /**
   * Sube una imagen y envía un mensaje con ella.
   */
    async sendImageMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    imageFile: File,
    otherUserId: string
  ): Promise<void> {
    try {
      let senderUsername = senderName;
      let otherUsername = otherUserId;
      let resolvedSenderUid = senderId;
      let resolvedOtherUid = otherUserId;
      
      try {
        // Resolver sender - puede ser UID o username
        let senderUser;
        if (senderId && senderId.length > 20) {
          senderUser = await getUserById(senderId);
        } else {
          senderUser = await getUserByUsername(senderId);
          if (senderUser) resolvedSenderUid = senderUser.id;
        }
        
        // Resolver other - puede ser UID o username
        let otherUser;
        if (otherUserId && otherUserId.length > 20) {
          otherUser = await getUserById(otherUserId);
        } else {
          otherUser = await getUserByUsername(otherUserId);
          if (otherUser) resolvedOtherUid = otherUser.id;
        }
        
        if (senderUser?.username) senderUsername = senderUser.username;
        if (otherUser?.username) otherUsername = otherUser.username;
      } catch (e) {}

      const timestamp = Date.now();
      const fileName = `chats/${chatId}/${timestamp}_${imageFile.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
      await addDoc(messagesRef, {
        senderId: senderUsername,
        senderName,
        text: '📷 Imagen',
        timestamp: serverTimestamp(),
        type: 'image',
        imageUrl,
        read: false,
        serverTimestamp: serverTimestamp(),
        message: '📷 Imagen',
        sender: senderName,
        senderUid: resolvedSenderUid,
        username: senderUsername,
      });

      const chatRef = doc(db, this.chatsCollection, chatId);
      await updateDoc(chatRef, {
        lastMessage: '📷 Imagen',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderUsername,
        [`unreadCount.${otherUsername}`]: increment(1),
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }
  }

  /**
   * Suscribe a los mensajes de un chat en tiempo real.
   * (Igual que el APK)
   */
  subscribeToMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    console.log('[chatService] 🔔 Suscribiendo a mensajes del chat:', chatId);
    const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);

    return onSnapshot(messagesRef, (snapshot) => {
      console.log('[chatService] 📨 onSnapshot disparado - Total mensajes:', snapshot.docs.length);
      const messages: ChatMessage[] = snapshot.docs
        .map(d => {
          const normalized = this.normalizeMessage(d.id, d.data());
          console.log('[chatService] Mensaje normalizado:', {
            id: normalized.id,
            senderId: normalized.senderId,
            text: normalized.text.substring(0, 50),
            timestamp: normalized.timestamp
          });
          return normalized;
        })
        .sort((a, b) => this.toMillis(a.timestamp) - this.toMillis(b.timestamp));
      console.log('[chatService] ✅ Enviando', messages.length, 'mensajes al callback');
      callback(messages);
    }, (error) => {
      console.error('[chatService] ❌ Error suscribiendo mensajes:', error);
      callback([]);
    });
  }

  subscribeToChat(
    chatId: string,
    callback: (chat: Chat | null) => void
  ): () => void {
    const chatRef = doc(db, this.chatsCollection, chatId);
    return onSnapshot(chatRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...(snap.data() as Omit<Chat, 'id'>) });
    }, (error) => {
      console.error('Error suscribiendo chat:', error);
      callback(null);
    });
  }

  /**
   * Suscribe a todos los chats de un usuario en tiempo real.
   * Busca por UID Y username para máxima compatibilidad.
   */
  subscribeToUserChats(
    userIdentifier: string,
    callback: (chats: Chat[]) => void
  ): () => void {
    const uid = this.getEffectiveUid();
    const chatsRef = collection(db, this.chatsCollection);

    const allChats = new Map<string, Chat>();

    const notify = () => {
      const sorted = Array.from(allChats.values()).sort(
        (a, b) => (b.lastMessageTime?.toMillis?.() ?? 0) - (a.lastMessageTime?.toMillis?.() ?? 0)
      );
      callback(sorted);
    };

    // Obtener username del usuario actual de forma síncrona
    let currentUsername = userIdentifier;
    try {
      const raw = localStorage.getItem('mopc_user');
      if (raw) {
        const u = JSON.parse(raw);
        currentUsername = u.username || u.name || userIdentifier;
      }
    } catch (e) {}

    console.log('[chatService] subscribeToUserChats buscando:', {
      uid,
      currentUsername,
      userIdentifier
    });

    // Query por UID
    const q1 = query(chatsRef, where('participants', 'array-contains', uid || userIdentifier));
    const unsub1 = onSnapshot(q1, (snap) => {
      snap.forEach(d => allChats.set(d.id, { id: d.id, ...(d.data() as Omit<Chat, 'id'>) }));
      notify();
    }, (error) => {
      console.error('[chatService] Error subscribeToUserChats (query principal):', error);
    });

    // Query por username (si existe y no es el mismo identificador ya consultado)
    let unsub2: (() => void) | null = null;
    const primaryIdentifier = uid || userIdentifier;
    if (currentUsername && currentUsername !== primaryIdentifier) {
      const q2 = query(chatsRef, where('participants', 'array-contains', currentUsername));
      unsub2 = onSnapshot(q2, (snap) => {
        snap.forEach(d => allChats.set(d.id, { id: d.id, ...(d.data() as Omit<Chat, 'id'>) }));
        notify();
      }, (error) => {
        console.error('[chatService] Error subscribeToUserChats (query username):', error);
      });
    }

    return () => {
      unsub1();
      unsub2?.();
    };
  }

  /**
   * Suscribe al total de mensajes no leÃ­dos de un usuario.
   * Lee de `unreadCount` (igual que el APK, sin 's').
   */
  subscribeToTotalUnread(
    userIdentifier: string,
    callback: (total: number) => void
  ): () => void {
    const uid = this.getEffectiveUid();
    const effectiveId = uid || userIdentifier;
    const chatsRef = collection(db, this.chatsCollection);

    const chatData = new Map<string, any>();

    const computeTotal = () => {
      let total = 0;
      chatData.forEach(data => {
        // Leer tanto unreadCount (APK) como unreadCounts (legacy web) para transiciÃ³n
        const byUid  = uid ? (data.unreadCount?.[uid] ?? data.unreadCounts?.[uid] ?? 0)   : 0;
        const byUser = data.unreadCount?.[userIdentifier] ?? data.unreadCounts?.[userIdentifier] ?? 0;
        total += Math.max(byUid, byUser);
      });
      callback(total);
    };

    const q1 = query(chatsRef, where('participants', 'array-contains', effectiveId));
    const unsub1 = onSnapshot(q1, (snap) => {
      snap.forEach(d => chatData.set(d.id, d.data()));
      computeTotal();
    });

    let unsub2: (() => void) | null = null;
    if (uid && uid !== userIdentifier) {
      const q2 = query(chatsRef, where('participants', 'array-contains', userIdentifier));
      unsub2 = onSnapshot(q2, (snap) => {
        snap.forEach(d => chatData.set(d.id, d.data()));
        computeTotal();
      });
    }

    return () => {
      unsub1();
      unsub2?.();
    };
  }

  /**
   * Marca todos los mensajes de un chat como leÃ­dos para un usuario.
   * Limpia tanto unreadCount (APK) como unreadCounts (legacy web).
   */
  async markChatAsRead(chatId: string, userIdentifier: string): Promise<void> {
    try {
      const uid = this.getEffectiveUid();
      const chatRef = doc(db, this.chatsCollection, chatId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        [`unreadCount.${userIdentifier}`]: 0,
        [`unreadCounts.${userIdentifier}`]: 0,
      };
      if (uid && uid !== userIdentifier) {
        updates[`unreadCount.${uid}`] = 0;
        updates[`unreadCounts.${uid}`] = 0;
      }
      await updateDoc(chatRef, updates);
    } catch (error) {
      console.error('Error al marcar chat como leÃ­do:', error);
    }
  }

  /**
   * Limpia mensajes antiguos (mÃ¡s de 7 dÃ­as)
   */
  async cleanOldMessages(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffTimestamp = Timestamp.fromDate(sevenDaysAgo);

      const chatsRef = collection(db, this.chatsCollection);
      const chatsSnapshot = await getDocs(chatsRef);
      let deletedCount = 0;

      for (const chatDoc of chatsSnapshot.docs) {
        const messagesRef = collection(db, this.chatsCollection, chatDoc.id, this.messagesSubcollection);
        const messagesSnapshot = await getDocs(messagesRef);
        for (const messageDoc of messagesSnapshot.docs) {
          const data = messageDoc.data();
          const rawTs = data.timestamp ?? data.serverTimestamp ?? data.createdAt ?? null;
          const tsMs = this.toMillis(rawTs);
          if (tsMs > 0 && tsMs < cutoffTimestamp.toMillis()) {
            await deleteDoc(messageDoc.ref);
            deletedCount++;
          }
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
      const messagesRef = collection(db, this.chatsCollection, chatId, this.messagesSubcollection);
      const messagesSnapshot = await getDocs(messagesRef);
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(messageDoc.ref);
      }
      await deleteDoc(doc(db, this.chatsCollection, chatId));
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
    const snapshot = await getDocs(messagesRef);
    const normalized = snapshot.docs
      .map(d => this.normalizeMessage(d.id, d.data()))
      .sort((a, b) => this.toMillis(a.timestamp) - this.toMillis(b.timestamp));
    return normalized.slice(-100);
  }

  /**
   * Resuelve el UID de un usuario dado su username.
   * Si targetIdentifier ya es un UID, lo devuelve directamente.
   */
  async resolveUserUid(targetIdentifier: string): Promise<{ uid: string; name: string } | null> {
    try {
      // Intentar buscar por username
      const byUsername = await getUserByUsername(targetIdentifier);
      if (byUsername?.id) {
        return { uid: byUsername.id, name: byUsername.name || byUsername.username };
      }
      // Puede que ya sea un UID directamente
      const byId = await getUserById(targetIdentifier);
      if (byId) {
        return { uid: targetIdentifier, name: byId.name || byId.username };
      }
    } catch { /* ignorar */ }
    return null;
  }
}

export const chatService = new ChatService();


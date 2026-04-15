import React, { useState, useEffect, useRef } from 'react';
import './ChatModal.css';
import { chatService, ChatMessage } from '../services/chatService';
import { Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;          // nombre para mostrar en el header
  targetUsername?: string;   // username o UID del otro usuario para resolver en Firestore
  targetUid?: string;        // UID ya resuelto del otro usuario (cuando viene de ChatList)
  currentUser?: string;
  initialChatId?: string;
  userAvatar?: string;
  isOnline?: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  userName,
  targetUsername,
  targetUid,
  currentUser,
  initialChatId,
  userAvatar,
  isOnline = true
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>(currentUser || '');

  // IDs efectivos para interactuar con Firestore (UIDs)
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string>('');
  const [currentUsernameReal, setCurrentUsernameReal] = useState<string>(''); // Username real desde firebaseUserStorage
  const [otherUid, setOtherUid] = useState<string | null>(targetUid || null);
  const [otherName, setOtherName] = useState<string>(userName);
  const [otherUsernameReal, setOtherUsernameReal] = useState<string>(''); // Username real desde firebaseUserStorage
  const [chatHeader, setChatHeader] = useState<{ lastMessage: string; lastMessageSenderId: string; lastMessageTime: any } | null>(null);
  
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 12000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('SEND_TIMEOUT')), timeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  // Obtener usuario actual y su UID desde auth/localStorage
  useEffect(() => {
    const uid = chatService.getEffectiveUid();
    const name = chatService.getCurrentUserName();
    setCurrentUid(uid);
    setCurrentName(name);

    if (currentUser) {
      setCurrentUsername(currentUser);
    } else {
      try {
        const raw = localStorage.getItem('mopc_user');
        if (raw) {
          const u = JSON.parse(raw);
          setCurrentUsername(u.username || u.name || '');
        }
      } catch { /* ignore */ }
    }

    // Obtener username real del usuario actual
    if (uid) {
      import('../services/firebaseUserStorage').then(({ getUserById }) => {
        getUserById(uid).then(user => {
          if (user?.username) {
            console.log('[ChatModal] Username actual resuelto:', user.username);
            setCurrentUsernameReal(user.username);
          }
        }).catch(e => console.error('[ChatModal] Error obteniendo username actual:', e));
      });
    }
  }, [currentUser]);

  // Resolver UID del otro usuario si no fue pasado directamente
  useEffect(() => {
    // Si tenemos targetUsername, ese YA es el username real
    if (targetUsername) {
      console.log('[ChatModal] 🎯 Usando targetUsername como username real:', targetUsername);
      setOtherUsernameReal(targetUsername);
    }
    
    if (targetUid) {
      setOtherUid(targetUid);
      setOtherName(userName);
      // Resolver username del otro usuario desde UID
      import('../services/firebaseUserStorage').then(({ getUserById }) => {
        getUserById(targetUid).then(user => {
          if (user?.username) {
            console.log('[ChatModal] Username del otro usuario resuelto desde UID:', user.username);
            setOtherUsernameReal(user.username);
          }
        }).catch(e => console.error('[ChatModal] Error obteniendo username del otro:', e));
      });
      return;
    }
    
    const identifier = targetUsername || userName;
    if (!identifier) return;

    console.log('[ChatModal] Resolviendo UID para:', identifier);
    chatService.resolveUserUid(identifier).then(result => {
      console.log('[ChatModal] Resultado resolveUserUid:', result);
      if (result) {
        setOtherUid(result.uid);
        setOtherName(result.name || userName);
        // Obtener username real desde Firebase
        import('../services/firebaseUserStorage').then(({ getUserById }) => {
          getUserById(result.uid).then(user => {
            if (user?.username) {
              console.log('[ChatModal] Username del otro usuario resuelto:', user.username);
              setOtherUsernameReal(user.username);
            }
          }).catch(e => console.error('[ChatModal] Error obteniendo username del otro:', e));
        });
      } else {
        console.error('[ChatModal] No se pudo resolver UID para:', identifier);
      }
    });
  }, [targetUsername, targetUid, userName]);

  // Obtener o crear chat cuando se abre el modal
  useEffect(() => {
    if (initialChatId) {
      setChatId(initialChatId);
      return;
    }
    
    // Ahora permitimos crear chat con username o UID
    const hasCurrentIdentifier = currentUid || currentUsernameReal || currentUsername;
    const hasOtherIdentifier = otherUid || otherUsernameReal || targetUsername;
    
    if (!isOpen || !hasCurrentIdentifier || !hasOtherIdentifier) {
      console.log('[ChatModal] No se puede inicializar chat:', { 
        isOpen, 
        currentUid, 
        currentUsernameReal, 
        currentUsername,
        otherUid, 
        otherUsernameReal,
        targetUsername 
      });
      return;
    }

    const initChat = async () => {
      try {
        // Priorizar username real, luego UID, luego username display
        const currentIdentifier = currentUsernameReal || currentUid || currentUsername;
        const otherIdentifier = otherUsernameReal || otherUid || targetUsername || userName;
        const effectiveName = currentName || currentUsername;
        
        console.log('[ChatModal] Inicializando chat con:', { 
          currentIdentifier, 
          effectiveName, 
          otherIdentifier, 
          otherName 
        });
        
        const id = await chatService.getOrCreateChat(
          currentIdentifier,
          effectiveName,
          otherIdentifier,
          otherName
        );
        console.log('[ChatModal] Chat inicializado con ID:', id);
        setChatId(id);
      } catch (error) {
        console.error('[ChatModal] Error al inicializar chat:', error);
      }
    };
    initChat();
  }, [isOpen, currentUid, currentUsernameReal, currentUsername, otherUid, otherUsernameReal, targetUsername, currentName, otherName, userName, initialChatId]);

  const toMillis = (value: any): number => {
    try {
      if (!value) return 0;
      if (typeof value?.toMillis === 'function') return value.toMillis();
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      const n = new Date(value).getTime();
      return Number.isNaN(n) ? 0 : n;
    } catch {
      return 0;
    }
  };

  // Suscribirse a los mensajes en tiempo real.
  // IMPORTANTE: chatHeader NO está en las deps para evitar el loop de re-suscripción
  // (cada mensaje del APK actualizaba el doc del chat → setChatHeader → re-ejecutar este
  // effect → destruir y recrear ambas suscripciones → los mensajes desaparecían).
  useEffect(() => {
    if (!chatId || !isOpen) {
      console.log('[ChatModal] ⚠️ No se puede suscribir:', { chatId, isOpen });
      return;
    }

    // Usar username real para identificación
    const currentIdentifier = currentUsernameReal || currentUid || chatService.getEffectiveUid() || currentUsername;
    
    console.log('[ChatModal] 🎯 Suscribiendo a chat:', chatId, '| currentIdentifier:', currentIdentifier);
    chatService.markChatAsRead(chatId, currentIdentifier);

    const unsubscribe = chatService.subscribeToMessages(chatId, (firebaseMessages) => {
      console.log('[ChatModal] 📬 Recibidos', firebaseMessages.length, 'mensajes del servidor');
      const mapped = firebaseMessages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        isMe: (!!currentUid && msg.senderId === currentUid) || 
              msg.senderId === currentUsername ||
              msg.senderId === currentUsernameReal,
        timestamp: formatTimestamp(msg.timestamp),
        type: (msg.type === 'image' ? 'image' : 'text') as 'text' | 'image',
        imageUrl: msg.imageUrl,
      }));
      console.log('[ChatModal] ✅ Actualizando UI con', mapped.length, 'mensajes');
      setMessages(mapped);
      chatService.markChatAsRead(chatId, currentIdentifier);
    });

    console.log('[ChatModal] ✅ Suscripción creada exitosamente');
    return () => {
      console.log('[ChatModal] 🔌 Desuscribiendo del chat:', chatId);
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isOpen, currentUid, currentUsername, currentUsernameReal]);

  // Suscripción separada al encabezado del chat (solo actualiza metadatos, no un loop).
  useEffect(() => {
    if (!chatId || !isOpen) return;

    const effectiveUid = currentUid || chatService.getEffectiveUid();

    const unsubscribeHeader = chatService.subscribeToChat(chatId, (chat) => {
      if (!chat) return;
      setChatHeader({
        lastMessage: chat.lastMessage || '',
        lastMessageSenderId: chat.lastMessageSenderId || '',
        lastMessageTime: chat.lastMessageTime || null,
      });
      // Fallback: si la subcolección messages todavía no tiene el último mensaje
      // (escritura del APK aún en tránsito), añadirlo visualmente desde el header.
      if (chat.lastMessage) {
        setMessages(prev => {
          const alreadyExists = prev.some(
            m => (m.text || '').trim() === chat.lastMessage.trim()
          );
          if (alreadyExists) return prev;
          return [...prev, {
            id: `header-only-${Date.now()}`,
            text: chat.lastMessage,
            isMe: (!!effectiveUid && chat.lastMessageSenderId === effectiveUid)
              || chat.lastMessageSenderId === currentUsername,
            timestamp: formatTimestamp(chat.lastMessageTime),
            type: 'text' as const,
          }];
        });
      }
    });

    return () => unsubscribeHeader();
  }, [chatId, isOpen, currentUid, currentUsername]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Manejo de eventos de drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPosition({
          x: position.x + deltaX,
          y: position.y + deltaY
        });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-icon-btn')) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCloseMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const formatTimestamp = (timestamp: Timestamp | null | string | number): string => {
    if (!timestamp) return '';
    try {
      const date = typeof (timestamp as any)?.toDate === 'function'
        ? (timestamp as any).toDate()
        : new Date(timestamp as string | number);
      if (Number.isNaN(date.getTime())) return '';
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const getTimeNow = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const uid = currentUid || chatService.getEffectiveUid();
    const name = currentName || currentUsername;
    const other = otherUid;
    const currentUsernameFinal = currentUsernameReal || currentUsername;
    const otherUsernameFinal = otherUsernameReal || otherName;

    if (!uid || !other) {
      console.error('[ChatModal] UIDs no resueltos, no se puede enviar');
      return;
    }

    console.log('[ChatModal] 📤 Enviando mensaje con:', {
      uid,
      currentUsernameFinal,
      other,
      otherUsernameFinal,
      chatId
    });

    let activeChatId = chatId;
    if (!activeChatId) {
      try {
        // Usar usernames reales para crear el chat
        activeChatId = await chatService.getOrCreateChat(uid, currentUsernameFinal, other, otherUsernameFinal);
        setChatId(activeChatId);
        console.log('[ChatModal] ✅ Chat creado/obtenido:', activeChatId);
      } catch (e) {
        console.error('[ChatModal] Error al inicializar chat:', e);
        return;
      }
    }

    const text = inputText.trim();
    setInputText('');

    // Actualización optimista
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: optimisticId,
      text,
      isMe: true,
      timestamp: getTimeNow(),
      type: 'text',
    }]);

    setIsLoading(true);
    try {
      // Pasar usernames reales al servicio
      await withTimeout(chatService.sendMessage(activeChatId, uid, currentUsernameFinal, text, otherUsernameFinal));
      console.log('[ChatModal] ✅ Mensaje enviado exitosamente');
    } catch (error) {
      if (error instanceof Error && error.message === 'SEND_TIMEOUT') {
        console.warn('[ChatModal] Envio lento: se libera el estado de carga para no bloquear la UI');
        return;
      }
      console.error('[ChatModal] Error al enviar mensaje:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setInputText(text);
      alert('Error al enviar mensaje. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const uid = currentUid || chatService.getEffectiveUid();
    const other = otherUid;
    
    // Usar usernames reales, no display names
    const currentUsernameFinal = currentUsernameReal || currentUsername;
    const otherUsernameFinal = otherUsernameReal || otherName;

    if (files && files.length > 0 && chatId && uid && other && currentUsernameFinal && otherUsernameFinal) {
      const file = files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return;
      }

      console.log('[ChatModal] 📤 Enviando imagen con usernames reales:', currentUsernameFinal, otherUsernameFinal);
      setIsLoading(true);
      try {
        await withTimeout(chatService.sendImageMessage(chatId, uid, currentUsernameFinal, file, otherUsernameFinal));
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        if (error instanceof Error && error.message === 'SEND_TIMEOUT') {
          console.warn('[ChatModal] Subida lenta: se libera el estado de carga para no bloquear la UI');
          return;
        }
        console.error('Error al subir imagen:', error);
        alert('Error al subir imagen. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay">
      <div 
        className="chat-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div 
          className="chat-modal-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="chat-drag-dots">
            <span><i className="chat-dot"></i><i className="chat-dot"></i></span>
            <span><i className="chat-dot"></i><i className="chat-dot"></i></span>
            <span><i className="chat-dot"></i><i className="chat-dot"></i></span>
          </div>

          <div className="chat-avatar">
            {userAvatar || getInitials(userName)}
          </div>

          <div className="chat-header-info">
            <div className="chat-header-name">{userName}</div>
            <div className="chat-header-status">
              <span className={`chat-status-dot ${isOnline ? 'online' : ''}`}></span>
              {isOnline ? 'En línea' : 'Desconectado'}
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="chat-icon-btn"
              title="Cerrar"
              onMouseDown={handleCloseMouseDown}
              onClick={handleCloseClick}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="chat-body" ref={chatBodyRef}>
          {messages.length === 0 && !isLoading && (
            <div className="chat-empty-state">
              <p>No hay mensajes aún. Inicia la conversación.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`chat-msg-row ${msg.isMe ? 'me' : ''}`}>
              <div className={`chat-msg-avatar ${msg.isMe ? 'me-av' : ''}`}>
                {msg.isMe ? 'Tú' : getInitials(userName)}
              </div>
              <div>
                <div className={`chat-bubble ${msg.isMe ? 'me' : 'them'}`}>
                  {msg.type === 'image' && msg.imageUrl ? (
                    <img 
                      src={msg.imageUrl} 
                      alt="Imagen compartida" 
                      className="chat-image"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  ) : (
                    msg.text
                  )}
                </div>
                <div className={`chat-bubble-time ${msg.isMe ? 'me-time' : ''}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-msg-row">
              <div className="chat-msg-avatar">Tú</div>
              <div className="chat-typing-indicator">
                <div className="chat-typing-dot"></div>
                <div className="chat-typing-dot"></div>
                <div className="chat-typing-dot"></div>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="chat-msg-row">
              <div className="chat-msg-avatar">{getInitials(userName)}</div>
              <div className="chat-typing-indicator">
                <div className="chat-typing-dot"></div>
                <div className="chat-typing-dot"></div>
                <div className="chat-typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <button 
            className="chat-image-btn" 
            onClick={handleImageClick} 
            title="Adjuntar imagen"
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input 
            className="chat-input" 
            type="text" 
            placeholder="Escribe un mensaje..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button 
            className="chat-send-btn" 
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
          >
            <svg className="chat-send-icon" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;

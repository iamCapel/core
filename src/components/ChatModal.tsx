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
  userName: string;
  currentUser?: string;
  initialChatId?: string;
  userAvatar?: string;
  isOnline?: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  userName,
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
  
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Obtener usuario actual: usar prop si está disponible, sino localStorage como fallback
  useEffect(() => {
    if (currentUser) {
      setCurrentUsername(currentUser);
      return;
    }
    const userStr = localStorage.getItem('mopc_user') || localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUsername(user.username || user.name || '');
      } catch {
        // fallback vacío — no enviar con username incorrecto
      }
    }
  }, [currentUser]);

  // Obtener o crear chat cuando se abre el modal
  // Si ya tenemos initialChatId (chat existente), lo usamos directamente
  useEffect(() => {
    if (initialChatId) {
      setChatId(initialChatId);
      return;
    }
    if (isOpen && currentUsername && userName) {
      const initChat = async () => {
        try {
          const id = await chatService.getOrCreateChat(currentUsername, userName);
          setChatId(id);
        } catch (error) {
          console.error('Error al inicializar chat:', error);
        }
      };
      initChat();
    }
  }, [isOpen, currentUsername, userName, initialChatId]);

  // Suscribirse a los mensajes en tiempo real
  useEffect(() => {
    if (chatId && isOpen) {
      // Marcar como leídos al abrir el chat
      chatService.markChatAsRead(chatId, currentUsername);

      const toFormatted = (firebaseMessages: any[]) =>
        firebaseMessages.map((msg) => ({
          id: msg.id,
          text: msg.text,
          isMe: msg.senderId === currentUsername,
          timestamp: formatTimestamp(msg.timestamp),
          type: msg.type,
          imageUrl: msg.imageUrl
        }));

      const unsubscribe = chatService.subscribeToMessages(chatId, (firebaseMessages) => {
        setMessages(toFormatted(firebaseMessages));
        chatService.markChatAsRead(chatId, currentUsername);
      });

      // Polling de respaldo cada 6 segundos por si el onSnapshot falla
      const pollInterval = setInterval(async () => {
        try {
          const msgs = await chatService.getChatHistory(chatId);
          setMessages(toFormatted(msgs));
        } catch { /* ignorar */ }
      }, 6000);

      return () => {
        unsubscribe();
        clearInterval(pollInterval);
      };
    }
  }, [chatId, isOpen, currentUsername]);

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

  const formatTimestamp = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getTimeNow = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!currentUsername) {
      console.error('[ChatModal] currentUsername vacío, no se puede enviar');
      return;
    }
    if (!chatId) {
      console.error('[ChatModal] chatId null, no se puede enviar');
      if (currentUsername && userName) {
        try {
          const id = await chatService.getOrCreateChat(currentUsername, userName);
          setChatId(id);
        } catch (e) {
          console.error('[ChatModal] Error al reinicializar chat:', e);
        }
      }
      return;
    }

    const text = inputText.trim();
    setInputText('');

    // Actualización optimista: mostrar el mensaje de inmediato
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      text,
      isMe: true,
      timestamp: getTimeNow(),
      type: 'text',
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setIsLoading(true);
    try {
      await chatService.sendMessage(chatId, currentUsername, text);
      // El onSnapshot reemplazará el mensaje optimista con el real (misma key no importa, id diferente)
    } catch (error) {
      console.error('[ChatModal] Error al enviar mensaje:', error);
      // Revertir el mensaje optimista si falla
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
    if (files && files.length > 0 && chatId && currentUsername) {
      const file = files[0];
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return;
      }

      setIsLoading(true);
      try {
        await chatService.sendImageMessage(chatId, currentUsername, file);
        // Limpiar el input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
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

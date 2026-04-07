import React, { useState, useEffect, useRef } from 'react';
import { chatService, Chat } from '../services/chatService';
import userPresenceService from '../services/userPresenceService';
import * as firebaseUserStorage from '../services/firebaseUserStorage';
import ChatModal from './ChatModal';
import './ChatList.css';

interface ChatListProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  activeChatUser?: string | null;
  onOpenChat?: (username: string) => void;
  onCloseChat?: () => void;
}

interface ChatListItem extends Chat {
  otherUsername: string;
  isOnline: boolean;
}

const ChatList: React.FC<ChatListProps> = ({
  isOpen,
  onClose,
  currentUsername,
  activeChatUser,
  onOpenChat,
  onCloseChat
}) => {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<firebaseUserStorage.UserData[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para arrastre
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isChatControlledByParent = typeof onOpenChat === 'function';

  // Cargar todos los usuarios del sistema
  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      try {
        const users = await firebaseUserStorage.getAllUsers();
        // Filtrar el usuario actual
        setAllUsers(users.filter(u => u.username !== currentUsername));
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    };

    loadUsers();
  }, [isOpen, currentUsername]);

  // Suscribirse a los chats del usuario actual
  useEffect(() => {
    if (!isOpen || !currentUsername) return;

    const unsubscribe = chatService.subscribeToUserChats(currentUsername, (fetchedChats) => {
      // Procesar chats para obtener el otro usuario
      const processedChats = fetchedChats.map(chat => {
        const otherUsername = chat.participants.find(p => p !== currentUsername) || '';
        return {
          ...chat,
          otherUsername,
          isOnline: false // Se actualizará con userPresenceService
        };
      });
      setChats(processedChats);
    });

    return () => unsubscribe();
  }, [isOpen, currentUsername]);

  // Suscribirse al estado online de cada usuario
  useEffect(() => {
    if (!isOpen || chats.length === 0) return;

    const unsubscribes: Array<() => void> = [];
    const newOnlineUsers = new Set<string>();

    chats.forEach(chat => {
      if (chat.otherUsername) {
        const unsubscribe = userPresenceService.subscribeToUserPresence(
          chat.otherUsername,
          (isOnline) => {
            if (isOnline) {
              newOnlineUsers.add(chat.otherUsername);
            } else {
              newOnlineUsers.delete(chat.otherUsername);
            }
            setOnlineUsers(new Set(newOnlineUsers));
          }
        );
        unsubscribes.push(unsubscribe);
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isOpen, chats]);

  const handleChatClick = (username: string) => {
    if (isChatControlledByParent && onOpenChat) {
      onOpenChat(username);
      onClose();
      return;
    }

    setSelectedUser(username);
    setShowChatModal(true);
    onClose();
  };

  const handleCloseChatModal = () => {
    if (isChatControlledByParent) {
      onCloseChat?.();
      return;
    }

    setShowChatModal(false);
    setSelectedUser(null);
  };

  const handleSelectUser = (username: string) => {
    setSearchTerm(''); // Limpiar búsqueda
    setShowSearchDropdown(false);
    handleChatClick(username);
  };

  // Manejadores de arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    // Solo permitir arrastre desde el header (no desde inputs o botones)
    if ((e.target as HTMLElement).closest('.chat-list-search-container, .chat-list-close-btn')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      setPosition({ x: newX, y: newY });
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
  }, [isDragging, dragStart]);

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMs / 3600000);
      const diffInDays = Math.floor(diffInMs / 86400000);

      if (diffInMinutes < 1) return 'Ahora';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      if (diffInDays < 7) return `${diffInDays}d`;
      
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 35): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Filtrar usuarios para el dropdown de búsqueda
  const searchResults = searchTerm.trim() 
    ? allUsers.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.username.toLowerCase().includes(searchLower) ||
          user.name.toLowerCase().includes(searchLower) ||
          (user.email && user.email.toLowerCase().includes(searchLower))
        );
      }).slice(0, 5) // Máximo 5 resultados
    : [];

  // Filtrar chats según el término de búsqueda
  const filteredChats = chats.filter(chat => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      chat.otherUsername.toLowerCase().includes(searchLower) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchLower))
    );
  });

  const effectiveChatUser = isChatControlledByParent
    ? activeChatUser || null
    : showChatModal && selectedUser
      ? selectedUser
      : null;

  if (!isOpen && !effectiveChatUser) return null;

  return (
    <>
      {isOpen && (
        <div 
          className="chat-list-overlay"
        >
          <div 
            ref={containerRef}
            className="chat-list-container"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="chat-list-header"
              onMouseDown={handleMouseDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div className="chat-list-header-content">
                <div>
                  <h3 className="chat-list-title">Mensajes</h3>
                  <p className="chat-list-subtitle">
                    {chats.length} {chats.length === 1 ? 'conversación' : 'conversaciones'}
                  </p>
                </div>
                <div className="chat-list-header-actions">
                  <div className="chat-list-search-container">
                    <svg className="chat-list-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                      <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="chat-list-search-input"
                      placeholder="Buscar usuarios..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchDropdown(e.target.value.trim().length > 0);
                      }}
                      onFocus={() => {
                        if (searchTerm.trim()) setShowSearchDropdown(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {searchTerm && (
                      <button
                        className="chat-list-search-clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchTerm('');
                          setShowSearchDropdown(false);
                        }}
                      >
                        ✕
                      </button>
                    )}
                    
                    {/* Dropdown de resultados de búsqueda */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <div 
                        className="chat-list-search-dropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="chat-list-search-result"
                            onClick={() => handleSelectUser(user.username)}
                          >
                            <div className="chat-list-search-avatar">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} />
                              ) : (
                                <span>👤</span>
                              )}
                            </div>
                            <div className="chat-list-search-info">
                              <div className="chat-list-search-name">{user.name}</div>
                              <div className="chat-list-search-username">@{user.username}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="chat-list-close-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de conversaciones */}
            <div className="chat-list-content">
              {chats.length === 0 ? (
                <div className="chat-list-empty">
                  <div className="chat-list-empty-icon">💬</div>
                  <p className="chat-list-empty-title">Sin conversaciones</p>
                  <p className="chat-list-empty-text">
                    Haz clic en el nombre de un usuario para iniciar un chat
                  </p>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="chat-list-empty">
                  <div className="chat-list-empty-icon">🔍</div>
                  <p className="chat-list-empty-title">No se encontraron resultados</p>
                  <p className="chat-list-empty-text">
                    Intenta con otro término de búsqueda
                  </p>
                </div>
              ) : (
                <div className="chat-list-items">
                  {filteredChats.map((chat) => {
                    const isOnline = onlineUsers.has(chat.otherUsername);
                    
                    return (
                      <div
                        key={chat.id}
                        className="chat-list-item"
                        onClick={() => handleChatClick(chat.otherUsername)}
                      >
                        {/* Avatar y estado */}
                        <div className="chat-list-item-avatar">
                          <div className="chat-list-avatar-circle">
                            👤
                          </div>
                          <div className={`chat-list-status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
                        </div>

                        {/* Información */}
                        <div className="chat-list-item-info">
                          <div className="chat-list-item-header">
                            <span className="chat-list-item-name">{chat.otherUsername}</span>
                            <span className="chat-list-item-time">
                              {formatTimestamp(chat.lastMessageTime)}
                            </span>
                          </div>
                          <div className="chat-list-item-preview">
                            {truncateMessage(chat.lastMessage || 'Sin mensajes')}
                          </div>
                          {isOnline && (
                            <span className="chat-list-online-badge">En línea</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de chat */}
      {effectiveChatUser && (
        <ChatModal
          isOpen={true}
          onClose={handleCloseChatModal}
          userName={effectiveChatUser}
        />
      )}
    </>
  );
};

export default ChatList;

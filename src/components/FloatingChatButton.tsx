import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ChatList from './ChatList';
import './FloatingChatButton.css';
import { chatService, Chat } from '../services/chatService';
import { auth } from '../config/firebase';
import { getUserById, getUserByUsername } from '../services/firebaseUserStorage';

interface MsgToast {
  id: number;
  sender: string;
  text: string;
  chatId: string;
}

const FloatingChatButton: React.FC = () => {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<MsgToast[]>([]);
  const [hidden, setHidden] = useState(false); // visible desde que el usuario inicia sesión
  const [draggingActive, setDraggingActive] = useState(false);
  const [overClose, setOverClose] = useState(false);

  const prevUnreadRef = useRef<Record<string, number>>({});
  const toastIdRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Cache de nombres resueltos para los toasts (UID → nombre display)
  const senderNamesRef = useRef<Record<string, string>>({});
  const currentUidRef = useRef<string | null>(null);

  // Refs para showChatList y activeChatUser: evitan reiniciar la suscripción al abrir/cerrar chat
  const showChatListRef = useRef(false);
  const activeChatUserRef = useRef<string | null>(null);

  // Mantener refs sincronizados con el estado
  useEffect(() => { showChatListRef.current = showChatList; }, [showChatList]);
  useEffect(() => { activeChatUserRef.current = activeChatUser; }, [activeChatUser]);

  // Solicitar permiso de notificaciones al montar y calentar AudioContext con primer gesto
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Desbloquear AudioContext con el primer gesto del usuario
    const unlock = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      } else if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchend', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchend', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchend', unlock);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const play = () => {
        const times = [0, 0.15];
        times.forEach((startTime) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime + startTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.12);
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + 0.12);
        });
      };
      if (ctx.state === 'suspended') {
        ctx.resume().then(play);
      } else {
        play();
      }
    } catch { /* ignorar si el navegador bloquea */ }
  }, []);

  const showSystemNotification = useCallback((sender: string, text: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Mensaje de ${sender}`, {
        body: text,
        icon: '/mopc-logo.png',
        tag: `chat-${sender}`,
      });
    }
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  // Drag state
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight / 2 });
  const posRef = useRef({ x: window.innerWidth - 80, y: window.innerHeight / 2 });
  const overCloseRef = useRef(false);

  // Leer usuario actual desde localStorage y escuchar cambios
  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem('mopc_user');
        if (raw) {
          const u = JSON.parse(raw);
          setCurrentUsername(u.username || null);
          setHidden(false); // mostrar botón cuando hay sesión activa
        } else {
          setCurrentUsername(null);
          setHidden(true); // ocultar si no hay sesión
        }
      } catch {
        setCurrentUsername(null);
      }
    };

    readUser();
    window.addEventListener('storage', readUser);
    // Polling ligero para detectar login/logout interno (sin evento storage cross-tab)
    const interval = setInterval(readUser, 2000);
    return () => {
      window.removeEventListener('storage', readUser);
      clearInterval(interval);
    };
  }, []);

  // Sincronizar UID del usuario autenticado
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      currentUidRef.current = user?.uid ?? null;
    });
    return () => unsub();
  }, []);

  // Suscribirse a mensajes no leídos
  useEffect(() => {
    if (!currentUsername) return;
    const unsub = chatService.subscribeToTotalUnread(currentUsername, setUnreadCount);
    return () => unsub();
  }, [currentUsername]);

  // Detectar mensajes nuevos y mostrar toast
  useEffect(() => {
    if (!currentUsername) return;
    initialLoadDoneRef.current = false;
    const unsub = chatService.subscribeToUserChats(currentUsername, (chats: Chat[]) => {
      const uid = currentUidRef.current;

      // Helper: leer el contador de no leídos de un chat, considerando UID y username
      const getUnread = (chat: Chat): number => {
        const byUsername = chat.unreadCount?.[currentUsername] ?? 0;
        const byUid = uid ? (chat.unreadCount?.[uid] ?? 0) : 0;
        return Math.max(byUsername, byUid);
      };

      // Helper async: resolver identificador a nombre display con caché
      const resolveSenderName = async (rawId: string): Promise<string> => {
        if (senderNamesRef.current[rawId]) return senderNamesRef.current[rawId];
        try {
          // Si parece username (contiene letras no solo UID-like), buscar primero por username
          const byUsername = await getUserByUsername(rawId);
          if (byUsername) {
            const name = byUsername.name || byUsername.username;
            senderNamesRef.current[rawId] = name;
            return name;
          }
          // Buscar por UID
          const byId = await getUserById(rawId);
          if (byId) {
            const name = byId.name || byId.username;
            senderNamesRef.current[rawId] = name;
            return name;
          }
        } catch { /* ignorar */ }
        return rawId;
      };

      if (!initialLoadDoneRef.current) {
        // Primera carga: solo guardar los conteos actuales como base, sin mostrar nada
        chats.forEach((chat) => {
          prevUnreadRef.current[chat.id] = getUnread(chat);
        });
        initialLoadDoneRef.current = true;
        return;
      }

      chats.forEach((chat) => {
        const currentUnread = getUnread(chat);
        const prevUnread = prevUnreadRef.current[chat.id] ?? 0;

        if (currentUnread > prevUnread) {
          // Identificar al remitente (puede ser UID o username)
          const senderRaw = chat.participants.find(p => {
            if (p === currentUsername) return false;
            if (uid && p === uid) return false;
            return true;
          }) || '';

          const isChatOpen = showChatListRef.current && activeChatUserRef.current === senderRaw;
          if (!isChatOpen) {
            const toastId = ++toastIdRef.current;
            // Mostrar toast con ID raw primero, luego reemplazar con nombre real
            const newToast: MsgToast = {
              id: toastId,
              sender: senderRaw,
              text: chat.lastMessage || 'Nuevo mensaje',
              chatId: chat.id,
            };
            setToasts(prev => [...prev.slice(-3), newToast]);
            setHidden(false);
            playNotificationSound();
            // Resolver nombre real de forma asincrónica y actualizar el toast
            resolveSenderName(senderRaw).then(resolvedName => {
              if (resolvedName !== senderRaw) {
                setToasts(prev => prev.map(t =>
                  t.id === toastId ? { ...t, sender: resolvedName } : t
                ));
              }
              showSystemNotification(resolvedName, chat.lastMessage || 'Nuevo mensaje');
            });
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 5000);
          }
        }

        prevUnreadRef.current[chat.id] = currentUnread;
      });
    });
    return () => unsub();
  // Solo re-suscribirse cuando cambia el usuario (login/logout), no por abrir/cerrar chat
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUsername, playNotificationSound, showSystemNotification]);

  // Ajustar posición si la ventana cambia de tamaño
  useEffect(() => {
    const onResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 70),
        y: Math.min(prev.y, window.innerHeight - 70),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Callback ref: registra los listeners de drag cuando el botón se monta
  const dragRef = useCallback((btn: HTMLDivElement | null) => {
    if (!btn) return;

    const clamp = (x: number, y: number) => ({
      x: Math.max(8, Math.min(x, window.innerWidth - 66)),
      y: Math.max(8, Math.min(y, window.innerHeight - 66)),
    });
    const isOverDismiss = (btnY: number) => (btnY + 29) / window.innerHeight >= 0.75;

    let startClientX = 0, startClientY = 0;
    let startBtnX = 0, startBtnY = 0;
    let moved = false;

    const onMove = (clientX: number, clientY: number) => {
      moved = true;
      const pos = clamp(
        startBtnX + clientX - startClientX,
        startBtnY + clientY - startClientY,
      );
      posRef.current = pos;
      setPosition({ ...pos });
      const over = isOverDismiss(pos.y);
      overCloseRef.current = over;
      setOverClose(over);
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);

      setDraggingActive(false);

      if (overCloseRef.current) {
        overCloseRef.current = false;
        setOverClose(false);
        setHidden(true);
        return;
      }
      overCloseRef.current = false;
      setOverClose(false);

      if (!moved) {
        setShowChatList(prev => !prev);
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onMouseUp   = () => onEnd();
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd  = () => onEnd();

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startClientX = e.clientX; startClientY = e.clientY;
      startBtnX = posRef.current.x; startBtnY = posRef.current.y;
      moved = false;
      overCloseRef.current = false;
      setOverClose(false);
      setDraggingActive(true);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      startClientX = t.clientX; startClientY = t.clientY;
      startBtnX = posRef.current.x; startBtnY = posRef.current.y;
      moved = false;
      overCloseRef.current = false;
      setOverClose(false);
      setDraggingActive(true);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      document.addEventListener('touchcancel', onTouchEnd);
    };

    btn.addEventListener('mousedown', onMouseDown);
    btn.addEventListener('touchstart', onTouchStart, { passive: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenChat = useCallback((username: string) => {
    setActiveChatUser(username);
    // Cerrar toast del mismo remitente si existe
    setToasts(prev => prev.filter(t => t.sender !== username));
  }, []);

  const handleCloseChat = useCallback(() => {
    setActiveChatUser(null);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const openChatFromToast = useCallback((sender: string, id: number) => {
    dismissToast(id);
    setActiveChatUser(sender);
    setShowChatList(true);
  }, [dismissToast]);

  if (!currentUsername) return null;

  const content = (
    <>
      {!hidden && (
        <div
          ref={dragRef}
          className={`fc-bubble-btn${overClose ? ' fc-bubble-over-close' : ''}`}
          style={{ left: position.x, top: position.y }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="fc-bubble-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
      )}

      {/* Zona de cierre — aparece al arrastrar */}
      {draggingActive && !hidden && (
        <div className={`fc-close-zone${overClose ? ' fc-close-zone-active' : ''}`}>
          <span>✕</span>
        </div>
      )}

      <ChatList
        isOpen={showChatList}
        onClose={() => setShowChatList(false)}
        currentUsername={currentUsername}
        activeChatUser={activeChatUser}
        onOpenChat={handleOpenChat}
        onCloseChat={handleCloseChat}
      />

      {/* Toasts de mensajes nuevos */}
      <div className="fc-toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="fc-toast"
            onClick={() => openChatFromToast(toast.sender, toast.id)}
          >
            <div className="fc-toast-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="fc-toast-body">
              <span className="fc-toast-sender">{toast.sender}</span>
              <span className="fc-toast-text">{toast.text.startsWith('📷') ? '📷 Imagen' : toast.text}</span>
            </div>
            <button
              className="fc-toast-close"
              onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}
            >✕</button>
          </div>
        ))}
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default FloatingChatButton;

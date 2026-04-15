import React, { useState, useEffect } from 'react';
import ChatModal from './ChatModal';
import userPresenceService from '../services/userPresenceService';
import { userLocationService } from '../services/userLocationService';

interface ClickableUsernameProps {
  username: string;
  fullName?: string;
  userAvatar?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para hacer clickeable cualquier nombre de usuario en la plataforma
 * Al hacer clic, abre el modal de chat con el usuario
 * 
 * Ejemplo de uso:
 * <ClickableUsername username="juan_perez" fullName="Juan Pérez" />
 */
const ClickableUsername: React.FC<ClickableUsernameProps> = ({
  username,
  fullName,
  userAvatar,
  className = '',
  style = {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;

    // Verificar estado de conexión del usuario
    const checkConnection = () => {
      // Suscribirse al estado de presencia web
      const unsubscribeWeb = userPresenceService.subscribeToUserPresence(
        username,
        (isOnlineWeb) => {
          if (isOnlineWeb) {
            setIsOnline(true);
            return;
          }

          // Si no está online en web, verificar GPS
          const unsubscribeGPS = userLocationService.subscribeToLiveLocations((locations) => {
            const userLocation = locations.find((loc: any) => loc.username === username);
            if (userLocation) {
              const now = Date.now();
              let locationTime = 0;
              
              // Manejar diferentes tipos de timestamp
              if (userLocation.timestamp) {
                if (typeof userLocation.timestamp === 'number') {
                  locationTime = userLocation.timestamp;
                } else if (typeof userLocation.timestamp === 'object' && 'toMillis' in userLocation.timestamp) {
                  locationTime = (userLocation.timestamp as any).toMillis();
                } else if (typeof userLocation.timestamp === 'string') {
                  locationTime = new Date(userLocation.timestamp).getTime();
                }
              }
              
              const diffSeconds = (now - locationTime) / 1000;
              
              // Si envió ubicación hace menos de 30 segundos, está online en app
              setIsOnline(diffSeconds < 30);
            } else {
              setIsOnline(false);
            }
          });

          return () => {
            unsubscribeGPS();
          };
        }
      );

      return () => {
        unsubscribeWeb();
      };
    };

    const cleanup = checkConnection();
    return cleanup;
  }, [isModalOpen, username]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <span
        className={`clickable-username ${className}`}
        style={{
          color: '#FF7A00',
          cursor: 'pointer',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'all 0.2s',
          ...style
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
          e.currentTarget.style.color = '#E66900';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
          e.currentTarget.style.color = '#FF7A00';
        }}
        title={`Chatear con ${fullName || username}`}
      >
        {fullName || username}
      </span>

      <ChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userName={fullName || username}
        targetUsername={username}
        userAvatar={userAvatar}
        isOnline={isOnline}
      />
    </>
  );
};

export default ClickableUsername;

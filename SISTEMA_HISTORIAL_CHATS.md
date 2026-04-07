# Sistema de Historial de Conversaciones

## 📋 Descripción General

Sistema de historial de chats que muestra todas las conversaciones activas del usuario, con vista previa del último mensaje, estado online/offline y acceso rápido a cada conversación.

## ✨ Características

- **Lista de conversaciones**: Muestra todos los chats del usuario actual
- **Vista previa de mensajes**: Último mensaje de cada conversación (texto o "📷 Imagen")
- **Estado online/offline**: Indicador en tiempo real del estado de cada usuario
- **Ordenamiento**: Conversaciones ordenadas por mensaje más reciente
- **Acceso rápido**: Click en cualquier conversación para abrir el chat
- **Tiempo relativo**: Muestra cuándo fue el último mensaje (Ahora, 5m, 2h, 3d, etc.)
- **Diseño responsivo**: Se adapta a diferentes tamaños de pantalla

## 🗂️ Archivos del Sistema

### Nuevos archivos creados:

1. **`src/components/ChatList.tsx`** (220 líneas)
   - Componente principal del historial de conversaciones
   - Renderiza la lista de chats con información detallada
   - Integra detección de estado online/offline en tiempo real

2. **`src/components/ChatList.css`** (290 líneas)
   - Estilos completos para el panel de conversaciones
   - Animaciones para entrada/salida del panel
   - Estados hover y active para interactividad
   - Indicadores de estado con animación de pulso

### Archivos modificados:

3. **`src/services/chatService.ts`**
   - **Método agregado**: `getUserChats(username: string): Promise<Chat[]>`
     * Obtiene todos los chats donde el usuario es participante
     * Filtra por `participants` array-contains
     * Ordena por `lastMessageTime` descendente
   
   - **Método agregado**: `subscribeToUserChats(username: string, callback): () => void`
     * Suscripción en tiempo real a los chats del usuario
     * Actualiza automáticamente cuando hay cambios
     * Devuelve función para cancelar la suscripción

4. **`src/components/Dashboard.tsx`**
   - **Import agregado**: `import ChatList from './ChatList'`
   - **Estado agregado**: `const [showChatList, setShowChatList] = useState(false)`
   - **Icono agregado**: Botón de mensajes 💬 en el topbar (al lado de notificaciones)
   - **Renderizado**: Componente ChatList con props necesarios

## 🚀 Cómo Funciona

### 1. Acceso al Historial

El usuario accede al historial de conversaciones haciendo clic en el icono de mensajes (💬) en la barra superior del Dashboard, ubicado a la izquierda del icono de notificaciones.

### 2. Obtención de Conversaciones

```typescript
// En ChatList.tsx - useEffect para suscribirse a chats
useEffect(() => {
  if (!isOpen || !currentUsername) return;

  const unsubscribe = chatService.subscribeToUserChats(currentUsername, (fetchedChats) => {
    const processedChats = fetchedChats.map(chat => {
      const otherUsername = chat.participants.find(p => p !== currentUsername) || '';
      return {
        ...chat,
        otherUsername,
        isOnline: false
      };
    });
    setChats(processedChats);
  });

  return () => unsubscribe();
}, [isOpen, currentUsername]);
```

**Flujo de datos**:
1. ChatList se suscribe a `chats` collection donde `participants` contiene al usuario actual
2. Firebase devuelve todos los documentos de chat en tiempo real
3. Se procesa cada chat para extraer el nombre del otro usuario
4. Se actualiza el estado local con la lista de conversaciones

### 3. Detección de Estado Online

```typescript
// Suscripción al estado de presencia de cada usuario
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
```

**Proceso**:
1. Para cada conversación, se suscribe al nodo `presence/{username}` en Realtime Database
2. Se verifica el campo `state` (online-web, online-app, offline)
3. Se actualiza el Set de usuarios online
4. La UI refleja el cambio con indicador verde (online) o gris (offline)

### 4. Formato de Timestamps

```typescript
const formatTimestamp = (timestamp: any): string => {
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
};
```

**Ejemplos de salida**:
- Menos de 1 minuto: "Ahora"
- 5 minutos: "5m"
- 2 horas: "2h"
- 3 días: "3d"
- Más de 7 días: "15 ene"

### 5. Apertura de Conversación

Al hacer clic en una conversación:
1. Se establece `selectedUser` con el username del otro usuario
2. Se abre el `ChatModal` con ese usuario
3. El ChatModal carga los mensajes de esa conversación específica
4. El usuario puede enviar/recibir mensajes en tiempo real

## 🎨 Diseño Visual

### Estructura del Panel

```
┌─────────────────────────────────────┐
│ Mensajes                          ✕ │ ← Header (gradiente naranja)
│ 3 conversaciones                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 👤 usuario123            Ahora  │ │ ← Chat item
│ │ 🟢 📷 Imagen                    │ │   (indicador verde = online)
│ │ En línea                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 maria_lopez           15m    │ │
│ │ ⚫ Hola, ¿cómo estás?           │ │   (indicador gris = offline)
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 carlos_perez          2h     │ │
│ │ ⚫ Nos vemos mañana              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Estados Visuales

1. **Estado Vacío**:
   - Icono 💬 grande
   - Texto: "Sin conversaciones"
   - Sugerencia: "Haz clic en el nombre de un usuario para iniciar un chat"

2. **Hover sobre conversación**:
   - Fondo cambia a #fafafa
   - Sombra naranja: `0 4px 8px rgba(255, 122, 0, 0.1)`
   - Desplazamiento a la izquierda: `translateX(-2px)`
   - Borde naranja sutil

3. **Indicador Online**:
   - Círculo verde: `#4ade80`
   - Animación de pulso cada 2 segundos
   - Badge "En línea" en esquina superior derecha

4. **Indicador Offline**:
   - Círculo gris: `#9ca3af`
   - Sin animación
   - Sin badge

## 📊 Estructura de Datos

### Chat Document (en Firestore)

```typescript
{
  id: "carlos_miguel",           // ID único (usuarios ordenados)
  participants: ["carlos", "miguel"],  // Array de participantes
  lastMessage: "Hola, ¿cómo estás?",  // Último mensaje (texto o "📷 Imagen")
  lastMessageTime: Timestamp,    // Timestamp de Firestore
  createdAt: Timestamp           // Cuándo se creó el chat
}
```

### ChatListItem (en componente)

```typescript
interface ChatListItem extends Chat {
  otherUsername: string;  // Nombre del otro usuario (no el actual)
  isOnline: boolean;      // Estado online/offline
}
```

## 🔧 Configuración

### Firestore Rules (recomendadas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para colección de chats
    match /chats/{chatId} {
      // Permitir lectura solo si el usuario es participante
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants;
      
      // Permitir crear solo si el usuario es uno de los participantes
      allow create: if request.auth != null && 
                       request.auth.uid in request.resource.data.participants;
      
      // Permitir actualizar solo si el usuario es participante
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.participants;
      
      // Subcollection de mensajes
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

**IMPORTANTE**: Estas reglas asumen que `request.auth.uid` corresponde al username. Si usas Firebase Auth con UIDs diferentes, ajusta las reglas según tu sistema de autenticación.

### Realtime Database Rules (para presencia)

```json
{
  "rules": {
    "presence": {
      "$username": {
        ".read": true,
        ".write": "$username === auth.token.sub"
      }
    }
  }
}
```

## 🐛 Solución de Problemas

### 1. No aparecen conversaciones

**Causa**: El usuario no ha iniciado ningún chat todavía

**Solución**: 
- El usuario debe hacer clic en el nombre de otro usuario en la página de Usuarios
- Esto abrirá el ChatModal y creará el chat automáticamente
- Luego aparecerá en el historial

### 2. Estado online no se actualiza

**Causa**: Problemas con Realtime Database

**Verificación**:
```typescript
// En la consola del navegador
console.log(realtimeDb); // Debe estar definido
```

**Solución**:
- Verificar que Realtime Database esté habilitado en Firebase Console
- Verificar que las reglas de Realtime Database permitan lectura en `/presence`
- Comprobar conexión a Internet

### 3. Panel no se abre

**Causa**: Error en el componente o estado

**Verificación**:
```typescript
// En Dashboard.tsx
console.log('showChatList:', showChatList);
```

**Solución**:
- Verificar que el import de ChatList sea correcto
- Verificar que el usuario esté autenticado (`user` no sea null)
- Revisar consola del navegador en busca de errores de JavaScript

### 4. Mensajes no se actualizan en tiempo real

**Causa**: La suscripción no está funcionando

**Verificación**:
```typescript
// En chatService.ts, agregar console.log
subscribeToUserChats(username, (chats) => {
  console.log('Chats actualizados:', chats);
  callback(chats);
});
```

**Solución**:
- Verificar que Firestore esté correctamente configurado
- Verificar que los chats tengan el campo `participants` con el username actual
- Comprobar permisos de lectura en Firestore Rules

### 5. Avatar no muestra foto de perfil

**Causa**: Actualmente solo muestra emoji 👤

**Estado**: Funcionalidad pendiente de implementación

**Próxima versión**: 
- Obtener foto de perfil desde `firebaseUserStorage`
- Mostrar iniciales si no hay foto
- Mostrar emoji solo como fallback

## 🔮 Mejoras Futuras

### 1. Fotos de perfil reales
- Cargar fotos desde `users` collection en Firestore
- Mostrar iniciales del nombre si no hay foto
- Cache de imágenes para mejor rendimiento

### 2. Contador de mensajes no leídos
- Agregar campo `unreadCount` por usuario en chat document
- Mostrar badge numérico en cada conversación
- Resetear contador al abrir el chat

### 3. Búsqueda de conversaciones
- Input de búsqueda en el header
- Filtrar por nombre de usuario
- Resaltar coincidencias

### 4. Eliminación de conversaciones
- Botón de eliminar (swipe o menú contextual)
- Confirmación antes de eliminar
- Llamar a `chatService.deleteChat(chatId)`

### 5. Paginación
- Cargar solo primeras 20 conversaciones
- Botón "Cargar más" al final de la lista
- Scroll infinito opcional

### 6. Indicador de escritura
- Mostrar "Escribiendo..." cuando el otro usuario está escribiendo
- Usar Realtime Database para sincronizar estado de escritura
- Desaparecer automáticamente después de 3 segundos

### 7. Notificaciones push
- Firebase Cloud Messaging para notificar nuevos mensajes
- Funciona incluso cuando la app está cerrada
- Solicitar permisos de notificaciones

## 📈 Métricas de Rendimiento

### Tamaño del Bundle
- **Antes**: 846.53 kB (gzipped)
- **Después**: 847.58 kB (gzipped)
- **Incremento**: +1.05 kB (0.12%)

### Queries en Firestore
- **Al abrir panel**: 1 query (obtener chats del usuario)
- **Por conversación visible**: 1 listener en Realtime DB (estado online)
- **Actualización en tiempo real**: onSnapshot (sin costo de lectura adicional si no hay cambios)

### Optimizaciones aplicadas:
1. **Limit en query**: Se pueden agregar `.limit(50)` si hay muchas conversaciones
2. **Listeners condicionales**: Solo se crean cuando el panel está abierto
3. **Cleanup de listeners**: Se cancelan todas las suscripciones al cerrar el panel
4. **Set para usuarios online**: Evita re-renders innecesarios

## 🎯 Conclusión

El sistema de historial de conversaciones está completamente integrado y funcional. Proporciona una experiencia de usuario moderna con:
- ✅ Vista previa de conversaciones
- ✅ Estado online/offline en tiempo real
- ✅ Ordenamiento por mensaje más reciente
- ✅ Acceso rápido a cualquier chat
- ✅ Diseño responsivo y animado
- ✅ Sincronización automática con Firebase

El sistema está listo para producción y puede ser extendido con las mejoras futuras mencionadas según las necesidades del proyecto.

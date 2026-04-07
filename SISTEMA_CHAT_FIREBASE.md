# Sistema de Chat con Firebase y Limpieza Automática

## 📱 Características Implementadas

### 1. **Almacenamiento en Firebase**
- ✅ Mensajes guardados en Firestore (`chats/{chatId}/messages`)
- ✅ Imágenes almacenadas en Firebase Storage (`chats/{chatId}/`)
- ✅ Actualización en tiempo real usando listeners de Firestore
- ✅ Historial completo de conversaciones

### 2. **Limpieza Automática (Retención de 7 días)**
- ✅ Los mensajes se eliminan automáticamente después de 7 días
- ✅ Limpieza ejecutada al iniciar sesión
- ✅ Script disponible para ejecutar manualmente
- ✅ Sin impacto en el rendimiento (se ejecuta en segundo plano)

### 3. **Funcionalidades del Chat**
- ✅ Mensajes de texto en tiempo real
- ✅ Envío de imágenes (máximo 5MB)
- ✅ Indicador de carga mientras se envían mensajes/imágenes
- ✅ Estado online/offline del usuario
- ✅ Drag and drop para mover el modal
- ✅ Scroll automático a mensajes nuevos
- ✅ Click en imágenes para verlas en tamaño completo

---

## 🗂️ Estructura de Datos en Firestore

```
Firestore/
├── chats/
│   ├── {username1_username2}/                # ID del chat (ordenado alfabéticamente)
│   │   ├── participants: ["user1", "user2"]
│   │   ├── lastMessage: "Último mensaje..."
│   │   ├── lastMessageTime: Timestamp
│   │   ├── createdAt: Timestamp
│   │   │
│   │   └── messages/                         # Subcolección de mensajes
│   │       ├── {messageId}/
│   │       │   ├── senderId: "username"
│   │       │   ├── text: "Mensaje de texto"
│   │       │   ├── timestamp: Timestamp
│   │       │   ├── type: "text" | "image"
│   │       │   └── imageUrl?: "https://..."  (solo si type === "image")
```

---

## 📝 Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/services/chatService.ts`** (240 líneas)
   - Servicio principal para manejar chats
   - Métodos:
     * `getOrCreateChat()` - Obtiene o crea un chat
     * `sendMessage()` - Envía mensaje de texto
     * `sendImageMessage()` - Sube imagen y crea mensaje
     * `subscribeToMessages()` - Listener en tiempo real
     * `cleanOldMessages()` - Elimina mensajes >7 días
     * `deleteChat()` - Elimina chat completo
     * `getChatHistory()` - Obtiene historial

2. **`scripts/cleanOldMessages.ts`** (31 líneas)
   - Script para ejecutar limpieza manualmente
   - Uso: `npx ts-node scripts/cleanOldMessages.ts`

### Archivos Modificados

1. **`src/config/firebase.ts`**
   - Agregado: `export const storage = getStorage(app);`
   - Soporte para Firebase Storage

2. **`src/components/ChatModal.tsx`** (~280 líneas)
   - Integración completa con Firebase
   - Carga de mensajes en tiempo real
   - Envío de texto e imágenes
   - Estados de carga y deshabilitado

3. **`src/components/ChatModal.css`**
   - Estilos para imágenes adjuntas (`.chat-image`)
   - Estados deshabilitados para botones
   - Indicador de carga

4. **`src/components/Dashboard.tsx`**
   - Importado `chatService`
   - Llamada a `cleanOldMessages()` al iniciar sesión
   - Se ejecuta en segundo plano sin bloquear UI

5. **`src/components/ClickableUsername.tsx`**
   - Ya adaptado para abrir ChatModal
   - Pasa `username` del usuario clickeado

---

## 🚀 Cómo Funciona

### Al hacer click en un nombre de usuario:
1. Se obtiene el usuario actual desde `localStorage`
2. Se genera un `chatId` único: `{user1}_{user2}` (alfabéticamente)
3. Se busca o crea el chat en Firestore
4. Se suscribe a los mensajes en tiempo real
5. Los mensajes nuevos aparecen automáticamente

### Al enviar un mensaje de texto:
1. Se llama a `chatService.sendMessage()`
2. Se guarda en Firestore con timestamp
3. Se actualiza `lastMessage` del chat
4. Todos los usuarios suscritos reciben el update

### Al enviar una imagen:
1. Se valida tamaño (<5MB)
2. Se sube a Firebase Storage (`chats/{chatId}/`)
3. Se obtiene URL de descarga
4. Se crea mensaje tipo "image" con la URL
5. La imagen se muestra en el chat

### Limpieza Automática:
1. Se ejecuta al iniciar sesión (Dashboard)
2. Busca mensajes con `timestamp < (hoy - 7 días)`
3. Elimina mensajes y referencias
4. No elimina imágenes de Storage (pueden reutilizarse)
5. Se ejecuta en segundo plano (async)

---

## ⚙️ Configuración

### Ejecutar Limpieza Manualmente

```bash
# Desde la raíz del proyecto
npx ts-node scripts/cleanOldMessages.ts
```

### Programar Limpieza con Cron (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada día a las 3AM
0 3 * * * cd /ruta/a/proyecto && npx ts-node scripts/cleanOldMessages.ts
```

### En Windows (Task Scheduler)

1. Abrir "Programador de Tareas"
2. Crear tarea básica
3. Configurar trigger: Diariamente a las 3:00 AM
4. Acción: Ejecutar programa
   - Programa: `npx`
   - Argumentos: `ts-node scripts/cleanOldMessages.ts`
   - Iniciar en: Ruta del proyecto

---

## 🔒 Seguridad

### Reglas de Firestore Recomendadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chats: solo participantes pueden leer/escribir
    match /chats/{chatId} {
      allow read: if request.auth != null && 
        resource.data.participants.hasAny([request.auth.token.username]);
      
      allow create: if request.auth != null;
      
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
  }
}
```

### Reglas de Storage Recomendadas

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chats/{chatId}/{fileName} {
      // Solo archivos de imagen
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.contentType.matches('image/.*') &&
        request.resource.size < 5 * 1024 * 1024; // Máximo 5MB
    }
  }
}
```

---

## 📊 Monitoreo

### Ver Logs de Limpieza

```bash
# En consola del navegador
# La limpieza muestra: "Limpieza completada: X mensajes eliminados"
```

### Verificar en Firebase Console

1. Ir a Firestore
2. Navegar a `chats > {chatId} > messages`
3. Verificar timestamps de mensajes
4. Mensajes >7 días deben estar eliminados

---

## 🐛 Troubleshooting

### "No se cargan los mensajes"
- Verificar conexión a Internet
- Revisar consola del navegador (F12)
- Verificar que Firebase esté configurado correctamente
- Verificar que el usuario esté autenticado

### "Error al subir imagen"
- Verificar tamaño (<5MB)
- Revisar reglas de Storage
- Verificar formato (solo imágenes)
- Revisar cuota de Storage en Firebase

### "Limpieza no funciona"
- Verificar que el usuario inicie sesión
- Revisar logs en consola
- Ejecutar script manualmente para debugging
- Verificar permisos de Firestore

---

## 📈 Optimizaciones Futuras

1. **Paginación de Mensajes**
   - Cargar solo últimos 50 mensajes
   - Botón "Cargar más" para mensajes antiguos

2. **Compresión de Imágenes**
   - Reducir tamaño antes de subir
   - Generar thumbnails automáticamente

3. **Notificaciones Push**
   - Alertar cuando llega mensaje nuevo
   - Usar Firebase Cloud Messaging

4. **Eliminación de Imágenes en Storage**
   - Eliminar imágenes cuando se eliminan mensajes
   - Liberar espacio de almacenamiento

5. **Encriptación**
   - Encriptar mensajes antes de guardar
   - Mayor privacidad

---

## 📞 Soporte

Para cualquier problema o pregunta contacta al equipo de desarrollo.

**Última actualización:** 7 de abril de 2026

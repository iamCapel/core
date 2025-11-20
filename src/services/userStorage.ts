/**
 * UserStorage - Sistema de almacenamiento estructurado para usuarios
 * Proporciona una capa de abstracción sobre localStorage con estructura de base de datos
 */

export interface UserNote {
  id: string;
  tipo: 'observacion' | 'amonestacion' | 'pendiente';
  contenido: string;
  fecha: string;
  creadoPor: string;
}

export interface UserData {
  id: string;
  username: string;
  password: string;  // Contraseña del usuario
  name: string;
  email: string;
  phone?: string;
  cedula?: string;  // Número de cédula de identidad
  
  // Rol y permisos
  role: string;
  department: string;
  
  // Estado
  isActive: boolean;
  isVerified: boolean;  // Indica si la cuenta ha sido verificada por un administrador
  lastSeen: string;
  joinDate: string;
  
  // Avatar
  avatar?: string;
  
  // Ubicación
  currentLocation: {
    province: string;
    municipality: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    lastUpdated: string;
  };
  
  // Estadísticas
  reportsCount: number;
  pendingReportsCount?: number;
  
  // Notas y observaciones
  notes: UserNote[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
}

export interface UserIndex {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
}

class UserStorage {
  private readonly STORAGE_KEY = 'mopc_users_db';
  private readonly INDEX_KEY = 'mopc_users_index';
  private readonly METADATA_KEY = 'mopc_users_metadata';
  private readonly VERSION = 1;

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Inicializar la base de datos si no existe
   */
  private initializeDatabase(): void {
    try {
      const metadata = this.getMetadata();
      if (!metadata) {
        const initialMetadata = {
          version: this.VERSION,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalUsers: 0,
          activeUsers: 0
        };
        localStorage.setItem(this.METADATA_KEY, JSON.stringify(initialMetadata));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
        localStorage.setItem(this.INDEX_KEY, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error al inicializar la base de datos de usuarios:', error);
    }
  }

  /**
   * Obtener metadata de la base de datos
   */
  private getMetadata(): any {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error('Error al obtener metadata:', error);
      return null;
    }
  }

  /**
   * Actualizar metadata
   */
  private updateMetadata(updates: any): void {
    try {
      const metadata = this.getMetadata() || {};
      const updatedMetadata = {
        ...metadata,
        ...updates,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(updatedMetadata));
    } catch (error) {
      console.error('Error al actualizar metadata:', error);
    }
  }

  /**
   * Generar ID único para usuario
   */
  private generateUserId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `user-${timestamp}-${random}`;
  }

  /**
   * Generar ID único para nota
   */
  private generateNoteId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `note-${timestamp}-${random}`;
  }

  /**
   * Crear un nuevo usuario
   */
  saveUser(userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'notes'>): string {
    try {
      const userId = this.generateUserId();
      const now = new Date().toISOString();
      
      const newUser: UserData = {
        ...userData,
        id: userId,
        notes: [],
        isVerified: false,  // Por defecto los usuarios nuevos no están verificados
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      // Guardar en la base de datos principal
      const db = this.getAllUsersFromStorage();
      db[userId] = newUser;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));

      // Actualizar índice
      this.updateIndex();

      // Actualizar metadata
      const metadata = this.getMetadata();
      this.updateMetadata({
        totalUsers: (metadata.totalUsers || 0) + 1,
        activeUsers: newUser.isActive ? (metadata.activeUsers || 0) + 1 : metadata.activeUsers
      });

      return userId;
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios del storage
   */
  private getAllUsersFromStorage(): Record<string, UserData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error al obtener usuarios del storage:', error);
      return {};
    }
  }

  /**
   * Obtener todos los usuarios como array
   */
  getAllUsers(): UserData[] {
    try {
      const db = this.getAllUsersFromStorage();
      return Object.values(db);
    } catch (error) {
      console.error('Error al obtener todos los usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener usuario por ID
   */
  getUserById(userId: string): UserData | null {
    try {
      const db = this.getAllUsersFromStorage();
      return db[userId] || null;
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      return null;
    }
  }

  /**
   * Obtener usuario por username
   */
  getUserByUsername(username: string): UserData | null {
    try {
      const users = this.getAllUsers();
      return users.find(u => u.username === username) || null;
    } catch (error) {
      console.error('Error al obtener usuario por username:', error);
      return null;
    }
  }

  /**
   * Validar credenciales de usuario
   */
  validateCredentials(username: string, password: string): UserData | null {
    try {
      const user = this.getUserByUsername(username);
      if (!user) {
        return null; // Usuario no encontrado
      }
      
      // Validar contraseña
      if (user.password === password) {
        return user; // Credenciales válidas
      }
      
      return null; // Contraseña incorrecta
    } catch (error) {
      console.error('Error al validar credenciales:', error);
      return null;
    }
  }

  /**
   * Actualizar usuario existente
   */
  updateUser(userId: string, updates: Partial<UserData>): boolean {
    try {
      const db = this.getAllUsersFromStorage();
      const existingUser = db[userId];
      
      if (!existingUser) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        return false;
      }

      const updatedUser: UserData = {
        ...existingUser,
        ...updates,
        id: userId, // Asegurar que el ID no cambie
        updatedAt: new Date().toISOString(),
        version: existingUser.version + 1
      };

      db[userId] = updatedUser;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));

      // Actualizar índice
      this.updateIndex();

      // Actualizar metadata si cambió el estado activo
      if (updates.isActive !== undefined && updates.isActive !== existingUser.isActive) {
        const activeUsers = this.getAllUsers().filter(u => u.isActive).length;
        this.updateMetadata({ activeUsers });
      }

      return true;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return false;
    }
  }

  /**
   * Eliminar usuario
   */
  deleteUser(userId: string): boolean {
    try {
      const db = this.getAllUsersFromStorage();
      
      if (!db[userId]) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        return false;
      }

      const wasActive = db[userId].isActive;
      delete db[userId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));

      // Actualizar índice
      this.updateIndex();

      // Actualizar metadata
      const metadata = this.getMetadata();
      this.updateMetadata({
        totalUsers: (metadata.totalUsers || 0) - 1,
        activeUsers: wasActive ? (metadata.activeUsers || 0) - 1 : metadata.activeUsers
      });

      return true;
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return false;
    }
  }

  /**
   * Agregar nota/observación/amonestación a un usuario
   */
  addUserNote(
    userId: string, 
    tipo: 'observacion' | 'amonestacion' | 'pendiente',
    contenido: string,
    creadoPor: string
  ): boolean {
    try {
      const user = this.getUserById(userId);
      if (!user) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        return false;
      }

      const newNote: UserNote = {
        id: this.generateNoteId(),
        tipo,
        contenido,
        fecha: new Date().toISOString(),
        creadoPor
      };

      user.notes.push(newNote);
      return this.updateUser(userId, { notes: user.notes });
    } catch (error) {
      console.error('Error al agregar nota:', error);
      return false;
    }
  }

  /**
   * Obtener notas de un usuario
   */
  getUserNotes(userId: string): UserNote[] {
    try {
      const user = this.getUserById(userId);
      return user?.notes || [];
    } catch (error) {
      console.error('Error al obtener notas del usuario:', error);
      return [];
    }
  }

  /**
   * Eliminar una nota específica
   */
  deleteUserNote(userId: string, noteId: string): boolean {
    try {
      const user = this.getUserById(userId);
      if (!user) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        return false;
      }

      const filteredNotes = user.notes.filter(note => note.id !== noteId);
      return this.updateUser(userId, { notes: filteredNotes });
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      return false;
    }
  }

  /**
   * Actualizar índice de usuarios para búsquedas rápidas
   */
  private updateIndex(): void {
    try {
      const users = this.getAllUsers();
      const index: UserIndex[] = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }));

      localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Error al actualizar índice:', error);
    }
  }

  /**
   * Buscar usuarios por criterios
   */
  searchUsers(query: string): UserData[] {
    try {
      const users = this.getAllUsers();
      const lowerQuery = query.toLowerCase();
      
      return users.filter(user => 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.username.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        user.department.toLowerCase().includes(lowerQuery) ||
        user.role.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener usuarios activos
   */
  getActiveUsers(): UserData[] {
    try {
      return this.getAllUsers().filter(user => user.isActive);
    } catch (error) {
      console.error('Error al obtener usuarios activos:', error);
      return [];
    }
  }

  /**
   * Obtener usuarios inactivos
   */
  getInactiveUsers(): UserData[] {
    try {
      return this.getAllUsers().filter(user => !user.isActive);
    } catch (error) {
      console.error('Error al obtener usuarios inactivos:', error);
      return [];
    }
  }

  /**
   * Obtener usuarios por rol
   */
  getUsersByRole(role: string): UserData[] {
    try {
      return this.getAllUsers().filter(user => user.role === role);
    } catch (error) {
      console.error('Error al obtener usuarios por rol:', error);
      return [];
    }
  }

  /**
   * Obtener usuarios por departamento
   */
  getUsersByDepartment(department: string): UserData[] {
    try {
      return this.getAllUsers().filter(user => user.department === department);
    } catch (error) {
      console.error('Error al obtener usuarios por departamento:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  getUserStats(): {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
  } {
    try {
      const users = this.getAllUsers();
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: {} as Record<string, number>,
        byDepartment: {} as Record<string, number>
      };

      users.forEach(user => {
        stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
        stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {},
        byDepartment: {}
      };
    }
  }

  /**
   * Limpiar toda la base de datos de usuarios (CUIDADO)
   */
  clearAllUsers(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.INDEX_KEY);
      localStorage.removeItem(this.METADATA_KEY);
      this.initializeDatabase();
    } catch (error) {
      console.error('Error al limpiar base de datos:', error);
    }
  }

  /**
   * Exportar todos los usuarios a JSON
   */
  exportUsers(): string {
    try {
      const users = this.getAllUsers();
      return JSON.stringify(users, null, 2);
    } catch (error) {
      console.error('Error al exportar usuarios:', error);
      return '[]';
    }
  }

  /**
   * Importar usuarios desde JSON
   */
  importUsers(jsonData: string): boolean {
    try {
      const users: UserData[] = JSON.parse(jsonData);
      const db = this.getAllUsersFromStorage();
      
      users.forEach(user => {
        db[user.id] = user;
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));
      this.updateIndex();
      
      this.updateMetadata({
        totalUsers: Object.keys(db).length,
        activeUsers: Object.values(db).filter((u: any) => u.isActive).length
      });

      return true;
    } catch (error) {
      console.error('Error al importar usuarios:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const userStorage = new UserStorage();

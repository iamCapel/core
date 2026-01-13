import { User, UserCredentials, CreateUserData } from '../models/User';

/**
 * Interfaz abstracta para el repositorio de usuarios
 * Puede ser implementada por Firebase, API REST, o cualquier otro backend
 */
export interface IUserRepository {
  // Autenticación
  login(credentials: UserCredentials): Promise<User | null>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  
  // CRUD de usuarios
  createUser(userData: CreateUserData): Promise<User>;
  getUser(username: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(username: string, updates: Partial<User>): Promise<void>;
  deleteUser(username: string): Promise<void>;
  
  // Verificación
  verifyUser(username: string): Promise<void>;
  
  // Búsqueda
  searchUsers(filters: Partial<User>): Promise<User[]>;
}

/**
 * Implementación por defecto usando los servicios existentes
 */
export class UserRepository implements IUserRepository {
  constructor(
    private firebaseStorage: any,
    private localStorageBackup: any
  ) {}

  async login(credentials: UserCredentials): Promise<User | null> {
    try {
      return await this.firebaseStorage.loginWithUsername(
        credentials.username,
        credentials.password
      );
    } catch (error) {
      console.error('Error en login:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.firebaseStorage.logout();
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    return await this.firebaseStorage.createUser(userData);
  }

  async getUser(username: string): Promise<User | null> {
    return await this.firebaseStorage.getUser(username);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.firebaseStorage.getAllUsers();
  }

  async updateUser(username: string, updates: Partial<User>): Promise<void> {
    await this.firebaseStorage.updateUser(username, updates);
  }

  async deleteUser(username: string): Promise<void> {
    await this.firebaseStorage.deleteUser(username);
  }

  async verifyUser(username: string): Promise<void> {
    await this.firebaseStorage.verifyUser(username);
  }

  async searchUsers(filters: Partial<User>): Promise<User[]> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(user => {
      return Object.keys(filters).every(key => {
        return user[key as keyof User] === filters[key as keyof User];
      });
    });
  }
}

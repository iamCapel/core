import { IUserRepository } from '../repositories/UserRepository';
import { User, UserCredentials, CreateUserData } from '../models/User';
import { UserRole } from '../../types/userRoles';

/**
 * Controlador de autenticación y gestión de usuarios
 * Contiene toda la lógica de negocio independiente de la UI
 */
export class AuthController {
  constructor(private userRepository: IUserRepository) {}

  /**
   * Iniciar sesión
   */
  async login(credentials: UserCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!credentials.username || !credentials.password) {
        return { success: false, error: 'Usuario y contraseña son requeridos' };
      }

      const user = await this.userRepository.login(credentials);
      
      if (!user) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      if (!user.isVerified) {
        return { success: false, error: 'Usuario pendiente de verificación por el administrador' };
      }

      // Guardar usuario actual en localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: error.message || 'Error al iniciar sesión' };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    await this.userRepository.logout();
    localStorage.removeItem('currentUser');
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.userRepository.getCurrentUser();
  }

  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Verificar rol del usuario
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Verificar si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  /**
   * Verificar permisos para acceder a un recurso
   */
  canAccessResource(resourceOwnerId: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Admins pueden acceder a todo
    if (this.isAdmin()) return true;

    // Técnicos solo pueden acceder a sus propios recursos
    if (user.role === UserRole.TECNICO) {
      return user.username === resourceOwnerId;
    }

    return true;
  }
}

export class UserController {
  constructor(
    private userRepository: IUserRepository,
    private emailService?: any
  ) {}

  /**
   * Crear nuevo usuario
   */
  async createUser(userData: CreateUserData, sendEmail: boolean = true): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Validaciones
      if (!userData.username || !userData.password || !userData.email || !userData.name) {
        return { success: false, error: 'Todos los campos son obligatorios' };
      }

      if (userData.password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.getUser(userData.username);
      if (existingUser) {
        return { success: false, error: 'El nombre de usuario ya está en uso' };
      }

      // Crear usuario
      const user = await this.userRepository.createUser(userData);

      // Enviar email de bienvenida si está configurado
      if (sendEmail && this.emailService) {
        try {
          await this.emailService.sendWelcomeEmail({
            to: user.email!,
            username: user.username,
            password: userData.password,
            name: user.name
          });
        } catch (emailError) {
          console.error('Error enviando email:', emailError);
          // No fallar la creación si el email falla
        }
      }

      return { success: true, user };
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      return { success: false, error: error.message || 'Error al crear usuario' };
    }
  }

  /**
   * Obtener todos los usuarios
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.getAllUsers();
  }

  /**
   * Obtener un usuario específico
   */
  async getUser(username: string): Promise<User | null> {
    return await this.userRepository.getUser(username);
  }

  /**
   * Actualizar usuario
   */
  async updateUser(username: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      await this.userRepository.updateUser(username, updates);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al actualizar usuario' };
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.userRepository.deleteUser(username);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al eliminar usuario' };
    }
  }

  /**
   * Verificar usuario
   */
  async verifyUser(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.userRepository.verifyUser(username);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al verificar usuario' };
    }
  }

  /**
   * Buscar usuarios por filtros
   */
  async searchUsers(filters: Partial<User>): Promise<User[]> {
    return await this.userRepository.searchUsers(filters);
  }

  /**
   * Reenviar credenciales por correo
   */
  async resendCredentials(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.userRepository.getUser(username);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (!this.emailService) {
        return { success: false, error: 'Servicio de email no configurado' };
      }

      await this.emailService.sendWelcomeEmail({
        to: user.email!,
        username: user.username,
        password: password,
        name: user.name
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al enviar credenciales' };
    }
  }
}

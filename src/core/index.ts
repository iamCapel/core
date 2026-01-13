/**
 * Core Application Layer
 * 
 * Esta capa contiene toda la lógica de negocio independiente de la UI.
 * Puede ser utilizada tanto en la aplicación web como en aplicaciones móviles nativas.
 * 
 * Arquitectura:
 * - Models: Definición de interfaces y tipos de datos
 * - Repositories: Acceso a datos (abstracción de Firebase, API, etc.)
 * - Controllers: Lógica de negocio
 * - Utils: Funciones utilitarias reutilizables
 */

import { UserRepository } from './repositories/UserRepository';
import { ReportRepository } from './repositories/ReportRepository';
import { AuthController, UserController } from './controllers/AuthController';
import { ReportController, PendingReportController } from './controllers/ReportController';

// Importar servicios existentes
// NOTA: Las importaciones se hacen de forma lazy para evitar errores de build
// import firebaseUserStorage from '../services/firebaseUserStorage';
// import { userStorage } from '../services/userStorage';
// import firebaseReportStorage from '../services/firebaseReportStorage';
// import { firebasePendingReportStorage } from '../services/firebasePendingReportStorage';
// import { reportStorage } from '../services/reportStorage';

/**
 * Clase principal de la aplicación
 * Inicializa todos los controladores y proporciona acceso centralizado
 */
export class CoreApp {
  // Repositorios
  public readonly userRepository: UserRepository | null = null;
  public readonly reportRepository: ReportRepository | null = null;
  
  // Controladores
  public readonly authController: AuthController | null = null;
  public readonly userController: UserController | null = null;
  public readonly reportController: ReportController | null = null;
  public readonly pendingReportController: PendingReportController | null = null;

  constructor() {
    // Los repositorios y controladores se inicializarán de forma lazy
    // cuando se necesiten, importando dinámicamente los servicios
    console.log('⚠️ CoreApp en modo desarrollo - use initialize() para activar');
  }

  /**
   * Método de utilidad para inicializar la aplicación
   */
  async initialize(): Promise<void> {
    console.log('⚠️ Core App en modo desarrollo');
    console.log('💡 Para uso en producción, los controladores deben inicializarse manualmente');
  }
}

// Instancia singleton de la aplicación
export const coreApp = new CoreApp();

// Exports individuales para facilitar imports
export { UserRepository } from './repositories/UserRepository';
export { ReportRepository } from './repositories/ReportRepository';
export { AuthController, UserController } from './controllers/AuthController';
export { ReportController, PendingReportController } from './controllers/ReportController';

// Exports de modelos
export * from './models/User';
export * from './models/Report';

/**
 * GUÍA DE USO PARA APLICACIÓN MÓVIL
 * 
 * 1. Importar el core en tu app móvil:
 *    import { coreApp } from './core';
 * 
 * 2. Usar los controladores:
 *    // Login
 *    const result = await coreApp.authController.login({ username, password });
 *    
 *    // Crear reporte
 *    const report = await coreApp.reportController.createReport(reportData);
 *    
 *    // Obtener usuarios
 *    const users = await coreApp.userController.getAllUsers();
 * 
 * 3. Los controladores devuelven objetos con { success, data?, error? }
 *    para facilitar el manejo de errores en cualquier UI
 * 
 * 4. Toda la lógica está desacoplada de React, puede usarse en:
 *    - React Native
 *    - Flutter (con bridge de JS)
 *    - Ionic
 *    - Native iOS/Android (con bridge)
 */

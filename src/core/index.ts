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
import firebaseUserStorage from '../services/firebaseUserStorage';
import { userStorage } from '../services/userStorage';
import firebaseReportStorage from '../services/firebaseReportStorage';
import { firebasePendingReportStorage } from '../services/firebasePendingReportStorage';
import { reportStorage } from '../services/reportStorage';

/**
 * Clase principal de la aplicación
 * Inicializa todos los controladores y proporciona acceso centralizado
 */
export class CoreApp {
  // Repositorios
  public readonly userRepository: UserRepository;
  public readonly reportRepository: ReportRepository;
  
  // Controladores
  public readonly authController: AuthController;
  public readonly userController: UserController;
  public readonly reportController: ReportController;
  public readonly pendingReportController: PendingReportController;

  constructor() {
    // Inicializar repositorios
    this.userRepository = new UserRepository(
      firebaseUserStorage,
      userStorage
    );

    this.reportRepository = new ReportRepository(
      firebaseReportStorage,
      firebasePendingReportStorage,
      reportStorage
    );

    // Inicializar controladores
    this.authController = new AuthController(this.userRepository);
    this.userController = new UserController(this.userRepository);
    this.reportController = new ReportController(this.reportRepository);
    this.pendingReportController = new PendingReportController(this.reportRepository);
  }

  /**
   * Método de utilidad para inicializar la aplicación
   */
  async initialize(): Promise<void> {
    console.log('✅ Core App initialized');
    console.log('📦 Available controllers:', {
      auth: !!this.authController,
      user: !!this.userController,
      report: !!this.reportController,
      pendingReport: !!this.pendingReportController
    });
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

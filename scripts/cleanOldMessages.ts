/**
 * Script para limpiar mensajes antiguos del chat
 * 
 * Este script elimina todos los mensajes con más de 7 días de antigüedad
 * para mantener el almacenamiento bajo control.
 * 
 * Uso:
 * - Ejecutar manualmente: npx ts-node scripts/cleanOldMessages.ts
 * - Programar con cron (ejecutar cada día a las 3AM):
 *   0 3 * * * cd /path/to/project && npx ts-node scripts/cleanOldMessages.ts
 * 
 * También se puede ejecutar automáticamente al iniciar sesión
 * integrándolo en el Dashboard.
 */

import { chatService } from '../src/services/chatService';

async function cleanMessages() {
  console.log('🧹 Iniciando limpieza de mensajes antiguos...');
  console.log(`📅 Fecha actual: ${new Date().toLocaleString()}`);
  console.log('🗑️  Eliminando mensajes con más de 7 días...\n');

  try {
    await chatService.cleanOldMessages();
    console.log('\n✅ Limpieza completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar la limpieza
cleanMessages();

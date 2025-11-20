/**
 * Script para crear el usuario super directamente en localStorage
 * Ejecutar en la consola del navegador: copy(createSuperUser)
 * Luego pegar en la consola y presionar Enter
 */

function createSuperUser() {
    try {
        console.log('🔧 Iniciando creación del usuario super...');
        
        // Inicializar userStorage si no existe
        let userStorageData = localStorage.getItem('mopc_users_db');
        let userStorage = {};
        
        if (userStorageData) {
            userStorage = JSON.parse(userStorageData);
        } else {
            // Inicializar base de datos
            localStorage.setItem('mopc_users_db', JSON.stringify({}));
            localStorage.setItem('mopc_users_index', JSON.stringify([]));
            
            const metadata = {
                version: 1,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                totalUsers: 0,
                activeUsers: 0
            };
            localStorage.setItem('mopc_users_metadata', JSON.stringify(metadata));
            console.log('✅ Base de datos userStorage inicializada');
        }

        // Verificar si el usuario super ya existe
        const existingSuperUser = Object.values(userStorage).find(u => u.username === 'super');
        
        if (existingSuperUser) {
            console.log('⚠️ El usuario "super" ya existe. Actualizando credenciales...');
            // Actualizar contraseña si ya existe
            existingSuperUser.password = '02260516';
            existingSuperUser.isActive = true;
            existingSuperUser.isVerified = true;
            existingSuperUser.role = 'Administrador';
            existingSuperUser.updatedAt = new Date().toISOString();
            existingSuperUser.version = (existingSuperUser.version || 0) + 1;
            
            userStorage[existingSuperUser.id] = existingSuperUser;
            localStorage.setItem('mopc_users_db', JSON.stringify(userStorage));
            
            console.log('✅ Usuario "super" actualizado con nueva contraseña');
            return '✅ Usuario "super" actualizado exitosamente';
        }

        // Crear ID único para el usuario
        const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();

        // Crear el usuario super
        const superUser = {
            id: userId,
            username: 'super',
            password: '02260516',
            name: 'Administrador Super',
            email: 'admin@mopc.gob.do',
            phone: '',
            cedula: '000-0000000-0',
            role: 'Administrador',
            department: 'Dirección de Coordinación Regional',
            isActive: true,
            isVerified: true,
            lastSeen: now,
            joinDate: now,
            avatar: '',
            currentLocation: {
                province: 'Distrito Nacional',
                municipality: 'Santo Domingo',
                coordinates: {
                    lat: 18.4861,
                    lng: -69.9312
                },
                lastUpdated: now
            },
            reportsCount: 0,
            pendingReportsCount: 0,
            notes: [],
            createdAt: now,
            updatedAt: now,
            createdBy: 'system',
            version: 1
        };

        // Guardar en userStorage
        userStorage[userId] = superUser;
        localStorage.setItem('mopc_users_db', JSON.stringify(userStorage));

        // Actualizar índice
        const indexData = localStorage.getItem('mopc_users_index');
        let index = indexData ? JSON.parse(indexData) : [];
        
        // Remover usuario super existente del índice si existe
        index = index.filter(u => u.username !== 'super');
        
        index.push({
            id: userId,
            username: 'super',
            name: 'Administrador Super',
            email: 'admin@mopc.gob.do',
            role: 'Administrador',
            department: 'Dirección de Coordinación Regional',
            isActive: true
        });
        localStorage.setItem('mopc_users_index', JSON.stringify(index));

        // Actualizar metadata
        const metadataData = localStorage.getItem('mopc_users_metadata');
        const metadata = metadataData ? JSON.parse(metadataData) : {
            version: 1,
            createdAt: now,
            totalUsers: 0,
            activeUsers: 0
        };
        
        metadata.totalUsers = Object.keys(userStorage).length;
        metadata.activeUsers = Object.values(userStorage).filter(u => u.isActive).length;
        metadata.lastModified = now;
        localStorage.setItem('mopc_users_metadata', JSON.stringify(metadata));

        console.log('✅ Usuario "super" creado exitosamente');
        console.log('📋 Credenciales:');
        console.log('   Usuario: super');
        console.log('   Contraseña: 02260516');
        
        return '✅ Usuario "super" creado exitosamente. Credenciales: super/02260516';

    } catch (error) {
        console.error('❌ Error al crear el usuario:', error);
        return '❌ Error: ' + error.message;
    }
}

// Para ejecutar directamente:
// createSuperUser();

console.log('🚀 Script cargado. Ejecuta createSuperUser() para crear el usuario.');
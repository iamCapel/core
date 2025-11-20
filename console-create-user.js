// Ejecutar en la consola del navegador cuando estés en http://localhost:3000
// Copiar y pegar todo este código en la consola y presionar Enter

console.log('🔧 Iniciando creación del usuario super...');

// Crear instancia de UserStorage usando la misma clase que usa la aplicación
class UserStorageForConsole {
    constructor() {
        this.STORAGE_KEY = 'mopc_users_db';
        this.INDEX_KEY = 'mopc_users_index';
        this.METADATA_KEY = 'mopc_users_metadata';
        this.VERSION = 1;
        this.initializeDatabase();
    }

    initializeDatabase() {
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

    getMetadata() {
        try {
            const metadata = localStorage.getItem(this.METADATA_KEY);
            return metadata ? JSON.parse(metadata) : null;
        } catch (error) {
            console.error('Error al obtener metadata:', error);
            return null;
        }
    }

    updateMetadata(updates) {
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

    generateUserId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `user-${timestamp}-${random}`;
    }

    getAllUsersFromStorage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error al obtener usuarios del storage:', error);
            return {};
        }
    }

    getAllUsers() {
        try {
            const db = this.getAllUsersFromStorage();
            return Object.values(db);
        } catch (error) {
            console.error('Error al obtener todos los usuarios:', error);
            return [];
        }
    }

    getUserByUsername(username) {
        try {
            const users = this.getAllUsers();
            return users.find(u => u.username === username) || null;
        } catch (error) {
            console.error('Error al obtener usuario por username:', error);
            return null;
        }
    }

    updateIndex() {
        try {
            const users = this.getAllUsers();
            const index = users.map(user => ({
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

    saveUser(userData) {
        try {
            const userId = this.generateUserId();
            const now = new Date().toISOString();
            
            const newUser = {
                ...userData,
                id: userId,
                notes: [],
                isVerified: true,
                createdAt: now,
                updatedAt: now,
                version: 1
            };

            const db = this.getAllUsersFromStorage();
            db[userId] = newUser;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));

            this.updateIndex();

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

    validateCredentials(username, password) {
        try {
            const user = this.getUserByUsername(username);
            if (!user) {
                return null;
            }
            
            if (user.password === password) {
                return user;
            }
            
            return null;
        } catch (error) {
            console.error('Error al validar credenciales:', error);
            return null;
        }
    }
}

// Crear instancia y usuario
const tempUserStorage = new UserStorageForConsole();

// Verificar si ya existe
const existingUser = tempUserStorage.getUserByUsername('super');
if (existingUser) {
    console.log('⚠️ El usuario "super" ya existe. Actualizando contraseña...');
    
    // Actualizar usuario existente
    const db = tempUserStorage.getAllUsersFromStorage();
    existingUser.password = '02260516';
    existingUser.isActive = true;
    existingUser.isVerified = true;
    existingUser.role = 'Administrador';
    existingUser.updatedAt = new Date().toISOString();
    existingUser.version = (existingUser.version || 0) + 1;
    
    db[existingUser.id] = existingUser;
    localStorage.setItem('mopc_users_db', JSON.stringify(db));
    
    console.log('✅ Usuario "super" actualizado con nueva contraseña');
} else {
    console.log('🚀 Creando usuario "super"...');
    
    // Datos del nuevo usuario
    const userData = {
        username: 'super',
        password: '02260516',
        name: 'Administrador Super',
        email: 'admin@mopc.gob.do',
        phone: '',
        cedula: '000-0000000-0',
        role: 'Administrador',
        department: 'Dirección de Coordinación Regional',
        isActive: true,
        lastSeen: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        avatar: '',
        currentLocation: {
            province: 'Distrito Nacional',
            municipality: 'Santo Domingo',
            coordinates: {
                lat: 18.4861,
                lng: -69.9312
            },
            lastUpdated: new Date().toISOString()
        },
        reportsCount: 0,
        pendingReportsCount: 0,
        createdBy: 'console-script'
    };

    // Crear el usuario
    const userId = tempUserStorage.saveUser(userData);
    console.log(`✅ Usuario "super" creado exitosamente con ID: ${userId}`);
}

// Probar login
const loginTest = tempUserStorage.validateCredentials('super', '02260516');
if (loginTest) {
    console.log('✅ LOGIN TEST EXITOSO: Usuario "super" puede iniciar sesión con contraseña "02260516"');
    console.log('📋 Detalles del usuario:', {
        username: loginTest.username,
        name: loginTest.name,
        role: loginTest.role,
        isActive: loginTest.isActive,
        isVerified: loginTest.isVerified
    });
} else {
    console.log('❌ LOGIN TEST FALLÓ: Hay un problema con las credenciales');
}

// Mostrar resumen
const allUsers = tempUserStorage.getAllUsers();
console.log(`📊 Total de usuarios en el sistema: ${allUsers.length}`);
console.log('👥 Usuarios registrados:', allUsers.map(u => `${u.username} (${u.role})`));

console.log('\n🎉 ¡Proceso completado! Ahora puedes iniciar sesión con:');
console.log('   Usuario: super');
console.log('   Contraseña: 02260516');
console.log('\n🔄 Recarga la página e intenta iniciar sesión.');
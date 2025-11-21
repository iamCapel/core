const path = require('path');
const fs = require('fs');

const firebaseUserStorage = require(path.resolve(__dirname, '../src/services/firebaseUserStorage.js'));
const saveUser = firebaseUserStorage.saveUser;

const users = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/config/userstorage.json'), 'utf8'));

(async function migrateUsers() {
  for (const user of users) {
    const userData = {
      username: user.username,
      password: user.password,
      name: user.name || user.username,
      email: user.email || '',
      role: user.role || 'tecnico',
      isActive: true,
      isVerified: true,
      department: user.department || '',
      lastSeen: '',
      joinDate: '',
      avatar: '',
      currentLocation: { province: '', municipality: '', coordinates: { lat: 0, lng: 0 }, lastUpdated: '' },
      reportsCount: 0,
      pendingReportsCount: 0,
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'migration-script',
      version: 1
    };
    await saveUser(userData);
    console.log(`Usuario migrado: ${user.username}`);
  }
  console.log('Migración de usuarios a Firestore completada.');
})();
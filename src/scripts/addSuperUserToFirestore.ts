import { saveUser } from '../services/firebaseUserStorage';

async function addSuperUser() {
    const superUser = {
        username: 'super',
        password: '02260516',
        name: 'Super Administrador',
        role: 'admin',
        isActive: true
    };
    await saveUser(superUser);
    console.log('Usuario super agregado a Firestore');
}

addSuperUser();

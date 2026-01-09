import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";

const USERS_COLLECTION = "users";

export interface UserData {
  id: string;
  username: string;
  email: string;
  name: string;
  phone?: string;
  cedula?: string;
  role: string;
  department: string;
  isActive: boolean;
  isVerified: boolean;
  lastSeen: string;
  joinDate: string;
  avatar?: string;
  currentLocation: {
    province: string;
    municipality: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    lastUpdated: string;
  };
  reportsCount: number;
  pendingReportsCount?: number;
  notes?: Array<{
    id: string;
    tipo: string;
    contenido: string;
    creadoPor: string;
    fecha: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
}

// Crear usuario con Firebase Authentication + Firestore
export async function createUser(userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt' | 'version'>, password: string) {
  try {
    // 1. Crear usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const uid = userCredential.user.uid;
    
    // 2. Guardar datos adicionales en Firestore
    const now = new Date().toISOString();
    const userDoc: UserData = {
      id: uid,
      ...userData,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
    
    await setDoc(doc(db, USERS_COLLECTION, uid), userDoc);
    
    return { success: true, userId: uid };
  } catch (error: any) {
    console.error("Error creando usuario:", error);
    return { success: false, error: error.message };
  }
}

// Login con Firebase Authentication usando email
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Obtener datos adicionales de Firestore
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    
    if (userDoc.exists()) {
      return { success: true, user: userDoc.data() };
    } else {
      return { success: false, error: "Usuario no encontrado en Firestore" };
    }
  } catch (error: any) {
    console.error("Error en login:", error);
    return { success: false, error: error.message };
  }
}

// Login con username (busca el email y luego hace login)
export async function loginWithUsername(username: string, password: string) {
  try {
    // Buscar el usuario por username para obtener su email
    const user = await getUserByUsername(username);
    
    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }
    
    // Hacer login con el email encontrado
    return await loginUser(user.email, password);
  } catch (error: any) {
    console.error("Error en login con username:", error);
    return { success: false, error: error.message };
  }
}

// Cerrar sesión
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error("Error cerrando sesión:", error);
    return { success: false, error: error.message };
  }
}

// Obtener usuario por username
export async function getUserByUsername(username: string) {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("username", "==", username));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as UserData;
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
}

// Obtener usuario por ID
export async function getUserById(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
}

// Obtener todos los usuarios
export async function getAllUsers() {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as UserData);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return [];
  }
}

// Actualizar usuario
export async function updateUser(userId: string, updates: Partial<UserData>) {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (updates.version || 1) + 1
    };
    
    await updateDoc(userRef, updatedData);
    return { success: true };
  } catch (error: any) {
    console.error("Error actualizando usuario:", error);
    return { success: false, error: error.message };
  }
}

// Eliminar usuario
export async function deleteUser(userId: string) {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    return { success: true };
  } catch (error: any) {
    console.error("Error eliminando usuario:", error);
    return { success: false, error: error.message };
  }
}

// Guardar/crear usuario (wrapper para compatibilidad)
export async function saveUser(user: any) {
  const userRef = doc(collection(db, USERS_COLLECTION));
  const now = new Date().toISOString();
  
  const userData: UserData = {
    id: userRef.id,
    username: user.username,
    email: user.email,
    name: user.name,
    phone: user.phone,
    cedula: user.cedula,
    role: user.role,
    department: user.department,
    isActive: user.isActive !== undefined ? user.isActive : true,
    isVerified: user.isVerified !== undefined ? user.isVerified : false,
    lastSeen: user.lastSeen || 'Nunca',
    joinDate: user.joinDate || now,
    avatar: user.avatar,
    currentLocation: user.currentLocation,
    reportsCount: user.reportsCount || 0,
    pendingReportsCount: user.pendingReportsCount || 0,
    notes: user.notes || [],
    createdAt: now,
    updatedAt: now,
    createdBy: user.createdBy || 'system',
    version: 1
  };
  
  await setDoc(userRef, userData);
  return userRef.id;
}

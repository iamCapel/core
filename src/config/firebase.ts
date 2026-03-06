import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
// import { getAnalytics } from "firebase/analytics"; // Solo si usas analytics

const firebaseConfig = {
  apiKey: "AIzaSyBULoCr78BEnY8ovO1AdXvrn1JYfDqud6c",
  authDomain: "coredatabase-206ac.firebaseapp.com",
  databaseURL: "https://coredatabase-206ac-default-rtdb.firebaseio.com", // URL de Realtime Database
  projectId: "coredatabase-206ac",
  storageBucket: "coredatabase-206ac.firebasestorage.app",
  messagingSenderId: "204486232524",
  appId: "1:204486232524:web:d705e374692a8290fb3569",
  measurementId: "G-WWS6LZ5WR1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app); // Exportar Realtime Database
// const analytics = getAnalytics(app); // Solo si usas analytics

export default app;

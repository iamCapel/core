import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Solo si usas analytics

const firebaseConfig = {
  apiKey: "AIzaSyBULoCr78BEnY8ovO1AdXvrn1JYfDqud6c",
  authDomain: "coredatabase-206ac.firebaseapp.com",
  projectId: "coredatabase-206ac",
  storageBucket: "coredatabase-206ac.firebasestorage.app",
  messagingSenderId: "204486232524",
  appId: "1:204486232524:web:d705e374692a8290fb3569",
  measurementId: "G-WWS6LZ5WR1"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Solo si usas analytics

export default app;

import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Solo si usas analytics

const firebaseConfig = {
  apiKey: "AIzaSyCPEi2V-ov7RcCkAbxcu1CQ-DoAnc9y4f0",
  authDomain: "mopc-0-1.firebaseapp.com",
  projectId: "mopc-0-1",
  storageBucket: "mopc-0-1.firebasestorage.app",
  messagingSenderId: "162210522832",
  appId: "1:162210522832:web:f49b27d18ed99497b920d5",
  measurementId: "G-CNVYCZ68QX"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Solo si usas analytics

export default app;

import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import app from "../config/firebase";

const db = getFirestore(app);
const USERS_COLLECTION = "users";

export async function getUserByUsername(username: string) {
  const q = query(collection(db, USERS_COLLECTION), where("username", "==", username));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

export async function saveUser(user: any) {
  const userRef = doc(collection(db, USERS_COLLECTION));
  await setDoc(userRef, user);
  return userRef.id;
}

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map(doc => doc.data());
}

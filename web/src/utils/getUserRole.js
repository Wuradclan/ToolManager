// src/utils/getUserRole.js
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export const getUserRole = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().role || null;
  }
  return null;
};
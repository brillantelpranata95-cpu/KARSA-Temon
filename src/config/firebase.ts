import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDAA8EB5F553a8FRBQY_FQCIYVCVlzqXmc",
  authDomain: "karsa-temon.firebaseapp.com",
  projectId: "karsa-temon",
  storageBucket: "karsa-temon.firebasestorage.app",
  messagingSenderId: "462979975007",
  appId: "1:462979975007:web:fe41cf1ae55df0b7c658ea",
  measurementId: "G-C7YNH8W34S"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics support check
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { UserProfile } from "../types";
import { getOrCreateUserProfile, seedMasterDataIfEmpty } from "../services/api";

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Seeding menulis ke Firestore, sehingga hanya boleh dijalankan setelah
  // pengguna terautentikasi (aturan keamanan mensyaratkan request.auth != null).
  const seedDoneRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Sinkronkan master data sekali per sesi, setelah login terkonfirmasi,
        // supaya tipe dokumen baru (mis. Lampiran Foto) pasti terdaftar.
        if (!seedDoneRef.current) {
          seedDoneRef.current = true;
          seedMasterDataIfEmpty().catch(err => console.warn("Background seed attempt warning:", err));
        }
        try {
          const profile = await getOrCreateUserProfile(fbUser);
          setUser(profile);
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUser(null);
        }
      } else {
        // Logout: izinkan sinkronisasi ulang pada sesi berikutnya.
        seedDoneRef.current = false;
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_firebase_api_key_here" &&
  firebaseConfig.projectId
);

let app: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }
}

export { auth };
export type { FirebaseUser };

export async function firebaseSignIn(email: string, pass: string) {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function firebaseSignUp(email: string, pass: string, displayName?: string) {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function firebaseSignInGoogle() {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return await signInWithPopup(auth, provider);
}

export async function firebaseSignOut() {
  if (auth) {
    await signOut(auth);
  }
}

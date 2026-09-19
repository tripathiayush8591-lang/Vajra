import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  isFirebaseConfigured,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignInGoogle,
  firebaseSignOut,
  FirebaseUser,
} from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

export type UserRole = "citizen" | "authority";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  designation?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  loginWithEmail: (email: string, pass: string, role: UserRole) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, role: UserRole, name?: string, designation?: string) => Promise<void>;
  loginWithGoogle: (role: UserRole) => Promise<void>;
  loginDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = "civicpulse_auth_user";
const PENDING_ROLE_KEY = "civicpulse_pending_role";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const pendingRole = (localStorage.getItem(PENDING_ROLE_KEY) as UserRole) || null;
          const savedStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          let assignedRole: UserRole = pendingRole || "citizen";
          let existingDesignation: string | undefined;

          if (savedStr) {
            try {
              const parsed = JSON.parse(savedStr);
              if (parsed.uid === fbUser.uid) {
                if (!pendingRole) {
                  assignedRole = parsed.role || "citizen";
                }
                existingDesignation = parsed.designation;
              }
            } catch {}
          }

          if (pendingRole) {
            localStorage.removeItem(PENDING_ROLE_KEY);
          }

          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || "user@indore.gov.in",
            displayName: fbUser.displayName || (assignedRole === "authority" ? "Municipal Official" : "Indore Citizen"),
            role: assignedRole,
            designation: assignedRole === "authority" ? (existingDesignation || "Zonal Officer • Zone 3") : undefined,
            isDemo: false,
          };
          setUser(profile);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        } else {
          // If no fbUser and current user is not a demo user, clear
          const savedStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (savedStr) {
            try {
              const parsed = JSON.parse(savedStr);
              if (!parsed.isDemo) {
                setUser(null);
                localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
              }
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithEmail = async (email: string, pass: string, role: UserRole) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        localStorage.setItem(PENDING_ROLE_KEY, role);
        const cred = await firebaseSignIn(email, pass);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: cred.user.displayName || (role === "authority" ? "Municipal Officer" : "Indore Citizen"),
          role,
          designation: role === "authority" ? "Zonal Officer" : undefined,
          isDemo: false,
        };
        setUser(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      } else {
        throw new Error("Firebase Auth is not initialized. Please verify your .env configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    role: UserRole,
    name?: string,
    designation?: string
  ) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        localStorage.setItem(PENDING_ROLE_KEY, role);
        const cred = await firebaseSignUp(email, pass, name);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: name || cred.user.displayName || (role === "authority" ? "Municipal Officer" : "Indore Citizen"),
          role,
          designation: role === "authority" ? (designation || "Municipal Official") : undefined,
          isDemo: false,
        };
        setUser(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      } else {
        throw new Error("Firebase Auth is not initialized.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (role: UserRole) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        localStorage.setItem(PENDING_ROLE_KEY, role);
        const cred = await firebaseSignInGoogle();
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || "",
          displayName: cred.user.displayName || (role === "authority" ? "Municipal Official" : "Indore Citizen"),
          role,
          designation: role === "authority" ? "Zonal Officer • Zone 3" : undefined,
          isDemo: false,
        };
        setUser(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      } else {
        throw new Error("Firebase Auth is not configured. Please check .env.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (role: UserRole) => {
    const profile: UserProfile =
      role === "authority"
        ? {
            uid: "demo-authority-01",
            email: "officer.saxena@indore.gov.in",
            displayName: "Er. Ashish Saxena",
            role: "authority",
            designation: "Zonal Officer • Zone 3 (Palasia / AB Road)",
            isDemo: true,
          }
        : {
            uid: "demo-citizen-01",
            email: "citizen.rahul@gmail.com",
            displayName: "Rahul Verma",
            role: "citizen",
            designation: "Resident • Ward 24 Vijay Nagar",
            isDemo: true,
          };
    setUser(profile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  };

  const logout = async () => {
    try {
      if (auth && user && !user.isDemo) {
        await firebaseSignOut();
      }
    } catch {}
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        loading,
        isConfigured: isFirebaseConfigured,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

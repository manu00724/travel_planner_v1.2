import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { UserProfile } from '../types';
import { DEMO_USERS } from '../utils/mockData';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  switchPersona: (user: UserProfile) => void;
  updateProfile: (name: string, avatarUrl?: string) => void;
  signInQuick: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'triptogether_current_user';
const PENDING_INVITE_KEY = 'triptogether_pending_invite';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEMO_USERS[0]; // Default to Elena Rossi for immediate friendliness
  });

  const [loading, setLoading] = useState(false);
  const [pendingInviteCode, setPendingInviteCodeState] = useState<string | null>(() => {
    return localStorage.getItem(PENDING_INVITE_KEY) || null;
  });

  const setPendingInviteCode = (code: string | null) => {
    setPendingInviteCodeState(code);
    if (code) {
      localStorage.setItem(PENDING_INVITE_KEY, code);
    } else {
      localStorage.removeItem(PENDING_INVITE_KEY);
    }
  };

  const switchPersona = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  };

  const updateProfile = (name: string, avatarUrl?: string) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      displayName: name || currentUser.displayName,
      avatarUrl: avatarUrl || currentUser.avatarUrl,
    };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  };

  const signInQuick = async (name: string) => {
    setLoading(true);
    try {
      let uid = 'usr_' + Math.random().toString(36).substring(2, 9);
      if (isFirebaseConfigured) {
        try {
          const cred = await signInAnonymously(auth);
          uid = cred.user.uid;
        } catch (e) {
          console.warn('Anonymous auth fallback:', e);
        }
      }

      const newUser: UserProfile = {
        id: uid,
        displayName: name.trim() || 'Traveler',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        isAnonymous: true,
      };

      setCurrentUser(newUser);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (isFirebaseConfigured) {
      try {
        await fbSignOut(auth);
      } catch (_) {}
    }
    // Set to next user or empty
    setCurrentUser(DEMO_USERS[1]);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEMO_USERS[1]));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        switchPersona,
        updateProfile,
        signInQuick,
        signOut,
        pendingInviteCode,
        setPendingInviteCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

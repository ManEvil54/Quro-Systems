// ============================================================
// Quro — Firebase Auth Context Provider
// Manages authentication state across the entire app
// ============================================================
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Staff, StaffRole } from '@/lib/firebase/types';

interface AuthState {
  user: User | null;
  staff: Staff | null;
  organization: { id: string; name: string } | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: StaffRole;
  credential?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

import OnboardingModal from '@/components/auth/OnboardingModal';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    staff: null,
    organization: null,
    loading: true,
    error: null,
  });

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Fetch User Metadata (to get org_id)
          const userMetaDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userMetaDoc.exists()) {
            setState(prev => ({ ...prev, user, loading: false }));
            return;
          }
          
          const { org_id } = userMetaDoc.data();

          // 2. Fetch staff profile
          const staffDoc = await getDoc(doc(db, 'organizations', org_id, 'staff', user.uid));
          const staffData = staffDoc.exists()
            ? ({ id: staffDoc.id, ...staffDoc.data() } as Staff)
            : null;

          // 3. Fetch Organization Details
          const orgDoc = await getDoc(doc(db, 'organizations', org_id));
          const orgData = orgDoc.exists() 
            ? { id: orgDoc.id, name: orgDoc.data().name } 
            : { id: org_id, name: 'Quro Facility' };

          // HIPAA: Security Access Revocation & Shift Expiration
          const isExpired = staffData?.access_expires_at && new Date() > new Date(staffData.access_expires_at);
          if (staffData && (!staffData.is_active || isExpired)) {
            await firebaseSignOut(auth);
            const reason = isExpired ? 'Your shift access has expired.' : 'Access revoked. Contact your DON.';
            setState({ user: null, staff: null, organization: null, loading: false, error: reason });
            return;
          }

          setState({ user, staff: staffData, organization: orgData, loading: false, error: null });
        } catch (err) {
          console.error("Auth initialization error:", err);
          setState(prev => ({ ...prev, user, loading: false }));
        }
      } else {
        setState({ user: null, staff: null, organization: null, loading: false, error: null });
      }
    });

    // Safety timeout: Ensure loading is set to false eventually
    const safetyTimeout = setTimeout(() => {
      setState(prev => {
        if (prev.loading) {
          console.warn("Auth initialization safety timeout reached. Forcing loading to false.");
          return { ...prev, loading: false };
        }
        return prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // HIPAA: 15-Minute Auto-Logout Session Security
  useEffect(() => {
    if (!state.user) return;

    let logoutTimer: NodeJS.Timeout;
    const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 Minutes

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        handleAutoLogout();
      }, SESSION_TIMEOUT);
    };

    const handleAutoLogout = async () => {
      console.log("HIPAA Session Security: 15-minute inactivity timeout reached.");
      await signOut();
      window.location.href = '/login?reason=timeout';
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer start
    resetTimer();

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [state.user]);

  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in';
      setState((s) => ({ ...s, loading: false, error: friendlyError(message) }));
      throw err;
    }
  };

  const signUp = async (data: SignUpData) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Set display name
      await updateProfile(credential.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      // Create staff profile in Firestore
      await setDoc(doc(db, 'staff', credential.user.uid), {
        auth_id: credential.user.uid,
        org_id: '', // Set during onboarding
        facility_id: null,
        first_name: data.firstName,
        last_name: data.lastName,
        initials: data.initials,
        role: data.role,
        credential: data.credential || null,
        email: data.email,
        phone: null,
        is_active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account';
      setState((s) => ({ ...s, loading: false, error: friendlyError(message) }));
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, clearError }}>
      {children}
      <OnboardingModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Map Firebase error codes to user-friendly messages
function friendlyError(msg: string): string {
  if (msg.includes('auth/email-already-in-use')) return 'An account with this email already exists.';
  if (msg.includes('auth/invalid-credential')) return 'Invalid email or password.';
  if (msg.includes('auth/weak-password')) return 'Password must be at least 6 characters.';
  if (msg.includes('auth/user-not-found')) return 'No account found with this email.';
  if (msg.includes('auth/wrong-password')) return 'Invalid email or password.';
  if (msg.includes('auth/too-many-requests')) return 'Too many attempts. Please try again later.';
  return msg;
}

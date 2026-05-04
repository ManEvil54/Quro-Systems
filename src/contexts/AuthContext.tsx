// ============================================================
// Quro — Firebase Auth Context Provider
// Manages authentication state & Ghost Mode (Impersonation)
// ============================================================
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Staff, StaffRole } from '@/lib/firebase/types';

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  organization: { id: string; name: string } | null;
  loading: boolean;
  isImpersonating: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  impersonate: (orgId: string, staffId?: string) => Promise<void>;
  stopImpersonating: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    staff: Staff | null;
    organization: { id: string, name: string } | null;
    isImpersonating: boolean;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    staff: null,
    organization: null,
    isImpersonating: false,
    loading: true,
    error: null,
  });

  // Helper: Load standard user data
  const loadUserData = async (user: User, orgId: string) => {
    const staffDoc = await getDoc(doc(db, 'organizations', orgId, 'staff', user.uid));
    const staffData = staffDoc.exists()
      ? ({ id: staffDoc.id, ...staffDoc.data() } as Staff)
      : null;

    const orgDoc = await getDoc(doc(db, 'organizations', orgId));
    const orgData = orgDoc.exists() 
      ? { id: orgDoc.id, name: orgDoc.data().name } 
      : { id: orgId, name: 'Quro Facility' };

    const isExpired = staffData?.access_expires_at && new Date() > new Date(staffData.access_expires_at);
    if (staffData && (!staffData.is_active || isExpired)) {
      await firebaseSignOut(auth);
      const reason = isExpired ? 'Your shift access has expired.' : 'Access revoked. Contact your DON.';
      setState({ user: null, staff: null, organization: null, isImpersonating: false, loading: false, error: reason });
      return;
    }

    setState({ user, staff: staffData, organization: orgData, isImpersonating: false, loading: false, error: null });
  };

  // Helper: Perform Impersonation
  const performImpersonation = async (user: User, orgId: string, staffId?: string) => {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (!orgDoc.exists()) throw new Error("Target organization not found");
      const orgData = { id: orgDoc.id, name: orgDoc.data().name };

      let staffData: Staff | null = null;
      if (staffId) {
        const staffDoc = await getDoc(doc(db, 'organizations', orgId, 'staff', staffId));
        if (staffDoc.exists()) {
          staffData = { id: staffDoc.id, ...staffDoc.data() } as Staff;
        }
      }

      // Log the impersonation (HIPAA Audit Trail)
      await addDoc(collection(db, 'audit_logs'), {
        action: 'SUPER_ADMIN_IMPERSONATION_START',
        user_id: user.uid,
        target_org_id: orgId,
        target_staff_id: staffId || 'ALL',
        timestamp: new Date().toISOString(),
        reason: 'Troubleshooting/Support'
      });

      setState({
        user,
        staff: staffData,
        organization: orgData,
        isImpersonating: true,
        loading: false,
        error: null
      });

      sessionStorage.setItem('quro_impersonation', JSON.stringify({ orgId, staffId }));
    } catch (err) {
      console.error("Impersonation failed:", err);
      setState(prev => ({ ...prev, error: "Impersonation failed. Target not reachable.", loading: false }));
    }
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          const customRole = idTokenResult.claims.role as string;

          if (customRole === 'SUPER_ADMIN') {
            const impersonationData = sessionStorage.getItem('quro_impersonation');
            if (impersonationData) {
              const { orgId, staffId } = JSON.parse(impersonationData);
              await performImpersonation(user, orgId, staffId);
              return;
            }

            setState({ 
              user, 
              staff: {
                id: user.uid,
                auth_id: user.uid,
                org_id: 'SYSTEM',
                facility_id: null,
                first_name: 'System',
                last_name: 'Root',
                initials: 'ROOT',
                role: 'SUPER_ADMIN',
                credential: 'DEVELOPER',
                email: user.email || '',
                phone: null,
                is_active: true,
                is_onboarded: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, 
              organization: { id: 'SYSTEM', name: 'Quro Global Operations' }, 
              isImpersonating: false,
              loading: false, 
              error: null 
            });
            return;
          }

          const userMetaDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userMetaDoc.exists()) {
            setState(prev => ({ ...prev, user, loading: false }));
            return;
          }
          
          const { org_id } = userMetaDoc.data();
          await loadUserData(user, org_id);
        } catch (err) {
          console.error("Auth initialization error:", err);
          setState(prev => ({ ...prev, user, loading: false }));
        }
      } else {
        setState({ user: null, staff: null, organization: null, isImpersonating: false, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
      throw err;
    }
  };

  const impersonate = async (orgId: string, staffId?: string) => {
    if (!state.user) return;
    const idTokenResult = await state.user.getIdTokenResult();
    if (idTokenResult.claims.role !== 'SUPER_ADMIN') return;
    
    setState(prev => ({ ...prev, loading: true }));
    await performImpersonation(state.user, orgId, staffId);
  };

  const stopImpersonating = () => {
    sessionStorage.removeItem('quro_impersonation');
    window.location.reload();
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem('quro_impersonation');
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, impersonate, stopImpersonating, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

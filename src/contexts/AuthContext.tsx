// ============================================================
// Quro — Authentication Provider
// Multi-Tenant Isolation & HIPAA Compliance
// ============================================================
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Staff, Organization } from '@/lib/firebase/types';

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  organization: { id: string, name: string } | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    staff: Staff | null;
    organization: { id: string, name: string } | null;
    loading: boolean;
    error: string | null;
  }>({
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
          // 0. Check for Super Admin Custom Claim
          const idTokenResult = await user.getIdTokenResult();
          const customRole = idTokenResult.claims.role as string;

          if (customRole === 'SUPER_ADMIN') {
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
                must_change_password: false,
                access_expires_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, 
              organization: { id: 'SYSTEM', name: 'Quro Global Operations' }, 
              loading: false, 
              error: null 
            });
            return;
          }

          // 1. Fetch User Metadata (to get org_id) for regular staff/DONs
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

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
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

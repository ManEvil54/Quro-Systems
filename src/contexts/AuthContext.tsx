// ============================================================
// Quro — Firebase Auth Context Provider
// Manages authentication state & Ghost Mode (Impersonation)
// ============================================================
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Staff, StaffRole } from '@/lib/firebase/types';

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  organization: { id: string; name: string; max_facilities?: number; clinical_settings?: { emar_mode: boolean; mar_template_psych?: boolean; mar_template_weights?: boolean; mar_template_sleep?: boolean; require_pin_for_narcotics?: boolean } } | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonatedDonName: string | null;
  activeFacility: { id: string; name: string; bed_count?: number | null } | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    initials: string;
    role: string;
    credential?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  impersonate: (orgId: string, staffId?: string) => Promise<void>;
  stopImpersonating: () => void;
  switchFacility: (facilityId: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    staff: Staff | null;
    organization: { id: string, name: string, max_facilities?: number, clinical_settings?: { emar_mode: boolean; mar_template_psych?: boolean; mar_template_weights?: boolean; mar_template_sleep?: boolean; require_pin_for_narcotics?: boolean } } | null;
    isImpersonating: boolean;
    impersonatedDonName: string | null;
    activeFacility: { id: string, name: string, bed_count?: number | null } | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    staff: null,
    organization: null,
    isImpersonating: false,
    impersonatedDonName: null,
    activeFacility: null,
    loading: true,
    error: null,
  });

  const switchFacility = useCallback(async (facilityId: string) => {
    if (!state.organization?.id) return;
    
    try {
      const facilityDoc = await getDoc(doc(db, 'organizations', state.organization.id, 'facilities', facilityId));
      if (facilityDoc.exists()) {
        const data = facilityDoc.data();
        setState(prev => ({ 
          ...prev, 
          activeFacility: { id: facilityId, name: data.name, bed_count: data.bed_count } 
        }));
        localStorage.setItem(`quro_active_facility_${state.organization.id}`, facilityId);
      }
    } catch (err) {
      console.error("Failed to switch facility:", err);
    }
  }, [state.organization?.id]);

  // Helper: Load standard user data
  const loadUserData = async (user: User, orgId: string) => {
    const storedFacilityId = localStorage.getItem(`quro_active_facility_${orgId}`);

    // Parallel Data Hydration: Eliminate "Cold Start" sequential fetching
    // Fetch staff doc, organization doc, and active facility doc in a single round-trip
    const [staffDoc, orgDoc, storedFacDoc] = await Promise.all([
      getDoc(doc(db, 'organizations', orgId, 'staff', user.uid)),
      getDoc(doc(db, 'organizations', orgId)),
      storedFacilityId ? getDoc(doc(db, 'organizations', orgId, 'facilities', storedFacilityId)) : Promise.resolve(null)
    ]);

    const staffData = staffDoc.exists()
      ? ({ id: staffDoc.id, ...staffDoc.data() } as Staff)
      : null;

    const orgData = orgDoc.exists() 
      ? { 
          id: orgDoc.id, 
          name: orgDoc.data().name, 
          max_facilities: orgDoc.data().max_facilities,
          clinical_settings: orgDoc.data().clinical_settings 
        } 
      : { id: orgId, name: 'Quro Facility', max_facilities: 3 };

    // Handle Active Facility initialization
    let activeFacility = null;
    
    if (storedFacDoc && storedFacDoc.exists()) {
      activeFacility = { id: storedFacDoc.id, name: storedFacDoc.data().name, bed_count: storedFacDoc.data().bed_count };
    }

    if (!activeFacility && staffData) {
      // Fallback: Use staff default or first assigned
      const facId = staffData.facility_id || staffData.assigned_facility_ids?.[0];
      if (facId) {
        const facDoc = await getDoc(doc(db, 'organizations', orgId, 'facilities', facId));
        if (facDoc.exists()) {
          activeFacility = { id: facDoc.id, name: facDoc.data().name, bed_count: facDoc.data().bed_count };
        }
      }
    }

    const isExpired = staffData?.access_expires_at && new Date() > new Date(staffData.access_expires_at);
    if (staffData && (!staffData.is_active || isExpired)) {
      await firebaseSignOut(auth);
      const reason = isExpired ? 'Your shift access has expired.' : 'Access revoked. Contact your DON.';
      setState({ user: null, staff: null, organization: null, isImpersonating: false, impersonatedDonName: null, activeFacility: null, loading: false, error: reason });
      return;
    }

    setState({ user, staff: staffData, organization: orgData, isImpersonating: false, impersonatedDonName: null, activeFacility, loading: false, error: null });
  };

  // Helper: Perform Impersonation
  const performImpersonation = async (user: User, orgId: string, staffId?: string) => {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (!orgDoc.exists()) throw new Error("Target organization not found");
      const orgData = { 
        id: orgDoc.id, 
        name: orgDoc.data().name, 
        max_facilities: orgDoc.data().max_facilities,
        clinical_settings: orgDoc.data().clinical_settings
      };

      let staffData: Staff | null = null;
      if (staffId) {
        const staffDoc = await getDoc(doc(db, 'organizations', orgId, 'staff', staffId));
        if (staffDoc.exists()) {
          staffData = { id: staffDoc.id, ...staffDoc.data() } as Staff;
        }
      }

      // Log the impersonation (HIPAA Audit Trail)
      await addDoc(collection(db, 'audit_logs'), {
        action: 'SYSTEM_ADMIN_IMPERSONATION_START',
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
        impersonatedDonName: staffData ? `${staffData.first_name} ${staffData.last_name}` : orgData.name,
        activeFacility: staffData ? { id: staffData.facility_id || '', name: '...', bed_count: null } : null, 
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
          const isSystemAdmin = customRole === 'APP_OWNER' || customRole === 'APP_TECH' || customRole === 'SUPER_ADMIN';

          if (isSystemAdmin) {
            const impersonationData = sessionStorage.getItem('quro_impersonation');
            if (impersonationData) {
              const { orgId, staffId } = JSON.parse(impersonationData);
              await performImpersonation(user, orgId, staffId);
              return;
            }

            const isOwner = customRole === 'APP_OWNER' || customRole === 'SUPER_ADMIN';

            setState({ 
              user, 
              staff: {
                id: user.uid,
                auth_id: user.uid,
                org_id: 'SYSTEM',
                facility_id: null,
                first_name: isOwner ? 'System' : 'Tech',
                last_name: isOwner ? 'Owner' : 'Specialist',
                initials: isOwner ? 'ROOT' : 'TECH',
                role: customRole as StaffRole,
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
              isImpersonating: false,
              impersonatedDonName: null,
              activeFacility: null,
              loading: false, 
              error: null 
            });
            return;
          }

          // ADVERSARIAL AUDIT: Client-side "Auto-Linking" has been DEPRECATED.
          // Provisioning must happen via secure server-side triggers or invitation flows.
          // This prevents unauthorized escalation of privileges.
          const userMetaDoc = await getDoc(doc(db, 'users', user.uid));

          if (!userMetaDoc.exists() || !userMetaDoc.data()?.org_id) {
            setState(prev => ({ ...prev, user, loading: false }));
            return;
          }
          
          const { org_id } = userMetaDoc.data()!;
          await loadUserData(user, org_id);
        } catch (err) {
          console.error("Auth initialization error:", err);
          setState(prev => ({ ...prev, user, loading: false }));
        }
      } else {
          setState({ user: null, staff: null, organization: null, isImpersonating: false, impersonatedDonName: null, activeFacility: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      let message = 'Authentication failed';
      if (err && typeof err === 'object' && 'code' in err) {
        const code = err.code;
        if (
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-email' ||
          code === 'auth/invalid-credential'
        ) {
          message = 'Invalid email/username or password. Please try again.';
        } else if (code === 'auth/user-disabled') {
          message = 'This account has been disabled. Please contact your DON or administrator.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Access temporarily blocked due to multiple failed login attempts. Please try again later.';
        } else {
          message = err.message || 'Authentication failed';
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  const signUp: AuthContextType['signUp'] = useCallback(async (data) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      await updateProfile(credential.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      await setDoc(doc(db, 'users', credential.user.uid), {
        auth_id: credential.user.uid,
        org_id: '',
        facility_id: null,
        first_name: data.firstName,
        last_name: data.lastName,
        initials: data.initials,
        role: data.role,
        credential: data.credential || null,
        email: data.email,
        phone: null,
        is_active: true,
        is_onboarded: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  const impersonate = useCallback(async (orgId: string, staffId?: string) => {
    if (!state.user) return;
    const idTokenResult = await state.user.getIdTokenResult();
    const role = idTokenResult.claims.role;
    if (role !== 'APP_OWNER' && role !== 'APP_TECH' && role !== 'SUPER_ADMIN') return;
    
    setState(prev => ({ ...prev, loading: true }));
    await performImpersonation(state.user, orgId, staffId);
  }, [state.user]);

  const stopImpersonating = useCallback(() => {
    sessionStorage.removeItem('quro_impersonation');
    window.location.reload();
  }, []);

  const signOut = useCallback(async () => {
    try {
      sessionStorage.removeItem('quro_impersonation');
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  const contextValue = useMemo(() => ({
    user: state.user,
    staff: state.staff,
    organization: state.organization,
    isImpersonating: state.isImpersonating,
    impersonatedDonName: state.impersonatedDonName,
    activeFacility: state.activeFacility,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    impersonate,
    stopImpersonating,
    switchFacility,
    clearError
  }), [
    state.user,
    state.staff,
    state.organization,
    state.isImpersonating,
    state.impersonatedDonName,
    state.activeFacility,
    state.loading,
    state.error,
    signIn,
    signUp,
    signOut,
    impersonate,
    stopImpersonating,
    switchFacility,
    clearError
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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

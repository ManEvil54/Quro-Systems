// ============================================================
// Quro — Settings & Management Hook
// Handles organization-level configuration and staff invitations
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization, Facility, StaffInvitation } from '@/lib/firebase/types';

export function useSettings() {
  const { staff } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staff?.org_id) return;

    // Fetch Org
    const orgRef = doc(db, 'organizations', staff.org_id);
    const unsubOrg = onSnapshot(orgRef, (doc) => {
      if (doc.exists()) setOrg({ id: doc.id, ...doc.data() } as Organization);
    });

    // Fetch Facilities
    const facRef = collection(db, 'organizations', staff.org_id, 'facilities');
    const unsubFac = onSnapshot(facRef, (snap) => {
      setFacilities(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Facility[]);
    });

    // Fetch Invitations
    const invRef = collection(db, 'organizations', staff.org_id, 'invitations');
    const unsubInv = onSnapshot(invRef, (snap) => {
      setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as StaffInvitation[]);
      setLoading(false);
    });

    return () => { unsubOrg(); unsubFac(); unsubInv(); };
  }, [staff?.org_id]);

  const updateOrg = async (data: Partial<Organization>) => {
    if (!staff?.org_id) return;
    return await updateDoc(doc(db, 'organizations', staff.org_id), {
      ...data,
      updated_at: serverTimestamp()
    });
  };

  const addFacility = async (data: Omit<Facility, 'id' | 'org_id' | 'created_at'>) => {
    if (!staff?.org_id) return;
    const facRef = collection(db, 'organizations', staff.org_id, 'facilities');
    return await addDoc(facRef, {
      ...data,
      org_id: staff.org_id,
      created_at: serverTimestamp()
    });
  };

  const inviteStaff = async (email: string, role: string, facilityId: string) => {
    if (!staff?.org_id) return;
    const invRef = collection(db, 'organizations', staff.org_id, 'invitations');
    return await addDoc(invRef, {
      email: email.toLowerCase(),
      role,
      facility_id: facilityId,
      status: 'pending',
      invited_by: staff.id,
      created_at: serverTimestamp(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });
  };

  return { org, facilities, invitations, loading, updateOrg, addFacility, inviteStaff };
}

'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/lib/firebase/types';

export function usePatients(facilityId?: string | null) {
  const { staff } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Scoped collection: organizations/{org_id}/patients
    const patientsRef = collection(db, 'organizations', staff.org_id, 'patients');
    
    // Base query
    let constraints = [
      where('is_active', '==', true),
      orderBy('last_name', 'asc')
    ];

    // If facilityId is provided, filter by it
    if (facilityId) {
      constraints.unshift(where('facility_id', '==', facilityId));
    }

    const q = query(patientsRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching patients:', err);
      setError('Failed to load clinical records for this facility.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, facilityId]);

  const admitPatient = async (data: Omit<Patient, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const patientsRef = collection(db, 'organizations', staff.org_id, 'patients');
    return await addDoc(patientsRef, {
      ...data,
      org_id: staff.org_id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updatePatient = async (patientId: string, data: Partial<Patient>) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const patientRef = doc(db, 'organizations', staff.org_id, 'patients', patientId);
    return await updateDoc(patientRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  };

  return { patients, loading, error, admitPatient, updatePatient };
}

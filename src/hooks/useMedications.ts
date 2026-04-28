// ============================================================
// Quro — Medication Management Hook
// Handles patient medication orders and MAR validation
// ============================================================
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
import type { Medication } from '@/lib/firebase/types';

export function useMedications(patientId: string) {
  const { staff } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setLoading(false);
      return;
    }

    const medsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'medications');
    const q = query(medsRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
      setMedications(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const addMedication = async (data: Omit<Medication, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const medsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'medications');
    return await addDoc(medsRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateMedication = async (medicationId: string, data: Partial<Medication>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const medRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'medications', medicationId);
    return await updateDoc(medRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  };

  return { medications, loading, error, addMedication, updateMedication };
}

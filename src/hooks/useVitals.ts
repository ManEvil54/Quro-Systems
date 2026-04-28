// ============================================================
// Quro — Vital Signs Hook
// Handles recording and monitoring of patient vitals
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
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { VitalSign } from '@/lib/firebase/types';

export function useVitals(patientId: string) {
  const { staff } = useAuth();
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setLoading(false);
      return;
    }

    const vitalsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'vital_signs');
    const q = query(vitalsRef, orderBy('recorded_at', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VitalSign[];
      setVitals(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching vitals:', err);
      setError('Failed to load vital records.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const recordVitals = async (data: Omit<VitalSign, 'id' | 'org_id' | 'patient_id' | 'recorded_by' | 'created_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const vitalsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'vital_signs');
    return await addDoc(vitalsRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      recorded_by: staff.id,
      created_at: serverTimestamp(),
    });
  };

  return { vitals, loading, error, recordVitals };
}

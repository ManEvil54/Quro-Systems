// ============================================================
// Quro — MAR (Medication Administration Record) Hook
// Handles logging and fetching of administration events
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
import type { MarEntry } from '@/lib/firebase/types';

export function useMAR(patientId: string) {
  const { staff } = useAuth();
  const [entries, setEntries] = useState<MarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setLoading(false);
      return;
    }

    const marRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries');
    // For the grid, we usually want the current month's entries.
    // For now, let's just get recent ones.
    const q = query(marRef, orderBy('scheduled_date', 'desc'), limit(500));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarEntry[];
      setEntries(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching MAR:', err);
      setError('Failed to load MAR records.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const logAdministration = async (data: Omit<MarEntry, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const marRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries');
    return await addDoc(marRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      administered_by: staff.id,
      actual_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  return { entries, loading, error, logAdministration };
}

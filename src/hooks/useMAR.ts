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
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MarEntry } from '@/lib/firebase/types';
import { DEMO_MAR } from '@/lib/demoData';

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
      
      // Fallback to Demo Data
      if (docs.length === 0 && DEMO_MAR[patientId]) {
        setEntries(DEMO_MAR[patientId]);
      } else {
        setEntries(docs);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching MAR:', err);
      setError('Failed to load MAR records.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const logAdministration = async (data: Partial<MarEntry>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    // Captured for CFR Part 11 Compliance
    const audit_log = {
      ip_address: 'Logged by System', // In production, get from API route or client
      device_id: window.navigator.userAgent,
      auth_method: 'pin' as const,
      timestamp: new Date().toISOString()
    };

    const marRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries');
    return await addDoc(marRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      administered_by: staff.id,
      audit_log,
      actual_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const updatePRNEffectiveness = async (entryId: string, effectiveness: { score: number, comment: string }) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const docRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries', entryId);
    return await updateDoc(docRef, {
      effectiveness_score: effectiveness.score,
      effectiveness_comment: effectiveness.comment,
      effectiveness_noted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  const bulkLogAdministrations = async (entries: { medication_id: string, scheduled_time: string, action: 'given' | 'held' }[]) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const batch = writeBatch(db);
    const marRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries');
    const today = new Date().toISOString().split('T')[0];

    for (const entry of entries) {
      const docRef = doc(marRef);
      batch.set(docRef, {
        ...entry,
        org_id: staff.org_id,
        patient_id: patientId,
        administered_by: staff.id,
        scheduled_date: today,
        actual_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    return await batch.commit();
  };

  return { entries, loading, error, logAdministration, bulkLogAdministrations };
}

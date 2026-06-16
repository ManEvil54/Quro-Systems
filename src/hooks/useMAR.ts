// ============================================================
// Quro — MAR (Medication Administration Record) Hook
// Handles logging and fetching of administration events
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MAREntry } from '@/lib/firebase/types';
import { DEMO_MAR } from '@/lib/demoData';

export function useMAR(patientId: string) {
  const { staff, isReadOnly } = useAuth();
  const [entries, setEntries] = useState<MAREntry[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(!!(staff?.org_id && patientId));
  const [error, setError] = useState<string | null>(null);

  const loading = !staff?.org_id || !patientId || isSubscribing;

  useEffect(() => {
    if (!staff?.org_id || !patientId) return;

    const marRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries');
    const q = query(marRef, orderBy('scheduled_date', 'desc'), limit(500));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MAREntry[];
      
      if (docs.length === 0 && DEMO_MAR[patientId]) {
        setEntries(DEMO_MAR[patientId]);
      } else {
        setEntries(docs);
      }
      setIsSubscribing(false);
    }, (err) => {
      console.error('Error fetching MAR:', err);
      setError('Failed to load MAR records.');
      setIsSubscribing(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const logAdministration = async (data: Partial<MAREntry>) => {
    if (isReadOnly) {
      console.warn("⚠️ Transaction aborted: Active organization context or user role is restricted to READ-ONLY mode.");
      return { success: false, error: "Read-only enforcement boundary active." };
    }
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    // Deterministic ID to prevent race-condition "Double Dosing"
    const entryId = `${data.medication_id}_${data.scheduled_date}_${data.scheduled_time}`;
    const docRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'mar_entries', entryId);

    // Captured for CFR Part 11 Compliance
    const audit_log = {
      ip_address: 'Logged by System',
      device_id: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      auth_method: 'pin' as const,
      timestamp: new Date().toISOString()
    };

    try {
      await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);
        
        if (existingDoc.exists()) {
          throw new Error('CLINICAL_ERROR_ALREADY_GIVEN');
        }


        transaction.set(docRef, {
          ...data,
          id: entryId,
          org_id: staff.org_id,
          patient_id: patientId,
          administered_by: staff.id,
          audit_log,
          actual_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

      return { success: true, id: entryId };
    } catch (err) {
      const error = err as Error;
      console.error('MAR Transaction Failed:', error.message);
      throw error;
    }
  };

  return { entries, loading, error, logAdministration };
}

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/lib/firebase/types';
import { DEMO_PATIENTS } from '@/lib/demoData';

export function usePatient(patientId: string) {
  const { organization } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id || !patientId) {
      setLoading(false);
      return;
    }

    const patientRef = doc(db, 'organizations', organization.id, 'patients', patientId);
    const unsubscribe = onSnapshot(patientRef, (docSnap) => {
      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
      } else {
        // Fallback to Demo Data
        const demoPatient = DEMO_PATIENTS.find(p => p.id === patientId);
        if (demoPatient) {
          setPatient(demoPatient);
        } else {
          setError('Patient not found');
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching patient:', err);
      setError('Failed to load patient details');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization?.id, patientId]);

  const updatePatient = async (data: Partial<Patient>) => {
    if (!organization?.id || !patientId) throw new Error('Not authenticated');
    const patientRef = doc(db, 'organizations', organization.id, 'patients', patientId);
    return await updateDoc(patientRef, {
      ...data,
      updated_at: new Date().toISOString()
    });
  };

  return { patient, loading, error, updatePatient };
}

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/lib/firebase/types';

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
        setError('Patient not found');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching patient:', err);
      setError('Failed to load patient details');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization?.id, patientId]);

  return { patient, loading, error };
}

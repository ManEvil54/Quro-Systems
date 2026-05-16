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
import { DEMO_VITALS } from '@/lib/demoData';

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
      
      // Fallback to Demo Data
      if (docs.length === 0 && DEMO_VITALS[patientId]) {
        setVitals(DEMO_VITALS[patientId]);
      } else {
        setVitals(docs);
      }
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
    const patientRef = doc(db, 'organizations', staff.org_id, 'patients', patientId);
    
    // 1. Add to history
    await addDoc(vitalsRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      recorded_by: staff.id,
      created_at: serverTimestamp(),
    });

    // 2. Update denormalized field on Patient
    return await updateDoc(patientRef, {
      current_vitals: {
        pulse: data.pulse || null,
        systolic: data.systolic || null,
        diastolic: data.diastolic || null,
        temperature: data.temperature || null,
        spO2: data.spO2 || null,
        resp: data.resp || null,
        glucose: data.glucose || null,
        pain_level: data.pain_level || null,
        weight: data.weight || null,
        is_alert: data.is_alert || false,
        recorded_at: data.recorded_at,
        recorded_by_name: `${staff.first_name} ${staff.last_name}`
      },
      updated_at: serverTimestamp()
    });
  };

  return { vitals, loading, error, recordVitals };
}

// ============================================================
// Quro — Falls & Safety Hook
// Manages safety monitoring and incident reporting
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, Incident } from '@/lib/firebase/types';

export function useFalls(facilityId: string) {
  const { organization, staff } = useAuth();
  const [monitoringPatients, setMonitoringPatients] = useState<Patient[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !facilityId) {
      setLoading(false);
      return;
    }

    // 1. Listen for patients under active monitoring in this facility
    const patientsRef = collection(db, 'organizations', organization.id, 'patients');
    const monitoringQuery = query(
      patientsRef,
      where('facility_id', '==', facilityId),
      where('is_active_monitoring', '==', true),
      where('is_active', '==', true)
    );

    const unsubscribeMonitoring = onSnapshot(monitoringQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
      setMonitoringPatients(list);
    });

    // 2. Listen for recent incidents in this facility
    const incidentsRef = collection(db, 'organizations', organization.id, 'incidents');
    const incidentsQuery = query(
      incidentsRef,
      where('facility_id', '==', facilityId),
      orderBy('occurred_at', 'desc'),
      limit(20)
    );

    const unsubscribeIncidents = onSnapshot(incidentsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Incident[];
      setRecentIncidents(list);
      setLoading(false);
    });

    return () => {
      unsubscribeMonitoring();
      unsubscribeIncidents();
    };
  }, [organization?.id, facilityId]);

  const reportIncident = async (data: Omit<Incident, 'id' | 'org_id' | 'facility_id' | 'reported_by' | 'created_at' | 'updated_at'>) => {
    if (!organization?.id || !facilityId || !staff?.id) throw new Error('Auth context missing');

    const incidentsRef = collection(db, 'organizations', organization.id, 'incidents');
    return await addDoc(incidentsRef, {
      ...data,
      org_id: organization.id,
      facility_id: facilityId,
      reported_by: staff.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  return { monitoringPatients, recentIncidents, loading, reportIncident };
}

// ============================================================
// Quro — useDashboard Hook
// Live data engine for the Boutique & Enterprise Control Centers
// ============================================================
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, VitalSign, HandoverNote } from '@/lib/firebase/types';

export interface DashboardPatient {
  id: string;
  room_number: string | null;
  initials: string;
  mrn: string;
  status: 'Critical' | 'Stable';
  hr: number | null;
  bp: string | null;
  temp: number | null;
  is_active_monitoring: boolean;
}

export function useDashboard(facilityId: string) {
  const { organization } = useAuth();
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const MOCK_DASHBOARD_PATIENTS: DashboardPatient[] = [
    { id: '1', room_number: '101A', initials: 'JD', mrn: 'MRN001', status: 'Stable', hr: 72, bp: '120/80', temp: 98.6, is_active_monitoring: false },
    { id: '2', room_number: '102B', initials: 'AS', mrn: 'MRN002', status: 'Critical', hr: 110, bp: '145/95', temp: 101.2, is_active_monitoring: true },
    { id: '3', room_number: '103C', initials: 'MJ', mrn: 'MRN003', status: 'Stable', hr: 68, bp: '115/75', temp: 98.4, is_active_monitoring: false },
  ];

  const MOCK_ALERTS = [
    { id: 'a1', subjective: 'Patient reported feeling dizzy', is_urgent: true, created_at: new Date().toISOString() },
    { id: 'a2', subjective: 'Pending lab results for MRN002', is_urgent: true, created_at: new Date().toISOString() }
  ];

  useEffect(() => {
    if (!organization || !facilityId) {
      if (!organization && !facilityId) return; // Still waiting for init
      setLoading(false);
      return;
    }

    // Use Mock Data
    setPatients(MOCK_DASHBOARD_PATIENTS);
    setAlerts(MOCK_ALERTS);
    setLoading(false);

    // Real fetching logic below is commented out
    /*
    // 1. Listen to Patients in this facility
    const patientsRef = collection(db, 'organizations', organization.id, 'patients');
    const patientsQuery = query(
      patientsRef, 
      where('facility_id', '==', facilityId),
      where('is_active', '==', true)
    );

    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];

      // 2. For each patient, we need their latest vitals
      // To keep it efficient, we'll map them and then update as vitals come in
      const mappedPatients: DashboardPatient[] = patientList.map(p => ({
        id: p.id,
        room_number: p.room_number,
        initials: `${p.first_name[0]}${p.last_name[0]}`,
        mrn: p.mrn,
        status: p.is_active_monitoring ? 'Critical' : 'Stable',
        hr: null,
        bp: null,
        temp: null,
        is_active_monitoring: p.is_active_monitoring
      }));

      setPatients(mappedPatients);
      setLoading(false);

      // 3. Listen to latest vitals for all patients in this org (efficiently)
      // Note: In a real large app, we might use a collectionGroup or individual listeners
      patientList.forEach(patient => {
        const vitalsRef = collection(db, 'organizations', organization.id, 'patients', patient.id, 'vital_signs');
        const vitalsQuery = query(vitalsRef, orderBy('recorded_at', 'desc'), limit(1));
        
        onSnapshot(vitalsQuery, (vSnapshot) => {
          if (!vSnapshot.empty) {
            const latest = vSnapshot.docs[0].data() as VitalSign;
            setPatients(prev => prev.map(dp => {
              if (dp.id === patient.id) {
                const isCritical = latest.is_alert || patient.is_active_monitoring;
                return {
                  ...dp,
                  hr: latest.pulse,
                  bp: latest.systolic ? `${latest.systolic}/${latest.diastolic}` : null,
                  temp: latest.temperature,
                  status: isCritical ? 'Critical' : 'Stable'
                };
              }
              return dp;
            }));
          }
        });
      });
    });

    // 4. Listen to Alerts (Provider Orders pending or urgent Handover notes)
    const handoverRef = collection(db, 'organizations', organization.id, 'handover_notes');
    const handoverQuery = query(handoverRef, where('facility_id', '==', facilityId), where('is_urgent', '==', true), limit(5));
    
    const unsubscribeAlerts = onSnapshot(handoverQuery, (snapshot) => {
      const urgentNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(urgentNotes);
    });

    return () => {
      unsubscribePatients();
      unsubscribeAlerts();
    };
    */
  }, [organization, facilityId]);

  return { patients, alerts, loading };
}

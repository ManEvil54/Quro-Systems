// ============================================================
// Quro — useDashboard Hook
// Live data engine for the Boutique & Enterprise Control Centers
// ============================================================
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, HandoverNote, Bed } from '@/lib/firebase/types';

export interface DashboardBed {
  id: string;
  bed_name: string;
  name?: string; // Standardize for Bed object
  room_name: string;
  room_id: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patient?: {
    id: string;
    initials: string;
    full_name?: string;
    mrn: string;
    status: 'Serious' | 'Stable';
    hr: number | null;
    bp: string | null;
    temp: number | null;
    spo2: number | null;
    resp: number | null;
    glucose: number | null;
    pain: number | null;
    weight: number | null;
    is_active_monitoring: boolean;
    code_status?: string;
    diagnoses?: string[];
    diet?: string;
  };
}

export function useDashboard(facilityId: string) {
  const { organization } = useAuth();
  const [beds, setBeds] = useState<DashboardBed[]>([]);
  const [alerts, setAlerts] = useState<HandoverNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevFacilityId, setPrevFacilityId] = useState(facilityId);
  const [prevOrgId, setPrevOrgId] = useState(organization?.id);

  // Sync state with props/auth during render to avoid useEffect cascading renders
  if (facilityId !== prevFacilityId || organization?.id !== prevOrgId) {
    setPrevFacilityId(facilityId);
    setPrevOrgId(organization?.id);
    setLoading(true);
  }

  useEffect(() => {
    if (!organization?.id || !facilityId) {
      return;
    }

    let roomMap = new Map<string, string>();
    let bedList: Bed[] = [];
    let patientList: Patient[] = [];

    const updateState = () => {
      const updatedBeds: DashboardBed[] = bedList.map(bed => {
        const patient = patientList.find(p => p.bed_id === bed.id);
        const latest = patient?.current_vitals;
        
        return {
          id: bed.id,
          bed_name: bed.name,
          room_id: bed.room_id,
          room_name: roomMap.get(bed.room_id) || 'Unknown Room',
          status: bed.status,
          patient: patient ? {
            id: patient.id,
            initials: `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`,
            mrn: patient.mrn,
            status: latest?.is_alert ? 'Serious' : 'Stable',
            hr: latest?.pulse || null,
            bp: latest?.systolic ? `${latest.systolic}/${latest.diastolic}` : null,
            temp: latest?.temperature || null,
            spo2: latest?.spO2 || null,
            resp: latest?.resp || patient.respiratory_state?.vent_settings?.rate || null,
            glucose: latest?.glucose || null,
            pain: latest?.pain_level || null,
            weight: latest?.weight || null,
            full_name: patient.full_name,
            is_active_monitoring: patient.is_active_monitoring,
            code_status: patient.code_status,
            diagnoses: patient.diagnoses,
            diet: patient.diet
          } : undefined
        };
      });

      setBeds(updatedBeds);
      setLoading(false);
    };

    // 1. Listen to Rooms
    const roomsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'rooms');
    const roomsUnsubscribe = onSnapshot(roomsRef, (roomsSnap) => {
      roomMap = new Map();
      roomsSnap.docs.forEach(doc => roomMap.set(doc.id, doc.data().name));
      updateState();
    }, (error) => {
      console.error("Rooms subscription error:", error);
    });

    // 2. Listen to Beds
    const bedsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'beds');
    const bedsQuery = query(bedsRef, orderBy('room_id'), orderBy('name'));
    const bedsUnsubscribe = onSnapshot(bedsQuery, (bedsSnap) => {
      bedList = bedsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bed[];
      updateState();
    }, (error) => {
      console.error("Beds subscription error:", error);
    });

    // 3. Listen to Patients
    const patientsRef = collection(db, 'organizations', organization.id, 'patients');
    const patientsQuery = query(patientsRef, where('facility_id', '==', facilityId), where('is_active', '==', true));
    const patientsUnsubscribe = onSnapshot(patientsQuery, (patientsSnap) => {
      patientList = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
      updateState();
    }, (error) => {
      console.error("Patients subscription error:", error);
    });

    // 4. Listen to Alerts (Urgent Handover notes)
    const handoverRef = collection(db, 'organizations', organization.id, 'handover_notes');
    const handoverQuery = query(handoverRef, where('facility_id', '==', facilityId), where('is_urgent', '==', true), limit(5));
    const alertsUnsubscribe = onSnapshot(handoverQuery, (snapshot) => {
      const urgentNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(urgentNotes as HandoverNote[]);
    }, (error) => {
      console.error("Alerts subscription error:", error);
    });

    return () => {
      roomsUnsubscribe();
      bedsUnsubscribe();
      patientsUnsubscribe();
      alertsUnsubscribe();
    };
  }, [organization?.id, facilityId]);

  // Final loading state: true if we're internally loading AND have the required context
  const derivedLoading = (!organization?.id || !facilityId) ? false : loading;

  return { beds, alerts, loading: derivedLoading };
}

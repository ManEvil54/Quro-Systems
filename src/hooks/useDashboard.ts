// ============================================================
// Quro — useDashboard Hook
// Live data engine for the Boutique & Enterprise Control Centers
// ============================================================
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, VitalSign, HandoverNote } from '@/lib/firebase/types';

export interface DashboardBed {
  id: string;
  bed_name: string;
  room_name: string;
  room_id: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patient?: {
    id: string;
    initials: string;
    mrn: string;
    status: 'Critical' | 'Stable';
    hr: number | null;
    bp: string | null;
    temp: number | null;
    is_active_monitoring: boolean;
  };
}

export function useDashboard(facilityId: string) {
  const { organization } = useAuth();
  const [beds, setBeds] = useState<DashboardBed[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !facilityId) {
      setLoading(false);
      return;
    }

    // 1. Listen to Rooms (to get room names)
    const roomsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'rooms');
    const roomsUnsubscribe = onSnapshot(roomsRef, (roomsSnap) => {
      const roomMap = new Map();
      roomsSnap.docs.forEach(doc => roomMap.set(doc.id, doc.data().name));

      // 2. Listen to Beds
      const bedsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'beds');
      const bedsUnsubscribe = onSnapshot(bedsRef, (bedsSnap) => {
        const bedList = bedsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Bed[];

        // 3. Listen to Patients
        const patientsRef = collection(db, 'organizations', organization.id, 'patients');
        const patientsQuery = query(patientsRef, where('facility_id', '==', facilityId), where('is_active', '==', true));
        
        onSnapshot(patientsQuery, (patientsSnap) => {
          const patientList = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
          
          // Construct initial beds state
          const initialBeds: DashboardBed[] = bedList.map(bed => {
            const patient = patientList.find(p => p.bed_id === bed.id);
            return {
              id: bed.id,
              bed_name: bed.name,
              room_id: bed.room_id,
              room_name: roomMap.get(bed.room_id) || 'Unknown Room',
              status: bed.status,
              patient: patient ? {
                id: patient.id,
                initials: `${patient.first_name[0]}${patient.last_name[0]}`,
                mrn: patient.mrn,
                status: patient.is_active_monitoring ? 'Critical' : 'Stable',
                hr: null,
                bp: null,
                temp: null,
                is_active_monitoring: patient.is_active_monitoring
              } : undefined
            };
          });

          setBeds(initialBeds);
          setLoading(false);

          // 4. Listen to Vitals for each patient
          patientList.forEach(patient => {
            const vitalsRef = collection(db, 'organizations', organization.id, 'patients', patient.id, 'vital_signs');
            const vitalsQuery = query(vitalsRef, orderBy('recorded_at', 'desc'), limit(1));
            
            onSnapshot(vitalsQuery, (vSnapshot) => {
              if (!vSnapshot.empty) {
                const latest = vSnapshot.docs[0].data() as VitalSign;
                setBeds(prev => prev.map(dbed => {
                  if (dbed.patient?.id === patient.id) {
                    const isCritical = latest.is_alert || patient.is_active_monitoring;
                    return {
                      ...dbed,
                      patient: {
                        ...dbed.patient,
                        hr: latest.pulse || null,
                        bp: latest.systolic ? `${latest.systolic}/${latest.diastolic}` : null,
                        temp: latest.temperature || null,
                        status: isCritical ? 'Critical' : 'Stable'
                      }
                    } as DashboardBed;
                  }
                  return dbed;
                }));
              }
            });
          });
        });
      });
    });

    // 4. Listen to Alerts (Urgent Handover notes)
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
      roomsUnsubscribe();
      bedsUnsubscribe();
      unsubscribeAlerts();
    };
  }, [organization?.id, facilityId]);

  return { beds, alerts, loading };
}

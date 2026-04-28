// ============================================================
// Quro — Patient Management Hook
// Handles fetching and mutation of patient records
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
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/lib/firebase/types';

export function usePatients() {
  const { staff } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const MOCK_PATIENTS: Patient[] = [
    {
      id: '1',
      org_id: 'org1',
      facility_id: 'fac1',
      mrn: 'MRN001',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1945-05-15',
      gender: 'male',
      ssn_last_four: '1234',
      admission_date: '2026-04-01',
      discharge_date: null,
      insurance_info: null,
      emergency_contacts: null,
      allergies: ['Penicillin'],
      diagnoses: ['Hypertension', 'Type 2 Diabetes'],
      code_status: 'full',
      diet: 'Low Sodium',
      physician_id: 'phys1',
      room_number: '101A',
      photo_url: null,
      is_active: true,
      is_active_monitoring: false,
      monitoring_start: null,
      monitoring_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      org_id: 'org1',
      facility_id: 'fac1',
      mrn: 'MRN002',
      first_name: 'Alice',
      last_name: 'Smith',
      date_of_birth: '1938-11-22',
      gender: 'female',
      ssn_last_four: '5678',
      admission_date: '2026-04-10',
      discharge_date: null,
      insurance_info: null,
      emergency_contacts: null,
      allergies: [],
      diagnoses: ['Congestive Heart Failure'],
      code_status: 'dnr',
      diet: 'Cardiac',
      physician_id: 'phys2',
      room_number: '102B',
      photo_url: null,
      is_active: true,
      is_active_monitoring: true,
      monitoring_start: new Date().toISOString(),
      monitoring_reason: 'Post-fall observation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      org_id: 'org1',
      facility_id: 'fac1',
      mrn: 'MRN003',
      first_name: 'Mary',
      last_name: 'Johnson',
      date_of_birth: '1952-08-04',
      gender: 'female',
      ssn_last_four: '9012',
      admission_date: '2026-04-20',
      discharge_date: null,
      insurance_info: null,
      emergency_contacts: null,
      allergies: ['Sulfa'],
      diagnoses: ['COPD', 'Osteoarthritis'],
      code_status: 'full',
      diet: 'Regular',
      physician_id: 'phys1',
      room_number: '103C',
      photo_url: null,
      is_active: true,
      is_active_monitoring: false,
      monitoring_start: null,
      monitoring_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    if (!staff?.org_id) {
      setLoading(false);
      return;
    }

    // Mock data replacement
    setPatients(MOCK_PATIENTS);
    setLoading(false);
    
    // Real fetching logic below is commented out for mock data usage
    /*
    const patientsRef = collection(db, 'organizations', staff.org_id, 'patients');
    const q = query(
      patientsRef, 
      where('is_active', '==', true),
      orderBy('last_name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients.');
      setLoading(false);
    });

    return () => unsubscribe();
    */
  }, [staff?.org_id]);

  const addPatient = async (data: Omit<Patient, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const patientsRef = collection(db, 'organizations', staff.org_id, 'patients');
    return await addDoc(patientsRef, {
      ...data,
      org_id: staff.org_id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updatePatient = async (patientId: string, data: Partial<Patient>) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const patientRef = doc(db, 'organizations', staff.org_id, 'patients', patientId);
    return await updateDoc(patientRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  };

  return { patients, loading, error, addPatient, updatePatient };
}

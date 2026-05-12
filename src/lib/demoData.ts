// ============================================================
// Quro — High-Fidelity Demo Data
// Used to provide a "Perfect Demo" for potential clients
// ============================================================
import { Patient, Medication, VitalSign, ProgressNote, MAREntry, ProviderOrder } from './firebase/types';

export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'manny-evil',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-1',
    mrn: '666-GHOST',
    first_name: 'Manny',
    last_name: 'Evil',
    date_of_birth: '1945-06-06',
    gender: 'male',
    admission_date: '2024-01-10',
    allergies: ['Penicillin', 'Sulfa'],
    diagnoses: ['Hypertension', 'Tachycardia', 'Chronic Kidney Disease'],
    code_status: 'dnr',
    diet: 'Low Sodium',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sarah-miller',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-2',
    mrn: 'MRN-8821',
    first_name: 'Sarah',
    last_name: 'Miller',
    date_of_birth: '1952-03-12',
    gender: 'female',
    admission_date: '2024-03-15',
    allergies: ['NKDA'],
    diagnoses: ['Post-Op Hip', 'Osteoarthritis'],
    code_status: 'full',
    diet: 'Regular',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'james-wilson',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-3',
    mrn: 'MRN-4492',
    first_name: 'James',
    last_name: 'Wilson',
    date_of_birth: '1938-11-22',
    gender: 'male',
    admission_date: '2023-11-05',
    allergies: ['Latex'],
    diagnoses: ['CHF', 'Diabetes Type II', 'COPD'],
    code_status: 'dnr_dni',
    diet: 'Diabetic / Cardiac',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'elena-rod',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-4',
    mrn: 'MRN-1102',
    first_name: 'Elena',
    last_name: 'Rodriguez',
    date_of_birth: '1949-08-30',
    gender: 'female',
    admission_date: '2024-02-20',
    allergies: ['Aspirin'],
    diagnoses: ['Early Onset Dementia', 'Anxiety'],
    code_status: 'full',
    diet: 'Soft / Mechanical',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'david-chen',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-5',
    mrn: 'MRN-9938',
    first_name: 'David',
    last_name: 'Chen',
    date_of_birth: '1955-01-15',
    gender: 'male',
    admission_date: '2024-04-01',
    allergies: ['NKDA'],
    diagnoses: ['Post-Stroke Rehab', 'Aphasia', 'Right-Side Weakness'],
    code_status: 'full',
    diet: 'Regular (Thickened Liquids)',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'frank-ocean',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-6',
    mrn: 'MRN-7721',
    first_name: 'Frank',
    last_name: 'Ocean',
    date_of_birth: '1960-10-28',
    gender: 'male',
    admission_date: '2024-04-10',
    allergies: ['Codeine'],
    diagnoses: ['Chronic Pain', 'Lumbago'],
    code_status: 'full',
    diet: 'Regular',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEMO_MEDICATIONS: Record<string, Medication[]> = {
  'manny-evil': [
    {
      id: 'med-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      generic_name: 'Lisinopril',
      strength: '20mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QD',
      indication: 'Hypertension',
      start_date: '2024-01-10',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'med-2',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      generic_name: 'Metoprolol Tartrate',
      strength: '25mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'BID',
      indication: 'Tachycardia',
      start_date: '2024-01-10',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'james-wilson': [
    {
      id: 'med-3',
      org_id: 'SYSTEM',
      patient_id: 'james-wilson',
      generic_name: 'Furosemide',
      strength: '40mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QAM',
      indication: 'CHF / Edema',
      start_date: '2023-11-05',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'med-4',
      org_id: 'SYSTEM',
      patient_id: 'james-wilson',
      generic_name: 'Metformin',
      strength: '500mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'BID',
      indication: 'Diabetes Type II',
      start_date: '2023-11-05',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

export const DEMO_VITALS: Record<string, VitalSign[]> = {
  'manny-evil': [
    {
      id: 'v-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      recorded_by: 'nurse-1',
      systolic: 148,
      diastolic: 92,
      pulse: 112,
      temperature: 99.1,
      o2sat: 96,
      is_alert: true,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ]
};

export const DEMO_NOTES: Record<string, ProgressNote[]> = {
  'manny-evil': [
    {
      id: 'n-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      authored_by: 'nurse-1',
      type: 'shift_assessment',
      content: 'Resident alert but anxious. BP remains elevated despite AM dose. Pulse slightly tachycardic at rest. Denies chest pain or SOB. Monitoring closely.',
      status: 'SIGNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

export const DEMO_MAR: Record<string, MarEntry[]> = {
  'manny-evil': [
    {
      id: 'mar-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      medication_id: 'med-1',
      medication_name: 'Lisinopril',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '09:00',
      actual_time: '09:05',
      action: 'given',
      administered_by: 'nurse-1',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

export const DEMO_ORDERS: Record<string, ProviderOrder[]> = {
  'manny-evil': [
    {
      id: 'ord-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      order_type: 'medication',
      content: 'Metoprolol Tartrate 25mg PO BID for Tachycardia',
      status: 'signed',
      provider_name: 'Dr. Gregory House',
      signed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

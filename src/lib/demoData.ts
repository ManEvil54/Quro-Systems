// ============================================================
// Quro — High-Fidelity Demo Data
// Updated with user-specified patient clinical profiles
// ============================================================
import { Patient, Medication, VitalSign, ProgressNote, MAREntry, ProviderOrder } from './firebase/types';

export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'robert-chen',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-1',
    mrn: 'MRN-002',
    first_name: 'Robert',
    last_name: 'Chen',
    full_name: 'Robert Chen',
    date_of_birth: '1955-05-15',
    gender: 'male',
    admission_date: '2024-01-10',
    allergies: ['NKDA'],
    diagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Peripheral Neuropathy'],
    code_status: 'full',
    diet: 'Diabetic',
    room_number: '101-A',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'victor-dumont',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-2',
    mrn: 'MRN-006',
    first_name: 'Victor',
    last_name: 'Dumont',
    full_name: 'Victor Dumont',
    date_of_birth: '1948-11-20',
    gender: 'male',
    admission_date: '2024-03-01',
    allergies: ['Morphine'],
    diagnoses: ['Metastatic Prostate Cancer', 'Chronic Pain', 'Depression'],
    code_status: 'comfort',
    diet: 'Regular as tolerated',
    room_number: '102-A',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sarah-jenkins',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-3',
    mrn: 'MRN-005',
    first_name: 'Sarah',
    last_name: 'Jenkins',
    full_name: 'Sarah Jenkins',
    date_of_birth: '1952-08-12',
    gender: 'female',
    admission_date: '2024-02-15',
    allergies: ['Sulfa'],
    diagnoses: ['Rheumatoid Arthritis', 'GERD', 'Anemia', 'Sjogren\'s Syndrome'],
    code_status: 'full',
    diet: 'Regular',
    room_number: '103-A',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'manny-evil',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-4',
    mrn: '666-GHOST',
    first_name: 'Manny',
    last_name: 'Evil',
    full_name: 'Manny Evil',
    date_of_birth: '1945-06-06',
    gender: 'male',
    admission_date: '2024-01-10',
    allergies: ['Penicillin'],
    diagnoses: ['Hypertension', 'Tachycardia', 'Chronic Kidney Disease'],
    code_status: 'dnr',
    diet: 'Low Sodium',
    room_number: '104-A',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'elena-rod',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-5',
    mrn: 'MRN-1102',
    first_name: 'Elena',
    last_name: 'Rodriguez',
    full_name: 'Elena Rodriguez',
    date_of_birth: '1949-08-30',
    gender: 'female',
    admission_date: '2024-02-20',
    allergies: ['Aspirin'],
    diagnoses: ['Early Onset Dementia', 'Anxiety'],
    code_status: 'full',
    diet: 'Soft / Mechanical',
    room_number: '105-A',
    is_active: true,
    is_active_monitoring: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'david-chen',
    org_id: 'SYSTEM',
    facility_id: 'platinum-health-hub',
    bed_id: 'bed-6',
    mrn: 'MRN-9938',
    first_name: 'David',
    last_name: 'Chen',
    full_name: 'David Chen',
    date_of_birth: '1955-01-15',
    gender: 'male',
    admission_date: '2024-04-01',
    allergies: ['NKDA'],
    diagnoses: ['Post-Stroke Rehab', 'Aphasia', 'Right-Side Weakness'],
    code_status: 'full',
    diet: 'Regular (Thickened Liquids)',
    room_number: '106-A',
    is_active: true,
    is_active_monitoring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEMO_MEDICATIONS: Record<string, Medication[]> = {
  'robert-chen': [
    {
      id: 'med-rc-1',
      org_id: 'SYSTEM',
      patient_id: 'robert-chen',
      generic_name: 'Metformin',
      strength: '500mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'BID',
      indication: 'Type 2 Diabetes',
      start_date: '2024-01-10',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'med-rc-2',
      org_id: 'SYSTEM',
      patient_id: 'robert-chen',
      generic_name: 'Lisinopril',
      strength: '10mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QD',
      indication: 'Hypertension',
      start_date: '2024-01-10',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'victor-dumont': [
    {
      id: 'med-vd-1',
      org_id: 'SYSTEM',
      patient_id: 'victor-dumont',
      generic_name: 'Oxycodone',
      strength: '5mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'PRN',
      indication: 'Chronic Pain',
      start_date: '2024-03-01',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'med-vd-2',
      org_id: 'SYSTEM',
      patient_id: 'victor-dumont',
      generic_name: 'Sertraline',
      strength: '50mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QD',
      indication: 'Depression',
      start_date: '2024-03-01',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'sarah-jenkins': [
    {
      id: 'med-sj-1',
      org_id: 'SYSTEM',
      patient_id: 'sarah-jenkins',
      generic_name: 'Methotrexate',
      strength: '2.5mg',
      dosage: '3 tablets',
      route: 'PO',
      frequency: 'WEEKLY',
      indication: 'Rheumatoid Arthritis',
      start_date: '2024-02-15',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'med-sj-2',
      org_id: 'SYSTEM',
      patient_id: 'sarah-jenkins',
      generic_name: 'Omeprazole',
      strength: '20mg',
      dosage: '1 capsule',
      route: 'PO',
      frequency: 'QD',
      indication: 'GERD',
      start_date: '2024-02-15',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'manny-evil': [
    {
      id: 'med-me-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      generic_name: 'Amlodipine',
      strength: '5mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QD',
      indication: 'Hypertension',
      start_date: '2024-01-10',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'elena-rod': [
    {
      id: 'med-er-1',
      org_id: 'SYSTEM',
      patient_id: 'elena-rod',
      generic_name: 'Donepezil',
      strength: '10mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QHS',
      indication: 'Dementia',
      start_date: '2024-02-20',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'david-chen': [
    {
      id: 'med-dc-1',
      org_id: 'SYSTEM',
      patient_id: 'david-chen',
      generic_name: 'Aspirin',
      strength: '81mg',
      dosage: '1 tablet',
      route: 'PO',
      frequency: 'QD',
      indication: 'Stroke Prophylaxis',
      start_date: '2024-04-01',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

export const DEMO_VITALS: Record<string, VitalSign[]> = {
  'robert-chen': [
    {
      id: 'v-rc-1',
      org_id: 'SYSTEM',
      patient_id: 'robert-chen',
      recorded_by: 'nurse-1',
      systolic: 138,
      diastolic: 84,
      pulse: 78,
      temperature: 98.6,
      spO2: 98,
      is_alert: false,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  'manny-evil': [
    {
      id: 'v-me-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      recorded_by: 'nurse-1',
      systolic: 148,
      diastolic: 92,
      pulse: 112,
      temperature: 99.1,
      spO2: 96,
      is_alert: true,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  'david-chen': [
    {
      id: 'v-dc-1',
      org_id: 'SYSTEM',
      patient_id: 'david-chen',
      recorded_by: 'nurse-1',
      systolic: 140,
      diastolic: 90,
      pulse: 105,
      temperature: 100.2,
      spO2: 94,
      is_alert: true,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ]
};

export const DEMO_NOTES: Record<string, ProgressNote[]> = {
  'robert-chen': [
    {
      id: 'n-rc-1',
      org_id: 'SYSTEM',
      patient_id: 'robert-chen',
      authored_by: 'nurse-1',
      type: 'shift_assessment',
      content: 'Patient is alert and oriented. Fasting glucose was 112 mg/dL. Skin is intact. Resumed physical therapy today without issues.',
      status: 'SIGNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'victor-dumont': [
    {
      id: 'n-vd-1',
      org_id: 'SYSTEM',
      patient_id: 'victor-dumont',
      authored_by: 'nurse-1',
      type: 'shift_assessment',
      content: 'Resident resting comfortably. Reported pain level 3/10 after PRN dose. Affect remains flat, monitoring for signs of worsening depression.',
      status: 'SIGNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'sarah-jenkins': [
    {
      id: 'n-sj-1',
      org_id: 'SYSTEM',
      patient_id: 'sarah-jenkins',
      authored_by: 'nurse-1',
      type: 'shift_assessment',
      content: 'Patient compliant with ROM exercises. Complained of dry eyes (Sjogren\'s), administered artificial tears. Appetite is good.',
      status: 'SIGNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'manny-evil': [
    {
      id: 'n-me-1',
      org_id: 'SYSTEM',
      patient_id: 'manny-evil',
      authored_by: 'nurse-1',
      type: 'shift_assessment',
      content: 'Patient experiencing intermittent chest tightness. BP elevated at 148/92. MD notified, ordered 12-lead EKG and increased fluid restriction.',
      status: 'SIGNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

export const DEMO_MAR: Record<string, MAREntry[]> = {
  'robert-chen': [
    {
      id: 'mar-rc-1',
      org_id: 'SYSTEM',
      patient_id: 'robert-chen',
      medication_id: 'med-rc-1',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '08:00',
      actual_time: '08:15',
      action: 'given',
      administered_by: 'nurse-1',
      created_at: new Date().toISOString()
    }
  ],
  'victor-dumont': [
    {
      id: 'mar-vd-1',
      org_id: 'SYSTEM',
      patient_id: 'victor-dumont',
      medication_id: 'med-vd-1',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00',
      actual_time: '12:05',
      action: 'given',
      administered_by: 'nurse-1',
      created_at: new Date().toISOString()
    }
  ]
};

export const DEMO_ORDERS: Record<string, ProviderOrder[]> = {
  'robert-chen': [
    {
      id: 'ord-rc-1',
      org_id: 'SYSTEM',
      facility_id: 'platinum-health-hub',
      patient_id: 'robert-chen',
      ordering_physician_id: 'dr-house',
      order_type: 'medication',
      order_text: 'Increase Metformin to 1000mg BID if fasting glucose > 150',
      priority: 'routine',
      status: 'signed',
      signed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  'victor-dumont': [
    {
      id: 'ord-vd-1',
      org_id: 'SYSTEM',
      facility_id: 'platinum-health-hub',
      patient_id: 'victor-dumont',
      ordering_physician_id: 'dr-house',
      order_type: 'other',
      order_text: 'Palliative care consult for pain management titration.',
      priority: 'routine',
      status: 'signed',
      signed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

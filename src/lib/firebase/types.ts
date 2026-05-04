export type StaffRole = 'SUPER_ADMIN' | 'FACILITY_ADMIN' | 'admin' | 'physician' | 'nurse' | 'cna' | 'pharmacist' | 'billing';
export type MedRoute = 'PO' | 'SL' | 'IM' | 'IV' | 'SC' | 'PR' | 'TOP' | 'INH' | 'OPH' | 'OTC' | 'NGT' | 'PATCH';
export type MedFrequency = 'QD' | 'BID' | 'TID' | 'QID' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'QHS' | 'QAM' | 'QPM' | 'PRN' | 'STAT' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type MedStatus = 'active' | 'discontinued' | 'on_hold' | 'completed' | 'signed';
export type OrderStatus = 'draft' | 'signed' | 'acknowledged' | 'sent_to_pharmacy' | 'filled' | 'cancelled';
export type Shift = 'day' | 'evening' | 'night';

export interface Staff {
  id: string;
  auth_id: string;
  org_id: string;
  facility_id: string | null;
  first_name: string;
  last_name: string;
  initials: string;
  role: StaffRole;
  credential?: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  is_onboarded: boolean;
  must_change_password?: boolean;
  access_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  contact_email?: string;
  contact_phone?: string;
  max_facilities?: number;
  subscription_tier?: 'standard' | 'premium' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  org_id: string;
  name: string;
  max_patients?: number;
  phone?: string;
  fax?: string;
  administrator_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  org_id: string;
  facility_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'undisclosed';
  ssn_last_four?: string;
  admission_date: string;
  discharge_date?: string | null;
  allergies?: string[];
  diagnoses?: string[];
  code_status: 'full' | 'dnr' | 'dnr_dni' | 'comfort';
  diet?: string;
  physician_id?: string;
  is_active: boolean;
  is_active_monitoring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  org_id: string;
  patient_id: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage: string;
  route: MedRoute;
  frequency: MedFrequency;
  frequency_times?: string[];
  indication?: string;
  prescriber_id?: string;
  start_date: string;
  end_date?: string | null;
  status: MedStatus;
  requires_vitals?: boolean;
  vital_type?: 'bp' | 'hr' | 'glucose' | 'o2sat';
  is_psychotropic?: boolean;
  special_instructions?: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MAREntry {
  id: string;
  org_id: string;
  patient_id: string;
  medication_id: string;
  administered_by: string;
  scheduled_date: string;
  scheduled_time: string;
  action: 'given' | 'held' | 'refused' | 'not_available' | 'see_notes';
  actual_time: string;
  vital_reading?: any;
  notes?: string;
  created_at: string;
}

export interface ProviderOrder {
  id: string;
  org_id: string;
  patient_id: string;
  facility_id: string;
  ordering_physician_id: string;
  acknowledging_nurse_id?: string;
  order_type: 'medication' | 'lab' | 'imaging' | 'therapy' | 'diet' | 'other';
  order_text: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: OrderStatus;
  signed_at?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HandoverNote {
  id: string;
  org_id: string;
  facility_id: string;
  patient_id?: string;
  authored_by: string;
  shift: Shift;
  shift_date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  general_notes?: string;
  is_urgent: boolean;
  created_at: string;
}

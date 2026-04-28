// ============================================================
// Quro — Database TypeScript Types
// Firestore Collection Interfaces
// ============================================================

export type StaffRole = 'admin' | 'physician' | 'nurse' | 'cna' | 'pharmacist' | 'billing';
export type MedRoute = 'PO' | 'SL' | 'IM' | 'IV' | 'SC' | 'PR' | 'TOP' | 'INH' | 'OPH' | 'OTC' | 'NGT' | 'PATCH';
export type MedFrequency = 'QD' | 'BID' | 'TID' | 'QID' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'QHS' | 'QAM' | 'QPM' | 'PRN' | 'STAT' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type MedStatus = 'active' | 'discontinued' | 'on_hold' | 'completed' | 'signed';
export type MarAction = 'given' | 'held' | 'refused' | 'not_available' | 'see_notes';
export type OrderStatus = 'draft' | 'signed' | 'acknowledged' | 'sent_to_pharmacy' | 'filled' | 'cancelled';
export type ContactType = 'phone_call' | 'visit' | 'email' | 'video_call' | 'letter';
export type Shift = 'day' | 'evening' | 'night';

// ---- Firestore Collection: organizations ----
export interface Organization {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: Record<string, string> | null;
  license_number: string | null;
  max_facilities: number;
  subscription_tier: 'standard' | 'premium' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  email: string;
  role: StaffRole;
  facility_id: string | null;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string;
  created_at: any;
  expires_at: string;
}

// ---- Firestore Collection: organizations/{orgId}/facilities ----
export interface Facility {
  id: string;
  org_id: string;
  name: string;
  facility_type: 'clhf' | 'snf' | 'alf';
  address: Record<string, string> | null;
  phone: string | null;
  fax: string | null;
  license_number: string | null;
  max_patients: number;
  administrator_name: string | null;
  mar_template?: {
    id: string;
    label: string;
    category: 'vital' | 'monitoring' | 'treatment' | 'ADL';
    frequency: string;
  }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Firestore Collection: organizations/{orgId}/staff ----
export interface Staff {
  id: string;
  auth_id: string | null;
  org_id: string;
  facility_id: string | null;
  first_name: string;
  last_name: string;
  initials: string;
  role: StaffRole;
  credential: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_onboarded: boolean;
  must_change_password: boolean;
  access_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Firestore Subcollection: .../facilities/{facilityId}/patients ----
export interface Patient {
  id: string;
  org_id: string;
  facility_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  ssn_last_four: string | null;
  admission_date: string;
  discharge_date: string | null;
  insurance_info: Record<string, unknown> | null;
  emergency_contacts: Record<string, unknown> | null;
  allergies: string[];
  diagnoses: string[];
  code_status: 'full' | 'dnr' | 'dnr_dni' | 'comfort';
  diet: string | null;
  physician_id: string | null;
  room_number: string | null;
  photo_url: string | null;
  is_active: boolean;
  is_active_monitoring: boolean;
  monitoring_start: string | null;
  monitoring_reason: string | null;
  mar_custom_rows?: string[];
  mar_special_notes?: string;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../patients/{patientId}/medications ----
export interface Medication {
  id: string;
  org_id: string;
  patient_id: string;
  generic_name: string;
  brand_name: string | null;
  strength: string;
  dosage: string;
  route: MedRoute;
  frequency: MedFrequency;
  frequency_times: string[];
  indication: string | null;
  prescriber_id: string | null;
  pharmacy_name: string | null;
  rx_number: string | null;
  start_date: string;
  end_date: string | null;
  status: MedStatus;
  requires_vitals: boolean;
  vital_type: string | null;
  vital_threshold_low: number | null;
  vital_threshold_high: number | null;
  is_psychotropic: boolean;
  psychotropic_monitoring: string[];
  special_instructions: string | null;
  order_id: string | null;
  order_type: 'direct' | 'telephone' | 'standing';
  transcribed_by_id?: string;
  transcribed_by_name?: string;
  prescriber_name?: string;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../patients/{patientId}/mar_entries ----
export interface MarEntry {
  id: string;
  org_id: string;
  patient_id: string;
  medication_id: string;
  administered_by: string | null;
  scheduled_date: string;
  scheduled_time: string;
  action: MarAction | null;
  actual_time: string | null;
  vital_reading: Record<string, number> | null;
  notes: string | null;
  is_supplementary: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../patients/{patientId}/handoff_logs ----
export interface HandoffEntry {
  id: string;
  org_id: string;
  facility_id: string;
  patient_id: string;
  outgoing_nurse_id: string;
  outgoing_nurse_name: string;
  incoming_nurse_id?: string;
  shift_type: 'day' | 'evening' | 'night';
  situation: string;
  assessment: string;
  recommendation: string;
  vitals_summary?: {
    bp: string;
    pulse: string;
    temp: string;
    o2: string;
    glucose?: string;
  };
  significant_events: string[];
  pending_tasks: string[];
  is_signed_off: boolean;
  signed_at?: string;
  created_at: string;
}

// ---- Subcollection: .../patients/{patientId}/provider_orders ----
export interface ProviderOrder {
  id: string;
  org_id: string;
  patient_id: string;
  facility_id: string;
  ordering_physician_id: string;
  acknowledging_nurse_id: string | null;
  order_type: 'medication' | 'lab' | 'imaging' | 'therapy' | 'diet' | 'other';
  order_text: string;
  priority: 'stat' | 'urgent' | 'routine';
  status: OrderStatus;
  signed_at: string | null;
  acknowledged_at: string | null;
  faxed_at: string | null;
  pharmacy_fax_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../patients/{patientId}/vital_signs ----
export interface VitalSign {
  id: string;
  org_id: string;
  patient_id: string;
  recorded_by: string | null;
  recorded_at: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  o2_saturation: number | null;
  blood_glucose: number | null;
  weight: number | null;
  pain_level: number | null;
  notes: string | null;
  is_alert: boolean;
  alert_message: string | null;
  created_at: string;
}

// ---- Subcollection: .../patients/{patientId}/fall_reports ----
export interface FallReport {
  id: string;
  org_id: string;
  patient_id: string;
  reported_by: string | null;
  fall_datetime: string;
  location: string | null;
  witnessed: boolean;
  witness_name: string | null;
  injury_description: string | null;
  interventions: string[];
  physician_notified: boolean;
  physician_notified_at: string | null;
  family_notified: boolean;
  family_notified_at: string | null;
  monitoring_end_date: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../facilities/{facilityId}/handover_notes ----
export interface HandoverNote {
  id: string;
  org_id: string;
  facility_id: string;
  patient_id: string | null;
  authored_by: string;
  shift: Shift | null;
  shift_date: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  general_notes: string | null;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Subcollection: .../handover_notes/{noteId}/acks ----
export interface HandoverAck {
  id: string;
  org_id: string;
  handover_note_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
}

// ---- Subcollection: .../patients/{patientId}/family_logs ----
export interface FamilyLog {
  id: string;
  org_id: string;
  patient_id: string;
  logged_by: string;
  contact_type: ContactType | null;
  contact_name: string;
  relationship: string | null;
  direction: 'inbound' | 'outbound' | null;
  summary: string;
  follow_up_needed: boolean;
  follow_up_date: string | null;
  contacted_at: string;
  created_at: string;
}

// ---- Collection: organizations/{orgId}/audit_log ----
export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

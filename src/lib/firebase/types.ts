export type StaffRole = 
  | 'APP_OWNER'      // Quro System Owner - Full platform control
  | 'APP_TECH'       // Quro Technical Staff - Troubleshooting & Facility Access
  | 'CLIENT_ADMIN'   // Client/Organization Owner - Manage Org, Facilities, & Staff
  | 'admin'          // Administrative role
  | 'SURVEYOR'       // Regulatory Auditor - Read-only access to Client/Facilities
  | 'FACILITY_ADMIN' // Local Facility Manager
  | 'nurse'          // Clinician
  | 'physician'      // Clinician
  | 'cna'            // Clinician
  | 'pharmacist'     // Support
  | 'billing';       // Support
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
  assigned_facility_ids?: string[];
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
  clinical_settings?: {
    mar_template_psych: boolean;
    mar_template_weights: boolean;
    mar_template_sleep: boolean;
    emar_mode: boolean; // Toggle between Hybrid (Print) and Full Electronic
    require_pin_for_narcotics: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  org_id: string;
  name: string;
  max_patients?: number;
  bed_count?: number | null;
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
  room_id?: string | null;
  bed_id?: string | null;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name: string;
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
  attending_physician?: string;
  room_number?: string;
  photo_url?: string;
  is_active: boolean;
  is_active_monitoring: boolean;
  monitoring_start?: string | null;
  monitoring_reason?: string | null;
  current_vitals?: {
    pulse?: number;
    systolic?: number;
    diastolic?: number;
    temperature?: number;
    spO2?: number;
    resp?: number;
    glucose?: number;
    pain_level?: number;
    weight?: number;
    is_alert: boolean;
    recorded_at: string;
    recorded_by_name?: string;
  };
  respiratory_state?: RespiratoryState;
  enteral_state?: EnteralState;
  insurance_info?: InsuranceInfo;
  pharmacy_info?: PharmacyInfo;
  family_members?: FamilyMember[];
  emergency_contact?: string;
  mar_custom_rows?: string[];
  mar_special_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceInfo {
  provider_name?: string;
  policy_number?: string;
  group_number?: string;
  phone?: string;
}

export interface PharmacyInfo {
  name?: string;
  phone?: string;
  address?: string;
  fax?: string;
}

export interface FamilyMember {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_emergency_contact?: boolean;
}

export interface RespiratoryState {
  o2_delivery: 'Room Air' | 'Nasal Cannula' | 'Trach Mask' | 'Ventilator' | 'Cool Mist';
  lpm?: number;
  fio2_percent?: number;
  vent_settings?: {
    mode: 'AC/VC' | 'AC/PC' | 'SIMV' | 'CPAP/PS' | 'Other';
    rate?: number;
    tidal_volume?: number;
    peep?: number;
    pressure_support?: number;
    fio2?: number;
  };
  trach_size?: string;
  trach_type?: string;
  last_trach_change?: string;
  stoma_condition: 'Healthy' | 'Redness' | 'Drainage' | 'Granulation';
  suction_frequency: 'Shiftly' | 'PRN' | 'Q4H';
  secretions_consistency: 'Thin' | 'Thick';
  secretions_color: 'Clear' | 'White' | 'Yellow' | 'Green';
  lung_sounds: {
    ruq: 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';
    luq: 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';
    rlq: 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';
    llq: 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';
  };
}

export interface EnteralState {
  formula_name: string;
  delivery_method: 'Continuous' | 'Bolus';
  rate_ml_hr?: number;
  bolus_volume?: number;
  bolus_frequency?: string;
  water_flush_pre: number;
  water_flush_post: number;
  last_residual_volume: number;
  last_residual_at: string;
  site_condition: 'Normal' | 'Redness' | 'Drainage' | 'Granulation';
  is_paused: boolean;
}

export interface VitalSign {
  id: string;
  org_id: string;
  patient_id: string;
  recorded_by: string;
  temperature?: number;
  pulse?: number;
  resp?: number;
  systolic?: number;
  diastolic?: number;
  spO2?: number;
  weight?: number;
  glucose?: number;
  pain_level?: number;
  notes?: string;
  is_alert: boolean;
  alert_message?: string;
  recorded_at: string;
  created_at: string;
}

export interface Medication {
  id: string;
  org_id: string;
  patient_id: string;
  generic_name: string;
  rxcui?: string | null;
  brand_name?: string;
  strength: string;
  dose?: string | null;
  dosage: string;
  route: MedRoute;
  frequency: MedFrequency;
  frequency_times?: string[];
  indication?: string;
  prn_reason?: string | null;
  prn_interval?: string | null;
  prescriber_id?: string | null;
  prescriber_name?: string | null;
  pharmacy_name?: string | null;
  rx_number?: string | null;
  transcribed_by_id?: string | null;
  transcribed_by_name?: string | null;
  start_date: string;
  end_date?: string | null;
  status: MedStatus;
  requires_vitals?: boolean;
  vital_type?: 'bp' | 'hr' | 'glucose' | 'spO2' | null;
  vital_threshold_low?: number | null;
  vital_threshold_high?: number | null;
  is_psychotropic?: boolean;
  psychotropic_monitoring?: string[];
  special_instructions?: string;
  order_id?: string | null;
  order_type?: 'direct' | 'e-rx' | 'telephone';
  created_at: string;
  updated_at: string;
}

export type MARAction = 'given' | 'held' | 'refused' | 'npo' | 'absent';

export interface MAREntry {
  id: string;
  org_id: string;
  patient_id: string;
  medication_id: string;
  action: MARAction;
  delay_reason?: string;
  administered_by: string;
  witnessed_by?: string; // For narcotics/insulin
  
  // Compliance & Audit
  audit_log?: {
    ip_address: string;
    device_id: string;
    auth_method: 'pin' | 'biometric' | 'session';
    timestamp: string;
  };

  // Vitals linked to administration
  linked_vitals?: {
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    temp?: number;
  };

  // PRN Effectiveness
  is_prn?: boolean;
  effectiveness_noted_at?: string;
  effectiveness_score?: number; // 1-10
  effectiveness_comment?: string;

  scheduled_date: string;
  scheduled_time: string;
  actual_time: string;
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
  order_type: 'medication' | 'lab' | 'imaging' | 'therapy' | 'diet' | 'treatment' | 'other';
  order_text: string;
  rxcui?: string | null;
  priority: 'routine' | 'urgent' | 'stat';
  status: OrderStatus;
  signed_at?: string;
  acknowledged_at?: string;
  faxed_at?: string;
  order_method?: 'direct' | 'telephone';
  
  // Medication-specific structured order details (for drafts and signature tracking)
  generic_name?: string;
  strength?: string;
  dose?: string | null;
  dosage?: string;
  route?: MedRoute;
  frequency?: MedFrequency;
  indication?: string;
  prn_reason?: string | null;
  prn_interval?: string | null;
  is_psychotropic?: boolean;
  special_instructions?: string;
  requires_vitals?: boolean;
  vital_type?: 'bp' | 'hr' | 'glucose' | 'spO2' | null;
  vital_threshold_low?: number | null;
  vital_threshold_high?: number | null;
  frequency_times?: string[];
  
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

export interface HandoverAck {
  id: string;
  org_id: string;
  handover_note_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
}

export interface ProgressNote {
  id: string;
  org_id: string;
  patient_id: string;
  authored_by: string;
  type: 'shift_assessment' | 'narrative' | 'clinical' | 'social';
  content: string;
  assessments?: {
    // I. Vitals & I&O
    vitals?: {
      temp?: number;
      pulse?: number;
      resp?: number;
      bp_systolic?: number;
      bp_diastolic?: number;
      bp_site?: 'L-Arm' | 'R-Arm' | 'Thigh';
      bp_position?: 'Sitting' | 'Standing' | 'Lying';
      spo2?: number;
    };
    io?: {
      fluids_in_ml?: number;
      voiding_count?: number;
      bm_count?: number;
      bristol_scale?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    };

    // II. ADL & Care
    care?: {
      oral_care: boolean;
      peri_care: boolean;
      bathing: 'Completed' | 'Refused' | 'N/A';
      meal_percent?: 0 | 25 | 50 | 75 | 100;
    };

    // III. Physical Assessment
    systems?: {
      resp_sounds?: 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';
      o2_method?: 'Room Air' | 'NC' | 'Mask';
      o2_flow?: number;
      edema?: 'None' | '1+' | '2+' | '3+' | '4+';
      pulses_present: boolean;
      pain_level?: number; // 0-10
      pain_location?: string;
      skin_intact: boolean;
    };

    // IV. Safety
    safety?: {
      safety_check: boolean;
      bed_rails_up: boolean;
      call_light_reach: boolean;
      alarm_active: boolean;
    };
    respiratory?: RespiratoryState;
    enteral?: EnteralState;
  };
  status: 'DRAFT' | 'SIGNED';
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  org_id: string;
  facility_id: string;
  patient_id?: string;
  patient_name?: string; // Cache for performance
  type: 'fall' | 'injury' | 'med_error' | 'skin_breakdown' | 'behavioral' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  witnesses?: string[];
  reported_by: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  status: 'reported' | 'investigating' | 'resolved';
}

export interface Room {
  id: string;
  facility_id: string;
  org_id: string;
  name: string; // e.g. "Room 101"
  type: 'private' | 'semi-private' | 'ward';
  is_active: boolean;
  created_at: string;
}

export interface Bed {
  id: string;
  room_id: string;
  facility_id: string;
  org_id: string;
  name: string; // e.g. "Bed A"
  patient_id?: string | null;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  created_at: string;
}
export interface Treatment {
  id: string;
  org_id: string;
  patient_id: string;
  treatment_name: string;
  site?: string;
  frequency: string;
  frequency_times?: string[];
  duration?: string;
  indication?: string;
  prescriber_id?: string;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'discontinued' | 'completed';
  instructions?: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentEntry {
  id: string;
  org_id: string;
  patient_id: string;
  treatment_id: string;
  action: 'done' | 'refused' | 'absent';
  performed_by: string;
  scheduled_date: string;
  scheduled_time: string;
  actual_time: string;
  notes?: string;
  created_at: string;
}
export interface HandoffEntry {
  id: string;
  org_id: string;
  facility_id: string | null;
  patient_id: string;
  outgoing_nurse_id: string;
  outgoing_nurse_name: string;
  incoming_nurse_id?: string;
  shift_type: Shift;
  situation: string;
  assessment: string;
  recommendation: string;
  vitals_summary?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    o2?: string;
    glucose?: string;
  };
  significant_events: string[];
  pending_tasks: string[];
  is_signed_off: boolean;
  signed_at?: string;
  created_at: string;
}

export interface StaffInvitation {
  id: string;
  email: string;
  role: string;
  facility_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface CarePlanCard {
  id: 'respiratory' | 'skin' | 'adl';
  title: string;
  problem_statement: string;
  goals: string[];
  interventions: string[];
  schedule: string;
}

export interface CarePlan {
  id?: string;
  org_id: string;
  patient_id: string;
  status: 'draft' | 'active' | 'archived';
  cards: CarePlanCard[];
  disclaimer: string;
  created_at: string;
  updated_at: string;
  signed_by?: string | null;
  signed_by_name?: string | null;
  signed_at?: string | null;
}


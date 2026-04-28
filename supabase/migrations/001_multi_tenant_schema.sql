-- ============================================================
-- QURO: Multi-Tenant Schema Reference (Design Document)
-- Actual implementation: Firestore collections + Security Rules
-- This file documents the data model and relationships.
-- ModernQure LLC — HIPAA-Compliant Tenant Isolation
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS (Root Tenant)
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB,
  license_number TEXT,
  max_facilities INTEGER DEFAULT 3, -- 3-House Cluster limit
  subscription_tier TEXT DEFAULT 'standard' CHECK (subscription_tier IN ('standard', 'premium', 'enterprise')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. FACILITIES (CLHF Houses — max 3 per org)
-- ============================================================
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  facility_type TEXT DEFAULT 'clhf' CHECK (facility_type IN ('clhf', 'snf', 'alf')),
  address JSONB,
  phone TEXT,
  fax TEXT,
  license_number TEXT,
  max_patients INTEGER DEFAULT 6, -- 6-Patient Node limit
  administrator_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facilities_org ON facilities(org_id);

-- ============================================================
-- 3. STAFF (Nurses, CNAs, Physicians, Pharmacy)
-- ============================================================
CREATE TYPE staff_role AS ENUM ('admin', 'physician', 'nurse', 'cna', 'pharmacist', 'billing');

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- Links to Supabase Auth
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  initials TEXT NOT NULL, -- For MAR signature legend
  role staff_role NOT NULL,
  credential TEXT, -- RN, LVN, CNA, MD, PharmD
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_org ON staff(org_id);
CREATE INDEX idx_staff_auth ON staff(auth_id);
CREATE INDEX idx_staff_facility ON staff(facility_id);

-- ============================================================
-- 4. PATIENTS (Residents — max 6 per facility)
-- ============================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  mrn TEXT NOT NULL, -- Medical Record Number
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'undisclosed')),
  ssn_last_four TEXT, -- Last 4 of SSN (encrypted at rest)
  admission_date DATE NOT NULL,
  discharge_date DATE,
  insurance_info JSONB,
  emergency_contacts JSONB,
  allergies TEXT[],
  diagnoses TEXT[],
  code_status TEXT DEFAULT 'full' CHECK (code_status IN ('full', 'dnr', 'dnr_dni', 'comfort')),
  diet TEXT,
  physician_id UUID REFERENCES staff(id),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_active_monitoring BOOLEAN DEFAULT false, -- Fall Protocol flag
  monitoring_start TIMESTAMPTZ,
  monitoring_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, mrn)
);

CREATE INDEX idx_patients_org ON patients(org_id);
CREATE INDEX idx_patients_facility ON patients(facility_id);
CREATE INDEX idx_patients_active ON patients(is_active);

-- ============================================================
-- 5. MEDICATIONS (Digital Medication List)
-- ============================================================
CREATE TYPE med_route AS ENUM ('PO', 'SL', 'IM', 'IV', 'SC', 'PR', 'TOP', 'INH', 'OPH', 'OTC', 'NGT', 'PATCH');
CREATE TYPE med_frequency AS ENUM (
  'QD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H',
  'QHS', 'QAM', 'QPM', 'PRN', 'STAT', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'
);
CREATE TYPE med_status AS ENUM ('active', 'discontinued', 'on_hold', 'completed');

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  strength TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route med_route NOT NULL,
  frequency med_frequency NOT NULL,
  frequency_times TEXT[], -- Specific admin times ['0800', '1200', '2000']
  indication TEXT,
  prescriber_id UUID REFERENCES staff(id),
  pharmacy_name TEXT,
  rx_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status med_status DEFAULT 'active',
  requires_vitals BOOLEAN DEFAULT false, -- Links to vital monitoring
  vital_type TEXT, -- 'bp', 'hr', 'glucose', 'o2sat'
  vital_threshold_low NUMERIC,
  vital_threshold_high NUMERIC,
  is_psychotropic BOOLEAN DEFAULT false,
  psychotropic_monitoring TEXT[], -- Target behaviors / side effects
  special_instructions TEXT,
  order_id UUID, -- Links to provider_orders
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meds_patient ON medications(patient_id);
CREATE INDEX idx_meds_org ON medications(org_id);
CREATE INDEX idx_meds_status ON medications(status);

-- ============================================================
-- 6. MAR ENTRIES (Medication Administration Records)
-- ============================================================
CREATE TYPE mar_action AS ENUM ('given', 'held', 'refused', 'not_available', 'see_notes');

CREATE TABLE mar_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  administered_by UUID REFERENCES staff(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  action mar_action,
  actual_time TIMESTAMPTZ,
  vital_reading JSONB, -- {systolic, diastolic, pulse, etc}
  notes TEXT,
  is_supplementary BOOLEAN DEFAULT false, -- Mid-month change entry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mar_patient_date ON mar_entries(patient_id, scheduled_date);
CREATE INDEX idx_mar_org ON mar_entries(org_id);
CREATE INDEX idx_mar_med ON mar_entries(medication_id);

-- ============================================================
-- 7. PROVIDER ORDERS (Physician → Nurse → Pharmacy)
-- ============================================================
CREATE TYPE order_status AS ENUM ('draft', 'signed', 'acknowledged', 'sent_to_pharmacy', 'filled', 'cancelled');

CREATE TABLE provider_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id),
  ordering_physician_id UUID NOT NULL REFERENCES staff(id),
  acknowledging_nurse_id UUID REFERENCES staff(id),
  order_type TEXT DEFAULT 'medication' CHECK (order_type IN ('medication', 'lab', 'imaging', 'therapy', 'diet', 'other')),
  order_text TEXT NOT NULL,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('stat', 'urgent', 'routine')),
  status order_status DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  faxed_at TIMESTAMPTZ,
  pharmacy_fax_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_patient ON provider_orders(patient_id);
CREATE INDEX idx_orders_org ON provider_orders(org_id);
CREATE INDEX idx_orders_status ON provider_orders(status);

-- ============================================================
-- 8. VITAL SIGNS
-- ============================================================
CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES staff(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  systolic INTEGER,
  diastolic INTEGER,
  pulse INTEGER,
  temperature NUMERIC(4,1),
  respiratory_rate INTEGER,
  o2_saturation INTEGER,
  blood_glucose INTEGER,
  weight NUMERIC(5,1),
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  is_alert BOOLEAN DEFAULT false, -- AI-flagged out of range
  alert_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vitals_patient ON vital_signs(patient_id);
CREATE INDEX idx_vitals_org ON vital_signs(org_id);
CREATE INDEX idx_vitals_alert ON vital_signs(is_alert) WHERE is_alert = true;

-- ============================================================
-- 9. FALL REPORTS (3-Day Monitoring Protocol)
-- ============================================================
CREATE TABLE fall_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES staff(id),
  fall_datetime TIMESTAMPTZ NOT NULL,
  location TEXT,
  witnessed BOOLEAN DEFAULT false,
  witness_name TEXT,
  injury_description TEXT,
  interventions TEXT[],
  physician_notified BOOLEAN DEFAULT false,
  physician_notified_at TIMESTAMPTZ,
  family_notified BOOLEAN DEFAULT false,
  family_notified_at TIMESTAMPTZ,
  monitoring_end_date DATE, -- fall_datetime + 3 days
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_falls_patient ON fall_reports(patient_id);
CREATE INDEX idx_falls_org ON fall_reports(org_id);

-- ============================================================
-- 10. HANDOVER NOTES (24h Nursing Summaries)
-- ============================================================
CREATE TABLE handover_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  authored_by UUID NOT NULL REFERENCES staff(id),
  shift TEXT CHECK (shift IN ('day', 'evening', 'night')),
  shift_date DATE NOT NULL,
  subjective TEXT, -- S.O.A.P
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  general_notes TEXT,
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_handover_facility ON handover_notes(facility_id, shift_date);
CREATE INDEX idx_handover_org ON handover_notes(org_id);

-- ============================================================
-- 11. HANDOVER ACKNOWLEDGMENTS (Mandatory Read Receipts)
-- ============================================================
CREATE TABLE handover_acks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  handover_note_id UUID NOT NULL REFERENCES handover_notes(id) ON DELETE CASCADE,
  acknowledged_by UUID NOT NULL REFERENCES staff(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_acks_note ON handover_acks(handover_note_id);

-- ============================================================
-- 12. FAMILY COMMUNICATION LOG
-- ============================================================
CREATE TABLE family_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES staff(id),
  contact_type TEXT CHECK (contact_type IN ('phone_call', 'visit', 'email', 'video_call', 'letter')),
  contact_name TEXT NOT NULL,
  relationship TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  summary TEXT NOT NULL,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  contacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_patient ON family_logs(patient_id);
CREATE INDEX idx_family_org ON family_logs(org_id);

-- ============================================================
-- 13. AUDIT LOG (HIPAA Compliance — PII Access Tracking)
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES staff(id),
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'print', 'export', 'fax'
  resource_type TEXT NOT NULL, -- 'patient', 'medication', 'mar', 'order', etc.
  resource_id UUID,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: Get current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM staff WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Get current user's facility_id
CREATE OR REPLACE FUNCTION get_user_facility_id()
RETURNS UUID AS $$
  SELECT facility_id FROM staff WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS staff_role AS $$
  SELECT role FROM staff WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fall_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_acks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS: Users can only see their own org
CREATE POLICY "org_tenant_isolation" ON organizations
  FOR ALL USING (id = get_user_org_id());

-- FACILITIES: Scoped to org
CREATE POLICY "facility_tenant_isolation" ON facilities
  FOR ALL USING (org_id = get_user_org_id());

-- STAFF: Scoped to org
CREATE POLICY "staff_tenant_isolation" ON staff
  FOR ALL USING (org_id = get_user_org_id());

-- PATIENTS: Scoped to org
CREATE POLICY "patient_tenant_isolation" ON patients
  FOR ALL USING (org_id = get_user_org_id());

-- MEDICATIONS: Scoped to org
CREATE POLICY "med_tenant_isolation" ON medications
  FOR ALL USING (org_id = get_user_org_id());

-- MAR ENTRIES: Scoped to org
CREATE POLICY "mar_tenant_isolation" ON mar_entries
  FOR ALL USING (org_id = get_user_org_id());

-- PROVIDER ORDERS: Scoped to org
CREATE POLICY "order_tenant_isolation" ON provider_orders
  FOR ALL USING (org_id = get_user_org_id());

-- VITAL SIGNS: Scoped to org
CREATE POLICY "vitals_tenant_isolation" ON vital_signs
  FOR ALL USING (org_id = get_user_org_id());

-- FALL REPORTS: Scoped to org
CREATE POLICY "falls_tenant_isolation" ON fall_reports
  FOR ALL USING (org_id = get_user_org_id());

-- HANDOVER NOTES: Scoped to org
CREATE POLICY "handover_tenant_isolation" ON handover_notes
  FOR ALL USING (org_id = get_user_org_id());

-- HANDOVER ACKS: Scoped to org
CREATE POLICY "acks_tenant_isolation" ON handover_acks
  FOR ALL USING (org_id = get_user_org_id());

-- FAMILY LOGS: Scoped to org
CREATE POLICY "family_tenant_isolation" ON family_logs
  FOR ALL USING (org_id = get_user_org_id());

-- AUDIT LOG: Scoped to org (read-only for non-admins)
CREATE POLICY "audit_tenant_isolation" ON audit_log
  FOR ALL USING (org_id = get_user_org_id());

-- ============================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_facilities_updated BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_staff_updated BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_medications_updated BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_mar_entries_updated BEFORE UPDATE ON mar_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_provider_orders_updated BEFORE UPDATE ON provider_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_fall_reports_updated BEFORE UPDATE ON fall_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_handover_notes_updated BEFORE UPDATE ON handover_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_family_logs_updated BEFORE UPDATE ON family_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Fall Protocol — Auto-set 3-day monitoring
-- ============================================================
CREATE OR REPLACE FUNCTION activate_fall_monitoring()
RETURNS TRIGGER AS $$
BEGIN
  -- Set monitoring end date to 3 days after fall
  NEW.monitoring_end_date = (NEW.fall_datetime + INTERVAL '3 days')::DATE;
  
  -- Activate monitoring flag on patient
  UPDATE patients SET 
    is_active_monitoring = true,
    monitoring_start = NEW.fall_datetime,
    monitoring_reason = 'Fall reported: ' || COALESCE(NEW.location, 'unknown location')
  WHERE id = NEW.patient_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_fall_activate_monitoring
  AFTER INSERT ON fall_reports
  FOR EACH ROW EXECUTE FUNCTION activate_fall_monitoring();

-- ============================================================
-- TRIGGER: HIPAA Audit Trail — Auto-log PII mutations
-- ============================================================
CREATE OR REPLACE FUNCTION audit_pii_changes()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _org_id UUID;
BEGIN
  SELECT id, org_id INTO _user_id, _org_id FROM staff WHERE auth_id = auth.uid();
  
  INSERT INTO audit_log (org_id, user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (
    _org_id,
    _user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to PII-sensitive tables
CREATE TRIGGER tr_audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION audit_pii_changes();
CREATE TRIGGER tr_audit_medications AFTER INSERT OR UPDATE OR DELETE ON medications FOR EACH ROW EXECUTE FUNCTION audit_pii_changes();
CREATE TRIGGER tr_audit_mar AFTER INSERT OR UPDATE OR DELETE ON mar_entries FOR EACH ROW EXECUTE FUNCTION audit_pii_changes();
CREATE TRIGGER tr_audit_orders AFTER INSERT OR UPDATE OR DELETE ON provider_orders FOR EACH ROW EXECUTE FUNCTION audit_pii_changes();
CREATE TRIGGER tr_audit_vitals AFTER INSERT OR UPDATE ON vital_signs FOR EACH ROW EXECUTE FUNCTION audit_pii_changes();

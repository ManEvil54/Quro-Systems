// ============================================================
// Quro — Master Demo Seeding Engine
// Populates the "Platinum Health Hub" with realistic clinical data
// ============================================================
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Bed, Room, VitalSign } from '../lib/firebase/types';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ORG_ID = 'mq-demo-org';
const FACILITY_ID = 'platinum-health-hub';

async function cleanup() {
  console.log('🧹 Cleaning up existing demo data...');
  try {
    const patientsRef = collection(db, 'organizations', ORG_ID, 'patients');
    const snapshot = await getDocs(patientsRef);
    console.log(`Found ${snapshot.docs.length} patients to delete.`);
    
    for (const patientDoc of snapshot.docs) {
      console.log(`Deleting patient: ${patientDoc.id}`);
      await deleteDoc(patientDoc.ref);
    }

    const handoverRef = collection(db, 'organizations', ORG_ID, 'handover_notes');
    const hSnapshot = await getDocs(handoverRef);
    for (const hDoc of hSnapshot.docs) {
      await deleteDoc(hDoc.ref);
    }

    // New: Cleanup Rooms
    const roomsRef = collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'rooms');
    const roomsSnap = await getDocs(roomsRef);
    console.log(`Found ${roomsSnap.docs.length} rooms to delete.`);
    for (const rDoc of roomsSnap.docs) {
      await deleteDoc(rDoc.ref);
    }

    // New: Cleanup Beds
    const bedsRef = collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds');
    const bedsSnap = await getDocs(bedsRef);
    console.log(`Found ${bedsSnap.docs.length} beds to delete.`);
    for (const bDoc of bedsSnap.docs) {
      await deleteDoc(bDoc.ref);
    }

    console.log('✅ Cleanup complete.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  }
}

async function seed() {
  await cleanup();
  
  console.log('🌱 Seeding "Platinum Health Hub" with clinical fidelity...');

  try {
    // 0. Create Organization
    console.log(`Creating organization: ${ORG_ID}`);
    const orgRef = doc(db, 'organizations', ORG_ID);
    await setDoc(orgRef, {
      id: ORG_ID,
      name: 'ModernQure Demo Org',
      subscription_status: 'active',
      created_at: new Date().toISOString()
    });
    // 1. Create Facility
    console.log(`Creating facility: ${FACILITY_ID}`);
    const facilityRef = doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID);
    await setDoc(facilityRef, {
      id: FACILITY_ID,
      org_id: ORG_ID,
      name: 'Platinum Health Hub',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 1b. Create SYSTEM Organization (for infrastructure personnel)
    console.log('Creating system operations node: SYSTEM');
    await setDoc(doc(db, 'organizations', 'SYSTEM'), {
      id: 'SYSTEM',
      name: 'Quro Global Operations',
      is_active: true,
      created_at: new Date().toISOString()
    });

    // 2. Create Rooms & Beds (Exactly 6 beds for the Boutique experience)
    const setup = [
      { room: '101', beds: ['A', 'B'] }, 
      { room: '102', beds: ['A', 'B'] }, 
      { room: '103', beds: ['A'] },      
      { room: '104', beds: ['A'] }       
    ];

    const beds: Bed[] = [];
    const rooms: Room[] = [];

    for (const item of setup) {
      const roomRef = doc(collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'rooms'));
      const roomData: Room = {
        id: roomRef.id,
        org_id: ORG_ID,
        facility_id: FACILITY_ID,
        name: `Room ${item.room}`,
        type: (item.beds.length > 1 ? 'semi-private' : 'private') as 'private' | 'semi-private' | 'ward',
        is_active: true,
        created_at: new Date().toISOString()
      };
      await setDoc(roomRef, roomData);
      rooms.push(roomData);

      for (const b of item.beds) {
        const bedRef = doc(collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds'));
        const bedData: Bed = {
          id: bedRef.id,
          room_id: roomRef.id,
          facility_id: FACILITY_ID,
          org_id: ORG_ID,
          name: `Bed ${b}`,
          status: 'available' as 'available' | 'occupied' | 'maintenance' | 'reserved',
          created_at: new Date().toISOString()
        };
        await setDoc(bedRef, bedData);
        beds.push(bedData);
      }
    }

    // 3. Clinical Demo Patients
    const demoPatients = [
      { 
        first_name: 'Margaret', last_name: 'Thompson', mrn: 'MRN-001', code: 'dnr', status: 'Serious', monitoring: true, 
        dob: '1938-11-12', ssn: '4412', gender: 'female', room_number: '101-A',
        allergies: ['Penicillin', 'Sulfa'], 
        diagnoses: ['Congestive Heart Failure', 'Atrial Fibrillation', 'Osteoporosis', 'Chronic Kidney Disease (Stage 3)'],
        diet: 'Heart Healthy / Low Sodium',
        physician: 'Dr. Sarah Smith',
        contact: 'James Thompson (Son) - (555) 123-4567',
        meds: [
          { generic: 'Furosemide', brand: 'Lasix', strength: '40mg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Fluid retention' },
          { generic: 'Warfarin', brand: 'Coumadin', strength: '5mg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '18:00', indication: 'Anticoagulation' },
          { generic: 'Digoxin', brand: 'Lanoxin', strength: '125mcg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Heart rate control' }
        ]
      },
      { 
        first_name: 'Robert', last_name: 'Chen', mrn: 'MRN-002', code: 'full', status: 'Stable', monitoring: false,
        dob: '1945-06-22', ssn: '1092', gender: 'male', room_number: '101-B',
        allergies: ['Latex'], 
        diagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Peripheral Neuropathy'],
        diet: 'Diabetic / 2000 Calorie',
        physician: 'Dr. James Wilson',
        contact: 'Lily Chen (Wife) - (555) 987-6543',
        meds: [
          { generic: 'Metformin', brand: 'Glucophage', strength: '500mg', dose: '1 tab', route: 'PO', frequency: 'BID', time: '09:00, 18:00', indication: 'Diabetes management' },
          { generic: 'Lisinopril', brand: 'Zestril', strength: '10mg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Hypertension' },
          { generic: 'Atorvastatin', brand: 'Lipitor', strength: '20mg', dose: '1 tab', route: 'PO', frequency: 'QHS', time: '21:00', indication: 'Cholesterol' },
          { generic: 'Gabapentin', brand: 'Neurontin', strength: '300mg', dose: '1 cap', route: 'PO', frequency: 'TID', time: '09:00, 14:00, 20:00', indication: 'Nerve pain' }
        ]
      },
      { 
        first_name: 'Eleanor', last_name: 'Vance', mrn: 'MRN-003', code: 'dnr_dni', status: 'Stable', monitoring: false,
        dob: '1942-03-08', ssn: '8832', gender: 'female', room_number: '102-A',
        allergies: ['None Reported'], 
        diagnoses: ['Alzheimer\'s Disease', 'Anxiety', 'Insomnia', 'Vascular Dementia'],
        diet: 'Regular / Mechanical Soft',
        physician: 'Dr. Gregory Miller',
        contact: 'Theodora Vance (Daughter) - (555) 444-5555',
        meds: [
          { generic: 'Donepezil', brand: 'Aricept', strength: '10mg', dose: '1 tab', route: 'PO', frequency: 'QHS', time: '21:00', indication: 'Cognitive enhancement' },
          { generic: 'Sertraline', brand: 'Zoloft', strength: '50mg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Anxiety', is_psychotropic: true },
          { generic: 'Memantine', brand: 'Namenda', strength: '10mg', dose: '1 tab', route: 'PO', frequency: 'BID', time: '09:00, 18:00', indication: 'Dementia' },
          { generic: 'Quetiapine', brand: 'Seroquel', strength: '25mg', dose: '1 tab', route: 'PO', frequency: 'PRN', time: 'PRN', indication: 'Agitation', is_psychotropic: true }
        ]
      },
      { 
        first_name: 'Arthur', last_name: 'Morgan', mrn: 'MRN-004', code: 'full', status: 'Serious', monitoring: true,
        dob: '1950-08-15', ssn: '2214', gender: 'male', room_number: '102-B',
        allergies: ['Aspirin'], 
        diagnoses: ['COPD', 'Pneumonia (Right Lower Lobe)', 'Hypertension', 'Tobacco Use Disorder'],
        diet: 'Regular',
        physician: 'Dr. Sarah Smith',
        contact: 'Charles Smith (Friend) - (555) 777-8888',
        meds: [
          { generic: 'Albuterol', brand: 'ProAir', strength: '90mcg', dose: '2 puffs', route: 'INH', frequency: 'Q4H', time: '08:00, 12:00, 16:00, 20:00, 00:00, 04:00', indication: 'Bronchospasm' },
          { generic: 'Ceftriaxone', brand: 'Rocephin', strength: '1g', dose: '1g', route: 'IV', frequency: 'Daily', time: '10:00', indication: 'Bacterial infection' },
          { generic: 'Prednisone', brand: 'Deltasone', strength: '20mg', dose: '2 tabs', route: 'PO', frequency: 'Daily', time: '08:00', indication: 'Inflammation' },
          { generic: 'Spiriva', brand: 'Tiotropium', strength: '18mcg', dose: '1 cap inhaled', route: 'INH', frequency: 'Daily', time: '08:00', indication: 'COPD maintenance' }
        ]
      },
      { 
        first_name: 'Sarah', last_name: 'Jenkins', mrn: 'MRN-005', code: 'full', status: 'Stable', monitoring: false,
        dob: '1948-12-01', ssn: '5521', gender: 'female', room_number: '103-A',
        allergies: ['Codeine'], 
        diagnoses: ['Rheumatoid Arthritis', 'GERD', 'Anemia', 'Sjogren\'s Syndrome'],
        diet: 'Regular',
        physician: 'Dr. James Wilson',
        contact: 'Bill Jenkins (Husband) - (555) 222-3333',
        meds: [
          { generic: 'Methotrexate', brand: 'Trexall', strength: '7.5mg', dose: '3 tabs', route: 'PO', frequency: 'WEEKLY', time: '09:00', indication: 'Arthritis' },
          { generic: 'Omeprazole', brand: 'Prilosec', strength: '20mg', dose: '1 cap', route: 'PO', frequency: 'Daily', time: '07:00', indication: 'Acid reflux' },
          { generic: 'Folic Acid', brand: 'Folvite', strength: '1mg', dose: '1 tab', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Supplementation' },
          { generic: 'Adalimumab', brand: 'Humira', strength: '40mg', dose: '40mg', route: 'SQ', frequency: 'Every 2 Weeks', time: '09:00', indication: 'Autoimmune' }
        ]
      },
      { 
        first_name: 'Victor', last_name: 'Dumont', mrn: 'MRN-006', code: 'comfort', status: 'Stable', monitoring: false,
        dob: '1935-01-30', ssn: '9901', gender: 'male', room_number: '104-A',
        allergies: ['None Reported'], 
        diagnoses: ['Metastatic Prostate Cancer', 'Chronic Pain', 'Depression'],
        diet: 'Comfort (Ad Lib)',
        physician: 'Dr. Gregory Miller',
        contact: 'Marie Dumont (Sister) - (555) 111-2222',
        meds: [
          { generic: 'Morphine Sulfate', brand: 'MS Contin', strength: '15mg', dose: '1 tab', route: 'PO', frequency: 'Q12H', time: '09:00, 21:00', indication: 'Chronic pain management' },
          { generic: 'Lorazepam', brand: 'Ativan', strength: '0.5mg', dose: '1 tab', route: 'PO', frequency: 'PRN', time: 'PRN', indication: 'Agitation', is_psychotropic: true },
          { generic: 'Docusate Sodium', brand: 'Colace', strength: '100mg', dose: '1 cap', route: 'PO', frequency: 'Daily', time: '09:00', indication: 'Stool softener' },
          { generic: 'Haloperidol', brand: 'Haldol', strength: '1mg', dose: '1 tab', route: 'PO', frequency: 'PRN', time: 'PRN', indication: 'Delirium', is_psychotropic: true }
        ]
      },
    ];

    for (let i = 0; i < demoPatients.length; i++) {
      const p = demoPatients[i];
      const bed = beds[i];
      if (!bed) continue;
      
      const room = rooms.find(r => r.id === bed.room_id);
      if (!room) continue;

      const patientRef = doc(collection(db, 'organizations', ORG_ID, 'patients'));
      const patientData = {
        id: patientRef.id,
        org_id: ORG_ID,
        facility_id: FACILITY_ID,
        room_id: room.id,
        bed_id: bed.id,
        mrn: p.mrn,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: `${p.last_name}, ${p.first_name}`,
        date_of_birth: p.dob,
        gender: p.gender,
        ssn_last_four: p.ssn,
        admission_date: '2024-01-15',
        allergies: p.allergies,
        diagnoses: p.diagnoses,
        code_status: p.code,
        diet: p.diet,
        primary_physician: p.physician,
        emergency_contact: p.contact,
        room_number: p.room_number,
        is_active: true,
        is_active_monitoring: p.monitoring,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(patientRef, patientData);
      console.log(`👤 Seeded Patient: ${p.first_name} ${p.last_name} [${p.mrn}]`);
      
      // Update Bed status
      await setDoc(doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds', bed.id), {
        ...bed,
        patient_id: patientRef.id,
        status: 'occupied'
      });

      // 4. Create Vitals history
      const vitalsRef = collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'vital_signs');
      for (let h = 0; h < 5; h++) {
        const timeOffset = h * 4 * 60 * 60 * 1000;
        const recorded_at = new Date(Date.now() - timeOffset).toISOString();
        const isLatest = h === 0;
        const vitalData: Partial<VitalSign> = {
          org_id: ORG_ID,
          patient_id: patientRef.id,
          recorded_by: 'demo-staff-member',
          temperature: 98.2 + (Math.random() * 0.8),
          pulse: 72 + Math.floor(Math.random() * 12),
          resp: 14 + Math.floor(Math.random() * 4),
          systolic: 115 + Math.floor(Math.random() * 15),
          diastolic: 75 + Math.floor(Math.random() * 10),
          spO2: 96 + Math.floor(Math.random() * 4),
          glucose: 90 + Math.floor(Math.random() * 40),
          weight: 160 + Math.floor(Math.random() * 40),
          pain_level: Math.floor(Math.random() * 3),
          is_alert: false,
          recorded_at: recorded_at,
          created_at: recorded_at
        };

        if (isLatest && p.status === 'Serious') {
          if (p.first_name === 'Margaret') {
            vitalData.pulse = 112;
            vitalData.is_alert = true;
          } else if (p.first_name === 'Arthur') {
            vitalData.systolic = 168;
            vitalData.is_alert = true;
          }
        }
        const vDoc = doc(vitalsRef);
        await setDoc(vDoc, { id: vDoc.id, ...vitalData });

        // DENORMALIZATION: Update the Patient document with the LATEST vital sign
        if (isLatest) {
          await setDoc(patientRef, {
            current_vitals: {
              pulse: vitalData.pulse,
              systolic: vitalData.systolic,
              diastolic: vitalData.diastolic,
              temperature: vitalData.temperature,
              spO2: vitalData.spO2,
              resp: vitalData.resp,
              glucose: vitalData.glucose,
              pain_level: vitalData.pain_level,
              weight: vitalData.weight,
              is_alert: vitalData.is_alert,
              recorded_at: vitalData.recorded_at,
              recorded_by_name: 'System Seeding Engine'
            }
          }, { merge: true });
        }
      }

      // 5. Seed Medications & MAR
      for (const med of p.meds) {
        const medRef = doc(collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'medications'));
        const medData = {
          id: medRef.id,
          org_id: ORG_ID,
          patient_id: patientRef.id,
          generic_name: med.generic,
          brand_name: med.brand,
          strength: med.strength,
          dosage: med.dose,
          route: med.route,
          frequency: med.frequency,
          frequency_times: med.time.split(', '),
          indication: med.indication,
          is_psychotropic: (med as { is_psychotropic?: boolean }).is_psychotropic || false,
          status: 'active',
          start_date: '2024-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(medRef, medData);

        // Seed administrations for the last 24 hours
        const adminRef = collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'mar_entries');
        const times = medData.frequency_times;
        for (const t of times) {
          if (t === 'PRN') continue;
          const [hour] = t.split(':').map(Number);
          const adminDate = new Date();
          adminDate.setHours(hour, 0, 0, 0);
          
          if (adminDate < new Date()) {
            const aDoc = doc(adminRef);
            await setDoc(aDoc, {
              id: aDoc.id,
              org_id: ORG_ID,
              patient_id: patientRef.id,
              medication_id: medRef.id,
              administered_by: 'demo-staff-member',
              scheduled_date: adminDate.toISOString().split('T')[0],
              scheduled_time: t,
              actual_time: adminDate.toISOString(),
              action: 'given',
              created_at: adminDate.toISOString()
            });
          }
        }
      }

      // 6. Seed Clinical Orders
      const ordersRef = collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'provider_orders');
      const orders = [
        { type: 'medication', text: `Verify response to ${p.meds[0].generic}`, priority: 'routine' },
        { type: 'lab', text: 'Weekly metabolic panel every Tuesday', priority: 'routine' },
      ];

      for (const order of orders) {
        const oDoc = doc(ordersRef);
        await setDoc(oDoc, {
          id: oDoc.id,
          org_id: ORG_ID,
          patient_id: patientRef.id,
          facility_id: FACILITY_ID,
          order_type: order.type,
          order_text: order.text,
          priority: order.priority,
          status: 'signed',
          ordering_physician_id: 'dr-demo-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    // 7. Handover Notes
    console.log('📝 Creating handover hub entries...');
    const handoverRef = collection(db, 'organizations', ORG_ID, 'handover_notes');
    const shifts = [
      { shift: 'night', text: 'All residents rested quietly throughout the night. Vital signs within normal limits for stable residents.', urgent: false },
      { shift: 'day', text: 'Morning med pass complete. Patient Thompson (Margaret) requiring monitoring for HR fluctuations.', urgent: true }
    ];

    for (const s of shifts) {
      const hDoc = doc(handoverRef);
      await setDoc(hDoc, {
        id: hDoc.id,
        org_id: ORG_ID,
        facility_id: FACILITY_ID,
        authored_by: 'demo-staff-member',
        shift: s.shift,
        shift_date: new Date().toISOString().split('T')[0],
        general_notes: s.text,
        is_urgent: s.urgent,
        created_at: new Date().toISOString()
      });
    }

    // 7b. Intelligence Summaries (for the Global Intelligence Bar)
    console.log('🧠 Creating intelligence summaries...');
    const intelRef = collection(db, 'organizations', ORG_ID, 'intelligence_summaries');
    await setDoc(doc(intelRef), {
      high_risk_trends: "Respiratory infection risk flagged for Arthur Morgan; thick yellow secretions noted.",
      clinical_tasks: "Enteral residual >150mL for Margaret Thompson; feeding paused per protocol.",
      compliance_gaps: "All high-acuity RT/GT charting complete for the current shift.",
      created_at: new Date().toISOString()
    });

    // 8. Demo Staff
    const demoStaffId = 'demo-staff-member'; 
    await setDoc(doc(db, 'organizations', ORG_ID, 'staff', demoStaffId), {
      id: demoStaffId,
      auth_id: demoStaffId,
      org_id: ORG_ID,
      facility_id: FACILITY_ID,
      first_name: 'Manny',
      last_name: 'Administrator',
      initials: 'MA',
      role: 'FACILITY_ADMIN',
      email: 'demo@qurosystems.com',
      is_active: true,
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(db, 'users', demoStaffId), {
      org_id: ORG_ID,
      email: 'demo@qurosystems.com',
      role: 'FACILITY_ADMIN'
    });

    // 8b. Seed a System Tech for the Master Console demo
    const techId = 'demo-tech-specialist';
    await setDoc(doc(db, 'organizations', 'SYSTEM', 'staff', techId), {
      id: techId,
      org_id: 'SYSTEM',
      first_name: 'Tech',
      last_name: 'Specialist',
      initials: 'TS',
      email: 'tech@qurosystems.com',
      role: 'APP_TECH',
      is_active: true,
      is_onboarded: true,
      created_at: new Date().toISOString()
    });

    await setDoc(doc(db, 'users', techId), {
      org_id: 'SYSTEM',
      email: 'tech@qurosystems.com',
      role: 'APP_TECH'
    });

    console.log('🚀 MASTER DEMO SEEDING COMPLETE WITH CLINICAL FIDELITY!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
  process.exit();
}

seed();

// ============================================================
// Quro — Master Demo Seeding Engine
// Populates the "Platinum Health Hub" with realistic data
// ============================================================
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
    console.log('✅ Cleanup complete.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  }
}

async function seed() {
  await cleanup();
  
  console.log('🌱 Seeding "Platinum Health Hub"...');

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
    console.log('✅ Facility created.');

    // 2. Create Rooms & Beds (Exactly 6 beds for the Boutique experience)
    const setup = [
      { room: '101', beds: ['A', 'B'] }, // 2
      { room: '102', beds: ['A', 'B'] }, // 2
      { room: '103', beds: ['A'] },      // 1
      { room: '104', beds: ['A'] }       // 1
    ];

    const beds: any[] = [];
    const rooms: any[] = [];

    for (const item of setup) {
      const roomRef = doc(collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'rooms'));
      const roomData = {
        id: roomRef.id,
        org_id: ORG_ID,
        facility_id: FACILITY_ID,
        name: `Room ${item.room}`,
        type: item.beds.length > 1 ? 'semi-private' : 'private',
        is_active: true,
        created_at: new Date().toISOString()
      };
      await setDoc(roomRef, roomData);
      rooms.push(roomData);

      for (const b of item.beds) {
        const bedRef = doc(collection(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds'));
        const bedData = {
          id: bedRef.id,
          room_id: roomRef.id,
          facility_id: FACILITY_ID,
          org_id: ORG_ID,
          name: `Bed ${b}`,
          status: 'available',
          created_at: new Date().toISOString()
        };
        await setDoc(bedRef, bedData);
        beds.push(bedData);
      }
    }

    console.log(`✅ Created ${rooms.length} Rooms and ${beds.length} Beds.`);

    // 3. Create Patients
    const demoPatients = [
      { first_name: 'Margaret', last_name: 'Thompson', mrn: 'MRN-001', code: 'dnr', status: 'Critical', monitoring: true },
      { first_name: 'Robert', last_name: 'Chen', mrn: 'MRN-002', code: 'full', status: 'Stable', monitoring: false },
      { first_name: 'Eleanor', last_name: 'Vance', mrn: 'MRN-003', code: 'dnr_dni', status: 'Stable', monitoring: false },
      { first_name: 'Arthur', last_name: 'Morgan', mrn: 'MRN-004', code: 'full', status: 'Critical', monitoring: true },
      { first_name: 'Sarah', last_name: 'Jenkins', mrn: 'MRN-005', code: 'full', status: 'Stable', monitoring: false },
      { first_name: 'Victor', last_name: 'Dumont', mrn: 'MRN-006', code: 'comfort', status: 'Stable', monitoring: false },
    ];

    const seededPatients: any[] = [];

    for (let i = 0; i < demoPatients.length; i++) {
      const p = demoPatients[i];
      const bed = beds[i];
      const room = rooms.find(r => r.id === bed.room_id);

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
        date_of_birth: '1945-05-20',
        gender: i % 2 === 0 ? 'female' : 'male',
        admission_date: '2024-01-01',
        code_status: p.code,
        is_active: true,
        is_active_monitoring: p.monitoring,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(patientRef, patientData);
      seededPatients.push(patientData);
      
      // Update Bed status
      await setDoc(doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds', bed.id), {
        ...bed,
        patient_id: patientRef.id,
        status: 'occupied'
      });

      // 4. Create Vitals history
      console.log(`🫀 Generating vitals for ${p.first_name}...`);
      const vitalsRef = collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'vital_signs');
      
      for (let h = 0; h < 5; h++) {
        const timeOffset = h * 4 * 60 * 60 * 1000;
        const recorded_at = new Date(Date.now() - timeOffset).toISOString();
        const isLatest = h === 0;
        let vitalData: any = {
          org_id: ORG_ID,
          patient_id: patientRef.id,
          recorded_by: 'staff-demo-1',
          temperature: 98.6 + (Math.random() - 0.5),
          pulse: 72 + Math.floor(Math.random() * 10),
          systolic: 120 + Math.floor(Math.random() * 10),
          diastolic: 80 + Math.floor(Math.random() * 5),
          is_alert: false,
          recorded_at: recorded_at,
          created_at: recorded_at
        };

        if (isLatest && p.status === 'Critical') {
          if (p.first_name === 'Margaret') {
            vitalData.pulse = 115;
            vitalData.is_alert = true;
          } else if (p.first_name === 'Arthur') {
            vitalData.systolic = 175;
            vitalData.is_alert = true;
          }
        }
        const vDoc = doc(vitalsRef);
        await setDoc(vDoc, { id: vDoc.id, ...vitalData });
      }

      // 5. Seed Medications & MAR for each patient
      console.log(`💊 Seeding medications for ${p.first_name}...`);
      const meds = [
        { name: 'Lisinopril', dose: '10mg', route: 'PO', frequency: 'Daily', time: '09:00' },
        { name: 'Metformin', dose: '500mg', route: 'PO', frequency: 'BID', time: '09:00, 18:00' },
        { name: 'Amlodipine', dose: '5mg', route: 'PO', frequency: 'Daily', time: '09:00' }
      ];

      for (const med of meds) {
        const medRef = doc(collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'medications'));
        const medData = {
          id: medRef.id,
          org_id: ORG_ID,
          patient_id: patientRef.id,
          name: med.name,
          dosage: med.dose,
          route: med.route,
          frequency: med.frequency,
          scheduled_times: med.time.split(', '),
          start_date: '2024-01-01',
          is_active: true,
          created_at: new Date().toISOString()
        };
        await setDoc(medRef, medData);

        // Seed some administrations for today
        const adminRef = doc(collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'medication_administrations'));
        await setDoc(adminRef, {
          id: adminRef.id,
          org_id: ORG_ID,
          patient_id: patientRef.id,
          medication_id: medRef.id,
          administered_at: new Date().toISOString(),
          administered_by: 'staff-demo-1',
          status: 'administered',
          notes: 'Routine dose'
        });
      }

      // 6. Seed Clinical Orders
      console.log(`📋 Seeding orders for ${p.first_name}...`);
      const orders = [
        { type: 'Medication', detail: `Increase ${meds[0].name} to 20mg daily` },
        { type: 'Lab', detail: 'CBC, BMP tomorrow morning' },
        { type: 'Treatment', detail: 'Wound care to left lower extremity daily' }
      ];

      for (const order of orders) {
        const orderRef = doc(collection(db, 'organizations', ORG_ID, 'patients', patientRef.id, 'clinical_orders'));
        await setDoc(orderRef, {
          id: orderRef.id,
          org_id: ORG_ID,
          patient_id: patientRef.id,
          type: order.type,
          description: order.detail,
          ordered_by: 'Dr. Demo physician',
          status: 'active',
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    console.log('📝 Creating handover notes...');
    const handoverRef = collection(db, 'organizations', ORG_ID, 'handover_notes');
    
    const notes = [
      { subject: 'Morning Shift Summary', text: 'All residents stable. Routine care provided.', urgent: false },
      { subject: 'Urgent: Room 101 Alert', text: 'Resident Thompson (Margaret) showing signs of tachycardia. Physician notified.', urgent: true },
      { subject: 'Evening Handover', text: 'Shift change complete. No major incidents reported in South Wing.', urgent: false }
    ];

    for (const n of notes) {
      const hDoc = doc(handoverRef);
      await setDoc(hDoc, {
        id: hDoc.id,
        org_id: ORG_ID,
        facility_id: FACILITY_ID,
        authored_by: 'staff-demo-admin',
        shift: 'day',
        shift_date: new Date().toISOString().split('T')[0],
        general_notes: n.text,
        is_urgent: n.urgent,
        created_at: new Date().toISOString()
      });
    }

    // 7. Seed Demo Staff
    const demoStaffId = 'demo-staff-member'; 
    await setDoc(doc(db, 'organizations', ORG_ID, 'staff', demoStaffId), {
      auth_id: demoStaffId,
      org_id: ORG_ID,
      facility_id: FACILITY_ID,
      first_name: 'Demo',
      last_name: 'Clinical User',
      initials: 'DCU',
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

    console.log('🚀 FULL DEMO SEEDING COMPLETE!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
  process.exit();
}

seed();

// ============================================================
// Quro — Mock Patient Data Seeder
// ============================================================
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
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

const ORG_ID = 'demo-org'; // Default for now, we'll see if we can find the real one
const FACILITY_ID = 'maple-house';

const MOCK_PATIENTS = [
  {
    first_name: 'Margaret',
    last_name: 'Thompson',
    dob: '1942-05-12',
    gender: 'female',
    admission_date: '2024-01-15',
    status: 'active',
    bed_number: '1',
    facility_id: FACILITY_ID,
    diagnoses: ['Hypertension', 'Type 2 Diabetes', 'Osteoarthritis'],
    allergies: ['Penicillin', 'Sulfa'],
    code_status: 'DNR',
    physician: 'Dr. Sarah Miller',
    diet: 'Low Sodium / Diabetic'
  },
  {
    first_name: 'Robert',
    last_name: 'Chen',
    dob: '1955-11-28',
    gender: 'male',
    admission_date: '2023-12-10',
    status: 'active',
    bed_number: '2',
    facility_id: FACILITY_ID,
    diagnoses: ['COPD', 'CHF', 'Atrial Fibrillation'],
    allergies: ['NKDA'],
    code_status: 'Full Code',
    physician: 'Dr. James Wilson',
    diet: 'Regular'
  },
  {
    first_name: 'Eleanor',
    last_name: 'Vance',
    dob: '1938-08-04',
    gender: 'female',
    admission_date: '2024-02-01',
    status: 'active',
    bed_number: '3',
    facility_id: FACILITY_ID,
    diagnoses: ['Dementia (Stage 2)', 'Gait Instability'],
    allergies: ['Latex'],
    code_status: 'DNR/DNI',
    physician: 'Dr. Sarah Miller',
    diet: 'Pureed'
  }
];

async function seed() {
  console.log('🌱 Seeding mock patients...');
  
  try {
    for (const patient of MOCK_PATIENTS) {
      const patientRef = doc(collection(db, 'organizations', ORG_ID, 'patients'));
      await setDoc(patientRef, {
        ...patient,
        id: patientRef.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log(`✅ Added Patient: ${patient.first_name} ${patient.last_name}`);
    }
    console.log('🚀 Seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
  process.exit();
}

seed();

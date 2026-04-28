// ============================================================
// Quro — Mock Patient Data Seeder (Standalone)
// ============================================================
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  query,
  limit
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAcyoZHtkwsSY-f7Bsls76ThvNXGGm00ts",
  authDomain: "quro-13d98.firebaseapp.com",
  projectId: "quro-13d98",
  storageBucket: "quro-13d98.firebasestorage.app",
  messagingSenderId: "714072302945",
  appId: "1:714072302945:web:7d36c87b7b2b5900151120"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_PATIENTS = [
  {
    first_name: 'Margaret',
    last_name: 'Thompson',
    dob: '1942-05-12',
    gender: 'female',
    admission_date: '2024-01-15',
    status: 'active',
    bed_number: '1',
    diagnoses: ['Hypertension', 'Type 2 Diabetes', 'Osteoarthritis'],
    allergies: ['Penicillin', 'Sulfa'],
    code_status: 'DNR',
    physician: 'Dr. Sarah Miller',
    diet: 'Low Sodium / Diabetic',
    vitals: { temp: 98.6, pulse: 72, resp: 16, bp: '138/82', o2: 96 }
  },
  {
    first_name: 'Robert',
    last_name: 'Chen',
    dob: '1955-11-28',
    gender: 'male',
    admission_date: '2023-12-10',
    status: 'active',
    bed_number: '2',
    diagnoses: ['COPD', 'CHF', 'Atrial Fibrillation'],
    allergies: ['NKDA'],
    code_status: 'Full Code',
    physician: 'Dr. James Wilson',
    diet: 'Regular',
    vitals: { temp: 97.9, pulse: 84, resp: 20, bp: '142/90', o2: 92 }
  },
  {
    first_name: 'Eleanor',
    last_name: 'Vance',
    dob: '1938-08-04',
    gender: 'female',
    admission_date: '2024-02-01',
    status: 'active',
    bed_number: '3',
    diagnoses: ['Dementia (Stage 2)', 'Gait Instability'],
    allergies: ['Latex'],
    code_status: 'DNR/DNI',
    physician: 'Dr. Sarah Miller',
    diet: 'Pureed',
    vitals: { temp: 98.2, pulse: 68, resp: 18, bp: '110/70', o2: 98 }
  },
  {
    first_name: 'Samuel',
    last_name: 'Jackson',
    dob: '1947-03-22',
    gender: 'male',
    admission_date: '2024-03-10',
    status: 'active',
    bed_number: '4',
    diagnoses: ['Post-Stroke Recovery', 'Right-sided Weakness'],
    allergies: ['NKDA'],
    code_status: 'Full Code',
    physician: 'Dr. James Wilson',
    diet: 'Mechanical Soft',
    vitals: { temp: 98.4, pulse: 76, resp: 16, bp: '130/80', o2: 97 }
  }
];

async function seed() {
  console.log('🌱 Seeding mock patients...');
  
  try {
    // 1. Find the first organization
    const orgsQs = await getDocs(query(collection(db, 'organizations'), limit(1)));
    if (orgsQs.empty) {
      console.log('❌ No organization found. Please create one first.');
      process.exit(1);
    }
    const orgDoc = orgsQs.docs[0];
    const orgId = orgDoc.id;
    console.log(`🏢 Found Organization: ${orgDoc.data().name} (${orgId})`);

    // 2. Find the first facility
    const facsQs = await getDocs(query(collection(db, 'organizations', orgId, 'facilities'), limit(1)));
    if (facsQs.empty) {
       console.log('❌ No facility found. Please create one first.');
       process.exit(1);
    }
    const facDoc = facsQs.docs[0];
    const facId = facDoc.id;
    console.log(`🏥 Found Facility: ${facDoc.data().name} (${facId})`);

    for (const patient of MOCK_PATIENTS) {
      const patientRef = doc(collection(db, 'organizations', orgId, 'patients'));
      await setDoc(patientRef, {
        ...patient,
        id: patientRef.id,
        facility_id: facId,
        org_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Add a vital entry for trend display
      const vitalsRef = collection(db, 'organizations', orgId, 'patients', patientRef.id, 'vitals');
      await setDoc(doc(vitalsRef), {
        ...patient.vitals,
        timestamp: new Date().toISOString(),
        entered_by: 'System Seed'
      });

      console.log(`✅ Added Patient: ${patient.first_name} ${patient.last_name} to Bed ${patient.bed_number}`);
    }
    console.log('🚀 Seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
  process.exit();
}

seed();

// ============================================================
// Quro — Demo User Linker
// Links a Firebase Auth UID to the demo organization
// ============================================================
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
const DEMO_EMAIL = 'demo@qurosystems.com';

async function linkUser(uid: string) {
  if (!uid) {
    console.error('❌ Please provide a UID: npx tsx src/scripts/link-demo-user.ts <UID>');
    process.exit(1);
  }

  console.log(`🔗 Linking UID: ${uid} to Demo Org...`);

  try {
    // 1. Create global user record
    await setDoc(doc(db, 'users', uid), {
      org_id: ORG_ID,
      email: DEMO_EMAIL,
      role: 'FACILITY_ADMIN'
    });

    // 2. Create staff record within organization
    await setDoc(doc(db, 'organizations', ORG_ID, 'staff', uid), {
      auth_id: uid,
      org_id: ORG_ID,
      facility_id: FACILITY_ID,
      first_name: 'Demo',
      last_name: 'Clinical User',
      initials: 'DCU',
      role: 'FACILITY_ADMIN',
      email: DEMO_EMAIL,
      is_active: true,
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 3. Clean up the placeholder if it exists
    await deleteDoc(doc(db, 'users', 'demo-staff-member'));
    await deleteDoc(doc(db, 'organizations', ORG_ID, 'staff', 'demo-staff-member'));

    console.log('✅ User successfully linked to Demo Environment!');
    console.log(`You can now log in with ${DEMO_EMAIL} using the "Explore Live Demo" button.`);
  } catch (err) {
    console.error('❌ Linking failed:', err);
  }
  process.exit();
}

const uid = process.argv[2];
linkUser(uid);

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  limit,
  getDocs
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { performance } from 'perf_hooks';

// ============================================================
// Quro — Adversarial Client-Side Load Simulation
// Objective: Validate 500 concurrent browser-like listeners
// ============================================================

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

const ORG_ID = 'mq-demo-org';
const FACILITY_ID = 'platinum-health-hub';
const CONCURRENT_USERS = 500;
const BURST_UPDATES = 10;

// ADVERSARIAL OPTIMIZATION: Prevent Node.js from throttling 500 parallel emitters
process.setMaxListeners(CONCURRENT_USERS + 100);

async function runSimulation() {
  console.log(`🚀 STARTING CLIENT-SIDE LOAD SIMULATION`);
  
  // 0. PHASE 0: AUTHENTICATION
  console.log(`[PHASE 0] Authenticating Demo Clinician...`);
  const auth = getAuth(app);
  try {
    // Note: This requires the demo account to be created and linked to mq-demo-org
    await signInWithEmailAndPassword(auth, 'demo@qurosystems.com', 'QuroDemo2026!');
    console.log(`✅ AUTHENTICATED: ${auth.currentUser?.email}`);
  } catch (err) {
    const error = err as Error;
    console.error(`❌ AUTH FAILED: ${error.message}`);
    process.exit(1);
  }

  console.log(`👥 Target: ${CONCURRENT_USERS} Virtual Browsers`);
  console.log(`🏥 Facility: ${FACILITY_ID}`);
  console.log('--------------------------------------------------');

  const startTime = performance.now();
  let successfulConnections = 0;
  
  // 1. PHASE 1: "THE FLOOD" - Establish 500 Listeners
  console.log(`[PHASE 1] Establishing ${CONCURRENT_USERS} listeners...`);
  
  const connectionPromises = Array.from({ length: CONCURRENT_USERS }).map((_, i) => {
    return new Promise<(() => void) | null>((resolve) => {
      const q = query(
        collection(db, 'organizations', ORG_ID, 'patients'),
        where('facility_id', '==', FACILITY_ID)
      );

      const unsub = onSnapshot(q, 
        () => {
          if (i === 0 || i % 100 === 0) console.log(`   - Client ${i} Synced`);
          successfulConnections++;
          resolve(unsub);
        },
        (err) => {
          console.error(`   - [FAIL] Client ${i}:`, err.message);
          resolve(null);
        }
      );
    });
  });

  const activeListeners = (await Promise.all(connectionPromises)).filter((r): r is (() => void) => r !== null);
  
  const hydrationTime = performance.now() - startTime;
  console.log(`\n✅ HYDRATION COMPLETE`);
  console.log(`⏱️  Time: ${hydrationTime.toFixed(2)}ms`);
  console.log(`📡 Active Clients: ${successfulConnections}/${CONCURRENT_USERS}`);

  // 2. PHASE 2: "THE STORM" - Trigger Updates
  console.log('\n[PHASE 2] Triggering "Storm Update"...');
  
  const q = query(collection(db, 'organizations', ORG_ID, 'patients'), limit(BURST_UPDATES));
  const patientsSnap = await getDocs(q);

  const stormStartTime = performance.now();
  
  const updatePromises = patientsSnap.docs.map(patientDoc => {
    return updateDoc(doc(db, 'organizations', ORG_ID, 'patients', patientDoc.id), {
      'current_vitals.pulse': Math.floor(Math.random() * 40) + 70,
      'current_vitals.recorded_at': new Date().toISOString(),
      'updated_at': serverTimestamp()
    });
  });

  await Promise.all(updatePromises);
  const stormTime = performance.now() - stormStartTime;

  console.log(`✅ STORM COMPLETE`);
  console.log(`⏱️  Burst Time: ${stormTime.toFixed(2)}ms`);

  // 3. PHASE 3: CLEANUP
  activeListeners.forEach(unsub => unsub());
  console.log('\n🏁 SIMULATION COMPLETE');
  process.exit(0);
}

runSimulation().catch(console.error);

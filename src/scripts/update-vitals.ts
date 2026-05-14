import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'quro-13d98',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ORG_ID = 'mq-demo-org';

const criticalVitals: Record<string, any> = {
  "Arthur Morgan": {
    "heart_rate": 112,
    "systolic": 145,
    "diastolic": 92,
    "temp": 101.4,
    "spO2": 88,
    "is_critical": true,
    "status_note": "Respiratory distress; thick yellow secretions noted. O2 saturation dropping."
  },
  "Margaret Thompson": {
    "heart_rate": 98,
    "systolic": 110,
    "diastolic": 65,
    "temp": 98.9,
    "spO2": 95,
    "is_critical": true,
    "status_note": "Enteral residual >150mL; feeding paused per protocol. Nausea reported."
  }
};

async function updateVitals() {
  console.log('Starting vital signs update...');
  
  for (const [name, data] of Object.entries(criticalVitals)) {
    const [firstName, lastName] = name.split(' ');
    const patientsRef = collection(db, 'organizations', ORG_ID, 'patients');
    const q = query(patientsRef, where('first_name', '==', firstName), where('last_name', '==', lastName));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`Could not find patient: ${name}`);
      continue;
    }

    const patientId = querySnapshot.docs[0].id;
    const vitalsRef = doc(db, 'organizations', ORG_ID, 'patients', patientId, 'vitals', 'current');
    
    await setDoc(vitalsRef, {
      heart_rate: data.heart_rate,
      blood_pressure: `${data.systolic}/${data.diastolic}`,
      temperature: data.temp,
      spO2: data.spO2,
      is_critical: data.is_critical,
      status_note: data.status_note,
      updated_at: serverTimestamp()
    }, { merge: true });
    
    console.log(`Updated vitals for ${name} (${patientId})`);
  }
  
  console.log('Update complete.');
  process.exit(0);
}

updateVitals().catch(console.error);

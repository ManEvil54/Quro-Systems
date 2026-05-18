import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: "quro-5bb52" });
const db = getFirestore();

async function main() {
  const orgsSnap = await db.collection('organizations').get();
  for (const org of orgsSnap.docs) {
    console.log('Org:', org.id);
    const patientsSnap = await db.collection('organizations').doc(org.id).collection('patients').get();
    for (const p of patientsSnap.docs) {
      console.log('  Patient:', p.id, p.data().full_name, 'facility_id:', p.data().facility_id, 'room_number:', p.data().room_number, 'bed_id:', p.data().bed_id);
    }
  }
}

main().catch(console.error);

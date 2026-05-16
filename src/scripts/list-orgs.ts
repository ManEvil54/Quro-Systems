
import { db } from '../lib/firebase/client';
import { collection, getDocs } from 'firebase/firestore';

async function listOrgs() {
  const snap = await getDocs(collection(db, 'organizations'));
  snap.docs.forEach(doc => {
    console.log(`Org ID: ${doc.id}, Name: ${doc.data().name}`);
  });
}

listOrgs();

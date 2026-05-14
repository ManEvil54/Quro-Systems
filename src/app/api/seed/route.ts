import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const ORG_ID = 'mq-demo-org';
    const FACILITY_ID = 'platinum-health-hub';

    // 1. Ensure Organization and Facility exist
    await setDoc(doc(db, 'organizations', ORG_ID), {
      name: 'ModernQure Demo Organization',
      created_at: new Date().toISOString()
    }, { merge: true });

    await setDoc(doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID), {
      name: 'Platinum Health Hub',
      created_at: new Date().toISOString()
    }, { merge: true });

    // 2. Define Patients
    const patients = [
      {
        id: 'mrn-001',
        first_name: 'Margaret',
        last_name: 'Thompson',
        mrn: 'MRN-001',
        facility_id: FACILITY_ID,
        bed_id: 'bed-1',
        code_status: 'dnr CODE',
        is_active: true,
        is_active_monitoring: true,
        diagnoses: ['Congestive Heart Failure', 'Atrial Fibrillation', 'Osteoporosis', 'Chronic Kidney Disease (Stage 3)']
      },
      {
        id: 'mrn-002',
        first_name: 'Robert',
        last_name: 'Chen',
        mrn: 'MRN-002',
        facility_id: FACILITY_ID,
        bed_id: 'bed-2',
        code_status: 'full CODE',
        is_active: true,
        is_active_monitoring: false,
        diagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Peripheral Neuropathy']
      },
      {
        id: 'mrn-003',
        first_name: 'Eleanor',
        last_name: 'Vance',
        mrn: 'MRN-003',
        facility_id: FACILITY_ID,
        bed_id: 'bed-3',
        code_status: 'dnr_dni CODE',
        is_active: true,
        is_active_monitoring: false,
        diagnoses: ['Alzheimer\'s Disease', 'Anxiety', 'Insomnia', 'Vascular Dementia']
      },
      {
        id: 'mrn-004',
        first_name: 'Arthur',
        last_name: 'Morgan',
        mrn: 'MRN-004',
        facility_id: FACILITY_ID,
        bed_id: 'bed-4',
        code_status: 'full CODE',
        is_active: true,
        is_active_monitoring: true,
        diagnoses: ['COPD', 'Pneumonia (Right Lower Lobe)', 'Hypertension', 'Tobacco Use Disorder']
      },
      {
        id: 'mrn-005',
        first_name: 'Sarah',
        last_name: 'Jenkins',
        mrn: 'MRN-005',
        facility_id: FACILITY_ID,
        bed_id: 'bed-5',
        code_status: 'full CODE',
        is_active: true,
        is_active_monitoring: false,
        diagnoses: ['Rheumatoid Arthritis', 'GERD', 'Anemia', 'Sjogren\'s Syndrome']
      },
      {
        id: 'mrn-006',
        first_name: 'Victor',
        last_name: 'Dumont',
        mrn: 'MRN-006',
        facility_id: FACILITY_ID,
        bed_id: 'bed-6',
        code_status: 'comfort CODE',
        is_active: true,
        is_active_monitoring: false,
        diagnoses: ['Metastatic Prostate Cancer', 'Chronic Pain', 'Depression']
      }
    ];

    // 3. Define Rooms & Beds
    const rooms = [
      { id: '101', name: 'Room 101' },
      { id: '102', name: 'Room 102' },
      { id: '103', name: 'Room 103' },
      { id: '104', name: 'Room 104' }
    ];

    const beds = [
      { id: 'bed-1', name: 'Bed A', room_id: '101', status: 'occupied' },
      { id: 'bed-2', name: 'Bed B', room_id: '101', status: 'occupied' },
      { id: 'bed-3', name: 'Bed A', room_id: '102', status: 'occupied' },
      { id: 'bed-4', name: 'Bed B', room_id: '102', status: 'occupied' },
      { id: 'bed-5', name: 'Bed A', room_id: '103', status: 'occupied' },
      { id: 'bed-6', name: 'Bed A', room_id: '104', status: 'occupied' }
    ];

    // Batch Write
    // Individual Writes (Parallel)

    for (const room of rooms) {
      await setDoc(doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'rooms', room.id), room, { merge: true });
    }

    for (const bed of beds) {
      await setDoc(doc(db, 'organizations', ORG_ID, 'facilities', FACILITY_ID, 'beds', bed.id), bed, { merge: true });
    }

    for (const patient of patients) {
      await setDoc(doc(db, 'organizations', ORG_ID, 'patients', patient.id), patient, { merge: true });
    }

    return NextResponse.json({ success: true, message: 'Database seeded with high-fidelity patient data.' });
  } catch (error: unknown) {
    console.error('Seeding Failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error during seeding';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

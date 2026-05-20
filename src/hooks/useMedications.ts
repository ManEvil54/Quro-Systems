// ============================================================
// Quro — Medication Management Hook
// Handles patient medication orders and MAR validation
// ============================================================
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Medication, ProviderOrder, MedRoute, MedFrequency } from '@/lib/firebase/types';
import { DEMO_MEDICATIONS, DEMO_ORDERS } from '@/lib/demoData';

// Helper to parse unstructured order text into structured medication fields
const parseOrderText = (text: string) => {
  const words = text.split(/\s+/);
  const generic_name = words[0] || 'Unknown Medication';
  
  // Try to find strength (e.g. 500mg, 5mg, 10ml, etc.)
  const strengthMatch = text.match(/\b\d+(?:mg|mcg|ml|g)\b/i);
  const strength = strengthMatch ? strengthMatch[0] : 'As ordered';

  // Try to find route (PO, IV, IM, SC, PR, SL, Topical)
  const routeMatch = text.match(/\b(PO|IV|IM|SC|PR|SL|Topical|Sublingual|NPO)\b/i);
  const route = routeMatch ? routeMatch[0].toUpperCase() as MedRoute : 'PO';

  // Try to find frequency (QD, Daily, BID, TID, QID, QHS, PRN, Weekly, Monthly)
  const freqMatch = text.match(/\b(QD|Daily|BID|TID|QID|QHS|PRN|Weekly|Monthly)\b/i);
  let frequency = 'QD' as MedFrequency;
  if (freqMatch) {
    const f = freqMatch[0].toUpperCase();
    if (f === 'DAILY') frequency = 'QD';
    else if (f === 'WEEKLY') frequency = 'WEEKLY';
    else if (f === 'MONTHLY') frequency = 'MONTHLY';
    else frequency = f as MedFrequency;
  }

  return { generic_name, strength, dosage: '1 tablet', route, frequency };
};

export function useMedications(patientId: string) {
  const { staff } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set to track order IDs being processed to avoid duplicate creations
  const transcribingOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const medsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'medications');
    const mq = query(medsRef, orderBy('created_at', 'desc'));

    const ordersRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders');
    const oq = query(ordersRef, orderBy('created_at', 'desc'));

    let currentMeds: Medication[] = [];
    let currentOrders: ProviderOrder[] = [];
    let medsLoaded = false;
    let ordersLoaded = false;

    const syncAndSet = async (meds: Medication[], orders: ProviderOrder[]) => {
      // 1. Map medications dynamically: If active but their matching order is cancelled, return as discontinued
      const processedMeds = meds.map(med => {
        if (med.status === 'active') {
          const matchingOrder = orders.find(o => o.id === med.order_id);
          if (matchingOrder && matchingOrder.status === 'cancelled') {
            return { ...med, status: 'discontinued' as const };
          }
          const matchingDiscontinuedOrder = orders.find(o => 
            o.status === 'cancelled' && 
            (o.id === med.order_id || (med.generic_name && o.order_text.toLowerCase().includes(med.generic_name.toLowerCase())))
          );
          if (matchingDiscontinuedOrder) {
            return { ...med, status: 'discontinued' as const };
          }
        }
        return med;
      });

      // 2. Persistent Firestore Auto-discontinue sync:
      // If any active medication in Firestore has a cancelled order, update it in the database.
      for (const med of meds) {
        if (med.status === 'active') {
          const cancelledOrder = orders.find(o => 
            o.status === 'cancelled' && 
            (o.id === med.order_id || (med.generic_name && o.order_text.toLowerCase().includes(med.generic_name.toLowerCase())))
          );
          if (cancelledOrder) {
            console.log(`Auto-sync: Discontinuing medication ${med.generic_name} due to cancelled provider order.`);
            try {
              const medRef = doc(db, 'organizations', staff.org_id!, 'patients', patientId, 'medications', med.id);
              await updateDoc(medRef, { status: 'discontinued', updated_at: serverTimestamp() });
            } catch (err) {
              console.error(`Failed to auto-discontinue medication ${med.id}:`, err);
            }
          }
        }
      }

      // 3. Persistent Firestore Auto-transcribe sync:
      // If any signed/acknowledged medication order in provider_orders does not have a medication document, create one.
      for (const order of orders) {
        if (order.order_type === 'medication' && order.status !== 'cancelled' && order.status !== 'draft') {
          const matchingMed = meds.find(m => m.order_id === order.id);
          if (!matchingMed && !transcribingOrderIds.current.has(order.id)) {
            transcribingOrderIds.current.add(order.id);
            console.log(`Auto-sync: Transcribing provider order ${order.id} to medications collection.`);
            try {
              const parsed = parseOrderText(order.order_text);
              const generic_name = order.generic_name || parsed.generic_name;
              const strength = order.strength || parsed.strength;
              const dose = order.dose || null;
              const dosage = order.dosage || parsed.dosage;
              const route = order.route || parsed.route;
              const frequency = order.frequency || parsed.frequency;
              const indication = order.indication || '';
              const prn_reason = order.prn_reason || null;
              const prn_interval = order.prn_interval || null;
              const is_psychotropic = order.is_psychotropic || false;
              const requires_vitals = order.requires_vitals || false;
              const vital_threshold_low = order.vital_threshold_low || null;
              const vital_threshold_high = order.vital_threshold_high || null;
              const vital_type = order.vital_type || null;

              const newMedsRef = collection(db, 'organizations', staff.org_id!, 'patients', patientId, 'medications');
              
              // Map frequency to standard MAR times
              let frequency_times = order.frequency_times || ['09:00'];
              if (!order.frequency_times || order.frequency_times.length === 0) {
                if (frequency === 'BID') frequency_times = ['09:00', '17:00'];
                else if (frequency === 'TID') frequency_times = ['09:00', '13:00', '17:00'];
                else if (frequency === 'QID') frequency_times = ['09:00', '13:00', '17:00', '21:00'];
                else if (frequency === 'QHS') frequency_times = ['21:00'];
                else if (frequency === 'PRN') frequency_times = [];
              }

              await addDoc(newMedsRef, {
                generic_name,
                brand_name: '',
                strength,
                dose,
                dosage,
                route,
                frequency,
                frequency_times,
                indication,
                prn_reason,
                prn_interval,
                is_psychotropic,
                requires_vitals,
                vital_threshold_low,
                vital_threshold_high,
                vital_type,
                start_date: order.signed_at || new Date().toISOString(),
                status: 'active', // immediately active on MAR
                special_instructions: order.special_instructions || order.order_text,
                order_id: order.id,
                rxcui: order.rxcui || null,
                org_id: staff.org_id,
                patient_id: patientId,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
              });
            } catch (err) {
              console.error(`Failed to auto-transcribe order ${order.id}:`, err);
            }
          } else if (matchingMed) {
            // Sync any updates from order to medication
            const orderTimes = order.frequency_times || [];
            const medTimes = matchingMed.frequency_times || [];
            const timesMatch = orderTimes.length === medTimes.length && orderTimes.every((t, idx) => t === medTimes[idx]);
            
            if (
              matchingMed.generic_name !== order.generic_name ||
              matchingMed.strength !== order.strength ||
              matchingMed.dose !== (order.dose || null) ||
              matchingMed.dosage !== order.dosage ||
              matchingMed.route !== order.route ||
              matchingMed.frequency !== order.frequency ||
              !timesMatch ||
              matchingMed.indication !== order.indication ||
              matchingMed.prn_reason !== (order.prn_reason || null) ||
              matchingMed.prn_interval !== (order.prn_interval || null) ||
              matchingMed.is_psychotropic !== (order.is_psychotropic || false) ||
              matchingMed.requires_vitals !== (order.requires_vitals || false) ||
              matchingMed.vital_type !== (order.vital_type || null) ||
              matchingMed.vital_threshold_low !== (order.vital_threshold_low || null) ||
              matchingMed.vital_threshold_high !== (order.vital_threshold_high || null) ||
              matchingMed.special_instructions !== (order.special_instructions || '')
            ) {
              console.log(`Auto-sync: Updating medication ${matchingMed.id} to match edited provider order ${order.id}`);
              try {
                const medRef = doc(db, 'organizations', staff.org_id!, 'patients', patientId, 'medications', matchingMed.id);
                let frequency_times = order.frequency_times;
                if (!frequency_times || frequency_times.length === 0) {
                  if (order.frequency === 'BID') frequency_times = ['09:00', '17:00'];
                  else if (order.frequency === 'TID') frequency_times = ['09:00', '13:00', '17:00'];
                  else if (order.frequency === 'QID') frequency_times = ['09:00', '13:00', '17:00', '21:00'];
                  else if (order.frequency === 'QHS') frequency_times = ['21:00'];
                  else if (order.frequency === 'PRN') frequency_times = [];
                  else frequency_times = ['09:00'];
                }
                await updateDoc(medRef, {
                  generic_name: order.generic_name || matchingMed.generic_name,
                  strength: order.strength || matchingMed.strength,
                  dose: order.dose || null,
                  dosage: order.dosage || matchingMed.dosage,
                  route: order.route || matchingMed.route,
                  frequency: order.frequency || matchingMed.frequency,
                  frequency_times,
                  indication: order.indication || '',
                  prn_reason: order.prn_reason || null,
                  prn_interval: order.prn_interval || null,
                  is_psychotropic: order.is_psychotropic || false,
                  requires_vitals: order.requires_vitals || false,
                  vital_type: order.vital_type || null,
                  vital_threshold_low: order.vital_threshold_low || null,
                  vital_threshold_high: order.vital_threshold_high || null,
                  special_instructions: order.special_instructions || '',
                  updated_at: serverTimestamp()
                });
              } catch (err) {
                console.error(`Failed to auto-update medication ${matchingMed.id}:`, err);
              }
            }
          }
        }
      }

      setMedications(processedMeds);
      setLoading(false);
    };

    const unsubscribeMeds = onSnapshot(mq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
      
      if (docs.length === 0 && DEMO_MEDICATIONS[patientId]) {
        currentMeds = DEMO_MEDICATIONS[patientId];
      } else {
        currentMeds = docs;
      }
      
      medsLoaded = true;
      if (ordersLoaded) {
        syncAndSet(currentMeds, currentOrders);
      } else {
        setMedications(currentMeds);
      }
    }, (err) => {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications.');
      setLoading(false);
    });

    const unsubscribeOrders = onSnapshot(oq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProviderOrder[];
      
      if (docs.length === 0 && DEMO_ORDERS[patientId]) {
        currentOrders = DEMO_ORDERS[patientId];
      } else {
        currentOrders = docs;
      }
      
      ordersLoaded = true;
      if (medsLoaded) {
        syncAndSet(currentMeds, currentOrders);
      }
    }, (err) => {
      console.error('Error fetching orders for med sync:', err);
    });

    return () => {
      unsubscribeMeds();
      unsubscribeOrders();
    };
  }, [staff?.org_id, patientId]);

  const addMedication = async (data: Omit<Medication, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const medsRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'medications');
    return await addDoc(medsRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateMedication = async (medicationId: string, data: Partial<Medication>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const medRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'medications', medicationId);
    return await updateDoc(medRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  };

  return { medications, loading, error, addMedication, updateMedication };
}

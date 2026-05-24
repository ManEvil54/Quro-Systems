// ============================================================
// Quro — Medication Management Hook
// Handles patient medication orders and MAR validation using Option A (SSOT)
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Medication, ProviderOrder, MedRoute, MedFrequency, MedStatus } from '@/lib/firebase/types';
import { DEMO_ORDERS } from '@/lib/demoData';
import { enrichProviderOrderClinicalData } from '@/lib/clinicalUtils';

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

// Maps a ProviderOrder document to a Medication object schema on the fly
const mapOrderToMedication = (order: ProviderOrder, staffOrgId: string, patientId: string): Medication => {
  const parsed = parseOrderText(order.order_text || '');
  
  const generic_name = order.generic_name || parsed.generic_name;
  const strength = order.strength || parsed.strength;
  const dosage = order.dosage || parsed.dosage;
  const route = order.route || parsed.route;
  const frequency = order.frequency || parsed.frequency;
  
  let frequency_times = order.frequency_times || [];
  if (frequency_times.length === 0) {
    if (frequency === 'BID') frequency_times = ['09:00', '17:00'];
    else if (frequency === 'TID') frequency_times = ['09:00', '13:00', '17:00'];
    else if (frequency === 'QID') frequency_times = ['09:00', '13:00', '17:00', '21:00'];
    else if (frequency === 'QHS') frequency_times = ['21:00'];
    else if (frequency === 'PRN') frequency_times = [];
    else frequency_times = ['09:00'];
  }

  // Derive active/discontinued/pending status from order status
  let status: MedStatus = 'pending_acknowledgment';
  if (order.status === 'cancelled') {
    status = 'discontinued';
  } else if (order.status === 'signed') {
    status = 'pending_acknowledgment';
  } else if (['acknowledged', 'sent_to_pharmacy', 'filled'].includes(order.status)) {
    status = 'active';
  }

  return {
    id: order.id, // Primary Binding: Medication ID mirrors the Physician Order ID exactly
    org_id: order.org_id || staffOrgId,
    patient_id: order.patient_id || patientId,
    generic_name,
    brand_name: '',
    strength,
    dose: order.dose || null,
    dosage,
    route,
    frequency,
    frequency_times,
    indication: order.indication || '',
    prn_reason: order.prn_reason || null,
    prn_interval: order.prn_interval || null,
    prescriber_id: order.ordering_physician_id || null,
    prescriber_name: order.ordering_physician_id || 'Attending Physician',
    start_date: order.signed_at || order.created_at || new Date().toISOString(),
    end_date: order.status === 'cancelled' ? (order.updated_at || new Date().toISOString()) : null,
    status,
    requires_vitals: order.requires_vitals || false,
    vital_type: order.vital_type || null,
    vital_threshold_low: order.vital_threshold_low || null,
    vital_threshold_high: order.vital_threshold_high || null,
    is_psychotropic: order.is_psychotropic || false,
    psychotropic_monitoring: order.psychotropic_monitoring || [],
    special_instructions: order.special_instructions || order.order_text || '',
    order_id: order.id,
    order_type: order.order_method || 'direct',
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
    rxcui: order.rxcui || null,
  };
};

export function useMedications(patientId: string) {
  const { staff } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    // Direct Physician Order Reference (Option A Single Source of Truth)
    const ordersRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders');
    
    // Composite constraint structure optimized to prevent implicit index errors
    const q = query(
      ordersRef,
      where('order_type', '==', 'medication'),
      where('status', 'in', ['signed', 'acknowledged', 'sent_to_pharmacy', 'filled', 'cancelled'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProviderOrder[];
      
      let currentOrders = docs;
      if (docs.length === 0 && DEMO_ORDERS[patientId]) {
        currentOrders = DEMO_ORDERS[patientId].filter(o => 
          o.order_type === 'medication' && 
          ['signed', 'acknowledged', 'sent_to_pharmacy', 'filled', 'cancelled'].includes(o.status)
        );
      }
      
      // Project all active and cancelled medication orders onto the Medication schema
      const projectedMeds = currentOrders.map(order => 
        mapOrderToMedication(order, staff.org_id!, patientId)
      );

      // client-side sorting by created_at desc to guarantee correct layout without Firestore index overhead
      const sortedMeds = projectedMeds.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMedications(sortedMeds);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching medication orders:', err);
      setError('Failed to load medications.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const addMedication = async (data: any) => {
    if (!staff?.org_id || !patientId) throw new Error('Context parameter missing');
    
    const ordersRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders');
    
    const isPRN = data.frequency === 'PRN';
    const frequencyText = isPRN 
      ? `PRN (every ${data.prn_interval || '8 hours'} as needed for ${data.prn_reason || data.indication || 'pain'})` 
      : data.frequency;
    const orderText = `${data.generic_name} ${data.strength} - Dose: ${data.dose} (${data.dosage}) via ${data.route} ${frequencyText}${data.special_instructions ? `. Special Instructions: ${data.special_instructions}` : ''}`;

    const isTelephone = data.order_type === 'telephone' || !data.order_type;

    const payload = {
      org_id: staff.org_id,
      patient_id: patientId,
      facility_id: staff.facility_id || '',
      ordering_physician_id: data.prescriber_id || staff.id,
      order_type: 'medication',
      order_text: orderText,
      priority: 'routine',
      status: isTelephone ? 'acknowledged' : 'signed', // Telephone orders go live immediately, direct orders need nursing ack
      order_method: isTelephone ? 'telephone' : 'direct',
      generic_name: data.generic_name,
      strength: data.strength,
      dose: data.dose || null,
      dosage: data.dosage,
      route: data.route,
      frequency: data.frequency,
      frequency_times: data.frequency_times || [],
      indication: data.indication || '',
      prn_reason: data.prn_reason || null,
      prn_interval: data.prn_interval || null,
      is_psychotropic: data.is_psychotropic || false,
      requires_vitals: data.requires_vitals || false,
      vital_type: data.requires_vitals ? data.vital_type : null,
      vital_threshold_low: data.vital_threshold_low !== undefined && data.vital_threshold_low !== null ? Number(data.vital_threshold_low) : null,
      vital_threshold_high: data.vital_threshold_high !== undefined && data.vital_threshold_high !== null ? Number(data.vital_threshold_high) : null,
      special_instructions: data.special_instructions || '',
      rxcui: data.rxcui || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      signed_at: isTelephone ? null : new Date().toISOString(),
      acknowledged_at: isTelephone ? new Date().toISOString() : null,
      acknowledging_nurse_id: isTelephone ? staff.id : null,
    };

    // Enrich order payload!
    const enrichedPayload = enrichProviderOrderClinicalData(payload);

    return await addDoc(ordersRef, enrichedPayload);
  };

  const updateMedication = async (medicationId: string, data: any) => {
    if (!staff?.org_id || !patientId) throw new Error('Context parameter missing');
    
    const orderRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders', medicationId);
    
    const orderUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (data.status !== undefined) {
      if (data.status === 'discontinued') {
        orderUpdates.status = 'cancelled';
      } else if (data.status === 'active') {
        orderUpdates.status = 'acknowledged';
      }
    }
    
    if (data.generic_name !== undefined) orderUpdates.generic_name = data.generic_name;
    if (data.strength !== undefined) orderUpdates.strength = data.strength;
    if (data.dose !== undefined) orderUpdates.dose = data.dose;
    if (data.dosage !== undefined) orderUpdates.dosage = data.dosage;
    if (data.route !== undefined) orderUpdates.route = data.route;
    if (data.frequency !== undefined) orderUpdates.frequency = data.frequency;
    if (data.frequency_times !== undefined) orderUpdates.frequency_times = data.frequency_times;
    if (data.indication !== undefined) orderUpdates.indication = data.indication;
    if (data.prn_reason !== undefined) orderUpdates.prn_reason = data.prn_reason;
    if (data.prn_interval !== undefined) orderUpdates.prn_interval = data.prn_interval;
    if (data.is_psychotropic !== undefined) orderUpdates.is_psychotropic = data.is_psychotropic;
    if (data.requires_vitals !== undefined) orderUpdates.requires_vitals = data.requires_vitals;
    if (data.vital_type !== undefined) orderUpdates.vital_type = data.vital_type;
    if (data.vital_threshold_low !== undefined) {
      orderUpdates.vital_threshold_low = data.vital_threshold_low !== null ? Number(data.vital_threshold_low) : null;
    }
    if (data.vital_threshold_high !== undefined) {
      orderUpdates.vital_threshold_high = data.vital_threshold_high !== null ? Number(data.vital_threshold_high) : null;
    }
    if (data.special_instructions !== undefined) orderUpdates.special_instructions = data.special_instructions;
    if (data.rxcui !== undefined) orderUpdates.rxcui = data.rxcui;

    // Get the current document first to merge and enrich properly
    const docSnap = await getDoc(orderRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};
    
    const mergedData = {
      ...currentData,
      ...orderUpdates,
      order_type: 'medication' // ensure order_type is medication for enrichment check
    };
    
    const enrichedMerged = enrichProviderOrderClinicalData(mergedData);
    
    // We only write back the fields that are in orderUpdates or have been changed/enriched
    return await updateDoc(orderRef, {
      ...orderUpdates,
      is_psychotropic: enrichedMerged.is_psychotropic ?? false,
      psychotropic_monitoring: enrichedMerged.psychotropic_monitoring ?? null,
      requires_vitals: enrichedMerged.requires_vitals ?? false,
      vital_type: enrichedMerged.vital_type ?? null,
      vital_threshold_low: enrichedMerged.vital_threshold_low !== undefined ? enrichedMerged.vital_threshold_low : null,
      vital_threshold_high: enrichedMerged.vital_threshold_high !== undefined ? enrichedMerged.vital_threshold_high : null,
    });
  };

  return { medications, loading, error, addMedication, updateMedication };
}

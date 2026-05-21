// ============================================================
// Quro — Order Acknowledgment Portal (Nursing)
// Authority: Licensed Nurse (RN/LVN)
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  UserCheck, 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Medication, ProviderOrder, MedRoute, MedFrequency, MedStatus } from '@/lib/firebase/types';
import { format } from 'date-fns';
import { safeFormat } from '@/lib/dateUtils';

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

  let status: MedStatus = 'pending_acknowledgment';
  if (order.status === 'cancelled') {
    status = 'discontinued';
  } else if (order.status === 'signed') {
    status = 'pending_acknowledgment';
  } else if (['acknowledged', 'sent_to_pharmacy', 'filled'].includes(order.status)) {
    status = 'active';
  }
  
  return {
    id: order.id,
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
    special_instructions: order.special_instructions || order.order_text || '',
    order_id: order.id,
    order_type: order.order_method || 'direct',
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
    rxcui: order.rxcui || null,
  };
};

interface Props {
  patientId: string;
}

export default function OrderAcknowledgment({ patientId }: Props) {
  const { staff, organization } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, [patientId, organization]);

  async function fetchPendingOrders() {
    if (!organization || !patientId) return;
    try {
      const q = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
        where('order_type', '==', 'medication'),
        where('status', '==', 'signed')
      );
      const snap = await getDocs(q);
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProviderOrder));
      const projected = orders.map(order => mapOrderToMedication(order, organization.id, patientId));
      setPendingOrders(projected);
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeOrder(order: Medication) {
    if (!staff || !organization) return;
    try {
      // 1. Update ProviderOrder Status to Acknowledged
      await updateDoc(
        doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', order.id),
        {
          status: 'acknowledged',
          acknowledging_nurse_id: staff.id,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      // 2. Log to Audit Trail
      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: 'ORDER_ACKNOWLEDGED',
        staff_id: staff.id,
        patient_id: patientId,
        details: `Nurse acknowledged order for ${order.generic_name}`,
        timestamp: new Date().toISOString()
      });

      fetchPendingOrders();
    } catch (err) {
      console.error('Error acknowledging order:', err);
    }
  }

  if (pendingOrders.length === 0 && !loading) return null;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
          <AlertCircle size={18} />
        </div>
        <h3 className="font-black text-quro-charcoal uppercase tracking-tighter">Orders Pending Acknowledgment</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {pendingOrders.map((order) => (
          <div key={order.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">New Physician Order</p>
                <h4 className="text-base font-black text-quro-charcoal uppercase leading-tight">
                  {order.generic_name} {order.strength} • {order.dosage}
                </h4>
                <p className="text-[11px] font-medium text-slate-600">
                  {order.frequency} via {order.route} • {order.indication}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[9px] text-amber-700 font-bold">
                  <UserCheck size={12} />
                  Signed by Dr. {order.prescriber_name?.split(',')[0]} @ {safeFormat(order.created_at, 'HH:mm')}
                </div>
              </div>
            </div>

            <button 
              onClick={() => acknowledgeOrder(order)}
              className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              VERIFY & ACTIVATE ON MAR
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

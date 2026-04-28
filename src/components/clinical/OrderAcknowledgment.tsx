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
import type { Medication } from '@/lib/firebase/types';
import { format } from 'date-fns';

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
        collection(db, 'organizations', organization.id, 'patients', patientId, 'medications'),
        where('status', '==', 'signed')
      );
      const snap = await getDocs(q);
      setPendingOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeOrder(order: Medication) {
    if (!staff || !organization) return;
    try {
      // 1. Update Medication Status to Active
      await updateDoc(
        doc(db, 'organizations', organization.id, 'patients', patientId, 'medications', order.id),
        {
          status: 'active',
          acknowledged_by: staff.id,
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
                  Signed by Dr. {order.prescriber_name?.split(',')[0]} @ {format(new Date(order.created_at), 'HH:mm')}
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

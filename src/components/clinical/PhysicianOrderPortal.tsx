// ============================================================
// Quro — Physician Medication Order Portal
// Authority: Physician / NP / PA
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  FilePlus, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  Pill, 
  AlertCircle,
  FileText,
  Search,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Medication, MedRoute, MedFrequency } from '@/lib/firebase/types';
import { format } from 'date-fns';

interface Props {
  patientId: string;
}

export default function PhysicianOrderPortal({ patientId }: Props) {
  const { staff, organization } = useAuth();
  const [orders, setOrders] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [physicians, setPhysicians] = useState<any[]>([]);

  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    generic_name: '',
    strength: '',
    dosage: '',
    route: 'PO' as MedRoute,
    frequency: 'QD' as MedFrequency,
    indication: '',
    is_psychotropic: false,
    special_instructions: '',
    requires_vitals: false,
    vital_type: 'BP',
    vital_threshold_low: '',
    vital_threshold_high: '',
    order_type: 'direct' as 'direct' | 'telephone',
    physician_id: '',
    physician_name: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchPhysicians();
  }, [patientId, organization]);

  async function fetchPhysicians() {
    if (!organization) return;
    try {
      const q = query(collection(db, 'organizations', organization.id, 'staff'), where('role', '==', 'physician'));
      const snap = await getDocs(q);
      setPhysicians(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching physicians:', err);
    }
  }

  async function fetchOrders() {
    if (!organization || !patientId) return;
    try {
      const q = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'medications'),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !organization) return;
    setIsSaving(true);

    try {
      const isTelephone = newOrder.order_type === 'telephone';
      
      const orderData = {
        ...newOrder,
        org_id: organization.id,
        patient_id: patientId,
        order_type: newOrder.order_type,
        prescriber_id: isTelephone ? newOrder.physician_id : staff.id,
        prescriber_name: isTelephone 
          ? newOrder.physician_name 
          : `${staff.first_name} ${staff.last_name}, ${staff.credential}`,
        transcribed_by_id: isTelephone ? staff.id : null,
        transcribed_by_name: isTelephone ? `${staff.first_name} ${staff.last_name}` : null,
        status: 'signed', 
        start_date: new Date().toISOString(),
        vital_threshold_low: newOrder.requires_vitals ? Number(newOrder.vital_threshold_low) : null,
        vital_threshold_high: newOrder.requires_vitals ? Number(newOrder.vital_threshold_high) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'medications'),
        orderData
      );

      // Log to Audit Trail
      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: isTelephone ? 'TELEPHONE_ORDER_TRANSCRIBED' : 'MED_ORDER_SIGNED',
        staff_id: staff.id,
        patient_id: patientId,
        details: isTelephone 
          ? `Nurse transcribed telephone order from ${newOrder.physician_name} for ${newOrder.generic_name}`
          : `Physician signed new order for ${newOrder.generic_name}`,
        timestamp: new Date().toISOString()
      });

      setIsOrdering(false);
      fetchOrders();
    } catch (err) {
      console.error('Error signing order:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-quro-charcoal uppercase tracking-tight">Physician Order Portal</h2>
          <p className="text-xs text-slate-500 font-medium">Verified CPOE interface for licensed prescribers.</p>
        </div>
        {!isOrdering && (
          <button 
            onClick={() => setIsOrdering(true)}
            className="flex items-center gap-2 px-6 py-3 bg-quro-teal text-white rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20"
          >
            <FilePlus size={18} />
            WRITE NEW MED ORDER
          </button>
        )}
      </div>

      {/* New Order Form */}
      {isOrdering && (
        <form onSubmit={handleSubmitOrder} className="glass-card p-10 border-2 border-quro-teal animate-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-quro-teal rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                <PenTool size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-quro-charcoal uppercase">
                  {newOrder.order_type === 'telephone' ? 'Telephone Order (T.O.)' : 'Direct Physician Order'}
                </h3>
                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Clinical Decision Support Enabled</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setNewOrder({...newOrder, order_type: 'direct'})}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newOrder.order_type === 'direct' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Direct
              </button>
              <button 
                type="button"
                onClick={() => setNewOrder({...newOrder, order_type: 'telephone'})}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newOrder.order_type === 'telephone' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Telephone (T.O.)
              </button>
            </div>
          </div>

          {newOrder.order_type === 'telephone' && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 block">Selecting Prescribing Physician</label>
              <select 
                required
                className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-quro-charcoal"
                value={newOrder.physician_id}
                onChange={e => {
                  const p = physicians.find(ph => ph.id === e.target.value);
                  setNewOrder({...newOrder, physician_id: e.target.value, physician_name: `Dr. ${p?.last_name}`});
                }}
              >
                <option value="">Select Physician giving the order...</option>
                {physicians.map(p => (
                  <option key={p.id} value={p.id}>Dr. {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Primary Med Details */}
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication Name (Generic/Brand)</label>
                <input 
                  required
                  placeholder="e.g. Lisinopril"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal focus:ring-2 ring-quro-teal"
                  value={newOrder.generic_name}
                  onChange={e => setNewOrder({...newOrder, generic_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strength</label>
                  <input required placeholder="e.g. 20mg" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal" value={newOrder.strength} onChange={e => setNewOrder({...newOrder, strength: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage</label>
                  <input required placeholder="e.g. 1 Tablet" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal" value={newOrder.dosage} onChange={e => setNewOrder({...newOrder, dosage: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" value={newOrder.route} onChange={e => setNewOrder({...newOrder, route: e.target.value as any})}>
                    <option value="PO">PO (By Mouth)</option>
                    <option value="SL">Sublingual</option>
                    <option value="IM">Intramuscular</option>
                    <option value="IV">Intravenous</option>
                    <option value="SC">Subcutaneous</option>
                    <option value="TOP">Topical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" value={newOrder.frequency} onChange={e => setNewOrder({...newOrder, frequency: e.target.value as any})}>
                    <option value="QD">QD (Daily)</option>
                    <option value="BID">BID (Twice Daily)</option>
                    <option value="TID">TID (Three Times Daily)</option>
                    <option value="QID">QID (Four Times Daily)</option>
                    <option value="PRN">PRN (As Needed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Clinical Guardrails */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-amber-500" size={16} />
                    <span className="text-[10px] font-black uppercase text-slate-600">Clinical Guardrails</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-quro-teal focus:ring-quro-teal"
                      checked={newOrder.requires_vitals}
                      onChange={e => setNewOrder({...newOrder, requires_vitals: e.target.checked})}
                    />
                    <span className="text-[10px] font-bold text-slate-500">Enable Thresholds</span>
                  </label>
                </div>

                {newOrder.requires_vitals && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">Hold if below</span>
                      <input type="number" className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" placeholder="e.g. 60" value={newOrder.vital_threshold_low} onChange={e => setNewOrder({...newOrder, vital_threshold_low: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">Hold if above</span>
                      <input type="number" className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" placeholder="e.g. 100" value={newOrder.vital_threshold_high} onChange={e => setNewOrder({...newOrder, vital_threshold_high: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                    checked={newOrder.is_psychotropic}
                    onChange={e => setNewOrder({...newOrder, is_psychotropic: e.target.checked})}
                  />
                  <span className="text-[10px] font-black text-rose-500 uppercase">Classify as Psychotropic</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Medication (Indication)</label>
                <input placeholder="e.g. Hypertension" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" value={newOrder.indication} onChange={e => setNewOrder({...newOrder, indication: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nurse Instructions</label>
                <textarea 
                  placeholder="e.g. Hold if SBP < 100 or HR < 55"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold h-20 resize-none"
                  value={newOrder.special_instructions}
                  onChange={e => setNewOrder({...newOrder, special_instructions: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={isSaving || (newOrder.order_type === 'telephone' && !newOrder.physician_id)}
                  className="flex-1 bg-quro-charcoal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3"
                >
                  <ShieldCheck size={20} className="text-quro-teal" />
                  {isSaving ? 'AUTHENTICATING...' : (newOrder.order_type === 'telephone' ? 'SIGN AS T.O.' : 'SIGN & COMMIT ORDER')}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsOrdering(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Recent Orders History */}
      <div className="space-y-4">
        {orders.length === 0 && !loading && (
          <div className="text-center py-20 glass-card">
            <FileText className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No Recent Medication Orders</p>
          </div>
        )}

        {orders.map((order) => (
          <div key={order.id} className="glass-card p-6 border-l-4 border-quro-teal hover:border-l-8 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-quro-charcoal">
                  <Pill size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-quro-charcoal uppercase tracking-tight">
                      {order.generic_name} {order.strength}
                    </h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                      order.status === 'signed' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {order.status === 'signed' ? 'Pending Acknowledgment' : 'Active on MAR'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {order.dosage} via {order.route} • {order.frequency} • {order.indication}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-quro-charcoal uppercase">Electronically Signed</p>
                <p className="text-[10px] text-slate-500 italic">By Dr. {staff?.last_name || 'Verified Prescriber'}</p>
                <p className="text-[8px] text-slate-400 mt-1">{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

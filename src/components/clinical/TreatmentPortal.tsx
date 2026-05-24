// ============================================================
// Quro — Treatment Administration Record (TAR) / Portal
// tracks clinical treatments, wound care, and procedures
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical,
  Activity,
  ShieldCheck,
  X
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Treatment, TreatmentEntry } from '@/lib/firebase/types';
import { format } from 'date-fns';
import { safeFormat } from '@/lib/dateUtils';

interface Props {
  patientId: string;
  patientRoom?: string;
  patientName?: string;
}

const mapOrderToTreatment = (order: any): Treatment => {
  return {
    id: order.id,
    org_id: order.org_id,
    patient_id: order.patient_id,
    treatment_name: order.title || order.generic_name || order.order_text?.split(': ')[1] || order.order_text?.split(' - ')[0] || order.order_text || 'Treatment Order',
    site: 'General',
    frequency: order.frequency || 'Daily',
    frequency_times: order.frequency_times || ['09:00'],
    duration: order.duration || 'Until discontinued',
    indication: order.indication || 'Prophylaxis',
    prescriber_id: order.ordering_physician_id || 'Attending Physician',
    start_date: order.signed_at || order.created_at || new Date().toISOString(),
    status: order.status === 'cancelled' ? 'discontinued' : 'active',
    instructions: order.instructions || order.special_instructions || order.order_text || '',
    order_id: order.id,
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString()
  };
};

export default function TreatmentPortal({ patientId, patientRoom, patientName }: Props) {
  const { staff, organization, activeFacility } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Treatment Form State
  const [newTreatment, setNewTreatment] = useState({
    treatment_name: '',
    site: '',
    frequency: 'Daily',
    duration: '',
    instructions: '',
    indication: ''
  });

  const fetchTreatments = React.useCallback(async () => {
    if (!organization || !patientId) return;
    try {
      // 1. Fetch from custom /treatments collection
      const qTxs = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'treatments'),
        where('status', '==', 'active')
      );
      const snapTxs = await getDocs(qTxs);
      const customTxs = snapTxs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Treatment));

      // 2. Fetch from /provider_orders collection where order_type is 'treatment' and status is not cancelled
      const qOrders = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
        where('order_type', '==', 'treatment'),
        where('status', 'in', ['signed', 'acknowledged', 'sent_to_pharmacy', 'filled'])
      );
      const snapOrders = await getDocs(qOrders);
      const orderTxs = snapOrders.docs.map(doc => {
        const data = doc.data();
        return mapOrderToTreatment({ id: doc.id, ...data });
      });

      // Merge and sort
      const merged = [...customTxs, ...orderTxs];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTreatments(merged);
    } catch (err) {
      console.error('Error fetching treatments:', err);
    } finally {
      setLoading(false);
    }
  }, [organization, patientId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTreatments();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTreatments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !organization) return;
    setIsSaving(true);

    try {
      const treatmentData = {
        ...newTreatment,
        org_id: organization.id,
        patient_id: patientId,
        status: 'active',
        start_date: new Date().toISOString(),
        prescriber_id: staff.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'treatments'),
        treatmentData
      );

      // Log to Audit Trail
      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: 'TREATMENT_ORDER_ADDED',
        staff_id: staff.id,
        patient_id: patientId,
        details: `Added treatment: ${newTreatment.treatment_name}`,
        timestamp: new Date().toISOString()
      });

      setIsAdding(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error adding treatment:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePerformTreatment(treatment: Treatment) {
    if (!staff || !organization) return;
    
    try {
      const entry: Partial<TreatmentEntry> = {
        org_id: organization.id,
        patient_id: patientId,
        treatment_id: treatment.id,
        action: 'done',
        performed_by: `${staff.first_name} ${staff.last_name}`,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: format(new Date(), 'HH:mm'),
        actual_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await addDoc(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'treatment_entries'),
        entry
      );

      // Resolve patient room, name, and facility ID
      let room = patientRoom;
      let name = patientName;
      let facId = activeFacility?.id;

      if (!room || !name || !facId) {
        try {
          const patientSnap = await getDoc(doc(db, 'organizations', organization.id, 'patients', patientId));
          if (patientSnap.exists()) {
            const pData = patientSnap.data();
            room = room || pData.room_number || "Room TBD";
            name = name || `${pData.first_name || ""} ${pData.last_name || ""}`.trim() || "Patient";
            facId = facId || pData.facility_id;
          }
        } catch (e) {
          console.error("Error fetching patient details for fallback:", e);
        }
      }

      facId = facId || 'platinum-health-hub';
      room = room || 'Room TBD';
      name = name || 'Patient';

      // Log structured entry into facility clinical_logs sub-collection
      const logEntry = {
        patientRoom: room,
        patientName: name,
        timestamp: new Date(),
        type: "THERAPY",
        summaryText: `Therapeutic treatment administered: ${treatment.treatment_name} to site: ${treatment.site || 'General'}. Scheduled freq: ${treatment.frequency}.`,
        chartedBy: staff ? `${staff.role || 'RN'}-${staff.id.slice(0, 4)}` : 'RN-9921'
      };

      const logsRef = collection(db, 'organizations', organization.id, 'facilities', facId, 'clinical_logs');
      await addDoc(logsRef, logEntry);

      alert('Treatment documented successfully.');
    } catch (err) {
      console.error('Error documenting treatment:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Treatment Portal (TAR)</h2>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Manage wound care, respiratory treatments, and clinical procedures.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            <Plus size={16} />
            Add Treatment
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card p-10 border-2 border-slate-900 bg-white rounded-[2.5rem] animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900">
                <Activity size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase">New Treatment Protocol</h3>
            </div>
            <button type="button" onClick={() => setIsAdding(false)} title="Close" className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Name</label>
                <input 
                  required
                  placeholder="e.g. Wound Care - Normal Saline"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-slate-900 focus:ring-2 ring-slate-900/10"
                  value={newTreatment.treatment_name}
                  onChange={e => setNewTreatment({...newTreatment, treatment_name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Site</label>
                <input 
                  placeholder="e.g. Coccyx, LLE, Left Forearm"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-slate-900"
                  value={newTreatment.site}
                  onChange={e => setNewTreatment({...newTreatment, site: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                  <select 
                    title="Frequency"
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" 
                    value={newTreatment.frequency} 
                    onChange={e => setNewTreatment({...newTreatment, frequency: e.target.value})}
                  >
                    <option>Daily</option>
                    <option>BID (Twice Daily)</option>
                    <option>TID (Three Daily)</option>
                    <option>Every Shift</option>
                    <option>Weekly</option>
                    <option>PRN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</label>
                  <input 
                    placeholder="e.g. 7 Days" 
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" 
                    value={newTreatment.duration} 
                    onChange={e => setNewTreatment({...newTreatment, duration: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indication / Diagnosis</label>
                <input 
                  placeholder="e.g. Pressure Ulcer Stage 2"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold"
                  value={newTreatment.indication}
                  onChange={e => setNewTreatment({...newTreatment, indication: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specific Instructions</label>
                <textarea 
                  placeholder="e.g. Cleanse with NS, apply hydrocolloid dressing..."
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold h-32 resize-none"
                  value={newTreatment.instructions}
                  onChange={e => setNewTreatment({...newTreatment, instructions: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3"
            >
              <ShieldCheck size={18} className="text-teal-400" />
              {isSaving ? 'Saving...' : 'Authorize Treatment'}
            </button>
          </div>
        </form>
      )}

      {/* Treatment List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Treatments...</div>
        ) : treatments.length === 0 ? (
          <div className="py-20 text-center glass-card bg-slate-50 border-dashed border-2 border-slate-200">
            <Activity className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Active Treatments</p>
          </div>
        ) : treatments.map(t => (
          <div key={t.id} className="group glass-card p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-slate-900/20 transition-all">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">
                    {t.frequency}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Started {safeFormat(t.start_date, 'MMM dd')}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase">{t.treatment_name}</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site:</p>
                    <p className="text-xs font-bold text-slate-700 uppercase">{t.site || 'General'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Indication:</p>
                    <p className="text-xs font-bold text-slate-700 uppercase">{t.indication || 'N/A'}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500 leading-relaxed italic">&quot;{t.instructions}&quot;</p>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4">
                <button 
                  onClick={() => handlePerformTreatment(t)}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Document Treatment
                </button>
                <div className="flex items-center gap-2">
                  <button title="More options" className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Quro — Shift Handoff Component
// Professional Nurse-to-Nurse Clinical Communication
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Save, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope,
  Activity,
  ClipboardCheck,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { HandoffEntry } from '@/lib/firebase/types';
import { format } from 'date-fns';

interface Props {
  patientId: string;
}

export default function ShiftHandoff({ patientId }: Props) {
  const { staff, organization } = useAuth();
  const [entries, setEntries] = useState<HandoffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    shift_type: 'day' as 'day' | 'evening' | 'night',
    situation: '',
    assessment: '',
    recommendation: '',
    significant_events: '',
    pending_tasks: '',
    bp: '',
    pulse: '',
    temp: '',
    o2: '',
    glucose: ''
  });

  useEffect(() => {
    fetchHandoffs();
  }, [patientId, organization]);

  async function fetchHandoffs() {
    if (!organization || !patientId) return;
    try {
      const q = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'handoff_logs'),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HandoffEntry)));
    } catch (err) {
      console.error('Error fetching handoffs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !organization) return;
    setIsSaving(true);

    try {
      const newEntry = {
        org_id: organization.id,
        facility_id: staff.facility_id,
        patient_id: patientId,
        outgoing_nurse_id: staff.id,
        outgoing_nurse_name: `${staff.first_name} ${staff.last_name}`,
        shift_type: formData.shift_type,
        situation: formData.situation,
        assessment: formData.assessment,
        recommendation: formData.recommendation,
        vitals_summary: {
          bp: formData.bp,
          pulse: formData.pulse,
          temp: formData.temp,
          o2: formData.o2,
          glucose: formData.glucose
        },
        significant_events: formData.significant_events.split('\n').filter(s => s.trim()),
        pending_tasks: formData.pending_tasks.split('\n').filter(s => s.trim()),
        is_signed_off: false,
        created_at: new Date().toISOString()
      };

      await addDoc(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'handoff_logs'),
        newEntry
      );

      // Update patient summary for dashboard
      await updateDoc(doc(db, 'organizations', organization.id, 'patients', patientId), {
        latest_handoff: {
          shift_type: formData.shift_type,
          situation: formData.situation.slice(0, 150),
          pending_tasks_count: newEntry.pending_tasks.length,
          is_signed_off: false,
          nurse_name: newEntry.outgoing_nurse_name,
          timestamp: newEntry.created_at
        }
      });

      setFormData({
        shift_type: 'day',
        situation: '',
        assessment: '',
        recommendation: '',
        significant_events: '',
        pending_tasks: '',
        bp: '',
        pulse: '',
        temp: '',
        o2: '',
        glucose: ''
      });
      setIsAdding(false);
      fetchHandoffs();
    } catch (err) {
      console.error('Error saving handoff:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function signOff(entryId: string) {
    if (!staff || !organization) return;
    try {
      await updateDoc(
        doc(db, 'organizations', organization.id, 'patients', patientId, 'handoff_logs', entryId),
        {
          incoming_nurse_id: staff.id,
          is_signed_off: true,
          signed_at: new Date().toISOString()
        }
      );

      // Update patient summary
      await updateDoc(doc(db, 'organizations', organization.id, 'patients', patientId), {
        'latest_handoff.is_signed_off': true
      });
      fetchHandoffs();
    } catch (err) {
      console.error('Error signing off handoff:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-quro-charcoal tracking-tight uppercase">Shift Handoff Log</h2>
          <p className="text-xs text-slate-500 font-medium">Critical nurse-to-nurse communication for safety & continuity.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-quro-teal text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20"
          >
            <Plus size={16} />
            NEW HANDOFF REPORT
          </button>
        )}
      </div>

      {/* New Handoff Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-2 border-teal-500/30 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-quro-teal">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-quro-charcoal">Shift Change Report</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Clinical Continuity Protocol</p>
              </div>
            </div>
            <select 
              value={formData.shift_type}
              onChange={(e) => setFormData({...formData, shift_type: e.target.value as any})}
              className="bg-slate-100 border-none rounded-lg text-xs font-bold px-4 py-2 outline-none focus:ring-2 ring-teal-500"
            >
              <option value="day">DAY SHIFT (07:00 - 15:00)</option>
              <option value="evening">EVENING SHIFT (15:00 - 23:00)</option>
              <option value="night">NIGHT SHIFT (23:00 - 07:00)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SBAR Section */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Current Situation</label>
                <textarea 
                  required
                  value={formData.situation}
                  onChange={(e) => setFormData({...formData, situation: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500 h-24 resize-none"
                  placeholder="Patient's current status, changes in condition..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Assessment (Significant Events)</label>
                <textarea 
                  required
                  value={formData.assessment}
                  onChange={(e) => setFormData({...formData, assessment: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500 h-24 resize-none"
                  placeholder="What happened during your shift? Falls, behaviors, pain management..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Recommendations / Follow-up</label>
                <textarea 
                  required
                  value={formData.recommendation}
                  onChange={(e) => setFormData({...formData, recommendation: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500 h-24 resize-none"
                  placeholder="Instructions for the incoming nurse, pending labs, scheduled meds..."
                />
              </div>
            </div>

            {/* Vitals & Tasks Section */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Activity size={12} />
                  Shift Vitals Summary
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500">BP</span>
                    <input value={formData.bp} onChange={(e) => setFormData({...formData, bp: e.target.value})} className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold text-quro-charcoal" placeholder="120/80" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500">HR</span>
                    <input value={formData.pulse} onChange={(e) => setFormData({...formData, pulse: e.target.value})} className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold text-quro-charcoal" placeholder="72" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500">O2</span>
                    <input value={formData.o2} onChange={(e) => setFormData({...formData, o2: e.target.value})} className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold text-quro-charcoal" placeholder="98%" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Pending Tasks (1 per line)</label>
                <textarea 
                  value={formData.pending_tasks}
                  onChange={(e) => setFormData({...formData, pending_tasks: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500 h-32 resize-none"
                  placeholder="Complete dressing change&#10;Verify new orders&#10;Follow up on blood work..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-quro-teal text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {isSaving ? 'PUBLISHING...' : 'PUBLISH HANDOFF REPORT'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Handoff History Timeline */}
      <div className="space-y-4">
        {entries.length === 0 && !loading && (
          <div className="text-center py-12 glass-card">
            <MessageSquare className="mx-auto text-slate-300 mb-2" size={48} />
            <p className="text-slate-500 font-medium">No handoff reports recorded yet.</p>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className={`glass-card p-6 border-l-4 ${entry.is_signed_off ? 'border-emerald-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                  entry.shift_type === 'day' ? 'bg-amber-400' : entry.shift_type === 'evening' ? 'bg-orange-500' : 'bg-indigo-900'
                }`}>
                  <Clock size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-quro-charcoal uppercase tracking-tighter">
                      {entry.shift_type} SHIFT HANDOFF
                    </h4>
                    {entry.is_signed_off && (
                      <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                        <CheckCircle2 size={10} />
                        Signed Off
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {format(new Date(entry.created_at), 'MMM dd, yyyy @ HH:mm')} by Nurse {entry.outgoing_nurse_name}
                  </p>
                </div>
              </div>
              {!entry.is_signed_off && staff?.id !== entry.outgoing_nurse_id && (
                <button 
                  onClick={() => signOff(entry.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg shadow-emerald-900/10 flex items-center gap-2"
                >
                  <UserCheck size={14} />
                  SIGN & ACKNOWLEDGE
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="md:col-span-2 space-y-4">
                <div className="bg-slate-50/50 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Situation & Events</span>
                  <p className="text-quro-charcoal leading-relaxed">{entry.situation}</p>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Recommendations</span>
                  <p className="text-quro-charcoal leading-relaxed font-semibold">{entry.recommendation}</p>
                </div>
              </div>

              <div className="space-y-4">
                {entry.vitals_summary && (
                  <div className="bg-quro-slate p-3 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-2">Shift Vitals</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">BP:</span>
                        <span className="font-bold">{entry.vitals_summary.bp || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">P:</span>
                        <span className="font-bold">{entry.vitals_summary.pulse || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">O2:</span>
                        <span className="font-bold">{entry.vitals_summary.o2 || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">BS:</span>
                        <span className="font-bold">{entry.vitals_summary.glucose || '--'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {entry.pending_tasks.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-black text-amber-600 uppercase block mb-2">Pending Tasks</span>
                    <ul className="space-y-1">
                      {entry.pending_tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-amber-900">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

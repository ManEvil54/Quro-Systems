// ============================================================
// Quro — Handover Hub
// The 'Shift Handshake' center for nurse-to-nurse transitions
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  User, 
  Clock,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { useHandover } from '@/hooks/useHandover';
import { useAuth } from '@/contexts/AuthContext';

export default function HandoverPage() {
  const { notes, pendingAcks, loading, error, createNote, performShiftHandshake } = useHandover();
  const { staff } = useAuth();
  
  const [showNewNote, setShowNewNote] = useState(false);
  const [isHandshaking, setIsHandshaking] = useState(false);

  const [form, setForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    general_notes: '',
    shift: 'day' as any,
    is_urgent: false,
    patient_id: null,
    facility_id: staff?.facility_id || '',
    shift_date: new Date().toISOString().split('T')[0]
  });

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNote(form);
      setShowNewNote(false);
      setForm({ ...form, subjective: '', objective: '', assessment: '', plan: '', general_notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleHandshake = async () => {
    if (pendingAcks.length === 0) return;
    setIsHandshaking(true);
    try {
      await performShiftHandshake(pendingAcks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHandshaking(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading Handover Hub...</div>;

  return (
    <div className="animate-in">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Handover Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Manage shift transitions and clinical communication.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleHandshake}
            disabled={pendingAcks.length === 0 || isHandshaking}
            className={`btn-primary shimmer-btn flex items-center gap-2 ${pendingAcks.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
          >
            {isHandshaking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
            <span>Shift Handshake ({pendingAcks.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Alerts Area */}
          {notes.filter(n => n.is_urgent).length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-3">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} />
                Critical Handover Notes
              </h3>
              {notes.filter(n => n.is_urgent).map(note => (
                <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-none">Urgent Update</p>
                    <p className="text-sm text-slate-700 mt-2">{note.general_notes || note.assessment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Note Toggle */}
          {!showNewNote ? (
            <button 
              onClick={() => setShowNewNote(true)}
              className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/30 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              <span>Author New Handover Note</span>
            </button>
          ) : (
            <div className="glass-card p-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList size={20} className="text-teal-600" />
                  New SOAP Note
                </h3>
                <button onClick={() => setShowNewNote(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateNote} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Subjective</label>
                    <textarea 
                      className="input min-h-[80px]" placeholder="Patient reports..."
                      value={form.subjective} onChange={e => setForm({...form, subjective: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Objective</label>
                    <textarea 
                      className="input min-h-[80px]" placeholder="Observed signs..."
                      value={form.objective} onChange={e => setForm({...form, objective: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Assessment</label>
                    <textarea 
                      className="input min-h-[80px]" placeholder="Clinical judgment..."
                      value={form.assessment} onChange={e => setForm({...form, assessment: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Plan</label>
                    <textarea 
                      className="input min-h-[80px]" placeholder="Next steps..."
                      value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500" 
                        checked={form.is_urgent} onChange={e => setForm({...form, is_urgent: e.target.checked})}
                      />
                      <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Mark as Urgent</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowNewNote(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                    <button type="submit" className="btn-primary py-2 px-6 text-sm">Post Note</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Notes Feed */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Transitions</h3>
            {notes.map((note) => (
              <div key={note.id} className={`glass-card p-5 group transition-all ${pendingAcks.includes(note.id) ? 'border-l-4 border-l-teal-500' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Author ID: {note.authored_by.slice(0, 5)}...</p>
                      <p className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingAcks.includes(note.id) && <span className="badge badge-critical">Needs Acknowledgment</span>}
                    <span className="badge badge-muted uppercase">{note.shift} Shift</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subjective</p>
                    <p className="text-slate-700">{note.subjective || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Objective</p>
                    <p className="text-slate-700">{note.objective || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assessment</p>
                    <p className="text-slate-700">{note.assessment || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Plan</p>
                    <p className="text-slate-700">{note.plan || '-'}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <MessageSquare size={12} />
                      <span>2 Comments</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:translate-x-1 transition-transform">
                    View Full Details
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Status */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Shift Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Shift</span>
                <span className="text-sm font-bold text-slate-900 capitalize">{staff?.role || 'Nurse'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Acks</span>
                <span className={`text-sm font-bold ${pendingAcks.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {pendingAcks.length}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold tracking-tighter">
                  HIPAA Reminder: Handover notes are part of the legal clinical record. Ensure objective charting.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none shadow-xl shadow-teal-500/20">
            <ShieldCheck size={32} className="mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">Shift Handshake</h3>
            <p className="text-xs text-white/80 leading-relaxed mb-6">
              The shift handshake synchronizes the facility state between nurses. Acknowledging notes confirms you have reviewed all critical patient updates.
            </p>
            <button 
              onClick={handleHandshake}
              disabled={pendingAcks.length === 0}
              className="w-full py-2.5 rounded-lg bg-white text-teal-600 font-bold text-sm shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              Complete Handshake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

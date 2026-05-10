'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  X,
  History,
  Zap,
  Activity,
  ClipboardCheck,
  Heart
} from 'lucide-react';
import { useHandover } from '@/hooks/useHandover';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';

export default function HandoverPage() {
  const { activeFacility, staff, organization } = useAuth();
  const { notes, pendingAcks, loading: handoverLoading, error, createNote, performShiftHandshake } = useHandover(activeFacility?.id);
  const { beds, loading: dashboardLoading } = useDashboard(activeFacility?.id || '');
  
  const loading = handoverLoading || dashboardLoading;
  
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
    patient_id: undefined as string | undefined,
    facility_id: activeFacility?.id || '',
    shift_date: new Date().toISOString().split('T')[0]
  });

  // Update facility_id if activeFacility changes
  useEffect(() => {
    if (activeFacility?.id) {
      setForm(prev => ({ ...prev, facility_id: activeFacility.id }));
    }
  }, [activeFacility]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facility_id) return;
    
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

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-in fade-in">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Synchronizing Transitions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 animate-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 text-teal-600 mb-2">
            <ArrowRightLeft size={14} className="font-black" />
            <span className="text-[10px] font-black uppercase tracking-widest">Clinical Continuity</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight italic">Handover Hub</h1>
          <p className="text-sm text-slate-500 font-medium italic mt-1">
            Managing <span className="text-slate-900 font-bold">{activeFacility?.name || 'Global'}</span> shift transitions and SOAP documentation.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-6 py-4 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Zap size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Acks</p>
              <p className={`text-xl font-black ${pendingAcks.length > 0 ? 'text-rose-500' : 'text-slate-900'}`}>{pendingAcks.length}</p>
            </div>
          </div>

          <button 
            onClick={handleHandshake}
            disabled={pendingAcks.length === 0 || isHandshaking}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl ${
              pendingAcks.length === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/40'
            }`}
          >
            {isHandshaking ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )}
            <span>Complete Handshake</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Feed */}
        <div className="xl:col-span-8 space-y-8">
          {/* Urgent Alerts Area */}
          {notes.filter(n => n.is_urgent).length > 0 && (
            <div className="p-8 rounded-[32px] bg-rose-50 border border-rose-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-rose-600 uppercase tracking-[0.2em] flex items-center gap-3">
                  <AlertTriangle size={16} />
                  Critical Shift Alerts
                </h3>
                <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full animate-pulse">ACTION REQUIRED</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {notes.filter(n => n.is_urgent).map(note => (
                  <div key={note.id} className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex items-start gap-5 group hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Urgent Clinical Update</p>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-slate-800 font-bold leading-relaxed">{note.general_notes || note.assessment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Note Toggle */}
          {!showNewNote ? (
            <button 
              onClick={() => setShowNewNote(true)}
              className="w-full group p-8 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/20 transition-all flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
                <Plus size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest mb-1">Author New SOAP Note</p>
                <p className="text-xs font-medium italic">Document clinical observations for this shift.</p>
              </div>
            </button>
          ) : (
            <div className="glass-card p-8 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Clinical Documentation</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Standardized SOAP Note Structure</p>
                  </div>
                </div>
                <button onClick={() => setShowNewNote(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subjective (S)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all min-h-[100px]" 
                      placeholder="Patient statements, pain reports, chief complaints..."
                      value={form.subjective} onChange={e => setForm({...form, subjective: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objective (O)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all min-h-[100px]" 
                      placeholder="Vital signs, physical exam, observable data..."
                      value={form.objective} onChange={e => setForm({...form, objective: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assessment (A)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all min-h-[100px]" 
                      placeholder="Clinical judgment, diagnosis progress, status change..."
                      value={form.assessment} onChange={e => setForm({...form, assessment: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan (P)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all min-h-[100px]" 
                      placeholder="Treatments, medication changes, next steps..."
                      value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          className="w-6 h-6 rounded-lg border-rose-200 text-rose-600 focus:ring-rose-500 cursor-pointer" 
                          checked={form.is_urgent} onChange={e => setForm({...form, is_urgent: e.target.checked})}
                        />
                      </div>
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">Mark as High Priority</span>
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowNewNote(false)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                    <button type="submit" className="px-12 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20">Post Documentation</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Patient Handover Summaries */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <ClipboardCheck size={16} />
                Resident Transition Status
              </h3>
              <div className="h-px flex-1 bg-slate-100 mx-6" />
            </div>

            {beds.filter(bed => bed.patient).map((bed) => {
              const patient = bed.patient!;
              const patientNotes = notes.filter(n => n.patient_id === patient.id);
              const latestNote = patientNotes[0];

              return (
                <div key={patient.id} className="glass-card-quro p-8 group transition-all relative overflow-hidden bg-white border border-slate-100">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                        latestNote?.is_urgent ? 'bg-rose-500 text-white' : 'bg-quro-charcoal text-white'
                      }`}>
                        {patient.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{bed.room_name} • {bed.bed_name}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN: {patient.mrn}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Patient {patient.initials}</h3>
                      </div>
                    </div>

                    <div className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                      latestNote?.is_urgent ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                      latestNote ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                      'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      {latestNote?.is_urgent ? 'Urgent Update' : latestNote ? 'Shift Note' : 'Stable'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Subjective / Observation</p>
                        <p className="text-sm text-slate-800 font-bold leading-relaxed">
                          {latestNote?.subjective || 'Resident comfortable, no new complaints voiced. Resting quietly.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Clinical Status</p>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Heart size={14} className="text-rose-500" />
                            <span className="text-xs font-black text-slate-700">{patient.hr || '--'} BPM</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-xs font-black text-slate-700">{patient.bp || '--'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Assessment & Plan</p>
                        <p className="text-sm text-slate-800 font-bold leading-relaxed">
                          {latestNote?.assessment || 'Clinical status stable. Continue current plan of care and routine monitoring.'}
                        </p>
                      </div>
                      {latestNote && (
                        <div className="flex items-center gap-2 pt-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                            {latestNote.shift[0]}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Documented {new Date(latestNote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-xl transition-all">
                        View Chart
                      </button>
                      <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-xl transition-all">
                        Add Note
                      </button>
                    </div>
                    <button className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:translate-x-1 transition-transform group/btn">
                      Full History
                      <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Status */}
        <div className="xl:col-span-4 space-y-8">
          <div className="glass-card p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <Clock size={16} className="text-teal-600" />
              Facility Overview
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected House</span>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{activeFacility?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Staff</span>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight capitalize">{staff?.role || 'Nurse'}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50">
                <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Unread Updates</span>
                <span className={`text-sm font-black ${pendingAcks.length > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                  {pendingAcks.length}
                </span>
              </div>
              <div className="pt-8 border-t border-slate-100">
                <div className="p-6 rounded-[24px] bg-slate-900 text-white relative overflow-hidden">
                  <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-3">Compliance Guard</p>
                  <p className="text-xs font-medium leading-relaxed italic opacity-80">
                    Handover documentation is a HIPAA-protected legal artifact. Ensure objective, fact-based charting for every transition.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl shadow-slate-900/40 relative overflow-hidden">
            <Zap className="absolute -right-6 -top-6 w-32 h-32 text-white/5 rotate-12" />
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tight italic mb-4">Shift Pulse</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-8 font-medium italic">
                The shift handshake synchronizes the facility state. Acknowledging these updates confirms you have accepted clinical responsibility for the current residents.
              </p>
              <button 
                onClick={handleHandshake}
                disabled={pendingAcks.length === 0}
                className="w-full py-5 rounded-2xl bg-teal-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-teal-900/20 hover:bg-teal-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-slate-700 disabled:scale-100"
              >
                Sync Shift Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

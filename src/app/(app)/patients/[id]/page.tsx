'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, 
  ArrowLeft, 
  Printer, 
  Pill, 
  FileText, 
  ClipboardList, 
  Activity, 
  Calendar, 
  MapPin, 
  ShieldCheck,
  Plus,
  ChevronRight,
  Clock,
  Heart,
  Droplets,
  Stethoscope,
  Phone,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useHandover } from '@/hooks/useHandover';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeFacility } = useAuth();
  const { patient, loading: patientLoading, error } = usePatient(id);
  const { medications, loading: medsLoading } = useMedications(id);
  const { entries: marEntries, loading: marLoading, bulkLogAdministrations } = useMAR(id);
  const { createNote } = useHandover();
  const { notes, saveNote } = useNotes(id);
  
  const [activeTab, setActiveTab] = useState<'facesheet' | 'medications' | 'mar' | 'vitals' | 'orders' | 'charting'>('facesheet');
  const [signOffActions, setSignOffActions] = useState<Record<string, 'given' | 'held'>>({});
  const [isSigningOff, setIsSigningOff] = useState(false);

  // Charting State
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [narrativeNote, setNarrativeNote] = useState('');
  const [assessments, setAssessments] = useState({
    // Safety & Environment
    safety_check: true,
    bed_rails_up: true,
    call_light_reach: true,
    alarm_functional: true,
    
    // Clinical Systems
    resp_normal: true,
    cv_stable: true,
    neuro_oriented: true,
    gi_gu_normal: true,
    skin_intact: true,
    
    // SNF Specifics
    pain_managed: true,
    adl_care: true,
    bm_shift: false,
    behaviors_exhibited: false,
    falls_incident: false,
    skin_new_lesion: false,
    meal_intake: '76-100',
    fluids_intake: 240,
  });

  // Initialize sign-off actions when meds load
  React.useEffect(() => {
    if (medications.length > 0) {
      const initial: Record<string, 'given' | 'held'> = {};
      medications.forEach(m => {
        initial[m.id] = 'given';
      });
      setSignOffActions(initial);
    }
  }, [medications]);

  const handleBulkSignOff = async () => {
    if (!patient || isSigningOff) return;
    setIsSigningOff(true);

    try {
      const entries = medications.map(m => ({
        medication_id: m.id,
        scheduled_time: m.frequency || 'Shift Pass',
        action: signOffActions[m.id] || 'given'
      }));

      await bulkLogAdministrations(entries);

      // Identify held meds for handover
      const heldMeds = medications.filter(m => signOffActions[m.id] === 'held');
      if (heldMeds.length > 0) {
        const medNames = heldMeds.map(m => m.generic_name).join(', ');
        await createNote({
          facility_id: activeFacility?.id || '',
          patient_id: patient.id,
          content: `MEDICATION ALERT: The following medications were HELD during this shift pass: ${medNames}. Please review chart for clinical rationale.`,
          priority: 'high',
          status: 'active'
        });
      }

      alert('Shift Medication Pass recorded successfully.');
    } catch (err) {
      console.error('Sign off failed:', err);
      alert('Failed to record medication pass.');
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleSaveCharting = async () => {
    if (isSavingNote) return;
    setIsSavingNote(true);
    try {
      await saveNote({
        type: 'shift_assessment',
        content: narrativeNote,
        assessments: assessments
      });
      setNarrativeNote('');
      alert('Shift charting saved to permanent record.');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save shift charting.');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (patientLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-in fade-in">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-quro-teal rounded-full animate-spin mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Clinical Record...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <p className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4">{error || 'Patient Not Found'}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-quro-teal font-black uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Actions - Hidden on Print */}
      <div className="no-print flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-500 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={16} />
          Back to House
        </button>

        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            <Printer size={16} />
            Print {activeTab === 'facesheet' ? 'Facesheet' : activeTab === 'mar' ? 'MAR' : 'Medication List'}
          </button>
        </div>
      </div>

      {/* Patient Identity Bar */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-[2rem] bg-white text-slate-900 flex items-center justify-center text-3xl font-black">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-teal-500/30">Active Resident</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">MRN: {patient.mrn}</span>
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">{patient.first_name} {patient.last_name}</h1>
              <p className="text-slate-400 font-medium italic opacity-80">
                {activeFacility?.name} — Room {patient.room_id || 'TBD'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 md:gap-12 border-l border-white/10 pl-12">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <p className={`text-xl font-black ${patient.is_active_monitoring ? 'text-rose-400' : 'text-emerald-400'}`}>
                {patient.is_active_monitoring ? 'Critical' : 'Stable'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Code</p>
              <p className="text-xl font-black uppercase text-amber-400">{patient.code_status}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Age</p>
              <p className="text-xl font-black">
                {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}y
              </p>
            </div>
          </div>
        </div>

        {/* Ambient background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Tabs Navigation - Hidden on Print */}
      <div className="no-print flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-3xl w-fit">
        {[
          { id: 'facesheet', icon: FileText, label: 'Facesheet' },
          { id: 'medications', icon: Pill, label: 'Medications' },
          { id: 'mar', icon: ClipboardList, label: 'MAR Grid' },
          { id: 'vitals', icon: Activity, label: 'Clinical Vitals' },
          { id: 'orders', icon: Stethoscope, label: 'Orders' },
          { id: 'charting', icon: FileText, label: 'Shift Charting' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          {activeTab === 'facesheet' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              {/* Demographics */}
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <User size={18} className="text-quro-teal" />
                  Resident Demographics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</p>
                    <p className="text-lg font-black text-slate-900">{patient.first_name} {patient.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date of Birth</p>
                    <p className="text-lg font-black text-slate-900">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gender</p>
                    <p className="text-lg font-black text-slate-900 capitalize">{patient.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SSN (Last 4)</p>
                    <p className="text-lg font-black text-slate-900">{patient.ssn_last_four || '****'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admission Date</p>
                    <p className="text-lg font-black text-slate-900">{new Date(patient.admission_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Physician</p>
                    <p className="text-lg font-black text-quro-teal">Dr. Demo Physician (Attending)</p>
                  </div>
                </div>
              </div>

              {/* Clinical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <ShieldCheck size={18} className="text-rose-500" />
                    Allergies & Alerts
                  </h3>
                  <div className="space-y-4">
                    {patient.allergies?.length ? patient.allergies.map((allergy, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-700 text-sm font-black uppercase tracking-tight">
                        <ArrowLeft size={12} className="rotate-180" />
                        {allergy}
                      </div>
                    )) : (
                      <p className="text-slate-400 italic text-sm font-medium">No known drug allergies reported (NKDA).</p>
                    )}
                  </div>
                </div>

                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <ClipboardList size={18} className="text-blue-500" />
                    Primary Diagnoses
                  </h3>
                  <div className="space-y-3">
                    {patient.diagnoses?.length ? patient.diagnoses.map((dx, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-sm font-bold text-slate-900">{dx}</span>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    )) : (
                      <p className="text-slate-400 italic text-sm font-medium">No active diagnoses documented.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Pill size={18} className="text-quro-teal" />
                    Active Medication Profile
                  </h3>
                  <span className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">
                    {medications.length} Active Prescriptions
                  </span>
                </div>

                <div className="space-y-6">
                  {medsLoading ? (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Meds...</div>
                  ) : medications.length > 0 ? medications.map((med) => (
                    <div key={med.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-quro-teal/30 transition-all group">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{med.route} • {med.frequency}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Started {new Date(med.start_date).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{med.generic_name}</h4>
                          <p className="text-sm font-bold text-slate-500 mb-4">
                            {med.strength} — {med.dosage}
                          </p>
                          <div className="flex gap-6 pt-4 border-t border-slate-200/60">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Indication</p>
                              <p className="text-xs font-bold text-slate-700">{med.indication || 'Routine care'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Psychotropic</p>
                              <p className={`text-xs font-black uppercase ${med.is_psychotropic ? 'text-rose-500' : 'text-slate-400'}`}>
                                {med.is_psychotropic ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all">
                          <Pill size={24} className="text-quro-teal opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No active medications found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              {/* Shift Sign-off Section */}
              <div className="glass-card p-10 bg-quro-forest/5 border border-quro-forest/10 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xs font-black text-quro-forest uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
                      <Clock size={18} className="text-quro-forest" />
                      Shift Medication Pass
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Sign off all medications administered or held during this shift.
                    </p>
                  </div>
                  <button 
                    onClick={handleBulkSignOff}
                    disabled={isSigningOff || medications.length === 0}
                    className="px-8 py-4 bg-quro-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-quro-forest/20 disabled:opacity-50"
                  >
                    {isSigningOff ? 'Recording...' : 'Commit Shift Sign-Off'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medications.length > 0 ? medications.map((med) => (
                    <div key={med.id} className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-slate-900">{med.generic_name}</p>
                        <p className="text-[9px] font-bold text-slate-400">{med.dosage} • {med.frequency}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSignOffActions(prev => ({ ...prev, [med.id]: 'given' }))}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                            signOffActions[med.id] === 'given' 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => setSignOffActions(prev => ({ ...prev, [med.id]: 'held' }))}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                            signOffActions[med.id] === 'held' 
                              ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 py-10 text-center bg-white/50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active medications to sign off.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <ClipboardList size={18} className="text-quro-teal" />
                  Medication Administration Record (History)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication</th>
                        <th className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                        <th className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marLoading ? (
                        <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading MAR...</td></tr>
                      ) : marEntries.length > 0 ? marEntries.map((entry) => {
                        const med = medications.find(m => m.id === entry.medication_id);
                        return (
                          <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                            <td className="py-6">
                              <p className="text-sm font-black text-slate-900">{med?.generic_name || 'Unknown Med'}</p>
                              <p className="text-[10px] font-bold text-slate-400">{med?.dosage} • {med?.route}</p>
                            </td>
                            <td className="py-6 text-center">
                              <span className="text-xs font-black text-slate-700">{entry.actual_time}</span>
                            </td>
                            <td className="py-6 text-center">
                              <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                entry.action === 'given' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {entry.action}
                              </span>
                            </td>
                            <td className="py-6 text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.administered_by?.slice(-4) || 'SYSTEM'}</span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No administrations recorded today.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
              {activeTab === 'charting' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="no-print flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Standard Shift Record (SIFF)</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Complete all mandatory assessment fields for SNF compliance.</p>
                </div>
                <button 
                  onClick={handlePrint}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Printer size={14} /> Print 2-Sided Record
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Formal Assessment Sections (Front Side) */}
                <div className="lg:col-span-12 glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Safety & Environment */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-quro-teal uppercase tracking-widest mb-6 border-b border-quro-teal/10 pb-2">I. Safety & Env</h3>
                      <div className="space-y-3">
                        {['safety_check', 'bed_rails_up', 'call_light_reach', 'alarm_functional'].map(key => (
                          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <input 
                              type="checkbox" 
                              checked={(assessments as any)[key]}
                              onChange={(e) => setAssessments(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-200 text-quro-teal focus:ring-quro-teal/20"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Systems */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6 border-b border-blue-500/10 pb-2">II. Clinical Systems</h3>
                      <div className="space-y-3">
                        {['resp_normal', 'cv_stable', 'neuro_oriented', 'gi_gu_normal', 'skin_intact'].map(key => (
                          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <input 
                              type="checkbox" 
                              checked={(assessments as any)[key]}
                              onChange={(e) => setAssessments(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-200 text-blue-500 focus:ring-blue-500/20"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Care & Intake */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 border-b border-amber-500/10 pb-2">III. Care & Intake</h3>
                      <div className="space-y-4">
                        {['pain_managed', 'adl_care', 'bm_shift'].map(key => (
                          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <input 
                              type="checkbox" 
                              checked={(assessments as any)[key]}
                              onChange={(e) => setAssessments(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-200 text-amber-500 focus:ring-amber-500/20"
                            />
                          </label>
                        ))}
                        <div className="pt-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Meal Intake %</p>
                          <select 
                            value={assessments.meal_intake}
                            onChange={(e) => setAssessments(prev => ({ ...prev, meal_intake: e.target.value as any }))}
                            className="w-full text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none"
                          >
                            <option value="0-25">0-25%</option>
                            <option value="26-50">26-50%</option>
                            <option value="51-75">51-75%</option>
                            <option value="76-100">76-100%</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Incidents & Monitoring */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-6 border-b border-rose-500/10 pb-2">IV. Monitoring</h3>
                      <div className="space-y-3">
                        {['behaviors_exhibited', 'falls_incident', 'skin_new_lesion'].map(key => (
                          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
                            <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${ (assessments as any)[key] ? 'text-rose-600' : 'text-slate-500'}`}>
                              {key.replace(/_/g, ' ')}
                            </span>
                            <input 
                              type="checkbox" 
                              checked={(assessments as any)[key]}
                              onChange={(e) => setAssessments(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-200 text-rose-500 focus:ring-rose-500/20"
                            />
                          </label>
                        ))}
                        <div className="pt-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fluids (mL)</p>
                          <input 
                            type="number"
                            value={assessments.fluids_intake}
                            onChange={(e) => setAssessments(prev => ({ ...prev, fluids_intake: parseInt(e.target.value) }))}
                            className="w-full text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Narrative Note (Back Side) */}
                <div className="lg:col-span-12 glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem] page-break">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <FileText size={18} className="text-quro-teal" />
                    Narrative Progress Note & Shift Summary
                  </h3>

                  <textarea 
                    value={narrativeNote}
                    onChange={(e) => setNarrativeNote(e.target.value)}
                    placeholder="Enter shift summary, clinical observations, and patient response to care... (NIFF/SIFF Standard Narrative)"
                    className="w-full h-80 p-8 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-quro-teal/20 transition-all mb-6 leading-relaxed"
                  />

                  <div className="flex justify-end no-print">
                    <button 
                      onClick={handleSaveCharting}
                      disabled={isSavingNote || !narrativeNote.trim()}
                      className="px-10 py-5 bg-quro-forest text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-quro-forest/20 disabled:opacity-50"
                    >
                      {isSavingNote ? 'Saving Record...' : 'Finalize & Archive Record'}
                    </button>
                  </div>
                </div>

                {/* Clinical History History (For Reference) */}
                <div className="lg:col-span-12 no-print">
                  <div className="glass-card p-10 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <Clock size={18} />
                      Archived Shift Records (SNF Compliance)
                    </h3>

                    <div className="space-y-6">
                      {notes.length > 0 ? notes.map((note) => (
                        <div key={note.id} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <span className="px-4 py-2 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {note.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {note.created_at ? (typeof note.created_at === 'string' ? new Date(note.created_at).toLocaleString() : new Date((note.created_at as any).seconds * 1000).toLocaleString()) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{note.content}</p>
                          {note.assessments && (
                            <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 md:grid-cols-4 gap-2">
                              {Object.entries(note.assessments).map(([k, v]) => v && (
                                <span key={k} className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter text-center ${
                                  k.includes('falls') || k.includes('behaviors') || k.includes('lesion') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  ✓ {k.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="py-20 text-center">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No previous shift records archived.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Sidebar Status */}
        <div className="xl:col-span-4 space-y-8 no-print">
          <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <ShieldCheck size={18} className="text-teal-600" />
              Clinical Summary
            </h3>
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dietary Order</p>
                <div className="flex items-center gap-3">
                  <Droplets size={20} className="text-blue-500" />
                  <p className="text-lg font-black text-slate-900 capitalize">{patient.diet || 'Regular'}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Next Scheduled Vital</p>
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock size={20} />
                  <p className="text-sm font-bold">Today, 02:00 PM</p>
                </div>
              </div>

              <button className="w-full py-5 bg-quro-teal text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
                Modify Treatment Plan
              </button>
            </div>
          </div>

          <div className="glass-card p-10 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden">
            <Phone className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-6">Family Contacts</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Primary Representative</p>
                <p className="text-lg font-black">Jane Thompson</p>
                <p className="text-xs font-medium text-slate-400">555-0123 • Daughter</p>
              </div>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                View All Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Only Footer */}
      <div className="print-only hidden mt-20 pt-10 border-t border-slate-200">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Document Certification</p>
            <p className="text-xs font-bold text-slate-900">Generated via Quro Clinical Platform on {new Date().toLocaleString()}</p>
            <p className="text-xs text-slate-500 italic mt-1">Official Clinical Record — Platinum Health Hub</p>
          </div>
          <div className="text-right">
            <div className="w-48 h-px bg-slate-300 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nurse / Physician Signature</p>
          </div>
        </div>
      </div>

      {/* DEDICATED PRINT VIEW (FOR 2-SIDED SIFF) */}
      <div className="print-only hidden fixed inset-0 bg-white z-[100] p-0 m-0">
        {/* Page 1: Assessment */}
        <div className="p-12 min-h-screen border-b border-dashed border-slate-200">
          <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Shift Assessment Record (SIFF-1)</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platinum Health Hub • Nursing Services</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black uppercase">{patient.last_name}, {patient.first_name}</p>
              <p className="text-[10px] font-bold text-slate-500">MRN: {patient.mrn} • RM: {patient.room_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-10">
            <div className="border border-slate-200 p-6 rounded-xl">
              <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">I. Environment & Safety</h3>
              <div className="space-y-3">
                {['safety_check', 'bed_rails_up', 'call_light_reach', 'alarm_functional'].map(k => (
                  <div key={k} className="flex justify-between text-[10px] font-bold uppercase">
                    <span>{k.replace(/_/g, ' ')}</span>
                    <span className="border border-slate-900 px-2">{(assessments as any)[k] ? 'YES' : 'NO'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 p-6 rounded-xl">
              <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">II. Clinical Systems</h3>
              <div className="space-y-3">
                {['resp_normal', 'cv_stable', 'neuro_oriented', 'gi_gu_normal', 'skin_intact'].map(k => (
                  <div key={k} className="flex justify-between text-[10px] font-bold uppercase">
                    <span>{k.replace(/_/g, ' ')}</span>
                    <span className="border border-slate-900 px-2">{(assessments as any)[k] ? 'YES' : 'NO'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 p-6 rounded-xl">
              <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">III. Care & Intake</h3>
              <div className="space-y-3">
                {['pain_managed', 'adl_care', 'bm_shift'].map(k => (
                  <div key={k} className="flex justify-between text-[10px] font-bold uppercase">
                    <span>{k.replace(/_/g, ' ')}</span>
                    <span className="border border-slate-900 px-2">{(assessments as any)[k] ? 'YES' : 'NO'}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[10px] font-bold uppercase pt-2 border-t">
                  <span>Meal Intake</span>
                  <span>{assessments.meal_intake}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-6 rounded-xl">
              <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">IV. Monitoring</h3>
              <div className="space-y-3">
                {['behaviors_exhibited', 'falls_incident', 'skin_new_lesion'].map(k => (
                  <div key={k} className="flex justify-between text-[10px] font-bold uppercase">
                    <span>{k.replace(/_/g, ' ')}</span>
                    <span className="border border-slate-900 px-2">{(assessments as any)[k] ? 'YES' : 'NO'}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[10px] font-bold uppercase pt-2 border-t">
                  <span>Fluids (mL)</span>
                  <span>{assessments.fluids_intake}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-20 flex justify-between items-end">
            <div className="text-[10px] font-bold uppercase text-slate-400">Page 1 of 2 • Assessment Data</div>
            <div className="text-right">
              <div className="w-48 h-px bg-slate-900 mb-1" />
              <p className="text-[8px] font-black uppercase tracking-widest">Sign-Off: RN / LPN / CNA</p>
            </div>
          </div>
        </div>

        {/* Page 2: Narrative */}
        <div className="p-12 min-h-screen page-break">
          <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Shift Narrative Record (SIFF-2)</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platinum Health Hub • Clinical Documentation</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black uppercase">{patient.last_name}, {patient.first_name}</p>
              <p className="text-[10px] font-bold text-slate-500">MRN: {patient.mrn} • Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border border-slate-200 p-10 rounded-xl min-h-[600px] leading-relaxed text-sm font-medium">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Shift Narrative / Progress Notes</p>
            {narrativeNote || 'No narrative documentation provided for this shift period.'}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-12">
            <div className="border border-slate-100 p-6 rounded-xl bg-slate-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Verification Check</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                  <div className="w-3 h-3 border border-slate-900" /> All orders reviewed
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                  <div className="w-3 h-3 border border-slate-900" /> MAR reconciled
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                  <div className="w-3 h-3 border border-slate-900" /> Care plan updated
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-end items-end">
              <div className="w-64 h-px bg-slate-900 mb-1" />
              <p className="text-[8px] font-black uppercase tracking-widest">Authorized Clinical Signature</p>
              <p className="text-[8px] font-bold text-slate-400 mt-1">Date: {new Date().toLocaleDateString()} Time: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="mt-auto pt-10 text-[10px] font-bold uppercase text-slate-400">Page 2 of 2 • Narrative & Sign-Off</div>
        </div>
      </div>
    </div>
  );
}

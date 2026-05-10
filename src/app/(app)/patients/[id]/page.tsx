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
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useHandover } from '@/hooks/useHandover';
import { useNotes } from '@/hooks/useNotes';
import { useVitals } from '@/hooks/useVitals';
import { useAuth } from '@/contexts/AuthContext';
import VitalsTrendChart from '@/components/clinical/VitalsTrendChart';

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeFacility } = useAuth();
  const { patient, loading: patientLoading, error } = usePatient(id);
  const { medications, loading: medsLoading } = useMedications(id);
  const { entries: marEntries, loading: marLoading, bulkLogAdministrations } = useMAR(id);
  const { createNote } = useHandover();
  const { notes, saveNote, updateNote } = useNotes(id);
  const { vitals } = useVitals(id);
  const { staff } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'facesheet' | 'medications' | 'mar' | 'vitals' | 'orders' | 'charting' | 'trends'>('facesheet');
  const [signOffActions, setSignOffActions] = useState<Record<string, 'given' | 'held'>>({});
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Charting State
  const [chartingSide, setChartingSide] = useState<'front' | 'back'>('front');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [narrativeNote, setNarrativeNote] = useState('');
  const [noteFocus, setNoteFocus] = useState('Routine Shift Note');
  const [assessments, setAssessments] = useState({
    vitals: { temp: 98.6, pulse: 72, resp: 18, bp_systolic: 120, bp_diastolic: 80, bp_site: 'L-Arm', bp_position: 'Sitting', spo2: 98, weight: 165 },
    io: { fluids_in_ml: 240, voiding_count: 1, bm_count: 0, bristol_scale: 4 },
    care: { oral_care: true, peri_care: true, bathing: 'N/A', meal_percent: 75 },
    systems: { resp_sounds: 'Clear', o2_method: 'Room Air', o2_flow: 0, edema: 'None', pulses_present: true, pain_level: 0, pain_location: '', skin_intact: true, neuro_mood: 'Alert & Oriented', skin_status: 'Intact' },
    safety: { safety_check: true, bed_rails_up: true, call_light_reach: true, alarm_active: true }
  });

  const macros = [
    { label: "Resting", text: "Resident resting in bed with eyes closed, respirations even and unlabored. Call light in reach." },
    { label: "Alert/Oriented", text: "Resident alert and oriented to person, place, and time. No signs of acute distress noted." },
    { label: "Meal/Med", text: "Resident tolerated meal and medications well. Denies any pain or discomfort at this time." },
    { label: "Safety Round", text: "Safety rounds completed. Resident in bed with side rails up x2. Call light within reach. Environment clear of hazards." }
  ];

  const applyMacro = (text: string) => {
    setNarrativeNote(prev => prev ? `${prev}\n${text}` : text);
  };

  // Initialize sign-off actions when meds load
  React.useEffect(() => {
    if (medications.length > 0) {
      const initialActions: Record<string, 'given' | 'held'> = {};
      medications.forEach(m => {
        initialActions[m.id] = 'given';
      });
      setSignOffActions(initialActions);
    }
  }, [medications]);

  // Load Draft if it exists
  React.useEffect(() => {
    if (notes.length > 0 && staff) {
      const draft = notes.find(n => n.status === 'DRAFT' && n.authored_by === staff.id);
      if (draft) {
        setCurrentDraftId(draft.id);
        setNarrativeNote(draft.content || '');
        if (draft.assessments) {
          setAssessments(draft.assessments as any);
        }
      }
    }
  }, [notes, staff]);

  const handleMarkAllGiven = () => {
    const allGiven: Record<string, 'given' | 'held'> = {};
    medications.forEach(m => {
      allGiven[m.id] = 'given';
    });
    setSignOffActions(allGiven);
  };

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
          general_notes: `MEDICATION ALERT: The following medications were HELD during this shift pass: ${medNames}. Please review chart for clinical rationale.`,
          priority: 'high',
          status: 'active',
          shift: 'day', // Defaulting for auto-notes
          shift_date: new Date().toISOString(),
          is_urgent: true
        } as any);
      }

      alert('Shift Medication Pass recorded successfully. Any HELD medications have been flagged for Handoff.');
    } catch (err) {
      console.error('Sign off failed:', err);
      alert('Failed to record medication pass.');
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleSaveCharting = async (isDraft: boolean = false) => {
    if (isSavingNote) return;
    setIsSavingNote(true);
    try {
      const noteData = {
        type: 'shift_assessment' as const,
        content: narrativeNote,
        assessments: assessments,
        status: (isDraft ? 'DRAFT' : 'SIGNED') as 'DRAFT' | 'SIGNED'
      };

      if (currentDraftId) {
        await updateNote(currentDraftId, noteData);
      } else {
        const newNote = await saveNote(noteData as any);
        if (isDraft) setCurrentDraftId(newNote.id);
      }

      if (!isDraft) {
        setNarrativeNote('');
        setCurrentDraftId(null);
        alert('Shift charting signed and committed to record.');
      } else {
        alert('Draft saved successfully.');
      }
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
          { id: 'trends', icon: TrendingUp, label: 'Trends' },
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
                  <div className="flex gap-4">
                    <button 
                      onClick={handleMarkAllGiven}
                      className="px-6 py-4 bg-white border border-quro-forest/20 text-quro-forest rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-quro-forest/5 transition-all"
                    >
                      Mark All Given
                    </button>
                    <button 
                      onClick={handleBulkSignOff}
                      disabled={isSigningOff || medications.length === 0}
                      className="px-8 py-4 bg-quro-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-quro-forest/20 disabled:opacity-50"
                    >
                      {isSigningOff ? 'Recording...' : 'Commit Shift Sign-Off'}
                    </button>
                  </div>
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
          )}

          {activeTab === 'trends' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <VitalsTrendChart vitals={vitals} />
            </div>
          )}

          {activeTab === 'charting' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              {/* Split-View Toggle */}
              <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button 
                    onClick={() => setChartingSide('front')}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chartingSide === 'front' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Assessment (Front)
                  </button>
                  <button 
                    onClick={() => setChartingSide('back')}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chartingSide === 'back' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Narrative (Back)
                  </button>
                </div>
                
                <button 
                  onClick={handlePrint}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20"
                >
                  <Printer size={16} /> Print Gold-Standard SIFF
                </button>
              </div>

              {chartingSide === 'front' ? (
                /* SIDE 1: THE CLICK PAGE */
                <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4">
                  <div className="lg:col-span-8 space-y-8">
                    {/* Vitals Grid */}
                    <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <Activity size={18} className="text-rose-500" />
                        I. Vitals & I/O Tracking
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Temp (°F)</p>
                          <input type="number" value={assessments.vitals.temp} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, temp: parseFloat(e.target.value)}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pulse</p>
                          <input type="number" value={assessments.vitals.pulse} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, pulse: parseInt(e.target.value)}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Resp</p>
                          <input type="number" value={assessments.vitals.resp} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, resp: parseInt(e.target.value)}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">SpO2 (%)</p>
                          <input type="number" value={assessments.vitals.spo2} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, spo2: parseInt(e.target.value)}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Blood Pressure (Sys/Dia)</p>
                          <div className="flex gap-2">
                            <input type="number" placeholder="120" value={assessments.vitals.bp_systolic} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_systolic: parseInt(e.target.value)}})} className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                            <span className="text-2xl text-slate-300">/</span>
                            <input type="number" placeholder="80" value={assessments.vitals.bp_diastolic} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_diastolic: parseInt(e.target.value)}})} className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                          </div>
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Site</p>
                            <select value={assessments.vitals.bp_site} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_site: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-xs text-slate-900 outline-none">
                              <option value="L-Arm">L-Arm</option>
                              <option value="R-Arm">R-Arm</option>
                              <option value="Thigh">Thigh</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Position</p>
                            <select value={assessments.vitals.bp_position} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_position: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-xs text-slate-900 outline-none">
                              <option value="Sitting">Sitting</option>
                              <option value="Standing">Standing</option>
                              <option value="Lying">Lying</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Weight (Lbs)</p>
                            <input type="number" value={assessments.vitals.weight} onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, weight: parseFloat(e.target.value)}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-lg text-slate-900 outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ADL & Care Tracking */}
                    <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <Heart size={18} className="text-teal-500" />
                        II. ADL & Hygiene Care
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          {['oral_care', 'peri_care'].map(key => (
                            <label key={key} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{key.replace(/_/g, ' ')} Completed</span>
                              <input type="checkbox" checked={(assessments.care as any)[key]} onChange={e => setAssessments({...assessments, care: {...assessments.care, [key]: e.target.checked}})} className="w-5 h-5 rounded border-slate-300 text-quro-teal" />
                            </label>
                          ))}
                        </div>
                        <div className="space-y-6">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Meal Intake %</p>
                            <div className="flex gap-2">
                              {[0, 25, 50, 75, 100].map(val => (
                                <button key={val} onClick={() => setAssessments({...assessments, care: {...assessments.care, meal_percent: val as any}})} className={`flex-1 py-3 rounded-xl font-black text-[10px] border transition-all ${assessments.care.meal_percent === val ? 'bg-quro-teal text-white border-quro-teal' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                                  {val}%
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bathing/Shower</p>
                            <select value={assessments.care.bathing} onChange={e => setAssessments({...assessments, care: {...assessments.care, bathing: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-xs text-slate-900 outline-none">
                              <option value="N/A">Not Scheduled</option>
                              <option value="Completed">Completed</option>
                              <option value="Refused">Refused</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                    {/* Safety Checklist */}
                    <div className="glass-card p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl shadow-slate-900/20">
                      <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">III. Safety Rounds</h3>
                      <div className="space-y-4">
                        {['safety_check', 'bed_rails_up', 'call_light_reach', 'alarm_active'].map(key => (
                          <label key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">{key.replace(/_/g, ' ')}</span>
                            <input type="checkbox" checked={(assessments.safety as any)[key]} onChange={e => setAssessments({...assessments, safety: {...assessments.safety, [key]: e.target.checked}})} className="w-4 h-4 rounded border-white/20 text-teal-400 bg-transparent" />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Quick Physical Sync */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem]">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">IV. Physical Sync</h3>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lung Sounds</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['Clear', 'Wheezing', 'Crackles', 'Diminished'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, systems: {...assessments.systems, resp_sounds: val as any}})} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.systems.resp_sounds === val ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Edema (Lower Ext)</p>
                          <div className="flex gap-1">
                            {['None', '1+', '2+', '3+', '4+'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, systems: {...assessments.systems, edema: val as any}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.systems.edema === val ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                           <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Skin Status</span>
                           <select value={assessments.systems.skin_status} onChange={e => setAssessments({...assessments, systems: {...assessments.systems, skin_status: e.target.value}})} className="bg-transparent font-black text-[9px] uppercase outline-none text-rose-700">
                              <option>Intact</option>
                              <option>Redness</option>
                              <option>Stage I</option>
                              <option>Stage II</option>
                              <option>Bruising</option>
                              <option>Laceration</option>
                           </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Neuro / Mood</p>
                          <select value={assessments.systems.neuro_mood} onChange={e => setAssessments({...assessments, systems: {...assessments.systems, neuro_mood: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none text-slate-900">
                            <option>Alert & Oriented</option>
                            <option>Confused/Disoriented</option>
                            <option>Lethargic/Somnolent</option>
                            <option>Agitated/Restless</option>
                            <option>Combative</option>
                            <option>Depressed/Withdrawn</option>
                          </select>
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SIDE 2: THE NARRATIVE PAGE */
                <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-4">
                  <div className="lg:col-span-8 space-y-8">
                    <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-2">Clinical Narrative Progress Note</h3>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Document the clinical story of the shift (DAR/SOAP Format).</p>
                        </div>
                        <select 
                          value={noteFocus} 
                          onChange={e => setNoteFocus(e.target.value)}
                          className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none text-quro-teal"
                        >
                          <option>Routine Shift Note</option>
                          <option>Change in Condition</option>
                          <option>Fall/Incident Report</option>
                          <option>Physician Notification</option>
                          <option>Family Update</option>
                          <option>Weekly Summary</option>
                        </select>
                      </div>

                      <div className="mb-6 flex flex-wrap gap-2">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest self-center mr-2">Quick Macros:</span>
                        {macros.map((m, i) => (
                          <button key={i} onClick={() => applyMacro(m.text)} className="px-4 py-2 bg-slate-50 hover:bg-quro-teal/10 hover:text-quro-teal text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100 transition-all">
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <textarea 
                        value={narrativeNote}
                        onChange={(e) => setNarrativeNote(e.target.value)}
                        placeholder="Write your clinical note here... Use macros for rapid entry."
                        className="w-full h-[500px] p-8 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-quro-teal/20 transition-all mb-6 leading-relaxed"
                      />

                      <div className="flex justify-end gap-4">
                        <button 
                          onClick={() => handleSaveCharting(true)}
                          disabled={isSavingNote || !narrativeNote.trim()}
                          className="px-8 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3"
                        >
                          {isSavingNote ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button 
                          onClick={() => handleSaveCharting(false)}
                          disabled={isSavingNote || !narrativeNote.trim()}
                          className="px-12 py-5 bg-quro-forest text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-quro-forest/20 disabled:opacity-50 flex items-center gap-3"
                        >
                          {isSavingNote ? 'Archiving...' : 'Finalize & Sign Record'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                     <div className="glass-card p-8 bg-slate-50 border border-slate-100 rounded-[2rem]">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Note Guidelines</h3>
                        <div className="space-y-4">
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-quro-teal uppercase tracking-widest mb-1">Data</p>
                              <p className="text-[10px] text-slate-500 font-medium">Objective observations and clinical facts.</p>
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Action</p>
                              <p className="text-[10px] text-slate-500 font-medium">Nursing interventions performed.</p>
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Response</p>
                              <p className="text-[10px] text-slate-500 font-medium">Patient reaction and effectiveness of care.</p>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              )}
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

      {/* DEDICATED PRINT VIEW (FOR 2-SIDED SIFF/SNF) */}
      <div className="print-only hidden fixed inset-0 bg-white z-[100] p-0 m-0">
        {/* Page 1: Assessment (Front Side) */}
        <div className="p-10 min-h-screen border-b-8 border-slate-900 bg-white">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black">Q</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Shift Assessment Record (SIFF-1)</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platinum Health Hub • Clinical Record</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black uppercase">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-[10px] font-bold text-slate-500">MRN: {patient?.mrn} • RM: {patient?.room_id}</p>
              <p className="text-[10px] font-black text-quro-teal uppercase tracking-widest mt-1">Shift Start: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8">
            {/* Vitals & I/O */}
            <div className="border-2 border-slate-200 p-6 rounded-xl">
              <h3 className="text-[10px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between">
                I. Vitals & I/O Tracking <span>Shift Pass: {new Date().toLocaleDateString()}</span>
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Temperature</p>
                  <p className="text-xs font-black">{assessments.vitals.temp}°F</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Pulse / Resp</p>
                  <p className="text-xs font-black">{assessments.vitals.pulse} bpm / {assessments.vitals.resp} rr</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Blood Pressure</p>
                  <p className="text-xs font-black">{assessments.vitals.bp_systolic}/{assessments.vitals.bp_diastolic} <span className="text-[8px] text-slate-400">({assessments.vitals.bp_position[0]}/{assessments.vitals.bp_site})</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">SpO2 / Weight</p>
                  <p className="text-xs font-black">{assessments.vitals.spo2}% / {assessments.vitals.weight} Lbs</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-slate-100 flex justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Fluids In (mL)</p>
                  <p className="text-xs font-black">{assessments.io.fluids_in_ml} mL</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Bowel / Void</p>
                  <p className="text-xs font-black">{assessments.io.bm_count} BM <span className="text-[8px] font-medium">(B{assessments.io.bristol_scale})</span> / {assessments.io.voiding_count} Void</p>
                </div>
              </div>
            </div>

            {/* Care & Nutrition */}
            <div className="border-2 border-slate-200 p-6 rounded-xl">
              <h3 className="text-[10px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2">II. ADL & Hygiene Care</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Oral Care Completed</span>
                  <span className="font-black">{assessments.care.oral_care ? '✓ COMPLETED' : '—'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Peri-Care Completed</span>
                  <span className="font-black">{assessments.care.peri_care ? '✓ COMPLETED' : '—'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Bathing / Shower</span>
                  <span className="font-black uppercase">{assessments.care.bathing}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold pt-4 border-t border-slate-100">
                  <span>Meal Consumption</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900" style={{ width: `${assessments.care.meal_percent}%` }} />
                    </div>
                    <span className="font-black text-xs">{assessments.care.meal_percent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Assessment */}
            <div className="border-2 border-slate-200 p-6 rounded-xl">
              <h3 className="text-[10px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2">III. Physical Assessment</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Respiratory Sounds</p>
                  <p className="text-xs font-black uppercase">{assessments.systems.resp_sounds}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Neuro / Mood</p>
                  <p className="text-xs font-black uppercase">{assessments.systems.neuro_mood}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Skin Status</p>
                  <p className="text-xs font-black uppercase">{assessments.systems.skin_status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Pain Level (0-10)</p>
                  <p className="text-xs font-black">{assessments.systems.pain_level} / 10 <span className="text-[8px] font-medium text-slate-400">{assessments.systems.pain_location}</span></p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-[9px] font-bold">
                  <span>Edema (Lower Ext)</span>
                  <span className="font-black">{assessments.systems.edema}</span>
                </div>
              </div>
            </div>

            {/* Safety Verification */}
            <div className="border-2 border-slate-900 p-6 rounded-xl bg-slate-50">
              <h3 className="text-[10px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2">IV. Safety & Monitoring</h3>
              <div className="space-y-3">
                {Object.entries(assessments.safety).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[9px] font-black uppercase tracking-tight">
                    <span>{k.replace(/_/g, ' ')} verified</span>
                    <span className="px-2 py-0.5 border-2 border-slate-900 font-black">{v ? '✓' : ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-20 pt-10 flex justify-between items-end border-t-2 border-slate-200">
            <div className="text-[9px] font-bold uppercase text-slate-400">
              Quro Clinical Engine v4.2 • Platinum Edition • Page 1 of 2 (Front)
            </div>
            <div className="text-right">
              <div className="w-64 h-px bg-slate-900 mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest">Licensed Nurse Signature & Credentials</p>
            </div>
          </div>
        </div>

        {/* Page 2: Narrative (Back Side) */}
        <div className="p-10 min-h-screen page-break-before-always bg-white">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black">Q</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Shift Narrative Record (SIFF-2)</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platinum Health Hub • Narrative Progress Notes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black uppercase">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-[10px] font-bold text-slate-500">Date: {new Date().toLocaleDateString()} • Shift Pass: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="border-4 border-slate-900 p-10 rounded-2xl min-h-[800px] relative">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 absolute top-4 left-4">Clinical Narrative Log (DAR/SOAP)</p>
            <div className="text-sm font-medium leading-[2] text-slate-900 whitespace-pre-wrap mt-8">
              <span className="font-black uppercase text-[10px] bg-slate-100 px-2 py-1 rounded mr-2">{noteFocus}:</span>
              {narrativeNote || 'No narrative documentation provided for this shift. Resident was monitored per care plan with no acute changes noted.'}
            </div>
            
            {/* Lined paper effect for handwritten notes/backup */}
            {!narrativeNote && (
              <div className="mt-8 space-y-8 opacity-10">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="h-px bg-slate-900 w-full" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-8">
            <div className="col-span-2 border-2 border-slate-200 p-6 rounded-xl bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 pb-2">Shift Intervention Summary</p>
              <div className="grid grid-cols-2 gap-y-3">
                <div className="flex items-center gap-3 text-[9px] font-black uppercase"><div className="w-4 h-4 border-2 border-slate-900" /> Medications Administered</div>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase"><div className="w-4 h-4 border-2 border-slate-900" /> Treatments Completed</div>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase"><div className="w-4 h-4 border-2 border-slate-900" /> Physician Notified</div>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase"><div className="w-4 h-4 border-2 border-slate-900" /> Family Notified</div>
              </div>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-2">Authenticated By</p>
              <p className="text-xs font-black uppercase">{staff?.first_name} {staff?.last_name}, RN</p>
              <div className="w-full h-0.5 bg-slate-900 mt-2" />
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Electronic Record ID: {patient?.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="mt-auto pt-10 text-[9px] font-bold uppercase text-slate-400 text-center">
            Platinum Health Hub • Clinical Record • Side 2 of 2 (Back)
          </div>
        </div>
      </div>
    </div>
  );
}

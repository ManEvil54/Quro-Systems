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
  TrendingUp,
  Brain,
  Wind,
  Apple,
  Eye,
  Zap,
  Move,
  Thermometer,
  Volume2,
  Ear,
  EyeOff,
  Heart,
  Droplets,
  Stethoscope,
  Check,
  X,
  AlertCircle,
  Phone
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
    vitals: { 
      temp: 98.6, pulse: 72, resp: 18, bp_systolic: 120, bp_diastolic: 80, 
      bp_site: 'L-Arm' as "L-Arm" | "R-Arm" | "Thigh", 
      bp_position: 'Sitting' as "Sitting" | "Standing" | "Supine", 
      spo2: 98, weight: 165 
    },
    neuro: { 
      orientation: 'A&O x 4',
      loc: 'Alert',
      speech: 'Clear',
      pupils: 'PERRLA' 
    },
    resp: { 
      pattern: 'Even/Unlabored',
      sounds: 'Clear',
      sounds_location: 'Bilateral',
      cough: 'None',
      oxygen: 'Room Air',
      o2_flow: 0
    },
    cardio: { 
      rhythm: 'Regular',
      edema: 'None',
      edema_location: 'Pedal',
      pulses: 'Strong',
      cap_refill: '< 3s'
    },
    gi: { 
      appetite: 'Good (75-100%)',
      abdomen: 'Soft',
      bowel_sounds: 'Present',
      last_bm: new Date().toISOString().split('T')[0],
      stool_bristol: 4,
      diet_type: 'Regular',
      fluids_in_ml: 240
    },
    gu: { 
      voiding: 'Continent',
      catheter: 'None',
      urine_appearance: 'Clear',
      voiding_count: 1
    },
    skin: { 
      condition: 'Intact',
      integrity: 'No Redness',
      devices: [] as string[],
      pressure_ulcers: false
    },
    pain: { 
      level: 0, 
      location: '', 
      type: 'None',
      non_verbal: [] as string[]
    },
    adl: { 
      mobility: 'Independent',
      transfer: 'Independent',
      safety_checks: ['Bed Lowest', 'Call Light']
    }
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
        await updateNote(currentDraftId, noteData as any);
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
                /* SIDE 1: THE CLICK PAGE (SNF GOLD STANDARD) */
                  <div className="no-print space-y-10 animate-in slide-in-from-right-4">
                    {/* Vitals Summary Strip (Interactive Charting) */}
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 border border-white/5">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400">
                        <Activity size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vital Signs Charting</p>
                        <h2 className="text-lg font-black uppercase tracking-tighter">Current Shift Assessment</h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Temperature</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.1"
                            value={assessments.vitals.temp} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, temp: parseFloat(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                          <span className="text-slate-500 font-black">°F</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">B/P (Sys/Dia)</p>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={assessments.vitals.bp_systolic} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_systolic: parseInt(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                          <span className="text-slate-500 font-black">/</span>
                          <input 
                            type="number" 
                            value={assessments.vitals.bp_diastolic} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_diastolic: parseInt(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pulse / Resp</p>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={assessments.vitals.pulse} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, pulse: parseInt(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                          <span className="text-slate-500 font-black">/</span>
                          <input 
                            type="number" 
                            value={assessments.vitals.resp} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, resp: parseInt(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SpO2</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={assessments.vitals.spo2} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, spo2: parseInt(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-lg outline-none focus:border-rose-500/50 transition-all"
                          />
                          <span className="text-slate-500 font-black">%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BP Site</p>
                        <select 
                          value={assessments.vitals.bp_site} 
                          onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_site: e.target.value as any}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-[10px] uppercase outline-none focus:border-rose-500/50 transition-all"
                        >
                          <option className="bg-slate-900">L-Arm</option>
                          <option className="bg-slate-900">R-Arm</option>
                          <option className="bg-slate-900">Thigh</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BP Position</p>
                        <select 
                          value={assessments.vitals.bp_position} 
                          onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_position: e.target.value as any}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-[10px] uppercase outline-none focus:border-rose-500/50 transition-all"
                        >
                          <option className="bg-slate-900">Sitting</option>
                          <option className="bg-slate-900">Standing</option>
                          <option className="bg-slate-900">Supine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {/* 1. Neurological & Mental Status */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <Brain size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">I. Neurological</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Orientation (A&O)</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['A&O x 1', 'A&O x 2', 'A&O x 3', 'A&O x 4'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, neuro: {...assessments.neuro, orientation: val}})} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.neuro.orientation === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">LOC</p>
                            <select value={assessments.neuro.loc} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, loc: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Alert</option>
                              <option>Lethargic</option>
                              <option>Obtunded</option>
                              <option>Comatose</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Speech</p>
                            <select value={assessments.neuro.speech} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, speech: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Clear</option>
                              <option>Slurred</option>
                              <option>Aphasic</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Respiratory System */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Wind size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">II. Respiratory</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Breathing Pattern</p>
                          <select value={assessments.resp.pattern} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, pattern: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                            <option>Even/Unlabored</option>
                            <option>Labored</option>
                            <option>Shallow</option>
                            <option>SOB at rest</option>
                            <option>SOB on exertion</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Breath Sounds</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['Clear', 'Wheezing', 'Crackles', 'Diminished'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, resp: {...assessments.resp, sounds: val}})} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.resp.sounds === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                              <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Oxygen</p>
                              <select value={assessments.resp.oxygen} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, oxygen: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
                                <option>Room Air</option>
                                <option>NC</option>
                                <option>CPAP/BiPAP</option>
                              </select>
                           </div>
                           <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                              <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Flow (LPM)</p>
                              <input type="number" value={assessments.resp.o2_flow} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, o2_flow: parseInt(e.target.value)}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none" />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Cardiovascular System */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <Heart size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">III. Cardiovascular</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rhythm</p>
                            <button onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, rhythm: assessments.cardio.rhythm === 'Regular' ? 'Irregular' : 'Regular'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cardio.rhythm === 'Regular' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {assessments.cardio.rhythm}
                            </button>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cap Refill</p>
                            <button onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, cap_refill: assessments.cardio.cap_refill === '< 3s' ? '> 3s' : '< 3s'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cardio.cap_refill === '< 3s' ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {assessments.cardio.cap_refill}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Edema Tracking</p>
                          <div className="flex gap-1">
                            {['None', '1+', '2+', '3+', '4+'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, edema: val}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.cardio.edema === val ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Pulses (Radial/Pedal)</p>
                          <select value={assessments.cardio.pulses} onChange={e => setAssessments({...assessments, cardio: {...assessments.cardio, pulses: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
                            <option>Strong</option>
                            <option>Weak</option>
                            <option>Absent</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 4. Gastrointestinal (GI) & Nutrition */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                          <Apple size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">IV. GI & Nutrition</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Appetite / Intake</p>
                          <div className="flex gap-2">
                            {['Poor', 'Fair', 'Good'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, gi: {...assessments.gi, appetite: val}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gi.appetite.includes(val) ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Abdomen</p>
                            <select value={assessments.gi.abdomen} onChange={e => setAssessments({...assessments, gi: {...assessments.gi, abdomen: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Soft</option>
                              <option>Firm</option>
                              <option>Distended</option>
                              <option>Tender</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bowel Sounds</p>
                            <select value={assessments.gi.bowel_sounds} onChange={e => setAssessments({...assessments, gi: {...assessments.gi, bowel_sounds: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Present</option>
                              <option>Hyperactive</option>
                              <option>Hypoactive</option>
                              <option>Absent</option>
                            </select>
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50/30 rounded-xl border border-orange-100">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[8px] font-black text-orange-600 uppercase">Bristol Stool Scale</p>
                            <span className="text-[10px] font-black text-orange-700">Type {assessments.gi.stool_bristol}</span>
                          </div>
                          <input type="range" min="1" max="7" step="1" value={assessments.gi.stool_bristol} onChange={e => setAssessments({...assessments, gi: {...assessments.gi, stool_bristol: parseInt(e.target.value)}})} className="w-full accent-orange-500" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fluid Intake (mL)</p>
                          <input 
                            type="number" 
                            value={assessments.gi.fluids_in_ml} 
                            onChange={e => setAssessments({...assessments, gi: {...assessments.gi, fluids_in_ml: parseInt(e.target.value)}})}
                            className="w-24 bg-white border border-slate-200 rounded-lg p-2 font-black text-xs text-right outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. Genitourinary (GU) */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                          <Droplets size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">V. Genitourinary</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Voiding Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['Continent', 'Incontinent', 'Occasional'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, gu: {...assessments.gu, voiding: val}})} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gu.voiding === val ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Device</p>
                            <select value={assessments.gu.catheter} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, catheter: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>None</option>
                              <option>Foley</option>
                              <option>Texas</option>
                              <option>Suprapubic</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Urine</p>
                            <select value={assessments.gu.urine_appearance} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, urine_appearance: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Clear</option>
                              <option>Cloudy</option>
                              <option>Sediment</option>
                              <option>Hematuria</option>
                            </select>
                          </div>
                        </div>
                        <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-cyan-600 uppercase">Void Count (Shift)</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setAssessments({...assessments, gu: {...assessments.gu, voiding_count: Math.max(0, assessments.gu.voiding_count - 1)}})} className="w-6 h-6 rounded-full bg-white border border-cyan-200 flex items-center justify-center font-black">-</button>
                            <span className="font-black text-xs">{assessments.gu.voiding_count}</span>
                            <button onClick={() => setAssessments({...assessments, gu: {...assessments.gu, voiding_count: assessments.gu.voiding_count + 1}})} className="w-6 h-6 rounded-full bg-white border border-cyan-200 flex items-center justify-center font-black">+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. Integumentary (Skin) */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                          <Stethoscope size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">VI. Integumentary</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Condition</p>
                          <select value={assessments.skin.condition} onChange={e => setAssessments({...assessments, skin: {...assessments.skin, condition: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                            <option>Intact</option>
                            <option>Dry</option>
                            <option>Diaphoretic</option>
                            <option>Clammy</option>
                          </select>
                        </div>
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                          <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-3">Integrity Check</p>
                          <div className="space-y-2">
                            {['No Redness', 'Redness noted', 'Wound/Ulcer'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, skin: {...assessments.skin, integrity: val}})} className={`w-full py-2 px-4 rounded-lg text-left text-[9px] font-black border transition-all flex items-center justify-between ${assessments.skin.integrity === val ? 'bg-white text-rose-600 border-rose-200 shadow-sm' : 'bg-rose-500/5 text-rose-400 border-transparent'}`}>
                                {val}
                                {assessments.skin.integrity === val && <Check size={12} />}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pressure Ulcers Present</p>
                          <button 
                            onClick={() => setAssessments({...assessments, skin: {...assessments.skin, pressure_ulcers: !assessments.skin.pressure_ulcers}})}
                            className={`w-12 h-6 rounded-full transition-all relative ${assessments.skin.pressure_ulcers ? 'bg-rose-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${assessments.skin.pressure_ulcers ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 7. Pain Assessment */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <Volume2 size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">VII. Pain Assessment</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pain Level (0-10)</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${assessments.pain.level > 5 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{assessments.pain.level}</span>
                        </div>
                        <input type="range" min="0" max="10" step="1" value={assessments.pain.level} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, level: parseInt(e.target.value)}})} className="w-full accent-rose-500 mb-4" />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
                            <input type="text" placeholder="e.g. Back" value={assessments.pain.location} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, location: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] outline-none" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Type</p>
                            <select value={assessments.pain.type} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, type: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>None</option>
                              <option>Aching</option>
                              <option>Sharp</option>
                              <option>Burning</option>
                              <option>Throbbing</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Non-Verbal Cues</p>
                          <div className="flex flex-wrap gap-2">
                            {['Grimacing', 'Moaning', 'Guarding'].map(cue => (
                              <button key={cue} onClick={() => {
                                const newCues = assessments.pain.non_verbal.includes(cue) 
                                  ? assessments.pain.non_verbal.filter(c => c !== cue)
                                  : [...assessments.pain.non_verbal, cue];
                                setAssessments({...assessments, pain: {...assessments.pain, non_verbal: newCues}});
                              }} className={`px-3 py-1 rounded-full text-[8px] font-black border transition-all ${assessments.pain.non_verbal.includes(cue) ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {cue}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 8. ADL & Safety */}
                    <div className="glass-card p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl shadow-slate-900/40 border border-white/5">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-teal-400">
                          <ShieldCheck size={20} />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-teal-400">VIII. ADL & Safety</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Mobility</p>
                            <select value={assessments.adl.mobility} onChange={e => setAssessments({...assessments, adl: {...assessments.adl, mobility: e.target.value}})} className="w-full bg-white/5 border border-white/10 p-2 rounded-lg font-black text-[9px] uppercase outline-none text-white">
                              <option className="bg-slate-900">Independent</option>
                              <option className="bg-slate-900">Bedrest</option>
                              <option className="bg-slate-900">Assist of 1</option>
                              <option className="bg-slate-900">Assist of 2</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transfer</p>
                            <select value={assessments.adl.transfer} onChange={e => setAssessments({...assessments, adl: {...assessments.adl, transfer: e.target.value}})} className="w-full bg-white/5 border border-white/10 p-2 rounded-lg font-black text-[9px] uppercase outline-none text-white">
                              <option className="bg-slate-900">Independent</option>
                              <option className="bg-slate-900">Pivot</option>
                              <option className="bg-slate-900">Hoyer</option>
                              <option className="bg-slate-900">Sit-to-Stand</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Safety Rounds</p>
                           {['Bed Lowest', 'Call Light', 'Side Rails Up', 'Non-skid socks'].map(check => (
                             <label key={check} className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                               <span className="text-[9px] font-black uppercase text-slate-300">{check}</span>
                               <input type="checkbox" checked={assessments.adl.safety_checks.includes(check)} onChange={e => {
                                 const newChecks = e.target.checked 
                                   ? [...assessments.adl.safety_checks, check]
                                   : assessments.adl.safety_checks.filter(c => c !== check);
                                 setAssessments({...assessments, adl: {...assessments.adl, safety_checks: newChecks}});
                               }} className="w-4 h-4 rounded border-white/20 text-teal-400 bg-transparent" />
                             </label>
                           ))}
                        </div>
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
        <div className="p-12 min-h-screen border-b-8 border-slate-900 bg-white flex flex-col">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">Q</div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Clinical Assessment Record</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Platinum Health Hub • Shift Certification (Side A)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MRN: {patient?.mrn} • Room: {patient?.room_id}</p>
              <p className="text-xs font-black text-quro-teal uppercase tracking-widest mt-1">Date: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-grow">
            {/* System I: Neuro */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                I. Neurological & Mental Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Orientation</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">A&O X {assessments.neuro.orientation}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Level of Consciousness</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.neuro.loc}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Speech Pattern</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.neuro.speech}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pupils (PERRLA)</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.neuro.pupils}</p>
                </div>
              </div>
            </div>

            {/* System II: Respiratory */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                II. Respiratory System
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Breathing Pattern</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.pattern}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Breath Sounds</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.sounds}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Oxygen Delivery</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.oxygen}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cough Type</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.cough}</p>
                </div>
              </div>
            </div>

            {/* System III: Cardiovascular */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                III. Cardiovascular System
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Heart Rhythm</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.rhythm}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pulses (Radial/Pedal)</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.pulses}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Edema (Location/Grade)</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.edema} {assessments.cardio.edema_location}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Capillary Refill</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.cap_refill}</p>
                </div>
              </div>
            </div>

            {/* System IV: GI & Nutrition */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                IV. GI & Nutritional Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Appetite</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gi.appetite}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bowel Sounds</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gi.bowel_sounds}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Abdomen Assessment</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gi.abdomen}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Latest Stool (Bristol)</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">Bristol Type {assessments.gi.stool_bristol}</p>
                </div>
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shift Fluid Intake</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gi.fluids_in_ml} mL</p>
                </div>
              </div>
            </div>

            {/* System V: Genitourinary */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                V. Genitourinary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Voiding Status</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gu.voiding}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Catheter / Device</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gu.catheter}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Urine Characteristics</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.gu.urine_appearance}</p>
                </div>
              </div>
            </div>

            {/* System VI: Integumentary */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                VI. Integumentary (Skin)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Skin Condition</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.skin.condition}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Skin Integrity</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.skin.integrity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Presence of Pressure Ulcers</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.skin.pressure_ulcers ? 'YES - SEE TREATMENT FLOWSHEET' : 'NONE NOTED'}</p>
                </div>
              </div>
            </div>

            {/* System VII: Pain */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center text-slate-900">
                VII. Pain Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pain Level (0-10)</p>
                  <p className="text-[11px] font-black text-slate-900">{assessments.pain.level} / 10</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pain Type</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.pain.type}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pain Location</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.pain.location || 'NONE'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Non-Verbal Cues</p>
                  <p className="text-[9px] font-black uppercase text-slate-500">{assessments.pain.non_verbal.join(', ') || 'NONE'}</p>
                </div>
              </div>
            </div>

            {/* System VIII: ADL & Safety */}
            <div className="border-2 border-slate-900 p-4 rounded-2xl bg-slate-900 text-white">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-white/20 pb-2 flex justify-between items-center text-teal-400">
                VIII. ADL & Safety Rounds
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Mobility</p>
                  <p className="text-[11px] font-black uppercase text-white">{assessments.adl.mobility}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Transfer</p>
                  <p className="text-[11px] font-black uppercase text-white">{assessments.adl.transfer}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Safety Checks Completed</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {assessments.adl.safety_checks.map(check => (
                    <span key={check} className="text-[9px] font-black uppercase flex items-center gap-1">
                      <span className="text-teal-400">✓</span> {check}
                    </span>
                  ))}
                  {assessments.adl.safety_checks.length === 0 && <span className="text-[9px] text-white/20 italic font-black">NO CHECKS RECORDED</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 flex justify-between items-end border-t-4 border-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">
              Quro Clinical Intelligence Platform • v4.5 Platinum<br />
              Generated Official Record • Page 1 of 2 (Side A)
            </div>
            <div className="text-right">
              <div className="w-64 h-0.5 bg-slate-900 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-900 mb-1">Licensed Clinical Professional Signature</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{staff?.first_name} {staff?.last_name}, RN ({new Date().toLocaleDateString()})</p>
            </div>
          </div>
        </div>

        {/* Page 2: Narrative (Back Side) */}
        <div className="p-12 min-h-screen page-break-before-always bg-white flex flex-col">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">Q</div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Clinical Narrative Log</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Platinum Health Hub • Narrative Progress Notes (Side B)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MRN: {patient?.mrn} • RM: {patient?.room_id}</p>
            </div>
          </div>

          <div className="border-4 border-slate-900 p-10 rounded-[2.5rem] flex-grow relative bg-slate-50/30">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Clinical Narrative (DAR/SOAP)</p>
            </div>
            
            <div className="mt-12 text-sm font-medium leading-[2.2] text-slate-900 whitespace-pre-wrap">
              <span className="font-black uppercase text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg mr-3 shadow-md tracking-widest">{noteFocus}</span>
              {narrativeNote || 'No narrative documentation provided for this shift. Resident was monitored per care plan with no acute changes noted.'}
            </div>

            {/* Lined paper effect for handwritten notes/backup - Only shows if note is short */}
            {(!narrativeNote || narrativeNote.length < 500) && (
              <div className="mt-12 space-y-10 opacity-[0.05]">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-[2px] bg-slate-900 w-full" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-10">
            <div className="col-span-2 border-2 border-slate-200 p-6 rounded-[2rem] bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-200 pb-2">Shift Intervention Summary Checklist</p>
              <div className="grid grid-cols-2 gap-y-4">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">✓</div> 
                  Medications Administered
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">✓</div> 
                  Treatments Completed
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-300 rounded" /> 
                  Physician Notified
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-300 rounded" /> 
                  Family Notified
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Authenticated By</p>
              <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{staff?.first_name} {staff?.last_name}, RN</p>
              <div className="w-full h-1 bg-slate-900 mt-2 shadow-sm" />
              <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">Electronic Hash: {patient?.id?.slice(0, 16)}</p>
            </div>
          </div>

          <div className="mt-8 pt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 text-center border-t border-slate-100">
            Official Clinical Record • Platinum Health Hub • Side B
          </div>
        </div>
      </div>

    </div>
  );
}

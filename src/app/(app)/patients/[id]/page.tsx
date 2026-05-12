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
  Phone,
  Smile,
  Accessibility,
  Shield,
  Send,
  Archive,
  Search
} from 'lucide-react';
import { COMMON_DRUGS } from '@/lib/constants/drugs';
import { usePatient } from '@/hooks/usePatient';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useHandover } from '@/hooks/useHandover';
import { useNotes } from '@/hooks/useNotes';
import { useVitals } from '@/hooks/useVitals';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import VitalsTrendChart from '@/components/clinical/VitalsTrendChart';
import VoiceToSOAP from '@/components/clinical/VoiceToSOAP';
import { MedRoute, MedFrequency, ProviderOrder, Medication, Patient } from '@/lib/firebase/types';

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeFacility } = useAuth();
  const { patient, loading: patientLoading, error } = usePatient(id);
  const { medications, loading: medsLoading, addMedication } = useMedications(id);
  const { entries: marEntries, loading: marLoading, logAdministration, bulkLogAdministrations } = useMAR(id);
  const { createNote } = useHandover();
  const { notes, saveNote, updateNote } = useNotes(id);
  const { vitals } = useVitals(id);
  const { orders, loading: ordersLoading, addOrder, updateOrderStatus } = useOrders(id);
  const { staff } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'facesheet' | 'medications' | 'mar' | 'vitals' | 'orders' | 'charting' | 'trends' | 'compliance'>('facesheet');
  const [surveyorMode, setSurveyorMode] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDelayReasonModal, setShowDelayReasonModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showEffectivenessModal, setShowEffectivenessModal] = useState(false);
  const [selectedMedForAction, setSelectedMedForAction] = useState<Medication | null>(null);
  const [pendingAction, setPendingAction] = useState<'given' | 'held' | 'refused' | null>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [vitalsEntry, setVitalsEntry] = useState({ bp_sys: '', bp_dia: '', hr: '' });
  const [delayReason, setDelayReason] = useState('');
  const [effectivenessScore, setEffectivenessScore] = useState(0);
  const [effectivenessComment, setEffectivenessComment] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Orders State
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_text: '',
    order_type: 'medication' as ProviderOrder['order_type'],
    priority: 'routine' as ProviderOrder['priority'],
    route: 'PO' as MedRoute,
    frequency: 'QD' as MedFrequency,
    is_psychotropic: false
  });
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);

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
      orientation: [] as string[],
      loc: 'Alert' as 'Alert' | 'Lethargic' | 'Obtunded' | 'Comatose',
      pupils: 'PERRLA' as 'PERRLA' | 'Sluggish' | 'Non-reactive'
    },
    cognitive: {
      short_term_memory: 'Intact' as 'Intact' | 'Impaired',
      long_term_memory: 'Intact' as 'Intact' | 'Impaired',
      decision_making: 'Independent' as 'Independent' | 'Modified Independence' | 'Moderately Impaired' | 'Severely Impaired'
    },
    sensory: {
      hearing: 'Adequate' as 'Adequate' | 'Minimal Difficulty' | 'Highly Impaired' | 'Severely Impaired',
      vision: 'Adequate' as 'Adequate' | 'Impaired' | 'Highly Impaired' | 'Severely Impaired',
      speech: 'Clear' as 'Clear' | 'Slurred' | 'Aphasic'
    },
    mood: {
      indicators: [] as string[],
      frequency: 'Never' as 'Never' | '2-6 Days' | '7-11 Days' | '12-14 Days'
    },
    behavior: {
      types: [] as string[],
      frequency: 'None' as 'None' | '1-3 times' | '4-6 times' | 'Daily',
      intervention: 'None'
    },
    functional: {
      self_perf: {
        eating: 'Independent',
        hygiene: 'Independent',
        toileting: 'Independent',
        mobility: 'Independent'
      },
      support: {
        eating: 'No Setup',
        hygiene: 'No Setup',
        toileting: 'No Setup',
        mobility: 'No Setup'
      }
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
    pressure_ulcers: {
      present: false,
      stage: 'N/A' as 'N/A' | '1' | '2' | '3' | '4' | 'Unstageable' | 'DTI',
      site: ''
    },
    skin: { 
      condition: 'Intact',
      turgor: 'Elastic',
      temp: 'Warm',
      moisture: 'Dry'
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

  const handleSignAdministration = async () => {
    if (!selectedMedForAction || !pendingAction) return;

    try {
      setIsSigningOff(true);

      const administrationData = {
        medication_id: selectedMedForAction.id,
        action: pendingAction,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '09:00', // Mock scheduled time
        notes: delayReason,
        delay_reason: delayReason,
        linked_vitals: vitalsEntry.bp_sys ? {
          systolic: parseInt(vitalsEntry.bp_sys),
          diastolic: parseInt(vitalsEntry.bp_dia),
          pulse: parseInt(vitalsEntry.hr)
        } : undefined,
        is_prn: selectedMedForAction.frequency.toUpperCase().includes('PRN')
      };

      await logAdministration(administrationData);
      
      // Reset State
      setShowPinModal(false);
      setShowVitalsModal(false);
      setShowDelayReasonModal(false);
      setPinEntry('');
      setVitalsEntry({ bp_sys: '', bp_dia: '', hr: '' });
      setDelayReason('');
      setSelectedMedForAction(null);
      setPendingAction(null);

      // If PRN, show effectiveness modal (simulating a reminder)
      if (administrationData.is_prn) {
        // In a real app, this would be a delayed task. For demo, show it now or trigger a toast.
      }
    } catch (err) {
      console.error('Sign-off error:', err);
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

  const handleAddOrder = async () => {
    if (!newOrder.order_text.trim() || !patient) return;
    try {
      const orderRef = await addOrder({
        order_text: newOrder.order_text,
        order_type: newOrder.order_type,
        priority: newOrder.priority,
        status: 'signed',
        ordering_physician_id: staff?.id || 'attending-1',
        facility_id: patient.facility_id,
      });

      // Automatically place on MAR if it's a medication or specific monitoring order
      if (newOrder.order_type === 'medication') {
        await addMedication({
          generic_name: newOrder.order_text.split(' ')[0],
          brand_name: '',
          strength: 'As ordered',
          dosage: 'As ordered',
          route: newOrder.route,
          frequency: newOrder.frequency,
          start_date: new Date().toISOString(),
          status: 'active',
          is_psychotropic: newOrder.is_psychotropic,
          special_instructions: newOrder.order_text,
          order_id: orderRef.id
        });
      } else if (newOrder.order_text.toLowerCase().includes('weight') || newOrder.order_text.toLowerCase().includes('sleep')) {
        await addMedication({
          generic_name: newOrder.order_text.includes('weight') ? 'Monthly Weight' : 'Sleep Monitoring',
          strength: 'N/A',
          dosage: 'N/A',
          route: 'PO',
          frequency: newOrder.order_text.includes('weight') ? 'MONTHLY' : 'QD',
          start_date: new Date().toISOString(),
          status: 'active',
          special_instructions: newOrder.order_text,
          order_id: orderRef.id
        });
      }

      setNewOrder({ 
        order_text: '', 
        order_type: 'medication', 
        priority: 'routine',
        route: 'PO',
        frequency: 'QD',
        is_psychotropic: false
      });
      setIsAddingOrder(false);
      alert('Order signed and automatically synchronized with Patient MAR.');
    } catch (err) {
      console.error('Failed to add order:', err);
      alert('Failed to add order.');
    }
  };

  const handleStopOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to discontinue this order?')) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      alert('Order has been discontinued.');
    } catch (err) {
      console.error('Failed to stop order:', err);
      alert('Failed to discontinue order.');
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
          { id: 'compliance', icon: ShieldCheck, label: 'Surveyor Review' },
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
              {/* Resident Identity Header (State Surveyor Requirement) */}
              <div className="flex items-center gap-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
                  <img 
                    src={patient?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient?.id}`} 
                    alt={patient?.first_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{patient?.first_name} {patient?.last_name}</h2>
                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-black text-slate-500 rounded-full uppercase tracking-widest">
                      DOB: {patient?.date_of_birth}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-quro-teal" />
                    Room {patient?.room_number} • Attending: {patient?.attending_physician || 'Dr. Smith'}
                  </p>
                </div>
                <div className="ml-auto flex gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Last Med Pass</p>
                    <p className="text-sm font-black text-slate-700">10:45 AM (Today)</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 mx-4" />
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Compliance Rate</p>
                    <p className="text-sm font-black text-emerald-500">98.4%</p>
                  </div>
                </div>
              </div>

              {/* Smart eMAR View */}
              <div className="space-y-6">
                {/* Pending Compliance Tasks (PRN Follow-ups, Vitals validation) */}
                {marEntries.filter(e => e.is_prn && !e.effectiveness_score).length > 0 && (
                  <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Pending Compliance Tasks</p>
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Action Required to Close Clinical Loop</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {marEntries.filter(e => e.is_prn && !e.effectiveness_score).map(entry => {
                        const med = medications.find(m => m.id === entry.medication_id);
                        return (
                          <div key={entry.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-rose-100">
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">PRN Follow-up: {med?.generic_name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Administered: {entry.actual_time}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedMedForAction(med || null);
                                // For demo, we'd open the effectiveness modal for this entry
                                setShowEffectivenessModal(true);
                              }}
                              className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                            >
                              Record Effectiveness
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Pill size={18} className="text-quro-teal" />
                    Scheduled Medications (eMAR)
                  </h3>
                  <div className="flex gap-4 items-center">
                    <div className="flex gap-2 items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-blue-400" /> Upcoming
                      <div className="w-2 h-2 rounded-full bg-emerald-400 ml-2" /> Ready
                      <div className="w-2 h-2 rounded-full bg-rose-400 ml-2 animate-pulse" /> Overdue
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {medications.length > 0 ? medications.map((med) => {
                    // Logic for Time Window Alerts
                    // Simplified for demo: assume current time vs 09:00
                    const status = med.is_psychotropic ? 'overdue' : 'ready'; // Mock status
                    const requiresVitals = med.generic_name.toLowerCase().includes('lisinopril') || med.generic_name.toLowerCase().includes('metoprolol');
                    const isPRN = med.frequency.toUpperCase().includes('PRN');

                    return (
                      <div 
                        key={med.id} 
                        className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 ${
                          status === 'overdue' ? 'shadow-2xl shadow-rose-100' : 
                          status === 'ready' ? 'shadow-2xl shadow-emerald-100' : 'shadow-lg shadow-slate-100'
                        }`}
                      >
                        {/* Status Pulse Glow */}
                        <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${
                          status === 'overdue' ? 'bg-rose-500' : 
                          status === 'ready' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        
                        <div className="relative glass-card p-8 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] h-full flex flex-col">
                          {/* Top Badge */}
                          <div className="flex items-center justify-between mb-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              status === 'overdue' ? 'bg-rose-500 text-white' : 
                              status === 'ready' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {status === 'overdue' ? 'Overdue 1h 22m' : status === 'ready' ? 'Ready Now' : 'Upcoming (12:00)'}
                            </span>
                            {isPRN && (
                              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full">
                                PRN
                              </span>
                            )}
                          </div>

                          <div className="mb-6">
                            <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{med.generic_name}</h4>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{med.dosage} • {med.route}</p>
                          </div>

                          <div className="space-y-4 mb-8 flex-grow">
                            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Clock size={14} />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 uppercase text-[9px] tracking-tight">Scheduled</p>
                                <p>Daily at 09:00 AM</p>
                              </div>
                            </div>
                            
                            {requiresVitals && (
                              <div className="flex items-center gap-3 text-[11px] font-medium text-rose-500 bg-rose-50 p-3 rounded-2xl">
                                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500">
                                  <Activity size={14} />
                                </div>
                                <div>
                                  <p className="font-black uppercase text-[9px] tracking-tight">Vital Required</p>
                                  <p>Pulse/BP entry needed</p>
                                </div>
                              </div>
                            )}

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Indication</p>
                              <p className="text-[11px] font-bold text-slate-600 line-clamp-2 italic">"{med.indication || 'Routine administration per protocol.'}"</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                setSelectedMedForAction(med);
                                setPendingAction('given');
                                if (requiresVitals) setShowVitalsModal(true);
                                else setShowPinModal(true);
                              }}
                              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
                            >
                              Sign Administration
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedMedForAction(med);
                                setPendingAction('held');
                                setShowDelayReasonModal(true);
                              }}
                              className="px-4 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black hover:bg-slate-50 transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center mx-auto mb-6">
                        <Pill size={32} className="text-slate-200" />
                      </div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Medications</h4>
                      <p className="text-xs text-slate-300 mt-2">Medication passes will appear here once orders are signed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Med Pass Compliance</p>
                  <p className="text-3xl font-black text-emerald-500">99.2%</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">Target Facility Rate: {'>'}95%</p>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Late Administrations</p>
                  <p className="text-3xl font-black text-amber-500">02</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">Awaiting reason verification</p>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PRN Follow-ups</p>
                  <p className="text-3xl font-black text-rose-500">00</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">All effectiveness notes recorded</p>
                </div>
              </div>

              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Electronic Audit Trail (CFR Part 11)
                  </h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100">
                    <Printer size={14} /> Export Report
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-50">
                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinician</th>
                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Medication</th>
                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Device/IP</th>
                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Auth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {marEntries.map((entry) => {
                        const med = medications.find(m => m.id === entry.medication_id);
                        return (
                          <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 text-[11px] font-black text-slate-900">{new Date(entry.created_at).toLocaleString()}</td>
                            <td className="py-4 text-[11px] font-bold text-slate-600">{entry.administered_by?.slice(-6).toUpperCase()}</td>
                            <td className="py-4">
                              <p className="text-[11px] font-black text-slate-900">{med?.generic_name}</p>
                              {entry.action !== 'given' && (
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">EXC: {entry.delay_reason}</p>
                              )}
                            </td>
                            <td className="py-4">
                              <p className="text-[9px] font-medium text-slate-400">192.168.1.104</p>
                              <p className="text-[8px] text-slate-300 truncate max-w-[120px]">Chrome / iPad Pro v17</p>
                            </td>
                            <td className="py-4 text-right">
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg">Verified PIN</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <VitalsTrendChart vitals={vitals} />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
                      <Stethoscope size={18} className="text-quro-teal" />
                      Active Provider Orders
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Review and manage clinical directives for this resident.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingOrder(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                  >
                    <Plus size={16} />
                    New Medical Order
                  </button>
                </div>

                {isAddingOrder && (
                  <div className="mb-10 p-8 bg-slate-50 border border-slate-100 rounded-[2rem] animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Entry: New Provider Directive</h4>
                      <button onClick={() => setIsAddingOrder(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Type</p>
                        <select 
                          value={newOrder.order_type}
                          onChange={e => setNewOrder({...newOrder, order_type: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 p-4 rounded-xl font-black text-xs uppercase outline-none focus:border-quro-teal transition-all"
                        >
                          <option value="medication">Medication Order</option>
                          <option value="lab">Laboratory / Diagnostics</option>
                          <option value="imaging">Radiology / Imaging</option>
                          <option value="therapy">Therapy (PT/OT/ST)</option>
                          <option value="diet">Dietary Directive</option>
                          <option value="other">General Nursing Order</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority Level</p>
                        <div className="flex gap-2">
                          {['routine', 'urgent', 'stat'].map(p => (
                            <button 
                              key={p}
                              onClick={() => setNewOrder({...newOrder, priority: p as any})}
                              className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                newOrder.priority === p 
                                  ? 'bg-slate-900 text-white border-slate-900' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mb-8 relative">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Description / Drug Name</p>
                      <div className="relative">
                        <textarea 
                          value={newOrder.order_text}
                          onChange={e => {
                            setNewOrder({...newOrder, order_text: e.target.value});
                            if (newOrder.order_type === 'medication') {
                              setDrugSearch(e.target.value);
                              setShowDrugDropdown(true);
                            }
                          }}
                          onFocus={() => {
                            if (newOrder.order_type === 'medication') setShowDrugDropdown(true);
                          }}
                          placeholder={newOrder.order_type === 'medication' ? "Search drug library or enter custom..." : "Enter clinical directive..."}
                          className="w-full h-24 p-6 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-quro-teal transition-all resize-none"
                        />
                        {newOrder.order_type === 'medication' && (
                          <Search size={16} className="absolute right-6 top-6 text-slate-300 pointer-events-none" />
                        )}
                      </div>

                      {/* Drug Dropdown */}
                      {showDrugDropdown && newOrder.order_type === 'medication' && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2">
                          {COMMON_DRUGS.filter(d => 
                            d.generic.toLowerCase().includes(drugSearch.toLowerCase()) || 
                            d.brand?.toLowerCase().includes(drugSearch.toLowerCase())
                          ).length > 0 ? (
                            COMMON_DRUGS.filter(d => 
                              d.generic.toLowerCase().includes(drugSearch.toLowerCase()) || 
                              d.brand?.toLowerCase().includes(drugSearch.toLowerCase())
                            ).map((drug, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setNewOrder({ 
                                    ...newOrder, 
                                    order_text: `${drug.generic}${drug.brand ? ` (${drug.brand})` : ''}`,
                                    is_psychotropic: drug.is_psychotropic || false
                                  });
                                  setShowDrugDropdown(false);
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all text-left group"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-900 group-hover:text-quro-teal transition-colors">{drug.generic}</p>
                                  {drug.brand && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{drug.brand}</p>}
                                </div>
                                {drug.is_psychotropic && (
                                  <span className="px-2 py-1 bg-rose-50 text-rose-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-rose-100">
                                    PSYCH
                                  </span>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching drugs found</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {showDrugDropdown && (
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowDrugDropdown(false)}
                        />
                      )}
                    </div>

                    {newOrder.order_type === 'medication' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Route</p>
                          <select 
                            value={newOrder.route}
                            onChange={e => setNewOrder({...newOrder, route: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-[10px] uppercase outline-none focus:border-quro-teal transition-all"
                          >
                            <option value="PO">PO (Oral)</option>
                            <option value="SL">SL (Sublingual)</option>
                            <option value="IM">IM (Intramuscular)</option>
                            <option value="IV">IV (Intravenous)</option>
                            <option value="TOP">TOP (Topical)</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Frequency</p>
                          <select 
                            value={newOrder.frequency}
                            onChange={e => setNewOrder({...newOrder, frequency: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-[10px] uppercase outline-none focus:border-quro-teal transition-all"
                          >
                            <option value="QD">QD (Daily)</option>
                            <option value="BID">BID (Twice Daily)</option>
                            <option value="TID">TID (Three Daily)</option>
                            <option value="QID">QID (Four Daily)</option>
                            <option value="QHS">QHS (At Bedtime)</option>
                            <option value="PRN">PRN (As Needed)</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Flag</p>
                          <button 
                            onClick={() => setNewOrder({...newOrder, is_psychotropic: !newOrder.is_psychotropic})}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                              newOrder.is_psychotropic 
                                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full border-2 ${newOrder.is_psychotropic ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Psychotropic</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button 
                        onClick={handleAddOrder}
                        className="px-12 py-5 bg-quro-teal text-white rounded-2xl font-black text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-quro-teal/20 flex items-center gap-3"
                      >
                        <Send size={18} />
                        Sign & Submit Order
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {ordersLoading ? (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Orders...</div>
                  ) : orders.filter(o => o.status !== 'cancelled').length > 0 ? orders.filter(o => o.status !== 'cancelled').map((order) => (
                    <div key={order.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-quro-teal/30 transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              order.priority === 'stat' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                              order.priority === 'urgent' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              {order.priority} • {order.order_type}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordered {new Date(order.created_at as any).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-900 tracking-tight mb-4 leading-relaxed">{order.order_text}</h4>
                          <div className="flex gap-6 pt-4 border-t border-slate-200/60">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              <p className="text-xs font-black uppercase text-quro-teal">{order.status}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ordering Provider</p>
                              <p className="text-xs font-bold text-slate-700">Dr. Demo Attending</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button 
                             onClick={() => handleStopOrder(order.id)}
                             className="p-4 bg-white text-rose-500 rounded-2xl shadow-sm border border-slate-100 hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center justify-center"
                             title="Discontinue Order"
                           >
                             <X size={20} />
                           </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No active orders found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* History of Discontinued Orders */}
              {orders.filter(o => o.status === 'cancelled').length > 0 && (
                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem] opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <Archive size={18} />
                      Discontinued / Inactive Orders
                    </h3>
                    <div className="space-y-4">
                      {orders.filter(o => o.status === 'cancelled').map(order => (
                        <div key={order.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                           <div>
                             <p className="text-xs font-black text-slate-400 line-through">{order.order_text}</p>
                             <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Discontinued on {new Date(order.updated_at as any).toLocaleDateString()}</p>
                           </div>
                           <span className="px-3 py-1 bg-slate-200 text-slate-500 text-[8px] font-black rounded-lg uppercase">Inactive</span>
                        </div>
                      ))}
                    </div>
                </div>
              )}
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-quro-teal mb-1">Vital Signs Charting</p>
                        <h2 className="text-lg font-black uppercase tracking-tighter">Current Shift Assessment</h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Temperature</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.1"
                            value={assessments.vitals.temp} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, temp: parseFloat(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 font-black text-base outline-none focus:border-quro-teal transition-all text-center"
                          />
                          <span className="text-slate-500 font-black text-xs">°F</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">B/P (Sys/Dia)</p>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={assessments.vitals.bp_systolic} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_systolic: parseInt(e.target.value)}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl p-2 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="Sys"
                          />
                          <span className="text-slate-600 font-black text-xs">/</span>
                          <input 
                            type="number" 
                            value={assessments.vitals.bp_diastolic} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_diastolic: parseInt(e.target.value)}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl p-2 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="Dia"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pulse / Resp</p>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={assessments.vitals.pulse} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, pulse: parseInt(e.target.value)}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl p-2 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="HR"
                          />
                          <span className="text-slate-600 font-black text-xs">/</span>
                          <input 
                            type="number" 
                            value={assessments.vitals.resp} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, resp: parseInt(e.target.value)}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl p-2 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="RR"
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
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 font-black text-base outline-none focus:border-quro-teal transition-all text-center"
                          />
                          <span className="text-slate-500 font-black text-xs">%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BP Site</p>
                        <select 
                          value={assessments.vitals.bp_site} 
                          onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_site: e.target.value as any}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-[10px] uppercase outline-none focus:border-quro-teal transition-all"
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-[10px] uppercase outline-none focus:border-quro-teal transition-all"
                        >
                          <option className="bg-slate-900">Sitting</option>
                          <option className="bg-slate-900">Standing</option>
                          <option className="bg-slate-900">Supine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {/* 1. Neurological Status */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <Zap size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">I. Neurological</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Orientation (A&O)</p>
                          <div className="flex flex-wrap gap-1">
                            {['Person', 'Place', 'Time', 'Situation'].map(o => (
                              <button 
                                key={o} 
                                onClick={() => {
                                  const orientation = assessments.neuro.orientation.includes(o)
                                    ? assessments.neuro.orientation.filter(item => item !== o)
                                    : [...assessments.neuro.orientation, o];
                                  setAssessments({...assessments, neuro: {...assessments.neuro, orientation}});
                                }}
                                className={`px-2 py-1 rounded-lg text-[8px] font-black border transition-all ${assessments.neuro.orientation.includes(o) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Level of Consciousness</p>
                            <select value={assessments.neuro.loc} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, loc: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Alert</option>
                              <option>Lethargic</option>
                              <option>Obtunded</option>
                              <option>Comatose</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Pupils</p>
                            <select value={assessments.neuro.pupils} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, pupils: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>PERRLA</option>
                              <option>Sluggish</option>
                              <option>Non-reactive</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Cognitive Status */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Brain size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">II. Cognitive Status</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Short-Term Memory</p>
                              <button onClick={() => setAssessments({...assessments, cognitive: {...assessments.cognitive, short_term_memory: assessments.cognitive.short_term_memory === 'Intact' ? 'Impaired' : 'Intact'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cognitive.short_term_memory === 'Intact' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {assessments.cognitive.short_term_memory}
                              </button>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Long-Term Memory</p>
                              <button onClick={() => setAssessments({...assessments, cognitive: {...assessments.cognitive, long_term_memory: assessments.cognitive.long_term_memory === 'Intact' ? 'Impaired' : 'Intact'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cognitive.long_term_memory === 'Intact' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {assessments.cognitive.long_term_memory}
                              </button>
                           </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Decision Making</p>
                          <select value={assessments.cognitive.decision_making} onChange={e => setAssessments({...assessments, cognitive: {...assessments.cognitive, decision_making: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                            <option>Independent</option>
                            <option>Modified Independence</option>
                            <option>Moderately Impaired</option>
                            <option>Severely Impaired</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. Sensory & Communication */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                          <Eye size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">III. Sensory & Speech</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Hearing</p>
                              <select value={assessments.sensory.hearing} onChange={e => setAssessments({...assessments, sensory: {...assessments.sensory, hearing: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Adequate</option>
                                <option>Minimal Difficulty</option>
                                <option>Highly Impaired</option>
                                <option>Severely Impaired</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Vision</p>
                              <select value={assessments.sensory.vision} onChange={e => setAssessments({...assessments, sensory: {...assessments.sensory, vision: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Adequate</option>
                                <option>Impaired</option>
                                <option>Highly Impaired</option>
                                <option>Severely Impaired</option>
                              </select>
                           </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Speech Clarity</p>
                          <div className="grid grid-cols-3 gap-2">
                            {['Clear', 'Slurred', 'Aphasic'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, sensory: {...assessments.sensory, speech: val as any}})} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.sensory.speech === val ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Mood Indicators */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                          <Smile size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">IV. Mood Indicators</h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">PHQ Indicators Observed</p>
                        <div className="flex flex-wrap gap-2">
                           {['Little Interest', 'Feeling Down', 'Tired', 'Poor Appetite', 'Bad about Self'].map(ind => (
                             <button 
                               key={ind} 
                               onClick={() => {
                                 const indicators = assessments.mood.indicators.includes(ind)
                                   ? assessments.mood.indicators.filter(i => i !== ind)
                                   : [...assessments.mood.indicators, ind];
                                 setAssessments({...assessments, mood: {...assessments.mood, indicators}});
                               }}
                               className={`px-3 py-1.5 rounded-full text-[8px] font-black border transition-all ${assessments.mood.indicators.includes(ind) ? 'bg-violet-600 text-white border-violet-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}
                             >
                               {ind}
                             </button>
                           ))}
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                           <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Indicator Frequency</p>
                           <select value={assessments.mood.frequency} onChange={e => setAssessments({...assessments, mood: {...assessments.mood, frequency: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Never</option>
                              <option>2-6 Days</option>
                              <option>7-11 Days</option>
                              <option>12-14 Days</option>
                           </select>
                        </div>
                      </div>
                    </div>

                    {/* 4. Behavior Tracking */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <Activity size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">V. Behavior</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                           {['Wandering', 'Verbal Aggression', 'Physical Aggression', 'Socially Inapprop.'].map(type => (
                             <button 
                               key={type} 
                               onClick={() => {
                                 const types = assessments.behavior.types.includes(type)
                                   ? assessments.behavior.types.filter(t => t !== type)
                                   : [...assessments.behavior.types, type];
                                 setAssessments({...assessments, behavior: {...assessments.behavior, types}});
                               }}
                               className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.behavior.types.includes(type) ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}
                             >
                               {type}
                             </button>
                           ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Frequency</p>
                              <select value={assessments.behavior.frequency} onChange={e => setAssessments({...assessments, behavior: {...assessments.behavior, frequency: e.target.value as any}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>None</option>
                                <option>1-3 times</option>
                                <option>4-6 times</option>
                                <option>Daily</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Intervention</p>
                              <input 
                                type="text" 
                                placeholder="e.g. Redirected"
                                value={assessments.behavior.intervention}
                                onChange={e => setAssessments({...assessments, behavior: {...assessments.behavior, intervention: e.target.value}})}
                                className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] outline-none"
                              />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Functional Status (ADLs) */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 md:col-span-2 xl:col-span-1">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-900">
                          <Accessibility size={20} />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-900">VI. Functional Status</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
                           <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Activity</p>
                           <div className="grid grid-cols-2 gap-2">
                              <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest text-center">Self-Perf</p>
                              <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest text-center">Support</p>
                           </div>
                        </div>
                        {['Eating', 'Hygiene', 'Toileting', 'Mobility'].map(adl => (
                          <div key={adl} className="grid grid-cols-2 gap-4 items-center">
                            <p className="text-[10px] font-black uppercase tracking-wider">{adl}</p>
                            <div className="grid grid-cols-2 gap-2">
                               <select 
                                 value={assessments.functional.self_perf[adl.toLowerCase() as keyof typeof assessments.functional.self_perf]} 
                                 onChange={e => setAssessments({...assessments, functional: {...assessments.functional, self_perf: {...assessments.functional.self_perf, [adl.toLowerCase()]: e.target.value}}})}
                                 className="bg-slate-50 border border-slate-100 p-1.5 rounded-lg font-black text-[8px] uppercase outline-none text-emerald-900 text-center"
                               >
                                 <option>Ind.</option>
                                 <option>Supv.</option>
                                 <option>Lim.</option>
                                 <option>Ext.</option>
                                 <option>Total</option>
                               </select>
                               <select 
                                 value={assessments.functional.support[adl.toLowerCase() as keyof typeof assessments.functional.support]} 
                                 onChange={e => setAssessments({...assessments, functional: {...assessments.functional, support: {...assessments.functional.support, [adl.toLowerCase()]: e.target.value}}})}
                                 className="bg-slate-50 border border-slate-100 p-1.5 rounded-lg font-black text-[8px] uppercase outline-none text-emerald-900 text-center"
                               >
                                 <option>0</option>
                                 <option>1</option>
                                 <option>2+</option>
                                 <option>Setup</option>
                               </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 6. Respiratory System */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Wind size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">VII. Respiratory</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Breathing Pattern</p>
                          <select value={assessments.resp.pattern} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, pattern: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                            <option>Even/Unlabored</option>
                            <option>Labored</option>
                            <option>Shallow</option>
                            <option>SOB at rest</option>
                            <option>SOB on exertion</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Breath Sounds</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['Clear', 'Wheezing', 'Crackles', 'Diminished'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, resp: {...assessments.resp, sounds: val}})} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.resp.sounds === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-emerald-900 border-slate-100 hover:border-slate-200'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                              <p className="text-[8px] font-black text-emerald-900 uppercase mb-1">Oxygen</p>
                              <select value={assessments.resp.oxygen} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, oxygen: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
                                <option>Room Air</option>
                                <option>NC</option>
                                <option>CPAP/BiPAP</option>
                              </select>
                           </div>
                           <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                              <p className="text-[8px] font-black text-emerald-900 uppercase mb-1">Flow (LPM)</p>
                              <input type="number" value={assessments.resp.o2_flow} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, o2_flow: parseInt(e.target.value)}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none" />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* 7. Cardiovascular System */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <Heart size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">VIII. Cardiovascular</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Rhythm</p>
                            <button onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, rhythm: assessments.cardio.rhythm === 'Regular' ? 'Irregular' : 'Regular'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cardio.rhythm === 'Regular' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {assessments.cardio.rhythm}
                            </button>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Cap Refill</p>
                            <button onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, cap_refill: assessments.cardio.cap_refill === '< 3s' ? '> 3s' : '< 3s'}})} className={`w-full py-2 rounded-lg text-[10px] font-black border transition-all ${assessments.cardio.cap_refill === '< 3s' ? 'bg-slate-50 text-emerald-900 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {assessments.cardio.cap_refill}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Edema Tracking</p>
                          <div className="flex gap-1">
                            {['None', '1+', '2+', '3+', '4+'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, cardio: {...assessments.cardio, edema: val}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.cardio.edema === val ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-1">Pulses (Radial/Pedal)</p>
                          <select value={assessments.cardio.pulses} onChange={e => setAssessments({...assessments, cardio: {...assessments.cardio, pulses: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
                            <option>Strong</option>
                            <option>Weak</option>
                            <option>Absent</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 8. GI & Nutrition */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                          <Apple size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">IX. GI & Nutrition</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Appetite / Intake</p>
                          <div className="flex gap-2">
                            {['Poor', 'Fair', 'Good'].map(val => (
                              <button key={val} onClick={() => setAssessments({...assessments, gi: {...assessments.gi, appetite: val}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gi.appetite.includes(val) ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50/30 rounded-xl border border-orange-100">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[8px] font-black text-emerald-900 uppercase">Bristol Stool Scale</p>
                            <span className="text-[10px] font-black text-orange-700">Type {assessments.gi.stool_bristol}</span>
                          </div>
                          <input type="range" min="1" max="7" step="1" value={assessments.gi.stool_bristol} onChange={e => setAssessments({...assessments, gi: {...assessments.gi, stool_bristol: parseInt(e.target.value)}})} className="w-full accent-orange-500" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Fluid Intake (mL)</p>
                          <input 
                            type="number" 
                            value={assessments.gi.fluids_in_ml} 
                            onChange={e => setAssessments({...assessments, gi: {...assessments.gi, fluids_in_ml: parseInt(e.target.value)}})}
                            className="w-24 bg-white border border-slate-200 rounded-lg p-2 font-black text-xs text-right outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 9. Genitourinary */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                          <Droplets size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">X. Genitourinary</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Device</p>
                              <select value={assessments.gu.catheter} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, catheter: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>None</option>
                                <option>Foley</option>
                                <option>Texas</option>
                                <option>Suprapubic</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Urine</p>
                              <select value={assessments.gu.urine_appearance} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, urine_appearance: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Clear</option>
                                <option>Cloudy</option>
                                <option>Sediment</option>
                                <option>Hematuria</option>
                              </select>
                           </div>
                        </div>
                        <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-emerald-900 uppercase">Void Count (Shift)</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setAssessments({...assessments, gu: {...assessments.gu, voiding_count: Math.max(0, assessments.gu.voiding_count - 1)}})} className="w-6 h-6 rounded-full bg-white border border-cyan-200 flex items-center justify-center font-black">-</button>
                            <span className="font-black text-xs">{assessments.gu.voiding_count}</span>
                            <button onClick={() => setAssessments({...assessments, gu: {...assessments.gu, voiding_count: assessments.gu.voiding_count + 1}})} className="w-6 h-6 rounded-full bg-white border border-cyan-200 flex items-center justify-center font-black">+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 10. Physiological Skin Condition */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                          <Stethoscope size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">XI. Skin Condition</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Turgor</p>
                              <select value={assessments.skin.turgor} onChange={e => setAssessments({...assessments, skin: {...assessments.skin, turgor: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Elastic</option>
                                <option>Tenting</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Temperature</p>
                              <select value={assessments.skin.temp} onChange={e => setAssessments({...assessments, skin: {...assessments.skin, temp: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Warm</option>
                                <option>Cool</option>
                                <option>Hot</option>
                              </select>
                           </div>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Moisture</p>
                           <div className="grid grid-cols-3 gap-2">
                             {['Dry', 'Diaphoretic', 'Clammy'].map(val => (
                               <button key={val} onClick={() => setAssessments({...assessments, skin: {...assessments.skin, moisture: val}})} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.skin.moisture === val ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
                                 {val}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* 11. Pressure Ulcers standalone */}
                    <div className="glass-card p-8 bg-rose-50 border border-rose-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm">
                          <Shield size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">XII. Pressure Ulcers</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-rose-100 shadow-sm">
                           <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Ulcers Present</p>
                           <button 
                             onClick={() => setAssessments({...assessments, pressure_ulcers: {...assessments.pressure_ulcers, present: !assessments.pressure_ulcers.present}})}
                             className={`w-12 h-6 rounded-full transition-all relative ${assessments.pressure_ulcers.present ? 'bg-rose-500' : 'bg-slate-200'}`}
                           >
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${assessments.pressure_ulcers.present ? 'left-7' : 'left-1'}`} />
                           </button>
                        </div>
                        {assessments.pressure_ulcers.present && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                               <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Highest Stage</p>
                               <select value={assessments.pressure_ulcers.stage} onChange={e => setAssessments({...assessments, pressure_ulcers: {...assessments.pressure_ulcers, stage: e.target.value as any}})} className="w-full bg-white border border-rose-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none text-rose-600">
                                 <option>1</option>
                                 <option>2</option>
                                 <option>3</option>
                                 <option>4</option>
                                 <option>Unstageable</option>
                                 <option>DTI</option>
                               </select>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Primary Site</p>
                               <input 
                                 type="text" 
                                 placeholder="e.g. Coccyx"
                                 value={assessments.pressure_ulcers.site}
                                 onChange={e => setAssessments({...assessments, pressure_ulcers: {...assessments.pressure_ulcers, site: e.target.value}})}
                                 className="w-full bg-white border border-rose-100 p-2 rounded-lg font-black text-[10px] outline-none text-rose-600"
                               />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 12. Pain Assessment */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                          <Volume2 size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">XIII. Pain Assessment</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Pain Level (0-10)</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${assessments.pain.level > 5 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-emerald-900'}`}>{assessments.pain.level}</span>
                        </div>
                        <input type="range" min="0" max="10" step="1" value={assessments.pain.level} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, level: parseInt(e.target.value)}})} className="w-full accent-rose-500 mb-4" />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Location</p>
                            <input type="text" placeholder="e.g. Back" value={assessments.pain.location} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, location: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] outline-none" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Type</p>
                            <select value={assessments.pain.type} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, type: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>None</option>
                              <option>Aching</option>
                              <option>Sharp</option>
                              <option>Burning</option>
                              <option>Throbbing</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 13. Safety & Precautions */}
                    <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-900">
                          <ShieldCheck size={20} />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-900">XIV. Safety & Environmental</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-3">Safety Verification</p>
                          <div className="space-y-2">
                            {['Bed Lowest', 'Call Light', 'Side Rails', 'Floor Mats'].map(check => (
                              <button 
                                key={check} 
                                onClick={() => {
                                  const checks = assessments.adl.safety_checks.includes(check)
                                    ? assessments.adl.safety_checks.filter(c => c !== check)
                                    : [...assessments.adl.safety_checks, check];
                                  setAssessments({...assessments, adl: {...assessments.adl, safety_checks: checks}});
                                }}
                                className={`w-full py-2 px-4 rounded-lg text-left text-[9px] font-black border transition-all flex items-center justify-between ${assessments.adl.safety_checks.includes(check) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}
                              >
                                {check}
                                {assessments.adl.safety_checks.includes(check) && <Check size={12} />}
                              </button>
                            ))}
                          </div>
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
                          <h3 className="text-xs font-black text-emerald-900 uppercase tracking-[0.2em] mb-2">Clinical Narrative Progress Note</h3>
                          <p className="text-[10px] font-medium text-emerald-900 uppercase tracking-widest">Document the clinical story of the shift (DAR/SOAP Format).</p>
                        </div>
                        <select 
                          value={noteFocus} 
                          onChange={e => setNoteFocus(e.target.value)}
                          className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none text-emerald-900"
                        >
                          <option>Routine Shift Note</option>
                          <option>Change in Condition</option>
                          <option>Fall/Incident Report</option>
                          <option>Physician Notification</option>
                          <option>Family Update</option>
                          <option>Weekly Summary</option>
                        </select>
                      </div>

                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] font-black text-emerald-900 uppercase tracking-widest self-center mr-2">Quick Macros:</span>
                          {macros.map((m, i) => (
                            <button key={i} onClick={() => applyMacro(m.text)} className="px-4 py-2 bg-slate-50 hover:bg-quro-teal/10 hover:text-emerald-900 text-emerald-900 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100 transition-all">
                              {m.label}
                            </button>
                          ))}
                        </div>
                        <VoiceToSOAP onTranscribed={(text) => setNarrativeNote(prev => prev ? `${prev}\n\n${text}` : text)} />
                      </div>

                      <textarea 
                        value={narrativeNote}
                        onChange={(e) => setNarrativeNote(e.target.value)}
                        placeholder="Write your clinical note here... Use macros for rapid entry."
                        className="w-full h-[500px] p-8 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/20 transition-all mb-6 leading-relaxed"
                      />

                      <div className="flex justify-end gap-4">
                        <button 
                          onClick={() => handleSaveCharting(true)}
                          disabled={isSavingNote || !narrativeNote.trim()}
                          className="px-8 py-5 bg-white border border-slate-200 text-emerald-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3"
                        >
                          {isSavingNote ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button 
                          onClick={() => handleSaveCharting(false)}
                          disabled={isSavingNote || !narrativeNote.trim()}
                          className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center gap-3"
                        >
                          {isSavingNote ? 'Archiving...' : 'Finalize & Sign Record'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                     <div className="glass-card p-8 bg-slate-50 border border-slate-100 rounded-[2rem]">
                        <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-6">Note Guidelines</h3>
                        <div className="space-y-4">
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-quro-teal uppercase tracking-widest mb-1">Data</p>
                              <p className="text-[10px] text-emerald-900 font-medium">Objective observations and clinical facts.</p>
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-quro-teal uppercase tracking-widest mb-1">Action</p>
                              <p className="text-[10px] text-emerald-900 font-medium">Nursing interventions performed.</p>
                           </div>
                           <div className="p-4 bg-white rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-quro-teal uppercase tracking-widest mb-1">Response</p>
                              <p className="text-[10px] text-emerald-900 font-medium">Patient reaction and effectiveness of care.</p>
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
              <ShieldCheck size={18} className="text-emerald-900" />
              Clinical Summary
            </h3>
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-3">Dietary Order</p>
                <div className="flex items-center gap-3">
                  <Droplets size={20} className="text-emerald-900" />
                  <p className="text-lg font-black text-emerald-900 capitalize">{patient.diet || 'Regular'}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-3">Next Scheduled Vital</p>
                <div className="flex items-center gap-3 text-emerald-900">
                  <Clock size={20} />
                  <p className="text-sm font-bold">Today, 02:00 PM</p>
                </div>
              </div>

              <button className="w-full py-5 bg-emerald-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-950 transition-all shadow-xl shadow-emerald-900/20">
                Modify Treatment Plan
              </button>
            </div>
          </div>

          <div className="glass-card p-10 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden">
            <Phone className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-[0.2em] mb-6">Family Contacts</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-1">Primary Representative</p>
                <p className="text-lg font-black">Jane Thompson</p>
                <p className="text-xs font-medium text-emerald-900">555-0123 • Daughter</p>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900 mb-2">Document Certification</p>
            <p className="text-xs font-bold text-emerald-900">Generated via Quro Clinical Platform on {new Date().toLocaleString()}</p>
            <p className="text-xs text-emerald-900 italic mt-1">Official Clinical Record — Platinum Health Hub</p>
          </div>
          <div className="text-right">
            <div className="w-48 h-px bg-slate-300 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Nurse / Physician Signature</p>
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
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em]">Platinum Health Hub • Shift Certification (Side A)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">MRN: {patient?.mrn} • Room: {patient?.room_id}</p>
              <p className="text-xs font-black text-emerald-900 uppercase tracking-widest mt-1">Date: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-grow">
            {/* 1. Neurological */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                I. Neurological Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">A&O Level</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">A&O X {assessments.neuro.orientation.length}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">LOC</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.neuro.loc}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Orientation To</p>
                  <p className="text-[9px] font-black uppercase text-emerald-900 italic">
                    {assessments.neuro.orientation.join(', ') || 'No orientation markers noted'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Pupils</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.neuro.pupils}</p>
                </div>
              </div>
            </div>

            {/* 2. Cognitive */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                II. Cognitive Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Short-Term Memory</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.cognitive.short_term_memory}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Long-Term Memory</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.cognitive.long_term_memory}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Daily Decision Making</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.cognitive.decision_making}</p>
                </div>
              </div>
            </div>

            {/* 3. Sensory & Speech */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                III. Sensory & Communication
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Hearing</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.sensory.hearing}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Vision</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.sensory.vision}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Speech Pattern</p>
                  <p className="text-[11px] font-black uppercase text-emerald-900">{assessments.sensory.speech}</p>
                </div>
              </div>
            </div>

            {/* 4 & 5. Mood & Behavior */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                IV & V. Psycho-Social Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 border-b border-slate-100 pb-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-1">Mood Indicators (PHQ)</p>
                  <p className="text-[9px] font-black uppercase text-emerald-900 italic">
                    {assessments.mood.indicators.join(', ') || 'No mood distress noted'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-1">Behavioral Expressions</p>
                  <p className="text-[9px] font-black uppercase text-emerald-900 italic">
                    {assessments.behavior.types.join(', ') || 'No behavioral issues noted'}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Functional Status */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                VI. Functional Status (MDS)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase">
                <div className="text-emerald-900">Eating:</div>
                <div className="text-emerald-900">{assessments.functional.self_perf.eating} / {assessments.functional.support.eating}</div>
                <div className="text-emerald-900">Hygiene:</div>
                <div className="text-emerald-900">{assessments.functional.self_perf.hygiene} / {assessments.functional.support.hygiene}</div>
                <div className="text-emerald-900">Toileting:</div>
                <div className="text-emerald-900">{assessments.functional.self_perf.toileting} / {assessments.functional.support.toileting}</div>
                <div className="text-emerald-900">Mobility:</div>
                <div className="text-emerald-900">{assessments.functional.self_perf.mobility} / {assessments.functional.support.mobility}</div>
              </div>
            </div>

            {/* 7. Respiratory */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                VII. Respiratory System
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Breathing Pattern</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.pattern}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Breath Sounds</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.sounds}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">O2 Delivery</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.oxygen}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Cough</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.resp.cough}</p>
                </div>
              </div>
            </div>

            {/* 8. Cardiovascular */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                VIII. Cardiovascular
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Rhythm</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.rhythm}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Edema</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.cardio.edema} ({assessments.cardio.edema_location})</p>
                </div>
              </div>
            </div>

            {/* 9 & 10. GI & GU */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                IX & X. Elimination & Nutrition
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">BM Status</p>
                  <p className="text-[10px] font-black uppercase text-slate-900">Bristol Type {assessments.gi.stool_bristol}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Voiding Status</p>
                  <p className="text-[10px] font-black uppercase text-slate-900">{assessments.gu.voiding}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Shift Intake</p>
                  <p className="text-[10px] font-black uppercase text-slate-900">{assessments.gi.fluids_in_ml} mL / Appetite: {assessments.gi.appetite}</p>
                </div>
              </div>
            </div>

            {/* 11 & 12. Skin & Pressure Ulcers */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                XI & XII. Skin & Wound Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Skin Condition</p>
                  <p className="text-[10px] font-black uppercase text-slate-900">{assessments.skin.condition}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Pressure Ulcer</p>
                  <p className="text-[10px] font-black uppercase text-rose-600">
                    {assessments.pressure_ulcers.present ? `YES: STAGE ${assessments.pressure_ulcers.stage} @ ${assessments.pressure_ulcers.site}` : 'NONE NOTED'}
                  </p>
                </div>
              </div>
            </div>

            {/* 13. Pain */}
            <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/50">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-emerald-900 pb-2 text-emerald-900">
                XIII. Pain Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Level</p>
                  <p className="text-[11px] font-black uppercase text-slate-900">{assessments.pain.level} / 10</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Type/Site</p>
                  <p className="text-[10px] font-black uppercase text-slate-900">{assessments.pain.type} ({assessments.pain.location || 'N/A'})</p>
                </div>
              </div>
            </div>

            {/* 14. Safety */}
            <div className="border-2 border-slate-900 p-4 rounded-2xl bg-slate-900 text-white">
              <h3 className="text-[11px] font-black uppercase mb-4 border-b-2 border-white/20 pb-2 text-teal-400">
                XIV. Safety Rounds
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {assessments.adl.safety_checks.map(check => (
                  <span key={check} className="text-[9px] font-black uppercase flex items-center gap-1">
                    <span className="text-teal-400">✓</span> {check}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 flex justify-between items-end border-t-4 border-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-900 leading-tight">
              Quro Clinical Intelligence Platform • v4.5 Platinum<br />
              Generated Official Record • Page 1 of 2 (Side A)
            </div>
            <div className="text-right">
              <div className="w-64 h-0.5 bg-slate-900 mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-900 mb-1">Licensed Clinical Professional Signature</p>
              <p className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest">{staff?.first_name} {staff?.last_name}, RN ({new Date().toLocaleDateString()})</p>
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
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em]">Platinum Health Hub • Narrative Progress Notes (Side B)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">MRN: {patient?.mrn} • RM: {patient?.room_id}</p>
            </div>
          </div>

          <div className="border-4 border-slate-900 p-10 rounded-[2.5rem] flex-grow relative bg-slate-50/30">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Official Clinical Narrative (DAR/SOAP)</p>
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900 mb-4 border-b border-slate-200 pb-2">Shift Intervention Summary Checklist</p>
              <div className="grid grid-cols-2 gap-y-4">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">✓</div> 
                  Medications Administered
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">✓</div> 
                  Treatments Completed
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-5 h-5 border-2 border-slate-300 rounded" /> 
                  Physician Notified
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-5 h-5 border-2 border-slate-300 rounded" /> 
                  Family Notified
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900 mb-2">Authenticated By</p>
              <p className="text-sm font-black uppercase text-emerald-900 tracking-tight">{staff?.first_name} {staff?.last_name}, RN</p>
              <div className="w-full h-1 bg-slate-900 mt-2 shadow-sm" />
              <p className="text-[9px] font-black text-emerald-900 mt-2 uppercase tracking-widest">Electronic Hash: {patient?.id?.slice(0, 16)}</p>
            </div>
          </div>

          <div className="mt-8 pt-8 text-[10px] font-black uppercase tracking-[0.4em] text-emerald-900 text-center border-t border-slate-100">
            Official Clinical Record • Platinum Health Hub • Side B
          </div>
        </div>
      </div>

    {/* ============================================================ */}
    {/* eMAR COMPLIANCE MODALS */}
    {/* ============================================================ */}

    {/* 1. Re-Authentication PIN Modal */}
    {showPinModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
              <Shield size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Electronic Signature</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Enter your 4-digit PIN to authenticate</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pinEntry[i] ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50'}`}>
                  {pinEntry[i] ? '•' : ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (num === 'C') setPinEntry('');
                    else if (num === '✓') {
                      if (pinEntry.length === 4) handleSignAdministration();
                    }
                    else if (pinEntry.length < 4) setPinEntry(prev => prev + num);
                  }}
                  className={`h-16 rounded-2xl font-black text-lg transition-all ${
                    num === '✓' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                    num === 'C' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setShowPinModal(false)}
            className="w-full mt-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancel Administration
          </button>
        </div>
      </div>
    )}

    {/* 2. Mandatory Vitals Modal */}
    {showVitalsModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-inner">
              <Activity size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clinical Assessment Required</h3>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">High-Alert Medication Safety Check</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Medication Being Administered</p>
              <p className="text-lg font-black text-slate-900">{selectedMedForAction?.generic_name}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{selectedMedForAction?.dosage} • {selectedMedForAction?.frequency}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Blood Pressure (Systolic)</label>
                <input 
                  type="number"
                  placeholder="---"
                  value={vitalsEntry.bp_sys}
                  onChange={(e) => setVitalsEntry(prev => ({ ...prev, bp_sys: e.target.value }))}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-rose-500 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Blood Pressure (Diastolic)</label>
                <input 
                  type="number"
                  placeholder="---"
                  value={vitalsEntry.bp_dia}
                  onChange={(e) => setVitalsEntry(prev => ({ ...prev, bp_dia: e.target.value }))}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-rose-500 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heart Rate (BPM)</label>
                <input 
                  type="number"
                  placeholder="---"
                  value={vitalsEntry.hr}
                  onChange={(e) => setVitalsEntry(prev => ({ ...prev, hr: e.target.value }))}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-rose-500 focus:ring-0 transition-all outline-none"
                />
              </div>
            </div>

            <button 
              disabled={!vitalsEntry.bp_sys || !vitalsEntry.bp_dia || !vitalsEntry.hr}
              onClick={() => {
                setShowVitalsModal(false);
                setShowPinModal(true);
              }}
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-30"
            >
              Confirm Vitals & Proceed to Sign
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 3. Delay/Refusal Reason Modal */}
    {showDelayReasonModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compliance Override</h3>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Non-Administration Reason Required</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {['Refused', 'Sleeping', 'In Therapy', 'NPO', 'Off Unit', 'Out of Stock'].map(reason => (
                <button 
                  key={reason}
                  onClick={() => setDelayReason(reason)}
                  className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${
                    delayReason === reason ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea 
              placeholder="Additional clinical notes..."
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-sm min-h-[120px] focus:border-slate-900 focus:ring-0 outline-none"
            />

            <button 
              disabled={!delayReason}
              onClick={() => {
                setShowDelayReasonModal(false);
                setShowPinModal(true);
              }}
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-black transition-all disabled:opacity-30"
            >
              Authenticate Exception
            </button>
          </div>
        </div>
      </div>
    )}
    {/* 4. PRN Effectiveness Modal */}
    {showEffectivenessModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
              <Check size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">PRN Effectiveness Follow-up</h3>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Closing the Clinical Loop</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Medication Evaluated</p>
              <p className="text-lg font-black text-slate-900">{selectedMedForAction?.generic_name}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Administered 60m ago per protocol</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pain/Symptom Relief (1-10)</label>
              <div className="flex justify-between gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(score => (
                  <button 
                    key={score}
                    onClick={() => setEffectivenessScore(score)}
                    className={`flex-1 h-12 rounded-xl font-black text-xs transition-all ${
                      effectivenessScore === score ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Response Notes</label>
              <textarea 
                placeholder="Resident reports relief of pain. No adverse reactions noted..."
                value={effectivenessComment}
                onChange={(e) => setEffectivenessComment(e.target.value)}
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-sm min-h-[120px] focus:border-slate-900 focus:ring-0 outline-none"
              />
            </div>

            <button 
              disabled={!effectivenessScore || !effectivenessComment}
              onClick={() => {
                // In a real app, find the actual entry ID. For demo, we'll just close the modal.
                setShowEffectivenessModal(false);
                setEffectivenessScore(0);
                setEffectivenessComment('');
                setSelectedMedForAction(null);
              }}
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-30"
            >
              Finalize PRN Outcome
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

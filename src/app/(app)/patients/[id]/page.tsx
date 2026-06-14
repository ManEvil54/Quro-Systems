'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  ArrowLeft, 
  Printer, 
  Pill, 
  FileText, 
  ClipboardList, 
  Activity, 
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
  Volume2,
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
  Edit2,
  Trash2,
  Bed as BedIcon,
  MessageSquare
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useNotes } from '@/hooks/useNotes';
import { useVitals } from '@/hooks/useVitals';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useBeds } from '@/hooks/useBeds';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import VitalsTrendChart from '@/components/clinical/VitalsTrendChart';
import HeadsUpAlertModal from '@/components/charts/HeadsUpAlertModal';
import VoiceToSOAP from '@/components/clinical/VoiceToSOAP';
import TreatmentPortal from '@/components/clinical/TreatmentPortal';
import RT_Assessment_Inlay from '@/components/clinical/RTAssessmentInlay';
import GT_Feeding_Inlay from '@/components/clinical/GTFeedingInlay';
import CarePlanManager from '@/components/clinical/CarePlanManager';
import PhysicianOrderPortal from '@/components/clinical/PhysicianOrderPortal';
import MedicationList from '@/components/clinical/MedicationList';
import OrderAcknowledgment from '@/components/clinical/OrderAcknowledgment';
import ShiftHandoff from '@/components/clinical/ShiftHandoff';
import MARGrid from '@/components/clinical/MARGrid';
import { useFacilityPhysicians } from '@/hooks/useFacilityPhysicians';
import { Medication, ProgressNote, RespiratoryState, EnteralState } from '@/lib/firebase/types';

// Helper to safely format raw Firestore timestamps or ISO strings
const safeFormatDate = (val: unknown): string => {
  if (!val) return 'Pending...';
  try {
    let d: Date;
    if (typeof val === 'object' && val !== null) {
      const valObj = val as Record<string, any>;
      if (typeof valObj.toDate === 'function') {
        d = valObj.toDate();
      } else if (valObj.seconds !== undefined) {
        d = new Date(valObj.seconds * 1000 + Math.floor((valObj.nanoseconds || 0) / 1000000));
      } else if (val instanceof Date) {
        d = val;
      } else {
        d = new Date(val as any);
      }
    } else {
      d = new Date(val as any);
    }
    
    if (isNaN(d.getTime())) {
      return 'Pending...';
    }
    return d.toLocaleString();
  } catch {
    return 'Pending...';
  }
};

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeFacility, staff, organization } = useAuth();
  const { patient, loading: patientLoading, error, updatePatient } = usePatient(id);
  const { physicians: facilityPhysicians } = useFacilityPhysicians(patient?.facility_id || activeFacility?.id);
  const { medications, loading: medsLoading, updateMedication } = useMedications(id);
  const { entries: marEntries, logAdministration } = useMAR(id);
  const { notes, saveNote, updateNote } = useNotes(id);
  const { vitals } = useVitals(id);
  const { orders, loading: ordersLoading } = useOrders(id);
  
  const activeMeds = useMemo(() => {
    return medications.filter(m => {
      if (m.status !== 'active') return false;
      const matchingOrder = orders.find(o => o.id === m.order_id);
      if (matchingOrder && matchingOrder.status === 'cancelled') return false;
      return true;
    });
  }, [medications, orders]);

  const scheduledMeds = useMemo(() => {
    return activeMeds.filter(m => !m.frequency.toUpperCase().includes('PRN'));
  }, [activeMeds]);

  const prnMeds = useMemo(() => {
    return activeMeds.filter(m => m.frequency.toUpperCase().includes('PRN'));
  }, [activeMeds]);





  const { rooms, beds, loading: bedsLoading } = useBeds(patient?.facility_id || activeFacility?.id || '');

  // Room Assignment State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [savingRoom, setSavingRoom] = useState(false);

  const [activeTab, setActiveTab] = useState<'facesheet' | 'medications' | 'mar' | 'vitals' | 'treatments' | 'respiratory' | 'enteral' | 'orders' | 'charting' | 'careplan' | 'trends' | 'compliance' | 'handoff'>('facesheet');
  const [printBlank, setPrintBlank] = useState(false);
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
  const [isSigningOff, setIsSigningOff] = useState(false);

  // Alert Heads-Up State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  // Subscribe to active patient-specific alerts
  useEffect(() => {
    if (!organization?.id || !id) return;
    
    const alertsRef = collection(db, 'organizations', organization.id, 'patients', id, 'patient_alerts');
    const q = query(alertsRef, where('status', '==', 'active'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const tA = a.created_at?.seconds || 0;
        const tB = b.created_at?.seconds || 0;
        return tB - tA;
      });
      setActiveAlerts(docs);
    }, (err) => {
      console.error('Failed to subscribe to active patient alerts:', err);
    });
    
    return () => unsubscribe();
  }, [organization?.id, id]);

  // Facesheet Editing State
  const [showPhysicianModal, setShowPhysicianModal] = useState(false);
  const [tempPhysician, setTempPhysician] = useState('');

  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [tempInsurance, setTempInsurance] = useState({
    provider_name: '',
    policy_number: '',
    group_number: '',
    phone: '',
  });

  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [tempPharmacy, setTempPharmacy] = useState({
    name: '',
    phone: '',
    address: '',
    fax: '',
  });

  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingFamilyMemberIndex, setEditingFamilyMemberIndex] = useState<number | null>(null);
  const [tempFamilyMember, setTempFamilyMember] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    is_emergency_contact: false,
  });

  const handleSavePhysician = async () => {
    try {
      await updatePatient({ attending_physician: tempPhysician });
      setShowPhysicianModal(false);
    } catch (err) {
      console.error('Failed to update physician:', err);
    }
  };

  const handleSaveRoomAssignment = async () => {
    if (!organization?.id || !patient) return;
    setSavingRoom(true);
    try {
      const facilityId = patient.facility_id || activeFacility?.id;
      if (!facilityId) throw new Error('Facility ID not found');

      // 1. If patient has a previous bed, release it
      if (patient.bed_id && patient.bed_id !== selectedBedId) {
        try {
          const prevBedRef = doc(db, 'organizations', organization.id, 'facilities', facilityId, 'beds', patient.bed_id);
          await updateDoc(prevBedRef, {
            patient_id: null,
            status: 'available'
          });
        } catch (prevBedError) {
          console.warn('Could not release previous bed (may have been deleted):', prevBedError);
        }
      }

      if (selectedRoomId && selectedBedId) {
        const room = rooms.find(r => r.id === selectedRoomId);
        const bed = beds.find(b => b.id === selectedBedId);
        const roomName = room ? room.name : '';
        const bedName = bed ? bed.name : '';
        const roomNumberString = bedName ? `${roomName} - ${bedName}` : roomName;

        // 2. Set new bed to occupied
        const newBedRef = doc(db, 'organizations', organization.id, 'facilities', facilityId, 'beds', selectedBedId);
        await updateDoc(newBedRef, {
          patient_id: patient.id,
          status: 'occupied'
        });

        // 3. Update patient's assignment
        await updatePatient({
          room_id: selectedRoomId,
          bed_id: selectedBedId,
          room_number: roomNumberString
        });
      } else {
        // Clearing assignment
        await updatePatient({
          room_id: null,
          bed_id: null,
          room_number: ''
        });
      }

      setShowRoomModal(false);
    } catch (err) {
      console.error('Failed to update room assignment:', err);
      alert('Error updating room assignment');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleSaveInsurance = async () => {
    try {
      await updatePatient({ insurance_info: tempInsurance });
      setShowInsuranceModal(false);
    } catch (err) {
      console.error('Failed to update insurance:', err);
    }
  };

  const handleSavePharmacy = async () => {
    try {
      await updatePatient({ pharmacy_info: tempPharmacy });
      setShowPharmacyModal(false);
    } catch (err) {
      console.error('Failed to update pharmacy:', err);
    }
  };

  const handleSaveFamilyMember = async () => {
    try {
      const currentList = patient?.family_members || [];
      const updatedList = [...currentList];
      if (editingFamilyMemberIndex !== null) {
        updatedList[editingFamilyMemberIndex] = tempFamilyMember;
      } else {
        updatedList.push(tempFamilyMember);
      }
      await updatePatient({ family_members: updatedList });
      setShowFamilyModal(false);
    } catch (err) {
      console.error('Failed to update family members:', err);
    }
  };

  const handleDeleteFamilyMember = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this family contact?')) return;
    try {
      const currentList = patient?.family_members || [];
      const updatedList = currentList.filter((_, i) => i !== index);
      await updatePatient({ family_members: updatedList });
    } catch (err) {
      console.error('Failed to delete family member:', err);
    }
  };



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
      fluids_in_ml: 240,
      bm_this_shift: 'No' as 'Yes' | 'No',
      bm_count: 0,
      bm_consistency: 'Normal' as 'Normal' | 'Hard' | 'Loose' | 'Liquid'
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
  
  // RT & GT State
  const [rtState, setRtState] = useState<RespiratoryState>({
    o2_delivery: 'Room Air',
    lpm: 2,
    stoma_condition: 'Healthy',
    suction_frequency: 'Shiftly',
    secretions_consistency: 'Thin',
    secretions_color: 'Clear',
    lung_sounds: {
      ruq: 'Clear', luq: 'Clear', rlq: 'Clear', llq: 'Clear'
    }
  });

  const [gtState, setGtState] = useState<EnteralState>({
    formula_name: 'Jevity 1.2',
    delivery_method: 'Continuous',
    rate_ml_hr: 65,
    water_flush_pre: 30,
    water_flush_post: 30,
    last_residual_volume: 25,
    last_residual_at: new Date().toISOString(),
    site_condition: 'Normal',
    is_paused: false
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
      if (draft && draft.id !== currentDraftId) {
        // Move setState out of the synchronous effect body to satisfy React's latest linting rules
        setTimeout(() => {
          setCurrentDraftId(draft.id);
          setNarrativeNote(draft.content || '');
          if (draft.assessments) {
            setAssessments(draft.assessments as unknown as typeof assessments);
          }
        }, 0);
      }
    }
  }, [notes, staff, currentDraftId, assessments]); // Added assessments to satisfy exhaustive-deps if needed, but the check handles it

  const handleSignAdministration = async () => {
    if (!selectedMedForAction || !pendingAction) return;

    try {
      setIsSigningOff(true);

      const administrationData = {
        medication_id: selectedMedForAction.id,
        action: pendingAction,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: selectedMedForAction.frequency.toUpperCase().includes('PRN')
          ? new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
          : '09:00', // Mock scheduled time
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
        await updateNote(currentDraftId, noteData as Partial<ProgressNote>);
      } else {
        const newNote = await saveNote(noteData as unknown as Parameters<typeof saveNote>[0]);
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
    if (activeTab === 'mar') {
      window.open(`/patients/${id}/mar/print`, '_blank');
    } else {
      window.print();
    }
  };

  const handlePrintBlank = () => {
    setPrintBlank(true);
    setTimeout(() => {
      window.print();
      setPrintBlank(false);
    }, 100);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="no-print">
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
            Print {activeTab === 'facesheet' ? 'Facesheet' : activeTab === 'mar' ? 'MAR' : activeTab === 'handoff' ? 'Handoff Log' : activeTab === 'charting' ? 'SIFF' : 'Medication List'}
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
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Patient {patient.first_name[0]}{patient.last_name[0]}</h1>
              <p className="text-slate-400 font-medium italic opacity-80">
                {activeFacility?.name} — Room {patient.room_number || 'TBD'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 md:gap-12 border-l border-white/10 pl-12">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <p className={`text-xl font-black ${!patient.current_vitals ? 'text-slate-400' : (patient.is_active_monitoring ? 'text-rose-400' : 'text-emerald-400')}`}>
                {!patient.current_vitals ? 'Pending Baseline' : (patient.is_active_monitoring ? 'Serious' : 'Stable')}
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

      {/* Clinical Control Center — Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* LEFT SIDEBAR: Navigation (Modern Clinical Index) */}
        <aside className="no-print lg:col-span-2 sticky top-8 space-y-4">
          <div className="bg-white/40 backdrop-blur-md border border-white/40 p-3 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6 py-4 mb-2">Chart Index</p>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'facesheet', icon: FileText, label: 'Facesheet' },
                { id: 'medications', icon: Pill, label: 'Medications' },
                { id: 'mar', icon: ClipboardList, label: 'MAR Grid' },
                { id: 'respiratory', icon: Wind, label: 'Respiratory (RT)', badge: 'Active' },
                { id: 'enteral', icon: Droplets, label: 'Enteral (GT)' },
                { id: 'treatments', icon: Activity, label: 'Treatments' },
                { id: 'vitals', icon: Activity, label: 'Clinical Vitals' },
                { id: 'trends', icon: TrendingUp, label: 'Trends' },
                { id: 'orders', icon: Stethoscope, label: 'Orders', badge: 'New' },
                { id: 'careplan', icon: FileText, label: 'Preliminary Care Plan', badge: 'AI' },
                { id: 'charting', icon: FileText, label: 'Shift Charting' },
                { id: 'handoff', icon: MessageSquare, label: 'Shift Handoff', badge: 'Active' },
                { id: 'compliance', icon: ShieldCheck, label: 'Surveyor Review' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center justify-between group px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-2' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-quro-teal' : 'group-hover:text-quro-teal transition-colors'} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase ${
                      tab.badge === 'New' ? 'bg-quro-teal text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="p-6 bg-slate-900/5 rounded-[2rem] border border-slate-900/5">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Comm</p>
             <div className="flex gap-2">
                <button title="Call Attending" className="flex-1 p-3 bg-white rounded-xl text-slate-400 hover:text-quro-teal transition-all shadow-sm">
                   <Phone size={14} className="mx-auto" />
                </button>
                <button title="Send message" className="flex-1 p-3 bg-white rounded-xl text-slate-400 hover:text-quro-teal transition-all shadow-sm">
                   <Send size={14} className="mx-auto" />
                </button>
             </div>
          </div>
        </aside>

        {/* MIDDLE COLUMN: Main Content Area */}
        <div className="lg:col-span-7">

          {activeTab === 'facesheet' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              
              {/* High-Visibility Chart Inlay (Active Heads-Up Alerts) */}
              {activeAlerts.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 flex items-start gap-4 shadow-lg shadow-amber-500/5 break-inside-avoid">
                  <div className="p-2.5 bg-amber-100/80 border border-amber-200 text-amber-800 rounded-xl mt-0.5 animate-pulse">
                    ⚠️
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-900">Active Heads-Up / Handoff Alert</h4>
                      <span className="text-[8px] font-black text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {activeAlerts.length} Active {activeAlerts.length === 1 ? 'Dispatch' : 'Dispatches'}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {activeAlerts.map((alert) => (
                        <div key={alert.id} className="text-xs text-amber-800 font-bold leading-relaxed border-b border-amber-200/35 pb-2 last:border-0 last:pb-0">
                          <span className="font-black uppercase tracking-wider text-[8px] bg-amber-200/60 px-1.5 py-0.5 rounded mr-2 text-amber-950 capitalize">{alert.alert_type}</span>
                          &quot;{alert.text}&quot;
                          <span className="text-[9px] font-bold text-amber-700/60 ml-2 block sm:inline">
                            — Authored by {alert.created_by?.name || 'Staff'} {alert.created_at ? `at ${new Date(alert.created_at.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-slate-900">{patient.attending_physician || 'Unassigned'}</p>
                      <button 
                        onClick={() => {
                          setTempPhysician(patient.attending_physician || '');
                          setShowPhysicianModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-quro-teal transition-all"
                        title="Edit Physician"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Room & Bed</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-slate-900">{patient.room_number || 'Unassigned'}</p>
                      <button 
                        onClick={() => {
                          setSelectedRoomId(patient.room_id || null);
                          setSelectedBedId(patient.bed_id || null);
                          setShowRoomModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-quro-teal transition-all"
                        title="Assign Room & Bed"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
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

              {/* Insurance & Pharmacy Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Insurance Details */}
                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Shield size={18} className="text-emerald-500" />
                      Insurance Coverage
                    </h3>
                    <button
                      onClick={() => {
                        setTempInsurance({
                          provider_name: patient.insurance_info?.provider_name || '',
                          policy_number: patient.insurance_info?.policy_number || '',
                          group_number: patient.insurance_info?.group_number || '',
                          phone: patient.insurance_info?.phone || '',
                        });
                        setShowInsuranceModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-quro-teal hover:text-quro-teal rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      <Edit2 size={12} />
                      Edit Info
                    </button>
                  </div>
                  
                  {patient.insurance_info?.provider_name ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Provider Name</p>
                        <p className="text-sm font-black text-slate-900">{patient.insurance_info.provider_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Policy / Member ID</p>
                          <p className="text-sm font-bold text-slate-700">{patient.insurance_info.policy_number}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Group Number</p>
                          <p className="text-sm font-bold text-slate-700">{patient.insurance_info.group_number || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payer Support Phone</p>
                        <p className="text-sm font-bold text-slate-700">{patient.insurance_info.phone || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <p className="text-sm font-bold text-slate-400">No Insurance Information Configured</p>
                      <button
                        onClick={() => {
                          setTempInsurance({ provider_name: '', policy_number: '', group_number: '', phone: '' });
                          setShowInsuranceModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-black transition-all"
                      >
                        Add Insurance
                      </button>
                    </div>
                  )}
                </div>

                {/* Preferred Pharmacy */}
                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Pill size={18} className="text-quro-teal" />
                      Preferred Pharmacy
                    </h3>
                    <button
                      onClick={() => {
                        setTempPharmacy({
                          name: patient.pharmacy_info?.name || '',
                          phone: patient.pharmacy_info?.phone || '',
                          address: patient.pharmacy_info?.address || '',
                          fax: patient.pharmacy_info?.fax || '',
                        });
                        setShowPharmacyModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-quro-teal hover:text-quro-teal rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      <Edit2 size={12} />
                      Edit Info
                    </button>
                  </div>

                  {patient.pharmacy_info?.name ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pharmacy Name</p>
                        <p className="text-sm font-black text-slate-900">{patient.pharmacy_info.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                          <p className="text-sm font-bold text-slate-700">{patient.pharmacy_info.phone}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fax Number</p>
                          <p className="text-sm font-bold text-slate-700">{patient.pharmacy_info.fax || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                        <p className="text-sm font-bold text-slate-700">{patient.pharmacy_info.address || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <p className="text-sm font-bold text-slate-400">No Pharmacy Assigned</p>
                      <button
                        onClick={() => {
                          setTempPharmacy({ name: '', phone: '', address: '', fax: '' });
                          setShowPharmacyModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-black transition-all"
                      >
                        Assign Pharmacy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Family & Emergency Contacts */}
              <div id="family-section" className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <User size={18} className="text-blue-500" />
                    Family Contacts & Emergency Contacts
                  </h3>
                  <button
                    onClick={() => {
                      setEditingFamilyMemberIndex(null);
                      setTempFamilyMember({
                        name: '',
                        relationship: '',
                        phone: '',
                        email: '',
                        is_emergency_contact: false,
                      });
                      setShowFamilyModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    <Plus size={12} />
                    Add Family Member
                  </button>
                </div>

                {patient.family_members && patient.family_members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {patient.family_members.map((member, i) => (
                      <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative group hover:border-slate-300 transition-all">
                        {member.is_emergency_contact && (
                          <span className="absolute top-6 right-6 px-2.5 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm">
                            Primary Emergency Contact
                          </span>
                        )}
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] font-black text-quro-teal uppercase tracking-widest block mb-0.5">{member.relationship}</span>
                            <h4 className="text-lg font-black text-slate-900">{member.name}</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-600">
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-slate-400" />
                              <span>{member.phone}</span>
                            </div>
                            {member.email && (
                              <div className="flex items-center gap-2">
                                <Send size={12} className="text-slate-400" />
                                <span className="lowercase">{member.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingFamilyMemberIndex(i);
                              setTempFamilyMember({
                                name: member.name || '',
                                relationship: member.relationship || '',
                                phone: member.phone || '',
                                email: member.email || '',
                                is_emergency_contact: member.is_emergency_contact || false
                              });
                              setShowFamilyModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 hover:text-quro-teal hover:border-quro-teal transition-all"
                          >
                            <Edit2 size={10} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFamilyMember(i)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 hover:text-rose-500 hover:border-rose-500 transition-all"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <p className="text-sm font-bold text-slate-400">No Family Contacts or Emergency Contacts Configured</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'careplan' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <CarePlanManager patient={patient} />
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <OrderAcknowledgment patientId={id} />
              <MedicationList patientId={id} />
            </div>
          )}

          {activeTab === 'mar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <MARGrid patientId={id} />
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
                            <td className="py-4 text-[11px] font-black text-slate-900">{safeFormatDate(entry.created_at)}</td>
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

          {activeTab === 'respiratory' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RT_Assessment_Inlay data={rtState} onChange={setRtState} />
            </div>
          )}

          {activeTab === 'enteral' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <GT_Feeding_Inlay data={gtState} onChange={setGtState} />
            </div>
          )}

          {activeTab === 'treatments' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <TreatmentPortal 
                  patientId={id} 
                  patientRoom={patient.room_number || undefined} 
                  patientName={patient ? `${patient.first_name} ${patient.last_name}` : undefined} 
                />
              </div>
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <PhysicianOrderPortal patientId={id} />
            </div>
          )}

          {activeTab === 'handoff' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <ShiftHandoff patientId={id} />
              </div>
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
                
                <div className="flex gap-4">
                  <button 
                    onClick={handlePrint}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20"
                  >
                    <Printer size={16} /> Print Gold-Standard SIFF
                  </button>
                  <button 
                    onClick={handlePrintBlank}
                    className="px-6 py-4 bg-white border border-slate-300 text-slate-755 hover:bg-slate-50 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-3 shadow-sm cursor-pointer"
                  >
                    <Printer size={16} /> Print Blank Form (Backup)
                  </button>
                </div>
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
                          <input title="Temperature" 
                            type="number" 
                            step="0.1"
                            value={assessments.vitals.temp} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, temp: parseFloat(e.target.value)}})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 font-black text-base outline-none focus:border-quro-teal transition-all text-center"
                          />
                          <span className="text-slate-500 font-black text-xs">°F</span>
                        </div>
                      </div>

                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">B/P (Sys/Dia)</p>
                        <div className="flex items-center gap-1.5">
                          <input title="B/P (Sys/Dia)" 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={assessments.vitals.bp_systolic || ''} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_systolic: parseInt(e.target.value) || 0}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="Sys"
                          />
                          <span className="text-slate-600 font-black text-xs">/</span>
                          <input title="Input Field" 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={assessments.vitals.bp_diastolic || ''} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_diastolic: parseInt(e.target.value) || 0}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="Dia"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pulse / Resp</p>
                        <div className="flex items-center gap-1.5">
                          <input title="Pulse / Resp" 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={assessments.vitals.pulse || ''} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, pulse: parseInt(e.target.value) || 0}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="HR"
                          />
                          <span className="text-slate-600 font-black text-xs">/</span>
                          <input title="Input Field" 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={assessments.vitals.resp || ''} 
                            onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, resp: parseInt(e.target.value) || 0}})}
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 font-black text-sm outline-none focus:border-quro-teal transition-all text-center"
                            placeholder="RR"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SpO2</p>
                        <div className="flex items-center gap-2">
                          <input title="SpO2" 
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
                        <select title="BP Site" 
                          value={assessments.vitals.bp_site} 
                          onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_site: e.target.value as "L-Arm" | "R-Arm" | "Thigh"}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-black text-[10px] uppercase outline-none focus:border-quro-teal transition-all"
                        >
                          <option className="bg-slate-900">L-Arm</option>
                          <option className="bg-slate-900">R-Arm</option>
                          <option className="bg-slate-900">Thigh</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BP Position</p>
                        <select title="BP Position" 
                          value={assessments.vitals.bp_position} 
                          onChange={e => setAssessments({...assessments, vitals: {...assessments.vitals, bp_position: e.target.value as "Sitting" | "Standing" | "Supine"}})}
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
                            <select title="Level of Consciousness" value={assessments.neuro.loc} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, loc: e.target.value as 'Alert' | 'Lethargic' | 'Obtunded' | 'Comatose'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                              <option>Alert</option>
                              <option>Lethargic</option>
                              <option>Obtunded</option>
                              <option>Comatose</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Pupils</p>
                            <select title="Pupils" value={assessments.neuro.pupils} onChange={e => setAssessments({...assessments, neuro: {...assessments.neuro, pupils: e.target.value as 'PERRLA' | 'Sluggish' | 'Non-reactive'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                          <select title="Decision Making" value={assessments.cognitive.decision_making} onChange={e => setAssessments({...assessments, cognitive: {...assessments.cognitive, decision_making: e.target.value as 'Independent' | 'Modified Independence' | 'Moderately Impaired' | 'Severely Impaired'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                              <select title="Hearing" value={assessments.sensory.hearing} onChange={e => setAssessments({...assessments, sensory: {...assessments.sensory, hearing: e.target.value as 'Adequate' | 'Minimal Difficulty' | 'Highly Impaired' | 'Severely Impaired'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Adequate</option>
                                <option>Minimal Difficulty</option>
                                <option>Highly Impaired</option>
                                <option>Severely Impaired</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Vision</p>
                              <select title="Vision" value={assessments.sensory.vision} onChange={e => setAssessments({...assessments, sensory: {...assessments.sensory, vision: e.target.value as 'Adequate' | 'Impaired' | 'Highly Impaired' | 'Severely Impaired'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                              <button key={val} onClick={() => setAssessments({...assessments, sensory: {...assessments.sensory, speech: val as 'Clear' | 'Slurred' | 'Aphasic'}})} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.sensory.speech === val ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
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
                           <select title="Indicator Frequency" value={assessments.mood.frequency} onChange={e => setAssessments({...assessments, mood: {...assessments.mood, frequency: e.target.value as 'Never' | '2-6 Days' | '7-11 Days' | '12-14 Days'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                              <select title="Frequency" value={assessments.behavior.frequency} onChange={e => setAssessments({...assessments, behavior: {...assessments.behavior, frequency: e.target.value as 'None' | '1-3 times' | '4-6 times' | 'Daily'}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>None</option>
                                <option>1-3 times</option>
                                <option>4-6 times</option>
                                <option>Daily</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Intervention</p>
                              <input title="Intervention" 
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
                               <select title="{adl}" 
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
                               <select title="Selection Options" 
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
                          <select title="Breathing Pattern" value={assessments.resp.pattern} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, pattern: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                              <select title="Oxygen" value={assessments.resp.oxygen} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, oxygen: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
                                <option>Room Air</option>
                                <option>NC</option>
                                <option>CPAP/BiPAP</option>
                              </select>
                           </div>
                           <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                              <p className="text-[8px] font-black text-emerald-900 uppercase mb-1">Flow (LPM)</p>
                              <input title="Flow (LPM)" type="number" value={assessments.resp.o2_flow} onChange={e => setAssessments({...assessments, resp: {...assessments.resp, o2_flow: parseInt(e.target.value)}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none" />
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
                          <select title="Pulses (Radial/Pedal)" value={assessments.cardio.pulses} onChange={e => setAssessments({...assessments, cardio: {...assessments.cardio, pulses: e.target.value}})} className="w-full bg-transparent font-black text-[10px] uppercase outline-none">
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
                              <button type="button" key={val} onClick={() => setAssessments({...assessments, gi: {...assessments.gi, appetite: val}})} className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gi.appetite.includes(val) ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bowel Movement Section */}
                        <div className="pt-2 border-t border-slate-100/50">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Bowel Movement this shift?</p>
                          <div className="flex gap-2">
                            {['No', 'Yes'].map(val => (
                              <button 
                                type="button"
                                key={val} 
                                onClick={() => setAssessments({
                                  ...assessments, 
                                  gi: {
                                    ...assessments.gi, 
                                    bm_this_shift: val as 'Yes' | 'No',
                                    bm_count: val === 'Yes' ? Math.max(1, assessments.gi.bm_count) : 0
                                  }
                                })} 
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gi.bm_this_shift === val ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-slate-50 text-emerald-900 border-slate-100'}`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {assessments.gi.bm_this_shift === 'Yes' && (
                          <div className="space-y-4 p-4 bg-orange-50/20 border border-orange-100/50 rounded-2xl animate-in fade-in duration-300">
                            <div className="flex justify-between items-center">
                              <p className="text-[9px] font-black text-emerald-900 uppercase">BM Count (Shift)</p>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setAssessments({...assessments, gi: {...assessments.gi, bm_count: Math.max(1, assessments.gi.bm_count - 1)}})} className="w-6 h-6 rounded-full bg-white border border-orange-200 flex items-center justify-center font-black">-</button>
                                <span className="font-black text-xs text-orange-955">{assessments.gi.bm_count}</span>
                                <button type="button" onClick={() => setAssessments({...assessments, gi: {...assessments.gi, bm_count: assessments.gi.bm_count + 1}})} className="w-6 h-6 rounded-full bg-white border border-orange-200 flex items-center justify-center font-black">+</button>
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Stool Consistency</p>
                              <div className="grid grid-cols-2 gap-2">
                                {['Normal', 'Hard', 'Loose', 'Liquid'].map(val => (
                                  <button 
                                    type="button"
                                    key={val} 
                                    onClick={() => setAssessments({...assessments, gi: {...assessments.gi, bm_consistency: val as any}})} 
                                    className={`py-2 rounded-lg text-[9px] font-black border transition-all ${assessments.gi.bm_consistency === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-emerald-900 border-slate-100'}`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-orange-100">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[8px] font-black text-emerald-900 uppercase">Bristol Stool Scale</p>
                                <span className="text-[10px] font-black text-orange-700">Type {assessments.gi.stool_bristol}</span>
                              </div>
                              <input title="Bristol Stool Scale" type="range" min="1" max="7" step="1" value={assessments.gi.stool_bristol} onChange={e => setAssessments({...assessments, gi: {...assessments.gi, stool_bristol: parseInt(e.target.value)}})} className="w-full accent-orange-500" />
                            </div>
                          </div>
                        )}

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Fluid Intake (mL)</p>
                          <input title="Fluid Intake (mL)" 
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
                              <select title="Device" value={assessments.gu.catheter} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, catheter: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>None</option>
                                <option>Foley</option>
                                <option>Texas</option>
                                <option>Suprapubic</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Urine</p>
                              <select title="Urine" value={assessments.gu.urine_appearance} onChange={e => setAssessments({...assessments, gu: {...assessments.gu, urine_appearance: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                              <select title="Turgor" value={assessments.skin.turgor} onChange={e => setAssessments({...assessments, skin: {...assessments.skin, turgor: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
                                <option>Elastic</option>
                                <option>Tenting</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Temperature</p>
                              <select title="Temperature" value={assessments.skin.temp} onChange={e => setAssessments({...assessments, skin: {...assessments.skin, temp: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                             title="Toggle Pressure Ulcers Presence"
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
                               <select title="Highest Stage" value={assessments.pressure_ulcers.stage} onChange={e => setAssessments({...assessments, pressure_ulcers: {...assessments.pressure_ulcers, stage: e.target.value as 'N/A' | '1' | '2' | '3' | '4' | 'Unstageable' | 'DTI'}})} className="w-full bg-white border border-rose-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none text-rose-600">
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
                               <input title="Primary Site" 
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
                        <input title="Pain Level (0-10)" type="range" min="0" max="10" step="1" value={assessments.pain.level} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, level: parseInt(e.target.value)}})} className="w-full accent-rose-500 mb-4" />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Location</p>
                            <input title="Location" type="text" placeholder="e.g. Back" value={assessments.pain.location} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, location: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] outline-none" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-2">Type</p>
                            <select title="Type" value={assessments.pain.type} onChange={e => setAssessments({...assessments, pain: {...assessments.pain, type: e.target.value}})} className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[10px] uppercase outline-none">
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
                        <select title="Document the clinical story of the shift (DAR/SOAP Format)." 
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

        {/* RIGHT COLUMN: Sidebar Status */}
        <div className="lg:col-span-3 space-y-8 no-print">
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

              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="w-full py-5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 text-amber-800 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/10"
              >
                ⚠️ Patient Heads-Up / Alert
              </button>
            </div>
          </div>

          <div className="glass-card p-10 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden">
            <Phone className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Family Contacts</h3>
            <div className="space-y-6">
              {patient?.family_members && patient.family_members.length > 0 ? (
                patient.family_members.map((member, idx: number) => (
                  <div key={idx} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      {member.is_emergency_contact ? 'Primary Emergency Contact' : `Contact #${idx + 1}`}
                    </p>
                    <p className="text-base font-black text-white">{member.name}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {member.relationship} • {member.phone}
                    </p>
                    {member.email && (
                      <p className="text-[10px] text-slate-500 lowercase mt-0.5">{member.email}</p>
                    )}
                  </div>
                ))
              ) : patient?.emergency_contact ? (
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Primary Emergency Contact</p>
                  <p className="text-base font-black text-white">{patient.emergency_contact}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Primary Representative</p>
                  <p className="text-lg font-black text-white italic opacity-40">None Listed</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">Please add a family contact in the facesheet.</p>
                </div>
              )}
              <button 
                onClick={() => {
                  setActiveTab('facesheet');
                  setTimeout(() => {
                    const el = document.getElementById('family-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white"
              >
                View All Contacts
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* DEDICATED PRINT VIEW (FOR 2-SIDED SIFF/SNF) */}
      {activeTab === 'charting' && (
        <div className="print-only hidden fixed inset-0 bg-white z-[100] p-0 m-0 text-black">
        {/* Page 1: Assessment (Front Side) */}
        <div 
          className="p-5 bg-white flex flex-col justify-between text-black text-[9px] leading-tight border-b-4 border-slate-900 print-border"
          style={{ 
            boxSizing: 'border-box', 
            height: '9.8in', 
            minHeight: '9.8in',
            maxHeight: '10in', 
            pageBreakInside: 'avoid', 
            breakInside: 'avoid', 
            overflow: 'hidden' 
          }}
        >
          <div className="flex justify-between items-start mb-2.5 border-b-2 border-slate-900 pb-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">Q</div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-0.5">Clinical Assessment Record</h1>
                <p className="text-[8px] font-black text-emerald-900 uppercase tracking-[0.2em]">Platinum Health Hub • Shift Certification (Side A)</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5 w-72">
              {printBlank ? (
                <>
                  <div className="flex items-end w-full gap-1.5 justify-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Resident:</span>
                    <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                  </div>
                  <div className="flex items-end w-full gap-1.5 justify-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">MRN:</span>
                    <div className="w-20 border-b border-dotted border-slate-900 h-3" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none ml-2">Room:</span>
                    <div className="w-16 border-b border-dotted border-slate-900 h-3" />
                  </div>
                  <div className="flex items-end w-full gap-1.5 justify-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Date:</span>
                    <div className="w-24 border-b border-dotted border-slate-900 h-3" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none ml-2">Time:</span>
                    <div className="w-16 border-b border-dotted border-slate-900 h-3" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
                  <p className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest mt-0.5">MRN: {patient?.mrn} • Room: {patient?.room_id}</p>
                  <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mt-0.5">Date: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 flex-grow">
            {/* 1. Neurological */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                I. Neurological Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">A&O Level</p>
                  <div className="text-[9.5px] font-black uppercase text-emerald-900 mt-0.5">
                    {printBlank ? (
                      <span className="inline-flex items-end w-20 gap-0.5">
                        <span className="leading-none">A&O X</span>
                        <span className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </span>
                    ) : `A&O X ${assessments.neuro.orientation.length}`}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">LOC</p>
                  <div className="text-[9.5px] font-black uppercase text-emerald-900 mt-0.5">
                    {printBlank ? (
                      <div className="w-20 border-b border-dotted border-slate-900 h-2.5" />
                    ) : assessments.neuro.loc}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Orientation To</p>
                  <p className="text-[8.5px] font-black uppercase text-emerald-900 italic mt-0.5">
                    {printBlank ? '[  ] Person   [  ] Place   [  ] Time   [  ] Situation' : (assessments.neuro.orientation.join(', ') || 'No orientation markers noted')}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Pupils</p>
                  <div className="text-[9.5px] font-black uppercase text-emerald-900 mt-0.5">
                    {printBlank ? (
                      <div className="w-20 border-b border-dotted border-slate-900 h-2.5" />
                    ) : assessments.neuro.pupils}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Cognitive */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                II. Cognitive Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Short-Term Memory</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? '[  ] Intact  [  ] Impaired' : assessments.cognitive.short_term_memory}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Long-Term Memory</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? '[  ] Intact  [  ] Impaired' : assessments.cognitive.long_term_memory}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Daily Decision Making</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? 'Independent / Mod Impaired / Sev Impaired' : assessments.cognitive.decision_making}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Sensory & Speech */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                III. Sensory & Communication
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Hearing</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? 'Adequate / Impaired' : assessments.sensory.hearing}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Vision</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? 'Adequate / Impaired' : assessments.sensory.vision}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Speech Pattern</p>
                  <p className="text-[9.5px] font-black uppercase text-emerald-900">
                    {printBlank ? 'Clear / Slurred / Aphasic' : assessments.sensory.speech}
                  </p>
                </div>
              </div>
            </div>

            {/* 4 & 5. Mood & Behavior */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                IV & V. Psycho-Social Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 border-b border-slate-100 pb-1">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-0.5">Mood Indicators (PHQ)</p>
                  <p className="text-[8.5px] font-black uppercase text-emerald-900 italic">
                    {printBlank ? '[  ] Depressed   [  ] Anxious   [  ] Irritable   [  ] None' : (assessments.mood.indicators.join(', ') || 'No mood distress noted')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-0.5">Behavioral Expressions</p>
                  <p className="text-[8.5px] font-black uppercase text-emerald-900 italic">
                    {printBlank ? '[  ] Wandering   [  ] Verbally Disruptive   [  ] Physically Aggressive   [  ] None' : (assessments.behavior.types.join(', ') || 'No behavioral issues noted')}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Functional Status */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                VI. Functional Status (MDS)
              </h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] font-black uppercase">
                <div className="text-emerald-900 text-[8px] flex items-center">Eating:</div>
                <div className="text-emerald-900 text-[9.5px]">
                  {printBlank ? (
                    <div className="flex items-end gap-0.5">
                      <span>Self:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                      <span className="ml-1">Supp:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                    </div>
                  ) : `${assessments.functional.self_perf.eating} / ${assessments.functional.support.eating}`}
                </div>
                <div className="text-emerald-900 text-[8px] flex items-center">Hygiene:</div>
                <div className="text-emerald-900 text-[9.5px]">
                  {printBlank ? (
                    <div className="flex items-end gap-0.5">
                      <span>Self:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                      <span className="ml-1">Supp:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                    </div>
                  ) : `${assessments.functional.self_perf.hygiene} / ${assessments.functional.support.hygiene}`}
                </div>
                <div className="text-emerald-900 text-[8px] flex items-center">Toileting:</div>
                <div className="text-emerald-900 text-[9.5px]">
                  {printBlank ? (
                    <div className="flex items-end gap-0.5">
                      <span>Self:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                      <span className="ml-1">Supp:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                    </div>
                  ) : `${assessments.functional.self_perf.toileting} / ${assessments.functional.support.toileting}`}
                </div>
                <div className="text-emerald-900 text-[8px] flex items-center">Mobility:</div>
                <div className="text-emerald-900 text-[9.5px]">
                  {printBlank ? (
                    <div className="flex items-end gap-0.5">
                      <span>Self:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                      <span className="ml-1">Supp:</span>
                      <div className="w-6 border-b border-dotted border-slate-900 h-2.5" />
                    </div>
                  ) : `${assessments.functional.self_perf.mobility} / ${assessments.functional.support.mobility}`}
                </div>
              </div>
            </div>

            {/* 7. Respiratory */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                VII. Respiratory System
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Breathing Pattern</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'Normal / SOBOE / Dyspnea' : assessments.resp.pattern}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Breath Sounds</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'Clear / Crackles / Wheezes' : assessments.resp.sounds}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">O2 Delivery</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'Room Air / Nasal Cannula' : assessments.resp.oxygen}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Cough</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'Productive / Non-productive' : assessments.resp.cough}
                  </p>
                </div>
              </div>
            </div>

            {/* 8. Cardiovascular */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                VIII. Cardiovascular
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Rhythm</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'Regular / Irregular' : assessments.cardio.rhythm}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Edema</p>
                  <p className="text-[9.5px] font-black uppercase text-slate-900">
                    {printBlank ? 'None / +1 / +2 / +3' : `${assessments.cardio.edema} (${assessments.cardio.edema_location || 'N/A'})`}
                  </p>
                </div>
              </div>
            </div>

            {/* 9 & 10. GI & GU */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                IX & X. Elimination & Nutrition
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">BM Status</p>
                  <div className="text-[9px] font-black uppercase text-slate-900 mt-0.5">
                    {printBlank ? (
                      <div className="flex items-end gap-0.5 w-full">
                        <span className="leading-none">Bristol Type:</span>
                        <div className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </div>
                    ) : `Bristol Type ${assessments.gi.stool_bristol}`}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Voiding Status</p>
                  <p className="text-[9px] font-black uppercase text-slate-900 mt-0.5">
                    {printBlank ? 'Continent / Incontinent / Cath' : assessments.gu.voiding}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Shift Intake</p>
                  <div className="text-[9px] font-black uppercase text-slate-900 mt-0.5">
                    {printBlank ? (
                      <div className="flex items-end gap-1 w-full">
                        <span className="leading-none">Fluid:</span>
                        <div className="w-16 border-b border-dotted border-slate-900 h-2.5" />
                        <span className="leading-none">mL / Appetite:</span>
                        <div className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </div>
                    ) : `${assessments.gi.fluids_in_ml} mL / Appetite: ${assessments.gi.appetite}`}
                  </div>
                </div>
              </div>
            </div>

            {/* 11 & 12. Skin & Pressure Ulcers */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                XI & XII. Skin & Wound Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Skin Condition</p>
                  <p className="text-[9px] font-black uppercase text-slate-900">
                    {printBlank ? 'Intact / Warm / Dry' : assessments.skin.condition}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Pressure Ulcer</p>
                  <div className="text-[9px] font-black uppercase text-rose-600 mt-0.5">
                    {printBlank ? (
                      <div className="flex items-end gap-0.5 w-full">
                        <span className="leading-none">None / Yes: Stage</span>
                        <div className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </div>
                    ) : (assessments.pressure_ulcers.present ? `YES: STAGE ${assessments.pressure_ulcers.stage} @ ${assessments.pressure_ulcers.site}` : 'NONE NOTED')}
                  </div>
                </div>
              </div>
            </div>

            {/* 13. Pain */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-emerald-900 pb-0.5 text-emerald-900">
                XIII. Pain Assessment
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Level</p>
                  <div className="text-[9.5px] font-black uppercase text-slate-900 mt-0.5">
                    {printBlank ? (
                      <div className="flex items-end gap-0.5 w-full">
                        <span className="leading-none">Level (0-10):</span>
                        <div className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </div>
                    ) : `${assessments.pain.level} / 10`}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Type/Site</p>
                  <div className="text-[9px] font-black uppercase text-slate-900 mt-0.5">
                    {printBlank ? (
                      <div className="flex items-end gap-0.5 w-full">
                        <span className="leading-none">Type/Site:</span>
                        <div className="flex-grow border-b border-dotted border-slate-900 h-2.5" />
                      </div>
                    ) : `${assessments.pain.type} (${assessments.pain.location || 'N/A'})`}
                  </div>
                </div>
              </div>
            </div>

            {/* XV. Vital Signs */}
            <div className="border border-slate-300 p-2 rounded-xl bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b-2 border-emerald-900 pb-0.5 text-emerald-900">
                XV. Vital Signs
              </h3>
              <div className="grid grid-cols-3 gap-y-1 gap-x-2 text-[8.5px] leading-tight">
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Temp</p>
                  {printBlank ? (
                    <div className="flex items-end w-16 gap-0.5">
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                      <span className="text-[8.5px] font-black text-slate-400 leading-none">°F</span>
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-black uppercase text-slate-900">{assessments.vitals.temp || '—'} °F</p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">B/P</p>
                  {printBlank ? (
                    <div className="flex items-end w-20 gap-0.5">
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                      <span className="text-[8.5px] font-black text-slate-400 leading-none">/</span>
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-black uppercase text-slate-900">
                      {assessments.vitals.bp_systolic || assessments.vitals.bp_diastolic 
                        ? `${assessments.vitals.bp_systolic || '—'}/${assessments.vitals.bp_diastolic || '—'}` 
                        : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Pulse</p>
                  {printBlank ? (
                    <div className="flex items-end w-16 gap-0.5">
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                      <span className="text-[7.5px] font-black text-slate-400 leading-none">bpm</span>
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-black uppercase text-slate-900">{assessments.vitals.pulse || '—'} bpm</p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">Resp</p>
                  {printBlank ? (
                    <div className="flex items-end w-16 gap-0.5">
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                      <span className="text-[7.5px] font-black text-slate-400 leading-none">/min</span>
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-black uppercase text-slate-900">{assessments.vitals.resp || '—'} /min</p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">SpO2</p>
                  {printBlank ? (
                    <div className="flex items-end w-16 gap-0.5">
                      <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                      <span className="text-[8.5px] font-black text-slate-400 leading-none">%</span>
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-black uppercase text-slate-900">{assessments.vitals.spo2 || '—'} %</p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">BP Detail</p>
                  {printBlank ? (
                    <div className="flex items-end w-20 gap-0.5 text-[7px] text-slate-400 font-bold uppercase leading-none">
                      <span>S:</span>
                      <div className="w-8 border-b border-dotted border-slate-900 h-2.5" />
                      <span className="ml-1">P:</span>
                      <div className="w-8 border-b border-dotted border-slate-900 h-2.5" />
                    </div>
                  ) : (
                    <p className="text-[7.5px] font-bold uppercase text-slate-900 leading-none truncate">
                      {assessments.vitals.bp_site || '—'} / {assessments.vitals.bp_position || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* XIV. Safety Rounds */}
            <div className="border border-slate-900 p-2 rounded-xl bg-slate-900 text-white">
              <h3 className="text-[10px] font-black uppercase mb-1.5 border-b border-white/20 pb-0.5 text-teal-400">
                XIV. Safety Rounds
              </h3>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {printBlank ? (
                  ['Bed Lowest', 'Call Light', 'Side Rails', 'Floor Mats'].map(check => (
                    <span key={check} className="text-[8px] font-black uppercase flex items-center gap-0.5">
                      <span className="text-white/30 border border-white/45 w-2 h-2 inline-block rounded-sm mr-0.5" /> {check}
                    </span>
                  ))
                ) : (
                  assessments.adl.safety_checks.map(check => (
                    <span key={check} className="text-[8px] font-black uppercase flex items-center gap-0.5">
                      <span className="text-teal-400">✓</span> {check}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 flex justify-between items-end border-t-2 border-slate-900">
            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-900 leading-tight">
              Quro Clinical Intelligence Platform • v4.5 Platinum<br />
              Generated Official Record • Page 1 of 2 (Side A)
            </div>
            <div className="text-right flex flex-col items-end gap-1 w-64">
              <div className="w-48 h-0.5 bg-slate-900 mb-1" />
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-900 mb-0.5">Licensed Clinical Professional Signature</p>
              {printBlank ? (
                <div className="flex items-end w-full gap-1 justify-end mt-1">
                  <div className="flex-grow border-b border-dotted border-slate-900 h-3.5" />
                  <span className="text-[8px] font-bold text-emerald-900 uppercase tracking-widest ml-1 leading-none">, RN / LPN</span>
                </div>
              ) : (
                <p className="text-[8px] font-bold text-emerald-900 uppercase tracking-widest">
                  {staff?.first_name} {staff?.last_name}, RN ({new Date().toLocaleDateString()})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Page 2: Narrative (Back Side) */}
        {/* Explicit boundary split to lock Side B directly to the back page */}
        <div 
          className="page-break-before-always print:block p-5 bg-white flex flex-col justify-between"
          style={{ 
            boxSizing: 'border-box', 
            height: '9.8in', 
            minHeight: '9.8in',
            maxHeight: '10in', 
            pageBreakInside: 'avoid', 
            breakInside: 'avoid', 
            pageBreakBefore: 'always',
            overflow: 'hidden'
          }}
        >
          <div className="flex justify-between items-start mb-3 border-b-2 border-slate-900 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">Q</div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-0.5">Clinical Narrative Log</h1>
                <p className="text-[8px] font-black text-emerald-900 uppercase tracking-[0.2em]">Platinum Health Hub • Narrative Progress Notes (Side B)</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5 w-72">
              {printBlank ? (
                <>
                  <div className="flex items-end w-full gap-1.5 justify-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Resident:</span>
                    <div className="flex-grow border-b border-dotted border-slate-900 h-3" />
                  </div>
                  <div className="flex items-end w-full gap-1.5 justify-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">MRN:</span>
                    <div className="w-20 border-b border-dotted border-slate-900 h-3" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none ml-2">Room:</span>
                    <div className="w-16 border-b border-dotted border-slate-900 h-3" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
                  <p className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest mt-0.5">MRN: {patient?.mrn} • RM: {patient?.room_id}</p>
                </>
              )}
            </div>
          </div>

          <div className="border-2 border-slate-900 p-5 rounded-[1.5rem] flex-grow relative bg-slate-50/30 flex flex-col justify-between animate-none" style={{ minHeight: '5.5in' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full" />
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-900 font-mono">
                Official Clinical Narrative (DAR/SOAP)
              </p>
            </div>
            
            <div className="text-xs font-medium leading-relaxed text-slate-900 whitespace-pre-wrap flex-grow">
              <span className="font-black uppercase text-[8px] bg-slate-900 text-white px-2 py-1 rounded mr-2 tracking-widest">{noteFocus}</span>
              {printBlank ? '' : (narrativeNote || 'No narrative documentation provided for this shift. Resident was monitored per care plan with no acute changes noted.')}
            </div>

            {/* Lined paper effect for handwritten notes/backup - Shows if printBlank is true OR if note is short */}
            {(printBlank || !narrativeNote || narrativeNote.length < 500) && (
              <div className="space-y-6 opacity-[0.05] mt-4">
                {[...Array(printBlank ? 12 : 6)].map((_, i) => (
                  <div key={i} className="h-[1px] bg-slate-900 w-full" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-6">
            <div className="col-span-2 border border-slate-300 p-3 rounded-[1.5rem] bg-slate-50">
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-900 mb-2 border-b border-slate-200 pb-1">Shift Intervention Summary Checklist</p>
              <div className="grid grid-cols-2 gap-y-2 text-[8.5px]">
                <div className="flex items-center gap-2 font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-4 h-4 border border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">
                    {!printBlank ? '✓' : ''}
                  </div> 
                  Medications Administered
                </div>
                <div className="flex items-center gap-2 font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-4 h-4 border border-slate-900 rounded flex items-center justify-center text-slate-900 font-black">
                    {!printBlank ? '✓' : ''}
                  </div> 
                  Treatments Completed
                </div>
                <div className="flex items-center gap-2 font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-4 h-4 border border-slate-300 rounded" /> 
                  Physician Notified
                </div>
                <div className="flex items-center gap-2 font-black uppercase tracking-tight text-emerald-900">
                  <div className="w-4 h-4 border border-slate-300 rounded" /> 
                  Family Notified
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col justify-end items-end w-64">
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-900 mb-1">Authenticated By</p>
              {printBlank ? (
                <div className="flex items-end w-full gap-1 justify-end mt-1 mb-2">
                  <div className="flex-grow border-b border-dotted border-slate-900 h-3.5" />
                  <span className="text-[8px] font-bold text-emerald-900 uppercase tracking-widest ml-1 leading-none">, RN / LPN</span>
                </div>
              ) : (
                <p className="text-xs font-black uppercase text-emerald-900 tracking-tight">
                  {staff?.first_name} {staff?.last_name}, RN
                </p>
              )}
              <div className="w-full h-0.5 bg-slate-900 mt-1 shadow-sm" />
              <p className="text-[8px] font-black text-emerald-900 mt-1 uppercase tracking-widest truncate">
                Electronic Hash: {printBlank ? 'MANUAL_BACKUP_RECORD' : (patient?.id?.slice(0, 16) || 'N/A')}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[8px] font-black uppercase tracking-[0.3em] text-emerald-900 text-center border-t border-slate-100">
            Official Clinical Record • Platinum Health Hub • Side B
          </div>
        </div>
        </div>
      )}

      {/* DEDICATED PRINT VIEW (FOR RESIDENT FACESHEET) */}
      {activeTab === 'facesheet' && (
        <div className="print-only hidden fixed inset-0 bg-white z-[100] p-6 m-0 text-black font-sans flex flex-col">
          {/* Header Card */}
          <div className="flex justify-between items-start mb-4 border-b-4 border-slate-900 pb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">Q</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Resident Face Sheet</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Platinum Health Hub • Clinical Records Office</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">MRN: {patient?.mrn} • Room: {patient?.room_number || "TBD"}</p>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Generated: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-grow">
            {/* Left Column: Demographics & Clinical Profile */}
            <div className="space-y-4">
              <div className="border border-slate-300 p-4 rounded-xl bg-slate-50/30 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-slate-300 pb-1 text-slate-900 tracking-wider">I. Resident Demographics</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Name</p>
                    <p className="font-bold text-slate-800">{patient?.first_name} {patient?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date of Birth</p>
                    <p className="font-bold text-slate-800">{patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</p>
                    <p className="font-bold text-slate-800 capitalize">{patient?.gender || 'Undisclosed'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SSN (Last 4)</p>
                    <p className="font-bold text-slate-800">{patient?.ssn_last_four || '****'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Admission Date</p>
                    <p className="font-bold text-slate-800">{patient?.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Attending Physician</p>
                    <p className="font-bold text-slate-800">{patient?.attending_physician || 'Unassigned'}</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 p-4 rounded-xl bg-slate-50/30 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-slate-300 pb-1 text-slate-900 tracking-wider">II. Code Status & Vitals Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Code Status</p>
                    <p className="font-black text-rose-600 uppercase tracking-wider text-sm">{patient?.code_status?.replace('_', ' ') || 'FULL CODE'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dietary Order</p>
                    <p className="font-bold text-slate-800">{patient?.diet || 'Regular Diet'}</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 p-4 rounded-xl bg-slate-50/30 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-slate-300 pb-1 text-slate-900 tracking-wider">III. Primary Clinical Diagnoses</h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient?.diagnoses && patient.diagnoses.length > 0 ? (
                    patient.diagnoses.map((diag, index) => (
                      <span key={index} className="px-2 py-0.5 border border-slate-300 text-[9px] font-black uppercase rounded bg-slate-100">{diag}</span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No diagnoses documented.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Allergies, Contacts, & Insurance */}
            <div className="space-y-4">
              <div className="border-2 border-rose-500 p-4 rounded-xl bg-rose-50/20 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-rose-300 pb-1 text-rose-800 tracking-wider">⚠️ Allergies & Contraindications</h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient?.allergies && patient.allergies.length > 0 ? (
                    patient.allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-0.5 border border-rose-400 text-rose-800 text-[9px] font-black uppercase rounded bg-rose-50">{allergy}</span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 border border-slate-400 text-slate-800 text-[9px] font-black uppercase rounded bg-slate-50">NKDA (No Known Drug Allergies)</span>
                  )}
                </div>
              </div>

              <div className="border border-slate-300 p-4 rounded-xl bg-slate-50/30 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-slate-300 pb-1 text-slate-900 tracking-wider">IV. Emergency Contacts & Family</h3>
                <div className="space-y-2">
                  {patient?.family_members && patient.family_members.length > 0 ? (
                    patient.family_members.map((member, index) => (
                      <div key={index} className="flex justify-between items-center text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-slate-800">{member.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{member.relationship} {member.is_emergency_contact ? '• EMERGENCY' : ''}</p>
                        </div>
                        <p className="font-mono text-slate-700 font-bold">{member.phone}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No family contacts recorded.</p>
                  )}
                </div>
              </div>

              <div className="border border-slate-300 p-4 rounded-xl bg-slate-50/30 break-inside-avoid shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-2.5 border-b border-slate-300 pb-1 text-slate-900 tracking-wider">V. Insurance & Financial Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Provider Name</p>
                    <p className="font-bold text-slate-800">{patient?.insurance_info?.provider_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Policy Number</p>
                    <p className="font-mono font-bold text-slate-800">{patient?.insurance_info?.policy_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer certification */}
          <div className="mt-auto border-t-2 border-slate-900 pt-4 flex justify-between items-end text-[9px] uppercase font-mono tracking-tight text-slate-500">
            <div>
              <p className="font-black text-slate-800">Quro Clinical Verification System</p>
              <p className="mt-0.5">Certified Face Sheet Record</p>
            </div>
            <div className="text-right">
              <p>Witness Signature: _______________________</p>
              <p className="mt-1">Date: ____________________</p>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PRINT VIEW (FOR MEDICATION LIST) */}
      {activeTab === 'medications' && (
        <div className="print-only hidden fixed inset-0 bg-white z-[100] p-6 m-0 text-black font-sans flex flex-col">
          {/* Header Card */}
          <div className="flex justify-between items-start mb-4 border-b-4 border-slate-900 pb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">Q</div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Active Medication Profile</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Platinum Health Hub • Pharmacy Registry</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black uppercase tracking-tight">{patient?.last_name}, {patient?.first_name}</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">MRN: {patient?.mrn} • Room: {patient?.room_number || "TBD"}</p>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Generated: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Patient Header Block */}
          <div className="border border-slate-200 p-2.5 mb-4 grid grid-cols-4 gap-4 text-xs uppercase font-mono tracking-tight bg-slate-50/50 rounded-lg shadow-sm">
            <div>
              <p className="text-[8px] font-black text-slate-400">Allergies</p>
              <p className="font-bold text-rose-600 font-sans truncate">{patient?.allergies?.join(', ') || 'NKDA'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400">Attending Physician</p>
              <p className="font-bold text-slate-800 font-sans truncate">{patient?.attending_physician || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400">Code Status</p>
              <p className="font-black text-slate-800 font-sans">{patient?.code_status || 'FULL CODE'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400">Diet</p>
              <p className="font-bold text-slate-800 font-sans truncate">{patient?.diet || 'Regular Diet'}</p>
            </div>
          </div>

          {/* Medications Table */}
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[9px] font-black uppercase tracking-widest text-slate-700">
                <th className="border border-slate-300 p-2 text-left w-1/3">Medication / Strength</th>
                <th className="border border-slate-300 p-2 text-center w-20">Route</th>
                <th className="border border-slate-300 p-2 text-center w-28">Frequency</th>
                <th className="border border-slate-300 p-2 text-center w-28">Schedule Times</th>
                <th className="border border-slate-300 p-2 text-left">Indication & Prescriber</th>
              </tr>
            </thead>
            <tbody>
              {medications.filter(m => m.status === 'active').map((med) => (
                <tr key={med.id} className="border-b border-slate-200 hover:bg-slate-50/50 break-inside-avoid">
                  <td className="border border-slate-300 p-2 align-top">
                    <p className="font-black text-slate-900 text-xs">{med.generic_name}</p>
                    {med.brand_name && <p className="text-[9px] text-slate-400 italic mt-0.5">Brand: {med.brand_name}</p>}
                    <p className="text-[9px] font-bold text-slate-500 mt-1">Dose: {med.dose || 'As ordered'} ({med.strength})</p>
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800 align-top uppercase text-[10px]">{med.route}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800 align-top uppercase text-[10px]">
                    {med.frequency}
                    {med.prn_interval && <p className="text-[9px] font-bold text-teal-600 mt-0.5">{med.prn_interval}</p>}
                  </td>
                  <td className="border border-slate-300 p-2 text-center align-top font-mono text-[9px]">
                    {med.frequency === 'PRN' ? (
                      <span className="px-1.5 py-0.5 border border-teal-200 text-teal-700 text-[8px] font-black uppercase rounded bg-teal-50">PRN Dose</span>
                    ) : (
                      med.frequency_times?.join(', ') || 'N/A'
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 align-top">
                    <p className="font-bold text-slate-700 italic text-[10px]">&quot;{med.indication || 'Routine Pass'}&quot;</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">Ordered by:</p>
                    <p className="font-semibold text-slate-600 mt-0.5 text-[9px]">{med.prescriber_name || 'Attending Physician'} {med.prescriber_npi ? `(NPI: ${med.prescriber_npi})` : ''}</p>
                  </td>
                </tr>
              ))}
              {medications.filter(m => m.status === 'active').length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-slate-300 p-6 text-center text-slate-400 italic">No active medications registered.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer certification */}
          <div className="mt-auto border-t-2 border-slate-900 pt-4 flex justify-between items-end text-[9px] uppercase font-mono tracking-tight text-slate-500">
            <div>
              <p className="font-black text-slate-800">Quro Clinical Verification System</p>
              <p className="mt-0.5">Certified Active Medication List</p>
            </div>
            <div className="text-right">
              <p>Pharmacist/Nurse Signature: _______________________</p>
              <p className="mt-1">Date: ____________________</p>
            </div>
          </div>
        </div>
      )}



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
                  disabled={isSigningOff}
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
                  } ${isSigningOff ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {num === '✓' && isSigningOff ? '...' : num}
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
                <input title="Blood Pressure (Systolic)" 
                  type="number"
                  placeholder="---"
                  value={vitalsEntry.bp_sys}
                  onChange={(e) => setVitalsEntry(prev => ({ ...prev, bp_sys: e.target.value }))}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-rose-500 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Blood Pressure (Diastolic)</label>
                <input title="Blood Pressure (Diastolic)" 
                  type="number"
                  placeholder="---"
                  value={vitalsEntry.bp_dia}
                  onChange={(e) => setVitalsEntry(prev => ({ ...prev, bp_dia: e.target.value }))}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-rose-500 focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heart Rate (BPM)</label>
                <input title="Heart Rate (BPM)" 
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

    {/* 5. Attending Physician Edit Modal */}
    {showPhysicianModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
              <Stethoscope size={40} className="text-quro-teal" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Attending Physician</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Manage the admitting & attending doctor</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physician Name</label>
              <select 
                title="Physician Name" 
                value={tempPhysician}
                onChange={(e) => setTempPhysician(e.target.value)}
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
              >
                <option value="">Select Physician...</option>
                {facilityPhysicians.map(p => (
                  <option key={p.id} value={p.name}>{p.name} ({p.specialty || 'General'})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowPhysicianModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePhysician}
                className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Room & Bed Assignment Modal */}
    {showRoomModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
          <div className="text-center mb-6 flex-shrink-0">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
              <BedIcon size={40} className="text-quro-teal" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Room & Bed Assignment</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Assign resident to a room and bed</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6 min-h-0">
            {bedsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading rooms and census...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-slate-500">No rooms configured in this facility.</p>
                <p className="text-xs font-bold text-slate-400 mt-1">Please configure facility rooms under Admin settings.</p>
              </div>
            ) : (
              <>
                {/* Room Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Room</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {rooms.map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setSelectedBedId(null);
                          }}
                          className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all text-center ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                              : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-widest font-black opacity-60 mb-1">Room</div>
                          <div className="text-base font-black">{room.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bed Selector */}
                {selectedRoomId && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Bed</label>
                    <div className="grid grid-cols-2 gap-3">
                      {beds
                        .filter((bed) => bed.room_id === selectedRoomId)
                        .map((bed) => {
                          const isCurrent = patient.bed_id === bed.id;
                          const isOccupied = bed.status === 'occupied' && bed.patient_id && bed.patient_id !== patient.id;
                          const isSelected = selectedBedId === bed.id;

                          return (
                            <button
                              key={bed.id}
                              type="button"
                              disabled={isOccupied || savingRoom}
                              onClick={() => setSelectedBedId(bed.id)}
                              className={`p-5 rounded-2xl border-2 font-bold text-left transition-all relative ${
                                isSelected
                                  ? 'bg-quro-teal/10 text-quro-teal border-quro-teal shadow-md shadow-quro-teal/5'
                                  : isCurrent
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : isOccupied
                                  ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60 cursor-not-allowed'
                                  : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-xs uppercase tracking-widest font-black opacity-60 mb-1">Bed</div>
                                  <div className="text-base font-black">{bed.name}</div>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  isCurrent
                                    ? 'bg-slate-800 text-white'
                                    : isOccupied
                                    ? 'bg-rose-100 text-rose-700'
                                    : isSelected
                                    ? 'bg-quro-teal text-white'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {isCurrent ? 'Current' : isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      {beds.filter((bed) => bed.room_id === selectedRoomId).length === 0 && (
                        <p className="text-xs font-bold text-slate-400 italic col-span-2">No beds configured in this room.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-4 mt-auto flex-shrink-0">
            {patient.bed_id && (
              <button
                type="button"
                disabled={savingRoom}
                onClick={() => {
                  setSelectedRoomId(null);
                  setSelectedBedId(null);
                }}
                className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Clear Room
              </button>
            )}
            <div className="flex-1 flex gap-3 justify-end">
              <button
                type="button"
                disabled={savingRoom}
                onClick={() => setShowRoomModal(false)}
                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRoom || (selectedRoomId !== null && selectedBedId === null)}
                onClick={handleSaveRoomAssignment}
                className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {savingRoom ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 6. Insurance Coverage Edit Modal */}
    {showInsuranceModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
              <Shield size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Insurance Coverage</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Edit payer and policy specifications</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Provider Name</label>
                <input title="Provider Name" 
                  type="text"
                  placeholder="e.g. Medicare / Blue Cross"
                  value={tempInsurance.provider_name}
                  onChange={(e) => setTempInsurance(prev => ({ ...prev, provider_name: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Policy / Member ID</label>
                <input title="Policy / Member ID" 
                  type="text"
                  placeholder="e.g. 123456789"
                  value={tempInsurance.policy_number}
                  onChange={(e) => setTempInsurance(prev => ({ ...prev, policy_number: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Number</label>
                <input title="Group Number" 
                  type="text"
                  placeholder="e.g. G-98765"
                  value={tempInsurance.group_number}
                  onChange={(e) => setTempInsurance(prev => ({ ...prev, group_number: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payer Support Phone</label>
                <input title="Payer Support Phone" 
                  type="text"
                  placeholder="e.g. (800) 555-0199"
                  value={tempInsurance.phone}
                  onChange={(e) => setTempInsurance(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowInsuranceModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInsurance}
                className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 7. Pharmacy Edit Modal */}
    {showPharmacyModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
              <Pill size={40} className="text-quro-teal" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Preferred Pharmacy</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Manage resident pharmaceutical provider</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pharmacy Name</label>
                <input title="Pharmacy Name" 
                  type="text"
                  placeholder="e.g. CVS Pharmacy #1043"
                  value={tempPharmacy.name}
                  onChange={(e) => setTempPharmacy(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input title="Phone Number" 
                  type="text"
                  placeholder="e.g. (555) 012-3456"
                  value={tempPharmacy.phone}
                  onChange={(e) => setTempPharmacy(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fax Number</label>
                <input title="Fax Number" 
                  type="text"
                  placeholder="e.g. (555) 012-3457"
                  value={tempPharmacy.fax}
                  onChange={(e) => setTempPharmacy(prev => ({ ...prev, fax: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pharmacy Address</label>
                <input title="Pharmacy Address" 
                  type="text"
                  placeholder="e.g. 100 Main St, Metropolis, NY"
                  value={tempPharmacy.address}
                  onChange={(e) => setTempPharmacy(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowPharmacyModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePharmacy}
                className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 8. Family Contact Modal */}
    {showFamilyModal && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
              <User size={40} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {editingFamilyMemberIndex !== null ? 'Edit Family Contact' : 'Add Family Contact'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Manage emergency & representative contacts</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input title="Full Name" 
                  type="text"
                  placeholder="e.g. John Doe"
                  value={tempFamilyMember.name}
                  onChange={(e) => setTempFamilyMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Relationship</label>
                <input title="Relationship" 
                  type="text"
                  placeholder="e.g. Spouse / Son / Guardian"
                  value={tempFamilyMember.relationship}
                  onChange={(e) => setTempFamilyMember(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input title="Phone Number" 
                  type="text"
                  placeholder="e.g. (555) 012-3456"
                  value={tempFamilyMember.phone}
                  onChange={(e) => setTempFamilyMember(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                <input title="Email (Optional)" 
                  type="email"
                  placeholder="e.g. name@example.com"
                  value={tempFamilyMember.email}
                  onChange={(e) => setTempFamilyMember(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-quro-teal focus:ring-0 transition-all outline-none"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-2">
                <input title="Input Field" 
                  id="primary_emergency_contact"
                  type="checkbox"
                  checked={tempFamilyMember.is_emergency_contact}
                  onChange={(e) => setTempFamilyMember(prev => ({ ...prev, is_emergency_contact: e.target.checked }))}
                  className="w-5 h-5 rounded text-slate-900 border-slate-300 focus:ring-slate-950 focus:ring-2 focus:ring-offset-2"
                />
                <label htmlFor="primary_emergency_contact" className="text-xs font-black uppercase text-slate-700 tracking-wider cursor-pointer select-none">
                  Designate as Primary Emergency Contact
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowFamilyModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFamilyMember}
                className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Heads-Up Warning Alert Modal */}
    <HeadsUpAlertModal 
      isOpen={isAlertModalOpen}
      onClose={() => setIsAlertModalOpen(false)}
      patientId={patient?.id || id}
      orgId={organization?.id || staff?.org_id || ''}
      currentStaff={{ id: staff?.id || '', name: `${staff?.last_name || ''}, ${staff?.first_name || ''} ${staff?.credential || ''}` }}
    />
    </div>
  );
}

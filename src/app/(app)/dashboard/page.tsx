// ============================================================
// Quro — Dashboard (Landing Page)
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldAlert,
  Bell,
  Search,
  X,
  Building2,
  Sparkles,
  Activity,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, type DashboardBed } from '@/hooks/useDashboard';
import PatientCard from '@/components/dashboard/PatientCard';
import GlobalIntelligenceBar from '@/components/dashboard/GlobalIntelligenceBar';
import ActiveShiftIntelligenceBanner from '@/components/clinical/ActiveShiftIntelligenceBanner';

const VitalsInlay = dynamic(() => import('@/components/clinical/VitalsInlay'), { ssr: false });
const RT_Assessment_Inlay = dynamic(() => import('@/components/clinical/RTAssessmentInlay'), { ssr: false });
const GT_Feeding_Inlay = dynamic(() => import('@/components/clinical/GTFeedingInlay'), { ssr: false });

import { RespiratoryState, EnteralState } from '@/lib/firebase/types';
import { addDoc, collection, serverTimestamp, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

type DashboardPatient = NonNullable<DashboardBed['patient']>;

export default function DashboardPage() {
  const { user, organization, staff, activeFacility, isImpersonating } = useAuth();
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<DashboardBed['patient'] | null>(null);
  const [selectedPatientForRT, setSelectedPatientForRT] = useState<DashboardBed['patient'] | null>(null);
  const [selectedPatientForGT, setSelectedPatientForGT] = useState<DashboardBed['patient'] | null>(null);


  
  // Specialized RT/GT State for Inlays
  const [rtData, setRtData] = useState<RespiratoryState>({
    o2_delivery: 'Room Air',
    lpm: 2,
    stoma_condition: 'Healthy',
    suction_frequency: 'Shiftly',
    secretions_consistency: 'Thin',
    secretions_color: 'Clear',
    lung_sounds: { ruq: 'Clear', luq: 'Clear', rlq: 'Clear', llq: 'Clear' }
  });

  const [gtData, setGtData] = useState<EnteralState>({
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
  
  const viewType = 'boutique';
  
  const isDemoUser = user?.email === 'demo@qurosystems.com';
  
  const { beds: facilityBeds, alerts } = useDashboard(activeFacility?.id || '');
  
  // High-Fidelity Mock Patients for Platinum Health Hub (Design Demo)
  const mockPatients: DashboardBed[] = [
    {
      id: 'bed-1',
      bed_name: 'Bed A',
      room_name: 'Room 101',
      room_id: '101',
      status: 'occupied',
      patient: {
        id: 'margaret-thompson',
        full_name: 'Thompson, Margaret',
        initials: 'TM',
        mrn: 'MRN-001',
        status: 'Serious',
        hr: 112,
        bp: '148/92',
        temp: 99.1,
        spo2: 88,
        resp: 24,
        glucose: 142,
        pain: 4,
        weight: 165.4,
        is_active_monitoring: true,
        code_status: 'dnr',
        diagnoses: ['Congestive Heart Failure', 'Atrial Fibrillation', 'Osteoporosis', 'Chronic Kidney Disease (Stage 3)']
      }
    },
    {
      id: 'bed-2',
      bed_name: 'Bed B',
      room_name: 'Room 101',
      room_id: '101',
      status: 'occupied',
      patient: {
        id: 'robert-chen',
        full_name: 'Chen, Robert',
        initials: 'CR',
        mrn: 'MRN-002',
        status: 'Stable',
        hr: 78,
        bp: '138/84',
        temp: 98.6,
        spo2: 98,
        resp: 16,
        glucose: 118,
        pain: 0,
        weight: 182.2,
        is_active_monitoring: false,
        code_status: 'full',
        diagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Peripheral Neuropathy']
      }
    },
    {
      id: 'bed-3',
      bed_name: 'Bed A',
      room_name: 'Room 102',
      room_id: '102',
      status: 'occupied',
      patient: {
        id: 'eleanor-vance',
        full_name: 'Vance, Eleanor',
        initials: 'VE',
        mrn: 'MRN-003',
        status: 'Stable',
        hr: 72,
        bp: '118/74',
        temp: 98.4,
        spo2: 97,
        resp: 14,
        glucose: 95,
        pain: 2,
        weight: 124.8,
        is_active_monitoring: false,
        code_status: 'dnr_dni',
        diagnoses: ['Alzheimer\'s Disease', 'Anxiety', 'Insomnia', 'Vascular Dementia']
      }
    },
    {
      id: 'bed-4',
      bed_name: 'Bed B',
      room_name: 'Room 102',
      room_id: '102',
      status: 'occupied',
      patient: {
        id: 'arthur-morgan',
        full_name: 'Morgan, Arthur',
        initials: 'MA',
        mrn: 'MRN-004',
        status: 'Serious',
        hr: 105,
        bp: '168/94',
        temp: 100.2,
        spo2: 91,
        resp: 28,
        glucose: 156,
        pain: 6,
        weight: 198.5,
        is_active_monitoring: true,
        code_status: 'full',
        diagnoses: ['COPD', 'Pneumonia (Right Lower Lobe)', 'Hypertension', 'Tobacco Use Disorder']
      }
    },
    {
      id: 'bed-5',
      bed_name: 'Bed A',
      room_name: 'Room 103',
      room_id: '103',
      status: 'occupied',
      patient: {
        id: 'sarah-jenkins',
        full_name: 'Jenkins, Sarah',
        initials: 'JS',
        mrn: 'MRN-005',
        status: 'Stable',
        hr: 82,
        bp: '130/82',
        temp: 98.8,
        spo2: 99,
        resp: 18,
        glucose: 104,
        pain: 1,
        weight: 142.6,
        is_active_monitoring: false,
        code_status: 'full',
        diagnoses: ['Rheumatoid Arthritis', 'GERD', 'Anemia', 'Sjogren\'s Syndrome']
      }
    },
    {
      id: 'bed-6',
      bed_name: 'Bed A',
      room_name: 'Room 104',
      room_id: '104',
      status: 'occupied',
      patient: {
        id: 'victor-dumont',
        full_name: 'Dumont, Victor',
        initials: 'DV',
        mrn: 'MRN-006',
        status: 'Stable',
        hr: 70,
        bp: '122/78',
        temp: 98.4,
        spo2: 96,
        resp: 16,
        glucose: 98,
        pain: 3,
        weight: 175.2,
        is_active_monitoring: false,
        code_status: 'comfort',
        diagnoses: ['Metastatic Prostate Cancer', 'Chronic Pain', 'Depression']
      }
    }
  ];

  // Data Source Logic: Prioritize Live Firestore data (facilityBeds)
  const rawBeds = (facilityBeds.length > 0) 
    ? facilityBeds 
    : (isDemoUser && activeFacility?.id === 'platinum-health-hub' ? mockPatients : Array.from({ length: 6 }, (_, i) => ({
        id: `empty-${i}`,
        bed_name: `Bed ${i + 1}`,
        room_name: 'Unassigned',
        room_id: 'none',
        status: 'available' as const,
        patient: undefined
      })));

  const beds = rawBeds;

  const handleVitalsSubmit = async (data: Record<string, string | number | boolean | null>) => {
    const patientId = data.patient_id as string;
    if (!organization?.id || !patientId) return;
    
    const vitalsRef = collection(db, 'organizations', organization.id, 'patients', patientId, 'vital_signs');
    const patientRef = doc(db, 'organizations', organization.id, 'patients', patientId);

    const vitalData = {
      pulse: data.pulse as number,
      systolic: data.systolic as number,
      diastolic: data.diastolic as number,
      temperature: data.temperature as number,
      spO2: data.o2_saturation as number,
      resp: data.resp as number,
      glucose: data.glucose as number,
      weight: data.weight as number,
      pain_level: data.pain_level as number,
      recorded_at: data.recorded_at as string,
      recorded_by: staff?.id || 'system',
      created_at: serverTimestamp()
    };

    // 1. Add to historical subcollection
    await addDoc(vitalsRef, vitalData);

    // 2. Update denormalized field on Patient for real-time dashboard updates
    await setDoc(patientRef, {
      current_vitals: {
        pulse: vitalData.pulse,
        systolic: vitalData.systolic,
        diastolic: vitalData.diastolic,
        temperature: vitalData.temperature,
        spO2: vitalData.spO2,
        resp: vitalData.resp,
        glucose: vitalData.glucose,
        weight: vitalData.weight,
        pain_level: vitalData.pain_level,
        recorded_at: vitalData.recorded_at,
        recorded_by_name: staff ? `${staff.first_name} ${staff.last_name}` : 'System'
      },
      updated_at: serverTimestamp()
    }, { merge: true });
  };

  const getPatientRoom = (patientId: string) => {
    const bed = beds.find(b => b.patient?.id === patientId);
    if (!bed) return "Room TBD";
    return `${bed.room_name || 'Room'} - ${bed.bed_name || 'Bed'}`;
  };

  const handleRTSubmit = async () => {
    if (!organization?.id || !activeFacility?.id || !selectedPatientForRT) return;

    try {
      const roomStr = getPatientRoom(selectedPatientForRT.id);
      
      const logEntry = {
        patientRoom: roomStr,
        patientName: selectedPatientForRT.full_name || "Unknown Patient",
        timestamp: serverTimestamp(),
        type: "RESPIRATORY" as const,
        summaryText: `Respiratory assessment completed. O2 Delivery: ${rtData.o2_delivery} at ${rtData.lpm} LPM. Stoma: ${rtData.stoma_condition}. Secretions: ${rtData.secretions_consistency} & ${rtData.secretions_color}. Suction: ${rtData.suction_frequency}.`,
        chartedBy: staff ? `${staff.role || 'RN'}-${staff.id.slice(0, 4)}` : 'RT-8842'
      };

      const logsRef = collection(db, 'organizations', organization.id, 'facilities', activeFacility.id, 'clinical_logs');
      await addDoc(logsRef, logEntry);

      // Save to patient's subcollection or doc
      const patientRef = doc(db, 'organizations', organization.id, 'patients', selectedPatientForRT.id);
      await setDoc(patientRef, {
        respiratory_state: {
          ...rtData,
          updated_at: new Date().toISOString(),
          updated_by: staff?.id || 'system'
        },
        updated_at: serverTimestamp()
      }, { merge: true });

      alert('Respiratory Assessment committed successfully.');
      setSelectedPatientForRT(null);
    } catch (err) {
      console.error('Error committing RT Assessment:', err);
      alert('Error committing assessment.');
    }
  };

  const handleGTSubmit = async () => {
    if (!organization?.id || !activeFacility?.id || !selectedPatientForGT) return;

    try {
      const roomStr = getPatientRoom(selectedPatientForGT.id);

      const logEntry = {
        patientRoom: roomStr,
        patientName: selectedPatientForGT.full_name || "Unknown Patient",
        timestamp: serverTimestamp(),
        type: "ENTERAL" as const,
        summaryText: `Enteral feeding synced. Formula: ${gtData.formula_name} via ${gtData.delivery_method} at ${gtData.rate_ml_hr} mL/hr. Flushes: ${gtData.water_flush_pre}mL pre / ${gtData.water_flush_post}mL post. Residual: ${gtData.last_residual_volume}mL. Site: ${gtData.site_condition}.`,
        chartedBy: staff ? `${staff.role || 'RN'}-${staff.id.slice(0, 4)}` : 'RN-9021'
      };

      const logsRef = collection(db, 'organizations', organization.id, 'facilities', activeFacility.id, 'clinical_logs');
      await addDoc(logsRef, logEntry);

      // Save to patient's doc
      const patientRef = doc(db, 'organizations', organization.id, 'patients', selectedPatientForGT.id);
      await setDoc(patientRef, {
        enteral_state: {
          ...gtData,
          updated_at: new Date().toISOString(),
          updated_by: staff?.id || 'system'
        },
        updated_at: serverTimestamp()
      }, { merge: true });

      alert('Enteral feeding logs synced successfully.');
      setSelectedPatientForGT(null);
    } catch (err) {
      console.error('Error syncing GT feeding:', err);
      alert('Error syncing feeding logs.');
    }
  };

  return (
    <div className={`animate-in fade-in duration-700 min-h-screen bg-slate-50/30 ${isImpersonating ? 'border-t-4 border-rose-500' : ''}`}>
      
      {staff?.role === 'SURVEYOR' && (
        <div className="no-print p-4 bg-amber-500 text-white flex items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4 px-4">
            <ShieldAlert size={20} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Audit Session Active</p>
              <h3 className="text-sm font-black uppercase tracking-tight">Read-Only Surveyor Access</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-black/10 px-3 py-1 rounded-full">State Inspection Mode</span>
          </div>
        </div>
      )}

      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Facility Selection Header */}
        {!activeFacility?.id && (
          <div className="mb-10 p-10 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
               <Building2 size={32} className="text-slate-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">No Active Facility</h2>
              <p className="text-sm text-slate-400 font-medium">Please select a facility from the sidebar to begin monitoring.</p>
            </div>
          </div>
        )}

        {/* Header Content */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">
              Clinical Dashboard
            </h1>
            <p className="text-slate-500 text-xs font-black tracking-widest uppercase flex items-center gap-3 opacity-70">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeFacility?.name || 'Active Monitoring Console'}
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="relative group">
              <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-quro-teal transition-colors" />
              <input 
                type="text" 
                placeholder="Search MRN / Room..."
                className="pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:border-quro-teal focus:ring-4 focus:ring-quro-teal/5 transition-all w-80 shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Active Alerts</p>
                <p className="text-lg font-black text-rose-500 leading-none">{alerts.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Synthesis Bar */}
        <div className="mb-10">
          <GlobalIntelligenceBar />
        </div>

        {/* Live AI Shift Handoff Briefing */}
        {activeFacility?.id && (
          <ActiveShiftIntelligenceBanner facilityId={activeFacility.id} />
        )}

        {/* Bed Grid */}
        <div className={`grid gap-10 ${viewType === 'boutique' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'}`}>
          {beds.map((bed) => (
            <PatientCard 
              key={bed.id} 
              bed={bed}
              isSerious={bed.patient?.status === 'Serious'}
              viewType={viewType}
              showDiagnostics={isImpersonating}
              readOnly={staff?.role === 'SURVEYOR'}
              onVitalsClick={(p: DashboardPatient) => setSelectedPatientForVitals(p)}
              onRTClick={(p: DashboardPatient) => setSelectedPatientForRT(p)}
              onGTClick={(p: DashboardPatient) => setSelectedPatientForGT(p)}
            />
          ))}
        </div>
      </div>

      {/* Modals remain essentially the same but with consistent styling */}
      {selectedPatientForVitals && (
        <VitalsInlay 
          patient={selectedPatientForVitals}
          onClose={() => setSelectedPatientForVitals(null)}
          onSubmit={handleVitalsSubmit}
        />
      )}

      {selectedPatientForRT && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-slate-50 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Respiratory Assessment</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Patient: {selectedPatientForRT.initials} • MRN: {selectedPatientForRT.mrn}</p>
               </div>
               <button onClick={() => setSelectedPatientForRT(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                 <X size={24} />
               </button>
            </div>
            <RT_Assessment_Inlay data={rtData} onChange={setRtData} />
            <div className="mt-10 flex justify-end">
               <button onClick={handleRTSubmit} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
                 Commit Assessment
               </button>
            </div>
          </div>
        </div>
      )}

      {selectedPatientForGT && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-slate-50 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Enteral Management</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Patient: {selectedPatientForGT.initials} • MRN: {selectedPatientForGT.mrn}</p>
               </div>
               <button onClick={() => setSelectedPatientForGT(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                 <X size={24} />
               </button>
            </div>
            <GT_Feeding_Inlay data={gtData} onChange={setGtData} />
            <div className="mt-10 flex justify-end">
               <button onClick={handleGTSubmit} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
                 Sync Feeding Logs
               </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 flex items-center justify-between p-8 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
        <p>Quro Clinical Intelligence v4.5 Platinum • Powered by <span className="text-quro-teal font-bold">ModernQure LLC</span></p>
        <div className="flex gap-8">
           <p className="uppercase tracking-widest">Privacy & Compliance</p>
           <p className="uppercase tracking-widest">Support Portal</p>
        </div>
      </footer>
    </div>

  );
}

// ============================================================
// Quro — Dashboard (Landing Page)
// ============================================================
'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, type DashboardBed } from '@/hooks/useDashboard';
import PatientCard from '@/components/dashboard/PatientCard';
import VitalsInlay from '@/components/clinical/VitalsInlay';
import GlobalIntelligenceBar from '@/components/dashboard/GlobalIntelligenceBar';
import RT_Assessment_Inlay from '@/components/clinical/RTAssessmentInlay';
import GT_Feeding_Inlay from '@/components/clinical/GTFeedingInlay';
import { X } from 'lucide-react';
import { RespiratoryState, EnteralState } from '@/lib/firebase/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

type DashboardPatient = NonNullable<DashboardBed['patient']>;

export default function DashboardPage() {
  const { organization, staff, activeFacility: authActiveFacility } = useAuth();
  const [activeFacility, setActiveFacility] = useState(authActiveFacility?.id || 'platinum-health-hub');
  const [prevAuthFacilityId, setPrevAuthFacilityId] = useState(authActiveFacility?.id);
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
  
  // Update local state when auth state changes (React pattern: adjusting state based on props)
  if (authActiveFacility?.id !== prevAuthFacilityId) {
    setPrevAuthFacilityId(authActiveFacility?.id);
    setActiveFacility(authActiveFacility?.id || 'platinum-health-hub');
  }

  // Constant view type for simplified demo
  const viewType = 'boutique';
  
  const facilityNames: Record<string, string> = {
    'platinum-health-hub': 'Platinum Health Hub',
    'oak-ridge': 'Oak Ridge Memory Care',
    'cedar-haven': 'Cedar Haven Assisted Living'
  };

  const { beds: facilityBeds, alerts } = useDashboard(activeFacility);
  
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
        initials: 'MT',
        mrn: 'MRN-001',
        status: 'Critical',
        hr: 112,
        bp: '148/92',
        temp: 99.1,
        is_active_monitoring: true,
        code_status: 'DNR',
        diagnoses: ['Congestive Heart Failure', 'Atrial Fibrillation', 'Chronic Kidney Disease']
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
        initials: 'RC',
        mrn: 'MRN-002',
        status: 'Stable',
        hr: 78,
        bp: '138/84',
        temp: 98.6,
        is_active_monitoring: false,
        code_status: 'Full Code',
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
        initials: 'EV',
        mrn: 'MRN-003',
        status: 'Stable',
        hr: 72,
        bp: '118/74',
        temp: 98.4,
        is_active_monitoring: false,
        code_status: 'DNR',
        diagnoses: ['Alzheimer\'s Disease', 'Anxiety', 'Insomnia']
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
        initials: 'AM',
        mrn: 'MRN-004',
        status: 'Critical',
        hr: 105,
        bp: '168/94',
        temp: 100.2,
        is_active_monitoring: true,
        code_status: 'Full Code',
        diagnoses: ['COPD', 'Pneumonia', 'Tobacco Use Disorder']
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
        initials: 'SJ',
        mrn: 'MRN-005',
        status: 'Stable',
        hr: 82,
        bp: '130/82',
        temp: 98.8,
        is_active_monitoring: false,
        code_status: 'Full Code',
        diagnoses: ['Rheumatoid Arthritis', 'GERD', 'Anemia']
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
        initials: 'VD',
        mrn: 'MRN-006',
        status: 'Stable',
        hr: 70,
        bp: '122/78',
        temp: 98.4,
        is_active_monitoring: false,
        code_status: 'Comfort',
        diagnoses: ['Metastatic Prostate Cancer', 'Chronic Pain', 'Depression']
      }
    }
  ];

  // Fill empty slots if needed, or just use the beds from the hook
  // Strictly limit to 6 beds for Platinum Health Hub demo
  const rawBeds = activeFacility === 'platinum-health-hub' 
    ? mockPatients
    : (facilityBeds.length > 0 ? facilityBeds : Array.from({ length: 6 }, (_, i) => ({
        id: `empty-${i}`,
        bed_name: `Bed ${i + 1}`,
        room_name: 'Unassigned',
        room_id: 'none',
        status: 'available' as const,
        patient: undefined
      })));

  const beds = rawBeds.slice(0, 6);

  const handleVitalsSubmit = async (data: Record<string, string | number | boolean | null>) => {
    if (!organization?.id) return;
    
    await addDoc(collection(db, 'organizations', organization.id, 'vitals'), {
      ...data,
      org_id: organization.id,
      recorded_by: staff?.id || 'system',
      created_at: serverTimestamp()
    });
  };

  const { isImpersonating } = useAuth();

  return (
    <div className={`animate-in -m-8 p-8 min-h-screen bg-quro-50/10 ${isImpersonating ? 'border-t-4 border-rose-500' : ''}`}>
      {/* Ghost Mode Advanced Tools */}
      {isImpersonating && (
        <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-rose-900/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Diagnostic Level 0 Active</p>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Advanced Diagnostics Console</h3>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Latency</p>
              <p className="text-sm font-bold text-teal-400">0.02ms</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sync Load</p>
              <p className="text-sm font-bold text-blue-400">12%</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Trail</p>
              <p className="text-sm font-bold text-amber-400">Active</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(facilityNames).map((facId) => (
          <button
            key={facId}
            onClick={() => setActiveFacility(facId)}
            className={`flex-none px-8 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all duration-300 ${
              activeFacility === facId 
                ? 'bg-quro-charcoal text-white shadow-2xl shadow-quro-charcoal/20' 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            {facilityNames[facId].toUpperCase()}
            {activeFacility === facId && <span className="ml-3 text-quro-teal">●</span>}
          </button>
        ))}
      </div>

      {/* Facility Sub-Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-quro-charcoal uppercase tracking-tight">
            Boutique Care Facility
          </h1>
          <p className="text-slate-500 text-xs font-black tracking-widest uppercase opacity-70">
            {facilityNames[activeFacility]} — 6 Patients Active
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-quro-charcoal leading-tight">Alert Feed</p>
              <p className="text-[10px] text-slate-500 font-medium">{alerts.length} priority alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Synthesis Bar */}
      <GlobalIntelligenceBar />

      {/* Bed Grid */}
      <div className={`grid gap-6 ${viewType === 'boutique' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'}`}>
        {beds.map((bed) => (
          <PatientCard 
            key={bed.id} 
            bed={bed}
            isCritical={bed.patient?.status === 'Critical'}
            viewType={viewType}
            showDiagnostics={isImpersonating}
            onVitalsClick={(p: DashboardPatient) => setSelectedPatientForVitals(p)}
            onRTClick={(p: DashboardPatient) => setSelectedPatientForRT(p)}
            onGTClick={(p: DashboardPatient) => setSelectedPatientForGT(p)}
          />
        ))}
      </div>

      {selectedPatientForVitals && (
        <VitalsInlay 
          patient={selectedPatientForVitals}
          onClose={() => setSelectedPatientForVitals(null)}
          onSubmit={handleVitalsSubmit}
        />
      )}

      {/* RT Inlay Modal */}
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
               <button onClick={() => setSelectedPatientForRT(null)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
                 Commit Assessment
               </button>
            </div>
          </div>
        </div>
      )}

      {/* GT Inlay Modal */}
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
               <button onClick={() => setSelectedPatientForGT(null)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
                 Sync Feeding Logs
               </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto flex items-center justify-between py-6 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
        <p>Powered by <span className="text-quro-teal font-bold">ModernQure LLC</span></p>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 opacity-40">
          <div className="w-4 h-4 text-quro-teal rotate-45">✦</div>
        </div>
      </footer>
    </div>
  );
}

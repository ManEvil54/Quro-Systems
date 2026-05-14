// ============================================================
// Quro — Dashboard (Landing Page)
// ============================================================
'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  Bell,
  Search,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, type DashboardBed } from '@/hooks/useDashboard';
import PatientCard from '@/components/dashboard/PatientCard';
import VitalsInlay from '@/components/clinical/VitalsInlay';
import GlobalIntelligenceBar from '@/components/dashboard/GlobalIntelligenceBar';
import RT_Assessment_Inlay from '@/components/clinical/RTAssessmentInlay';
import GT_Feeding_Inlay from '@/components/clinical/GTFeedingInlay';
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
    <div className={`animate-in fade-in duration-700 min-h-screen bg-slate-50/30 ${isImpersonating ? 'border-t-4 border-rose-500' : ''}`}>
      
      {/* Ghost Mode Advanced Tools - Sticky Top */}
      {isImpersonating && (
        <div className="no-print p-6 bg-rose-500 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <ShieldAlert size={24} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ghost Mode Active</p>
              <h3 className="text-xl font-black uppercase tracking-tight">System Diagnostic Override</h3>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-black/20 rounded-xl text-center">
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">Latency</p>
              <p className="text-sm font-bold">0.02ms</p>
            </div>
            <div className="px-4 py-2 bg-black/20 rounded-xl text-center">
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">Sync</p>
              <p className="text-sm font-bold">100%</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT SIDEBAR: Facility & Nav */}
          <aside className="lg:col-span-2 space-y-6 sticky top-8">
            <div className="bg-white border border-slate-100 p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-6 py-4 mb-2">Facility Switcher</p>
              <div className="flex flex-col gap-2">
                {Object.keys(facilityNames).map((facId) => (
                  <button
                    key={facId}
                    onClick={() => setActiveFacility(facId)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                      activeFacility === facId 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    <Building2 size={16} className={activeFacility === facId ? 'text-quro-teal' : ''} />
                    <span className="truncate">{facilityNames[facId]}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
                <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  <LayoutDashboard size={16} />
                  Main Grid
                </button>
                <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  <Users size={16} />
                  Staffing
                </button>
                <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  <Activity size={16} />
                  Analytics
                </button>
              </div>
            </div>

            {/* Shift Context Card */}
            <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">On Shift</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-quro-teal text-white rounded-2xl flex items-center justify-center font-black text-xl">
                    {staff?.first_name?.[0] || 'N'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight">{staff?.first_name} {staff?.last_name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Unit Supervisor</p>
                  </div>
                </div>
                <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  End Shift Log
                </button>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-quro-teal/10 rounded-full blur-2xl" />
            </div>
          </aside>

          {/* MAIN COLUMN: Patient Grid */}
          <main className="lg:col-span-7 space-y-8">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-1">
                  Clinical Dashboard
                </h1>
                <p className="text-slate-500 text-xs font-black tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {facilityNames[activeFacility]} — 6 Clinical Beds
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Quick Search MRN/Room..."
                    className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:border-quro-teal transition-all w-64"
                  />
                </div>
              </div>
            </div>

            {/* AI Synthesis Bar */}
            <GlobalIntelligenceBar />

            {/* Bed Grid */}
            <div className={`grid gap-8 ${viewType === 'boutique' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'}`}>
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
          </main>

          {/* RIGHT SIDEBAR: Alerts & Telemetry */}
          <aside className="lg:col-span-3 space-y-8 sticky top-8">
            <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Bell size={18} className="text-rose-500" />
                  Priority Alerts
                </h3>
                <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                  {alerts.length} Active
                </span>
              </div>

              <div className="space-y-4">
                {alerts.length > 0 ? alerts.map((alert, i) => (
                  <div key={i} className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl group hover:bg-rose-50 transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-rose-900 uppercase tracking-tight mb-1">{alert.title || 'Vitals Deviation'}</p>
                        <p className="text-[10px] text-rose-700 font-medium leading-relaxed">{alert.message || 'Systolic BP outside of safe parameters for Bed 101-A.'}</p>
                        <p className="text-[8px] font-bold text-rose-300 uppercase mt-2">Just Now</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                    No active clinical alerts
                  </div>
                )}
              </div>

              <button className="w-full mt-6 py-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                View Alert History
              </button>
            </div>

            {/* House Census Summary */}
            <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <Shield size={18} className="text-quro-teal" />
                House Metrics
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Census</p>
                  <p className="text-lg font-black text-slate-900">42 / 50</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Acuity</p>
                  <p className="text-lg font-black text-rose-500">3.8</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Completion</p>
                  <p className="text-lg font-black text-emerald-500">84%</p>
                </div>
              </div>
            </div>
          </aside>
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
               <button onClick={() => setSelectedPatientForRT(null)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
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
               <button onClick={() => setSelectedPatientForGT(null)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20">
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

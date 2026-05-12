// ============================================================
// Quro — Dashboard (Landing Page)
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Pill,
  Activity,
  ShieldAlert,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, type DashboardBed } from '@/hooks/useDashboard';
import PatientCard from '@/components/dashboard/PatientCard';
import VitalsInlay from '@/components/clinical/VitalsInlay';
import GlobalIntelligenceBar from '@/components/dashboard/GlobalIntelligenceBar';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function DashboardPage() {
  const { organization, staff, activeFacility: authActiveFacility } = useAuth();
  const [activeFacility, setActiveFacility] = useState(authActiveFacility?.id || 'platinum-health-hub');
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<any>(null);
  
  // Update local state when auth state changes
  useEffect(() => {
    if (authActiveFacility?.id) {
      setActiveFacility(authActiveFacility.id);
    }
  }, [authActiveFacility?.id]);
  // Constant view type for simplified demo
  const viewType = 'boutique';
  
  const facilityNames: Record<string, string> = {
    'platinum-health-hub': 'Platinum Health Hub',
    'oak-ridge': 'Oak Ridge Memory Care',
    'cedar-haven': 'Cedar Haven Assisted Living'
  };

  const { beds: facilityBeds, alerts, loading } = useDashboard(activeFacility);
  
  // High-Fidelity Mock Patients for Platinum Health Hub (Design Demo)
  const mockPatients: DashboardBed[] = [
    {
      id: 'bed-1',
      bed_name: 'Bed 1',
      room_name: 'Room 101',
      room_id: '101',
      status: 'occupied',
      patient: {
        id: 'manny-evil',
        initials: 'ME',
        mrn: '666-GHOST',
        status: 'Critical',
        hr: 112,
        bp: '148/92',
        temp: 99.1,
        is_active_monitoring: true,
        code_status: 'DNR',
        diagnoses: ['Hypertension', 'Tachycardia']
      }
    },
    {
      id: 'bed-2',
      bed_name: 'Bed 2',
      room_name: 'Room 102',
      room_id: '102',
      status: 'occupied',
      patient: {
        id: 'sarah-miller',
        initials: 'SM',
        mrn: 'MRN-8821',
        status: 'Stable',
        hr: 72,
        bp: '120/80',
        temp: 98.6,
        is_active_monitoring: false,
        code_status: 'Full Code',
        diagnoses: ['Post-Op Hip', 'PT Recovery']
      }
    },
    {
      id: 'bed-3',
      bed_name: 'Bed 3',
      room_name: 'Room 103',
      room_id: '103',
      status: 'occupied',
      patient: {
        id: 'james-wilson',
        initials: 'JW',
        mrn: 'MRN-4492',
        status: 'Critical',
        hr: 94,
        bp: '162/98',
        temp: 98.9,
        is_active_monitoring: true,
        code_status: 'DNR/DNI',
        diagnoses: ['CHF', 'Diabetes Type II']
      }
    },
    {
      id: 'bed-4',
      bed_name: 'Bed 4',
      room_name: 'Room 104',
      room_id: '104',
      status: 'occupied',
      patient: {
        id: 'elena-rod',
        initials: 'ER',
        mrn: 'MRN-1102',
        status: 'Stable',
        hr: 68,
        bp: '118/74',
        temp: 98.4,
        is_active_monitoring: false,
        code_status: 'Full Code',
        diagnoses: ['Early Onset Dementia']
      }
    },
    {
      id: 'bed-5',
      bed_name: 'Bed 5',
      room_name: 'Room 105',
      room_id: '105',
      status: 'occupied',
      patient: {
        id: 'david-chen',
        initials: 'DC',
        mrn: 'MRN-9938',
        status: 'Critical',
        hr: 105,
        bp: '140/90',
        temp: 100.2,
        is_active_monitoring: true,
        code_status: 'Full Code',
        diagnoses: ['Post-Stroke Rehab', 'Aphasia']
      }
    },
    {
      id: 'bed-6',
      bed_name: 'Bed 6',
      room_name: 'Room 106',
      room_id: '106',
      status: 'available',
    }
  ];

  // Fill empty slots if needed, or just use the beds from the hook
  // Strictly limit to 6 beds for Platinum Health Hub demo
  const rawBeds = activeFacility === 'platinum-health-hub' 
    ? (facilityBeds.length > 1 ? facilityBeds : mockPatients)
    : (facilityBeds.length > 0 ? facilityBeds : Array.from({ length: 6 }, (_, i) => ({
        id: `empty-${i}`,
        bed_name: `Bed ${i + 1}`,
        room_name: 'Unassigned',
        room_id: 'none',
        status: 'available' as const,
        patient: undefined
      })));

  const beds = rawBeds.slice(0, 6);

  const handleVitalsSubmit = async (data: any) => {
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
            {viewType === 'enterprise' ? 'Enterprise Facility Cluster' : 'Boutique Care Facility'}
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
            onVitalsClick={(p) => setSelectedPatientForVitals(p)}
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

      <footer className="mt-auto flex items-center justify-between py-6 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
        <p>Powered by <span className="text-quro-teal font-bold">ModernQure LLC</span></p>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 opacity-40">
          <div className="w-4 h-4 text-quro-teal rotate-45">✦</div>
        </div>
      </footer>
    </div>
  );
}

function Heart({ size, fill = 'none' }: { size: number, fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );
}

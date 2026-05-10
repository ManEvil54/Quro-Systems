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
import { useDashboard } from '@/hooks/useDashboard';
import PatientCard from '@/components/dashboard/PatientCard';

export default function DashboardPage() {
  const { organization, staff, activeFacility: authActiveFacility } = useAuth();
  const [activeFacility, setActiveFacility] = useState(authActiveFacility?.id || 'platinum-health-hub');
  
  // Update local state when auth state changes
  useEffect(() => {
    if (authActiveFacility?.id) {
      setActiveFacility(authActiveFacility.id);
    }
  }, [authActiveFacility?.id]);
  const [viewType, setViewType] = useState<'boutique' | 'enterprise'>('boutique');
  
  const facilityNames: Record<string, string> = {
    'platinum-health-hub': 'Platinum Health Hub',
    'oak-ridge': 'Oak Ridge Memory Care',
    'cedar-haven': 'Cedar Haven Assisted Living'
  };

  const { beds: facilityBeds, alerts, loading } = useDashboard(activeFacility);

  // Fill empty slots if needed, or just use the beds from the hook
  // The hook already returns beds from the database. 
  // We'll use the hook's beds and ensure they are sorted or padded as desired.
  const beds = facilityBeds.length > 0 ? facilityBeds : Array.from({ length: 6 }, (_, i) => ({
    id: `empty-${i}`,
    bed_name: `Bed ${i + 1}`,
    room_name: 'Unassigned',
    room_id: 'none',
    status: 'available' as const
  }));

  const { isImpersonating } = useAuth();

  return (
    <div className={`animate-in -m-8 p-8 min-h-screen bg-white ${isImpersonating ? 'border-t-4 border-rose-500' : ''}`}>
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
            {facilityNames[activeFacility]} — {viewType === 'enterprise' ? '25' : '6'} Beds Managed
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
          
          <button 
            onClick={() => setViewType(viewType === 'boutique' ? 'enterprise' : 'boutique')}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter transition-all ${
              viewType === 'enterprise'
                ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/20'
                : 'bg-white/10 border-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <LayoutDashboard size={14} />
            {viewType === 'enterprise' ? 'Mndashboard (Active)' : 'Switch to Mndashboard'}
          </button>
        </div>
      </div>

      {/* Bed Grid */}
      <div className={`grid gap-6 ${viewType === 'boutique' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'}`}>
        {beds.map((bed) => (
          <PatientCard 
            key={bed.id} 
            bed={bed}
            isCritical={bed.patient?.status === 'Critical'}
            viewType={viewType}
            showDiagnostics={isImpersonating}
          />
        ))}
      </div>

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

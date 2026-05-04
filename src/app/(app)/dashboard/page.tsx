// ============================================================
// Quro — Dashboard (Landing Page)
// ============================================================
'use client';

import React, { useState } from 'react';
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
  const [activeFacility, setActiveFacility] = useState('house-a');
  const [viewType, setViewType] = useState<'boutique' | 'enterprise'>('boutique');
  const { isImpersonating } = useAuth();
  
  const facilityNames: Record<string, string> = {
    'house-a': 'Maple House',
    'house-b': 'Pine House',
    'house-c': 'Oak House'
  };

  const { patients, alerts, loading } = useDashboard(activeFacility);

  // Fill empty beds up to 6 or 25
  const maxBeds = viewType === 'enterprise' ? 25 : 6;
  const beds = Array.from({ length: maxBeds }, (_, i) => {
    // Try to find a patient for this specific bed index (1-based)
    const patient = patients.find(p => p.room_number === `${i + 1}` || p.room_number === `Bed ${i + 1}`);
    // If no specific room match, fill sequentially for now
    const seqPatient = !patient && i < patients.length ? patients[i] : patient;
    
    return seqPatient || { id: `empty-${i}`, empty: true, id_num: i + 1 };
  });

  return (
    <div className={`animate-in -m-8 p-8 min-h-screen bg-[#4A5E6F] ${isImpersonating ? 'border-t-4 border-rose-500' : ''}`}>
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

      <div className="flex gap-4 mb-8">
        {['house-a', 'house-b', 'house-c'].map((facId) => (
          <button
            key={facId}
            onClick={() => setActiveFacility(facId)}
            className={`flex-1 py-4 rounded-xl font-bold text-xs tracking-widest transition-all ${
              activeFacility === facId 
                ? 'bg-[#3A4A58] text-teal-400 border border-teal-500/30 shadow-lg' 
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            {facilityNames[facId].toUpperCase()} {activeFacility === facId && <span className="text-[10px] text-teal-400/60 ml-2">(Active)</span>}
          </button>
        ))}
      </div>

      {/* Facility Sub-Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {viewType === 'enterprise' ? 'Enterprise Facility Cluster' : 'Boutique Care Facility'}
          </h1>
          <p className="text-slate-300 text-sm opacity-70">
            {facilityNames[activeFacility]} — {viewType === 'enterprise' ? '25' : '6'} Beds Managed
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-[#5A6E7F]/40 p-3 rounded-2xl flex items-center gap-3 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Alert Feed</p>
              <p className="text-[10px] text-slate-300">{alerts.length} priority alerts</p>
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
      <div className={`grid gap-6 mb-12 ${
        viewType === 'enterprise' 
          ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {beds.map((bed: any, i) => (
          <PatientCard 
            key={bed.id} 
            patient={bed} 
            isCritical={bed.status === 'Critical'} 
            viewType={viewType}
            showDiagnostics={isImpersonating}
          />
        ))}
      </div>

      <footer className="mt-auto flex items-center justify-between py-6 border-t border-white/5 text-[10px] text-slate-400 font-medium">
        <p>Powered by <span className="text-slate-300 underline underline-offset-4 decoration-slate-600">ModernQure LLC</span></p>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 opacity-40">
          <div className="w-4 h-4 text-white rotate-45">✦</div>
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

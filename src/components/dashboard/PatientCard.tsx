// ============================================================
// Quro — PatientCard Component
// High-Density Bento Layout with Medical Spa Aesthetic
// ============================================================
import React from 'react';
import { Heart, Activity, Pill, AlertTriangle } from 'lucide-react';

interface Patient {
  id: string;
  room_number: string | null;
  initials: string;
  mrn: string;
  status: 'Critical' | 'Stable';
  hr: number | null;
  bp: string | null;
  temp: number | null;
  empty?: boolean;
  id_num?: number;
}

interface PatientCardProps {
  patient: any;
  isCritical: boolean;
  viewType: 'boutique' | 'enterprise';
  showDiagnostics?: boolean;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, isCritical, viewType, showDiagnostics }) => {
  if (patient.empty) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center h-full min-h-[180px] opacity-10 border-dashed border-2 border-white/10">
        <div className="w-10 h-10 rounded-full border border-dashed border-white/20 mb-2 flex items-center justify-center">
          <span className="text-white/30 text-xl font-light">+</span>
        </div>
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Bed {patient.id_num} Empty</p>
      </div>
    );
  }

  const isBoutique = viewType === 'boutique';

  return (
    <div className={`rounded-2xl transition-all duration-500 overflow-hidden group border ${
      isCritical 
        ? 'bg-[#1E293B] border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] scale-[1.02]' 
        : 'bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20'
    } ${isBoutique ? 'p-6' : 'p-4'}`}>
      
      {/* Header: Initial & Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
            isBoutique ? 'h-12 w-12 text-sm' : 'h-8 w-8 text-[10px]'
          } ${isCritical ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-quro-charcoal text-white'}`}>
            {patient.initials}
          </div>
          <div>
            <p className={`font-bold tracking-widest uppercase mb-0.5 ${isBoutique ? 'text-[10px]' : 'text-[8px]'} ${isCritical ? 'text-red-400' : 'text-quro-glow'}`}>
              Room {patient.room_number || 'TBD'}
            </p>
            <p className={`font-bold text-white truncate ${isBoutique ? 'text-lg' : 'text-sm'}`}>
              {patient.initials} Patient
            </p>
          </div>
        </div>
        {isCritical && (
          <div className="flex items-center gap-1.5 bg-red-500/90 text-white text-[9px] px-2 py-1 rounded-full font-black animate-pulse shadow-lg shadow-red-500/30">
            <AlertTriangle size={10} />
            CRITICAL
          </div>
        )}
      </div>

      {/* Vitals Bento Grid */}
      <div className={`grid grid-cols-2 gap-2 rounded-xl p-3 border backdrop-blur-sm ${
        isCritical ? 'bg-black/20 border-white/5' : 'bg-white/5 border-white/5'
      } ${isBoutique ? 'mt-2' : ''}`}>
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <Heart size={10} className={patient.hr > 120 || patient.hr < 60 || isCritical ? 'text-red-400' : 'text-quro-glow'} />
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${isCritical ? 'text-white/60' : 'text-white/50'}`}>HR</span>
          </div>
          <span className={`font-bold ${isBoutique ? 'text-xl' : 'text-sm'} ${patient.hr > 120 || patient.hr < 60 || isCritical ? 'text-red-400' : 'text-white'}`}>
            {patient.hr || '--'}
          </span>
        </div>
        
        <div className="flex flex-col border-l border-white/10 pl-3">
          <div className="flex items-center gap-1 mb-1">
            <Activity size={10} className={isCritical ? 'text-red-400' : 'text-quro-glow'} />
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${isCritical ? 'text-white/60' : 'text-white/50'}`}>BP</span>
          </div>
          <span className={`font-bold text-white ${isBoutique ? 'text-xl' : 'text-sm'}`}>
            {patient.bp || '--'}
          </span>
        </div>

        <div className="flex flex-col mt-2 pt-2 border-t border-white/10">
          <span className="text-[8px] text-white/40 font-bold uppercase tracking-tighter mb-1">Temp</span>
          <span className={`font-bold text-white ${isBoutique ? 'text-sm' : 'text-xs'}`}>
            {patient.temp ? `${patient.temp}°F` : '--'}
          </span>
        </div>

        <div className="flex flex-col mt-2 pt-2 border-t border-white/10 border-l pl-3">
          <span className="text-[8px] text-white/40 font-bold uppercase tracking-tighter mb-1">SpO2</span>
          <span className={`font-bold text-quro-glow ${isBoutique ? 'text-sm' : 'text-xs'}`}>
            {patient.spo2 || '98'}%
          </span>
        </div>
      </div>

      {/* Handoff Insight */}
      <div className={`mt-3 p-3 rounded-xl border ${
        patient.latest_handoff?.is_signed_off 
          ? 'bg-white/5 border-white/5' 
          : 'bg-rose-500/10 border-rose-500/30'
      }`}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Latest Shift Note</span>
          {patient.latest_handoff && !patient.latest_handoff.is_signed_off && (
            <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">!! PENDING SIGN-OFF !!</span>
          )}
        </div>
        <p className="text-[10px] text-white/80 line-clamp-2 leading-relaxed italic">
          {patient.latest_handoff?.situation || "No shift notes yet."}
        </p>
        {patient.latest_handoff && patient.latest_handoff.pending_tasks_count > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[9px] font-bold text-amber-500/80 uppercase">
              {patient.latest_handoff.pending_tasks_count} Pending Tasks
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity`}>
        <div className="flex gap-3">
          <Pill size={14} className="text-white/40 hover:text-quro-glow cursor-pointer transition-colors" />
          <FileText size={14} className="text-white/40 hover:text-quro-glow cursor-pointer transition-colors" />
        </div>
        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">CENSUS READY</span>
      </div>

      {/* Diagnostic Overlay (Level 0 Only) */}
      {showDiagnostics && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
            <span className="text-rose-300">Data Integrity</span>
            <span className="text-white">ID: {patient.id.substring(0, 8)}...</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-2 py-1 bg-black/20 rounded-md">
              <p className="text-[7px] text-slate-400 uppercase">MRN</p>
              <p className="text-[9px] font-bold text-white tracking-tighter">{patient.mrn || '772-401'}</p>
            </div>
            <div className="px-2 py-1 bg-black/20 rounded-md">
              <p className="text-[7px] text-slate-400 uppercase">Fall Protocol</p>
              <p className="text-[9px] font-bold text-teal-400 tracking-tighter">{patient.is_active_monitoring ? 'ACTIVE' : 'NULL'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { FileText } from 'lucide-react';
export default PatientCard;

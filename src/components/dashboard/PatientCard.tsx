import React from 'react';
import { Heart, Activity, Pill, AlertTriangle, FileText, UserPlus, ShieldAlert } from 'lucide-react';
import type { DashboardBed } from '@/hooks/useDashboard';

interface PatientCardProps {
  bed: DashboardBed;
  isCritical: boolean;
  viewType: 'boutique' | 'enterprise';
  showDiagnostics?: boolean;
}

const PatientCard: React.FC<PatientCardProps> = ({ bed, isCritical, viewType, showDiagnostics }) => {
  const isBoutique = viewType === 'boutique';
  const { patient } = bed;

  if (!patient) {
    return (
      <div className={`glass-card-quro rounded-3xl p-6 border border-dashed border-white/30 flex flex-col items-center justify-center min-h-[220px] transition-all duration-500 hover:border-quro-teal/40 group cursor-pointer ${
        bed.status === 'maintenance' ? 'bg-amber-500/5' : 'bg-white/5'
      }`}>
        <div className="w-12 h-12 rounded-full bg-quro-charcoal/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
          {bed.status === 'maintenance' ? <ShieldAlert size={20} className="text-amber-500" /> : <UserPlus size={20} className="text-slate-400" />}
        </div>
        <p className="font-black text-[8px] tracking-[0.2em] text-slate-400 uppercase mb-1">{bed.room_name}</p>
        <p className="font-black text-lg text-white opacity-40 mb-3">{bed.bed_name}</p>
        <div className={`px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase border ${
          bed.status === 'maintenance' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'
        }`}>
          {bed.status === 'maintenance' ? 'Out of Service' : 'Ready for Admit'}
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card-quro rounded-3xl transition-all duration-700 overflow-hidden group border ${
      isCritical 
        ? 'border-red-500/50 critical-glow-quro scale-[1.03] z-10' 
        : 'border-white/20 hover:border-quro-teal/30 hover:shadow-2xl hover:shadow-quro-teal/5'
    } ${isBoutique ? 'p-8' : 'p-5'}`}>
      
      {/* Header: Initial & Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
            isBoutique ? 'h-12 w-12 text-sm' : 'h-8 w-8 text-[10px]'
          } ${isCritical ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-quro-charcoal text-white'}`}>
            {patient.initials}
          </div>
          <div>
            <p className={`font-black tracking-widest uppercase mb-0.5 ${isBoutique ? 'text-[10px]' : 'text-[8px]'} ${isCritical ? 'text-red-400' : 'text-quro-teal'}`}>
              {bed.room_name} • {bed.bed_name}
            </p>
            <p className={`font-black truncate ${isBoutique ? 'text-lg' : 'text-sm'} ${isCritical ? 'text-white' : 'text-white'}`}>
              Patient {patient.initials}
            </p>
          </div>
        </div>
        {isCritical && (
          <div className="flex items-center gap-2 bg-red-500 text-white text-[8px] px-3 py-1.5 rounded-full font-black tracking-widest shadow-xl shadow-red-500/40 border border-white/20">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            CRITICAL
          </div>
        )}
      </div>

      {/* Vitals Bento Grid */}
      <div className={`grid grid-cols-2 gap-4 rounded-2xl p-4 border backdrop-blur-xl ${
        isCritical ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'
      } ${isBoutique ? 'mt-4' : ''}`}>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart size={12} className={patient.hr && (patient.hr > 110 || patient.hr < 60) ? 'text-red-500' : 'text-quro-teal'} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-slate-400'}`}>Pulse</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`font-black tracking-tighter ${isBoutique ? 'text-3xl' : 'text-xl'} ${isCritical ? 'text-white' : 'text-white'}`}>
              {patient.hr || '--'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">bpm</span>
          </div>
        </div>
        
        <div className="flex flex-col border-l border-white/10 pl-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={12} className={isCritical ? 'text-red-500' : 'text-quro-teal'} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-slate-400'}`}>BP</span>
          </div>
          <span className={`font-black tracking-tighter ${isBoutique ? 'text-2xl' : 'text-xl'} ${isCritical ? 'text-white' : 'text-white'}`}>
            {patient.bp || '--'}
          </span>
        </div>

        <div className="flex flex-col mt-2 pt-4 border-t border-white/40">
          <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Temp</span>
          <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${isCritical ? 'text-red-400' : 'text-slate-200'}`}>
            {patient.temp ? `${patient.temp}°F` : '--'}
          </span>
        </div>

        <div className="flex flex-col mt-2 pt-4 border-t border-white/10 border-l pl-4">
          <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">SpO2</span>
          <span className={`font-bold text-quro-teal ${isBoutique ? 'text-lg' : 'text-sm'}`}>
            98%
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={`mt-4 pt-4 border-t border-white/10 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity`}>
        <div className="flex gap-3">
          <Pill size={14} className="text-slate-400 hover:text-quro-teal cursor-pointer transition-colors" />
          <FileText size={14} className="text-slate-400 hover:text-quro-teal cursor-pointer transition-colors" />
        </div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CENSUS READY</span>
      </div>

      {/* Diagnostic Overlay */}
      {showDiagnostics && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
            <span className="text-rose-300">Data Integrity</span>
            <span className="text-white">ID: {patient.id.substring(0, 8)}...</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-2 py-1 bg-black/20 rounded-md">
              <p className="text-[7px] text-slate-400 uppercase">MRN</p>
              <p className="text-[9px] font-bold text-white tracking-tighter">{patient.mrn}</p>
            </div>
            <div className="px-2 py-1 bg-black/20 rounded-md">
              <p className="text-[7px] text-slate-400 uppercase">Alert</p>
              <p className="text-[9px] font-bold text-teal-400 tracking-tighter">{isCritical ? 'TRUE' : 'FALSE'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCard;

import React, { useState } from 'react';
import { Heart, Activity, Pill, FileText, UserPlus, ShieldAlert, Wind, Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import type { DashboardBed } from '@/hooks/useDashboard';

type DashboardPatient = NonNullable<DashboardBed['patient']>;

interface PatientCardProps {
  bed: DashboardBed;
  isCritical: boolean;
  viewType: 'boutique' | 'enterprise';
  showDiagnostics?: boolean;
  onVitalsClick?: (patient: DashboardPatient) => void;
  onRTClick?: (patient: DashboardPatient) => void;
  onGTClick?: (patient: DashboardPatient) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ bed, isCritical, viewType, showDiagnostics, onVitalsClick, onRTClick, onGTClick }) => {
  const isBoutique = viewType === 'boutique';
  const { patient } = bed;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!patient) {
    return (
      <div className={`glass-card-quro rounded-3xl p-6 border border-dashed border-white/20 flex flex-col items-center justify-center min-h-[240px] transition-all duration-700 hover:border-quro-teal/40 group cursor-pointer ${
        bed.status === 'maintenance' ? 'bg-amber-950/10' : 'bg-black/20'
      }`}>
        <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:bg-quro-teal/10 border border-white/5">
          {bed.status === 'maintenance' ? <ShieldAlert size={24} className="text-amber-500" /> : <UserPlus size={24} className="text-slate-500 group-hover:text-quro-teal transition-colors" />}
        </div>
        <p className="font-black text-[9px] tracking-[0.3em] text-slate-500 uppercase mb-1">{bed.room_name}</p>
        <p className="font-black text-2xl text-white opacity-20 mb-4 group-hover:opacity-40 transition-opacity">{bed.bed_name}</p>
        <div className={`px-6 py-2 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border transition-all duration-500 ${
          bed.status === 'maintenance' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-slate-500 group-hover:border-quro-teal/40 group-hover:text-quro-teal'
        }`}>
          {bed.status === 'maintenance' ? 'Out of Service' : 'CENSUS READY'}
        </div>
      </div>
    );
  }

  return (
    <div className="block h-full">
      <div className={`glass-card-quro rounded-3xl transition-all duration-700 overflow-hidden group border h-full ${
        isCritical 
          ? 'border-red-500/50 critical-glow-red critical-ripple scale-[1.03] z-10' 
          : 'border-white/20 hover:border-quro-teal/30 hover:shadow-2xl hover:shadow-quro-teal/5'
      } ${isBoutique ? 'p-8' : 'p-5'}`}>
        
        <Link href={`/patients/${patient.id}`} className="block">
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
                <p className={`font-black truncate tracking-tight ${isBoutique ? 'text-2xl' : 'text-base'} ${isCritical ? 'text-white' : 'text-slate-100'}`}>
                  {patient.full_name || `Patient ${patient.initials}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCritical && (
                <div className="flex items-center gap-2 bg-red-600 text-white text-[8px] px-3 py-1.5 rounded-full font-black tracking-widest shadow-xl shadow-red-600/40 border border-white/20 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  CRITICAL
                </div>
              )}
              {!isCritical && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="p-1.5 rounded-xl bg-white/5 text-slate-500 hover:bg-quro-teal/10 hover:text-quro-teal transition-all"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>
          </div>
        </Link>

        {/* Vitals Bento Grid — Tap area for Quick Entry */}
        <div 
          onClick={(e) => {
            if (onVitalsClick) {
              e.preventDefault();
              e.stopPropagation();
              onVitalsClick(patient);
            }
          }}
          className={`grid grid-cols-2 gap-4 rounded-2xl p-4 border backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] active:scale-95 cursor-pointer ${
            isCritical ? 'bg-red-950/20 border-red-500/30' : 'bg-black/20 border-white/5 hover:border-quro-teal/40 hover:bg-quro-teal/10'
          } ${isBoutique ? 'mt-4' : ''}`}
        >
          {/* Top Row: Pulse & BP (Always Visible) */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <Heart size={12} className={`${patient.hr && (patient.hr > 110 || patient.hr < 60) ? 'text-red-500' : 'text-quro-teal'} animate-vital-pulse`} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-slate-500'}`}>Pulse</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span key={patient.hr} className={`font-black tracking-tighter animate-vital-update ${isBoutique ? 'text-3xl' : 'text-xl'} ${isCritical ? 'text-white' : 'text-white'}`}>
                {patient.hr || '--'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">bpm</span>
            </div>
          </div>
          
          <div className="flex flex-col border-l border-white/10 pl-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={12} className={isCritical ? 'text-red-500' : 'text-quro-teal'} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-slate-500'}`}>BP</span>
            </div>
            <span key={patient.bp} className={`font-black tracking-tighter animate-vital-update ${isBoutique ? 'text-2xl' : 'text-xl'} ${isCritical ? 'text-white' : 'text-white'}`}>
              {patient.bp || '--'}
            </span>
          </div>

          {/* Collapsible Lower Vitals */}
          {(isExpanded || isCritical) && (
            <div className="col-span-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col mt-2 pt-4 border-t border-white/10">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Temp</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${isCritical ? 'text-red-400' : 'text-slate-200'}`}>
                  {patient.temp ? `${Number(patient.temp).toFixed(1)}°F` : '--'}
                </span>
              </div>

              <div className="flex flex-col mt-2 pt-4 border-t border-white/10 border-l pl-4">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">RR</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${patient.resp && patient.resp > 22 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                  {patient.resp || '--'}
                </span>
              </div>

              <div className="flex flex-col mt-2 pt-4 border-t border-white/10">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">SpO2</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${patient.spo2 && patient.spo2 < 92 ? 'text-red-500 animate-pulse' : 'text-quro-teal'}`}>
                  {patient.spo2 ? `${patient.spo2}%` : '--'}
                </span>
              </div>

              <div className="flex flex-col mt-2 pt-4 border-t border-white/10 border-l pl-4">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Pain</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${patient.pain && patient.pain > 4 ? 'text-amber-500' : 'text-slate-200'}`}>
                  {patient.pain !== null ? `${patient.pain}/10` : '--'}
                </span>
              </div>

              <div className="flex flex-col mt-2 pt-4 border-t border-white/10">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Glucose</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} ${patient.glucose && (patient.glucose > 200 || patient.glucose < 70) ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                  {patient.glucose || '--'}
                </span>
              </div>

              <div className="flex flex-col mt-2 pt-4 border-t border-white/10 border-l pl-4">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Weight</span>
                <span className={`font-bold ${isBoutique ? 'text-lg' : 'text-sm'} text-slate-200`}>
                  {patient.weight ? `${patient.weight} lbs` : '--'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Clinical Content */}
        {(isExpanded || isCritical) && (
          <div className="animate-in slide-in-from-top-2 duration-500">
            {/* Clinical Snippet */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                  patient.code_status?.toLowerCase().includes('dnr') || patient.code_status?.toLowerCase().includes('comfort') 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                }`}>
                  {patient.code_status ? (patient.code_status.toUpperCase().includes('CODE') ? patient.code_status : `${patient.code_status} CODE`) : 'FULL CODE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">
                {patient.diagnoses && patient.diagnoses.length > 0 
                  ? patient.diagnoses.join(' • ') 
                  : 'No clinical diagnoses listed'}
              </p>
              
              {/* RT & GT Rapid Tiles */}
              <div className="flex gap-2 mt-3">
                {(patient.diagnoses?.some((d: string) => d.includes('COPD') || d.includes('Pneumonia') || d.includes('Respiratory')) || patient.id === 'arthur-morgan') && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRTClick?.(patient); }}
                    className="flex-1 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all group/rt"
                  >
                    <Wind size={12} className="text-cyan-500 group-hover/rt:animate-pulse" />
                    <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Respiratory</span>
                  </button>
                )}
                {(patient.diagnoses?.some((d: string) => d.includes('PEG') || d.includes('Dysphagia') || d.includes('Diabetes')) || patient.id === 'margaret-thompson') && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onGTClick?.(patient); }}
                    className="flex-1 py-2 bg-quro-teal/10 border border-quro-teal/20 rounded-xl flex items-center justify-center gap-2 hover:bg-quro-teal/20 transition-all group/gt"
                  >
                    <Droplets size={12} className="text-quro-teal group-hover/gt:animate-bounce" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Enteral</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className={`mt-4 pt-4 border-t border-white/10 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity`}>
              <div className="flex gap-3">
                <Pill size={14} className="text-slate-400 hover:text-quro-teal cursor-pointer transition-colors" />
                <FileText size={14} className="text-slate-400 hover:text-quro-teal cursor-pointer transition-colors" />
              </div>
              <span className="text-[8px] font-black text-slate-500/50 uppercase tracking-[0.2em] group-hover:text-quro-teal transition-colors">ACTIVE MONITORING</span>
            </div>
          </div>
        )}

        {/* Diagnostic Overlay (Always outside collapsible to ensure visibility when debugging) */}
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
    </div>
  );
};

export default PatientCard;

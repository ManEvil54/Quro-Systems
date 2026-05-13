'use client';

import React from 'react';
import { Droplets, Activity, AlertCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import { EnteralState } from '@/lib/firebase/types';

interface GTFeedingInlayProps {
  data: EnteralState;
  onChange: (data: EnteralState) => void;
}

export default function GT_Feeding_Inlay({ data, onChange }: GTFeedingInlayProps) {
  const isHighResidual = data.last_residual_volume > 150;

  return (
    <div className="space-y-6">
      {/* 1. Order Summary & Status */}
      <div className="glass-card p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] text-white shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-quro-teal/20 rounded-2xl flex items-center justify-center text-quro-teal border border-quro-teal/30">
              <FlaskConical size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-quro-teal">GT Order active</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Formula: {data.formula_name}</p>
            </div>
          </div>
          <button 
            onClick={() => onChange({ ...data, is_paused: !data.is_paused })}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${data.is_paused ? 'bg-amber-500 text-white' : 'bg-quro-teal text-slate-900'}`}
          >
            {data.is_paused ? 'FEEDING PAUSED' : 'ACTIVE RUNNING'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Method</p>
            <p className="text-xs font-black uppercase">{data.delivery_method}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Rate</p>
            <p className="text-xs font-black uppercase">{data.delivery_method === 'Continuous' ? `${data.rate_ml_hr} mL/hr` : `${data.bolus_volume} mL Bolus`}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pre-Flush</p>
            <p className="text-xs font-black uppercase text-quro-teal">{data.water_flush_pre} mL H2O</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Post-Flush</p>
            <p className="text-xs font-black uppercase text-quro-teal">{data.water_flush_post} mL H2O</p>
          </div>
        </div>
      </div>

      {/* 2. Administration & Safety */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          {isHighResidual && (
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
                <AlertCircle size={10} /> HIGH RESIDUAL
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHighResidual ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-900'}`}>
              <Droplets size={20} />
            </div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Residual Check</h3>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <input 
                type="number"
                value={data.last_residual_volume}
                onChange={(e) => onChange({ ...data, last_residual_volume: parseInt(e.target.value) })}
                className={`w-full p-6 bg-slate-50 border-2 rounded-3xl font-black text-3xl outline-none transition-all ${isHighResidual ? 'border-rose-200 focus:border-rose-500 text-rose-600' : 'border-slate-100 focus:border-slate-900'}`}
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">mL</span>
            </div>
            
            {isHighResidual && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
                <AlertCircle size={18} className="text-rose-500 shrink-0" />
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight leading-relaxed">
                  Volume exceeds 150mL protocol limit. PAUSE feeding and notify Charge Nurse / Physician.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Activity size={20} />
            </div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Site Assessment</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {['Normal', 'Redness', 'Drainage', 'Granulation'].map(status => (
              <button
                key={status}
                onClick={() => onChange({ ...data, site_condition: status as EnteralState['site_condition'] })}
                className={`py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${
                  data.site_condition === status ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button className="w-full py-4 bg-quro-teal text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-quro-teal/80 transition-all flex items-center justify-center gap-3">
            <CheckCircle2 size={16} />
            Confirm Water Flush (Post-Med)
          </button>
        </div>
      </div>
    </div>
  );
}

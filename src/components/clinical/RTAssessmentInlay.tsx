'use client';

import React from 'react';
import { Wind, Activity, AlertCircle, Heart } from 'lucide-react';
import { RespiratoryState } from '@/lib/firebase/types';

interface RTAssessmentInlayProps {
  data: RespiratoryState;
  onChange: (data: RespiratoryState) => void;
}

type LungSound = 'Clear' | 'Wheezing' | 'Crackles' | 'Diminished';

export default function RT_Assessment_Inlay({ data, onChange }: RTAssessmentInlayProps) {
  const sounds: LungSound[] = ['Clear', 'Wheezing', 'Crackles', 'Diminished'];
  const colors = ['Clear', 'White', 'Yellow', 'Green'];

  const updateSounds = (quadrant: keyof RespiratoryState['lung_sounds'], value: LungSound) => {
    onChange({
      ...data,
      lung_sounds: {
        ...data.lung_sounds,
        [quadrant]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. O2 Delivery & Trach Care */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
              <Wind size={20} />
            </div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">O2 Delivery</h3>
          </div>
          
          <div className="space-y-4">
            <select 
              value={data.o2_delivery}
              onChange={(e) => onChange({ ...data, o2_delivery: e.target.value as RespiratoryState['o2_delivery'] })}
              className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-[10px] uppercase outline-none"
            >
              <option>Room Air</option>
              <option>Nasal Cannula</option>
              <option>Trach Mask</option>
              <option>Ventilator</option>
              <option>Cool Mist</option>
            </select>

            {data.o2_delivery === 'Nasal Cannula' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Flow Rate (LPM)</p>
                <input 
                  type="number"
                  value={data.lpm}
                  onChange={(e) => onChange({ ...data, lpm: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-sm outline-none"
                  placeholder="e.g. 2"
                />
              </div>
            )}

            {(data.o2_delivery === 'Trach Mask' || data.o2_delivery === 'Cool Mist') && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">FiO2 Percentage (%)</p>
                <input 
                  type="number"
                  value={data.fio2_percent}
                  onChange={(e) => onChange({ ...data, fio2_percent: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-black text-sm outline-none"
                  placeholder="e.g. 40"
                />
              </div>
            )}

            {data.o2_delivery === 'Ventilator' && (
              <div className="animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">Vent Settings</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Mode</p>
                    <select 
                      value={data.vent_settings?.mode || 'AC/VC'}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: e.target.value as 'AC/VC' | 'AC/PC' | 'SIMV' | 'CPAP/PS' | 'Other',
                          ...(data.vent_settings || {})
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[9px] uppercase outline-none"
                    >
                      <option>AC/VC</option>
                      <option>AC/PC</option>
                      <option>SIMV</option>
                      <option>CPAP/PS</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">FiO2 (%)</p>
                    <input 
                      type="number"
                      value={data.vent_settings?.fio2}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: data.vent_settings?.mode || 'AC/VC',
                          ...(data.vent_settings || {}), 
                          fio2: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[10px] outline-none"
                      placeholder="FiO2"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Rate</p>
                    <input 
                      type="number"
                      value={data.vent_settings?.rate}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: data.vent_settings?.mode || 'AC/VC',
                          ...(data.vent_settings || {}), 
                          rate: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[10px] outline-none"
                      placeholder="Rate"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">PEEP</p>
                    <input 
                      type="number"
                      value={data.vent_settings?.peep}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: data.vent_settings?.mode || 'AC/VC',
                          ...(data.vent_settings || {}), 
                          peep: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[10px] outline-none"
                      placeholder="PEEP"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Tidal Vol (mL)</p>
                    <input 
                      type="number"
                      value={data.vent_settings?.tidal_volume}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: data.vent_settings?.mode || 'AC/VC',
                          ...(data.vent_settings || {}), 
                          tidal_volume: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[10px] outline-none"
                      placeholder="TV"
                    />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Pressure Supp</p>
                    <input 
                      type="number"
                      value={data.vent_settings?.pressure_support}
                      onChange={(e) => onChange({ 
                        ...data, 
                        vent_settings: { 
                          mode: data.vent_settings?.mode || 'AC/VC',
                          ...(data.vent_settings || {}), 
                          pressure_support: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg font-black text-[10px] outline-none"
                      placeholder="PS"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Activity size={20} />
            </div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Trach & Suction</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Consistency</p>
              <div className="flex gap-2">
                {['Thin', 'Thick'].map(val => (
                  <button
                    key={val}
                    onClick={() => onChange({ ...data, secretions_consistency: val as RespiratoryState['secretions_consistency'] })}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${data.secretions_consistency === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Color</p>
              <select 
                value={data.secretions_color}
                onChange={(e) => onChange({ ...data, secretions_color: e.target.value as RespiratoryState['secretions_color'] })}
                className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg font-black text-[9px] uppercase outline-none"
              >
                {colors.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {data.secretions_consistency === 'Thick' && data.secretions_color === 'Yellow' && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 animate-pulse">
              <AlertCircle size={14} className="text-rose-500" />
              <p className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Infection Risk Flagged by AI</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Visual Lung Map */}
      <div className="glass-card p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Auscultation Lung Map</h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1">Tap quadrant to toggle lung sounds</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md mx-auto aspect-[4/5] bg-slate-50 rounded-[3rem] border-4 border-white shadow-inner flex items-center justify-center">
          {/* Mock Torso/Lung Visual */}
          <div className="absolute inset-10 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col">
            <div className="flex-1 flex border-b border-dashed border-slate-200">
              {/* RUQ */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center relative group">
                <div className={`w-full h-full rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${data.lung_sounds.ruq === 'Clear' ? 'bg-emerald-50/50 hover:bg-emerald-100' : 'bg-rose-50/50 hover:bg-rose-100'}`}
                     onClick={() => {
                       const next = sounds[(sounds.indexOf(data.lung_sounds.ruq) + 1) % sounds.length] as RespiratoryState['lung_sounds']['ruq'];
                       updateSounds('ruq', next);
                     }}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">RUQ</p>
                  <p className={`text-[10px] font-black uppercase text-center ${data.lung_sounds.ruq === 'Clear' ? 'text-emerald-600' : 'text-rose-600'}`}>{data.lung_sounds.ruq}</p>
                </div>
              </div>
              {/* LUQ */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center relative group">
                <div className={`w-full h-full rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${data.lung_sounds.luq === 'Clear' ? 'bg-emerald-50/50 hover:bg-emerald-100' : 'bg-rose-50/50 hover:bg-rose-100'}`}
                     onClick={() => {
                       const next = sounds[(sounds.indexOf(data.lung_sounds.luq) + 1) % sounds.length] as RespiratoryState['lung_sounds']['luq'];
                       updateSounds('luq', next);
                     }}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LUQ</p>
                  <p className={`text-[10px] font-black uppercase text-center ${data.lung_sounds.luq === 'Clear' ? 'text-emerald-600' : 'text-rose-600'}`}>{data.lung_sounds.luq}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex">
              {/* RLQ */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center relative group">
                <div className={`w-full h-full rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${data.lung_sounds.rlq === 'Clear' ? 'bg-emerald-50/50 hover:bg-emerald-100' : 'bg-rose-50/50 hover:bg-rose-100'}`}
                     onClick={() => {
                       const next = sounds[(sounds.indexOf(data.lung_sounds.rlq) + 1) % sounds.length] as RespiratoryState['lung_sounds']['rlq'];
                       updateSounds('rlq', next);
                     }}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">RLQ</p>
                  <p className={`text-[10px] font-black uppercase text-center ${data.lung_sounds.rlq === 'Clear' ? 'text-emerald-600' : 'text-rose-600'}`}>{data.lung_sounds.rlq}</p>
                </div>
              </div>
              {/* LLQ */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center relative group">
                <div className={`w-full h-full rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${data.lung_sounds.llq === 'Clear' ? 'bg-emerald-50/50 hover:bg-emerald-100' : 'bg-rose-50/50 hover:bg-rose-100'}`}
                     onClick={() => {
                       const next = sounds[(sounds.indexOf(data.lung_sounds.llq) + 1) % sounds.length] as RespiratoryState['lung_sounds']['llq'];
                       updateSounds('llq', next);
                     }}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LLQ</p>
                  <p className={`text-[10px] font-black uppercase text-center ${data.lung_sounds.llq === 'Clear' ? 'text-emerald-600' : 'text-rose-600'}`}>{data.lung_sounds.llq}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-0 -translate-y-1/2 w-20 h-10 bg-slate-900 rounded-b-3xl flex items-center justify-center shadow-lg">
            <Wind size={20} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

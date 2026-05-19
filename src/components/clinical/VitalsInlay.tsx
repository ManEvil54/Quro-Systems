// ============================================================
// Quro — "Quick-Entry" Vitals Inlay
// Glassmorphism overlay for ultra-fast clinical capture
// ============================================================
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Activity, 
  Heart, 
  Thermometer, 
  Wind,
  CheckCircle2
} from 'lucide-react';

interface VitalsInlayProps {
  patient: {
    id: string;
    initials: string;
    mrn: string;
    hr?: number | null;
    bp?: string | null;
    temp?: number | null;
  };
  onClose: () => void;
  onSubmit: (data: Record<string, string | number | boolean | null>) => Promise<void>;
}

export default function VitalsInlay({ patient, onClose, onSubmit }: VitalsInlayProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    systolic: '',
    diastolic: '',
    pulse: '',
    temperature: '',
    o2_saturation: '',
    resp: '',
    glucose: '',
    weight: '',
    pain_level: ''
  });

  // Zero-Click UX: Auto-focus the first input
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSubmit({
        patient_id: patient.id,
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        pulse: Number(form.pulse),
        temperature: Number(form.temperature),
        o2_saturation: Number(form.o2_saturation),
        resp: Number(form.resp),
        glucose: Number(form.glucose),
        weight: Number(form.weight),
        pain_level: Number(form.pain_level),
        recorded_at: new Date().toISOString()
      });
      
      setSuccess(true);
      // Subtle success checkmark and close in <300ms
      setTimeout(() => {
        onClose();
      }, 250);
    } catch (err) {
      console.error("Failed to save vitals:", err);
      setLoading(false);
    }
  };

  const isOutlier = (field: string, value: string) => {
    const val = Number(value);
    if (!value || isNaN(val)) return false;
    
    switch (field) {
      case 'systolic': return val > 160 || val < 90;
      case 'diastolic': return val > 100 || val < 50;
      case 'pulse': return val > 110 || val < 55;
      case 'temperature': return val > 100.4 || val < 96.0;
      case 'o2_saturation': return val < 92;
      case 'resp': return val > 24 || val < 10;
      case 'glucose': return val > 200 || val < 70;
      case 'pain_level': return val > 7;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-quro-charcoal/80 border border-white/20 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-quro-teal text-white flex items-center justify-center shadow-lg shadow-quro-teal/20">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-quro-teal uppercase tracking-[0.2em] mb-1">Vital Intelligence Entry</p>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Patient {patient.initials}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 pt-0 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <InputField 
              label="Systolic" 
              icon={Heart} 
              placeholder="120" 
              unit="mmHg" 
              value={form.systolic}
              isOutlier={isOutlier('systolic', form.systolic)}
              onChange={(val) => setForm({ ...form, systolic: val })}
              inputRef={firstInputRef}
            />
            <InputField 
              label="Diastolic" 
              icon={Heart} 
              placeholder="80" 
              unit="mmHg" 
              value={form.diastolic}
              isOutlier={isOutlier('diastolic', form.diastolic)}
              onChange={(val) => setForm({ ...form, diastolic: val })}
            />
            <InputField 
              label="Heart Rate" 
              icon={Activity} 
              placeholder="72" 
              unit="bpm" 
              value={form.pulse}
              isOutlier={isOutlier('pulse', form.pulse)}
              onChange={(val) => setForm({ ...form, pulse: val })}
            />
            <InputField 
              label="Temperature" 
              icon={Thermometer} 
              placeholder="98.6" 
              unit="°F" 
              step="0.1" 
              value={form.temperature}
              isOutlier={isOutlier('temperature', form.temperature)}
              onChange={(val) => setForm({ ...form, temperature: val })}
            />
            <div className="col-span-2 grid grid-cols-2 gap-6">
              <InputField 
                label="SpO2 Saturation" 
                icon={Wind} 
                placeholder="98" 
                unit="%" 
                value={form.o2_saturation}
                isOutlier={isOutlier('o2_saturation', form.o2_saturation)}
                onChange={(val) => setForm({ ...form, o2_saturation: val })}
              />
              <InputField 
                label="Resp Rate" 
                icon={Activity} 
                placeholder="16" 
                unit="/min" 
                value={form.resp}
                isOutlier={isOutlier('resp', form.resp)}
                onChange={(val) => setForm({ ...form, resp: val })}
              />
              <InputField 
                label="Glucose" 
                icon={Activity} 
                placeholder="110" 
                unit="mg/dL" 
                value={form.glucose}
                isOutlier={isOutlier('glucose', form.glucose)}
                onChange={(val) => setForm({ ...form, glucose: val })}
              />
              <InputField 
                label="Weight" 
                icon={Activity} 
                placeholder="165" 
                unit="lbs" 
                value={form.weight}
                isOutlier={false}
                onChange={(val) => setForm({ ...form, weight: val })}
              />
              <div className="col-span-2">
                <InputField 
                  label="Pain Level" 
                  icon={Activity} 
                  placeholder="0" 
                  unit="/ 10" 
                  value={form.pain_level}
                  isOutlier={isOutlier('pain_level', form.pain_level)}
                  onChange={(val) => setForm({ ...form, pain_level: val })}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading || success}
            className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all relative overflow-hidden ${
              success 
                ? 'bg-quro-teal text-white' 
                : 'bg-white text-quro-charcoal hover:bg-quro-teal hover:text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-quro-charcoal/20 border-t-quro-charcoal animate-spin rounded-full" />
                <span>Saving Intelligence...</span>
              </div>
            ) : success ? (
              <div className="flex items-center justify-center gap-2 animate-in zoom-in duration-200">
                <CheckCircle2 size={20} />
                <span>Entry Verified</span>
              </div>
            ) : (
              "Save Vitals"
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
          <span>MRN: {patient.mrn}</span>
          <span>Validated by Quro AI</span>
        </div>
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  unit: string;
  value: string;
  isOutlier: boolean;
  onChange: (val: string) => void;
  step?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const InputField = ({ 
  label, 
  icon: Icon, 
  placeholder, 
  unit, 
  value, 
  isOutlier, 
  onChange, 
  step = "1", 
  inputRef 
}: InputFieldProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <Icon size={12} className={isOutlier ? 'text-red-500' : 'text-quro-teal'} />
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          step={step}
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-white/5 border rounded-2xl p-4 text-xl font-black text-white transition-all outline-none text-center ${
            isOutlier 
              ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-500/5' 
              : 'border-white/10 focus:border-quro-teal/50 focus:bg-white/10'
          }`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  );
};

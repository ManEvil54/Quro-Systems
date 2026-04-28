// ============================================================
// Quro — Vital Signs Entry
// Fast-input modal for recording clinical vitals
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  Heart, 
  Droplets, 
  Wind, 
  Thermometer, 
  Weight,
  Save,
  AlertCircle
} from 'lucide-react';
import type { VitalSign } from '@/lib/firebase/types';

interface Props {
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
}

export default function VitalEntryModal({ onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    recorded_at: new Date().toISOString(),
    systolic: '',
    diastolic: '',
    pulse: '',
    temperature: '',
    respiratory_rate: '',
    o2_saturation: '',
    blood_glucose: '',
    weight: '',
    pain_level: '0',
    notes: '',
    is_alert: false,
    alert_message: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic threshold alerts
    let is_alert = false;
    let alert_message = '';

    const sys = Number(form.systolic);
    const dia = Number(form.diastolic);
    const o2 = Number(form.o2_saturation);
    const glu = Number(form.blood_glucose);

    if (sys > 160 || sys < 90) { is_alert = true; alert_message += 'Abnormal BP. '; }
    if (o2 < 92 && o2 > 0) { is_alert = true; alert_message += 'Low O2. '; }
    if (glu > 250 || (glu < 70 && glu > 0)) { is_alert = true; alert_message += 'Critical Glucose. '; }

    try {
      await onSubmit({
        ...form,
        systolic: form.systolic ? Number(form.systolic) : null,
        diastolic: form.diastolic ? Number(form.diastolic) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
        o2_saturation: form.o2_saturation ? Number(form.o2_saturation) : null,
        blood_glucose: form.blood_glucose ? Number(form.blood_glucose) : null,
        weight: form.weight ? Number(form.weight) : null,
        pain_level: Number(form.pain_level),
        is_alert,
        alert_message: is_alert ? alert_message.trim() : null
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record vitals.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="glass-card w-full max-w-lg shadow-2xl border-white/20 animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-none">Record Vital Signs</h2>
              <p className="text-xs text-slate-500 mt-1">Real-time physiological capture</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2"><Heart size={12} className="text-red-500" /> BP (Sys/Dia)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="120" className="input text-center" value={form.systolic} onChange={e => setForm({...form, systolic: e.target.value})} />
                <span className="text-slate-300">/</span>
                <input type="number" placeholder="80" className="input text-center" value={form.diastolic} onChange={e => setForm({...form, diastolic: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-2"><Activity size={12} className="text-emerald-500" /> Pulse (BPM)</label>
              <input type="number" placeholder="72" className="input" value={form.pulse} onChange={e => setForm({...form, pulse: e.target.value})} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Wind size={12} className="text-blue-500" /> O2 Sat (%)</label>
              <input type="number" placeholder="98" className="input" value={form.o2_saturation} onChange={e => setForm({...form, o2_saturation: e.target.value})} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Thermometer size={12} className="text-amber-500" /> Temp (°F)</label>
              <input type="number" step="0.1" placeholder="98.6" className="input" value={form.temperature} onChange={e => setForm({...form, temperature: e.target.value})} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Droplets size={12} className="text-purple-500" /> Glucose (mg/dL)</label>
              <input type="number" placeholder="110" className="input" value={form.blood_glucose} onChange={e => setForm({...form, blood_glucose: e.target.value})} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Weight size={12} className="text-slate-500" /> Weight (lbs)</label>
              <input type="number" step="0.1" placeholder="165.0" className="input" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">Pain Level (0-10)</label>
            <input 
              type="range" min="0" max="10" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
              value={form.pain_level} onChange={e => setForm({...form, pain_level: e.target.value})}
            />
            <div className="flex justify-between mt-1 px-1">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <span key={n} className={`text-[10px] font-bold ${Number(form.pain_level) === n ? 'text-teal-600 scale-125' : 'text-slate-300'}`}>{n}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Clinical Notes</label>
            <textarea 
              className="input text-sm" placeholder="Observation notes..."
              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary shimmer-btn px-10 flex items-center gap-2">
              {loading ? "Saving..." : <><Save size={18} /><span>Save Vitals</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

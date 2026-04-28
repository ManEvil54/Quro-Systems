// ============================================================
// Quro — Medication Order Form
// Premium interface for entering clinical medication orders
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  X, 
  Pill, 
  Clock, 
  Activity, 
  ShieldAlert, 
  Save,
  AlertCircle
} from 'lucide-react';
import type { Medication, MedRoute, MedFrequency } from '@/lib/firebase/types';

interface Props {
  onClose: () => void;
  onSubmit: (data: Omit<Medication, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>) => Promise<any>;
}

const routes: MedRoute[] = ['PO', 'SL', 'IM', 'IV', 'SC', 'PR', 'TOP', 'INH', 'OPH', 'OTC', 'NGT', 'PATCH'];
const frequencies: MedFrequency[] = ['QD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'QHS', 'QAM', 'QPM', 'PRN', 'STAT', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export default function MedicationForm({ onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Medication, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>>({
    generic_name: '',
    brand_name: '',
    strength: '',
    dosage: '',
    route: 'PO',
    frequency: 'QD',
    frequency_times: ['09:00'],
    indication: '',
    prescriber_id: null,
    pharmacy_name: null,
    rx_number: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    status: 'active',
    requires_vitals: false,
    vital_type: null,
    vital_threshold_low: null,
    vital_threshold_high: null,
    is_psychotropic: false,
    psychotropic_monitoring: [],
    special_instructions: '',
    order_id: null,
    order_type: 'direct',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save medication order.');
      setLoading(false);
    }
  };

  const addTime = () => setForm(f => ({ ...f, frequency_times: [...f.frequency_times, '09:00'] }));
  const removeTime = (idx: number) => setForm(f => ({ ...f, frequency_times: f.frequency_times.filter((_, i) => i !== idx) }));
  const updateTime = (idx: number, val: string) => {
    const newTimes = [...form.frequency_times];
    newTimes[idx] = val;
    setForm(f => ({ ...f, frequency_times: newTimes }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-white/20 animate-in zoom-in-95">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Pill size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-none">New Medication Order</h2>
              <p className="text-xs text-slate-500 mt-1">Clinical administration protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Generic Name (Required)</label>
              <input 
                type="text" required className="input" placeholder="E.G. Metoprolol Tartrate"
                value={form.generic_name} onChange={e => setForm({...form, generic_name: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Brand Name (Optional)</label>
              <input 
                type="text" className="input" placeholder="E.G. Lopressor"
                value={form.brand_name || ''} onChange={e => setForm({...form, brand_name: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Indication</label>
              <input 
                type="text" className="input" placeholder="E.G. Hypertension"
                value={form.indication || ''} onChange={e => setForm({...form, indication: e.target.value})}
              />
            </div>
          </div>

          {/* Section 2: Dosage & Frequency */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} />
              Dosage & Schedule
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="label">Strength</label>
                <input 
                  type="text" required className="input" placeholder="50mg"
                  value={form.strength} onChange={e => setForm({...form, strength: e.target.value})}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="label">Dosage</label>
                <input 
                  type="text" required className="input" placeholder="1 tablet"
                  value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})}
                />
              </div>
              <div>
                <label className="label">Route</label>
                <select className="input" value={form.route} onChange={e => setForm({...form, route: e.target.value as MedRoute})}>
                  {routes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Frequency</label>
                <select className="input" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as MedFrequency})}>
                  {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Administration Times</label>
              <div className="flex flex-wrap gap-2">
                {form.frequency_times.map((time, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg pl-3 pr-1 py-1 shadow-sm">
                    <input 
                      type="time" className="border-none p-0 text-sm focus:ring-0 w-20"
                      value={time} onChange={e => updateTime(i, e.target.value)}
                    />
                    {form.frequency_times.length > 1 && (
                      <button type="button" onClick={() => removeTime(i)} className="p-1 text-slate-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" onClick={addTime}
                  className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  + Add Time
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Safety Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <input 
                type="checkbox" id="vitals-req" className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                checked={form.requires_vitals} onChange={e => setForm({...form, requires_vitals: e.target.checked})}
              />
              <label htmlFor="vitals-req" className="flex-1 cursor-pointer">
                <span className="block font-semibold text-blue-900 text-sm">Requires Vitals Before Administration</span>
                <span className="block text-xs text-blue-700 mt-0.5">Enforces BP, HR, or Glucose reading on MAR.</span>
              </label>
            </div>

            {form.requires_vitals && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="label">Vital Type</label>
                  <select className="input" value={form.vital_type || ''} onChange={e => setForm({...form, vital_type: e.target.value})}>
                    <option value="BP">Blood Pressure</option>
                    <option value="HR">Heart Rate</option>
                    <option value="Glucose">Blood Glucose</option>
                    <option value="O2">O2 Saturation</option>
                  </select>
                </div>
                <div>
                  <label className="label">Hold if below...</label>
                  <input 
                    type="number" className="input" placeholder="E.G. 60"
                    value={form.vital_threshold_low || ''} onChange={e => setForm({...form, vital_threshold_low: Number(e.target.value)})}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-100 bg-purple-50/50">
              <input 
                type="checkbox" id="psych-req" className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                checked={form.is_psychotropic} onChange={e => setForm({...form, is_psychotropic: e.target.checked})}
              />
              <label htmlFor="psych-req" className="flex-1 cursor-pointer">
                <span className="block font-semibold text-purple-900 text-sm">Psychotropic Medication</span>
                <span className="block text-xs text-purple-700 mt-0.5">Enables additional side-effect and behavior monitoring logs.</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label">Special Instructions / Nursing Notes</label>
            <textarea 
              className="input min-h-[80px]" placeholder="E.G. Do not crush, give with 8oz water..."
              value={form.special_instructions || ''} onChange={e => setForm({...form, special_instructions: e.target.value})}
            />
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white py-4 border-t border-slate-100 flex justify-end gap-3 -mx-6 px-6">
            <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary shimmer-btn px-10 flex items-center gap-2">
              {loading ? "Ordering..." : <><Save size={18} /><span>Order Medication</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

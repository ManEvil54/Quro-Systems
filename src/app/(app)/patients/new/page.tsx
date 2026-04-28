// ============================================================
// Quro — Patient Admission (New Patient)
// Structured Face Sheet entry for residents
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  User, 
  ClipboardList, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePatients } from '@/hooks/usePatients';
import type { Patient } from '@/lib/firebase/types';

export default function NewPatientPage() {
  const router = useRouter();
  const { addPatient } = usePatients();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Patient, 'id' | 'org_id' | 'created_at' | 'updated_at'>>({
    facility_id: '', // Will be set from staff context or selected
    mrn: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'undisclosed',
    ssn_last_four: '',
    admission_date: new Date().toISOString().split('T')[0],
    discharge_date: null,
    insurance_info: {},
    emergency_contacts: {},
    allergies: [],
    diagnoses: [],
    code_status: 'full',
    diet: '',
    physician_id: null,
    photo_url: null,
    room_number: '',
    is_active: true,
    is_active_monitoring: false,
    monitoring_start: null,
    monitoring_reason: null,
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Logic to ensure facility_id is set if not already
      await addPatient(form);
      router.push('/patients');
    } catch (err: any) {
      setError(err.message || 'Failed to admit patient. Please check all fields.');
      setLoading(false);
    }
  };

  const addTag = (field: 'allergies' | 'diagnoses', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    if (form[field].includes(value.trim())) return;
    setForm(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    setter('');
  };

  const removeTag = (field: 'allergies' | 'diagnoses', index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-5xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients" className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-200 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Admission</h1>
            <p className="text-sm text-slate-500">Initialize a new patient Face Sheet</p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary shimmer-btn flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          <span>Complete Admission</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Demographics */}
        <section className="glass-card overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <User size={18} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900">Demographics</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">First Name</label>
              <input 
                type="text" required className="input" 
                value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} 
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input 
                type="text" required className="input" 
                value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} 
              />
            </div>
            <div>
              <label className="label">MRN (Medical Record Number)</label>
              <input 
                type="text" required className="input uppercase font-mono" 
                placeholder="E.G. Q-00123"
                value={form.mrn} onChange={e => setForm({...form, mrn: e.target.value})} 
              />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input 
                type="date" required className="input" 
                value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} 
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select 
                className="input" 
                value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value as any})}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </div>
            <div>
              <label className="label">Last 4 SSN</label>
              <input 
                type="text" maxLength={4} className="input" placeholder="0000"
                value={form.ssn_last_four || ''} onChange={e => setForm({...form, ssn_last_four: e.target.value})} 
              />
            </div>
            <div>
              <label className="label">Facility (House)</label>
              <select 
                required className="input" 
                value={form.facility_id || ''} onChange={e => setForm({...form, facility_id: e.target.value})}
              >
                <option value="">Select a house...</option>
                <option value="house-a">Cedar House (25 Beds)</option>
                <option value="house-b">Willow House (25 Beds)</option>
                <option value="house-c">Oak House (25 Beds)</option>
              </select>
            </div>
            <div>
              <label className="label">Room / Bed Number</label>
              <input 
                type="text" required className="input" placeholder="E.G. 101-A"
                value={form.room_number || ''} onChange={e => setForm({...form, room_number: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Step 2: Clinical Data */}
        <section className="glass-card overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList size={18} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900">Clinical Profile</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Admission Date</label>
                <input 
                  type="date" required className="input" 
                  value={form.admission_date} onChange={e => setForm({...form, admission_date: e.target.value})} 
                />
              </div>
              <div>
                <label className="label">Code Status</label>
                <div className="flex gap-2">
                  {['full', 'dnr', 'dnr_dni', 'comfort'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm({...form, code_status: status as any})}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        form.code_status === status 
                          ? 'bg-teal-500 border-teal-500 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Allergies */}
              <div>
                <label className="label">Allergies (NKA if none)</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" className="input" placeholder="Add allergy..." 
                    value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('allergies', newAllergy, setNewAllergy))}
                  />
                  <button type="button" onClick={() => addTag('allergies', newAllergy, setNewAllergy)} className="btn-secondary px-3">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.allergies.map((a, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-md border border-red-100 uppercase">
                      {a}
                      <button type="button" onClick={() => removeTag('allergies', i)}><X size={14} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Diagnoses */}
              <div>
                <label className="label">Primary Diagnoses</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" className="input" placeholder="Add diagnosis..." 
                    value={newDiagnosis} onChange={e => setNewDiagnosis(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('diagnoses', newDiagnosis, setNewDiagnosis))}
                  />
                  <button type="button" onClick={() => addTag('diagnoses', newDiagnosis, setNewDiagnosis)} className="btn-secondary px-3">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.diagnoses.map((d, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100 uppercase">
                      {d}
                      <button type="button" onClick={() => removeTag('diagnoses', i)}><X size={14} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Dietary Orders</label>
              <textarea 
                className="input min-h-[80px]" placeholder="E.G. Mechanical Soft, No added salt..."
                value={form.diet || ''} onChange={e => setForm({...form, diet: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Step 3: Monitoring & Safety */}
        <section className="glass-card overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900">Safety & Monitoring</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/50">
              <input 
                type="checkbox" id="monitoring" className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                checked={form.is_active_monitoring} onChange={e => setForm({...form, is_active_monitoring: e.target.checked})}
              />
              <label htmlFor="monitoring" className="flex-1 cursor-pointer">
                <span className="block font-semibold text-amber-900 text-sm">Enable Active Fall/Clinical Monitoring</span>
                <span className="block text-xs text-amber-700 mt-0.5">Flags this patient for 15-minute or q-hour checks on the dashboard.</span>
              </label>
            </div>
            
            {form.is_active_monitoring && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="label">Reason for Monitoring</label>
                <input 
                  type="text" className="input" placeholder="E.G. Post-fall assessment (72h), Altered mental status..."
                  value={form.monitoring_reason || ''} onChange={e => setForm({...form, monitoring_reason: e.target.value})}
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-4 pb-12">
          <Link href="/patients" className="btn-secondary py-3 px-8">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary shimmer-btn py-3 px-12 font-bold shadow-xl shadow-teal-500/20">
            {loading ? "Processing..." : "Admit Patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

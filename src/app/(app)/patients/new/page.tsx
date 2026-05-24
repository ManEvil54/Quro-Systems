'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  User, 
  ClipboardList, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  X,
  Home,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Patient, Facility } from '@/lib/firebase/types';
import { useFacilityPhysicians } from '@/hooks/useFacilityPhysicians';

export default function NewPatientPage() {
  const router = useRouter();
  const { activeFacility, organization } = useAuth();
  const { admitPatient } = usePatients();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Patient, 'id' | 'org_id' | 'created_at' | 'updated_at'>>({
    facility_id: activeFacility?.id || '',
    mrn: '',
    first_name: '',
    last_name: '',
    full_name: '',
    date_of_birth: '',
    gender: 'undisclosed',
    ssn_last_four: '',
    admission_date: new Date().toISOString().split('T')[0],
    discharge_date: null,
    insurance_info: {},
    family_members: [],
    allergies: [],
    diagnoses: [],
    code_status: 'full',
    diet: '',
    physician_id: undefined,
    attending_physician: '',
    photo_url: undefined,
    room_number: '',
    is_active: true,
    is_active_monitoring: false,
    monitoring_start: null,
    monitoring_reason: null,
  });

  // Fetch credentialed physicians for the selected facility dynamically
  const { physicians } = useFacilityPhysicians(form.facility_id || undefined);

  const [newAllergy, setNewAllergy] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');

  useEffect(() => {
    if (organization?.id) {
      fetchFacilities();
    }
  }, [organization]);

  // Update facility_id if activeFacility changes
  useEffect(() => {
    if (activeFacility?.id && !form.facility_id) {
      setForm(prev => ({ ...prev, facility_id: activeFacility.id }));
    }
  }, [activeFacility]);

  async function fetchFacilities() {
    try {
      const q = query(
        collection(db, 'organizations', organization!.id, 'facilities'),
        where('is_active', '==', true)
      );
      const snap = await getDocs(q);
      setFacilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility)));
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facility_id) {
      setError('Please select a house for admission.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await admitPatient({
        ...form,
        full_name: `${form.first_name} ${form.last_name}`.trim()
      });
      router.push('/patients');
    } catch (err: any) {
      setError(err.message || 'Failed to admit patient. Please check all fields.');
      setLoading(false);
    }
  };

  const addTag = (field: 'allergies' | 'diagnoses', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const currentList = form[field] || [];
    if (currentList.includes(value.trim())) return;
    setForm(prev => ({ ...prev, [field]: [...(prev[field] || []), value.trim()] }));
    setter('');
  };

  const removeTag = (field: 'allergies' | 'diagnoses', index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in">
      {/* Header */}
      <div className="mb-12 flex items-end justify-between">
        <div className="flex items-center gap-6">
          <Link href="/patients" className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all group">
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-teal-600 mb-1">
              <Plus size={14} className="font-black" />
              <span className="text-[10px] font-black uppercase tracking-widest">Authorized Admission</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight italic">New Resident</h1>
            <p className="text-sm text-slate-500 font-medium italic">Initialize a new clinical Face Sheet for this facility.</p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/40"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>COMPLETE ADMISSION</span>
        </button>
      </div>

      {error && (
        <div className="mb-8 p-6 rounded-[24px] bg-rose-50 border border-rose-100 flex items-center gap-4 text-rose-600 animate-in slide-in-from-top-2">
          <AlertCircle size={24} />
          <p className="text-sm font-black uppercase tracking-tight">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Demographics */}
        <section className="glass-card overflow-hidden">
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <User size={18} className="text-teal-600" />
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Patient Demographics</h2>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
              <input 
                type="text" required 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
              <input 
                type="text" required 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MRN Identification</label>
              <input 
                type="text" required 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all uppercase font-mono"
                placeholder="E.G. Q-00123"
                value={form.mrn} onChange={e => setForm({...form, mrn: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
              <input 
                type="date" required 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] pl-4 pr-10 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all appearance-none cursor-pointer"
                  value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value as any})}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="undisclosed">Undisclosed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SSN (Last 4)</label>
              <input 
                type="text" maxLength={4} 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                placeholder="0000"
                value={form.ssn_last_four || ''} onChange={e => setForm({...form, ssn_last_four: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">House Assignment</label>
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] pl-12 pr-10 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all appearance-none cursor-pointer"
                  value={form.facility_id || ''} onChange={e => setForm({...form, facility_id: e.target.value})}
                >
                  <option value="">Select a house...</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.bed_count} Beds)</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room / Bed Assignment</label>
              <input 
                type="text" required 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                placeholder="E.G. 101-A"
                value={form.room_number || ''} onChange={e => setForm({...form, room_number: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attending Physician</label>
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] pl-4 pr-10 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all appearance-none cursor-pointer"
                  value={form.physician_id || ''} 
                  onChange={e => {
                    const selectedPhysObj = physicians.find(p => p.id === e.target.value);
                    setForm({
                      ...form, 
                      physician_id: e.target.value || undefined,
                      attending_physician: selectedPhysObj ? selectedPhysObj.name : ''
                    });
                  }}
                >
                  <option value="">Select attending physician...</option>
                  {physicians.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.specialty || 'General Medicine'})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Clinical Data */}
        <section className="glass-card overflow-hidden">
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <ClipboardList size={18} className="text-teal-600" />
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Clinical Profile</h2>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Date</label>
                <input 
                  type="date" required 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                  value={form.admission_date} onChange={e => setForm({...form, admission_date: e.target.value})} 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code Status Order</label>
                <div className="flex gap-2">
                  {['full', 'dnr', 'dnr_dni', 'comfort'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm({...form, code_status: status as any})}
                      className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                        form.code_status === status 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                          : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Allergies */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allergies (NKA if none)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    placeholder="Add allergy..." 
                    value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('allergies', newAllergy, setNewAllergy))}
                  />
                  <button type="button" onClick={() => addTag('allergies', newAllergy, setNewAllergy)} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.allergies || []).map((a, i) => (
                    <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg border border-rose-100 uppercase tracking-wider">
                      {a}
                      <button type="button" onClick={() => removeTag('allergies', i)} className="hover:text-rose-900"><X size={14} /></button>
                    </span>
                  ))}
                  {(form.allergies || []).length === 0 && <p className="text-[10px] text-slate-400 italic ml-1">No allergies documented yet.</p>}
                </div>
              </div>

              {/* Diagnoses */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Diagnoses</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    placeholder="Add diagnosis..." 
                    value={newDiagnosis} onChange={e => setNewDiagnosis(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('diagnoses', newDiagnosis, setNewDiagnosis))}
                  />
                  <button type="button" onClick={() => addTag('diagnoses', newDiagnosis, setNewDiagnosis)} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.diagnoses || []).map((d, i) => (
                    <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-lg border border-teal-100 uppercase tracking-wider">
                      {d}
                      <button type="button" onClick={() => removeTag('diagnoses', i)} className="hover:text-teal-900"><X size={14} /></button>
                    </span>
                  ))}
                  {(form.diagnoses || []).length === 0 && <p className="text-[10px] text-slate-400 italic ml-1">No diagnoses documented yet.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dietary Orders & Precautions</label>
              <textarea 
                className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all min-h-[120px]" 
                placeholder="E.G. Mechanical Soft, No added salt, Thin liquids only..."
                value={form.diet || ''} onChange={e => setForm({...form, diet: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Step 3: Monitoring & Safety */}
        <section className="glass-card overflow-hidden">
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <ShieldCheck size={18} className="text-teal-600" />
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Safety & Clinical Monitoring</h2>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-4 p-6 rounded-[32px] border-2 border-amber-100 bg-amber-50/30">
              <input 
                type="checkbox" id="monitoring" 
                className="w-6 h-6 rounded-lg border-amber-200 text-amber-600 focus:ring-amber-500 cursor-pointer"
                checked={form.is_active_monitoring} onChange={e => setForm({...form, is_active_monitoring: e.target.checked})}
              />
              <label htmlFor="monitoring" className="flex-1 cursor-pointer">
                <span className="block font-black text-amber-900 text-sm uppercase tracking-tight">Activate Enhanced Surveillance</span>
                <span className="block text-xs text-amber-700/70 mt-1 font-medium italic">Flags this patient for frequent clinical checks (e.g. Q15M, Q1H) on the nursing dashboard.</span>
              </label>
            </div>
            
            {form.is_active_monitoring && (
              <div className="mt-6 animate-in slide-in-from-top-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monitoring Protocol Reason</label>
                <input 
                  type="text" 
                  className="w-full bg-white border-2 border-amber-200 rounded-[20px] p-4 text-sm font-bold text-slate-900 outline-none transition-all"
                  placeholder="E.G. Post-fall assessment (72h), Altered mental status..."
                  value={form.monitoring_reason || ''} onChange={e => setForm({...form, monitoring_reason: e.target.value})}
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-6 pb-20">
          <Link 
            href="/patients" 
            className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
          >
            Cancel Admission
          </Link>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-16 py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-teal-700 transition-all shadow-2xl shadow-teal-900/40"
          >
            {loading ? "PROCESSING..." : "ADMIT RESIDENT"}
          </button>
        </div>
      </form>
    </div>
  );
}

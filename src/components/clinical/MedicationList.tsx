// ============================================================
// Quro — Medication List Component
// Displays active and discontinued meds for a resident
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Pill, 
  Clock, 
  Plus, 
  MoreVertical,
  Activity
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import MedicationForm from './MedicationForm';
import type { Medication } from '@/lib/firebase/types';

interface Props {
  patientId: string;
}

export default function MedicationList({ patientId }: Props) {
  const { medications, loading, addMedication, updateMedication } = useMedications(patientId);
  const [filter, setFilter] = useState<'active' | 'discontinued'>('active');
  const [showForm, setShowForm] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const filteredMeds = medications.filter(m => m.status === filter);

  if (loading) return <div className="py-10 text-center text-slate-400">Loading medications...</div>;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
              filter === 'active' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active ({medications.filter(m => m.status === 'active').length})
          </button>
          <button 
            onClick={() => setFilter('discontinued')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
              filter === 'discontinued' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Discontinued
          </button>
        </div>
        
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm shadow-lg shadow-teal-500/10"
        >
          <Plus size={16} />
          <span>Add Medication</span>
        </button>
      </div>

      {showForm && (
        <MedicationForm 
          onClose={() => setShowForm(false)}
          onSubmit={async (data) => { await addMedication(data); }}
        />
      )}

      {editingMed && (
        <MedicationForm 
          initialData={editingMed}
          onClose={() => setEditingMed(null)}
          onSubmit={async (data) => { await updateMedication(editingMed.id, data); }}
        />
      )}

      {/* Medication Cards */}
      <div className="space-y-3">
        {filteredMeds.map((med) => (
          <div key={med.id} className="glass-card p-4 group hover:border-teal-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  med.is_psychotropic ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'
                }`}>
                  <Pill size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{med.generic_name}</h4>
                    {med.brand_name && <span className="text-xs text-slate-400">({med.brand_name})</span>}
                  </div>
                  <p className="text-sm text-slate-600 font-semibold mt-0.5">
                    {med.strength && <span className="text-slate-800">{med.strength}</span>}
                    {med.strength && <span className="text-slate-300 mx-1.5">·</span>}
                    {med.dose ? (
                      <>
                        <span className="text-slate-500">Dose:</span> <span className="text-teal-600 font-bold">{med.dose}</span>
                        <span className="text-slate-400 font-medium ml-1">({med.dosage})</span>
                      </>
                    ) : (
                      <span className="text-slate-600">{med.dosage}</span>
                    )}
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-slate-500">{med.route}</span>
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-teal-600 font-bold bg-teal-50/50 px-2 py-0.5 rounded text-xs">{med.frequency}</span>
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock size={12} />
                      <span>{med.frequency_times?.join(' / ')}</span>
                    </div>
                    {med.requires_vitals && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                        <Activity size={12} />
                        <span>Hold if {med.vital_type} &lt; {med.vital_threshold_low}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setActiveDropdownId(activeDropdownId === med.id ? null : med.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 group-hover:text-slate-600 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                
                {activeDropdownId === med.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setActiveDropdownId(null)}
                    />
                    
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-slate-100 shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={() => {
                          setEditingMed(med);
                          setActiveDropdownId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors uppercase tracking-wider"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Details / Dose
                      </button>
                      
                      {med.status === 'active' ? (
                        <button
                          onClick={async () => {
                            setActiveDropdownId(null);
                            await updateMedication(med.id, { status: 'discontinued' });
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors uppercase tracking-wider border-t border-slate-50"
                        >
                          <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Discontinue Med
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setActiveDropdownId(null);
                            await updateMedication(med.id, { status: 'active' });
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-teal-600 hover:bg-teal-50 flex items-center gap-2 transition-colors uppercase tracking-wider border-t border-slate-50"
                        >
                          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Reactivate Med
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {med.indication && (
              <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500 italic">
                Indication: {med.indication}
              </div>
            )}
          </div>
        ))}
        
        {filteredMeds.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-400 text-sm">No {filter} medications found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

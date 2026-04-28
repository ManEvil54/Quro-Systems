// ============================================================
// Quro — Medication List Component
// Displays active and discontinued meds for a resident
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Pill, 
  Clock, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  MoreVertical,
  Activity
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import type { Medication } from '@/lib/firebase/types';
import MedicationForm from './MedicationForm';

interface Props {
  patientId: string;
}

export default function MedicationList({ patientId }: Props) {
  const { medications, loading, error, addMedication } = useMedications(patientId);
  const [filter, setFilter] = useState<'active' | 'discontinued'>('active');
  const [showForm, setShowForm] = useState(false);

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
          onSubmit={addMedication}
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
                  <p className="text-sm text-slate-600 font-medium">
                    {med.dosage} · {med.route} · {med.frequency}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock size={12} />
                      <span>{med.frequency_times.join(' / ')}</span>
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
              
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
                  <MoreVertical size={16} />
                </button>
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

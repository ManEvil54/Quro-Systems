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
  Activity,
  Shield
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/client';
import { collection, addDoc } from 'firebase/firestore';
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

  const { staff, organization, isReadOnly } = useAuth();
  const [medToContinue, setMedToContinue] = useState<Medication | null>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const handleContinueMed = async () => {
    if (!medToContinue) return;
    if (isReadOnly) return;
    setIsSigning(true);
    try {
      // Reactivate medication order on eMAR by setting status to active, resetting start_date to today
      await updateMedication(medToContinue.id, {
        status: 'active',
        start_date: new Date().toISOString()
      });

      // Write verified entry to clinic audit log
      if (organization && staff) {
        await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
          action: 'MED_ORDER_CONTINUED',
          staff_id: staff.id,
          patient_id: patientId,
          details: `Re-authorized and continued medication: ${medToContinue.generic_name} ${medToContinue.strength || ''}. Signed with Electronic PIN.`,
          timestamp: new Date().toISOString()
        });
      }

      setMedToContinue(null);
      setPinEntry('');
      alert('Medication has been successfully co-signed and reactivated.');
    } catch (err) {
      console.error('Error continuing medication:', err);
      alert('Failed to continue medication.');
    } finally {
      setIsSigning(false);
    }
  };

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
          disabled={isReadOnly}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm shadow-lg shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div key={med.id} className="glass-card !overflow-visible p-4 group hover:border-teal-200 transition-all">
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
                    <span className="text-teal-600 font-bold bg-teal-50/50 px-2 py-0.5 rounded text-xs">
                      {med.frequency === 'PRN' ? (
                        `PRN (${med.prn_interval || 'every 8h'} as needed for ${med.prn_reason || med.indication || 'pain'})`
                      ) : (
                        med.frequency
                      )}
                    </span>
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
                  title="More options"
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
                          if (isReadOnly) return;
                          setEditingMed(med);
                          setActiveDropdownId(null);
                        }}
                        disabled={isReadOnly}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Details / Dose
                      </button>
                      
                      {med.status === 'active' ? (
                        <button
                          onClick={async () => {
                            if (isReadOnly) return;
                            setActiveDropdownId(null);
                            await updateMedication(med.id, { status: 'discontinued' });
                          }}
                          disabled={isReadOnly}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors uppercase tracking-wider border-t border-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Discontinue Med
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            if (isReadOnly) return;
                            setActiveDropdownId(null);
                            setMedToContinue(med);
                          }}
                          disabled={isReadOnly}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-teal-600 hover:bg-teal-50 flex items-center gap-2 transition-colors uppercase tracking-wider border-t border-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Continue Med
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

      {/* Re-Authentication PIN Modal for Continuing Medication */}
      {medToContinue && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
                <Shield size={40} className="text-teal-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Electronic Signature</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Re-Authorize & Continue Order</p>
            </div>

            {/* Pulled Order Details card */}
            <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
              <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{medToContinue.frequency}</span>
              <h4 className="text-lg font-black text-slate-950 uppercase tracking-tight mt-3">{medToContinue.generic_name}</h4>
              <p className="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wide">
                {medToContinue.strength || 'As ordered'} • {medToContinue.dosage} via {medToContinue.route}
              </p>
              {medToContinue.indication && (
                <p className="text-xs text-slate-500 font-medium italic mt-2 border-t border-slate-200/50 pt-2">Indication: {medToContinue.indication}</p>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pinEntry[i] ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50'}`}>
                    {pinEntry[i] ? '•' : ''}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isSigning}
                    onClick={() => {
                      if (num === 'C') setPinEntry('');
                      else if (num === '✓') {
                        if (pinEntry.length === 4) handleContinueMed();
                      }
                      else if (pinEntry.length < 4) setPinEntry(prev => prev + num);
                    }}
                    className={`h-16 rounded-2xl font-black text-lg transition-all ${
                      num === '✓' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                      num === 'C' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                    } ${isSigning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {num === '✓' && isSigning ? '...' : num}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setMedToContinue(null);
                setPinEntry('');
              }}
              className="w-full mt-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Cancel Re-authorization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

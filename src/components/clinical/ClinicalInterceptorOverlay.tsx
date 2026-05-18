'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';

interface SafetyResult {
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  clinicalRecommendation: string;
}

interface Props {
  patientId: string;
  rxcuis: string[];
  onClose: () => void;
  onOverride: () => void;
}

export default function ClinicalInterceptorOverlay({ patientId, rxcuis, onClose, onOverride }: Props) {
  const { patient, loading: patientLoading } = usePatient(patientId);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientLoading) return;
    if (!patient) {
      setTimeout(() => {
        setError("Patient not found.");
        setLoading(false);
      }, 0);
      return;
    }
    
    // We only check if there's at least one rxcui or if patient has allergies
    if (rxcuis.length === 0) {
      setResult({ severity: 'low', rationale: 'No new medications to check.', clinicalRecommendation: 'Safe to proceed.' });
      setLoading(false);
      return;
    }

    const checkSafety = async () => {
      try {
        const res = await fetch('/api/checkClinicalSafety', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medication_list: rxcuis,
            allergies: patient.allergies || [],
            diagnoses: patient.diagnoses || []
          })
        });
        
        if (!res.ok) throw new Error('Failed to analyze clinical safety.');
        
        const data = await res.json();
        setResult(data);
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : 'Verification system offline.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    checkSafety();
  }, [patient, patientLoading, rxcuis]);

  if (loading || patientLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center max-w-sm w-full mx-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-full border-2 border-slate-100 border-t-quro-teal animate-spin"></div>
            <ShieldAlert size={24} className="text-quro-teal animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Analyzing Intersections</h3>
          <p className="text-xs font-bold text-slate-400 text-center">
            Verifying drug interactions and allergy contraindications via NIH RxNav & Quro Intelligence...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center max-w-sm w-full mx-4 shadow-2xl">
          <AlertTriangle size={32} className="text-rose-500 mb-4" />
          <h3 className="text-lg font-black text-slate-900 mb-2">Analysis Failed</h3>
          <p className="text-xs font-bold text-slate-500 text-center mb-6">{error}</p>
          <button onClick={onClose} className="btn-primary w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const isHigh = result.severity === 'high';
  const isMedium = result.severity === 'medium';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className={`bg-white rounded-3xl overflow-hidden max-w-md w-full mx-4 shadow-2xl relative transition-all ${isMedium ? 'ring-4 ring-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.2)]' : ''} ${isHigh ? 'ring-4 ring-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.2)]' : ''}`}>
        
        {/* Header Ribbon */}
        <div className={`p-6 text-center relative overflow-hidden ${isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-quro-teal'}`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_10%,transparent_80%)]"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-4 text-white shadow-lg border border-white/20">
            {isHigh ? <Lock size={28} /> : isMedium ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
          </div>
          
          <h2 className="text-xl font-black text-white tracking-tight">
            {isHigh ? 'Clinical Contraindication' : isMedium ? 'Clinical Warning' : 'Cleared for Ordering'}
          </h2>
        </div>

        <div className="p-8">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rationale</p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {result.rationale}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recommendation</p>
              <p className={`text-sm font-black p-4 rounded-xl border ${isHigh ? 'bg-rose-50 text-rose-600 border-rose-100' : isMedium ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-teal-50 text-quro-teal border-teal-100'}`}>
                {result.clinicalRecommendation}
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            {isHigh ? (
              <button onClick={onClose} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-rose-500/20">
                Cancel Order
              </button>
            ) : (
              <>
                <button onClick={onClose} className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onClose();
                    onOverride();
                  }} 
                  className={`flex-1 py-4 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${isMedium ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-quro-teal hover:bg-teal-600 shadow-quro-teal/20'}`}
                >
                  {isMedium ? 'Override & Proceed' : 'Proceed'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

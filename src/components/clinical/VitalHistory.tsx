// ============================================================
// Quro — Vital Signs History
// Visual log of patient physiological data
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Wind, 
  Droplets,
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';
import VitalEntryModal from './VitalEntryModal';

interface Props {
  patientId: string;
}

export default function VitalHistory({ patientId }: Props) {
  const { vitals, loading, error, recordVitals } = useVitals(patientId);
  const [showModal, setShowModal] = useState(false);

  if (loading) return <div className="py-10 text-center text-slate-400 text-sm">Loading vitals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Vital Signs History</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          <Plus size={16} />
          <span>Record Vitals</span>
        </button>
      </div>

      {showModal && (
        <VitalEntryModal 
          onClose={() => setShowModal(false)}
          onSubmit={recordVitals}
        />
      )}

      <div className="space-y-4">
        {vitals.map((v) => (
          <div key={v.id} className={`glass-card p-4 transition-all ${v.is_alert ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Clock size={14} />
                <span>{new Date(v.recorded_at).toLocaleString()}</span>
              </div>
              {v.is_alert && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">
                  <AlertTriangle size={12} />
                  <span>Alert: {v.alert_message}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {v.systolic && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Blood Pressure</p>
                  <p className="text-sm font-bold text-slate-900">{v.systolic}/{v.diastolic}</p>
                </div>
              )}
              {v.pulse && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Heart Rate</p>
                  <p className="text-sm font-bold text-slate-900">{v.pulse} <span className="text-[10px] font-medium text-slate-500">BPM</span></p>
                </div>
              )}
              {v.o2_saturation && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">O2 Sat</p>
                  <p className="text-sm font-bold text-slate-900">{v.o2_saturation}%</p>
                </div>
              )}
              {v.temperature && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Temp</p>
                  <p className="text-sm font-bold text-slate-900">{v.temperature}°F</p>
                </div>
              )}
              {v.blood_glucose && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Glucose</p>
                  <p className="text-sm font-bold text-slate-900">{v.blood_glucose} <span className="text-[10px] font-medium text-slate-500">mg/dL</span></p>
                </div>
              )}
            </div>

            {v.notes && (
              <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-3 italic">
                &ldquo;{v.notes}&rdquo;
              </div>
            )}
          </div>
        ))}

        {vitals.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-400 text-sm italic">No vitals recorded for this resident.</p>
          </div>
        )}
      </div>
    </div>
  );
}

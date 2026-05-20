// ============================================================
// Quro — Shift Configurator Component
// Premium DON Interface to Configure Shift Schedules per Facility
// ============================================================
'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, RotateCw, Check, Loader2, AlertCircle } from 'lucide-react';

interface ShiftConfiguratorProps {
  facilityId: string;
  initialType: '8hr' | '12hr';
}

export default function ShiftConfigurator({ facilityId, initialType }: ShiftConfiguratorProps) {
  const { organization } = useAuth();
  const [shiftType, setShiftType] = useState<'8hr' | '12hr'>(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleShiftChange = async (type: '8hr' | '12hr') => {
    if (!organization?.id || !facilityId) {
      setError('Active organization or facility context is missing.');
      return;
    }

    setSaving(true);
    setError(null);
    setShowSuccess(false);

    const intervals = type === '12hr' ? ['07:00', '19:00'] : ['07:00', '15:00', '23:00'];

    try {
      const facilityRef = doc(db, 'organizations', organization.id, 'facilities', facilityId);
      await updateDoc(facilityRef, {
        'shiftConfiguration.type': type,
        'shiftConfiguration.intervals': intervals,
        'updated_at': new Date().toISOString()
      });
      setShiftType(type);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update facility schedule configuration:', err);
      setError(err?.message || 'Failed to update schedule structure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 max-w-md w-full border-white/20 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-teal-500/5">
      {/* Background visual highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-quro-teal flex items-center justify-center">
          <Clock size={20} className="animate-spin-slow" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-900 leading-none">
            Shift Rotation Configuration
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Facility Scheduling System
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium italic">
        Configure the shift schedule structure for this specific building. This controls the active intervals for automated AI handover summaries across the floor.
      </p>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2.5 text-rose-600 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <p className="text-[10px] font-bold uppercase tracking-wide leading-none">{error}</p>
        </div>
      )}

      {showSuccess && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-emerald-600 animate-in fade-in slide-in-from-top-2">
          <Check size={16} />
          <p className="text-[10px] font-bold uppercase tracking-wide leading-none">Active Rotation Synchronized Successfully</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
        <button
          type="button"
          onClick={() => handleShiftChange('8hr')}
          disabled={saving}
          className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
            shiftType === '8hr'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <RotateCw size={12} className={saving && shiftType === '8hr' ? 'animate-spin' : ''} />
          8-Hour (3 Shifts)
        </button>
        <button
          type="button"
          onClick={() => handleShiftChange('12hr')}
          disabled={saving}
          className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
            shiftType === '12hr'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <RotateCw size={12} className={saving && shiftType === '12hr' ? 'animate-spin' : ''} />
          12-Hour (2 Shifts)
        </button>
      </div>

      {/* Rotation Summary Information Card */}
      <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Model</span>
          <span className="px-2 py-0.5 bg-teal-50 text-quro-teal border border-teal-100 rounded text-[9px] font-black uppercase">
            {shiftType === '12hr' ? '12HR Rotation' : '8HR Rotation'}
          </span>
        </div>

        <div className="space-y-2 border-t border-slate-100/50 pt-2.5">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">AI Trigger Intervals:</p>
          <div className="flex flex-wrap gap-1.5">
            {shiftType === '12hr' ? (
              <>
                <span className="px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-700">07:00 AM (Day)</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-700">07:00 PM (Night)</span>
              </>
            ) : (
              <>
                <span className="px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-700">07:00 AM (Day)</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-700">03:00 PM (Eve)</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-700">11:00 PM (Night)</span>
              </>
            )}
          </div>
        </div>

        <p className="text-[9px] text-slate-400 italic mt-2 font-medium">
          Note: AI engines automatically capture activities within the preceding lookback period.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Quro — Digital MAR Grid
// High-fidelity 31-day medication administration record
// ============================================================
'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  MoreHorizontal,
  Pill
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import type { Medication, MarEntry, MarAction } from '@/lib/firebase/types';

interface Props {
  patientId: string;
}

export default function MARGrid({ patientId }: Props) {
  const { medications, loading: medsLoading } = useMedications(patientId);
  const { entries, loading: marLoading, logAdministration } = useMAR(patientId);
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  // Map entries to a quick lookup object: [medId][date][time] -> action
  const entryMap = useMemo(() => {
    const map: Record<string, Record<string, Record<string, MarAction>>> = {};
    entries.forEach(entry => {
      if (!map[entry.medication_id]) map[entry.medication_id] = {};
      if (!map[entry.medication_id][entry.scheduled_date]) map[entry.medication_id][entry.scheduled_date] = {};
      map[entry.medication_id][entry.scheduled_date][entry.scheduled_time] = entry.action || 'see_notes';
    });
    return map;
  }, [entries]);

  if (medsLoading || marLoading) return <div className="py-20 text-center text-slate-400">Loading MAR...</div>;

  return (
    <div className="glass-card overflow-hidden">
      {/* Grid Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-slate-900">{monthName} {currentYear}</h2>
          <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
            <button 
              onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)}
              className="p-1 hover:bg-slate-50 rounded-md text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)}
              className="p-1 hover:bg-slate-50 rounded-md text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Given</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Refused</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Held</div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="sticky left-0 z-20 bg-slate-50 p-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 w-64 min-w-[250px]">
                Medication Details
              </th>
              {days.map(day => (
                <th key={day} className="p-2 text-center text-[10px] font-bold text-slate-400 border-r border-slate-100 min-w-[40px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medications.map((med) => (
              <tr key={med.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                <td className="sticky left-0 z-20 bg-white p-4 border-r border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Pill size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{med.generic_name}</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">
                        {med.dosage} · {med.route} · {med.frequency}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {med.frequency_times.map(t => (
                          <span key={t} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                
                {days.map(day => {
                  const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  return (
                    <td key={day} className="p-1 border-r border-slate-50 align-top">
                      <div className="flex flex-col gap-1 items-center">
                        {med.frequency_times.map(time => {
                          const action = entryMap[med.id]?.[dateStr]?.[time];
                          return (
                            <button
                              key={time}
                              title={`${time} - Click to log`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                                action === 'given' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' :
                                action === 'refused' ? 'bg-red-500 text-white' :
                                action === 'held' ? 'bg-amber-500 text-white' :
                                'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {action === 'given' ? <Check size={10} /> : 
                               action === 'refused' ? 'R' :
                               action === 'held' ? 'H' :
                               ''}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {medications.length === 0 && (
        <div className="py-20 text-center text-slate-400 italic text-sm">
          No medications listed for this month.
        </div>
      )}
    </div>
  );
}

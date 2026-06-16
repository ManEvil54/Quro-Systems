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
  Pill,
  Printer
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import type { Medication, MARAction } from '@/lib/firebase/types';

interface Props {
  patientId: string;
}

export default function MARGrid({ patientId }: Props) {
  const { medications, loading: medsLoading } = useMedications(patientId);
  const { entries, loading: marLoading, logAdministration } = useMAR(patientId);
  const { organization, isReadOnly } = useAuth();
  const { orders } = useOrders(patientId);
  
  const isElectronicMode = organization?.clinical_settings?.emar_mode !== false;
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const currentYear = new Date().getFullYear();
  const [logging, setLogging] = useState<{ medId: string, date: string, time: string } | null>(null);

  // Isolated states for psychotropic compliance logs prompt modal
  const [activeCell, setActiveCell] = useState<{
    rowId: string;
    label: string;
    date: string;
    shift: string;
    maxScore: number;
  } | null>(null);
  const [activeScore, setActiveScore] = useState<string>('');

  const activeMedications = useMemo(() => {
    return medications.filter(m => {
      if (m.status !== 'active') return false;
      if (orders) {
        const matchingOrder = orders.find(o => o.id === m.order_id);
        if (matchingOrder && matchingOrder.status === 'cancelled') return false;
      }
      return true;
    });
  }, [medications, orders]);

  const hasPsychotropic = useMemo(() => {
    return activeMedications.some(m => m.is_psychotropic);
  }, [activeMedications]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  const handleLog = async (med: Medication, date: string, time: string) => {
    try {
      await logAdministration({
        medication_id: med.id,
        scheduled_date: date,
        scheduled_time: time,
        action: 'given'
      });
      
      setLogging(null);
    } catch (err) {
      const error = err as Error;
      if (error.message === 'CLINICAL_ERROR_ALREADY_GIVEN') {
        alert('Medication already documented for this slot.');
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };

  // Map entries to a quick lookup object: [medId][date][time] -> action
  const entryMap = useMemo(() => {
    const map: Record<string, Record<string, Record<string, MARAction>>> = {};
    entries.forEach(entry => {
      if (!map[entry.medication_id]) map[entry.medication_id] = {};
      if (!map[entry.medication_id][entry.scheduled_date]) map[entry.medication_id][entry.scheduled_date] = {};
      map[entry.medication_id][entry.scheduled_date][entry.scheduled_time] = entry.action || 'absent';
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
              title="Previous Month"
              onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)}
              className="p-1 hover:bg-slate-50 rounded-md text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              title="Next Month"
              onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)}
              className="p-1 hover:bg-slate-50 rounded-md text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {!isElectronicMode && (
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Hybrid Mode (Print & Paper Charting Only)
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Given</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Refused</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Held</div>
          </div>
          <button 
            type="button"
            onClick={() => window.open(`/patients/${patientId}/mar/print`, '_blank')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-950/20 cursor-pointer"
          >
            <Printer size={12} /> Print Surveyor MAR/TAR
          </button>
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
            {activeMedications.map((med) => (
              <tr key={med.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                <td className="sticky left-0 z-20 bg-white p-4 border-r border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Pill size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {med.generic_name} {med.strength && <span className="text-[10px] text-slate-400 font-semibold ml-1">({med.strength})</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight font-semibold">
                        {med.dose ? (
                          <>
                            Dose: <span className="text-teal-600 font-bold">{med.dose}</span>
                            <span className="text-slate-400 font-medium ml-1">({med.dosage})</span>
                          </>
                        ) : (
                          med.dosage
                        )}
                        <span className="text-slate-300 mx-1">·</span>
                        {med.route}
                        <span className="text-slate-300 mx-1">·</span>
                        <span className="text-teal-600 font-bold">
                          {med.frequency === 'PRN' ? (
                            `PRN (${med.prn_interval || 'every 8h'} for ${med.prn_reason || med.indication || 'pain'})`
                          ) : (
                            med.frequency
                          )}
                        </span>
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(med.frequency_times || []).map(t => (
                          <span key={t} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1 rounded">{t}</span>
                        ))}
                        {med.is_psychotropic && (
                          <span className="text-[8px] font-black bg-red-500 text-white px-1.5 rounded-full uppercase tracking-widest animate-pulse">High Alert</span>
                        )}
                      </div>
                      {med.is_psychotropic && med.psychotropic_monitoring && med.psychotropic_monitoring.length > 0 && (
                        <div className="mt-2 p-1.5 bg-rose-50 border border-rose-150 rounded-lg text-[9px] text-rose-950 font-semibold uppercase tracking-tight max-w-[220px] whitespace-normal">
                          <span className="font-black text-rose-700 block mb-0.5 text-[8px]">Monitoring Parameters:</span>
                          {med.psychotropic_monitoring.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                {days.map(day => {
                  const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const isPRN = med.frequency === 'PRN';
                  return (
                    <td key={day} className="p-1 border-r border-slate-50 align-top">
                      <div className="flex flex-col gap-1 items-center">
                        {isPRN ? (
                          <>
                            {entries
                              .filter(e => e.medication_id === med.id && e.scheduled_date === dateStr)
                              .map(entry => (
                                <div key={entry.id} className="relative group flex items-center justify-center">
                                  <button
                                    disabled
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                                    title={`PRN Given at ${entry.scheduled_time}`}
                                  >
                                    <Check size={10} />
                                  </button>
                                  <span className="absolute -top-7 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-md">
                                    {entry.scheduled_time} - Given
                                  </span>
                                </div>
                              ))}
                            {isElectronicMode && (
                              <button
                                title="Log PRN dose"
                                disabled={isReadOnly}
                                onClick={async () => {
                                  if (isReadOnly) return;
                                  const defaultTime = new Date().toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                  const time = prompt("Enter administration time (HH:MM):", defaultTime);
                                  if (!time) return;
                                  try {
                                    await logAdministration({
                                      medication_id: med.id,
                                      scheduled_date: dateStr,
                                      scheduled_time: time,
                                      action: 'given'
                                    });
                                  } catch (err) {
                                    alert(`Error: ${(err as Error).message}`);
                                  }
                                }}
                                className="w-5 h-5 rounded-full flex items-center justify-center border border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 hover:border-teal-400 text-[10px] font-black cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            )}
                          </>
                        ) : (
                          (med.frequency_times || []).map(time => {
                            const action = entryMap[med.id]?.[dateStr]?.[time];
                            return (
                              <button
                                key={time}
                                title={isElectronicMode ? `${time} - Click to log` : `${time} - Paper MAR Only`}
                                onClick={() => isElectronicMode && !action && !isReadOnly && handleLog(med, dateStr, time)}
                                disabled={!isElectronicMode || !!action || isReadOnly}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                                  action === 'given' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' :
                                  action === 'refused' ? 'bg-red-500 text-white' :
                                  action === 'held' ? 'bg-amber-500 text-white' :
                                  logging?.medId === med.id && logging?.date === dateStr && logging?.time === time
                                    ? 'bg-amber-500 text-white animate-pulse'
                                    : isElectronicMode && !isReadOnly
                                      ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                }`}
                              >
                                {action === 'given' ? <Check size={10} /> : 
                                 action === 'refused' ? 'R' :
                                 action === 'held' ? 'H' :
                                 ''}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Behavioral Frequency Log */}
            {hasPsychotropic && (
              <>
                <tr className="bg-slate-100/80">
                  <td colSpan={daysInMonth + 1} className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 border-t border-b border-slate-200 sticky left-0 z-20">
                    Behavioral Frequency Log (Q12H - Shift Charting)
                  </td>
                </tr>
                {['Agitation / Aggression', 'Anxiety / Pacing', 'Wandering / Exit Seeking', 'Sleep Disturbance'].map(behavior => {
                  const virtualId = `psych_behavior_${behavior.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                  return (
                    <tr key={virtualId} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="sticky left-0 z-20 bg-white p-4 border-r border-slate-100 align-middle">
                        <div className="font-bold text-slate-800 text-xs uppercase">{behavior}</div>
                        <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">Behavior Log (0-3)</div>
                      </td>
                      {days.map(day => {
                        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const dayEntry = entries.find(e => e.medication_id === virtualId && e.scheduled_date === dateStr && e.scheduled_time === 'DAY');
                        const nightEntry = entries.find(e => e.medication_id === virtualId && e.scheduled_date === dateStr && e.scheduled_time === 'NIGHT');
                        const dayScore = dayEntry?.notes || '';
                        const nightScore = nightEntry?.notes || '';
                        
                        return (
                          <td key={day} className="p-1 border-r border-slate-50 align-middle">
                            <div className="flex flex-col gap-1 items-center">
                              <button
                                type="button"
                                title={`DAY shift score for ${behavior}`}
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  setActiveCell({
                                    rowId: virtualId,
                                    label: `${behavior} (DAY)`,
                                    date: dateStr,
                                    shift: 'DAY',
                                    maxScore: 3
                                  });
                                  setActiveScore(dayScore);
                                }}
                                className={`w-7 h-6 rounded flex items-center justify-center font-bold text-[9px] transition-all ${
                                  dayScore !== ''
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                    : isReadOnly
                                      ? 'bg-slate-50 text-slate-300 border border-slate-150 cursor-not-allowed'
                                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-150 hover:border-slate-350 cursor-pointer'
                                }`}
                              >
                                {dayScore !== '' ? `D:${dayScore}` : 'D'}
                              </button>
                              
                              <button
                                type="button"
                                title={`NIGHT shift score for ${behavior}`}
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  setActiveCell({
                                    rowId: virtualId,
                                    label: `${behavior} (NIGHT)`,
                                    date: dateStr,
                                    shift: 'NIGHT',
                                    maxScore: 3
                                  });
                                  setActiveScore(nightScore);
                                }}
                                className={`w-7 h-6 rounded flex items-center justify-center font-bold text-[9px] transition-all ${
                                  nightScore !== ''
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                    : isReadOnly
                                      ? 'bg-slate-50 text-slate-300 border border-slate-150 cursor-not-allowed'
                                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-150 hover:border-slate-350 cursor-pointer'
                                }`}
                              >
                                {nightScore !== '' ? `N:${nightScore}` : 'N'}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* AIMS Monitoring Grid */}
                <tr className="bg-slate-100/80">
                  <td colSpan={daysInMonth + 1} className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 border-t border-b border-slate-200 sticky left-0 z-20">
                    Abnormal Involuntary Movement Scale (AIMS) Monitoring
                  </td>
                </tr>
                {['Facial & Oral (Lips, Jaw, Tongue)', 'Extremities (Arms, Hands, Legs)', 'Trunk (Shoulders, Hips, Torso)'].map(area => {
                  const virtualId = `psych_aims_${area.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                  return (
                    <tr key={virtualId} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="sticky left-0 z-20 bg-white p-4 border-r border-slate-100 align-middle">
                        <div className="font-bold text-slate-800 text-xs uppercase">{area}</div>
                        <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">AIMS Score (0-4)</div>
                      </td>
                      {days.map(day => {
                        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const entry = entries.find(e => e.medication_id === virtualId && e.scheduled_date === dateStr && e.scheduled_time === 'Q12H');
                        const score = entry?.notes || '';
                        return (
                          <td key={day} className="p-1 border-r border-slate-50 align-middle text-center">
                            <button
                              type="button"
                              title={`AIMS score for ${area}`}
                              disabled={isReadOnly}
                              onClick={() => {
                                if (isReadOnly) return;
                                setActiveCell({
                                  rowId: virtualId,
                                  label: area,
                                  date: dateStr,
                                  shift: 'Q12H',
                                  maxScore: 4
                                });
                                setActiveScore(score);
                              }}
                              className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs transition-all ${
                                score !== ''
                                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                  : isReadOnly
                                    ? 'bg-slate-50 text-slate-300 border border-slate-150 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-150 hover:border-slate-350 cursor-pointer'
                              }`}
                            >
                              {score !== '' ? score : '-'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
      
      {activeMedications.length === 0 && (
        <div className="py-20 text-center text-slate-400 italic text-sm">
          No active medications listed for this month.
        </div>
      )}

      {/* Structured Scoring Selection Overlay Modal */}
      {activeCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">Document Shift Observation</h3>
            <p className="text-xs text-slate-500 uppercase tracking-tight font-semibold mb-4">{activeCell.label} · {activeCell.date}</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Clinical Score</label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: activeCell.maxScore + 1 }).map((_, val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setActiveScore(val.toString())}
                      className={`h-10 rounded-xl font-bold transition-all text-sm border flex flex-col justify-center items-center ${
                        activeScore === val.toString()
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{val}</span>
                      <span className="text-[6px] uppercase opacity-75">
                        {activeCell.maxScore === 3 ? (
                          val === 0 ? 'None' :
                          val === 1 ? 'Mild' :
                          val === 2 ? 'Mod' : 'Sev'
                        ) : (
                          val === 0 ? 'None' :
                          val === 1 ? 'Min' :
                          val === 2 ? 'Mild' :
                          val === 3 ? 'Mod' : 'Sev'
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCell(null);
                    setActiveScore('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={async () => {
                    if (isReadOnly) return;
                    if (activeScore === '') {
                      alert('Please select a score.');
                      return;
                    }
                    try {
                      await logAdministration({
                        medication_id: activeCell.rowId,
                        scheduled_date: activeCell.date,
                        scheduled_time: activeCell.shift,
                        action: 'given',
                        notes: activeScore
                      });
                      setActiveCell(null);
                      setActiveScore('');
                    } catch (err) {
                      alert(`Error logging score: ${(err as Error).message}`);
                    }
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

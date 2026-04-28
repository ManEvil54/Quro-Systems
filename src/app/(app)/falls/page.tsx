// ============================================================
// Quro — Fall Protocol & Safety
// Incident reporting and safety monitoring dashboard
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  History, 
  FileWarning, 
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function FallsPage() {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <ProtectedRoute>
      <div className="animate-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Safety & Fall Protocol</h1>
            <p className="text-sm text-slate-500 mt-1">Manage incidents, safety monitoring, and fall recovery protocols.</p>
          </div>
          <button 
            onClick={() => setShowReportForm(true)}
            className="btn-primary flex items-center gap-2 py-2 px-6"
          >
            <Plus size={18} />
            <span>New Incident Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-500" />
                  Active 72-Hour Post-Fall Monitoring
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">3 Residents</span>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'Smith, John', timeRemaining: '14h 20m', lastCheck: '10m ago' },
                  { name: 'Doe, Jane', timeRemaining: '42h 10m', lastCheck: '55m ago' },
                ].map((p, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Last Vitals Check: {p.lastCheck}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600">{p.timeRemaining}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Recent Incident History
              </h3>
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-200">
                  <FileWarning size={32} />
                </div>
                <p className="text-sm text-slate-400 italic">No incidents reported in the last 7 days.</p>
              </div>
            </div>
          </div>

          {/* Safety Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6 bg-slate-900 text-white border-none">
              <ShieldCheck size={32} className="text-teal-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Facility Safety Score</h3>
              <p className="text-4xl font-black text-teal-400">98%</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Based on fall monitoring compliance and vitals check frequency.
              </p>
              <div className="mt-6 pt-6 border-t border-white/10">
                <button className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                  <span>View Safety Audit</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Fall Prevention Tips</h3>
              <ul className="space-y-3">
                {[
                  'Ensure adequate lighting in hallways.',
                  'Verify all non-slip footwear is in use.',
                  'Keep call lights within resident reach.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

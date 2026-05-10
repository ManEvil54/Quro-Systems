// ============================================================
// Quro — MAR Grid (Medication Administration Record)
// High-contrast, "Fax-Ready" clinical documentation
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Pill, 
  Printer, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export default function MARPage() {
  const [filter, setFilter] = useState('active');

  // Placeholder data for the premium aesthetic
  const medications = [
    { id: '1', patient: 'J.D.', med: 'Amlodipine Besylate', dose: '5mg', route: 'PO', freq: 'Daily', time: '09:00', status: 'Given' },
    { id: '2', patient: 'M.S.', med: 'Metoprolol Succinate', dose: '25mg', route: 'PO', freq: 'BID', time: '09:00', status: 'Pending' },
    { id: '3', patient: 'A.K.', med: 'Gabapentin', dose: '300mg', route: 'PO', freq: 'TID', time: '13:00', status: 'Scheduled' },
    { id: '4', patient: 'R.L.', med: 'Lisinopril', dose: '10mg', route: 'PO', freq: 'Daily', time: '09:00', status: 'Missed' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 -m-8 p-8 min-h-screen bg-white">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-quro-teal/10 rounded-lg text-quro-teal">
              <Pill size={20} />
            </div>
            <h1 className="text-3xl font-black text-quro-charcoal uppercase tracking-tighter">MAR Grid</h1>
          </div>
          <p className="text-slate-500 text-xs font-black tracking-widest uppercase opacity-70">
            Medication Administration Record — Platinum Health Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH PATIENT OR MED..." 
              className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-quro-teal/20 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-quro-charcoal text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-quro-charcoal/20">
            <Printer size={16} />
            Generate Fax-Ready PDF
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Completed', value: '84%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pending', value: '12', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Alerts', value: '02', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Compliance', value: '99.2%', icon: Filter, color: 'text-teal-500', bg: 'bg-teal-50' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-4">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black text-quro-charcoal tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* The Grid */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Medication & Dosage</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Route / Frequency</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled Time</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {medications.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-quro-charcoal text-white flex items-center justify-center text-[10px] font-black">
                      {m.patient}
                    </div>
                    <span className="font-bold text-quro-charcoal text-sm">Patient {m.patient}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="font-black text-quro-charcoal text-sm mb-0.5">{m.med}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.dose}</p>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    {m.route} — {m.freq}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                    <Clock size={14} className="text-slate-400" />
                    {m.time}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`flex items-center gap-2 text-[9px] font-black tracking-widest uppercase ${
                    m.status === 'Given' ? 'text-emerald-500' : 
                    m.status === 'Pending' ? 'text-blue-500' : 
                    m.status === 'Missed' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      m.status === 'Given' ? 'bg-emerald-500' : 
                      m.status === 'Pending' ? 'bg-blue-500 animate-pulse' : 
                      m.status === 'Missed' ? 'bg-red-500' : 'bg-slate-400'
                    }`} />
                    {m.status}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 hover:bg-quro-teal/10 hover:text-quro-teal rounded-xl transition-all text-slate-300">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-12 flex items-center justify-between text-[10px] text-slate-400 font-black tracking-widest uppercase">
        <p>Verified Audit Trail Active • {new Date().toLocaleDateString()}</p>
        <p>Quro Systems Premium Edition</p>
      </footer>
    </div>
  );
}

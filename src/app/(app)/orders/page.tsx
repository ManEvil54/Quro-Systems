// ============================================================
// Quro — Clinical Orders Hub
// Patient-centric provider loop with high-fidelity documentation
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Stethoscope, 
  Plus, 
  FilePlus, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  User,
  Search,
  Filter,
  CheckCircle,
  Send,
  MoreVertical
} from 'lucide-react';

export default function OrdersPage() {
  const [filter, setFilter] = useState<'all' | 'medication' | 'treatment'>('all');

  const orders = [
    { 
      id: '1', 
      type: 'Medication', 
      patient: 'Jane Doe', 
      patientId: 'JD001',
      mrn: 'MRN-99201',
      room: '101A',
      order: 'Start Amlodipine 5mg Daily', 
      physician: 'Dr. Sarah Smith', 
      date: 'May 10, 2026', 
      time: '08:45 AM',
      status: 'Active',
      priority: 'Routine'
    },
    { 
      id: '2', 
      type: 'Treatment', 
      patient: 'Michael Scott', 
      patientId: 'MS002',
      mrn: 'MRN-99202',
      room: '102B',
      order: 'Wound Care to LLE BID — Normal Saline', 
      physician: 'Dr. James Wilson', 
      date: 'May 10, 2026', 
      time: '07:30 AM',
      status: 'Verification Pending',
      priority: 'Stat'
    },
    { 
      id: '3', 
      type: 'Medication', 
      patient: 'Robert Lewin', 
      patientId: 'RL004',
      mrn: 'MRN-99204',
      room: '104B',
      order: 'D/C Lisinopril 10mg — Patient Intolerant', 
      physician: 'Dr. Gregory Miller', 
      date: 'May 09, 2026', 
      time: '04:15 PM',
      status: 'New',
      priority: 'Routine'
    },
    { 
      id: '4', 
      type: 'Lab', 
      patient: 'Alice Kim', 
      patientId: 'AK003',
      mrn: 'MRN-99203',
      room: '103A',
      order: 'CBC and BMP on Monday Morning', 
      physician: 'Dr. Sarah Smith', 
      date: 'May 08, 2026', 
      time: '11:20 AM',
      status: 'Completed',
      priority: 'Routine'
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-teal-400 shadow-2xl shadow-slate-900/20">
              <Stethoscope size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Provider Orders</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase italic">Live Synchronization Active</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Patient or MRN..." 
              className="pl-12 pr-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-quro-teal/20 w-80 transition-all outline-none"
            />
          </div>
          <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all">
            <Filter size={20} />
          </button>
          <button className="flex items-center gap-2 px-8 py-4 bg-quro-teal text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Main Content */}
        <div className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['all', 'medication', 'treatment', 'lab'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t as any)}
                  className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                    filter === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {orders.length} Records</p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="group glass-card p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-quro-teal/30 hover:shadow-2xl transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-quro-teal group-hover:text-white transition-all duration-500">
                        {order.type === 'Medication' ? <FileText size={24} /> : <Stethoscope size={24} />}
                      </div>
                      {order.priority === 'Stat' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white border-4 border-white">
                          <AlertCircle size={10} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                          order.priority === 'Stat' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}>
                          {order.priority}
                        </span>
                        <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{order.type}</span>
                        <span className="text-[10px] font-bold text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.time}</span>
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-quro-teal transition-colors">
                        {order.order}
                      </h3>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {order.patient[0]}
                          </div>
                          <p className="text-sm font-bold text-slate-700">{order.patient}</p>
                        </div>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <p className="text-xs font-medium text-slate-400">Rm {order.room} • {order.mrn}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pl-8 md:border-l border-slate-100">
                    <div className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border ${
                      order.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                      order.status === 'New' ? 'bg-quro-teal/10 border-quro-teal/20 text-quro-teal' :
                      order.status === 'Verification Pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                      'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      {order.status}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="p-3 text-slate-300 hover:text-quro-teal hover:bg-slate-50 rounded-xl transition-all">
                        <CheckCircle size={18} />
                      </button>
                      <button className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-400/20 text-teal-400 rounded-xl">
                  <Send size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Pharmacy Link</h3>
              </div>
              
              <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed italic opacity-80">
                All medication orders are verified and queued for digital transmission to centralized pharmacy hubs.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Faxes</span>
                  </div>
                  <span className="text-lg font-black text-amber-400">02</span>
                </div>
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Status</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Success</span>
                </div>
              </div>
              
              <button className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-white/10 group">
                Push Fax Bundle
                <ExternalLink size={14} className="inline ml-2 opacity-30 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            
            {/* Ambient effects */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="p-10 border border-slate-100 rounded-[2.5rem] bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <div className="w-1 h-1 bg-quro-teal rounded-full" />
              Clinical Verifications
            </h3>
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-5 group">
                  <div className="w-1 bg-slate-200 rounded-full group-hover:bg-quro-teal transition-colors" />
                  <div>
                    <p className="text-sm font-black text-slate-900 mb-1 group-hover:text-quro-teal transition-colors">Order #9921{i} Verified</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Verified by Nurse Administrator</p>
                    <p className="text-[10px] text-slate-300 font-medium italic mt-1">Today, 09:15 AM</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

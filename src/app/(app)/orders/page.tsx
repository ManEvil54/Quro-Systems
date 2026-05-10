// ============================================================
// Quro — Clinical Orders
// Synchronized provider orders and pharmacy fax bundles
// ============================================================
'use client';

import React from 'react';
import { 
  Stethoscope, 
  Plus, 
  FilePlus, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';

export default function OrdersPage() {
  const orders = [
    { id: '1', type: 'Medication', patient: 'J.D.', order: 'Start Amlodipine 5mg Daily', physician: 'Dr. Smith', date: 'May 10, 2026', status: 'Active' },
    { id: '2', type: 'Treatment', patient: 'M.S.', order: 'Wound Care to LLE BID', physician: 'Dr. Jones', date: 'May 09, 2026', status: 'Verification Pending' },
    { id: '3', type: 'Lab', patient: 'A.K.', order: 'CBC and BMP on Monday', physician: 'Dr. Smith', date: 'May 08, 2026', status: 'Completed' },
    { id: '4', type: 'Medication', patient: 'R.L.', order: 'D/C Lisinopril 10mg', physician: 'Dr. Miller', date: 'May 10, 2026', status: 'New' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 -m-8 p-8 min-h-screen bg-white">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Stethoscope size={20} />
            </div>
            <h1 className="text-3xl font-black text-quro-charcoal uppercase tracking-tighter">Clinical Orders</h1>
          </div>
          <p className="text-slate-500 text-xs font-black tracking-widest uppercase opacity-70">
            Synchronized Provider Loop — Platinum Health Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-quro-charcoal rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all">
            <FilePlus size={16} />
            Add Provider Order
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-quro-teal text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
            <Plus size={16} />
            New Order Entry
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Orders Feed */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Order Stream</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[8px] font-black uppercase tracking-widest">Medications</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase tracking-widest">Lab/Dx</span>
            </div>
          </div>

          {orders.map((order) => (
            <div key={order.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-quro-teal/30 hover:shadow-2xl hover:shadow-quro-teal/5 transition-all duration-500">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    order.status === 'New' ? 'bg-quro-teal text-white' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {order.type === 'Medication' ? <FileText size={20} /> : <Stethoscope size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{order.type}</span>
                      <span className="text-[10px] font-bold text-slate-300 tracking-widest">•</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.date}</span>
                    </div>
                    <h3 className="text-lg font-black text-quro-charcoal tracking-tight mb-1">{order.order}</h3>
                    <p className="text-xs font-bold text-slate-500">Ordered by <span className="text-quro-charcoal">{order.physician}</span> for <span className="text-quro-charcoal">Patient {order.patient}</span></p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className={`px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase border ${
                    order.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    order.status === 'New' ? 'bg-quro-teal/10 border-quro-teal/20 text-quro-teal' :
                    order.status === 'Verification Pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                    'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    {order.status}
                  </div>
                  <button className="flex items-center gap-2 text-slate-300 hover:text-quro-teal transition-colors text-[9px] font-black uppercase tracking-widest">
                    View Full Order <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Center / Summary */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Pharmacy Sync</h3>
              <p className="text-slate-400 text-xs font-medium mb-6 opacity-80 leading-relaxed">
                All active orders are currently synchronized with the central pharmacy hub. Last update: 2 minutes ago.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Queue Status</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Synchronized</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Faxes</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">02</span>
                </div>
              </div>
              
              <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-white/5">
                Push Fax Bundle
              </button>
            </div>
            {/* Ambient background elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Recent Verifications</h3>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-1.5 h-full bg-emerald-400 rounded-full opacity-50" />
                  <div>
                    <p className="text-xs font-bold text-quro-charcoal mb-1">M.S. Order Verified by DON</p>
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">Verified on May 10, 08:32 AM</p>
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

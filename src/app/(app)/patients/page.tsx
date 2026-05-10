'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  User, 
  ChevronRight,
  Activity,
  Calendar,
  Stethoscope,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientsPage() {
  const { activeFacility, organization } = useAuth();
  const { patients, loading, error } = usePatients(activeFacility?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-teal-600 mb-2">
            <Home size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{activeFacility?.name || 'Global Census'}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Patient Directory</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm italic">Manage residents, clinical records, and admissions for this house.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/patients/new" 
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            <Plus size={18} />
            <span>ADMIT NEW PATIENT</span>
          </Link>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or MRN..."
            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 ring-teal-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Census</p>
            <p className="text-2xl font-black text-slate-900">
              {filteredPatients.length} <span className="text-slate-300">/</span> {activeFacility?.bed_count || '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-teal-500/20" />
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Synchronizing Records...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center border-rose-100 bg-rose-50/30">
          <p className="text-rose-500 font-bold">{error}</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="glass-card p-20 text-center bg-slate-50/50 border-dashed">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <User size={40} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Empty Census</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium italic">
            {searchQuery ? "No patients matching your search criteria." : "Start by admitting your first patient to this facility."}
          </p>
          {!searchQuery && (
            <Link href="/patients/new" className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20">
              <Plus size={18} />
              <span>Admit Patient</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">House / Room</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnoses</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <Link href={`/patients/${patient.id}`} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[18px] bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-105 transition-all overflow-hidden">
                        {patient.photo_url ? (
                          <img src={patient.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{patient.last_name[0]}{patient.first_name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">{patient.last_name}, {patient.first_name}</p>
                        <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tight">MRN: {patient.mrn}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{activeFacility?.name || 'TBD'}</p>
                    <p className="text-[10px] font-bold text-teal-600 mt-1">ROOM: {patient.room_number || 'UNASSIGNED'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      patient.code_status === 'full' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {patient.code_status} CODE
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xs font-medium italic">
                      {patient.diagnoses?.join(' • ') || 'No diagnoses listed'}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link 
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                    >
                      <span>Open Chart</span>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

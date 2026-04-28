// ============================================================
// Quro — Patient Directory
// Premium clinical grid for patient management
// ============================================================
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
  Stethoscope
} from 'lucide-react';
import Link from 'next/link';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientsPage() {
  const { patients, loading, error } = usePatients();
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('all');

  const filteredPatients = patients.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFacility = facilityFilter === 'all' || p.facility_id === facilityFilter;
    return matchesSearch && matchesFacility;
  });

  return (
    <div className="animate-in">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage residents, clinical records, and admissions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/patients/new" className="btn-primary shimmer-btn flex items-center gap-2">
            <Plus size={18} />
            <span>Admit New Patient</span>
          </Link>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, MRN, or diagnosis..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            className="input py-2 text-sm w-full md:w-48"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
            <option value="all">All Facilities (75 Beds)</option>
            <option value="house-a">Cedar House (25 Beds)</option>
            <option value="house-b">Willow House (25 Beds)</option>
            <option value="house-c">Oak House (25 Beds)</option>
          </select>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
          <p className="text-sm font-medium text-slate-500 whitespace-nowrap">
            Census: {filteredPatients.length} / 75
          </p>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Synchronizing records...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="glass-card p-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No patients found</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery ? "Try adjusting your search terms or filters." : "Start by admitting your first patient to the facility."}
          </p>
          {!searchQuery && (
            <Link href="/patients/new" className="btn-primary mt-6 inline-flex items-center gap-2">
              <Plus size={18} />
              <span>Admit Patient</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Name</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facility / Bed</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnoses</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="p-4">
                    <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {patient.photo_url ? (
                          <img src={patient.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{patient.last_name[0]}{patient.first_name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">{patient.last_name}, {patient.first_name}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">MRN: {patient.mrn}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-slate-700 capitalize">{patient.facility_id?.replace('-', ' ') || 'House A'}</p>
                    <p className="text-[10px] text-slate-500">Bed: {patient.room_number || 'TBD'}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      patient.code_status === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {patient.code_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">
                      {patient.diagnoses.join(', ') || 'No diagnoses listed'}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 text-teal-600 font-bold text-xs hover:translate-x-1 transition-transform"
                    >
                      <span>Open</span>
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

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, 
  ArrowLeft, 
  Printer, 
  Pill, 
  FileText, 
  ClipboardList, 
  Activity, 
  Calendar, 
  MapPin, 
  ShieldCheck,
  Plus,
  ChevronRight,
  Clock,
  Heart,
  Droplets,
  Stethoscope,
  Phone
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useMedications } from '@/hooks/useMedications';
import { useMAR } from '@/hooks/useMAR';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeFacility } = useAuth();
  const { patient, loading: patientLoading, error } = usePatient(id);
  const { medications, loading: medsLoading } = useMedications(id);
  const { entries: marEntries, loading: marLoading } = useMAR(id);
  
  const [activeTab, setActiveTab] = useState<'facesheet' | 'medications' | 'mar' | 'vitals' | 'orders'>('facesheet');

  if (patientLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-in fade-in">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-quro-teal rounded-full animate-spin mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Clinical Record...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <p className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4">{error || 'Patient Not Found'}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-quro-teal font-black uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Actions - Hidden on Print */}
      <div className="no-print flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-500 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={16} />
          Back to House
        </button>

        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            <Printer size={16} />
            Print {activeTab === 'facesheet' ? 'Facesheet' : activeTab === 'mar' ? 'MAR' : 'Medication List'}
          </button>
        </div>
      </div>

      {/* Patient Identity Bar */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-[2rem] bg-white text-slate-900 flex items-center justify-center text-3xl font-black">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-teal-500/30">Active Resident</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">MRN: {patient.mrn}</span>
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">{patient.first_name} {patient.last_name}</h1>
              <p className="text-slate-400 font-medium italic opacity-80">
                {activeFacility?.name} — Room {patient.room_id || 'TBD'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 md:gap-12 border-l border-white/10 pl-12">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <p className={`text-xl font-black ${patient.is_active_monitoring ? 'text-rose-400' : 'text-emerald-400'}`}>
                {patient.is_active_monitoring ? 'Critical' : 'Stable'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Code</p>
              <p className="text-xl font-black uppercase text-amber-400">{patient.code_status}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Age</p>
              <p className="text-xl font-black">
                {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}y
              </p>
            </div>
          </div>
        </div>

        {/* Ambient background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Tabs Navigation - Hidden on Print */}
      <div className="no-print flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-3xl w-fit">
        {[
          { id: 'facesheet', icon: FileText, label: 'Facesheet' },
          { id: 'medications', icon: Pill, label: 'Medications' },
          { id: 'mar', icon: ClipboardList, label: 'MAR Grid' },
          { id: 'vitals', icon: Activity, label: 'Clinical Vitals' },
          { id: 'orders', icon: Stethoscope, label: 'Orders' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          {activeTab === 'facesheet' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              {/* Demographics */}
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <User size={18} className="text-quro-teal" />
                  Resident Demographics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</p>
                    <p className="text-lg font-black text-slate-900">{patient.first_name} {patient.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date of Birth</p>
                    <p className="text-lg font-black text-slate-900">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gender</p>
                    <p className="text-lg font-black text-slate-900 capitalize">{patient.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SSN (Last 4)</p>
                    <p className="text-lg font-black text-slate-900">{patient.ssn_last_four || '****'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admission Date</p>
                    <p className="text-lg font-black text-slate-900">{new Date(patient.admission_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Physician</p>
                    <p className="text-lg font-black text-quro-teal">Dr. Demo Physician (Attending)</p>
                  </div>
                </div>
              </div>

              {/* Clinical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <ShieldCheck size={18} className="text-rose-500" />
                    Allergies & Alerts
                  </h3>
                  <div className="space-y-4">
                    {patient.allergies?.length ? patient.allergies.map((allergy, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-700 text-sm font-black uppercase tracking-tight">
                        <ArrowLeft size={12} className="rotate-180" />
                        {allergy}
                      </div>
                    )) : (
                      <p className="text-slate-400 italic text-sm font-medium">No known drug allergies reported (NKDA).</p>
                    )}
                  </div>
                </div>

                <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <ClipboardList size={18} className="text-blue-500" />
                    Primary Diagnoses
                  </h3>
                  <div className="space-y-3">
                    {patient.diagnoses?.length ? patient.diagnoses.map((dx, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-sm font-bold text-slate-900">{dx}</span>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    )) : (
                      <p className="text-slate-400 italic text-sm font-medium">No active diagnoses documented.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Pill size={18} className="text-quro-teal" />
                    Active Medication Profile
                  </h3>
                  <span className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">
                    {medications.length} Active Prescriptions
                  </span>
                </div>

                <div className="space-y-6">
                  {medsLoading ? (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Meds...</div>
                  ) : medications.length > 0 ? medications.map((med) => (
                    <div key={med.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-quro-teal/30 transition-all group">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{med.route} • {med.frequency}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Started {new Date(med.start_date).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{med.generic_name}</h4>
                          <p className="text-sm font-bold text-slate-500 mb-4">
                            {med.strength} — {med.dosage}
                          </p>
                          <div className="flex gap-6 pt-4 border-t border-slate-200/60">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Indication</p>
                              <p className="text-xs font-bold text-slate-700">{med.indication || 'Routine care'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Psychotropic</p>
                              <p className={`text-xs font-black uppercase ${med.is_psychotropic ? 'text-rose-500' : 'text-slate-400'}`}>
                                {med.is_psychotropic ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all">
                          <Pill size={24} className="text-quro-teal opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No active medications found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <ClipboardList size={18} className="text-quro-teal" />
                  Medication Administration Record (Last 24h)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication</th>
                        <th className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                        <th className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marLoading ? (
                        <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading MAR...</td></tr>
                      ) : marEntries.length > 0 ? marEntries.map((entry) => {
                        const med = medications.find(m => m.id === entry.medication_id);
                        return (
                          <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                            <td className="py-6">
                              <p className="text-sm font-black text-slate-900">{med?.generic_name || 'Unknown Med'}</p>
                              <p className="text-[10px] font-bold text-slate-400">{med?.dosage} • {med?.route}</p>
                            </td>
                            <td className="py-6 text-center">
                              <span className="text-xs font-black text-slate-700">{entry.scheduled_time}</span>
                            </td>
                            <td className="py-6 text-center">
                              <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                entry.action === 'given' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {entry.action}
                              </span>
                            </td>
                            <td className="py-6 text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.administered_by?.slice(-4) || 'SYSTEM'}</span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No administrations recorded today.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Status */}
        <div className="xl:col-span-4 space-y-8 no-print">
          <div className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem]">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <ShieldCheck size={18} className="text-teal-600" />
              Clinical Summary
            </h3>
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dietary Order</p>
                <div className="flex items-center gap-3">
                  <Droplets size={20} className="text-blue-500" />
                  <p className="text-lg font-black text-slate-900 capitalize">{patient.diet || 'Regular'}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Next Scheduled Vital</p>
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock size={20} />
                  <p className="text-sm font-bold">Today, 02:00 PM</p>
                </div>
              </div>

              <button className="w-full py-5 bg-quro-teal text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
                Modify Treatment Plan
              </button>
            </div>
          </div>

          <div className="glass-card p-10 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden">
            <Phone className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-6">Family Contacts</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Primary Representative</p>
                <p className="text-lg font-black">Jane Thompson</p>
                <p className="text-xs font-medium text-slate-400">555-0123 • Daughter</p>
              </div>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                View All Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Only Footer */}
      <div className="print-only hidden mt-20 pt-10 border-t border-slate-200">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Document Certification</p>
            <p className="text-xs font-bold text-slate-900">Generated via Quro Clinical Platform on {new Date().toLocaleString()}</p>
            <p className="text-xs text-slate-500 italic mt-1">Official Clinical Record — Platinum Health Hub</p>
          </div>
          <div className="text-right">
            <div className="w-48 h-px bg-slate-300 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nurse / Physician Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}

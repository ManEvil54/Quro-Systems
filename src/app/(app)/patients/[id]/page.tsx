// ============================================================
// Quro — Patient Hub (Face Sheet)
// Central command for a single resident's clinical care
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Pill, 
  Activity, 
  FileText, 
  Clock, 
  ShieldAlert,
  Edit3,
  Calendar,
  Stethoscope,
  Heart,
  Droplets,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  Plus,
  Printer,
  ClipboardList,
  Phone,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/lib/firebase/types';
import MedicationList from '@/components/clinical/MedicationList';
import MARGrid from '@/components/clinical/MARGrid';
import OrderList from '@/components/clinical/OrderList';
import VitalHistory from '@/components/clinical/VitalHistory';
import { useAudit } from '@/hooks/useAudit';
import ShiftHandoff from '@/components/clinical/ShiftHandoff';

type Tab = 'overview' | 'medications' | 'mar' | 'vitals' | 'orders' | 'handoff' | 'logs';

export default function PatientDetailPage() {
  const { id } = useParams();
  const { staff } = useAuth();
  const { logView } = useAudit(staff?.org_id || '');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    async function fetchPatient() {
      if (!staff?.org_id || !id) return;
      try {
        const patientDoc = await getDoc(doc(db, 'organizations', staff.org_id, 'patients', id as string));
        if (patientDoc.exists()) {
          setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
        }
      } catch (err) {
        console.error('Error fetching patient:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [id, staff?.org_id]);

  useEffect(() => {
    if (patient && staff?.org_id) {
      logView('patient', patient.id, `Viewed Face Sheet for ${patient.last_name}, ${patient.first_name}`);
    }
  }, [patient, staff?.org_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading clinical record...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="glass-card p-20 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Patient not found</h3>
        <Link href="/patients" className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Patient Header Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
          <Link 
            href={`/patients/${patient.id}/mar/print`} 
            target="_blank"
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            <Printer size={14} />
            <span>Print 31-Day MAR</span>
          </Link>
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <MoreVertical size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 relative group">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <User size={48} />
            )}
            <button className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 size={20} className="text-white" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{patient.last_name}, {patient.first_name}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                patient.code_status === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {patient.code_status}
              </span>
              {patient.is_active_monitoring && (
                <span className="badge badge-critical animate-pulse">ACTIVE MONITORING</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRN</p>
                <p className="text-sm font-mono font-medium text-slate-700">{patient.mrn}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DOB</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(patient.date_of_birth).toLocaleDateString()} ({new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}y)
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admitted</p>
                <p className="text-sm font-medium text-slate-700">{new Date(patient.admission_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</p>
                <p className="text-sm font-medium text-slate-700 capitalize">{patient.gender}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facility / Bed</p>
                <p className="text-sm font-medium text-slate-900 capitalize">
                  {patient.facility_id?.replace('-', ' ') || 'House A'} — <span className="font-bold text-teal-600">Bed {patient.room_number || 'TBD'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100/50 p-1 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Heart },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'mar', label: 'MAR Grid', icon: ClipboardList },
          { id: 'vitals', label: 'Vitals', icon: Activity },
          { id: 'orders', label: 'Orders', icon: FileText },
          { id: 'handoff', label: 'Shift Handoff', icon: MessageSquare },
          { id: 'logs', label: 'Family Log', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-teal-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Clinical Summary */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ClipboardList size={20} className="text-teal-600" />
                  Clinical Summary
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnoses</h3>
                    <div className="flex flex-wrap gap-2">
                      {patient.diagnoses.map((d, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100">
                          {a}
                        </span>
                      ))}
                      {patient.allergies.length === 0 && <span className="text-sm text-slate-500 italic">No allergies listed</span>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dietary Orders</h3>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
                      {patient.diet || 'Standard diet — as tolerated'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 transition-colors border-dashed">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                    <Droplets size={20} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Record Vitals</span>
                </button>
                <button className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors border-dashed">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">New Order</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'medications' && (
            <MedicationList patientId={id as string} />
          )}

          {activeTab === 'mar' && (
            <MARGrid patientId={id as string} />
          )}

          {activeTab === 'vitals' && (
            <VitalHistory patientId={id as string} />
          )}

          {activeTab === 'orders' && (
            <OrderList patientId={id as string} />
          )}

          {activeTab === 'handoff' && (
            <ShiftHandoff patientId={patient.id} />
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Care Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Admission</span>
                <span className="badge badge-muted">COMPLETED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">MAR Verified</span>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <Heart size={14} />
                  SYNCED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Monitoring</span>
                <span className={`text-xs font-bold ${patient.is_active_monitoring ? 'text-amber-600' : 'text-slate-400'}`}>
                  {patient.is_active_monitoring ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Emergency Contact</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Jane Doe (Daughter)</p>
                <p className="text-xs text-slate-500">(555) 123-4567</p>
              </div>
            </div>
            <button className="w-full mt-4 py-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
              View All Contacts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

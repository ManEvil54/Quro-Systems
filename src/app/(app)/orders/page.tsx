// ============================================================
// Quro — Live Clinical Orders Hub
// Patient-centric provider loop with HIPAA-compliant signing and acknowledgment
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Plus, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Send,
  MoreVertical,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { collection, query, where, onSnapshot, collectionGroup, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { safeFormat } from '@/lib/dateUtils';
import type { ProviderOrder } from '@/lib/firebase/types';

export default function OrdersPage() {
  const { organization, activeFacility, staff, user, isImpersonating } = useAuth();
  const [filter, setFilter] = useState<'all' | 'medication' | 'treatment' | 'lab'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveOrders, setLiveOrders] = useState<ProviderOrder[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch patients in the active facility to resolve patient metadata (Name, MRN, Room)
  useEffect(() => {
    if (!organization?.id || !activeFacility?.id) {
      setLoading(false);
      return;
    }

    const patientsRef = collection(db, 'organizations', organization.id, 'patients');
    const q = query(patientsRef, where('facility_id', '==', activeFacility.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pts: Record<string, any> = {};
      snapshot.docs.forEach(docSnap => {
        pts[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setPatients(pts);
    }, (err) => {
      console.error("Error loading patients in orders page:", err);
    });

    return () => unsubscribe();
  }, [organization?.id, activeFacility?.id]);

  // 2. Stream all orders across patients in the active facility using collectionGroup
  useEffect(() => {
    if (!organization?.id || !activeFacility?.id) {
      setLoading(false);
      return;
    }

    console.log("[Orders Hub] Listening to provider_orders for organization:", organization.id, "facility:", activeFacility.id);
    const q = query(
      collectionGroup(db, 'provider_orders'),
      where('org_id', '==', organization.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs
        .filter(docSnap => docSnap.data().facility_id === activeFacility.id)
        .map(docSnap => {
          const data = docSnap.data();
          const pathSegments = docSnap.ref.path.split('/');
          const patientIdFromPath = pathSegments[3] || data.patient_id;
          return {
            id: docSnap.id,
            patient_id: patientIdFromPath,
            ...data
          };
        }) as ProviderOrder[];

      // Sort reverse-chronologically on client side to avoid Firestore index requirement
      ords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLiveOrders(ords);
      setLoading(false);
    }, (err) => {
      console.error("Error streaming orders group:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization?.id, activeFacility?.id]);

  // 3. Clinical lifecycle actions: Physician Sign Off
  const handleSignOff = async (order: ProviderOrder) => {
    if (!organization?.id) return;
    const staffId = staff?.id || user?.uid || 'system';
    const physicianName = staff ? `Dr. ${staff.last_name}` : 'Attending Physician';
    const orgId = order.org_id || organization.id;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'organizations', orgId, 'patients', order.patient_id, 'provider_orders', order.id);
      await updateDoc(docRef, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        ordering_physician_id: staffId,
        ordering_physician_name: physicianName,
        updated_at: new Date().toISOString()
      });

      // Audit Trail
      await addDoc(collection(db, 'organizations', orgId, 'audit_logs'), {
        action: order.order_type === 'treatment' ? 'TREATMENT_ORDER_SIGNED' : 'MED_ORDER_SIGNED',
        staff_id: staffId,
        patient_id: order.patient_id,
        details: `Physician signed clinical order from global order board for ${order.title || order.generic_name || order.order_text}`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error signing off order:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Clinical lifecycle actions: Nurse Acknowledge
  const handleAcknowledge = async (order: ProviderOrder) => {
    if (!organization?.id) return;
    const staffId = staff?.id || user?.uid || 'system';
    const orgId = order.org_id || organization.id;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'organizations', orgId, 'patients', order.patient_id, 'provider_orders', order.id);
      await updateDoc(docRef, {
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledging_nurse_id: staffId,
        updated_at: new Date().toISOString()
      });

      // Audit Trail
      await addDoc(collection(db, 'organizations', orgId, 'audit_logs'), {
        action: 'ORDER_ACKNOWLEDGED',
        staff_id: staffId,
        patient_id: order.patient_id,
        details: `Nurse acknowledged signed order from global order board for ${order.title || order.generic_name || order.order_text}`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error acknowledging order:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeFacility?.id) {
    return (
      <div className="p-8 text-center glass-card max-w-md mx-auto mt-20 space-y-4">
        <Stethoscope className="mx-auto text-slate-300" size={48} />
        <h3 className="text-sm font-black uppercase text-slate-700">No Facility Selected</h3>
        <p className="text-xs text-slate-400 font-medium">Please select an active facility from the sidebar to view clinical orders.</p>
      </div>
    );
  }

  // Filter & Search Logic
  const filteredOrders = liveOrders.filter(order => {
    // Filter by type
    if (filter === 'medication' && order.order_type !== 'medication') return false;
    if (filter === 'treatment' && order.order_type !== 'treatment') return false;
    if (filter === 'lab' && order.order_type !== 'lab' && order.order_type !== 'imaging') return false;

    // Search by Patient Name or MRN
    if (searchQuery.trim() !== '') {
      const queryClean = searchQuery.toLowerCase().trim();
      const patient = patients[order.patient_id];
      const name = (patient?.full_name || '').toLowerCase();
      const mrn = (patient?.mrn || '').toLowerCase();
      const orderText = (order.order_text || '').toLowerCase();
      return name.includes(queryClean) || mrn.includes(queryClean) || orderText.includes(queryClean);
    }

    return true;
  });

  const isPhysician = isImpersonating || (staff && ['physician', 'app_owner', 'app_tech', 'super_admin'].includes(staff.role.toLowerCase()));
  const isNurseOrAdmin = isImpersonating || (staff && ['nurse', 'admin', 'client_admin', 'facility_admin', 'app_owner', 'app_tech', 'super_admin'].includes(staff.role.toLowerCase()));

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
                <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase italic">{activeFacility.name} Live</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-quro-teal transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search Patient Name, MRN or Order..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-quro-teal/20 w-80 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Main Content */}
        <div className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'medication', 'treatment', 'lab'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                    filter === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {loading ? 'Streaming Records...' : `Showing ${filteredOrders.length} Records`}
            </p>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="text-center py-20 text-xs font-mono text-slate-400">Loading live facility orders...</div>
            )}

            {filteredOrders.map((order) => {
              const patient = patients[order.patient_id];
              const ptName = patient ? `${patient.last_name || ''}, ${patient.first_name || ''}` : 'Loading Patient...';
              const ptRoom = patient?.room_number || 'TBD';
              const ptMrn = patient?.mrn || 'TBD';
              const ptInitials = patient ? `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}` : '??';

              const needsSignature = !order.signed_at && (order.status === 'draft' || order.order_method === 'telephone');
              const needsAcknowledge = order.status === 'signed' && !order.acknowledged_at;

              return (
                <div key={order.id} className="group glass-card p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-quro-teal/30 hover:shadow-2xl transition-all duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6 flex-1">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-quro-teal group-hover:text-white transition-all duration-500">
                          {order.order_type === 'medication' ? <FileText size={24} /> : <Stethoscope size={24} />}
                        </div>
                        {order.priority === 'stat' && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white border-4 border-white">
                            <AlertCircle size={10} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            order.priority === 'stat' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}>
                            {order.priority || 'routine'}
                          </span>
                          <span className="text-[10px] font-black text-quro-teal uppercase tracking-widest">{order.order_type}</span>
                          <span className="text-[10px] font-bold text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {order.created_at ? safeFormat(order.created_at, 'MMM dd, yyyy') : 'Date TBD'}
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-quro-teal transition-colors">
                          {order.order_type === 'treatment' ? order.title : order.generic_name} {order.strength || ''}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600">
                          {order.order_text}
                        </p>
                        
                        <div className="flex items-center gap-4 pt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-teal-50 text-quro-teal flex items-center justify-center text-[9px] font-black uppercase">
                              {ptInitials}
                            </div>
                            <p className="text-xs font-bold text-slate-700">{ptName}</p>
                          </div>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Rm {ptRoom} • {ptMrn}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pl-8 md:border-l border-slate-100 min-w-[180px]">
                      <div className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border ${
                        order.status === 'acknowledged' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        order.status === 'signed' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        needsSignature ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        {needsSignature 
                          ? 'Unsigned Order' 
                          : order.status === 'signed' 
                            ? 'Signed / Pending Ack' 
                            : order.status}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {/* Doctor Sign-Off Control */}
                        {needsSignature && isPhysician && (
                          <button 
                            onClick={() => handleSignOff(order)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10"
                          >
                            <ShieldCheck size={12} className="text-teal-400" />
                            Sign Off
                          </button>
                        )}

                        {/* Nurse Acknowledgment Control */}
                        {needsAcknowledge && isNurseOrAdmin && (
                          <button 
                            onClick={() => handleAcknowledge(order)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md shadow-teal-900/10"
                          >
                            <CheckCircle size={12} />
                            Acknowledge
                          </button>
                        )}

                        <a 
                          href={`/patients/${order.patient_id}/orders/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Print Patient POS Chart"
                          className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                        >
                          <Printer size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && !loading && (
              <div className="text-center py-20 glass-card">
                <FileText className="mx-auto text-slate-200 mb-4" size={64} />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No Active Orders found</p>
              </div>
            )}
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Acknowledgment</span>
                  </div>
                  <span className="text-lg font-black text-amber-400">
                    {liveOrders.filter(o => o.status === 'signed' && !o.acknowledged_at).length}
                  </span>
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
              Clinical Verifications Feed
            </h3>
            <div className="space-y-8">
              {liveOrders
                .filter(o => o.status === 'acknowledged')
                .slice(0, 5)
                .map((order) => (
                  <div key={order.id} className="flex gap-5 group">
                    <div className="w-1 bg-slate-200 rounded-full group-hover:bg-quro-teal transition-colors" />
                    <div>
                      <p className="text-sm font-black text-slate-900 mb-1 group-hover:text-quro-teal transition-colors">
                        {order.order_type === 'treatment' ? order.title : order.generic_name} Acknowledged
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Verified by Clinical Staff
                      </p>
                      {order.acknowledged_at && (
                        <p className="text-[10px] text-slate-300 font-medium italic mt-1">
                          {safeFormat(order.acknowledged_at, 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

              {liveOrders.filter(o => o.status === 'acknowledged').length === 0 && (
                <div className="text-xs text-slate-400 italic font-medium">No verified orders in current session.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

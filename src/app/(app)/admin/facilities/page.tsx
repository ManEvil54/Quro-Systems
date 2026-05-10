'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Users, 
  Activity,
  Home,
  ShieldCheck,
  AlertCircle,
  X,
  Settings
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Facility } from '@/lib/firebase/types';
import Link from 'next/link';

export default function FacilitiesManagementPage() {
  const { organization } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: '',
    phone: '',
    max_patients: 6,
  });

  const maxAllowed = organization?.max_facilities || 3;

  useEffect(() => {
    if (organization?.id) {
      fetchFacilities();
    }
  }, [organization]);

  async function fetchFacilities() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'organizations', organization!.id, 'facilities'),
        where('is_active', '==', true)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility));
      setFacilities(data);
    } catch (err) {
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFacility(e: React.FormEvent) {
    e.preventDefault();
    if (facilities.length >= maxAllowed) {
      alert(`You have reached the maximum limit of ${maxAllowed} houses allowed under your contract.`);
      return;
    }

    try {
      await addDoc(collection(db, 'organizations', organization!.id, 'facilities'), {
        ...newFacility,
        org_id: organization!.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAdding(false);
      setNewFacility({ name: '', phone: '', max_patients: 6 });
      fetchFacilities();
    } catch (err) {
      console.error('Error adding facility:', err);
      alert('Failed to add house');
    }
  }

  if (loading) return <div className="p-10 animate-pulse text-slate-400 font-black uppercase tracking-widest text-center">Calibrating Infrastructure...</div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-teal-500/10 text-teal-500 rounded text-[10px] font-black uppercase tracking-widest border border-teal-500/20">
              Contract Hierarchy
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {facilities.length} of {maxAllowed} Houses Active
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">House Management</h1>
          <p className="text-slate-500 font-medium">Provision and manage clinical environments across your organization.</p>
        </div>

        {facilities.length < maxAllowed && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-quro-teal text-white rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-2 shadow-xl shadow-teal-900/20"
          >
            <Plus size={16} />
            ADD NEW HOUSE
          </button>
        )}
      </div>

      {/* Capacity Warning */}
      {facilities.length >= maxAllowed && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-800">
          <AlertCircle className="text-amber-500" size={24} />
          <div>
            <p className="text-sm font-bold uppercase tracking-tight">Contract Limit Reached</p>
            <p className="text-xs font-medium opacity-80">You have reached your limit of {maxAllowed} facilities. Contact system support to upgrade your tier.</p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map((f, i) => (
          <div key={f.id} className="glass-card overflow-hidden group hover:border-quro-teal/30 transition-all duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
              <div className="p-3 bg-white rounded-2xl text-teal-500 shadow-sm">
                <Home size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link 
                  href={`/admin/facility?id=${f.id}`}
                  className="p-2 text-slate-400 hover:text-teal-500 transition-colors bg-white rounded-lg border border-slate-200"
                >
                  <Settings size={14} />
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{f.name}</h3>
                <p className="text-xs text-slate-400 font-medium">{f.phone || 'No phone listed'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patients</p>
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" />
                    <span className="text-sm font-black text-slate-700">0 / {f.max_patients || 6}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff Access</p>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-teal-500" />
                    <span className="text-sm font-black text-slate-700">All</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                  <ShieldCheck size={10} />
                  Operational
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}

        {/* Empty State / Call to action */}
        {facilities.length < maxAllowed && (
          <button 
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-quro-teal hover:text-quro-teal transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-50 group-hover:scale-110 transition-all">
              <Plus size={32} />
            </div>
            <div className="text-center">
              <p className="font-black uppercase tracking-tight text-sm">Provision House {facilities.length + 1}</p>
              <p className="text-[10px] font-medium opacity-60">Expand your infrastructure</p>
            </div>
          </button>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic">New Facility Node</h3>
                <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Client Organization Asset</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddFacility} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">House Name</label>
                <input 
                  required
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal focus:ring-4 ring-teal-500/10 outline-none transition-all"
                  placeholder="e.g. Maple House Residential"
                  value={newFacility.name}
                  onChange={e => setNewFacility({...newFacility, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Line</label>
                  <input 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    placeholder="(555) 000-0000"
                    value={newFacility.phone}
                    onChange={e => setNewFacility({...newFacility, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient Cap</label>
                  <input 
                    type="number"
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    value={newFacility.max_patients}
                    onChange={e => setNewFacility({...newFacility, max_patients: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                  By provisioning this house, you agree to the per-facility licensing terms. This house will inherit your organization's global security policies.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/40"
              >
                DEPLOY INFRASTRUCTURE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

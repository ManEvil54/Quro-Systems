'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Key, 
  Trash2, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Staff, StaffRole, Facility } from '@/lib/firebase/types';

export default function StaffManagementPage() {
  const { organization, staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'nurse' as StaffRole,
    credential: '',
    duration: 'permanent' as '8' | '12' | 'permanent',
    assignedFacilityIds: [] as string[]
  });

  useEffect(() => {
    if (organization?.id) {
      fetchStaff();
      fetchFacilities();
    }
  }, [organization]);

  async function fetchStaff() {
    setLoading(true);
    try {
      const q = query(collection(db, 'organizations', organization!.id, 'staff'));
      const snap = await getDocs(q);
      setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFacilities() {
    try {
      const q = query(
        collection(db, 'organizations', organization!.id, 'facilities'),
        where('is_active', '==', true)
      );
      const snap = await getDocs(q);
      setFacilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility)));
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;

    try {
      const expiresAt = newStaff.duration === 'permanent' 
        ? null 
        : new Date(Date.now() + parseInt(newStaff.duration) * 60 * 60 * 1000).toISOString();

      const staffRef = doc(collection(db, 'organizations', organization.id, 'staff'));
      await setDoc(staffRef, {
        org_id: organization.id,
        facility_id: newStaff.assignedFacilityIds[0] || null, // Primary facility
        assigned_facility_ids: newStaff.assignedFacilityIds,
        first_name: newStaff.firstName,
        last_name: newStaff.lastName,
        initials: (newStaff.firstName[0] + newStaff.lastName[0]).toUpperCase(),
        email: newStaff.email,
        role: newStaff.role,
        credential: newStaff.credential,
        is_active: true,
        is_onboarded: false,
        must_change_password: true,
        access_expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setIsAdding(false);
      setNewStaff({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        role: 'nurse', 
        credential: '', 
        duration: 'permanent',
        assignedFacilityIds: []
      });
      fetchStaff();
    } catch (err) {
      console.error('Error adding staff:', err);
      alert('Failed to provision staff access');
    }
  }

  const toggleFacility = (id: string) => {
    setNewStaff(prev => ({
      ...prev,
      assignedFacilityIds: prev.assignedFacilityIds.includes(id)
        ? prev.assignedFacilityIds.filter(fid => fid !== id)
        : [...prev.assignedFacilityIds, id]
    }));
  };

  async function toggleStatus(staffMember: Staff) {
    if (!organization) return;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'staff', staffMember.id), {
        is_active: !staffMember.is_active,
        updated_at: new Date().toISOString()
      });
      fetchStaff();
    } catch (err) {
      console.error('Error toggling staff status:', err);
    }
  }

  const filteredStaff = staffList.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Staff Authority</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm italic">Provision doctors, nurses, and managers with granular house access.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-quro-teal text-white rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20"
        >
          <UserPlus size={16} />
          PROVISION NEW STAFF
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Personnel', value: staffList.filter(s => s.is_active).length, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Clinical Users', value: staffList.filter(s => s.role === 'nurse' || s.role === 'physician').length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Revoked Access', value: staffList.filter(s => !s.is_active).length, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search registry by name, email, or credential..." 
              className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 ring-teal-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Personnel</th>
              <th className="px-8 py-5">Authority & Role</th>
              <th className="px-8 py-5">Assigned Houses</th>
              <th className="px-8 py-5">Security</th>
              <th className="px-8 py-5 text-right">Access Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredStaff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-105 transition-all">
                      {s.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.first_name} {s.last_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{s.role}</span>
                    <span className="text-[10px] text-teal-600 font-black">{s.credential || 'No Title Set'}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-wrap gap-2">
                    {s.role === 'admin' || s.role === 'FACILITY_ADMIN' ? (
                      <span className="text-[10px] font-black text-slate-400 uppercase italic">Global Access</span>
                    ) : s.assigned_facility_ids && s.assigned_facility_ids.length > 0 ? (
                      s.assigned_facility_ids.map(fid => {
                        const facility = facilities.find(f => f.id === fid);
                        return (
                          <span key={fid} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase border border-slate-200">
                            {facility?.name || 'House'}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] font-black text-rose-400 uppercase italic">No Houses Assigned</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  {s.is_active ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={14} />
                      Operational
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                      <XCircle size={14} />
                      Revoked
                    </div>
                  )}
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => toggleStatus(s)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md ${
                      s.is_active 
                        ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {s.is_active ? 'Revoke' : 'Restore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                  <UserPlus className="text-quro-teal" />
                  Provision Access
                </h3>
                <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Authorized Clinical Onboarding</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                <XCircle size={32} />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    value={newStaff.firstName}
                    onChange={e => setNewStaff({...newStaff, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    value={newStaff.lastName}
                    onChange={e => setNewStaff({...newStaff, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Identity</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="email"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] pl-12 pr-4 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    value={newStaff.email}
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all appearance-none cursor-pointer"
                    value={newStaff.role}
                    onChange={e => setNewStaff({...newStaff, role: e.target.value as StaffRole})}
                  >
                    <option value="nurse">Nurse (RN / LVN)</option>
                    <option value="physician">Doctor / Prescriber</option>
                    <option value="admin">Administrator / Manager</option>
                    <option value="cna">CNA / Caregiver</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Title</label>
                  <input 
                    placeholder="e.g. Registered Nurse"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                    value={newStaff.credential}
                    onChange={e => setNewStaff({...newStaff, credential: e.target.value})}
                  />
                </div>
              </div>

              {/* Multi-Facility Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                  <span>Assigned House Access</span>
                  <span className="text-quro-teal">Required for clinical roles</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {facilities.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFacility(f.id)}
                      className={`flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all ${
                        newStaff.assignedFacilityIds.includes(f.id)
                        ? 'bg-teal-50 border-quro-teal text-teal-900'
                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {newStaff.assignedFacilityIds.includes(f.id) ? <CheckSquare className="text-quro-teal" size={18} /> : <Square size={18} />}
                      <span className="text-xs font-black uppercase tracking-tight">{f.name}</span>
                    </button>
                  ))}
                </div>
                {facilities.length === 0 && (
                  <p className="text-[10px] font-bold text-rose-400 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    No houses found. Please provision a house first.
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[24px] flex gap-4">
                <Key className="text-amber-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Temporary Security Token</p>
                  <p className="text-[10px] text-amber-700/80 leading-relaxed font-bold">
                    User will be forced to set their permanent password on first login. 
                    Registry access can be revoked instantly from the main console.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/40"
                >
                  AUTHORIZE ACCESS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Quro — Staff Management (Admin Panel)
// Authority: DON & House Manager
// ============================================================
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
  MoreVertical,
  Clock
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Staff, StaffRole } from '@/lib/firebase/types';

export default function StaffManagementPage() {
  const { organization, staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
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
    duration: '12' as '8' | '12' | 'permanent'
  });

  useEffect(() => {
    fetchStaff();
  }, [organization]);

  async function fetchStaff() {
    if (!organization) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'organizations', organization.id, 'staff')
      );
      const snap = await getDocs(q);
      setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;

    try {
      // 1. In a real app, this would call a Cloud Function to create the Firebase Auth user.
      // For this demo/impl, we'll create the Firestore record.
      // We will assume the DON gives them the email/temp password.
      
      const expiresAt = newStaff.duration === 'permanent' 
        ? null 
        : new Date(Date.now() + parseInt(newStaff.duration) * 60 * 60 * 1000).toISOString();

      const staffRef = doc(collection(db, 'organizations', organization.id, 'staff'));
      await setDoc(staffRef, {
        org_id: organization.id,
        facility_id: currentStaff?.facility_id || null,
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
      setNewStaff({ firstName: '', lastName: '', email: '', role: 'nurse', credential: '', duration: '12' });
      fetchStaff();
    } catch (err) {
      console.error('Error adding staff:', err);
    }
  }

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-quro-charcoal uppercase tracking-tight">Staff Authority Panel</h1>
          <p className="text-xs text-slate-500 font-medium">Manage registry nurses, physicians, and facility credentials.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-quro-teal text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20"
        >
          <UserPlus size={16} />
          PROVISION NEW STAFF
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Personnel', value: staffList.filter(s => s.is_active).length, icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Onboarding Pending', value: staffList.filter(s => !s.is_onboarded).length, icon: Clock, color: 'text-amber-500' },
          { label: 'Access Revoked', value: staffList.filter(s => !s.is_active).length, icon: ShieldAlert, color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-100 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-quro-charcoal">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, email, or credential..." 
              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Name & Title</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Security Status</th>
              <th className="px-6 py-4">Onboarding</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-quro-charcoal flex items-center justify-center text-white font-bold text-xs">
                      {staff.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-quro-charcoal">{staff.first_name} {staff.last_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{staff.credential || 'No Title Set'} • {staff.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                    {staff.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {staff.is_active ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase">
                        <CheckCircle2 size={12} />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-500 text-[10px] font-black uppercase">
                        <XCircle size={12} />
                        ACCESS REVOKED
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {staff.is_onboarded ? (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Verified</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[9px] font-black uppercase">Pending Info</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleStatus(staff)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm ${
                      staff.is_active 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {staff.is_active ? 'REVOKE ACCESS' : 'RESTORE ACCESS'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-quro-charcoal p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Provision New Access</h3>
                <p className="text-xs text-white/60 font-medium">Create a temporary profile for new or registry staff.</p>
              </div>
              <Users size={24} className="text-quro-teal" />
            </div>

            <form onSubmit={handleAddStaff} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.firstName}
                    onChange={e => setNewStaff({...newStaff, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.lastName}
                    onChange={e => setNewStaff({...newStaff, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Login Identity)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required
                    type="email"
                    className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.email}
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.role}
                    onChange={e => setNewStaff({...newStaff, role: e.target.value as StaffRole})}
                  >
                    <option value="nurse">Registered Nurse (RN/LVN)</option>
                    <option value="cna">CNA / Caregiver</option>
                    <option value="physician">Physician / NP / PA</option>
                    <option value="admin">Admin / Management</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professional Title</label>
                  <input 
                    placeholder="e.g. LVN, RN-BC"
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.credential}
                    onChange={e => setNewStaff({...newStaff, credential: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Duration (Registry Safety)</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    value={newStaff.duration}
                    onChange={e => setNewStaff({...newStaff, duration: e.target.value as any})}
                  >
                    <option value="8">8 HOURS (SINGLE SHIFT)</option>
                    <option value="12">12 HOURS (LONG SHIFT)</option>
                    <option value="permanent">PERMANENT STAFF</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                <Key className="text-amber-600 flex-shrink-0" size={20} />
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Temporary Credentialing</p>
                  <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                    New staff will be forced to set their own name, title, and private password upon first login.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-quro-teal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20"
                >
                  AUTHORIZE ACCESS
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Quro — Settings Hub
// Administration, facilities, and staff management
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Home, 
  Users, 
  Mail, 
  Globe, 
  Shield, 
  CreditCard,
  Plus,
  Check,
  ChevronRight,
  MoreVertical,
  Building
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function SettingsPage() {
  const { org, facilities, invitations, loading, updateOrg, addFacility, inviteStaff } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'facilities' | 'staff'>('general');

  const [inviteForm, setInviteForm] = useState({ email: '', role: 'nurse', facilityId: '' });
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.facilityId) return;
    setIsInviting(true);
    try {
      await inviteStaff(inviteForm.email, inviteForm.role, inviteForm.facilityId);
      setInviteForm({ ...inviteForm, email: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading settings...</div>;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="animate-in">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">System Settings</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-64 shrink-0 space-y-1">
            {[
              { id: 'general', label: 'Organization', icon: Building },
              { id: 'facilities', label: 'Facilities (Houses)', icon: Home },
              { id: 'staff', label: 'Staff & Security', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'general' && org && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Organization Profile</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="label">Organization Name</label>
                    <input type="text" className="input" defaultValue={org.name} onBlur={(e) => updateOrg({ name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Domain Alias</label>
                    <div className="flex items-center gap-2">
                      <input type="text" className="input bg-slate-50" readOnly defaultValue={org.subdomain || 'quro-sys-main'} />
                      <span className="text-xs font-bold text-teal-600">ACTIVE</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-4">Branding (Modern 2026)</p>
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <Plus size={24} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'facilities' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Manage Houses</h3>
                  <button className="btn-secondary flex items-center gap-2 text-xs py-1.5 px-3">
                    <Plus size={14} />
                    <span>Add New House</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilities.map((fac) => (
                    <div key={fac.id} className="glass-card p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Home size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{fac.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              Max 25 Beds
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">CLHF Category C</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="space-y-6">
                {/* Invite Form */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Invite New Clinical Staff</h3>
                  <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="label">Email Address</label>
                      <input 
                        type="email" className="input" placeholder="nurse@qurosystems.com"
                        value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="label">Clinical Role</label>
                      <select 
                        className="input"
                        value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
                      >
                        <option value="nurse">Registered Nurse (RN)</option>
                        <option value="lvn">Licensed Vocational Nurse (LVN)</option>
                        <option value="cna">Certified Nursing Assistant (CNA)</option>
                        <option value="physician">Physician / MD</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Assign House</label>
                      <select 
                        className="input"
                        value={inviteForm.facilityId} onChange={e => setInviteForm({...inviteForm, facilityId: e.target.value})}
                      >
                        <option value="">Select a house...</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <button 
                      type="submit" disabled={isInviting}
                      className="btn-primary shimmer-btn py-2.5 px-6 flex items-center gap-2"
                    >
                      <Mail size={18} />
                      <span>{isInviting ? 'Sending...' : 'Send Invite'}</span>
                    </button>
                  </form>
                </div>

                {/* Staff List (Pending) */}
                <div className="glass-card p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Invitations</h3>
                  <div className="divide-y divide-slate-50">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Mail size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{inv.email}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Role: {inv.role}</p>
                          </div>
                        </div>
                        <span className="badge badge-muted">PENDING</span>
                      </div>
                    ))}
                    {invitations.length === 0 && <p className="py-4 text-center text-sm text-slate-400 italic">No pending invitations.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

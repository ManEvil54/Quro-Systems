// ============================================================
// Quro — Master Console (SYSTEM_OWNER Only)
// Root Authority Level 0 — Infrastructure & Provisioning
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  Building2, 
  Lock,
  Database,
  Search,
  Ghost,
  X,
  Zap,
  Server,
  UserPlus,
  Mail,
  ShieldCheck,
  Cpu,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization, Staff, StaffRole } from '@/lib/firebase/types';

export default function MasterConsolePage() {
  const { impersonate } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [systemStaff, setSystemStaff] = useState<Staff[]>([]);
  const [demoLeads, setDemoLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'infrastructure' | 'personnel' | 'leads'>('infrastructure');
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalFacilities: 0,
    activeTechs: 0,
    syncHealth: 99.9,
    capturedLeads: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddingOrg, setIsAddingOrg] = useState(false);
  const [isAddingTech, setIsAddingTech] = useState(false);

  // Form States
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    max_facilities: 3,
    contact_email: ''
  });

  const [newTech, setNewTech] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'APP_TECH' as StaffRole
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Organizations
      const orgQuery = query(collection(db, 'organizations'), orderBy('created_at', 'desc'));
      const orgSnap = await getDocs(orgQuery);
      const orgs = orgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgs);

      // 2. Fetch System Personnel
      const staffQuery = query(collection(db, 'organizations', 'SYSTEM', 'staff'));
      const staffSnap = await getDocs(staffQuery);
      const staff = staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setSystemStaff(staff);

      // 3. Fetch Demo Leads
      const leadsQuery = query(collection(db, 'demo_leads'), orderBy('captured_at', 'desc'));
      const leadsSnap = await getDocs(leadsQuery);
      const leads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDemoLeads(leads);
      
      setStats({
        totalOrganizations: orgs.length,
        totalFacilities: orgs.reduce((acc, org) => acc + (org.max_facilities || 0), 0),
        activeTechs: staff.filter(s => s.is_active).length,
        syncHealth: 99.9,
        capturedLeads: leads.length
      });
    } catch (err) {
      console.error('Error fetching master data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations'), {
        ...newOrg,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAddingOrg(false);
      setNewOrg({ name: '', slug: '', max_facilities: 3, contact_email: '' });
      fetchData();
    } catch (err) {
      console.error('Error creating organization:', err);
    }
  }

  async function handleCreateTech(e: React.FormEvent) {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Caller is not authenticated");

      const token = await currentUser.getIdToken();

      const res = await fetch('/api/admin/provision-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newTech.email,
          password: newTech.password,
          firstName: newTech.firstName,
          lastName: newTech.lastName,
          role: newTech.role,
          orgId: 'SYSTEM',
          assignedFacilityIds: []
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to provision tech specialist');
      }

      setIsAddingTech(false);
      setNewTech({ firstName: '', lastName: '', email: '', password: '', role: 'APP_TECH' });
      fetchData();
    } catch (err: any) {
      console.error('Error provisioning tech:', err);
      alert(err.message || 'Failed to provision tech specialist');
    }
  }

  const handleImpersonate = async (orgId: string, orgName: string) => {
    const confirm = window.confirm(`Activate Ghost Mode for ${orgName}?\n\nThis will grant you full clinical access to their facilities for support purposes. All actions will be logged in the system audit trail.`);
    if (confirm) {
      await impersonate(orgId);
      // Auto-redirect to dashboard to verify environment state
      window.location.href = '/dashboard';
    }
  };

  async function toggleOrgStatus(orgId: string, currentStatus: boolean) {
    try {
      await setDoc(doc(db, 'organizations', orgId), { is_active: !currentStatus }, { merge: true });
      fetchData();
    } catch (err) {
      console.error('Error toggling org status:', err);
    }
  }

  async function handleDeleteOrg(orgId: string, orgName: string) {
    const confirm = window.confirm(`Are you sure you want to permanently delete the organization "${orgName}"?\n\nWARNING: This will permanently delete the organization record from Firestore. This action cannot be undone.`);
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId));
      fetchData();
    } catch (err) {
      console.error('Error deleting organization:', err);
      alert('Failed to delete organization: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function toggleTechStatus(techId: string, currentStatus: boolean) {
    try {
      await setDoc(doc(db, 'organizations', 'SYSTEM', 'staff', techId), { is_active: !currentStatus }, { merge: true });
      fetchData();
    } catch (err) {
      console.error('Error toggling tech status:', err);
    }
  }

  async function handleDeleteLead(leadId: string) {
    const confirm = window.confirm('Are you sure you want to delete this lead? This action cannot be undone.');
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'demo_leads', leadId));
      fetchData();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  }

  const filteredItems = activeTab === 'infrastructure' 
    ? organizations.filter(org => org.name.toLowerCase().includes(searchQuery.toLowerCase()) || org.slug.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTab === 'personnel'
    ? systemStaff.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : demoLeads.filter(l => l.email?.toLowerCase().includes(searchQuery.toLowerCase()) || l.source?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <ProtectedRoute allowedRoles={['APP_OWNER', 'APP_TECH']}>
      <div className="p-10 space-y-12 max-w-[1400px] mx-auto animate-in fade-in duration-700">
        
        {/* Platinum Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-100 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-white/10 shadow-xl shadow-slate-900/20">
                Level 0 Authority
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                <Server size={12} />
                Infrastructure Cluster Active
              </div>
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              System <span className="text-slate-300">Master</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-4 flex items-center gap-2">
               <ShieldAlert size={14} className="text-amber-500" />
               Zero-Knowledge Oversight • Internal Command Console
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200 shadow-inner mr-4">
               <button 
                 onClick={() => setActiveTab('infrastructure')}
                 className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'infrastructure' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Infrastructure
               </button>
               <button 
                 onClick={() => setActiveTab('personnel')}
                 className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'personnel' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Personnel
               </button>
               <button 
                 onClick={() => setActiveTab('leads')}
                 className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Demo Leads
               </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder={activeTab === 'infrastructure' ? "Search Client Mesh..." : activeTab === 'personnel' ? "Search Tech Roster..." : "Search Leads..."} 
                className="pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all w-80 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === 'infrastructure' && (
              <button 
                onClick={() => setIsAddingOrg(true)}
                className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black tracking-widest uppercase hover:bg-teal-600 hover:scale-[1.02] transition-all flex items-center gap-3 shadow-2xl shadow-slate-900/20 active:scale-95"
              >
                <Zap size={18} className="text-teal-400" />
                Provision Client
              </button>
            )}
            {activeTab === 'personnel' && (
              <button 
                onClick={() => setIsAddingTech(true)}
                className="px-10 py-5 bg-teal-600 text-white rounded-[2rem] text-xs font-black tracking-widest uppercase hover:bg-teal-700 hover:scale-[1.02] transition-all flex items-center gap-3 shadow-2xl shadow-teal-900/20 active:scale-95"
              >
                <UserPlus size={18} />
                Hire Tech Specialist
              </button>
            )}
          </div>
        </div>

        {/* Global Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Network Nodes', value: stats.totalOrganizations, icon: Building2, color: 'text-teal-500', bg: 'bg-teal-50' },
            { label: 'Personnel Access', value: stats.activeTechs, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'Captured Leads', value: stats.capturedLeads, icon: Mail, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Encrypted State', value: 'Verified', icon: Lock, color: 'text-slate-900', bg: 'bg-slate-100' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-8 group hover:border-teal-500/20 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 ${stat.bg} rounded-2xl ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-card overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 text-lg">
              {activeTab === 'infrastructure' && <Database size={20} className="text-teal-500" />}
              {activeTab === 'personnel' && <Cpu size={20} className="text-teal-500" />}
              {activeTab === 'leads' && <Mail size={20} className="text-teal-500" />}
              {activeTab === 'infrastructure' && 'Infrastructure Roster'}
              {activeTab === 'personnel' && 'System Operations Team'}
              {activeTab === 'leads' && 'Demo Lead Capture Roster'}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activeTab === 'infrastructure' && `${filteredItems.length} Active Organizations`}
              {activeTab === 'personnel' && `${filteredItems.length} Active Personnel`}
              {activeTab === 'leads' && `${filteredItems.length} Captured Leads`}
            </span>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              {loading ? (
                <div className="py-32 text-center">
                  <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Master Cluster...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-32 text-center text-slate-400 font-medium italic">
                  No records found in this category.
                </div>
              ) : activeTab === 'infrastructure' ? (
                (filteredItems as Organization[]).map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 font-black text-2xl group-hover:text-teal-500 group-hover:bg-teal-50 transition-all">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-slate-900 text-xl tracking-tight">{org.name}</h4>
                          {!org.is_active && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[8px] font-black uppercase tracking-widest">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                             <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black italic">slug://</span>
                             <span className="text-[10px] text-slate-600 font-bold uppercase">{org.slug}</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <div className="text-[10px] text-teal-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                             <Building2 size={12} />
                             {org.max_facilities} Facility Limit
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleOrgStatus(org.id, org.is_active)}
                        className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${org.is_active ? 'bg-white text-slate-400 border-slate-100 hover:text-amber-600 hover:bg-amber-50' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
                      >
                        {org.is_active ? 'Archive Client' : 'Restore Client'}
                      </button>
                      <button 
                        onClick={() => handleImpersonate(org.id, org.name)}
                        className="px-8 py-4 bg-slate-900 text-white border border-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:border-rose-600 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                      >
                        <Ghost size={16} />
                        Ghost Mode
                      </button>
                      <button 
                        onClick={() => handleDeleteOrg(org.id, org.name)}
                        className="p-4 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        title="Delete Organization"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : activeTab === 'personnel' ? (
                (filteredItems as Staff[]).map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        {tech.initials}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xl tracking-tight">{tech.first_name} {tech.last_name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-slate-500">
                             <Mail size={12} />
                             <span className="text-[10px] font-bold uppercase">{tech.email}</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <div className="text-[10px] text-teal-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                             <ShieldCheck size={12} />
                             {tech.role === 'APP_OWNER' ? 'System Proprietor' : 'Operational Tech'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTechStatus(tech.id, tech.is_active)}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tech.is_active ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                      >
                         {tech.is_active ? 'Revoke Access' : 'Restore Authority'}
                      </button>
                      <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${tech.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                         {tech.is_active ? 'ACTIVE AUTHORITY' : 'REVOKED'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                (filteredItems as any[]).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all group animate-in fade-in duration-300">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 font-black text-xl group-hover:bg-amber-100 transition-all">
                        @
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xl tracking-tight">{lead.email}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-slate-500">
                             <span className="text-[10px] font-bold uppercase">
                                Source: <span className="text-slate-800">{lead.source === 'platinum_experience' ? 'Platinum Experience' : 'Direct Demo'}</span>
                             </span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <div className="text-[10px] text-teal-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                             Captured {lead.captured_at ? new Date(lead.captured_at.seconds * 1000).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest">
                         {lead.status || 'Active Access'}
                      </div>
                      <button 
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        title="Delete Lead"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Org Modal */}
        {isAddingOrg && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="bg-slate-900 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">Provision Node</h3>
                    <p className="text-[10px] text-teal-400 font-black uppercase tracking-[0.3em] mt-2">Initialize Client Organization</p>
                  </div>
                  <button onClick={() => setIsAddingOrg(false)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all" title="Close dialog">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateOrg} className="p-12 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Organization Identity</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-500 focus:ring-8 ring-teal-500/5 outline-none transition-all"
                    placeholder="e.g. ModernQure Medical Group"
                    value={newOrg.name}
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Client URL Slug</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest pointer-events-none">quro.app/</span>
                    <input 
                      required
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 pl-28 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-500 outline-none transition-all"
                      placeholder="client-name"
                      value={newOrg.slug}
                      onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="master-facility-allocation" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Facility Allocation</label>
                    <select 
                      id="master-facility-allocation"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-teal-500 outline-none transition-all appearance-none"
                      value={newOrg.max_facilities}
                      onChange={e => setNewOrg({...newOrg, max_facilities: parseInt(e.target.value)})}
                    >
                      <option value={1}>1 Facility Node</option>
                      <option value={3}>3 Facilities (Standard)</option>
                      <option value={5}>5 Facilities (Elite)</option>
                      <option value={10}>10 Facilities (Enterprise)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Primary Contact</label>
                    <input 
                      type="email"
                      required
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-teal-500 outline-none transition-all"
                      placeholder="admin@client.com"
                      value={newOrg.contact_email}
                      onChange={e => setNewOrg({...newOrg, contact_email: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-teal-600 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-900/40 active:scale-95"
                >
                  Confirm Provisioning
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Tech Modal */}
        {isAddingTech && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="bg-teal-600 p-10 text-white relative">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">Authorize Specialist</h3>
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mt-2">Provision Internal Infrastructure Access</p>
                  </div>
                  <button onClick={() => setIsAddingTech(false)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all" title="Close dialog">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTech} className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label htmlFor="tech-first-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">First Name</label>
                      <input 
                        id="tech-first-name"
                        required
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                        value={newTech.firstName}
                        onChange={e => setNewTech({...newTech, firstName: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label htmlFor="tech-last-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Last Name</label>
                      <input 
                        id="tech-last-name"
                        required
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                        value={newTech.lastName}
                        onChange={e => setNewTech({...newTech, lastName: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Authorized Email / Sign-on Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                      placeholder="e.g. specialist@qurosystems.com or tech.johan"
                      value={newTech.email}
                      onChange={e => setNewTech({...newTech, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Temporary Password</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                      placeholder="Min. 6 characters"
                      value={newTech.password}
                      onChange={e => setNewTech({...newTech, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-100 p-6 rounded-[2rem] flex gap-5">
                  <Lock className="text-teal-600 flex-shrink-0" size={24} />
                  <p className="text-[11px] text-teal-700/80 leading-relaxed font-bold uppercase tracking-tight">
                    Warning: You are granting this user System-Level &quot;Ghost Mode&quot; authority across all client organizations. This action is logged.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-teal-600 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-900/40 active:scale-95"
                >
                  Confirm Tech Authorization
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

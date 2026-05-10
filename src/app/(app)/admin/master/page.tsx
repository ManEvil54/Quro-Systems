// ============================================================
// Quro — Master Console (SUPER_ADMIN Only)
// Root Authority Level 0
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  Building2, 
  Power, 
  TrendingUp, 
  AlertTriangle,
  Lock,
  Globe,
  Database,
  Search,
  Ghost,
  Plus,
  X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization } from '@/lib/firebase/types';

export default function MasterConsolePage() {
  const { impersonate } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalFacilities: 0,
    activePatients: 0,
    syncHealth: 99.2
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOrg, setIsAddingOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    max_facilities: 3,
    contact_email: ''
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    setLoading(true);
    try {
      const q = query(collection(db, 'organizations'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const orgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgs);
      
      setStats(prev => ({
        ...prev,
        totalOrganizations: orgs.length,
        totalFacilities: orgs.reduce((acc, org) => acc + (org.max_facilities || 0), 0),
      }));
    } catch (err) {
      console.error('Error fetching organizations:', err);
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
      fetchOrganizations();
    } catch (err) {
      console.error('Error creating organization:', err);
      alert('Failed to create organization');
    }
  }

  const handleImpersonate = async (orgId: string, orgName: string) => {
    const confirm = window.confirm(`Activate Ghost Mode for ${orgName}? Your access will be logged for auditing.`);
    if (confirm) {
      await impersonate(orgId);
    }
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                Level 0 Authority
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Globe size={10} />
                Global Management Active
              </div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">System Master Console</h1>
            <p className="text-slate-500 font-medium">Infrastructure Oversight & Client Provisioning</p>
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search Clients..." 
                className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all w-64 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsAddingOrg(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-2 shadow-xl shadow-teal-900/20"
            >
              <Plus size={16} />
              PROVISION CLIENT
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Clients', value: stats.totalOrganizations, icon: Building2, color: 'text-teal-500', bg: 'bg-teal-50' },
            { label: 'System Health', value: `${stats.syncHealth}%`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Max Capacity', value: stats.totalFacilities, icon: Database, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Security Status', value: 'Active', icon: Lock, color: 'text-slate-900', bg: 'bg-slate-100' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 ${stat.bg} rounded-lg ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Client List */}
        <div className="glass-card p-8">
          <h3 className="font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Users size={20} className="text-teal-500" />
            Provisioned Organizations
          </h3>
          
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                Fetching Infrastructure Nodes...
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-medium">
                No organizations found matching your search.
              </div>
            ) : filteredOrgs.map((org, i) => (
              <div key={org.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-300 border border-slate-100 font-black text-lg group-hover:text-teal-500 transition-colors">
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{org.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Slug: {org.slug}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] text-teal-600 uppercase tracking-widest font-black">{org.max_facilities} Facility Limit</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleImpersonate(org.id, org.name)}
                    className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-teal-50 hover:text-teal-700 hover:border-teal-100 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Ghost size={14} />
                    Ghost Mode
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Org Modal */}
        {isAddingOrg && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Provision Client</h3>
                  <p className="text-xs text-white/60 font-medium">Create a new organization node in the mesh.</p>
                </div>
                <button onClick={() => setIsAddingOrg(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    placeholder="e.g. ModernQure LLC"
                    value={newOrg.name}
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unique URL Slug</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                    placeholder="e.g. modernqure"
                    value={newOrg.slug}
                    onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Limit</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                      value={newOrg.max_facilities}
                      onChange={e => setNewOrg({...newOrg, max_facilities: parseInt(e.target.value)})}
                    >
                      <option value={1}>1 Facility</option>
                      <option value={2}>2 Facilities</option>
                      <option value={3}>3 Facilities (Standard)</option>
                      <option value={5}>5 Facilities</option>
                      <option value={10}>10 Facilities</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Email</label>
                    <input 
                      type="email"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-teal-500"
                      value={newOrg.contact_email}
                      onChange={e => setNewOrg({...newOrg, contact_email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                  <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                  <p className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                    This action creates a new isolated organization. You will need to manually provision the initial Admin/Manager account for this organization.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                  INITIALIZE INFRASTRUCTURE
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

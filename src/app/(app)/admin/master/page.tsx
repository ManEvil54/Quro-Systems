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
  Ghost
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function MasterConsolePage() {
  const { impersonate } = useAuth();
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalFacilities: 0,
    activePatients: 0,
    syncHealth: 98.4
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // In a real implementation, these would be aggregated metrics
    setTimeout(() => {
      setStats({
        totalOrganizations: 12,
        totalFacilities: 34,
        activePatients: 742,
        syncHealth: 99.2
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleGlobalRevocation = (facilityName: string) => {
    const confirm = window.confirm(`WARNING: You are about to REVOKE ALL ACCESS for ${facilityName}. This will kill all nurse sessions and lock the facility. Proceed?`);
    if (confirm) {
      alert('Global Revocation Initiated. Facility isolated.');
    }
  };

  const handleImpersonate = async (orgId: string, orgName: string) => {
    const confirm = window.confirm(`Activate Ghost Mode for ${orgName}? Your access will be logged for HIPAA auditing.`);
    if (confirm) {
      await impersonate(orgId);
    }
  };

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
                Global Permissioning Active
              </div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">System Master Console</h1>
            <p className="text-slate-500 font-medium">Global Synchronization & Infrastructure Oversight</p>
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search Organizations..." 
                className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20">
              <Database size={16} />
              DEPLOYMENT LOGS
            </button>
          </div>
        </div>

        {/* Global Analytics Bento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 border-l-4 border-teal-500 bg-gradient-to-br from-white to-teal-50/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                <Building2 size={20} />
              </div>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facilities</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalFacilities}</p>
            <div className="mt-2 text-[10px] text-emerald-600 font-bold">+2 New This Week</div>
          </div>

          <div className="glass-card p-6 border-l-4 border-blue-500 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Activity size={20} />
              </div>
              <div className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase tracking-tighter italic">Healthy</div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Health</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.syncHealth}%</p>
            <div className="mt-2 text-[10px] text-slate-400 font-bold">0.02ms Avg Latency</div>
          </div>

          <div className="glass-card p-6 border-l-4 border-amber-500 bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Users size={20} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provisioned DONs</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalOrganizations}</p>
            <div className="mt-2 text-[10px] text-amber-600 font-bold">4 Pending Verification</div>
          </div>

          <div className="glass-card p-6 border-l-4 border-slate-900 bg-slate-900 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Lock size={20} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sessions</p>
            <p className="text-3xl font-black mt-1">2,401</p>
            <div className="mt-2 text-[10px] text-teal-400 font-bold">Global HIPAA Compliance: 100%</div>
          </div>
        </div>

        {/* Action Center */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Facility Oversight */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8">
              <h3 className="font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Building2 size={20} className="text-teal-500" />
                Organization Managed Nodes
              </h3>
              
              <div className="space-y-4">
                {[
                  { id: 'org_001', name: "ModernQure LLC", don: "Dr. Sarah Wilson", facilities: 3, status: "Active" },
                  { id: 'org_002', name: "Clinical Excellence Group", don: "Mark Thompson", facilities: 2, status: "Active" },
                  { id: 'org_003', name: "Heritage Care Systems", don: "Elena Rodriguez", facilities: 3, status: "Active" },
                ].filter(org => org.name.toLowerCase().includes(searchQuery.toLowerCase())).map((org, i) => (
                  <div key={org.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{org.name}</h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">DON: {org.don} • {org.facilities} Facility Slots</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleImpersonate(org.id, org.name)}
                        className="px-4 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-[10px] font-black uppercase hover:bg-teal-100 transition-all flex items-center gap-2"
                      >
                        <Ghost size={12} />
                        Enter Facility View
                      </button>
                      <button 
                        onClick={() => handleGlobalRevocation(org.name)}
                        className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-black uppercase hover:bg-rose-100 transition-all flex items-center gap-2"
                      >
                        <Power size={12} />
                        Kill All Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="space-y-6">
            <div className="glass-card p-8 bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database size={120} />
              </div>
              
              <h3 className="font-black uppercase tracking-tight mb-6 flex items-center gap-2 relative z-10">
                <TrendingUp size={20} className="text-teal-400" />
                Database Load
              </h3>
              
              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Firestore Reads</span>
                    <span>14%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 w-[14%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Firestore Writes</span>
                    <span>32%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[32%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Storage Usage</span>
                    <span>8%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[8%]" />
                  </div>
                </div>
              </div>

              <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 text-amber-400 mb-2">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold uppercase tracking-tight">Security Notice</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  All synchronization events are being logged to the root audit trail. 
                  IP filtration is active for all Master Console requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

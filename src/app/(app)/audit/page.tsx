// ============================================================
// Quro — HIPAA Audit Trail
// Secure logging viewer for administrators
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Eye, 
  Download,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AuditTrailPage() {
  const { staff } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staff?.org_id) return;

    const auditRef = collection(db, 'organizations', staff.org_id, 'audit_log');
    const q = query(auditRef, orderBy('created_at', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="animate-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">HIPAA Audit Trail</h1>
            <p className="text-sm text-slate-500 mt-1">Global activity log for compliance monitoring.</p>
          </div>
          <button className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by User ID or Resource..." className="input pl-10 py-2 text-sm" />
          </div>
          <button className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
            <Filter size={16} />
            <span>Filters</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
            <Calendar size={14} />
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Audit Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Synchronizing audit logs...</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {log.created_at?.toDate().toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                          <User size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{log.user_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        log.action === 'view' ? 'bg-blue-50 text-blue-600' :
                        log.action === 'delete' ? 'bg-red-50 text-red-600' :
                        'bg-teal-50 text-teal-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-500 uppercase tracking-tight">
                      {log.resource_type} ({log.resource_id?.slice(0, 6)}...)
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      {log.description}
                    </td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No activity logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Summary Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">HIPAA Compliance</p>
              <p className="text-sm font-bold text-slate-900">Full Encryption (AES-256)</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Privacy Officer</p>
              <p className="text-sm font-bold text-slate-900">ModernQure Compliance Team</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4 border-dashed">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Retention</p>
              <p className="text-sm font-bold text-slate-900">7 Years (Immutable)</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

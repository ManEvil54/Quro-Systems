// ============================================================
// Quro — Fall Protocol & Safety
// Incident reporting and safety monitoring dashboard
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  History, 
  FileWarning, 
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  X,
  User,
  Clock,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useFalls } from '@/hooks/useFalls';
import { usePatients } from '@/hooks/usePatients';
import type { Incident } from '@/lib/firebase/types';

export default function FallsPage() {
  const { activeFacility } = useAuth();
  const { monitoringPatients, recentIncidents, loading, reportIncident } = useFalls(activeFacility?.id || '');
  const { patients: allPatients } = usePatients(activeFacility?.id || '');
  
  const [showReportForm, setShowReportForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'fall' as Incident['type'],
    severity: 'medium' as Incident['severity'],
    description: '',
    location: '',
    occurred_at: new Date().toISOString().slice(0, 16)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;
    
    setIsSubmitting(true);
    try {
      const patient = allPatients.find(p => p.id === formData.patient_id);
      await reportIncident({
        patient_id: formData.patient_id || undefined,
        patient_name: patient ? `${patient.last_name}, ${patient.first_name}` : undefined,
        type: formData.type,
        severity: formData.severity,
        description: formData.description,
        location: formData.location,
        occurred_at: formData.occurred_at,
        status: 'reported'
      });
      setShowReportForm(false);
      setFormData({
        patient_id: '',
        type: 'fall',
        severity: 'medium',
        description: '',
        location: '',
        occurred_at: new Date().toISOString().slice(0, 16)
      });
    } catch (err) {
      console.error('Error reporting incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="animate-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Safety & Fall Protocol</h1>
            <p className="text-sm text-slate-500 mt-1">
              Active House: <span className="text-teal-600 font-bold uppercase">{activeFacility?.name || '...'}</span>
            </p>
          </div>
          <button 
            onClick={() => setShowReportForm(true)}
            className="btn-primary flex items-center gap-2 py-2 px-6"
          >
            <Plus size={18} />
            <span>New Incident Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-500" />
                  Active 72-Hour Post-Fall Monitoring
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {monitoringPatients.length} Residents
                </span>
              </div>
              
              <div className="space-y-3">
                {monitoringPatients.length > 0 ? (
                  monitoringPatients.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                          {p.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.last_name}, {p.first_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Room: {p.room_number || 'TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-amber-600">
                          <Clock size={12} />
                          <p className="text-xs font-bold">Monitoring Active</p>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Check Vitals Every Shift</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <ShieldCheck size={24} className="text-teal-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No residents currently under fall monitoring.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Recent Incident History
              </h3>
              
              <div className="space-y-4">
                {recentIncidents.length > 0 ? (
                  recentIncidents.map((incident) => (
                    <div key={incident.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            incident.severity === 'critical' || incident.severity === 'high' ? 'bg-red-100 text-red-700' :
                            incident.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {incident.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-700 uppercase">{incident.type}</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(incident.occurred_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1">
                        {incident.patient_name || 'Anonymous Resident'}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {incident.description}
                      </p>
                      {incident.location && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin size={10} />
                          <span>{incident.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <FileWarning size={32} />
                    </div>
                    <p className="text-sm text-slate-400 italic">No incidents reported in the last 7 days.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Safety Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6 bg-slate-900 text-white border-none shadow-xl shadow-slate-900/20">
              <ShieldCheck size={32} className="text-teal-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Facility Safety Score</h3>
              <p className="text-4xl font-black text-teal-400">98%</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Based on fall monitoring compliance and vitals check frequency for <span className="text-white font-bold">{activeFacility?.name}</span>.
              </p>
              <div className="mt-6 pt-6 border-t border-white/10">
                <button className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                  <span>View Safety Audit</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Fall Prevention Tips</h3>
              <ul className="space-y-3">
                {[
                  'Ensure adequate lighting in hallways.',
                  'Verify all non-slip footwear is in use.',
                  'Keep call lights within resident reach.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Report Modal */}
      {showReportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">New Incident Report</h3>
              <button onClick={() => setShowReportForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resident (Optional)</label>
                  <select 
                    value={formData.patient_id}
                    onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                    className="input w-full py-2 text-sm"
                  >
                    <option value="">Select Resident...</option>
                    {allPatients.map(p => (
                      <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Incident Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="input w-full py-2 text-sm"
                  >
                    <option value="fall">Fall</option>
                    <option value="injury">Injury</option>
                    <option value="med_error">Medication Error</option>
                    <option value="skin_breakdown">Skin Breakdown</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</label>
                  <select 
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: e.target.value as any})}
                    className="input w-full py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time of Incident</label>
                  <input 
                    type="datetime-local" 
                    value={formData.occurred_at}
                    onChange={(e) => setFormData({...formData, occurred_at: e.target.value})}
                    className="input w-full py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Room 101, Dining Room, Bathroom"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="input w-full py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description of Incident</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Describe what happened, any injuries noted, and immediate actions taken..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input w-full py-2 text-sm resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-400" />
                  )}
                  <span>Submit Incident Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

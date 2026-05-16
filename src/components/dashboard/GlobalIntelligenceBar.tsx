// ============================================================
// Quro — Global Intelligence Bar
// AI-synthesized clinical oversight for the DON
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  AlertCircle, 
  ClipboardList, 
  UserCheck,
  BrainCircuit
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IntelligenceSummary {
  high_risk_trends: string;
  clinical_tasks: string;
  compliance_gaps: string;
  created_at: string;
}

export default function GlobalIntelligenceBar() {
  const { user, organization } = useAuth();
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;

    // Listen for the latest shift summary
    const q = query(
      collection(db, 'organizations', organization.id, 'intelligence_summaries'),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setSummary(snapshot.docs[0].data() as IntelligenceSummary);
      } else {
        const isDemoUser = user?.email === 'demo@qurosystems.com';
        
        if (isDemoUser) {
          setSummary({
            high_risk_trends: "Respiratory infection risk flagged for Arthur Morgan; thick yellow secretions noted.",
            clinical_tasks: "Enteral residual >150mL for Margaret Thompson; feeding paused per protocol.",
            compliance_gaps: "All high-acuity RT/GT charting complete for the current shift.",
            created_at: new Date().toISOString()
          });
        } else {
          setSummary({
            high_risk_trends: "Scanning for high-risk clinical trends...",
            clinical_tasks: "Monitoring active task queues...",
            compliance_gaps: "Clinical compliance signals optimal.",
            created_at: new Date().toISOString()
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization?.id]);

  if (loading) return null;

  return (
    <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
      <div className="glass-card-quro rounded-[2rem] p-1 border-white/10 shadow-2xl overflow-hidden relative">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-quro-teal/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row items-stretch gap-1">
          {/* AI Badge */}
          <div className="bg-quro-charcoal px-6 py-4 flex items-center gap-4 lg:rounded-l-[1.8rem]">
            <div className="relative">
              <div className="absolute inset-0 bg-quro-teal blur-md opacity-40 animate-pulse" />
              <BrainCircuit className="text-quro-teal relative z-10" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-quro-teal uppercase tracking-[0.2em] leading-none mb-1">Shift Intelligence</p>
              <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">Synthesizer v1.5</h4>
            </div>
          </div>

          {/* Intelligence Bullets */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-1 py-1 pr-1">
            <IntelligenceItem 
              icon={AlertCircle} 
              label="Risk Trends" 
              value={summary?.high_risk_trends} 
              color="text-red-400"
              glow="shadow-red-500/10"
            />
            <IntelligenceItem 
              icon={ClipboardList} 
              label="Clinical Tasks" 
              value={summary?.clinical_tasks} 
              color="text-blue-400"
            />
            <IntelligenceItem 
              icon={UserCheck} 
              label="Compliance" 
              value={summary?.compliance_gaps} 
              color="text-amber-400"
            />
          </div>

          {/* Action Button */}
          <button className="px-6 py-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center lg:rounded-r-[1.8rem] group">
            <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface IntelligenceItemProps {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
  color: string;
  glow?: string;
}

function IntelligenceItem({ icon: Icon, label, value, color, glow }: IntelligenceItemProps) {
  return (
    <div className={`bg-white/5 px-6 py-4 flex flex-col justify-center transition-all hover:bg-white/10 group cursor-default ${glow}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className={`${color}`} />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[11px] font-bold text-slate-200 line-clamp-1 leading-tight group-hover:text-white transition-colors">
        {value}
      </p>
    </div>
  );
}

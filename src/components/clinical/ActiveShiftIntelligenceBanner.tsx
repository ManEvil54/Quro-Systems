"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, AlertCircle, Activity, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

interface BannerProps {
  facilityId: string;
  organizationId?: string;
}

interface BriefingData {
  summaryText: string;
  generatedAt: any;
  shiftDuration: "8hr" | "12hr" | "8-Hour" | "12-Hour";
}

export default function ActiveShiftIntelligenceBanner({ facilityId, organizationId }: BannerProps) {
  const { organization } = useAuth();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const orgId = organizationId || organization?.id;

  useEffect(() => {
    if (!orgId || !facilityId) {
      setLoading(false);
      return;
    }

    // Subscribe to the real-time active briefing document for this specific facility nested under multi-tenant path
    const docRef = doc(db, "organizations", orgId, "facilities", facilityId, "shift_briefings", "active_briefing");
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBriefing({
          summaryText: data.summaryText || data.summary || "",
          generatedAt: data.generatedAt || data.created_at || null,
          shiftDuration: data.shiftDuration || data.shift_type || "8hr"
        } as BriefingData);
      } else {
        setBriefing(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching active shift intelligence:", error);
      setLoading(false);
    });

    // Cleanup subscription on component unmount to prevent memory leaks (RAM Optimization)
    return () => unsubscribe();
  }, [orgId, facilityId]);

  if (loading) {
    return (
      <div className="w-full bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-[2.5rem] p-8 animate-pulse h-32 mb-10" />
    );
  }

  if (!briefing || !briefing.summaryText) return null;

  // Format the time the AI compiled the synthesis
  let generationTime = "07:00";
  try {
    if (briefing.generatedAt) {
      const date = typeof briefing.generatedAt.toDate === "function" 
        ? briefing.generatedAt.toDate() 
        : new Date(briefing.generatedAt);
      
      if (!isNaN(date.getTime())) {
        generationTime = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }
  } catch (e) {
    console.error("Error formatting generation time:", e);
  }

  // Parse briefing summary into bullets
  const parseBullets = (summaryText: string) => {
    if (!summaryText) return [];
    return summaryText
      .split(/\n+/)
      .map(line => line.replace(/^[\s*\-•\d.]+\s*/, "").trim())
      .filter(line => line.length > 0)
      .slice(0, 3);
  };

  const bullets = parseBullets(briefing.summaryText);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-950/20 mb-10 overflow-hidden transition-all duration-300 relative">
      {/* Ambient gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between bg-slate-950/50 px-8 py-5 border-b border-white/5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10 border border-teal-500/30">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">
                Active Shift Intelligence
              </h2>
            </div>
            <h3 className="text-xs font-black uppercase tracking-tight text-slate-300 mt-0.5">
              Generated at {generationTime} ({briefing.shiftDuration} Window)
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white px-4 py-2 bg-white/5 border border-white/10 rounded-xl transition-all duration-200"
        >
          <span>{isCollapsed ? "Expand Briefing" : "Collapse"}</span>
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Briefing Body Container */}
      {!isCollapsed && (
        <div className="relative z-10 p-8 md:p-10 text-white animate-in fade-in slide-in-from-top-4 duration-300">
          {bullets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bullets.map((bullet, idx) => {
                const cardConfig = [
                  {
                    icon: <AlertCircle className="text-rose-400" size={18} />,
                    bg: "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20",
                    title: "Critical Alerts & Safety"
                  },
                  {
                    icon: <Activity className="text-amber-400" size={18} />,
                    bg: "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20",
                    title: "Vital Activity & Monitoring"
                  },
                  {
                    icon: <ClipboardCheck className="text-emerald-400" size={18} />,
                    bg: "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20",
                    title: "Task & Routine Compliance"
                  }
                ][idx] || {
                  icon: <Sparkles className="text-teal-400" size={18} />,
                  bg: "bg-teal-500/5 border-teal-500/10 hover:border-teal-500/20",
                  title: "Clinical Summary"
                };

                return (
                  <div 
                    key={idx} 
                    className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${cardConfig.bg} group/item hover:translate-y-[-2px]`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-white/5">
                          {cardConfig.icon}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                          {cardConfig.title}
                        </span>
                      </div>
                      <p className="text-xs font-bold leading-relaxed text-slate-100">
                        {bullet}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <p className="text-xs text-slate-300 font-bold leading-relaxed whitespace-pre-line italic">
                {briefing.summaryText}
              </p>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-black tracking-widest uppercase">
            <span>Target Node: {facilityId}</span>
            <span>All incoming staff must review prior to physical shift handover check-in.</span>
          </div>
        </div>
      )}
    </div>
  );
}

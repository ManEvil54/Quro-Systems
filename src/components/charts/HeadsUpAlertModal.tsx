"use client";

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface HeadsUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  orgId: string;
  currentStaff: { id: string; name: string };
}

// Structured compliance presets to completely eliminate clinical typing fatigue
const QUICK_ALERT_PRESETS = [
  { label: "-- Select Quick Preset --", value: "" },
  { label: "🫁 Increased Respiratory Secretions / Mucus Plugs", value: "Increased respiratory secretions noted. Required aggressive trach suctioning this shift." },
  { label: "🩸 Labile Blood Pressures / Hemodynamic Changes", value: "Blood pressure fluctuating outside baseline parameters. Monitor vitals closely before next med pass." },
  { label: "🥗 Poor Meal Intake / Refusal to Eat", value: "Resident refused meals or consumed less than 25%. Monitor fluid intake and check blood glucose levels." },
  { label: "🧠 Altered Mental Status / Sudden Agitation", value: "Acute change in mental status noted. Increased confusion or combative behavior observed during care." },
  { label: "📉 Low O2 Saturation / Desaturating on Room Air", value: "O2 saturation dipping below 92% during minor exertion. Evaluated respiratory status and titrated as ordered." },
  { label: "🦼 High Fall Risk / Unsafe Transfers Attempted", value: "Resident attempting unassisted transfers repeatedly. High fall risk during shift turnaround." }
];

export default function HeadsUpAlertModal({ isOpen, onClose, patientId, orgId, currentStaff }: HeadsUpModalProps) {
  const [alertType, setAlertType] = useState<"respiratory" | "vitals" | "behavior" | "general">("general");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customText, setCustomText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPreset(val);
    
    // Automatically match alert type category based on selection keywords
    if (val.includes("Suction") || val.includes("O2") || val.includes("respiratory")) setAlertType("respiratory");
    else if (val.includes("Pressure") || val.includes("vitals")) setAlertType("vitals");
    else if (val.includes("Mental") || val.includes("behavior") || val.includes("combative")) setAlertType("behavior");
    else setAlertType("general");

    // Populate text box with clinical preset
    setCustomText(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    setIsSubmitting(true);

    try {
      const alertsRef = collection(db, "organizations", orgId, "patients", patientId, "patient_alerts");
      
      await addDoc(alertsRef, {
        source: "staff",
        alert_type: alertType,
        text: customText.trim(),
        status: "active", // Active means it will be grabbed by the AI handoff parser
        created_by: {
          id: currentStaff.id,
          name: currentStaff.name
        },
        created_at: serverTimestamp()
      });

      // Clear layout state and exit
      setCustomText("");
      setSelectedPreset("");
      onClose();
    } catch (err) {
      console.error("Failed to post shift alert handshake:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Amber Alert Accent Header */}
        <div className="bg-amber-50 border-b border-amber-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-amber-900 uppercase">Patient Heads-Up / Alert</h3>
              <p className="text-xs text-amber-700/80 font-light">Directly feeds the Vertex AI Shift Handover brief.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-amber-900/40 hover:text-amber-900 text-xs font-mono p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Preset Selector Group */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Clinical Observation Presets</label>
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-amber-500 text-slate-700 transition-colors"
            >
              {QUICK_ALERT_PRESETS.map((p, idx) => (
                <option key={idx} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Core Mapping Selector Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Handoff Category</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-amber-500 text-slate-700 transition-colors"
              >
                <option value="general">General Ops</option>
                <option value="respiratory">Respiratory (Vent/Trach)</option>
                <option value="vitals">Vitals / Labs</option>
                <option value="behavior">Behavior / Neuro</option>
              </select>
            </div>
            
            <div className="flex flex-col justify-end text-right font-mono text-[10px] text-slate-400 pb-3">
              Auth: {currentStaff.name.split(',')[0]}
            </div>
          </div>

          {/* Custom Narrative Entry Field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Shift Handover Dispatch Note</label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Provide exact narrative observations or actions taken for incoming shift visibility..."
              className="w-full bg-white border border-slate-200 text-xs rounded-xl px-4 py-3 h-28 outline-none focus:border-amber-500 text-slate-800 transition-colors resize-none leading-relaxed"
              required
            />
          </div>

          {/* Form Action Controls Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-semibold px-5 py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-md shadow-amber-500/10 transition-all active:scale-95"
            >
              {isSubmitting ? "Syncing Dispatch..." : "Commit To Next Shift"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

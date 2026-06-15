'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  Square, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  FileSignature, 
  Loader2, 
  AlertTriangle, 
  ShieldCheck,
  Lock,
  Archive,
  Info,
  Activity,
  Wind,
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCarePlan } from '@/hooks/useCarePlan';
import type { Patient, CarePlan, CarePlanCard, Medication } from '@/lib/firebase/types';

export const CARE_PLAN_THEME_MAP: Record<string, { icon: any, colorClass: string, bgClass: string }> = {
  psychotropic: { icon: ShieldCheck, colorClass: "text-purple-600", bgClass: "bg-purple-50 border-purple-200" },
  "nutrition-weight": { icon: Activity, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-200" },
  "fall-risk": { icon: AlertTriangle, colorClass: "text-orange-600", bgClass: "bg-orange-50 border-orange-200" },
  cognitive: { icon: Info, colorClass: "text-indigo-600", bgClass: "bg-indigo-50 border-indigo-200" },
  respiratory: { icon: Wind, colorClass: "text-blue-600", bgClass: "bg-blue-50 border-blue-200" },
  skin: { icon: Activity, colorClass: "text-amber-600", bgClass: "bg-amber-50 border-amber-200" },
  adl: { icon: Heart, colorClass: "text-rose-600", bgClass: "bg-rose-50 border-rose-200" },
  fallback: { icon: Heart, colorClass: "text-rose-600", bgClass: "bg-rose-50 border-rose-200" }
};

// Speech Recognition types for TS
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  start: () => void;
  stop: () => void;
}

interface CarePlanManagerProps {
  patient: Patient;
  medications: Medication[];
}

export default function CarePlanManager({ patient, medications }: CarePlanManagerProps) {
  const { staff } = useAuth();
  const { 
    carePlan, 
    history,
    loading: carePlanLoading, 
    error: carePlanError,
    generateCarePlanAI, 
    saveDraft, 
    approveAndSign, 
    archivePlan,
    revisePlan
  } = useCarePlan(patient.id);

  // Revision & Archive states
  const [selectedArchivePlan, setSelectedArchivePlan] = useState<CarePlan | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [revisingState, setRevisingState] = useState(false);

  // AI Intake configuration states
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState('');
  const [selectedBaselines, setSelectedBaselines] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIIntakeDrawer, setShowAIIntakeDrawer] = useState(false);

  // Care Plan edit state (for draft mode)
  const [editedCards, setEditedCards] = useState<CarePlanCard[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingState, setSavingState] = useState(false);

  // Sign-off modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [nurseSignature, setNurseSignature] = useState('');
  const [nurseCredential, setNurseCredential] = useState('RN');
  const [signingState, setSigningState] = useState(false);

  // Dictation States
  const [isDictating, setIsDictating] = useState(false);
  const [dictatingTarget, setDictatingTarget] = useState<{
    cardId: string;
    fieldType: 'problem_statement' | 'goals' | 'interventions';
    index?: number;
  } | null>(null);
  const [dictatedText, setDictatedText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Pre-fill fields when active patient / diagnoses change
  useEffect(() => {
    if (patient.diagnoses && patient.diagnoses.length > 0) {
      setConfirmedDiagnosis(patient.diagnoses[0]);
    }
  }, [patient]);

  // Synchronize component state with carePlan from Firestore
  useEffect(() => {
    if (carePlan) {
      setEditedCards(JSON.parse(JSON.stringify(carePlan.cards)));
      setHasUnsavedChanges(false);
    } else {
      setEditedCards([]);
    }
  }, [carePlan]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setDictatedText(text);
      };

      recognition.onerror = (err: { error: string }) => {
        console.error('Speech recognition error:', err.error);
        setIsDictating(false);
        setDictatingTarget(null);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleBaselineToggle = (id: string) => {
    setSelectedBaselines(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleTriggerAIGeneration = async () => {
    setIsGenerating(true);
    try {
      const cards = await generateCarePlanAI(patient, confirmedDiagnosis, selectedBaselines, customNotes, medications);
      await saveDraft(cards);
      setShowAIIntakeDrawer(false);
      alert('AI Preliminary Care Plan generated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate Care Plan: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Card text update handlers
  const handleUpdateProblemStatement = (cardId: string, text: string) => {
    setEditedCards(prev => prev.map(c => c.id === cardId ? { ...c, focus: text, problem_statement: text } : c));
    setHasUnsavedChanges(true);
  };

  const handleUpdateSchedule = (cardId: string, text: string) => {
    setEditedCards(prev => prev.map(c => c.id === cardId ? { ...c, schedule: text } : c));
    setHasUnsavedChanges(true);
  };

  const handleUpdateGoal = (cardId: string, goalIndex: number, text: string) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const updatedGoals = [...c.goals];
        const currentGoal = updatedGoals[goalIndex];
        if (typeof currentGoal === 'object' && currentGoal !== null) {
          updatedGoals[goalIndex] = { ...currentGoal, text };
        } else {
          updatedGoals[goalIndex] = text as any;
        }
        return { ...c, goals: updatedGoals };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddGoal = (cardId: string) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const hasStructured = c.goals.length > 0 && typeof c.goals[0] === 'object';
        const targetDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const newGoal = hasStructured 
          ? { text: 'New measurable outcome goal (SMART)...', target_date: targetDate }
          : 'New measurable outcome goal (SMART)...';
        return { ...c, goals: [...c.goals, newGoal as any] };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteGoal = (cardId: string, goalIndex: number) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return { ...c, goals: c.goals.filter((_, i) => i !== goalIndex) };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateIntervention = (cardId: string, intIndex: number, text: string) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const updatedInts = [...c.interventions];
        const currentInt = updatedInts[intIndex];
        if (typeof currentInt === 'object' && currentInt !== null) {
          updatedInts[intIndex] = { ...currentInt, text };
        } else {
          updatedInts[intIndex] = text as any;
        }
        return { ...c, interventions: updatedInts };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddIntervention = (cardId: string) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const hasStructured = c.interventions.length > 0 && typeof c.interventions[0] === 'object';
        const category = c.category || c.id;
        const discipline = category === 'adl' || category === 'adl-function' ? 'CNA' : 'Nursing';
        const newInt = hasStructured
          ? { text: 'New clinical intervention...', discipline }
          : 'New clinical intervention...';
        return { ...c, interventions: [...c.interventions, newInt as any] };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteIntervention = (cardId: string, intIndex: number) => {
    setEditedCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return { ...c, interventions: c.interventions.filter((_, i) => i !== intIndex) };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveDraftChanges = async () => {
    setSavingState(true);
    try {
      await saveDraft(editedCards);
      setHasUnsavedChanges(false);
      alert('Draft saved.');
    } catch (err) {
      console.error(err);
      alert('Failed to save draft changes.');
    } finally {
      setSavingState(false);
    }
  };

  const handleOpenSignModal = () => {
    if (staff) {
      setNurseSignature(`${staff.first_name} ${staff.last_name}`);
    }
    setShowSignModal(true);
  };

  const handleApproveAndSign = async () => {
    if (!carePlan?.id || !nurseSignature.trim()) return;
    setSigningState(true);
    try {
      const fullSignature = `${nurseSignature}, ${nurseCredential}`;
      await approveAndSign(carePlan.id, editedCards, fullSignature, carePlan.parent_plan_id);
      setShowSignModal(false);
      setHasUnsavedChanges(false);
      alert('Care Plan approved and committed to official clinical chart.');
    } catch (err) {
      console.error(err);
      alert('Failed to sign Care Plan.');
    } finally {
      setSigningState(false);
    }
  };

  const handleTriggerRevision = async () => {
    if (!carePlan) return;
    if (!confirm('Are you sure you want to revise this active signed care plan? This will spawn a new draft version for your edits, while the current active version remains live until the new revision is signed.')) return;
    
    setRevisingState(true);
    try {
      await revisePlan(carePlan);
      alert('New Care Plan revision draft spawned. You can now edit goals, interventions, or schedule, and attest to sign it.');
    } catch (err) {
      console.error('Failed to revise care plan:', err);
      alert('Failed to spawn new care plan revision.');
    } finally {
      setRevisingState(false);
    }
  };

  const handleArchivePlan = async () => {
    if (!carePlan?.id) return;
    if (!confirm('Are you sure you want to archive and discontinue this care plan? This action is permanent.')) return;
    
    try {
      await archivePlan(carePlan.id);
      alert('Care Plan has been archived.');
    } catch (err) {
      console.error(err);
      alert('Failed to archive care plan.');
    }
  };

  // Voice Dictation triggers
  const startDictating = (
    cardId: string,
    fieldType: 'problem_statement' | 'goals' | 'interventions',
    index?: number
  ) => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    setDictatingTarget({ cardId, fieldType, index });
    setDictatedText('');
    setIsDictating(true);
    recognitionRef.current.start();
  };

  const stopDictatingAndApply = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsDictating(false);

    if (!dictatingTarget || !dictatedText.trim()) {
      setDictatingTarget(null);
      return;
    }

    const { cardId, fieldType, index } = dictatingTarget;
    const spoken = dictatedText.trim();

    if (fieldType === 'problem_statement') {
      handleUpdateProblemStatement(cardId, spoken);
    } else if (fieldType === 'goals' && index !== undefined) {
      handleUpdateGoal(cardId, index, spoken);
    } else if (fieldType === 'interventions' && index !== undefined) {
      // Get current value and append
      const card = editedCards.find(c => c.id === cardId);
      const targetInt = card?.interventions[index];
      const currentVal = targetInt 
        ? (typeof targetInt === 'string' ? targetInt : targetInt.text) 
        : '';
      const cleanVal = currentVal.includes('New clinical intervention') ? '' : currentVal;
      const newVal = cleanVal ? `${cleanVal} ${spoken}` : spoken;
      handleUpdateIntervention(cardId, index, newVal);
    }

    setDictatingTarget(null);
    setDictatedText('');
  };

  if (carePlanLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 border-4 border-slate-200 border-t-quro-teal rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Accessing Care Plan Subsystem...</p>
      </div>
    );
  }

  // Baseline Checklist Options
  const BASELINE_OPTIONS = [
    { id: 'ventilator', label: 'Ventilator-Dependent (High Airway/Ventilation Risk)' },
    { id: 'trach', label: 'Tracheostomy (High Secretion/Decannulating Risk)' },
    { id: 'skin_risk', label: 'Skin Breakdown History (Stage 1-4, High Ulcer Risk)' },
    { id: 'dysphagia', label: 'Severe Dysphagia (High Aspiration/Choking Risk)' },
    { id: 'brain_injury', label: 'Spinal Cord or Traumatic Brain Injury (High Mobility/Contracture Risk)' },
    { id: 'neuromuscular', label: 'Neuromuscular Disorder (High Weakness/Atrophy Risk)' },
    { id: 'fall_risk', label: 'High Fall Risk (High Hazard/Fracture Risk)' },
  ];

  return (
    <div className="space-y-8 relative">
      {/* 1. INTRO / NO CARE PLAN STATE */}
      {!carePlan && !showAIIntakeDrawer && (
        <div className="glass-card p-12 bg-white border border-slate-100 rounded-[2.5rem] text-center max-w-2xl mx-auto py-16 animate-in fade-in">
          <div className="w-20 h-20 bg-slate-50 text-slate-900 border border-slate-100 flex items-center justify-center rounded-[2rem] mx-auto mb-8 shadow-xl shadow-slate-200/50">
            <Sparkles size={36} className="text-slate-900" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">No Active Care Plan Found</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md mx-auto mb-8">
            Every Congregate Living Health Facility resident requires a customized clinical care plan. Use Quro AI to spin up a compliant draft instantly.
          </p>
          <button
            onClick={() => setShowAIIntakeDrawer(true)}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 mx-auto"
          >
            <Sparkles size={16} />
            Generate Preliminary Care Plan
          </button>
        </div>
      )}

      {/* 2. AI GENERATION CONFIG DRAWER/SECTION */}
      {showAIIntakeDrawer && (
        <div className="glass-card p-10 bg-white border border-slate-200 rounded-[2.5rem] animate-in slide-in-from-top-6 duration-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl">
                <Sparkles size={20} className="text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">Quro AI Care Plan Intake</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Congregate Living Health Facility Protocol</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAIIntakeDrawer(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Admitting Diagnosis</label>
              <input
                type="text"
                value={confirmedDiagnosis}
                onChange={e => setConfirmedDiagnosis(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-quro-teal focus:bg-white transition-all text-sm"
                placeholder="Confirm patient primary diagnosis (e.g. Quadriplegia due to C4 fracture)"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Critical Baseline Clinical Indicators</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BASELINE_OPTIONS.map(opt => {
                  const active = selectedBaselines.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleUpdateProblemStatement} // just dummy to avoid unused variable warnings, we call handleBaselineToggle below
                      type="button"
                      onClickCapture={() => handleBaselineToggle(opt.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border text-left font-bold text-xs uppercase tracking-tight transition-all duration-300 ${
                        active 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <Check size={16} className={`transition-all ${active ? 'opacity-100 scale-100 text-teal-400' : 'opacity-0 scale-50'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nurse Focus Directives & Custom Notes (Optional)</label>
              <textarea
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-quro-teal focus:bg-white transition-all text-sm leading-relaxed"
                placeholder="Enter any custom medical guidelines or clinical objectives (e.g. Sacral pressure sore present; restrict diet to pureed foods due to moderate aspiration risk)."
              />
            </div>

            <div className="flex justify-end gap-4 border-t border-slate-100 pt-8">
              <button
                type="button"
                onClick={() => setShowAIIntakeDrawer(false)}
                className="px-6 py-4 bg-white border border-slate-100 hover:bg-slate-50 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerAIGeneration}
                disabled={isGenerating}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Synthesizing Preliminary Plan...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Synthesize Care Plan via Quro AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE CARE PLAN CONTENT RENDERER */}
      {carePlan && editedCards.length > 0 && (
        <div className="space-y-8 animate-in fade-in">
          {/* Status Header Badge & Signature State Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2rem] text-white">
            <div className="flex items-center gap-4">
              {carePlan.status === 'draft' ? (
                <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">
                  Draft/Preliminary Care Plan Pending Review
                </div>
              ) : (
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Active Signed Clinical Chart
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {carePlan.status === 'draft' && (
                <>
                  <button
                    onClick={handleSaveDraftChanges}
                    disabled={savingState || !hasUnsavedChanges}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white border border-slate-700 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all"
                  >
                    {savingState ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleOpenSignModal}
                    className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-teal-500/20"
                  >
                    <FileSignature size={14} />
                    Approve & Sign
                  </button>
                </>
              )}
              {carePlan.status === 'active' && (
                <>
                  <button
                    onClick={handleTriggerRevision}
                    disabled={revisingState}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white border border-slate-700 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-slate-800/15"
                  >
                    {revisingState ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} className="text-teal-400" />
                    )}
                    <span>{revisingState ? 'Spawning Revision...' : 'Revise Care Plan'}</span>
                  </button>
                  <button
                    onClick={handleArchivePlan}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-rose-500/10"
                  >
                    <Archive size={14} />
                    Discontinue & Archive
                  </button>
                </>
              )}
            </div>
          </div>

          {/* DRAFT WATERMARK CONTAINER */}
          <div className="relative overflow-hidden p-1 rounded-[3rem]">
            {carePlan.status === 'draft' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] z-0">
                <span className="text-[14rem] font-black uppercase tracking-widest rotate-[25deg] whitespace-nowrap">
                  AI PRELIMINARY DRAFT
                </span>
              </div>
            )}

            {/* THREE CARDS RENDERER */}
            <div className="space-y-10 relative z-10">
              {editedCards.map((card) => {
                const category = card.category || card.id;
                const theme = CARE_PLAN_THEME_MAP[category] || CARE_PLAN_THEME_MAP.fallback;
                const IconComponent = theme.icon;
                const isLocked = carePlan.status === 'active';

                return (
                  <div key={card.id} className="glass-card p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/20 animate-in fade-in duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.bgClass} ${theme.colorClass}`}>
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-black uppercase text-slate-900 tracking-tight">{card.title || card.category || card.id}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocol Card</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md tracking-wider">
                          Module: {category}
                        </span>
                      </div>
                    </div>

                    {/* Content Fields */}
                    <div className="space-y-6">
                      {/* Problem Statement */}
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Problem Statement</label>
                        {isLocked ? (
                          <div className="p-4 bg-slate-50/50 rounded-2xl text-slate-700 text-sm font-medium leading-relaxed">
                            {card.focus || card.problem_statement}
                          </div>
                        ) : (
                          <div className="relative">
                            <textarea
                              value={card.focus || card.problem_statement || ''}
                              onChange={e => handleUpdateProblemStatement(card.id, e.target.value)}
                              rows={3}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-quro-teal focus:bg-white transition-all text-sm leading-relaxed"
                            />
                            <button
                              onClick={() => startDictating(card.id, 'problem_statement')}
                              type="button"
                              className="absolute right-4 bottom-4 p-2 bg-slate-900 text-white rounded-xl shadow-md hover:bg-slate-800 transition-all"
                              title="Voice dictate problem statement"
                            >
                              <Mic size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* SMART Goals list */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">SMART Outcome Goals</label>
                          {!isLocked && (
                            <button
                              onClick={() => handleAddGoal(card.id)}
                              type="button"
                              className="flex items-center gap-1 text-[9px] font-black uppercase text-quro-teal tracking-wider"
                            >
                              <Plus size={12} /> Add Goal
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {card.goals.map((goal, idx) => {
                            const goalText = typeof goal === 'string' ? goal : (goal?.text || '');
                            const goalDate = typeof goal === 'string' ? '' : (goal?.target_date || '');

                            return (
                              <div key={idx} className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0" />
                                {isLocked ? (
                                  <div className="flex-1 flex justify-between items-center bg-slate-50/30 p-2 rounded-xl border border-slate-100/30">
                                    <p className="text-sm font-bold text-slate-900">{goalText}</p>
                                    {goalDate && (
                                      <span className="font-mono text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                        Target: {goalDate}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-1 flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={goalText}
                                      onChange={e => handleUpdateGoal(card.id, idx, e.target.value)}
                                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm"
                                    />
                                    {typeof goal !== 'string' && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target:</span>
                                        <input
                                          type="date"
                                          value={goalDate}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setEditedCards(prev => prev.map(c => {
                                              if (c.id === card.id) {
                                                const updatedGoals = [...c.goals];
                                                updatedGoals[idx] = { ...updatedGoals[idx] as any, target_date: val };
                                                return { ...c, goals: updatedGoals };
                                              }
                                              return c;
                                            }));
                                            setHasUnsavedChanges(true);
                                          }}
                                          className="px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-xs font-mono"
                                        />
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleDeleteGoal(card.id, idx)}
                                      type="button"
                                      className="p-3 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interventions list with speech assist */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Direct Clinical Interventions</label>
                          {!isLocked && (
                            <button
                              onClick={() => handleAddIntervention(card.id)}
                              type="button"
                              className="flex items-center gap-1 text-[9px] font-black uppercase text-quro-teal tracking-wider"
                            >
                              <Plus size={12} /> Add Intervention
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          {card.interventions.map((int, idx) => {
                            const intText = typeof int === 'string' ? int : (int?.text || '');
                            const intDiscipline = typeof int === 'string' ? '' : (int?.discipline || '');

                            return (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded bg-quro-teal mt-4 flex-shrink-0" />
                                {isLocked ? (
                                  <div className="flex-1 mt-2 bg-slate-50/30 p-3 rounded-xl border border-slate-100/30">
                                    <p className="text-sm font-bold text-slate-900">{intText}</p>
                                    {intDiscipline && (
                                      <span className="inline-block mt-2 bg-slate-900 text-white font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-md">
                                        {intDiscipline}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-start gap-2 relative">
                                    <div className="flex-1 flex flex-col gap-2">
                                      <textarea
                                        value={intText}
                                        onChange={e => handleUpdateIntervention(card.id, idx, e.target.value)}
                                        rows={2}
                                        className="w-full px-5 py-3 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm leading-relaxed"
                                      />
                                      {typeof int !== 'string' && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Discipline:</span>
                                          <input
                                            type="text"
                                            value={intDiscipline}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setEditedCards(prev => prev.map(c => {
                                                if (c.id === card.id) {
                                                  const updatedInts = [...c.interventions];
                                                  updatedInts[idx] = { ...updatedInts[idx] as any, discipline: val };
                                                  return { ...c, interventions: updatedInts };
                                                }
                                                return c;
                                              }));
                                              setHasUnsavedChanges(true);
                                            }}
                                            className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-900 font-bold text-[10px] font-mono w-32 uppercase"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => startDictating(card.id, 'interventions', idx)}
                                      type="button"
                                      className="absolute right-14 top-3 p-2 bg-slate-950 text-white rounded-lg shadow hover:bg-slate-800 transition-all"
                                      title="Dictate clinical note"
                                    >
                                      <Mic size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteIntervention(card.id, idx)}
                                      type="button"
                                      className="p-3 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 transition-all mt-1"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Intervention Schedule */}
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol Schedule</label>
                        {isLocked ? (
                          <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl text-slate-800 font-black text-[10px] tracking-widest uppercase">
                            {card.schedule || 'Shiftly'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={card.schedule || ''}
                            onChange={e => handleUpdateSchedule(card.id, e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm max-w-xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Disclaimer Guardrail */}
          <div className="flex items-start gap-4 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-slate-400 text-xs font-medium leading-relaxed max-w-3xl mx-auto shadow-sm">
            <Info size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-600 mb-1 uppercase text-[9px] tracking-widest">Clinical AI Safety Directive</p>
              <p>{carePlan.disclaimer}</p>
            </div>
          </div>

          {/* Active Clinical Sign-off Stamp */}
          {carePlan.status === 'active' && (
            <div className="glass-card p-8 bg-emerald-50/20 border border-emerald-100 rounded-[2rem] max-w-xl mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Lock size={18} />
              </div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Approved & Authenticated Chart</p>
              <p className="text-xs font-semibold text-slate-500">
                Electronically signed by <span className="font-bold text-emerald-600">{carePlan.signed_by_name}</span> on {new Date(carePlan.signed_at || '').toLocaleString()}
              </p>
            </div>
          )}

          {/* Collapsible Revision History Ledger */}
          {history.length > 0 && (
            <div className="max-w-3xl mx-auto mt-12 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <button
                type="button"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors cursor-pointer outline-none"
              >
                <div className="flex items-center gap-2">
                  <Archive size={14} className="text-slate-400" />
                  <span>Clinical Care Plan Revision History</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">
                    {history.length} {history.length === 1 ? 'Revision' : 'Revisions'}
                  </span>
                  <span>{showHistoryPanel ? '▲' : '▼'}</span>
                </div>
              </button>

              {showHistoryPanel && (
                <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 animate-in fade-in duration-200">
                  {history.map((hPlan, idx) => (
                    <div key={hPlan.id || idx} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition-all border border-slate-100/50">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-200/60 text-slate-600 flex items-center justify-center font-bold text-xs">
                          R{hPlan.revision || 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Revision #{hPlan.revision || 1} — {hPlan.status === 'superseded' ? 'Superseded' : 'Discontinued/Archived'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Signed by {hPlan.signed_by_name || 'Staff'} on {hPlan.signed_at ? new Date(hPlan.signed_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedArchivePlan(hPlan)}
                        className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        View Archive Card
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. CLINICAL SIGN-OFF MODAL */}
      {showSignModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="w-16 h-16 rounded-[1.5rem] bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
              <FileSignature size={28} />
            </div>

            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Electronic Attestation</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">
              By entering your name and credential, you attest that you have reviewed, edited, and approved the preliminary care plan cards for {patient.first_name} {patient.last_name}.
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Electronic Signature (Full Name)</label>
                <input
                  type="text"
                  value={nurseSignature}
                  onChange={e => setNurseSignature(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-quro-teal focus:bg-white transition-all text-sm"
                  placeholder="Enter your first and last name"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Professional Credential</label>
                <select
                  value={nurseCredential}
                  onChange={e => setNurseCredential(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-quro-teal focus:bg-white transition-all text-sm uppercase"
                >
                  <option value="RN">Registered Nurse (RN)</option>
                  <option value="LVN">Licensed Vocational Nurse (LVN)</option>
                  <option value="NP">Nurse Practitioner (NP)</option>
                  <option value="DON">Director of Nursing (DON)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="flex-1 py-4 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndSign}
                disabled={signingState || !nurseSignature.trim()}
                className="flex-1 py-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-900 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                {signingState ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing Chart...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Attest & Sign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DICTATION ACTIVE DIALOG */}
      {isDictating && dictatingTarget && (
        <div className="fixed bottom-8 right-8 z-50 p-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500 max-w-sm border border-slate-800">
          <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center animate-pulse">
            <Mic size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">AI Voice Dictation Active</p>
            <p className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">
              {dictatedText || 'Speak now...'}
            </p>
          </div>
          <button
            onClick={stopDictatingAndApply}
            className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
            title="Stop & apply voice input"
          >
            <Square size={12} fill="currentColor" />
          </button>
        </div>
      )}

      {/* 6. HISTORICAL ARCHIVE VIEWER MODAL */}
      {selectedArchivePlan && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[1.25rem] bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                  R{selectedArchivePlan.revision || 1}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                    Care Plan Archive (Revision #{selectedArchivePlan.revision || 1})
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Signed by {selectedArchivePlan.signed_by_name} on {selectedArchivePlan.signed_at ? new Date(selectedArchivePlan.signed_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedArchivePlan(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-black uppercase tracking-widest cursor-pointer border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Read-Only Cards Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 py-2">
              <div className="px-4 py-2 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2 max-w-max">
                ⚠️ Locked Historical surveyor Archive (Read-Only)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedArchivePlan.cards.map((card) => {
                  const Icon = card.id === 'respiratory' ? Wind : card.id === 'skin' ? Activity : Heart;
                  return (
                    <div key={card.id} className="border border-slate-100 bg-slate-50/50 p-6 rounded-2xl flex flex-col">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500">
                          <Icon size={16} />
                        </div>
                        <h4 className="text-xs font-black uppercase text-slate-900">{card.title}</h4>
                      </div>
                      
                      <div className="space-y-4 flex-grow text-xs leading-relaxed">
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Problem Statement</span>
                          <p className="text-slate-700 font-medium">{card.problem_statement}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">SMART Goals</span>
                          <ul className="list-disc list-inside space-y-1 text-slate-800 font-semibold">
                            {card.goals.map((goal, i) => {
                              const goalText = typeof goal === 'string' ? goal : (goal?.text || '');
                              const goalDate = typeof goal === 'string' ? '' : (goal?.target_date || '');
                              return (
                                <li key={i}>
                                  {goalText}
                                  {goalDate && <span className="text-[9px] text-slate-400 ml-2">({goalDate})</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Interventions</span>
                          <ul className="list-decimal list-inside space-y-1 text-slate-850 font-medium">
                            {card.interventions.map((int, i) => {
                              const intText = typeof int === 'string' ? int : (int?.text || '');
                              const intDiscipline = typeof int === 'string' ? '' : (int?.discipline || '');
                              return (
                                <li key={i}>
                                  {intText}
                                  {intDiscipline && <span className="text-[8px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-2">{intDiscipline}</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Schedule</span>
                          <span className="inline-block px-2.5 py-1 bg-slate-200 text-slate-700 font-black text-[9px] uppercase rounded">
                            {card.schedule}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-6 mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArchivePlan(null)}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-lg shadow-slate-900/10"
              >
                Close Archive
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

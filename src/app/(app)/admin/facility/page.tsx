// ============================================================
// Quro — Facility Configuration (MAR Template Editor)
// Authority: DON & House Manager
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  GripVertical,
  ClipboardList,
  Stethoscope,
  Activity,
  Droplets,
  Utensils
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateItem {
  id: string;
  label: string;
  category: 'vital' | 'monitoring' | 'treatment' | 'ADL';
  frequency: string;
}

export default function FacilitySettingsPage() {
  const { organization, staff } = useAuth();
  const [template, setTemplate] = useState<TemplateItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilityConfig();
  }, [staff]);

  async function fetchFacilityConfig() {
    if (!staff?.facility_id || !organization) return;
    try {
      const fDoc = await getDoc(doc(db, 'organizations', organization.id, 'facilities', staff.facility_id));
      if (fDoc.exists() && fDoc.data().mar_template) {
        setTemplate(fDoc.data().mar_template);
      } else {
        // Default clinical starting point
        setTemplate([
          { id: 'bm', label: 'Bowel Movement Charting', category: 'ADL', frequency: 'Daily' },
          { id: 'meals', label: 'Meal Consumption %', category: 'ADL', frequency: 'TID' },
          { id: 'pain', label: 'Pain Assessment (0-10)', category: 'vital', frequency: 'qShift' },
          { id: 'foley', label: 'Foley Catheter Care', category: 'treatment', frequency: 'Daily' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching facility config:', err);
    } finally {
      setLoading(false);
    }
  }

  const addItem = () => {
    const newItem: TemplateItem = {
      id: `custom_${Date.now()}`,
      label: '',
      category: 'monitoring',
      frequency: 'qShift'
    };
    setTemplate([...template, newItem]);
  };

  const removeItem = (id: string) => {
    setTemplate(template.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof TemplateItem, value: string) => {
    setTemplate(template.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  async function handleSave() {
    if (!staff?.facility_id || !organization) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'facilities', staff.facility_id), {
        mar_template: template,
        updated_at: new Date().toISOString()
      });
      alert('Facility MAR Template Saved Successfully');
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <div className="p-10 animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading Clinical Config...</div>;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-quro-charcoal uppercase tracking-tight">Facility MAR Template</h1>
          <p className="text-xs text-slate-500 font-medium">Standardize daily charting (BM, Meals, Foley) across this facility.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-quro-teal text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20 disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'SAVING...' : 'SAVE TEMPLATE'}
        </button>
      </div>

      <div className="glass-card p-8 space-y-6 border-2 border-quro-teal/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-quro-teal/10 rounded-xl flex items-center justify-center text-quro-teal">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="font-bold text-quro-charcoal">Clinical Monitoring Grid</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Daily Maintenance & ADLs</p>
          </div>
        </div>

        <div className="space-y-3">
          {template.map((item, index) => (
            <div key={item.id} className="flex gap-3 items-center group animate-in slide-in-from-left-4" style={{ animationDelay: `${index * 50}ms` }}>
              <GripVertical className="text-slate-300 cursor-grab" size={16} />
              
              <div className="flex-1 grid grid-cols-12 gap-3 bg-slate-50 p-2 rounded-xl border border-transparent group-hover:border-slate-200 transition-all">
                <div className="col-span-6">
                  <input 
                    placeholder="Entry Name (e.g. BM Charting)"
                    className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm font-bold text-quro-charcoal outline-none focus:ring-1 ring-quro-teal"
                    value={item.label}
                    onChange={e => updateItem(item.id, 'label', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <select 
                    className="w-full bg-white border-none rounded-lg px-2 py-2 text-[10px] font-black uppercase text-slate-500 outline-none focus:ring-1 ring-quro-teal"
                    value={item.category}
                    onChange={e => updateItem(item.id, 'category', e.target.value as any)}
                  >
                    <option value="ADL">ADL / Care</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="vital">Vitals/Labs</option>
                    <option value="treatment">Treatment</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <select 
                    className="w-full bg-white border-none rounded-lg px-2 py-2 text-[10px] font-black uppercase text-slate-500 outline-none focus:ring-1 ring-quro-teal"
                    value={item.frequency}
                    onChange={e => updateItem(item.id, 'frequency', e.target.value)}
                  >
                    <option value="Daily">Daily</option>
                    <option value="qShift">Every Shift</option>
                    <option value="TID">TID (Meals)</option>
                    <option value="BID">BID</option>
                    <option value="PRN">PRN</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => removeItem(item.id)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={addItem}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold hover:border-quro-teal hover:text-quro-teal transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          ADD CLINICAL MONITORING ROW
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={20} className="text-quro-teal" />
          <h3 className="font-bold uppercase tracking-tight">Template Logic</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">1</div>
              <p className="text-white/60 leading-relaxed">
                <span className="text-white font-bold block mb-1">Facility Inheritance</span>
                Every new patient admitted to this facility will automatically have these rows added to their MAR grid.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">2</div>
              <p className="text-white/60 leading-relaxed">
                <span className="text-white font-bold block mb-1">Dynamic Frequencies</span>
                If you select 'Daily', the MAR will show one box per day. 'qShift' will show 3 boxes (Day/Eve/Night).
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">3</div>
              <p className="text-white/60 leading-relaxed">
                <span className="text-white font-bold block mb-1">Patient Customization</span>
                The DON can still hide specific rows for a patient (e.g. hide Foley Care if the patient doesn't have a catheter).
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">4</div>
              <p className="text-white/60 leading-relaxed">
                <span className="text-white font-bold block mb-1">Audit Ready</span>
                These templates ensure that your facility never misses a mandatory charting item during state inspections.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

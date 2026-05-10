// ============================================================
// Quro — Facility Configuration (MAR Template Editor)
// Authority: DON & House Manager
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Utensils,
  LayoutGrid,
  Bed as BedIcon,
  Home,
  CheckCircle2
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBeds } from '@/hooks/useBeds';

interface TemplateItem {
  id: string;
  label: string;
  category: 'vital' | 'monitoring' | 'treatment' | 'ADL';
  frequency: string;
}

export default function FacilitySettingsPage() {
  const searchParams = useSearchParams();
  const facilityIdParam = searchParams.get('id');
  const { organization, staff } = useAuth();
  
  // Use param if available, otherwise fallback to staff's current facility
  const targetFacilityId = facilityIdParam || staff?.facility_id;
  
  const [activeTab, setActiveTab] = useState<'clinical' | 'beds'>('clinical');
  const [template, setTemplate] = useState<TemplateItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facilityName, setFacilityName] = useState('');

  const { rooms, beds, addRoom, addBed, deleteBed } = useBeds(targetFacilityId || '');

  const [newRoom, setNewRoom] = useState({ name: '', type: 'private' as any });

  useEffect(() => {
    if (targetFacilityId) {
      fetchFacilityConfig();
    }
  }, [targetFacilityId, organization]);

  async function fetchFacilityConfig() {
    if (!targetFacilityId || !organization?.id) return;
    try {
      const fDoc = await getDoc(doc(db, 'organizations', organization.id, 'facilities', targetFacilityId));
      if (fDoc.exists()) {
        const data = fDoc.data();
        setFacilityName(data.name);
        if (data.mar_template) {
          setTemplate(data.mar_template);
        } else {
          setTemplate([
            { id: 'bm', label: 'Bowel Movement Charting', category: 'ADL', frequency: 'Daily' },
            { id: 'meals', label: 'Meal Consumption %', category: 'ADL', frequency: 'TID' },
            { id: 'pain', label: 'Pain Assessment (0-10)', category: 'vital', frequency: 'qShift' },
            { id: 'foley', label: 'Foley Catheter Care', category: 'treatment', frequency: 'Daily' }
          ]);
        }
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
    if (!targetFacilityId || !organization?.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'facilities', targetFacilityId), {
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

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name) return;
    await addRoom(newRoom.name, newRoom.type);
    setNewRoom({ name: '', type: 'private' });
  };

  if (loading) return <div className="p-10 animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading House Node...</div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-quro-teal/10 text-quro-teal rounded text-[10px] font-black uppercase tracking-[0.2em] border border-quro-teal/20">
              Infrastructure Config
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
              Node: {facilityName || 'Unknown House'}
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">House Configuration</h1>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('clinical')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'clinical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Clinical
          </button>
          <button 
            onClick={() => setActiveTab('beds')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'beds' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Beds & Rooms
          </button>
        </div>
      </div>

      {activeTab === 'clinical' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500 font-medium italic">Standardize daily charting (BM, Meals, Foley) across this facility.</p>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'SYNCING...' : 'SAVE TEMPLATE'}
            </button>
          </div>

          <div className="glass-card p-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
              <div className="w-12 h-12 bg-quro-teal/10 rounded-2xl flex items-center justify-center text-quro-teal">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clinical Monitoring Grid</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Dynamic MAR Compliance Table</p>
              </div>
            </div>

            <div className="space-y-4">
              {template.map((item, index) => (
                <div key={item.id} className="flex gap-4 items-center group animate-in slide-in-from-left-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <GripVertical className="text-slate-200 group-hover:text-slate-400 transition-colors cursor-grab" size={20} />
                  
                  <div className="flex-1 grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded-[24px] border-2 border-transparent group-hover:border-slate-100 transition-all">
                    <div className="col-span-6">
                      <input 
                        placeholder="Entry Name (e.g. BM Charting)"
                        className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-quro-teal transition-all"
                        value={item.label}
                        onChange={e => updateItem(item.id, 'label', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <select 
                        className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-3 text-[10px] font-black uppercase text-slate-500 outline-none focus:border-quro-teal transition-all"
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
                        className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-3 text-[10px] font-black uppercase text-slate-500 outline-none focus:border-quro-teal transition-all"
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
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={addItem}
              className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 text-xs font-bold hover:border-quro-teal hover:text-quro-teal hover:bg-teal-50/10 transition-all flex items-center justify-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all">
                <Plus size={16} />
              </div>
              ADD CLINICAL MONITORING ROW
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bed & Room Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Room Creator */}
            <div className="lg:col-span-1">
              <div className="glass-card p-8 sticky top-8">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                  <LayoutGrid size={20} className="text-quro-teal" />
                  Provision Room
                </h3>
                <form onSubmit={handleAddRoom} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Name/Number</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                      placeholder="e.g. 101, West Suite"
                      value={newRoom.name}
                      onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Type</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                      value={newRoom.type}
                      onChange={e => setNewRoom({...newRoom, type: e.target.value})}
                    >
                      <option value="private">Private (1 Bed)</option>
                      <option value="semi-private">Semi-Private (2 Beds)</option>
                      <option value="ward">Ward (3+ Beds)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all">
                    CREATE ROOM
                  </button>
                </form>
              </div>
            </div>

            {/* Room List */}
            <div className="lg:col-span-2 space-y-6">
              {rooms.length === 0 && (
                <div className="py-20 text-center glass-card border-dashed">
                  <Home className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No rooms provisioned in this facility.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-6">
                {rooms.map(room => (
                  <div key={room.id} className="glass-card p-8 group">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Home size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{room.name}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{room.type} room</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            const bedName = prompt('Enter Bed Name (e.g. Bed A, Window Bed):');
                            if (bedName) addBed(room.id, bedName);
                          }}
                          className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:translate-x-[-4px] transition-all"
                        >
                          <Plus size={14} />
                          ADD BED
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {beds.filter(b => b.room_id === room.id).map(bed => (
                        <div key={bed.id} className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent hover:border-teal-500/20 transition-all group/bed">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <BedIcon size={18} className="text-slate-400 group-hover/bed:text-teal-500 transition-colors" />
                              <span className="text-sm font-black text-slate-900">{bed.name}</span>
                            </div>
                            <button onClick={() => deleteBed(bed.id)} className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/bed:opacity-100 transition-all">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${bed.status === 'available' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bed.status}</span>
                          </div>
                        </div>
                      ))}
                      {beds.filter(b => b.room_id === room.id).length === 0 && (
                        <div className="col-span-full py-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                          No beds assigned to this room yet.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

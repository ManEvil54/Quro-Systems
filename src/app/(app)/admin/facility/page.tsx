// ============================================================
// Quro — Facility Configuration (MAR Template Editor)
// Authority: DON & House Manager
// ============================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Save, 
  GripVertical,
  ClipboardList,
  LayoutGrid,
  Bed as BedIcon,
  Home,
  X,
  Stethoscope
} from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBeds } from '@/hooks/useBeds';
import ShiftConfigurator from '@/components/admin/ShiftConfigurator';
import { useFacilityPhysicians } from '@/hooks/useFacilityPhysicians';
import type { FacilityPhysician } from '@/lib/firebase/types';

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
  const [shiftConfig, setShiftConfig] = useState<{ type: '8hr' | '12hr'; intervals: string[] }>({ type: '8hr', intervals: ['07:00', '15:00', '23:00'] });

  const { rooms, beds, addRoom, addBed, deleteBed } = useBeds(targetFacilityId || '');

  const [newRoom, setNewRoom] = useState<{ name: string; type: 'private' | 'semi-private' | 'ward' }>({ name: '', type: 'private' });

  // Real-time facility physicians hook
  const { physicians, loading: physiciansLoading } = useFacilityPhysicians(targetFacilityId || undefined);

  // States for managing physician creation
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocNpi, setNewDocNpi] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const handleAddPhysician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocNpi || !targetFacilityId || !organization?.id) return;
    
    // NPI validation: must be a 10-digit number
    if (!/^\d{10}$/.test(newDocNpi)) {
      alert('NPI must be a 10-digit number.');
      return;
    }

    setIsAddingDoc(true);
    try {
      const newPhysician: FacilityPhysician = {
        id: `phys_${Date.now()}`,
        name: newDocName.trim(),
        specialty: newDocSpecialty.trim() || 'General Medicine',
        npi: newDocNpi.trim()
      };

      const docRef = doc(db, 'organizations', organization.id, 'facilities', targetFacilityId);
      await updateDoc(docRef, {
        physicians: arrayUnion(newPhysician)
      });

      setNewDocName('');
      setNewDocSpecialty('');
      setNewDocNpi('');
    } catch (err) {
      console.error('Error adding physician:', err);
      alert('Failed to add physician to registry.');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleRemovePhysician = async (physician: FacilityPhysician) => {
    if (!targetFacilityId || !organization?.id) return;
    if (!confirm(`Are you sure you want to remove ${physician.name}?`)) return;

    try {
      const docRef = doc(db, 'organizations', organization.id, 'facilities', targetFacilityId);
      await updateDoc(docRef, {
        physicians: arrayRemove(physician)
      });
    } catch (err) {
      console.error('Error removing physician:', err);
      alert('Failed to remove physician from registry.');
    }
  };

  const fetchFacilityConfig = useCallback(async () => {
    if (!targetFacilityId || !organization?.id) return;
    try {
      const fDoc = await getDoc(doc(db, 'organizations', organization.id, 'facilities', targetFacilityId));
      if (fDoc.exists()) {
        const data = fDoc.data();
        setFacilityName(data.name);
        if (data.shiftConfiguration) {
          setShiftConfig(data.shiftConfiguration);
        } else {
          setShiftConfig({ type: '8hr', intervals: ['07:00', '15:00', '23:00'] });
        }
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
  }, [targetFacilityId, organization?.id]);

  useEffect(() => {
    if (targetFacilityId) {
      fetchFacilityConfig();
    }
  }, [targetFacilityId, fetchFacilityConfig]);

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
            <p className="text-sm text-slate-500 font-medium italic">Standardize daily charting and shift schedules across this facility.</p>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'SYNCING...' : 'SAVE TEMPLATE'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
              <ShiftConfigurator 
                key={`${targetFacilityId}_${shiftConfig.type}`}
                facilityId={targetFacilityId || ''} 
                initialType={shiftConfig.type} 
              />

              {/* Credentialed Prescribers Registry */}
              <div className="glass-card p-8 mt-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-quro-teal/10 rounded-2xl flex items-center justify-center text-quro-teal">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Prescribers Registry</h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Authorized Facility Physicians</p>
                  </div>
                </div>

                {/* Add Physician Form */}
                <form onSubmit={handleAddPhysician} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Physician Name</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                      placeholder="e.g. Dr. John Doe, MD"
                      value={newDocName}
                      onChange={e => setNewDocName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialty</label>
                      <input 
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                        placeholder="e.g. Cardiology"
                        value={newDocSpecialty}
                        onChange={e => setNewDocSpecialty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NPI (10 Digits)</label>
                      <input 
                        required
                        maxLength={10}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                        placeholder="10-digit NPI"
                        value={newDocNpi}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setNewDocNpi(val);
                        }}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isAddingDoc}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    {isAddingDoc ? 'REGISTERING...' : 'REGISTER PHYSICIAN'}
                  </button>
                </form>

                {/* List of Registered Physicians */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered Prescribers ({physicians.length})</div>
                  {physiciansLoading ? (
                    <div className="text-center py-4 text-xs text-slate-400 animate-pulse uppercase tracking-widest">Streaming Registry...</div>
                  ) : physicians.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest italic border border-dashed border-slate-200">
                      No facility-specific physicians credentialed.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {physicians.map((phys) => (
                        <div key={phys.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-100 transition-all group/item">
                          <div>
                            <div className="text-xs font-black text-slate-900">{phys.name}</div>
                            <div className="flex gap-2 items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              <span>{phys.specialty || 'General Medicine'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>NPI: {phys.npi}</span>
                            </div>
                          </div>
                          {!phys.id.startsWith('dr-') && (
                            <button 
                              onClick={() => handleRemovePhysician(phys)}
                              title="Remove physician"
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card p-10 space-y-8">
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
                  <div key={item.id} className={`flex gap-4 items-center group animate-in slide-in-from-left-4 delay-stagger-${Math.min(10, index)}`}>
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
                          title="Category"
                          className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-3 text-[10px] font-black uppercase text-slate-500 outline-none focus:border-quro-teal transition-all"
                          value={item.category}
                          onChange={e => updateItem(item.id, 'category', e.target.value as 'vital' | 'monitoring' | 'treatment' | 'ADL')}
                        >
                          <option value="ADL">ADL / Care</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="vital">Vitals/Labs</option>
                          <option value="treatment">Treatment</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select 
                          title="Frequency"
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
                      title="Remove item"
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Type</label>                    <select 
                      title="Room Type"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-quro-teal outline-none transition-all"
                      value={newRoom.type}
                      onChange={e => setNewRoom({...newRoom, type: e.target.value as 'private' | 'semi-private' | 'ward'})}
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
                            <button 
                              onClick={() => deleteBed(bed.id)} 
                              title="Delete bed"
                              className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/bed:opacity-100 transition-all"
                            >
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

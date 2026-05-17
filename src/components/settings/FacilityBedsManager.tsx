// ============================================================
// Quro — Bed & Room Management Drawer Component
// Admin UI to rename houses, add/delete rooms, and provision beds
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  X, 
  Edit2, 
  Trash2, 
  Plus, 
  Check, 
  Loader2, 
  Home, 
  Bed as BedIcon, 
  Save,
  Grid
} from 'lucide-react';
import { useBeds } from '@/hooks/useBeds';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Facility, Room } from '@/lib/firebase/types';

interface FacilityBedsManagerProps {
  facility: Facility;
  orgId: string;
  onClose: () => void;
  onRenameFacility: (newName: string) => void;
}

export default function FacilityBedsManager({ facility, orgId, onClose, onRenameFacility }: FacilityBedsManagerProps) {
  const { rooms, beds, loading, addRoom, addBed, deleteBed, deleteRoom, renameRoom } = useBeds(facility.id);
  
  // Facility Rename State
  const [isEditingFacName, setIsEditingFacName] = useState(false);
  const [facNameInput, setFacNameInput] = useState(facility.name);
  const [isSavingFacName, setIsSavingFacName] = useState(false);

  // New Room Form State
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'private' | 'semi-private' | 'ward'>('private');
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // New Bed Inputs per Room
  const [newBedNameMap, setNewBedNameMap] = useState<Record<string, string>>({});
  const [isAddingBedMap, setIsAddingBedMap] = useState<Record<string, boolean>>({});

  // Room Rename States
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomNameInput, setRoomNameInput] = useState('');

  // Handle renaming the facility/house
  const handleSaveFacName = async () => {
    if (!facNameInput.trim()) return;
    setIsSavingFacName(true);
    try {
      const facRef = doc(db, 'organizations', orgId, 'facilities', facility.id);
      await updateDoc(facRef, {
        name: facNameInput.trim(),
        updated_at: serverTimestamp()
      });
      onRenameFacility(facNameInput.trim());
      setIsEditingFacName(false);
    } catch (err) {
      console.error('Error renaming facility:', err);
    } finally {
      setIsSavingFacName(false);
    }
  };

  // Handle adding a room
  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setIsAddingRoom(true);
    try {
      await addRoom(newRoomName.trim(), newRoomType);
      setNewRoomName('');
      setNewRoomType('private');
    } catch (err) {
      console.error('Error adding room:', err);
    } finally {
      setIsAddingRoom(false);
    }
  };

  // Handle renaming a room
  const handleSaveRoomName = async (roomId: string) => {
    if (!roomNameInput.trim()) return;
    try {
      await renameRoom(roomId, roomNameInput.trim());
      setEditingRoomId(null);
      setRoomNameInput('');
    } catch (err) {
      console.error('Error renaming room:', err);
    }
  };

  // Handle adding a bed to a specific room
  const handleAddBedSubmit = async (roomId: string) => {
    const bedName = newBedNameMap[roomId] || '';
    if (!bedName.trim()) return;
    
    setIsAddingBedMap(prev => ({ ...prev, [roomId]: true }));
    try {
      await addBed(roomId, bedName.trim());
      setNewBedNameMap(prev => ({ ...prev, [roomId]: '' }));
    } catch (err) {
      console.error('Error adding bed:', err);
    } finally {
      setIsAddingBedMap(prev => ({ ...prev, [roomId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between">
          <div className="flex-1 mr-4">
            {isEditingFacName ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  className="input text-lg font-bold py-1 px-2 border-teal-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                  value={facNameInput}
                  onChange={(e) => setFacNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFacName()}
                  disabled={isSavingFacName}
                  autoFocus
                />
                <button 
                  onClick={handleSaveFacName} 
                  disabled={isSavingFacName}
                  className="p-2 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                >
                  {isSavingFacName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => { setIsEditingFacName(false); setFacNameInput(facility.name); }}
                  className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{facility.name}</h2>
                <button 
                  onClick={() => setIsEditingFacName(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 font-medium mt-1">Manage infrastructure, rooms, and bed configurations</p>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-2" />
              <p className="text-xs font-semibold uppercase tracking-wider">Syncing room details...</p>
            </div>
          ) : (
            <>
              {/* Add Room Section */}
              <div className="glass-card p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Add Room (New Node)</h3>
                <form onSubmit={handleAddRoomSubmit} className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="label text-[10px] uppercase font-bold text-slate-500">Room Name/Number</label>
                    <input 
                      type="text" 
                      className="input py-2 px-3 text-sm" 
                      placeholder="e.g. Room 101" 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-[10px] uppercase font-bold text-slate-500">Room Type</label>
                    <select 
                      className="input py-2 px-3 text-sm"
                      value={newRoomType}
                      onChange={(e) => setNewRoomType(e.target.value as any)}
                    >
                      <option value="private">Private (1 Bed)</option>
                      <option value="semi-private">Semi-Private (2 Beds)</option>
                      <option value="ward">Ward (Multiple Beds)</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isAddingRoom || !newRoomName.trim()}
                    className="btn-primary shimmer-btn py-2 px-4 flex items-center gap-2 text-xs"
                  >
                    {isAddingRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add Room</span>
                  </button>
                </form>
              </div>

              {/* Rooms & Beds List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Rooms & Beds ({rooms.length})</h3>
                
                {rooms.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400 italic">No rooms provisioned in this house yet.</p>
                  </div>
                ) : (
                  rooms.map((room) => {
                    const roomBeds = beds.filter(b => b.room_id === room.id);
                    
                    return (
                      <div key={room.id} className="glass-card p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        {/* Room Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                          <div className="flex items-center gap-2 flex-1">
                            {editingRoomId === room.id ? (
                              <div className="flex items-center gap-1">
                                <input 
                                  type="text" 
                                  className="input text-sm py-0.5 px-2 max-w-[150px] border-teal-500" 
                                  value={roomNameInput}
                                  onChange={(e) => setRoomNameInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRoomName(room.id)}
                                  autoFocus
                                />
                                <button 
                                  onClick={() => handleSaveRoomName(room.id)}
                                  className="p-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => { setEditingRoomId(null); setRoomNameInput(''); }}
                                  className="p-1 rounded bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/room">
                                <p className="font-bold text-slate-900 text-sm">{room.name}</p>
                                <button 
                                  onClick={() => { setEditingRoomId(room.id); setRoomNameInput(room.name); }}
                                  className="p-1 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 opacity-0 group-hover\/room:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <span className="text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {room.type}
                            </span>
                          </div>

                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${room.name} and all beds inside it?`)) {
                                deleteRoom(room.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Beds Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {roomBeds.map((bed) => {
                            let statusColor = 'bg-slate-100 text-slate-500';
                            if (bed.status === 'available') statusColor = 'bg-teal-50 text-teal-700 border border-teal-200/50';
                            if (bed.status === 'occupied') statusColor = 'bg-amber-50 text-amber-800 border border-amber-200/50';
                            if (bed.status === 'maintenance') statusColor = 'bg-red-50 text-red-700 border border-red-200/50';

                            return (
                              <div 
                                key={bed.id} 
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group/bed"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                    <BedIcon size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{bed.name}</p>
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md mt-1 inline-block tracking-tighter ${statusColor}`}>
                                      {bed.status}
                                    </span>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => deleteBed(bed.id)}
                                  className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover\/bed:opacity-100 focus:opacity-100"
                                  title="Delete Bed"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}

                          {roomBeds.length === 0 && (
                            <p className="text-xs text-slate-400 italic col-span-2">No beds allocated. Add a bed below.</p>
                          )}
                        </div>

                        {/* Add Bed Inline Form */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                          <input 
                            type="text" 
                            className="input py-1 px-2.5 text-xs flex-1 max-w-[160px]" 
                            placeholder="Add bed name (e.g. Bed A)" 
                            value={newBedNameMap[room.id] || ''}
                            onChange={(e) => setNewBedNameMap(prev => ({ ...prev, [room.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddBedSubmit(room.id)}
                          />
                          <button 
                            onClick={() => handleAddBedSubmit(room.id)}
                            disabled={isAddingBedMap[room.id] || !(newBedNameMap[room.id] || '').trim()}
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-50 transition-colors flex items-center justify-center"
                            title="Add Bed"
                          >
                            {isAddingBedMap[room.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

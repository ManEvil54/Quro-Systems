// ============================================================
// Quro — Bed & Room Management Hook
// Logic for provisioning facility infrastructure
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Room, Bed } from '@/lib/firebase/types';

export function useBeds(facilityId: string) {
  const { organization } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !facilityId) {
      setLoading(false);
      return;
    }

    // Listen to Rooms
    const roomsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'rooms');
    const unsubRooms = onSnapshot(query(roomsRef, orderBy('name', 'asc')), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Room[]);
    });

    // Listen to Beds (using collectionGroup or just individual room listeners? 
    // Let's use a flat structure for beds under facility for easier dashboarding)
    const bedsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'beds');
    const unsubBeds = onSnapshot(query(bedsRef, orderBy('name', 'asc')), (snap) => {
      setBeds(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Bed[]);
      setLoading(false);
    });

    return () => { unsubRooms(); unsubBeds(); };
  }, [organization?.id, facilityId]);

  const addRoom = async (name: string, type: Room['type']) => {
    if (!organization?.id || !facilityId) return;
    const roomsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'rooms');
    return await addDoc(roomsRef, {
      org_id: organization.id,
      facility_id: facilityId,
      name,
      type,
      is_active: true,
      created_at: new Date().toISOString()
    });
  };

  const addBed = async (roomId: string, name: string) => {
    if (!organization?.id || !facilityId) return;
    const bedsRef = collection(db, 'organizations', organization.id, 'facilities', facilityId, 'beds');
    return await addDoc(bedsRef, {
      org_id: organization.id,
      facility_id: facilityId,
      room_id: roomId,
      name,
      status: 'available',
      created_at: new Date().toISOString()
    });
  };

  const deleteBed = async (bedId: string) => {
    if (!organization?.id || !facilityId) return;
    return await deleteDoc(doc(db, 'organizations', organization.id, 'facilities', facilityId, 'beds', bedId));
  };

  return { rooms, beds, loading, addRoom, addBed, deleteBed };
}

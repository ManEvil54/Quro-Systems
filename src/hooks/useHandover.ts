// ============================================================
// Quro — Shift Handover Hook
// Handles nurse-to-nurse communication and shift transitions
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
  serverTimestamp,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { HandoverNote } from '@/lib/firebase/types';

export function useHandover(facilityId?: string) {
  const { staff, organization } = useAuth();
  const [notes, setNotes] = useState<HandoverNote[]>([]);
  const [pendingAcks, setPendingAcks] = useState<string[]>([]); // IDs of notes not yet acked by current user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id || !staff?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build query scoped by org and optionally facility
    const notesRef = collection(db, 'organizations', organization.id, 'handover_notes');
    let q = query(notesRef, orderBy('created_at', 'desc'));

    if (facilityId) {
      q = query(notesRef, 
        where('facility_id', '==', facilityId),
        orderBy('created_at', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HandoverNote[];
      setNotes(docs);

      // Check which notes have been acknowledged by the current staff member
      // Limiting to recent notes for performance
      const pendingIds: string[] = [];
      const recentNotes = docs.slice(0, 10); // Check only the 10 most recent
      
      for (const note of recentNotes) {
        const acksRef = collection(db, 'organizations', organization.id, 'handover_notes', note.id, 'acks');
        const ackSnap = await getDocs(query(acksRef, where('acknowledged_by', '==', staff.id)));
        if (ackSnap.empty) {
          pendingIds.push(note.id);
        }
      }
      
      setPendingAcks(pendingIds);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching handover notes:', err);
      setError('Failed to load handover hub.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization?.id, staff?.id, facilityId]);

  const createNote = async (data: Omit<HandoverNote, 'id' | 'org_id' | 'authored_by' | 'created_at' | 'updated_at'>) => {
    if (!organization?.id || !staff?.id) throw new Error('Not authenticated');
    
    const notesRef = collection(db, 'organizations', organization.id, 'handover_notes');
    return await addDoc(notesRef, {
      ...data,
      org_id: organization.id,
      authored_by: staff.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const acknowledgeNote = async (noteId: string) => {
    if (!organization?.id || !staff?.id) throw new Error('Not authenticated');
    
    const acksRef = collection(db, 'organizations', organization.id, 'handover_notes', noteId, 'acks');
    return await addDoc(acksRef, {
      handover_note_id: noteId,
      acknowledged_by: staff.id,
      acknowledged_at: new Date().toISOString(),
      org_id: organization.id
    });
  };

  const performShiftHandshake = async (noteIds: string[]) => {
    if (!organization?.id || !staff?.id) throw new Error('Not authenticated');
    
    const batch = writeBatch(db);
    for (const id of noteIds) {
      const ackRef = doc(collection(db, 'organizations', organization.id, 'handover_notes', id, 'acks'));
      batch.set(ackRef, {
        handover_note_id: id,
        acknowledged_by: staff.id,
        acknowledged_at: new Date().toISOString(),
        org_id: organization.id
      });
    }
    return await batch.commit();
  };

  return { notes, pendingAcks, loading, error, createNote, acknowledgeNote, performShiftHandshake };
}

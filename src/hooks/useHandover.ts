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
  updateDoc, 
  serverTimestamp,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { HandoverNote, HandoverAck } from '@/lib/firebase/types';

export function useHandover() {
  const { staff } = useAuth();
  const [notes, setNotes] = useState<HandoverNote[]>([]);
  const [pendingAcks, setPendingAcks] = useState<string[]>([]); // IDs of notes not yet acked by current user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id) {
      setLoading(false);
      return;
    }

    // Get notes for the organization (or current facility)
    const notesRef = collection(db, 'organizations', staff.org_id, 'handover_notes');
    const q = query(notesRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HandoverNote[];
      setNotes(docs);

      // Check which notes have been acknowledged by the current staff member
      // This is a bit complex for a client-side hook, usually we'd have a subcollection
      // For now, let's just fetch the acks for the recent notes
      const pendingIds: string[] = [];
      for (const note of docs.slice(0, 20)) {
        const acksRef = collection(db, 'organizations', staff.org_id, 'handover_notes', note.id, 'acks');
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
  }, [staff?.org_id, staff?.id]);

  const createNote = async (data: Omit<HandoverNote, 'id' | 'org_id' | 'authored_by' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const notesRef = collection(db, 'organizations', staff.org_id, 'handover_notes');
    return await addDoc(notesRef, {
      ...data,
      org_id: staff.org_id,
      authored_by: staff.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const acknowledgeNote = async (noteId: string) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const acksRef = collection(db, 'organizations', staff.org_id, 'handover_notes', noteId, 'acks');
    return await addDoc(acksRef, {
      handover_note_id: noteId,
      acknowledged_by: staff.id,
      acknowledged_at: new Date().toISOString(),
      org_id: staff.org_id
    });
  };

  const performShiftHandshake = async (noteIds: string[]) => {
    if (!staff?.org_id) throw new Error('Not authenticated');
    
    const batch = writeBatch(db);
    for (const id of noteIds) {
      const ackRef = doc(collection(db, 'organizations', staff.org_id, 'handover_notes', id, 'acks'));
      batch.set(ackRef, {
        handover_note_id: id,
        acknowledged_by: staff.id,
        acknowledged_at: new Date().toISOString(),
        org_id: staff.org_id
      });
    }
    return await batch.commit();
  };

  return { notes, pendingAcks, loading, error, createNote, acknowledgeNote, performShiftHandshake };
}

// ============================================================
// Quro — Progress Notes & Clinical Documentation Hook
// Handles shift charting and narrative clinical records
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
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProgressNote } from '@/lib/firebase/types';

export function useNotes(patientId: string) {
  const { staff } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setLoading(false);
      return;
    }

    const notesRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'progress_notes');
    const q = query(notesRef, orderBy('created_at', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProgressNote[];
      setNotes(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notes:', err);
      setError('Failed to load progress notes.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const saveNote = async (data: Omit<ProgressNote, 'id' | 'org_id' | 'patient_id' | 'authored_by' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const notesRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'progress_notes');
    return await addDoc(notesRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      authored_by: staff.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateNote = async (noteId: string, data: Partial<ProgressNote>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const noteRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'progress_notes', noteId);
    return await updateDoc(noteRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  };

  return { notes, loading, error, saveNote, updateNote };
}

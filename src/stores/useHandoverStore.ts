// ============================================================
// Quro — Handover Store (Domain-Specific Zustand Store)
// ============================================================
import { create } from 'zustand';
import type { HandoverNote, HandoverAck } from '@/lib/firebase/types';

interface HandoverStoreState {
  notes: HandoverNote[];
  acks: HandoverAck[];
  loading: boolean;
  error: string | null;

  // Actions
  setNotes: (notes: HandoverNote[]) => void;
  addNote: (note: HandoverNote) => void;
  setAcks: (acks: HandoverAck[]) => void;
  addAck: (ack: HandoverAck) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHandoverStore = create<HandoverStoreState>((set) => ({
  notes: [],
  acks: [],
  loading: false,
  error: null,

  setNotes: (notes) => set({ notes, loading: false }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  setAcks: (acks) => set({ acks }),
  addAck: (ack) => set((state) => ({ acks: [...state.acks, ack] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Stateless Getter Hooks
export function useFacilityHandovers(facilityId: string) {
  return useHandoverStore((state) =>
    state.notes.filter((n) => n.facility_id === facilityId)
  );
}

export function useUnacknowledgedNotes(staffId: string) {
  return useHandoverStore((state) => {
    const ackedIds = new Set(
      state.acks
        .filter((a) => a.acknowledged_by === staffId)
        .map((a) => a.handover_note_id)
    );
    return state.notes.filter((n) => !ackedIds.has(n.id));
  });
}

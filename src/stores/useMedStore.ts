// ============================================================
// Quro — Medication Store (Domain-Specific Zustand Store)
// Decentralized state: useMedStore
// ============================================================
import { create } from 'zustand';
import type { Medication, MedStatus } from '@/lib/firebase/types';

interface MedStoreState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  selectedMedId: string | null;

  // Actions
  setMedications: (meds: Medication[]) => void;
  addMedication: (med: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectMed: (id: string | null) => void;
}

export const useMedStore = create<MedStoreState>((set) => ({
  medications: [],
  loading: false,
  error: null,
  selectedMedId: null,

  setMedications: (medications) => set({ medications, loading: false }),
  addMedication: (med) =>
    set((state) => ({ medications: [...state.medications, med] })),
  updateMedication: (id, updates) =>
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  removeMedication: (id) =>
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  selectMed: (selectedMedId) => set({ selectedMedId }),
}));

// ============================================================
// Stateless Getter Hook Pattern
// ============================================================
export function usePatientMeds(patientId: string) {
  return useMedStore((state) =>
    state.medications.filter((m) => m.patient_id === patientId)
  );
}

export function useActiveMeds(patientId: string) {
  return useMedStore((state) =>
    state.medications.filter(
      (m) => m.patient_id === patientId && m.status === 'active'
    )
  );
}

export function useHouseMeds(facilityId: string) {
  // This hook would be used with a joined query
  // For now, returns all meds (to be filtered at query level)
  return useMedStore((state) => state.medications);
}

export function usePsychotropicMeds(patientId: string) {
  return useMedStore((state) =>
    state.medications.filter(
      (m) => m.patient_id === patientId && m.is_psychotropic
    )
  );
}

// ============================================================
// Quro — Vitals Store (Domain-Specific Zustand Store)
// Decentralized state: useVitalsStore
// ============================================================
import { create } from 'zustand';
import type { VitalSign } from '@/lib/firebase/types';

interface VitalsStoreState {
  vitals: VitalSign[];
  activeAlerts: VitalSign[];
  loading: boolean;
  error: string | null;

  // Actions
  setVitals: (vitals: VitalSign[]) => void;
  addVital: (vital: VitalSign) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVitalsStore = create<VitalsStoreState>((set) => ({
  vitals: [],
  activeAlerts: [],
  loading: false,
  error: null,

  setVitals: (vitals) =>
    set({
      vitals,
      activeAlerts: vitals.filter((v) => v.is_alert),
      loading: false,
    }),
  addVital: (vital) =>
    set((state) => ({
      vitals: [vital, ...state.vitals],
      activeAlerts: vital.is_alert
        ? [vital, ...state.activeAlerts]
        : state.activeAlerts,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ============================================================
// Stateless Getter Hooks
// ============================================================
export function usePatientVitals(patientId: string) {
  return useVitalsStore((state) =>
    state.vitals.filter((v) => v.patient_id === patientId)
  );
}

export function useLatestVital(patientId: string) {
  return useVitalsStore((state) =>
    state.vitals
      .filter((v) => v.patient_id === patientId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] ?? null
  );
}

export function useVitalAlerts() {
  return useVitalsStore((state) => state.activeAlerts);
}

// AI-powered threshold checking
export function checkVitalThresholds(vital: Partial<VitalSign>): { isAlert: boolean; message: string | null } {
  const alerts: string[] = [];

  if (vital.systolic && (vital.systolic > 180 || vital.systolic < 90))
    alerts.push(`Systolic BP ${vital.systolic} mmHg out of range`);
  if (vital.diastolic && (vital.diastolic > 120 || vital.diastolic < 60))
    alerts.push(`Diastolic BP ${vital.diastolic} mmHg out of range`);
  if (vital.pulse && (vital.pulse > 120 || vital.pulse < 50))
    alerts.push(`Pulse ${vital.pulse} bpm out of range`);
  if (vital.temperature && (vital.temperature > 101.5 || vital.temperature < 96.0))
    alerts.push(`Temp ${vital.temperature}°F out of range`);
  if (vital.spO2 && vital.spO2 < 92)
    alerts.push(`O2 Sat ${vital.spO2}% below threshold`);
  if (vital.resp && (vital.resp > 24 || vital.resp < 10))
    alerts.push(`RR ${vital.resp}/min out of range`);
  if (vital.glucose && (vital.glucose > 300 || vital.glucose < 70))
    alerts.push(`Blood Glucose ${vital.glucose} mg/dL out of range`);

  return {
    isAlert: alerts.length > 0,
    message: alerts.length > 0 ? alerts?.join('; ') : null,
  };
}

// ============================================================
// Quro — Physician Medication Order Portal
// Authority: Physician / NP / PA
// ============================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FilePlus, 
  PenTool, 
  Pill, 
  AlertCircle,
  FileText,
  ShieldCheck,
  X
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFacilityPhysicians } from '@/hooks/useFacilityPhysicians';
import type { MedRoute, MedFrequency, Staff, Patient, ProviderOrder } from '@/lib/firebase/types';
import { safeFormat } from '@/lib/dateUtils';
import { COMMON_DRUGS } from '@/lib/constants/drugs';
import MedicationPicker from './MedicationPicker';

const calculateDosageFormQty = (dose: string, strength: string, currentDosage: string): string => {
  if (!dose || !strength) return currentDosage;
  
  // Extract leading numbers (including decimals)
  const doseNumMatch = dose.match(/^([\d\.]+)/);
  const strengthNumMatch = strength.match(/^([\d\.]+)/);
  
  if (!doseNumMatch || !strengthNumMatch) return currentDosage;
  
  const doseNum = parseFloat(doseNumMatch[1]);
  const strengthNum = parseFloat(strengthNumMatch[1]);
  
  if (isNaN(doseNum) || isNaN(strengthNum) || strengthNum === 0) return currentDosage;
  
  const ratio = parseFloat((doseNum / strengthNum).toFixed(3));
  
  // Extract form name from currentDosage (e.g. "1 Tablet" -> "Tablet", "0.5 Capsule" -> "Capsule")
  let formName = 'Tablet';
  if (currentDosage) {
    const formMatch = currentDosage.match(/^[\d\.\-\s]+(.*)$/);
    if (formMatch && formMatch[1].trim()) {
      formName = formMatch[1].trim();
    }
  }
  
  // Clean up pluralization for common forms
  const lowerForm = formName.toLowerCase();
  const commonForms = ['tablet', 'capsule', 'patch', 'puffer', 'application'];
  const matchedCommon = commonForms.find(f => 
    lowerForm === f || lowerForm === f + 's' || (f === 'patch' && lowerForm === 'patches')
  );
  
  if (matchedCommon) {
    if (ratio <= 1) {
      formName = matchedCommon.charAt(0).toUpperCase() + matchedCommon.slice(1);
    } else {
      if (matchedCommon === 'patch') {
        formName = 'Patches';
      } else {
        formName = matchedCommon.charAt(0).toUpperCase() + matchedCommon.slice(1) + 's';
      }
    }
  }
  
  return `${ratio} ${formName}`;
};

// Helper to evaluate if a medication belongs to a psychotropic class (Antipsychotic, Antianxiety, Antidepressant, Hypnotic)
const isPsychotropicClass = (genericName: string): boolean => {
  const nameClean = (genericName || '').toLowerCase().trim();
  // Find in COMMON_DRUGS library
  const drug = COMMON_DRUGS.find(d => 
    d.generic.toLowerCase() === nameClean || 
    (d.brand && d.brand.toLowerCase() === nameClean) ||
    nameClean.includes(d.generic.toLowerCase())
  );
  if (drug) {
    if (drug.is_psychotropic) return true;
    const cls = (drug.class || '').toLowerCase();
    if (cls.includes('antipsychotic') || cls.includes('antianxiety') || cls.includes('anxiolytic') || cls.includes('antidepressant') || cls.includes('hypnotic')) {
      return true;
    }
  }
  // Fallback string matching for typical psychotropic classes
  const classes = ['antipsychotic', 'anxiolytic', 'antianxiety', 'antidepressant', 'hypnotic', 'sedative'];
  return classes.some(cls => nameClean.includes(cls));
};

interface Props {
  patientId: string;
}

export default function PhysicianOrderPortal({ patientId }: Props) {
  const { staff, organization, activeFacility } = useAuth();
  const [providerOrders, setProviderOrders] = useState<ProviderOrder[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<'signed' | 'draft'>('signed');
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [strengths, setStrengths] = useState<string[]>([]);

  const [orderType, setOrderType] = useState<'medication' | 'treatment'>('medication');
  const [treatmentTitle, setTreatmentTitle] = useState('');
  const [treatmentInstructions, setTreatmentInstructions] = useState('');
  const [treatmentFrequency, setTreatmentFrequency] = useState('QD');
  const [treatmentTimes, setTreatmentTimes] = useState<string[]>(['09:00']);
  const [treatmentOrderMethod, setTreatmentOrderMethod] = useState<'direct' | 'telephone'>('direct');
  const [treatmentPhysicianId, setTreatmentPhysicianId] = useState('');
  const [treatmentPhysicianName, setTreatmentPhysicianName] = useState('');
  const [treatmentPhysicianNpi, setTreatmentPhysicianNpi] = useState('');

  const [patient, setPatient] = useState<Patient | null>(null);
  const { physicians, loading: physiciansLoading } = useFacilityPhysicians(patient?.facility_id || activeFacility?.id);

  const resetForm = () => {
    setNewOrder({
      generic_name: '',
      strength: '',
      dose: '',
      dosage: '',
      route: 'PO',
      frequency: 'QD',
      custom_times: ['09:00'],
      indication: '',
      prn_reason: '',
      prn_interval: '',
      is_psychotropic: false,
      special_instructions: '',
      requires_vitals: false,
      vital_type: 'bp',
      vital_threshold_low: '',
      vital_threshold_high: '',
      order_type: 'direct',
      physician_id: '',
      physician_name: '',
      physician_npi: '',
      rxcui: null
    });
    setNewDietOrder({
      diet_type: 'Regular',
      consistency: 'Regular',
      instructions: '',
      order_type: 'direct',
      physician_id: '',
      physician_name: ''
    });
    setTreatmentTitle('');
    setTreatmentInstructions('');
    setTreatmentFrequency('QD');
    setTreatmentTimes(['09:00']);
    setTreatmentOrderMethod('direct');
    setTreatmentPhysicianId('');
    setTreatmentPhysicianName('');
    setTreatmentPhysicianNpi('');
    setEditingDraftId(null);
  };

  const handleEditDraft = (order: ProviderOrder) => {
    if (order.order_type === 'treatment') {
      setTreatmentTitle(order.title || '');
      setTreatmentInstructions(order.order_text || '');
      setTreatmentFrequency(order.frequency || 'QD');
      setTreatmentTimes(order.frequency_times || ['09:00']);
      setTreatmentOrderMethod((order.order_method as 'direct' | 'telephone') || 'direct');
      setTreatmentPhysicianId(order.ordering_physician_id || '');
      setTreatmentPhysicianName(order.ordering_physician_name || order.ordering_physician_id || '');
      setTreatmentPhysicianNpi(order.ordering_physician_npi || '');
      setOrderType('treatment');
    } else {
      setNewOrder({
        generic_name: order.generic_name || '',
        strength: order.strength || '',
        dose: order.dose || '',
        dosage: order.dosage || '',
        route: order.route || 'PO',
        frequency: order.frequency || 'QD',
        custom_times: order.frequency_times || (order.frequency === 'PRN' ? [] : ['09:00']),
        indication: order.indication || '',
        prn_reason: order.prn_reason || '',
        prn_interval: order.prn_interval || '',
        is_psychotropic: order.is_psychotropic || false,
        special_instructions: order.special_instructions || '',
        requires_vitals: order.requires_vitals || false,
        vital_type: order.vital_type || 'bp',
        vital_threshold_low: order.vital_threshold_low ? String(order.vital_threshold_low) : '',
        vital_threshold_high: order.vital_threshold_high ? String(order.vital_threshold_high) : '',
        order_type: (order.order_method as 'direct' | 'telephone') || 'direct',
        physician_id: order.ordering_physician_id || '',
        physician_name: order.ordering_physician_name || order.ordering_physician_id || '',
        physician_npi: order.ordering_physician_npi || '',
        rxcui: order.rxcui || null
      });
      setOrderType('medication');
    }
    setEditingDraftId(order.id);
    setIsOrdering(true);
  };

  const handleSignDirectly = async (order: ProviderOrder) => {
    if (!staff || !organization) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', order.id);
      await updateDoc(docRef, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: order.order_type === 'treatment' ? 'TREATMENT_ORDER_SIGNED' : 'MED_ORDER_SIGNED',
        staff_id: staff.id,
        patient_id: patientId,
        details: `Physician signed draft order directly for ${order.title || order.generic_name}`,
        timestamp: new Date().toISOString()
      });

      fetchOrders();
    } catch (err) {
      console.error('Error signing directly:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoSignOrder = async (orderId: string) => {
    if (!staff || !organization) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', orderId);
      await updateDoc(docRef, {
        signed_at: new Date().toISOString(),
        ordering_physician_id: staff.id, // Formalizing physician responsibility
        updated_at: new Date().toISOString()
      });

      const order = providerOrders.find(o => o.id === orderId);

      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: order?.order_type === 'treatment' ? 'TREATMENT_ORDER_CO_SIGNED' : 'MED_ORDER_CO_SIGNED',
        staff_id: staff.id,
        patient_id: patientId,
        details: `Physician co-signed telephone order for ${order?.title || order?.generic_name || order?.order_text || 'Medication/Treatment'}`,
        timestamp: new Date().toISOString()
      });

      fetchOrders();
    } catch (err) {
      console.error('Error co-signing order:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const [newDietOrder, setNewDietOrder] = useState({
    diet_type: 'Regular',
    consistency: 'Regular',
    instructions: '',
    order_type: 'direct' as 'direct' | 'telephone',
    physician_id: '',
    physician_name: ''
  });

  const [newOrder, setNewOrder] = useState({
    generic_name: '',
    strength: '',
    dose: '',
    dosage: '',
    route: 'PO' as MedRoute,
    frequency: 'QD' as MedFrequency,
    custom_times: ['09:00'] as string[],
    indication: '',
    prn_reason: '',
    prn_interval: '',
    is_psychotropic: false,
    special_instructions: '',
    requires_vitals: false,
    vital_type: 'bp' as 'bp' | 'hr' | 'glucose' | 'spO2',
    vital_threshold_low: '',
    vital_threshold_high: '',
    order_type: 'direct' as 'direct' | 'telephone',
    physician_id: '',
    physician_name: '',
    physician_npi: '',
    rxcui: null as string | null
  });


  const fetchPatient = useCallback(async () => {
    if (!organization || !patientId) return;
    try {
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'organizations', organization.id, 'patients', patientId));
      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
      }
    } catch (err) {
      console.error('Error fetching patient in order portal:', err);
    }
  }, [organization, patientId]);

  const fetchOrders = useCallback(async () => {
    if (!organization || !patientId) return;
    try {
      const q = query(
        collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setProviderOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProviderOrder)));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [organization, patientId]);

  useEffect(() => {
    fetchOrders();
    fetchPatient();
  }, [fetchOrders, fetchPatient]);

  useEffect(() => {
    if (!newOrder.generic_name || newOrder.generic_name.length < 3) {
      const timer = setTimeout(() => {
        setStrengths([]);
      }, 0);
      return () => clearTimeout(timer);
    }
    const fetchStrengths = async () => {
      try {
        const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(newOrder.generic_name)}&ef=STRENGTHS_AND_FORMS`);
        const data = await res.json();
        const strengthsList = data[2]?.STRENGTHS_AND_FORMS?.[0] || [];
        setStrengths(strengthsList);
      } catch (err) {
        console.error('Error fetching strengths:', err);
        setStrengths([]);
      }
    };
    fetchStrengths();
  }, [newOrder.generic_name]);

  useEffect(() => {
    if (newOrder.strength && newOrder.dose) {
      const calculated = calculateDosageFormQty(newOrder.dose, newOrder.strength, newOrder.dosage);
      if (calculated !== newOrder.dosage) {
        setNewOrder(prev => ({
          ...prev,
          dosage: calculated
        }));
      }
    }
  }, [newOrder.strength, newOrder.dose, newOrder.dosage]);

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !organization) return;
    setIsSaving(true);

    try {
      if (orderType === 'treatment') {
        const isTelephone = treatmentOrderMethod === 'telephone';
        const selectedPhys = physicians.find(p => p.id === (isTelephone ? treatmentPhysicianId : staff.id));
        const ordering_physician_id = isTelephone ? treatmentPhysicianId : staff.id;
        const ordering_physician_name = selectedPhys ? selectedPhys.name : (isTelephone ? treatmentPhysicianName : `Dr. ${staff.last_name}`);
        const ordering_physician_npi = selectedPhys ? selectedPhys.npi : '';
        
        const providerOrderData: any = {
          org_id: organization.id,
          patient_id: patientId,
          facility_id: patient?.facility_id || '',
          ordering_physician_id,
          ordering_physician_name,
          ordering_physician_npi,
          order_type: 'treatment',
          title: treatmentTitle,
          order_text: treatmentInstructions,
          priority: 'routine',
          status: targetStatus === 'signed' ? (isTelephone ? 'acknowledged' : 'signed') : 'draft',
          order_method: treatmentOrderMethod,
          frequency: treatmentFrequency,
          frequency_times: treatmentFrequency === 'PRN' ? [] : treatmentTimes,
          updated_at: new Date().toISOString()
        };

        if (targetStatus === 'signed') {
          if (isTelephone) {
            providerOrderData.signed_at = null;
            providerOrderData.acknowledged_at = new Date().toISOString();
            providerOrderData.acknowledging_nurse_id = staff.id;
          } else {
            providerOrderData.signed_at = new Date().toISOString();
          }
        }

        if (editingDraftId) {
          const docRef = doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', editingDraftId);
          await updateDoc(docRef, providerOrderData);
        } else {
          providerOrderData.created_at = new Date().toISOString();
          await addDoc(
            collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
            providerOrderData
          );
        }

        // Also update diet field if it is a dietary request to support legacy facesheet panels
        if (treatmentTitle.toLowerCase().includes("diet") || treatmentInstructions.toLowerCase().includes("diet")) {
          await updateDoc(doc(db, 'organizations', organization.id, 'patients', patientId), {
            diet: treatmentTitle,
            updated_at: new Date().toISOString()
          });
        }

        await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
          action: targetStatus === 'signed' 
            ? (isTelephone ? 'TELEPHONE_TREATMENT_ORDER' : 'TREATMENT_ORDER_SIGNED')
            : 'TREATMENT_ORDER_DRAFT_SAVED',
          staff_id: staff.id,
          patient_id: patientId,
          details: targetStatus === 'signed'
            ? (isTelephone 
                ? `Nurse transcribed telephone treatment order from ${ordering_physician_name} for ${treatmentTitle}`
                : `Physician signed new treatment order for ${treatmentTitle}`)
            : `Saved draft treatment order for ${treatmentTitle}`,
          timestamp: new Date().toISOString()
        });

        setIsOrdering(false);
        resetForm();
        fetchOrders();
        return;
      }

      const isTelephone = newOrder.order_type === 'telephone';
      const selectedPhys = physicians.find(p => p.id === (isTelephone ? newOrder.physician_id : staff.id));
      const ordering_physician_id = isTelephone ? newOrder.physician_id : staff.id;
      const ordering_physician_name = selectedPhys ? selectedPhys.name : (isTelephone ? newOrder.physician_name : `Dr. ${staff.last_name}`);
      const ordering_physician_npi = selectedPhys ? selectedPhys.npi : '';

      const isPRN = newOrder.frequency === 'PRN';
      const frequencyText = isPRN 
        ? `PRN (every ${newOrder.prn_interval || '8 hours'} as needed for ${newOrder.prn_reason || newOrder.indication || 'pain'})` 
        : newOrder.frequency;
      const orderText = `${newOrder.generic_name} ${newOrder.strength} - Dose: ${newOrder.dose} (${newOrder.dosage}) via ${newOrder.route} ${frequencyText}${newOrder.special_instructions ? `. Special Instructions: ${newOrder.special_instructions}` : ''}`;
      
      const providerOrderData: Partial<ProviderOrder> = {
        org_id: organization.id,
        patient_id: patientId,
        facility_id: patient?.facility_id || '',
        ordering_physician_id,
        ordering_physician_name,
        ordering_physician_npi,
        order_type: 'medication',
        order_text: orderText,
        rxcui: newOrder.rxcui,
        priority: 'routine',
        status: targetStatus === 'signed' && isTelephone ? 'acknowledged' : targetStatus,
        order_method: newOrder.order_type,
        generic_name: newOrder.generic_name,
        strength: newOrder.strength,
        dose: newOrder.dose || null,
        dosage: newOrder.dosage,
        route: newOrder.route,
        frequency: newOrder.frequency,
        frequency_times: newOrder.frequency === 'PRN' ? [] : (newOrder.custom_times || ['09:00']),
        indication: newOrder.indication,
        prn_reason: newOrder.prn_reason || null,
        prn_interval: newOrder.prn_interval || null,
        is_psychotropic: newOrder.is_psychotropic,
        requires_vitals: newOrder.requires_vitals,
        vital_type: newOrder.requires_vitals ? newOrder.vital_type : null,
        vital_threshold_low: newOrder.requires_vitals && newOrder.vital_threshold_low ? Number(newOrder.vital_threshold_low) : null,
        vital_threshold_high: newOrder.requires_vitals && newOrder.vital_threshold_high ? Number(newOrder.vital_threshold_high) : null,
        special_instructions: newOrder.special_instructions,
        updated_at: new Date().toISOString()
      };

      if (targetStatus === 'signed') {
        if (isTelephone) {
          providerOrderData.signed_at = null as unknown as string;
          providerOrderData.acknowledged_at = new Date().toISOString();
          providerOrderData.acknowledging_nurse_id = staff.id;
        } else {
          providerOrderData.signed_at = new Date().toISOString();
        }
      }

      // Evaluate if the incoming order belongs to a psychotropic class
      const isPsych = newOrder.is_psychotropic || isPsychotropicClass(newOrder.generic_name);
      let parentOrderId = editingDraftId;

      if (editingDraftId) {
        // Update existing draft order
        const docRef = doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', editingDraftId);
        await updateDoc(docRef, providerOrderData);
      } else {
        // Create new order
        providerOrderData.created_at = new Date().toISOString();
        const mainOrderRef = await addDoc(
          collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
          providerOrderData
        );
        parentOrderId = mainOrderRef.id;
      }

      // Generate secondary child order for shift-level psychotropic monitoring
      const isSigned = targetStatus === 'signed';
      if (isPsych && isSigned && parentOrderId) {
        const childQuery = query(
          collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
          where('parent_order_id', '==', parentOrderId)
        );
        const childSnap = await getDocs(childQuery);
        if (childSnap.empty) {
          const childOrderData = {
            org_id: organization.id,
            patient_id: patientId,
            facility_id: patient?.facility_id || '',
            ordering_physician_id,
            ordering_physician_name,
            ordering_physician_npi,
            order_type: 'treatment',
            order_text: `Psychotropic Monitoring: Check patient for side effects related to ${newOrder.generic_name} ${newOrder.strength || ''}. Document findings.`,
            title: `Psychotropic Monitoring: ${newOrder.generic_name}`,
            instructions: `Monitor for shift-level side effects related to ${newOrder.generic_name} ${newOrder.strength || ''} (e.g., sedation, EPS, gait instability, orthostatic changes). Log in shift logs.`,
            priority: 'routine',
            status: targetStatus === 'signed' && isTelephone ? 'acknowledged' : targetStatus,
            frequency: 'QD',
            frequency_times: ['DAY', 'EVENING', 'NIGHT'], // Shift-level TAR tracking
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_order_id: parentOrderId
          };
          
          await addDoc(
            collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
            childOrderData
          );
        }
      }

      // Log to Audit Trail
      await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
        action: targetStatus === 'signed' 
          ? (isTelephone ? 'TELEPHONE_ORDER_SIGNED' : 'MED_ORDER_SIGNED')
          : 'MED_ORDER_DRAFT_SAVED',
        staff_id: staff.id,
        patient_id: patientId,
        details: targetStatus === 'signed'
          ? (isTelephone 
              ? `Nurse signed telephone order from ${ordering_physician_name} for ${newOrder.generic_name}`
              : `Physician signed new order for ${newOrder.generic_name}`)
          : `Saved draft order for ${newOrder.generic_name}`,
        timestamp: new Date().toISOString()
      });

      setIsOrdering(false);
      resetForm();
      fetchOrders();
    } catch (err) {
      console.error('Error signing order:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-quro-charcoal uppercase tracking-tight">Physician Order Portal</h2>
          <p className="text-xs text-slate-500 font-medium">Verified CPOE interface for licensed prescribers.</p>
        </div>
        {!isOrdering && (
          <button 
            onClick={() => setIsOrdering(true)}
            className="flex items-center gap-2 px-6 py-3 bg-quro-teal text-white rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20"
          >
            <FilePlus size={18} />
            WRITE NEW ORDER
          </button>
        )}
      </div>

      {/* Co-Sign Portal Section */}
      {staff && staff.role === 'physician' && (
        (() => {
          const pendingCoSign = providerOrders.filter(o => 
            o.order_method === 'telephone' && 
            !o.signed_at && 
            o.status !== 'cancelled'
          );
          if (pendingCoSign.length === 0) return null;

          return (
            <div className="space-y-4 mb-8 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-[2.5rem] p-8 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/20">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-quro-charcoal uppercase tracking-tight">Orders Pending Co-Signature</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CFR Part 11 / HIPAA Compliant Co-Signature Portal</p>
                  </div>
                </div>
                <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                  {pendingCoSign.length} Pending
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingCoSign.map(order => (
                  <div key={order.id} className="bg-white/80 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-white hover:shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                          order.order_type === 'diet' || order.order_type === 'treatment' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {order.order_type}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          Transcribed by Nurse @ {order.created_at ? safeFormat(order.created_at, 'MMM dd, HH:mm') : ''}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-quro-charcoal uppercase leading-snug">
                        {order.order_type === 'treatment' ? order.title : (order.generic_name || order.order_text?.split(' - ')[0] || 'Clinical Order')} {order.strength || ''}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600">
                        {order.order_text}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCoSignOrder(order.id)}
                      disabled={isSaving}
                      className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/15 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ShieldCheck size={16} />
                      Co-Sign Order
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* New Order Form */}
      {isOrdering && (
        <form onSubmit={handleSubmitOrder} className="glass-card !overflow-visible p-10 border-2 border-quro-teal animate-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-quro-teal rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                <PenTool size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-quro-charcoal uppercase">
                  {(orderType === 'medication' ? newOrder.order_type : treatmentOrderMethod) === 'telephone' ? 'Telephone Order (T.O.)' : 'Direct Physician Order'}
                </h3>
                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Clinical Decision Support Enabled</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setOrderType('medication')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${orderType === 'medication' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Medication
                </button>
                <button 
                  type="button"
                  onClick={() => setOrderType('treatment')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${orderType === 'treatment' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Treatment
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => {
                    if (orderType === 'medication') setNewOrder({...newOrder, order_type: 'direct'});
                    else setTreatmentOrderMethod('direct');
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${(orderType === 'medication' ? newOrder.order_type : treatmentOrderMethod) === 'direct' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Direct
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const initialPhys = physicians.find(p => p.name === patient?.attending_physician || p.id === patient?.physician_id);
                    if (orderType === 'medication') {
                      setNewOrder({
                        ...newOrder, 
                        order_type: 'telephone',
                        physician_id: initialPhys?.id || '',
                        physician_name: initialPhys?.name || patient?.attending_physician || '',
                        physician_npi: initialPhys?.npi || ''
                      });
                    } else {
                      setTreatmentOrderMethod('telephone');
                      setTreatmentPhysicianId(initialPhys?.id || '');
                      setTreatmentPhysicianName(initialPhys?.name || patient?.attending_physician || '');
                      setTreatmentPhysicianNpi(initialPhys?.npi || '');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${(orderType === 'medication' ? newOrder.order_type : treatmentOrderMethod) === 'telephone' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Telephone (T.O.)
                </button>
              </div>
            </div>
          </div>

          {(orderType === 'medication' ? newOrder.order_type : treatmentOrderMethod) === 'telephone' && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 block">Selecting Prescribing Physician</label>
              <select 
                required
                title="Prescribing Physician"
                className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-quro-charcoal"
                value={orderType === 'medication' ? newOrder.physician_id : treatmentPhysicianId}
                onChange={e => {
                  const p = physicians.find(ph => ph.id === e.target.value);
                  const selectedName = p ? p.name : e.target.value;
                  const selectedNpi = p ? p.npi : '';
                  if (orderType === 'medication') {
                    setNewOrder({
                      ...newOrder,
                      physician_id: e.target.value,
                      physician_name: selectedName,
                      physician_npi: selectedNpi
                    });
                  } else {
                    setTreatmentPhysicianId(e.target.value);
                    setTreatmentPhysicianName(selectedName);
                    setTreatmentPhysicianNpi(selectedNpi);
                  }
                }}
              >
                <option value="">Select Physician giving the order...</option>
                {physicians.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.specialty || 'General'})</option>
                ))}
              </select>
            </div>
          )}

          {orderType === 'medication' && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Primary Med Details */}
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication Name (Generic/Brand)</label>
                <MedicationPicker 
                  value={newOrder.generic_name}
                  onChange={(name, rxcui, details) => {
                    const match = COMMON_DRUGS.find(d => d.generic === name || `${d.generic} (${d.brand})` === name);
                    if (details) {
                      setNewOrder(f => ({
                        ...f,
                        generic_name: details.generic_name,
                        rxcui: details.rxcui,
                        is_psychotropic: match?.is_psychotropic || f.is_psychotropic || false,
                        strength: details.strength || f.strength,
                        dose: details.dose || f.dose,
                        dosage: details.dosage || f.dosage,
                        route: details.route || f.route,
                        frequency: details.frequency || f.frequency,
                        custom_times: details.frequency === 'PRN' ? [] : (details.frequency_times || f.custom_times)
                      }));
                      if (details.strengthsList) {
                        setStrengths(details.strengthsList);
                      }
                    } else {
                      setNewOrder(f => ({
                        ...f,
                        generic_name: name,
                        rxcui,
                        is_psychotropic: match?.is_psychotropic || f.is_psychotropic
                      }));
                    }
                  }}
                  className="bg-slate-50 border-none p-4"
                  placeholder="e.g. Lisinopril"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strength (Type or Select)</label>
                  <input required list="strength-list" placeholder="e.g. 50mg" className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal" value={newOrder.strength} onChange={e => setNewOrder({...newOrder, strength: e.target.value})} />
                  <datalist id="strength-list">
                    {strengths.map(doseVal => (
                      <option key={doseVal} value={doseVal} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dose (Amount to give)</label>
                  <input required placeholder="e.g. 25mg" className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal" value={newOrder.dose} onChange={e => setNewOrder({...newOrder, dose: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage Form / Qty</label>
                  <input required placeholder="e.g. 0.5 Tablet" className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal" value={newOrder.dosage} onChange={e => setNewOrder({...newOrder, dosage: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</label>
                  <select title="Route" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" value={newOrder.route} onChange={e => setNewOrder({...newOrder, route: e.target.value as MedRoute})}>
                    <option value="PO">PO (By Mouth)</option>
                    <option value="SL">Sublingual</option>
                    <option value="IM">Intramuscular</option>
                    <option value="IV">Intravenous</option>
                    <option value="SC">Subcutaneous</option>
                    <option value="TOP">Topical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                  <select 
                    title="Frequency"
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal" 
                    value={newOrder.frequency} 
                    onChange={e => {
                      const freq = e.target.value as MedFrequency;
                      let newTimes = ['09:00'];
                      if (freq === 'BID') newTimes = ['09:00', '17:00'];
                      else if (freq === 'TID') newTimes = ['09:00', '13:00', '17:00'];
                      else if (freq === 'QID') newTimes = ['09:00', '13:00', '17:00', '21:00'];
                      else if (freq === 'QHS') newTimes = ['21:00'];
                      else if (freq === 'PRN') newTimes = [];
                      setNewOrder({
                        ...newOrder, 
                        frequency: freq,
                        custom_times: newTimes
                      });
                    }}
                  >
                    <option value="QD">QD (Daily)</option>
                    <option value="BID">BID (Twice Daily)</option>
                    <option value="TID">TID (Three Times Daily)</option>
                    <option value="QID">QID (Four Times Daily)</option>
                    <option value="QHS">QHS (Bedtime)</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="PRN">PRN (As Needed)</option>
                  </select>
                </div>
              </div>

              {newOrder.frequency !== 'PRN' && (
                <div className="space-y-2 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Administration Times</label>
                  <div className="flex flex-wrap gap-2">
                    {(newOrder.custom_times || ['09:00']).map((time, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl pl-3 pr-1.5 py-1.5 shadow-sm">
                        <input 
                          type="time" 
                          title="Administration time"
                          className="border-none p-0 text-xs font-black focus:ring-0 w-20 text-quro-charcoal"
                          value={time} 
                          onChange={e => {
                            const newTimes = [...(newOrder.custom_times || ['09:00'])];
                            newTimes[i] = e.target.value;
                            setNewOrder({...newOrder, custom_times: newTimes});
                          }}
                        />
                        {(newOrder.custom_times || ['09:00']).length > 1 && (
                          <button 
                            type="button" 
                            title="Remove administration time"
                            onClick={() => {
                              const newTimes = (newOrder.custom_times || ['09:00']).filter((_, idx) => idx !== i);
                              setNewOrder({...newOrder, custom_times: newTimes});
                            }} 
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => {
                        setNewOrder({
                          ...newOrder,
                          custom_times: [...(newOrder.custom_times || ['09:00']), '09:00']
                        });
                      }}
                      className="px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                    >
                      + Add Time
                    </button>
                  </div>
                </div>
              )}

              {newOrder.frequency === 'PRN' && (
                <div className="grid grid-cols-2 gap-4 bg-teal-50/40 border border-teal-100/50 p-5 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-teal-700 uppercase tracking-widest">PRN Min Interval <span className="text-rose-500">*</span></label>
                    <input 
                      required 
                      type="text" 
                      list="prn-intervals-list"
                      placeholder="e.g. 8 hours" 
                      className="w-full bg-white border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal focus:ring-2 focus:ring-teal-500" 
                      value={newOrder.prn_interval} 
                      onChange={e => setNewOrder({...newOrder, prn_interval: e.target.value})} 
                    />
                    <datalist id="prn-intervals-list">
                      <option value="every 4 hours" />
                      <option value="every 6 hours" />
                      <option value="every 8 hours" />
                      <option value="every 12 hours" />
                      <option value="every 24 hours" />
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-teal-700 uppercase tracking-widest">PRN Trigger / Reason <span className="text-rose-500">*</span></label>
                    <input 
                      required 
                      type="text" 
                      list="prn-triggers-list"
                      placeholder="e.g. pain 4-10" 
                      className="w-full bg-white border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal focus:ring-2 focus:ring-teal-500" 
                      value={newOrder.prn_reason} 
                      onChange={e => {
                        const val = e.target.value;
                        setNewOrder({
                          ...newOrder,
                          prn_reason: val,
                          indication: newOrder.indication || val
                        });
                      }} 
                    />
                    <datalist id="prn-triggers-list">
                      <option value="pain 4-10" />
                      <option value="mild pain" />
                      <option value="severe pain" />
                      <option value="fever > 101F" />
                      <option value="anxiety" />
                      <option value="shortness of breath" />
                      <option value="nausea" />
                    </datalist>
                  </div>
                </div>
              )}
            </div>

            {/* Clinical Guardrails */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-amber-500" size={16} />
                    <span className="text-[10px] font-black uppercase text-slate-600">Clinical Guardrails</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-quro-teal focus:ring-quro-teal"
                      checked={newOrder.requires_vitals}
                      onChange={e => setNewOrder({...newOrder, requires_vitals: e.target.checked})}
                    />
                    <span className="text-[10px] font-bold text-slate-500">Enable Thresholds</span>
                  </label>
                </div>

                {newOrder.requires_vitals && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">Hold if below</span>
                      <input type="number" className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" placeholder="e.g. 60" value={newOrder.vital_threshold_low} onChange={e => setNewOrder({...newOrder, vital_threshold_low: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">Hold if above</span>
                      <input type="number" className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" placeholder="e.g. 100" value={newOrder.vital_threshold_high} onChange={e => setNewOrder({...newOrder, vital_threshold_high: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    id="psychotropic-checkbox"
                    type="checkbox" 
                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                    checked={newOrder.is_psychotropic}
                    onChange={e => setNewOrder({...newOrder, is_psychotropic: e.target.checked})}
                  />
                  <label htmlFor="psychotropic-checkbox" className="text-[10px] font-black text-rose-500 uppercase cursor-pointer">Classify as Psychotropic</label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Medication (Indication) <span className="text-rose-500">*</span></label>
                <input required placeholder="e.g. Hypertension" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-slate-400" value={newOrder.indication} onChange={e => setNewOrder({...newOrder, indication: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nurse Instructions</label>
                <textarea 
                  placeholder="e.g. Hold if SBP < 100 or HR < 55"
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold h-20 resize-none"
                  value={newOrder.special_instructions}
                  onChange={e => setNewOrder({...newOrder, special_instructions: e.target.value})}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  type="submit"
                  onClick={() => setTargetStatus('signed')}
                  disabled={isSaving || (newOrder.order_type === 'telephone' && !newOrder.physician_id)}
                  className="flex-1 bg-quro-charcoal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  <ShieldCheck size={18} className="text-quro-teal" />
                  {isSaving && targetStatus === 'signed' ? 'SIGNING...' : (newOrder.order_type === 'telephone' ? 'SIGN AS T.O.' : 'SIGN & COMMIT')}
                </button>

                <button 
                  type="submit"
                  onClick={() => setTargetStatus('draft')}
                  disabled={isSaving}
                  className="flex-1 bg-teal-50 text-quro-teal py-4 rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-teal-100 transition-all flex items-center justify-center gap-3 border border-teal-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {isSaving && targetStatus === 'draft' ? 'SAVING DRAFT...' : (editingDraftId ? 'UPDATE DRAFT' : 'SAVE AS DRAFT')}
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsOrdering(false);
                    resetForm();
                  }}
                  className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
          )}

          {orderType === 'treatment' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Title & Instructions */}
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Treatment Title (e.g., Weekly Weights, Meal % Tracking) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Weekly Weights"
                      className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-bold text-quro-charcoal"
                      value={treatmentTitle}
                      onChange={e => setTreatmentTitle(e.target.value)}
                    />
                  </div>

                  {/* Suggestive Presets Grid */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Common Presets</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { title: "Weekly Weights", instructions: "Record patient's weight every Sunday morning during day shift. Log in lbs." },
                        { title: "Log Meal Consumption %", instructions: "Monitor and record meal percentage after every meal." },
                        { title: "Vitals Check: BP & Pulse", instructions: "Check blood pressure and heart rate twice daily (AM and PM shift)." },
                        { title: "Turn & Position", instructions: "Turn and position patient every 2 hours to prevent pressure injuries." },
                        { title: "Trach Care", instructions: "Perform tracheostomy care and suctioning every shift and PRN." },
                        { title: "GT Flush", instructions: "Flush gastrostomy tube with 30mL water before and after feeding." },
                        { title: "Bowel Movement Charting", instructions: "Monitor and record bowel movements every shift. Document size, consistency, and character." }
                      ].map((preset) => (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setTreatmentTitle(preset.title);
                            setTreatmentInstructions(preset.instructions);
                          }}
                          className="p-3 bg-slate-50 border border-slate-200 hover:border-quro-teal hover:bg-teal-50/50 rounded-xl text-[10px] font-bold text-slate-600 hover:text-quro-teal transition-all text-left truncate"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Instructions & Scheduling */}
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Specific Clinical Instructions <span className="text-rose-500">*</span>
                    </label>
                    <textarea 
                      required
                      placeholder="Provide exact parameters or administration directives..."
                      className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold h-28 resize-none text-quro-charcoal"
                      value={treatmentInstructions}
                      onChange={e => setTreatmentInstructions(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Frequency</label>
                    <select 
                      title="Frequency"
                      className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal"
                      value={treatmentFrequency}
                      onChange={e => {
                        const freq = e.target.value;
                        let newTimes = ['09:00'];
                        if (freq === 'BID') newTimes = ['09:00', '17:00'];
                        else if (freq === 'TID') newTimes = ['09:00', '13:00', '17:00'];
                        else if (freq === 'QID') newTimes = ['09:00', '13:00', '17:00', '21:00'];
                        else if (freq === 'QHS') newTimes = ['21:00'];
                        else if (freq === 'PRN') newTimes = [];
                        setTreatmentFrequency(freq);
                        setTreatmentTimes(newTimes);
                      }}
                    >
                      <option value="QD">QD (Daily)</option>
                      <option value="BID">BID (Twice Daily)</option>
                      <option value="TID">TID (Three Times Daily)</option>
                      <option value="QID">QID (Four Times Daily)</option>
                      <option value="QHS">QHS (Bedtime)</option>
                      <option value="Weekly">Weekly</option>
                      <option value="PRN">PRN (As Needed)</option>
                    </select>
                  </div>

                  {treatmentFrequency !== 'PRN' && (
                    <div className="space-y-2 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Administration Times</label>
                      <div className="flex flex-wrap gap-2">
                        {treatmentTimes.map((time, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl pl-3 pr-1.5 py-1.5 shadow-sm">
                            <input 
                              type="time" 
                              title="Administration time"
                              className="border-none p-0 text-xs font-black focus:ring-0 w-20 text-quro-charcoal"
                              value={time} 
                              onChange={e => {
                                const newTimes = [...treatmentTimes];
                                newTimes[i] = e.target.value;
                                setTreatmentTimes(newTimes);
                              }}
                            />
                            {treatmentTimes.length > 1 && (
                              <button 
                                type="button" 
                                title="Remove administration time"
                                onClick={() => {
                                  setTreatmentTimes(treatmentTimes.filter((_, idx) => idx !== i));
                                }} 
                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setTreatmentTimes([...treatmentTimes, '09:00'])}
                          className="px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                        >
                          + Add Time
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button 
                      type="submit"
                      onClick={() => setTargetStatus('signed')}
                      disabled={isSaving || (treatmentOrderMethod === 'telephone' && !treatmentPhysicianId)}
                      className="flex-1 bg-quro-charcoal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      <ShieldCheck size={18} className="text-quro-teal" />
                      {isSaving && targetStatus === 'signed' ? 'SIGNING...' : (treatmentOrderMethod === 'telephone' ? 'SIGN AS T.O.' : 'SIGN & COMMIT')}
                    </button>

                    <button 
                      type="submit"
                      onClick={() => setTargetStatus('draft')}
                      disabled={isSaving}
                      className="flex-1 bg-teal-50 text-quro-teal py-4 rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-teal-100 transition-all flex items-center justify-center gap-3 border border-teal-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      {isSaving && targetStatus === 'draft' ? 'SAVING DRAFT...' : (editingDraftId ? 'UPDATE DRAFT' : 'SAVE AS DRAFT')}
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        setIsOrdering(false);
                        resetForm();
                      }}
                      className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Recent Orders History */}
      <div className="space-y-4">
        {providerOrders.length === 0 && !loading && (
          <div className="text-center py-20 glass-card">
            <FileText className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No Recent Medication Orders</p>
          </div>
        )}

        {providerOrders.map((order) => (
          <div key={order.id} className={`glass-card p-6 border-l-4 transition-all duration-300 ${
            order.status === 'draft' ? 'border-amber-400 bg-amber-50/20' : 'border-quro-teal'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  order.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-quro-charcoal'
                }`}>
                  {order.status === 'draft' ? <FileText size={20} /> : <Pill size={20} />}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="text-base font-black text-quro-charcoal uppercase tracking-tight">
                      {order.order_type === 'treatment' ? order.title : (order.generic_name || order.order_text?.split(' - ')[0] || 'Medication Order')} {order.strength || ''}
                    </h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                      order.status === 'draft' 
                        ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                        : (order.order_method === 'telephone' && !order.signed_at)
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : order.status === 'signed' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {order.status === 'draft' 
                        ? 'Draft / Unsigned' 
                        : (order.order_method === 'telephone' && !order.signed_at)
                          ? 'T.O. / Pending MD Signature'
                          : order.status === 'signed' 
                            ? 'Signed / Pending Ack' 
                            : order.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {order.order_text}
                  </p>
                  {order.indication && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Indication: {order.indication}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 w-full md:w-auto text-right">
                <div>
                  <p className="text-[9px] font-black text-quro-charcoal uppercase">
                    {order.status === 'draft' ? 'Pending Signature' : 'Electronically Signed'}
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    By {order.ordering_physician_id || 'Attending Physician'}
                  </p>
                  {order.created_at && (
                    <p className="text-[8px] text-slate-400 mt-1">
                      {safeFormat(order.created_at, 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>
                               <div className="flex gap-2 mt-1">
                  {order.status === 'draft' ? (
                    <>
                      <button
                        onClick={() => handleEditDraft(order)}
                        className="px-3 py-1 bg-white border border-slate-200 text-quro-charcoal rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider animate-pulse hover:animate-none"
                      >
                        Edit Draft
                      </button>
                      <button
                        onClick={() => handleSignDirectly(order)}
                        className="px-3 py-1 bg-quro-charcoal text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors uppercase tracking-wider flex items-center gap-1 shadow-md shadow-slate-900/10"
                      >
                        <ShieldCheck size={10} className="text-quro-teal" />
                        Sign Now
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditDraft(order)}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Quro — Physician Medication Order Portal
// Authority: Physician / NP / PA
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
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
import type { MedRoute, MedFrequency, Staff, Patient, ProviderOrder } from '@/lib/firebase/types';
import { format } from 'date-fns';
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

interface Props {
  patientId: string;
}

export default function PhysicianOrderPortal({ patientId }: Props) {
  const { staff, organization } = useAuth();
  const [providerOrders, setProviderOrders] = useState<ProviderOrder[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<'signed' | 'draft'>('signed');
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [physicians, setPhysicians] = useState<Staff[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);

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
    setEditingDraftId(null);
  };

  const handleEditDraft = (order: ProviderOrder) => {
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
      physician_name: order.ordering_physician_id || '',
      rxcui: order.rxcui || null
    });
    setEditingDraftId(order.id);
    setOrderCategory('medication');
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
        action: 'MED_ORDER_SIGNED',
        staff_id: staff.id,
        patient_id: patientId,
        details: `Physician signed draft order directly for ${order.generic_name}`,
        timestamp: new Date().toISOString()
      });

      fetchOrders();
    } catch (err) {
      console.error('Error signing directly:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // New Order Form State
  const [orderCategory, setOrderCategory] = useState<'medication' | 'diet'>('medication');
  
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
    rxcui: null as string | null
  });

  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchPhysicians();
    fetchPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, organization]);

  async function fetchPatient() {
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
  }

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
  }, [newOrder.strength, newOrder.dose]);

  async function fetchPhysicians() {
    if (!organization) return;
    try {
      const q = query(collection(db, 'organizations', organization.id, 'staff'), where('role', '==', 'physician'));
      const snap = await getDocs(q);
      setPhysicians(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    } catch (err) {
      console.error('Error fetching physicians:', err);
    }
  }

  async function fetchOrders() {
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
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !organization) return;
    setIsSaving(true);

    try {
      if (orderCategory === 'diet') {
        const isTelephone = newDietOrder.order_type === 'telephone';
        const dietString = `${newDietOrder.diet_type}${newDietOrder.consistency !== 'Regular' ? ' with ' + newDietOrder.consistency : ''}`;

        // Create provider order first for diet
        await addDoc(
          collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
          {
            org_id: organization.id,
            patient_id: patientId,
            facility_id: patient?.facility_id || '',
            ordering_physician_id: isTelephone ? newDietOrder.physician_id : staff.id,
            order_type: 'diet',
            order_text: dietString + (newDietOrder.instructions ? `. Instructions: ${newDietOrder.instructions}` : ''),
            priority: 'routine',
            status: 'signed',
            order_method: newDietOrder.order_type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );

        await updateDoc(doc(db, 'organizations', organization.id, 'patients', patientId), {
          diet: dietString,
          updated_at: new Date().toISOString()
        });

        await addDoc(collection(db, 'organizations', organization.id, 'audit_logs'), {
          action: isTelephone ? 'TELEPHONE_DIET_ORDER' : 'DIET_ORDER_SIGNED',
          staff_id: staff.id,
          patient_id: patientId,
          details: isTelephone 
            ? `Nurse transcribed telephone diet order from ${newDietOrder.physician_name} for ${dietString}`
            : `Physician signed new diet order for ${dietString}`,
          timestamp: new Date().toISOString()
        });

        setIsOrdering(false);
        return;
      }

      const isTelephone = newOrder.order_type === 'telephone';
      const isPRN = newOrder.frequency === 'PRN';
      const frequencyText = isPRN 
        ? `PRN (every ${newOrder.prn_interval || '8 hours'} as needed for ${newOrder.prn_reason || newOrder.indication || 'pain'})` 
        : newOrder.frequency;
      const orderText = `${newOrder.generic_name} ${newOrder.strength} - Dose: ${newOrder.dose} (${newOrder.dosage}) via ${newOrder.route} ${frequencyText}${newOrder.special_instructions ? `. Special Instructions: ${newOrder.special_instructions}` : ''}`;
      
      let providerOrderRefId = editingDraftId;
      
      const providerOrderData: Partial<ProviderOrder> = {
        org_id: organization.id,
        patient_id: patientId,
        facility_id: patient?.facility_id || '',
        ordering_physician_id: isTelephone ? newOrder.physician_id : staff.id,
        order_type: 'medication',
        order_text: orderText,
        rxcui: newOrder.rxcui,
        priority: 'routine',
        status: targetStatus,
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
        providerOrderData.signed_at = new Date().toISOString();
      }

      if (editingDraftId) {
        // Update existing draft order
        const docRef = doc(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders', editingDraftId);
        await updateDoc(docRef, providerOrderData);
      } else {
        // Create new order
        providerOrderData.created_at = new Date().toISOString();
        const docRef = await addDoc(
          collection(db, 'organizations', organization.id, 'patients', patientId, 'provider_orders'),
          providerOrderData
        );
        providerOrderRefId = docRef.id;
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
              ? `Nurse signed telephone order from ${newOrder.physician_name} for ${newOrder.generic_name}`
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
                  {newOrder.order_type === 'telephone' ? 'Telephone Order (T.O.)' : 'Direct Physician Order'}
                </h3>
                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Clinical Decision Support Enabled</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setOrderCategory('medication')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${orderCategory === 'medication' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Medication
                </button>
                <button 
                  type="button"
                  onClick={() => setOrderCategory('diet')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${orderCategory === 'diet' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Diet
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => {
                    if (orderCategory === 'medication') setNewOrder({...newOrder, order_type: 'direct'});
                    else setNewDietOrder({...newDietOrder, order_type: 'direct'});
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${(orderCategory === 'medication' ? newOrder.order_type : newDietOrder.order_type) === 'direct' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Direct
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (orderCategory === 'medication') {
                      setNewOrder({
                        ...newOrder, 
                        order_type: 'telephone',
                        physician_id: patient?.attending_physician || '',
                        physician_name: patient?.attending_physician || ''
                      });
                    } else {
                      setNewDietOrder({
                        ...newDietOrder, 
                        order_type: 'telephone',
                        physician_id: patient?.attending_physician || '',
                        physician_name: patient?.attending_physician || ''
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${(orderCategory === 'medication' ? newOrder.order_type : newDietOrder.order_type) === 'telephone' ? 'bg-white text-quro-charcoal shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Telephone (T.O.)
                </button>
              </div>
            </div>
          </div>

          {(orderCategory === 'medication' ? newOrder.order_type : newDietOrder.order_type) === 'telephone' && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 block">Selecting Prescribing Physician</label>
              <select 
                required
                className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-quro-charcoal"
                value={orderCategory === 'medication' ? newOrder.physician_id : newDietOrder.physician_id}
                onChange={e => {
                  const p = physicians.find(ph => ph.id === e.target.value);
                  const selectedName = p ? `Dr. ${p.last_name}` : e.target.value;
                  if (orderCategory === 'medication') {
                    setNewOrder({
                      ...newOrder,
                      physician_id: e.target.value,
                      physician_name: selectedName
                    });
                  } else {
                    setNewDietOrder({
                      ...newDietOrder,
                      physician_id: e.target.value,
                      physician_name: selectedName
                    });
                  }
                }}
              >
                <option value="">Select Physician giving the order...</option>
                {patient?.attending_physician && (
                  <option value={patient.attending_physician}>{patient.attending_physician} (Attending)</option>
                )}
                {physicians.map(p => (
                  <option key={p.id} value={p.id}>Dr. {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
          )}

          {orderCategory === 'medication' && (

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
                  <select className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold" value={newOrder.route} onChange={e => setNewOrder({...newOrder, route: e.target.value as MedRoute})}>
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
                    type="checkbox" 
                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                    checked={newOrder.is_psychotropic}
                    onChange={e => setNewOrder({...newOrder, is_psychotropic: e.target.checked})}
                  />
                  <span className="text-[10px] font-black text-rose-500 uppercase">Classify as Psychotropic</span>
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

          {orderCategory === 'diet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diet Type</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal"
                    value={newDietOrder.diet_type}
                    onChange={e => setNewDietOrder({...newDietOrder, diet_type: e.target.value})}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Mech Soft">Mech Soft</option>
                    <option value="Pureed">Pureed</option>
                    <option value="Clear Liquid">Clear Liquid</option>
                    <option value="Full Liquid">Full Liquid</option>
                    <option value="Diabetic">Diabetic / Consistent Carb</option>
                    <option value="Cardiac">Cardiac / Low Sodium</option>
                    <option value="Renal">Renal</option>
                    <option value="NPO">NPO</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consistency / Liquid Type</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-quro-charcoal"
                    value={newDietOrder.consistency}
                    onChange={e => setNewDietOrder({...newDietOrder, consistency: e.target.value})}
                  >
                    <option value="Regular">Regular (Thin Fluids)</option>
                    <option value="Nectar Thick">Nectar Thick</option>
                    <option value="Honey Thick">Honey Thick</option>
                    <option value="Pudding Thick">Pudding Thick</option>
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Special Instructions (Optional)</label>
                  <textarea 
                    placeholder="e.g. No added salt, cut into small pieces"
                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold h-32 resize-none text-quro-charcoal"
                    value={newDietOrder.instructions}
                    onChange={e => setNewDietOrder({...newDietOrder, instructions: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving || (newDietOrder.order_type === 'telephone' && !newDietOrder.physician_id)}
                    className="flex-1 bg-quro-charcoal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={20} className="text-quro-teal" />
                    {isSaving ? 'AUTHENTICATING...' : (newDietOrder.order_type === 'telephone' ? 'SIGN AS T.O.' : 'SIGN & COMMIT DIET')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsOrdering(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    CANCEL
                  </button>
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
                      {order.generic_name || order.order_text?.split(' - ')[0] || 'Medication Order'} {order.strength}
                    </h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                      order.status === 'draft' 
                        ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                        : order.status === 'signed' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {order.status === 'draft' ? 'Draft / Unsigned' : order.status === 'signed' ? 'Signed / Pending Ack' : order.status}
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

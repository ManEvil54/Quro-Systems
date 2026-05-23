// ============================================================
// Quro — Provider Orders Hook
// Handles creation and status tracking of clinical orders
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProviderOrder } from '@/lib/firebase/types';
import { DEMO_ORDERS } from '@/lib/demoData';

export function useOrders(patientId: string) {
  const { staff } = useAuth();
  const [orders, setOrders] = useState<ProviderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.org_id || !patientId) {
      setLoading(l => l ? false : l);
      return;
    }

    const ordersRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders');
    const q = query(ordersRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProviderOrder[];
      
      // Fallback to Demo Data
      if (docs.length === 0 && DEMO_ORDERS[patientId]) {
        setOrders(DEMO_ORDERS[patientId]);
      } else {
        setOrders(docs);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [staff?.org_id, patientId]);

  const addOrder = async (data: Omit<ProviderOrder, 'id' | 'org_id' | 'patient_id' | 'created_at' | 'updated_at'>) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const ordersRef = collection(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders');
    return await addDoc(ordersRef, {
      ...data,
      org_id: staff.org_id,
      patient_id: patientId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateOrderStatus = async (orderId: string, status: ProviderOrder['status']) => {
    if (!staff?.org_id || !patientId) throw new Error('Context missing');
    
    const orderRef = doc(db, 'organizations', staff.org_id, 'patients', patientId, 'provider_orders', orderId);
    const updateData: Record<string, unknown> = { status, updated_at: serverTimestamp() };
    
    if (status === 'signed') updateData.signed_at = new Date().toISOString();
    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
      updateData.acknowledging_nurse_id = staff.id;
    }
    if (status === 'sent_to_pharmacy') updateData.faxed_at = new Date().toISOString();
    
    return await updateDoc(orderRef, updateData as Partial<ProviderOrder>);
  };

  return { orders, loading, error, addOrder, updateOrderStatus };
}

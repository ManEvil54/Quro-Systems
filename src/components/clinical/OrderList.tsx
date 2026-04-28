// ============================================================
// Quro — Provider Orders List
// Tracks clinical orders from drafting to pharmacy fulfillment
// ============================================================
'use client';

import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Send, 
  XCircle,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { ProviderOrder } from '@/lib/firebase/types';

interface Props {
  patientId: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  signed: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-emerald-100 text-emerald-700',
  sent_to_pharmacy: 'bg-purple-100 text-purple-700',
  filled: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrderList({ patientId }: Props) {
  const { orders, loading, error, updateOrderStatus } = useOrders(patientId);

  if (loading) return <div className="py-10 text-center text-slate-400">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Provider Orders</h2>
        <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <FileText size={16} />
          <span>New Order</span>
        </button>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="glass-card p-4 group">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[order.status]}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {order.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{order.order_text}</p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                      <Clock size={12} />
                      <span>Ordered: {new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    {order.signed_at && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600">
                        <CheckCircle2 size={12} />
                        <span>Signed</span>
                      </div>
                    )}
                    {order.faxed_at && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-purple-600">
                        <Send size={12} />
                        <span>Sent to Pharmacy</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {order.status === 'signed' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'acknowledged')}
                    className="btn-secondary text-[10px] py-1 px-3 font-bold uppercase"
                  >
                    Acknowledge
                  </button>
                )}
                <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-400 text-sm">No active orders for this resident.</p>
          </div>
        )}
      </div>
    </div>
  );
}

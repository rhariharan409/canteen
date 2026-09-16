'use client';

import { useEffect, useState } from 'react';
import StudentNav from '@/components/StudentNav';
import { Clock, CheckCircle2, ChevronRight } from 'lucide-react';

interface OrderHistoryItem {
  id: string;
  publicOrderCode: string;
  canteenName: string;
  pickupWindow: string;
  subtotal: number;
  orderStatus: string;
  itemsCount: number;
  confirmedAt: string;
  collectedAt: string | null;
}

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/orders')
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Fetching order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Your Orders</h1>
        <p className="text-xs text-slate-500">Track all your active and previous pre-orders.</p>
      </div>

      {orders.length === 0 ? (
        <div className="surface-card p-8 rounded-2xl text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">You haven't placed an order yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="surface-card p-4 rounded-xl border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-extrabold text-slate-900">{o.publicOrderCode}</span>
                  <span className="text-xs font-bold text-slate-500">• {o.canteenName}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {o.itemsCount} items • ₹{o.subtotal} • Window: {o.pickupWindow}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(o.confirmedAt).toLocaleDateString()} {new Date(o.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`status-badge ${
                    o.orderStatus === 'COLLECTED'
                      ? 'status-live'
                      : o.orderStatus === 'READY'
                      ? 'status-live'
                      : 'status-paused'
                  }`}
                >
                  {o.orderStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <StudentNav />
    </div>
  );
}

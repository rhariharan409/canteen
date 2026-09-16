'use client';

import { useEffect, useState } from 'react';
import OwnerNav from '@/components/OwnerNav';
import { ShoppingCart, CheckCircle2, Clock, ChevronDown, ChevronUp, PackageCheck } from 'lucide-react';

interface BatchOrder {
  id: string;
  publicOrderCode: string;
  studentName: string;
  studentPhone?: string;
  orderStatus: string;
  subtotal: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface Batch {
  id: string;
  windowLabel: string;
  totalOrders: number;
  readyCount: number;
  prepCount: number;
  collectedCount: number;
  prepSummary: Record<string, number>;
  orders: BatchOrder[];
}

export default function OwnerOrdersPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = () => {
    fetch('/api/owner/orders')
      .then((res) => res.json())
      .then((data) => {
        setBatches(data.batches || []);
        if (!expandedBatchId && data.batches && data.batches.length > 0) {
          setExpandedBatchId(data.batches[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/owner/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });
      if (res.ok) fetchOrders();
    } catch (e) {}
    setActionLoading(false);
  };

  const handleMarkBatchReady = async (batchId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/owner/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, markBatchReady: true }),
      });
      if (res.ok) fetchOrders();
    } catch (e) {}
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading pickup batches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pt-16">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Pickup Batches & Preparation</h1>
          <p className="text-xs text-slate-500">Grouped 5-minute pre-order batches for bulk kitchen prep.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
        >
          Refresh
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="surface-card p-8 rounded-2xl text-center">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No active batches right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            const packingProgress = Math.round((batch.readyCount / (batch.totalOrders || 1)) * 100);

            return (
              <div key={batch.id} className="surface-card rounded-2xl border border-slate-200 overflow-hidden">
                {/* Batch Header */}
                <div
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                  className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-600 uppercase">BATCH</span>
                      <h3 className="text-base font-extrabold text-slate-900">{batch.windowLabel}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                      <span>{batch.totalOrders} Orders</span>
                      <span className="text-emerald-700">{batch.readyCount} Ready</span>
                      <span className="text-amber-700">{batch.prepCount} Preparing</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <span className="text-xs font-extrabold text-slate-700">{packingProgress}% Packed</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Batch Details & Orders */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
                    {/* Bulk Preparation Summary */}
                    {Object.keys(batch.prepSummary).length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase">Kitchen Bulk Prep Summary</span>
                          <button
                            onClick={() => handleMarkBatchReady(batch.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm"
                          >
                            Mark All Batch Orders Ready
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {Object.entries(batch.prepSummary).map(([item, count]) => (
                            <div key={item} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs font-bold flex justify-between">
                              <span>{item}</span>
                              <span className="text-sky-700">× {count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Cards List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Batch Orders List</span>
                      {batch.orders.map((ord) => (
                        <div key={ord.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{ord.publicOrderCode}</span>
                              <span className="text-xs font-semibold text-slate-600">• {ord.studentName}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              {ord.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800 mr-2">₹{ord.subtotal}</span>
                            {ord.orderStatus === 'CONFIRMED' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg"
                              >
                                Start Prep
                              </button>
                            )}
                            {(ord.orderStatus === 'CONFIRMED' || ord.orderStatus === 'PREPARING') && (
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                              >
                                Mark Ready
                              </button>
                            )}
                            {ord.orderStatus === 'READY' && (
                              <span className="status-badge status-live">READY FOR PICKUP</span>
                            )}
                            {ord.orderStatus === 'COLLECTED' && (
                              <span className="status-badge status-live">COLLECTED</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OwnerNav />
    </div>
  );
}

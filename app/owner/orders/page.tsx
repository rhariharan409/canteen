'use client';

import { useEffect, useState } from 'react';
import OwnerNav from '@/components/OwnerNav';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoBadge } from '@/components/neo/NeoBadge';
import { ShoppingCart, CheckCircle2, Clock, ChevronDown, ChevronUp, PackageCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

    // Live Supabase Realtime channel for instant order state updates!
    const channel = supabase
      .channel('public:orders:board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">LOADING KITCHEN KANBAN BOARD...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pt-16">
      {/* Top Banner */}
      <div className="bg-neoBlack text-white p-5 border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#D9FF00] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black font-display uppercase tracking-tight text-white">REALTIME KITCHEN KANBAN</h1>
          <p className="text-xs font-bold text-slate-300">Grouped 5-minute pre-order batches for kitchen prep.</p>
        </div>
        <NeoButton onClick={fetchOrders} variant="primary" size="sm">
          REFRESH
        </NeoButton>
      </div>

      {batches.length === 0 ? (
        <NeoCard className="text-center py-12">
          <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-black font-display uppercase">NO ACTIVE KITCHEN BATCHES</h3>
        </NeoCard>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            const packingProgress = Math.round((batch.readyCount / (batch.totalOrders || 1)) * 100);

            return (
              <NeoCard key={batch.id} className="p-0 overflow-hidden">
                {/* Batch Header Bar */}
                <div
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                  className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-amber-50 border-b-2 border-neoBlack"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-neoSecondary">BATCH</span>
                      <h3 className="text-lg font-black font-mono text-neoBlack">{batch.windowLabel}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-extrabold text-slate-700 mt-1">
                      <span>{batch.totalOrders} ORDERS</span>
                      <span className="text-neoSuccess font-black">{batch.readyCount} READY</span>
                      <span className="text-amber-600 font-black">{batch.prepCount} PREPARING</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs font-black font-mono bg-neoPrimary px-2 py-0.5 border border-neoBlack">
                      {packingProgress}% PACKED
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-neoBlack" /> : <ChevronDown className="w-5 h-5 text-neoBlack" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-amber-50/50 space-y-4">
                    {/* Kitchen Bulk Prep Summary */}
                    {Object.keys(batch.prepSummary).length > 0 && (
                      <div className="bg-white p-4 border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-neoBlack font-display">
                            KITCHEN BULK PREPARATION SUMMARY
                          </span>
                          <NeoButton
                            onClick={() => handleMarkBatchReady(batch.id)}
                            disabled={actionLoading}
                            variant="success"
                            size="sm"
                          >
                            MARK ALL READY
                          </NeoButton>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {Object.entries(batch.prepSummary).map(([item, count]) => (
                            <div key={item} className="bg-neoPrimary p-2 border-2 border-neoBlack text-xs font-black flex justify-between">
                              <span>{item}</span>
                              <span className="font-mono text-neoBlack">× {count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch Orders Kanban Cards */}
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wider text-neoBlack">BATCH ORDERS</span>
                      {batch.orders.map((ord) => (
                        <div key={ord.id} className="bg-white p-3.5 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black font-mono text-neoBlack">{ord.publicOrderCode}</span>
                              <span className="text-xs font-extrabold text-slate-700">• {ord.studentName}</span>
                            </div>
                            <div className="text-xs text-slate-600 font-bold mt-0.5">
                              {ord.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-mono text-neoBlack mr-2">₹{ord.subtotal}</span>

                            {ord.orderStatus === 'CONFIRMED' && (
                              <NeoButton
                                onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                                disabled={actionLoading}
                                variant="secondary"
                                size="sm"
                              >
                                START PREP
                              </NeoButton>
                            )}

                            {(ord.orderStatus === 'CONFIRMED' || ord.orderStatus === 'PREPARING') && (
                              <NeoButton
                                onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                                disabled={actionLoading}
                                variant="primary"
                                size="sm"
                              >
                                MARK READY
                              </NeoButton>
                            )}

                            {ord.orderStatus === 'READY' && (
                              <NeoBadge variant="ready">READY FOR PICKUP</NeoBadge>
                            )}

                            {ord.orderStatus === 'COLLECTED' && (
                              <NeoBadge variant="collected">COLLECTED</NeoBadge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </NeoCard>
            );
          })}
        </div>
      )}

      <OwnerNav />
    </div>
  );
}
